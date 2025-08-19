import { Request, Response } from 'express';
import { DataSourceManager } from '../services/DataSourceManager';
import { EnhancedCacheService } from '../services/cache/EnhancedCacheService';
import { 
  EnhancedOpportunity, 
  OpportunitySearchParams, 
  OpportunitySearchResult,
  OpportunityType 
} from '../types/opportunities';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

// Legacy support for existing API
import { cleanOpportunityData, filterOpportunityKeywords, OpportunityItem } from '../utils/cleanData';

// Legacy interfaces for backward compatibility
export interface OpportunitiesQuery {
  topic?: string;
  query?: string; // New parameter
  type?: string; // Comma-separated opportunity types
  limit?: string;
  page?: string;
  sites?: string;
  refresh?: string;
  location?: string; // JSON string for location filter
  sortBy?: string;
  sortOrder?: string;
  tags?: string;
}

export interface OpportunitiesResponse {
  success: boolean;
  data: OpportunityItem[] | EnhancedOpportunity[]; // Support both formats
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    offset?: number;
  };
  meta: {
    searchTerm: string;
    cached: boolean;
    timestamp: string;
    took?: number;
    sources?: string[];
    enhanced?: boolean;
  };
  filters?: {
    types: { type: OpportunityType; count: number }[];
    locations: { country: string; count: number }[];
    organizations: { name: string; count: number }[];
  };
  error?: string;
}

export class OpportunitiesController {
  private dataSourceManager: DataSourceManager;
  private cacheService: EnhancedCacheService;
  private legacyMode: boolean;

  constructor(legacyMode: boolean = true) {
    this.dataSourceManager = new DataSourceManager();
    this.cacheService = new EnhancedCacheService();
    this.legacyMode = legacyMode;
    
    logger.info('OpportunitiesController initialized', {
      legacyMode,
      enhancedFeatures: !legacyMode
    });
  }

  async getOpportunities(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const searchParams = this.parseSearchParameters(req.query as unknown as OpportunitiesQuery);
      const refresh = req.query.refresh === 'true';

      logger.info('Processing opportunities request', { 
        searchParams,
        refresh,
        legacyMode: this.legacyMode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      let result: OpportunitySearchResult | null = null;
      let cached = false;

      // Try cache first unless refresh is requested
      if (!refresh) {
        const cacheKey = this.cacheService.generateKey(searchParams);
        result = await this.cacheService.get(cacheKey);
        cached = result !== null;
      }

      // If not cached or refresh requested, search data sources
      if (!result) {
        result = await this.dataSourceManager.searchOpportunities(searchParams);
        
        // Cache the result if we got data
        if (result.opportunities.length > 0) {
          const cacheKey = this.cacheService.generateKey(searchParams);
          await this.cacheService.set(cacheKey, result, searchParams);
        }
      }

      // Convert to response format
      const response = this.formatResponse(result, searchParams, cached, startTime);

      const duration = Date.now() - startTime;
      logger.info('Opportunities request completed', { 
        query: searchParams.query,
        resultCount: result.opportunities.length,
        cached,
        duration,
        enhanced: !this.legacyMode
      });

      res.json(response);
    } catch (error) {
      this.handleError(res, error, req.query as unknown as OpportunitiesQuery);
    }
  }

  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = this.cacheService.getStats();
      const dataSourceStats = this.dataSourceManager.getDataSourceStats();
      
      const stats = {
        cache: cacheStats,
        dataSources: Object.fromEntries(dataSourceStats),
        enhanced: !this.legacyMode
      };
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      this.cacheService.clear();
      
      logger.info('Cache cleared via API request', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Enhanced cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private parseSearchParameters(query: OpportunitiesQuery): OpportunitySearchParams {
    // Parse query - support both 'topic' (legacy) and 'query' (new)
    const searchQuery = (query.query || query.topic || '').trim();
    
    // Parse opportunity types
    let types: OpportunityType[] | undefined;
    if (query.type) {
      const typeStrings = query.type.split(',').map(t => t.trim().toLowerCase());
      types = typeStrings.map(t => {
        switch (t) {
          case 'scholarship': case 'scholarships': return OpportunityType.SCHOLARSHIP;
          case 'fellowship': case 'fellowships': return OpportunityType.FELLOWSHIP;
          case 'internship': case 'internships': return OpportunityType.INTERNSHIP;
          case 'job': case 'jobs': return OpportunityType.JOB;
          case 'grant': case 'grants': return OpportunityType.GRANT;
          case 'competition': case 'competitions': return OpportunityType.COMPETITION;
          case 'course': case 'courses': return OpportunityType.COURSE;
          case 'freelance': return OpportunityType.FREELANCE;
          case 'volunteer': return OpportunityType.VOLUNTEER;
          default: return OpportunityType.SCHOLARSHIP;
        }
      }).filter(Boolean);
    }
    
    // Parse pagination
    const limit = Math.min(
      parseInt(query.limit || appConfig.defaultPageSize.toString(), 10),
      appConfig.maxPageSize
    );
    const page = parseInt(query.page || '1', 10);
    const offset = (page - 1) * limit;
    
    // Parse location
    let location;
    if (query.location) {
      try {
        location = JSON.parse(query.location);
      } catch {
        // If not JSON, treat as country name
        location = { country: query.location };
      }
    }
    
    // Parse sources (legacy sites parameter)
    let sources: string[] | undefined;
    if (query.sites) {
      sources = query.sites
        .split(',')
        .map(site => site.trim())
        .filter(site => site.length > 0);
    }
    
    // Parse tags
    let tags: string[] | undefined;
    if (query.tags) {
      tags = query.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
    
    const params: OpportunitySearchParams = {
      query: searchQuery || undefined,
      type: types,
      location,
      source: sources,
      tags,
      limit,
      offset,
      sortBy: query.sortBy as any || 'relevance',
      sortOrder: query.sortOrder as any || 'desc'
    };
    
    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key as keyof OpportunitySearchParams] === undefined) {
        delete params[key as keyof OpportunitySearchParams];
      }
    });
    
    return params;
  }

  private formatResponse(
    result: OpportunitySearchResult,
    searchParams: OpportunitySearchParams,
    cached: boolean,
    startTime: number
  ): OpportunitiesResponse {
    const page = Math.floor((searchParams.offset || 0) / (searchParams.limit || 10)) + 1;
    
    // If in legacy mode, convert enhanced opportunities to legacy format
    let data: OpportunityItem[] | EnhancedOpportunity[];
    
    if (this.legacyMode) {
      data = result.opportunities.map(this.convertToLegacyFormat);
    } else {
      data = result.opportunities;
    }
    
    const response: OpportunitiesResponse = {
      success: true,
      data,
      pagination: {
        page,
        limit: searchParams.limit || 10,
        total: result.total,
        hasNext: result.hasMore,
        offset: searchParams.offset
      },
      meta: {
        searchTerm: searchParams.query || '',
        cached,
        timestamp: new Date().toISOString(),
        took: Date.now() - startTime,
        sources: Array.from(this.dataSourceManager.getDataSourceStats().keys()),
        enhanced: !this.legacyMode
      }
    };
    
    // Include filters in enhanced mode
    if (!this.legacyMode) {
      response.filters = result.filters;
    }
    
    return response;
  }
  
  private convertToLegacyFormat(opportunity: EnhancedOpportunity): OpportunityItem {
    return {
      title: opportunity.title,
      summary: opportunity.summary,
      link: opportunity.organization.applicationUrl || opportunity.metadata.sourceUrl,
      image: opportunity.images?.[0] || '',
      publishedDate: opportunity.dates.announcementDate || opportunity.dates.lastUpdated.split('T')[0],
      source: opportunity.organization.organization
    };
  }

  private handleError(res: Response, error: unknown, query?: OpportunitiesQuery): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = this.getStatusCodeFromError(error);

    logger.error('Request failed', {
      error: errorMessage,
      statusCode,
      query,
      enhanced: !this.legacyMode,
      stack: error instanceof Error ? error.stack : undefined
    });

    const response: OpportunitiesResponse = {
      success: false,
      data: [],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        hasNext: false
      },
      meta: {
        searchTerm: query?.query || query?.topic || '',
        cached: false,
        timestamp: new Date().toISOString(),
        enhanced: !this.legacyMode
      },
      error: statusCode === 500 ? 'Internal server error' : errorMessage
    };

    res.status(statusCode).json(response);
  }
  
  // New methods for enhanced functionality
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await this.dataSourceManager.getHealthStatus();
      const cacheStats = this.cacheService.getStats();
      
      res.json({
        success: true,
        status: healthStatus.healthy ? 'healthy' : 'degraded',
        dataSources: healthStatus.sources,
        cache: {
          entries: cacheStats.totalEntries,
          hitRate: cacheStats.hitRate,
          size: cacheStats.totalSize
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }
  
  async searchSimilar(req: Request, res: Response): Promise<void> {
    try {
      const searchParams = this.parseSearchParameters(req.query as unknown as OpportunitiesQuery);
      const threshold = parseFloat(req.query.threshold as string) || 0.8;
      
      const similarResults = await this.cacheService.findSimilar(searchParams, threshold);
      
      res.json({
        success: true,
        data: similarResults,
        count: similarResults.length,
        threshold,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }
  
  // Toggle between legacy and enhanced mode
  setLegacyMode(enabled: boolean): void {
    this.legacyMode = enabled;
    logger.info('Legacy mode updated', { legacyMode: enabled });
  }
  
  // Get current configuration
  getConfig(): any {
    return {
      legacyMode: this.legacyMode,
      cacheConfig: this.cacheService.getStats(),
      dataSourceStats: Object.fromEntries(this.dataSourceManager.getDataSourceStats())
    };
  }

  private getStatusCodeFromError(error: unknown): number {
    if (error instanceof Error) {
      if (error.message.includes('required') || 
          error.message.includes('must be') ||
          error.message.includes('invalid')) {
        return 400;
      }
      
      if (error.message.includes('API error') || 
          error.message.includes('quota') ||
          error.message.includes('Rate limit')) {
        return 503;
      }
      
      if (error.message.includes('not found') ||
          error.message.includes('not exist')) {
        return 404;
      }
    }

    return 500;
  }
}