// Central manager for coordinating multiple data sources

import { DataSourceBase, DataSourceStats } from './dataSources/base/DataSourceBase';
import { GoogleSearchDataSource } from './dataSources/GoogleSearchDataSource';
import { 
  EnhancedOpportunity, 
  OpportunitySearchParams, 
  OpportunitySearchResult,
  OpportunityType 
} from '../types/opportunities';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

export interface DataSourceManagerConfig {
  enableParallelSearch: boolean;
  maxConcurrentSources: number;
  fallbackOnFailure: boolean;
  deduplicationEnabled: boolean;
  resultMergingStrategy: 'priority' | 'round-robin' | 'weighted';
}

export class DataSourceManager {
  private dataSources: Map<string, DataSourceBase> = new Map();
  private config: DataSourceManagerConfig;

  constructor(config: Partial<DataSourceManagerConfig> = {}) {
    this.config = {
      enableParallelSearch: true,
      maxConcurrentSources: 3,
      fallbackOnFailure: true,
      deduplicationEnabled: true,
      resultMergingStrategy: 'priority',
      ...config
    };

    this.initializeDataSources();
  }

  private initializeDataSources(): void {
    // Initialize Google Search Data Source
    if (appConfig.googleSearchApiKey && appConfig.googleSearchCx) {
      const googleSource = new GoogleSearchDataSource(
        appConfig.googleSearchApiKey,
        appConfig.googleSearchCx
      );
      this.dataSources.set('google', googleSource);
      logger.info('Google Search data source initialized');
    }

    // TODO: Add other data sources here
    // - LinkedIn Jobs API
    // - Indeed API
    // - GitHub Jobs (if still available)
    // - University websites (web scraping)
    // - Government job boards
    // - Custom opportunity feeds

    logger.info(`Data Source Manager initialized with ${this.dataSources.size} sources`);
  }

  async searchOpportunities(params: OpportunitySearchParams): Promise<OpportunitySearchResult> {
    const startTime = Date.now();
    
    logger.info('Starting multi-source opportunity search', {
      query: params.query,
      types: params.type,
      sources: Array.from(this.dataSources.keys()),
      parallelSearch: this.config.enableParallelSearch
    });

    try {
      let allOpportunities: EnhancedOpportunity[] = [];
      
      if (this.config.enableParallelSearch) {
        allOpportunities = await this.searchInParallel(params);
      } else {
        allOpportunities = await this.searchSequentially(params);
      }

      // Deduplicate results if enabled
      if (this.config.deduplicationEnabled) {
        allOpportunities = this.deduplicateResults(allOpportunities);
      }

      // Apply final sorting and limiting
      const finalResults = this.applyFinalProcessing(allOpportunities, params);
      
      const searchResult: OpportunitySearchResult = {
        opportunities: finalResults,
        total: finalResults.length,
        hasMore: finalResults.length === (params.limit || 10),
        filters: this.generateFilters(finalResults),
        searchMeta: {
          query: params.query || '',
          took: Date.now() - startTime,
          cached: false // TODO: Implement caching at this level
        }
      };

      logger.info('Multi-source search completed', {
        totalResults: finalResults.length,
        sources: Array.from(this.dataSources.keys()),
        took: searchResult.searchMeta.took
      });

      return searchResult;
    } catch (error) {
      logger.error('Multi-source search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  private async searchInParallel(params: OpportunitySearchParams): Promise<EnhancedOpportunity[]> {
    const availableSources = Array.from(this.dataSources.values())
      .filter(source => source.getConfig().enabled)
      .sort((a, b) => b.getConfig().priority - a.getConfig().priority)
      .slice(0, this.config.maxConcurrentSources);

    const searchPromises = availableSources.map(source => 
      source.search(params).catch(error => {
        logger.warn(`Source ${source.getConfig().name} failed in parallel search`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return [];
      })
    );

    const results = await Promise.allSettled(searchPromises);
    const allOpportunities: EnhancedOpportunity[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allOpportunities.push(...result.value);
      } else {
        logger.warn(`Parallel search failed for source ${availableSources[index].getConfig().name}`, {
          error: result.reason
        });
      }
    });

    return allOpportunities;
  }

  private async searchSequentially(params: OpportunitySearchParams): Promise<EnhancedOpportunity[]> {
    const availableSources = Array.from(this.dataSources.values())
      .filter(source => source.getConfig().enabled)
      .sort((a, b) => b.getConfig().priority - a.getConfig().priority);

    const allOpportunities: EnhancedOpportunity[] = [];
    const targetCount = params.limit || 10;

    for (const source of availableSources) {
      if (allOpportunities.length >= targetCount) {
        break;
      }

      try {
        const remainingCount = targetCount - allOpportunities.length;
        const sourceParams = { ...params, limit: remainingCount };
        
        const opportunities = await source.search(sourceParams);
        allOpportunities.push(...opportunities);
        
        logger.debug(`Sequential search completed for ${source.getConfig().name}`, {
          resultCount: opportunities.length,
          totalSoFar: allOpportunities.length
        });
      } catch (error) {
        logger.warn(`Sequential search failed for ${source.getConfig().name}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        if (!this.config.fallbackOnFailure) {
          throw error;
        }
      }
    }

    return allOpportunities;
  }

  private deduplicateResults(opportunities: EnhancedOpportunity[]): EnhancedOpportunity[] {
    const seen = new Set<string>();
    const deduped: EnhancedOpportunity[] = [];

    for (const opportunity of opportunities) {
      // Create a hash based on title, organization, and URL
      const hash = this.createOpportunityHash(opportunity);
      
      if (!seen.has(hash)) {
        seen.add(hash);
        deduped.push(opportunity);
      } else {
        logger.debug('Duplicate opportunity filtered', {
          title: opportunity.title,
          organization: opportunity.organization.organization
        });
      }
    }

    logger.info('Deduplication completed', {
      original: opportunities.length,
      deduplicated: deduped.length,
      removed: opportunities.length - deduped.length
    });

    return deduped;
  }

  private createOpportunityHash(opportunity: EnhancedOpportunity): string {
    const normalized = {
      title: opportunity.title.toLowerCase().replace(/\s+/g, ' ').trim(),
      org: opportunity.organization.organization.toLowerCase().replace(/\s+/g, ''),
      url: opportunity.organization.applicationUrl?.toLowerCase() || ''
    };
    
    return Buffer.from(`${normalized.title}|${normalized.org}|${normalized.url}`).toString('base64');
  }

  private applyFinalProcessing(
    opportunities: EnhancedOpportunity[], 
    params: OpportunitySearchParams
  ): EnhancedOpportunity[] {
    let processed = [...opportunities];

    // Apply filters
    if (params.type && params.type.length > 0) {
      processed = processed.filter(opp => params.type!.includes(opp.type));
    }

    // Apply sorting
    const sortBy = params.sortBy || 'relevance';
    processed.sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          const aDeadline = a.dates.applicationDeadline ? new Date(a.dates.applicationDeadline) : new Date('2099-12-31');
          const bDeadline = b.dates.applicationDeadline ? new Date(b.dates.applicationDeadline) : new Date('2099-12-31');
          return params.sortOrder === 'desc' ? bDeadline.getTime() - aDeadline.getTime() : aDeadline.getTime() - bDeadline.getTime();
          
        case 'posted':
          const aPosted = new Date(a.dates.lastUpdated);
          const bPosted = new Date(b.dates.lastUpdated);
          return params.sortOrder === 'desc' ? bPosted.getTime() - aPosted.getTime() : aPosted.getTime() - bPosted.getTime();
          
        case 'compensation':
          const aComp = a.compensation?.amount?.max || a.compensation?.amount?.min || 0;
          const bComp = b.compensation?.amount?.max || b.compensation?.amount?.min || 0;
          return params.sortOrder === 'desc' ? bComp - aComp : aComp - bComp;
          
        case 'relevance':
        default:
          // Sort by trust score, then by recency
          const trustScoreDiff = (b.metadata.trustScore || 0) - (a.metadata.trustScore || 0);
          if (Math.abs(trustScoreDiff) > 5) {
            return trustScoreDiff;
          }
          return new Date(b.dates.lastUpdated).getTime() - new Date(a.dates.lastUpdated).getTime();
      }
    });

    // Apply limit
    return processed.slice(params.offset || 0, (params.offset || 0) + (params.limit || 10));
  }

  private generateFilters(opportunities: EnhancedOpportunity[]) {
    const typeMap = new Map<OpportunityType, number>();
    const locationMap = new Map<string, number>();
    const orgMap = new Map<string, number>();

    opportunities.forEach(opp => {
      // Count types
      typeMap.set(opp.type, (typeMap.get(opp.type) || 0) + 1);
      
      // Count locations
      if (opp.location.country) {
        locationMap.set(opp.location.country, (locationMap.get(opp.location.country) || 0) + 1);
      }
      
      // Count organizations
      orgMap.set(opp.organization.organization, (orgMap.get(opp.organization.organization) || 0) + 1);
    });

    return {
      types: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
      locations: Array.from(locationMap.entries()).map(([country, count]) => ({ country, count })),
      organizations: Array.from(orgMap.entries()).map(([name, count]) => ({ name, count }))
    };
  }

  // Data source management methods
  public addDataSource(name: string, source: DataSourceBase): void {
    this.dataSources.set(name, source);
    logger.info(`Data source '${name}' added to manager`);
  }

  public removeDataSource(name: string): boolean {
    const removed = this.dataSources.delete(name);
    if (removed) {
      logger.info(`Data source '${name}' removed from manager`);
    }
    return removed;
  }

  public getDataSourceStats(): Map<string, DataSourceStats> {
    const stats = new Map<string, DataSourceStats>();
    this.dataSources.forEach((source, name) => {
      stats.set(name, source.getStats());
    });
    return stats;
  }

  public async getHealthStatus(): Promise<{ healthy: boolean; sources: { [key: string]: { healthy: boolean; message?: string } } }> {
    const sources: { [key: string]: { healthy: boolean; message?: string } } = {};
    let overallHealthy = true;

    for (const [name, source] of this.dataSources) {
      try {
        sources[name] = await source.getHealthStatus();
        if (!sources[name].healthy) {
          overallHealthy = false;
        }
      } catch (error) {
        sources[name] = {
          healthy: false,
          message: error instanceof Error ? error.message : 'Health check failed'
        };
        overallHealthy = false;
      }
    }

    return { healthy: overallHealthy, sources };
  }

  public updateConfig(updates: Partial<DataSourceManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Data Source Manager configuration updated', updates);
  }
}