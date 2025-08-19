// Enhanced Google Custom Search data source implementation

import axios from 'axios';
import { DataSourceBase, DataSourceConfig } from './base/DataSourceBase';
import { 
  EnhancedOpportunity, 
  OpportunitySearchParams, 
  OpportunityType, 
  OpportunityStatus 
} from '../../types/opportunities';
import { opportunitySources } from '../../config';
import { logger } from '../../utils/logger';

interface GoogleSearchItem {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
  pagemap?: {
    metatags?: Array<{
      'og:image'?: string;
      'og:description'?: string;
      'article:published_time'?: string;
      'article:modified_time'?: string;
    }>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

export class GoogleSearchDataSource extends DataSourceBase {
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor(apiKey: string, searchCx: string) {
    const config: DataSourceConfig = {
      name: 'Google Custom Search',
      apiKey,
      baseUrl: 'https://www.googleapis.com/customsearch/v1',
      rateLimit: {
        requestsPerMinute: 100, // Google's default limit
        requestsPerDay: 10000
      },
      timeout: 10000,
      retries: 3,
      enabled: !!(apiKey && searchCx && !apiKey.includes('placeholder')),
      priority: 1
    };

    super(config);
    this.searchCx = searchCx;
  }

  private searchCx: string;

  validateConfig(): boolean {
    return !!(
      this.config.apiKey &&
      this.searchCx &&
      !this.config.apiKey.includes('placeholder') &&
      !this.searchCx.includes('placeholder')
    );
  }

  async getHealthStatus(): Promise<{ healthy: boolean; message?: string }> {
    if (!this.validateConfig()) {
      return {
        healthy: false,
        message: 'Google Search API credentials not properly configured'
      };
    }

    try {
      // Make a minimal test search
      await this.performSearch('test', 1, 1);
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message: `Google Search API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async searchOpportunities(params: OpportunitySearchParams): Promise<EnhancedOpportunity[]> {
    if (!this.validateConfig()) {
      logger.warn('Google Search API not configured, returning mock data');
      return this.getMockData(params);
    }

    const query = this.buildSearchQuery(params);
    const limit = Math.min(params.limit || 10, 50); // Google CSE max is 10 per request, we'll do multiple requests
    
    try {
      const googleResults = await this.performMultipleSearches(query, limit);
      const opportunities = this.convertToOpportunities(googleResults, params);
      
      return this.filterAndRankResults(opportunities, params);
    } catch (error) {
      logger.error('Google Search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  private buildSearchQuery(params: OpportunitySearchParams): string {
    const baseQuery = params.query || 'opportunity';
    
    // Build type-specific site filters
    const typeFilters: string[] = [];
    if (params.type && params.type.length > 0) {
      params.type.forEach(type => {
        const sites = opportunitySources[type as keyof typeof opportunitySources];
        if (sites) {
          typeFilters.push(sites.map(site => `site:${site}`).join(' OR '));
        }
      });
    } else {
      // Default to all opportunity sites
      const allSites = Object.values(opportunitySources).flat();
      typeFilters.push(allSites.map(site => `site:${site}`).join(' OR '));
    }

    // Add opportunity-specific terms
    const opportunityTerms = ['application', 'deadline', 'eligibility', 'requirements'];
    const termFilter = opportunityTerms.map(term => `"${term}"`).join(' OR ');

    // Combine query parts
    let searchQuery = `${baseQuery}`;
    if (typeFilters.length > 0) {
      searchQuery += ` (${typeFilters.join(' OR ')})`;
    }
    searchQuery += ` (${termFilter})`;

    // Add location filter if specified
    if (params.location?.country) {
      searchQuery += ` "${params.location.country}"`;
    }

    return searchQuery;
  }

  private async performMultipleSearches(query: string, totalLimit: number): Promise<GoogleSearchItem[]> {
    const itemsPerRequest = 10; // Google CSE limitation
    const totalRequests = Math.ceil(totalLimit / itemsPerRequest);
    const allItems: GoogleSearchItem[] = [];

    for (let i = 0; i < totalRequests; i++) {
      const start = i * itemsPerRequest + 1;
      const num = Math.min(itemsPerRequest, totalLimit - allItems.length);
      
      try {
        const items = await this.performSearch(query, num, Math.floor(start / 10) + 1);
        allItems.push(...items);
        
        if (allItems.length >= totalLimit) {
          break;
        }
        
        // Add delay between requests to respect rate limits
        if (i < totalRequests - 1) {
          await this.sleep(100);
        }
      } catch (error) {
        logger.warn(`Search request ${i + 1} failed`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with other requests
      }
    }

    return allItems.slice(0, totalLimit);
  }

  private async performSearch(query: string, num: number, page: number): Promise<GoogleSearchItem[]> {
    const start = (page - 1) * 10 + 1;
    
    return this.withRetry(async () => {
      const response = await axios.get<GoogleSearchResponse>(this.baseUrl, {
        params: {
          q: query,
          cx: this.searchCx,
          key: this.config.apiKey,
          start: start.toString(),
          num: num.toString(),
          fields: 'items(title,snippet,link,displayLink,pagemap),searchInformation'
        },
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'Edutu-Opportunities-Aggregator/2.0'
        }
      });

      if (response.data.error) {
        throw new Error(`Google Search API error: ${response.data.error.message}`);
      }

      return response.data.items || [];
    });
  }

  private convertToOpportunities(
    googleItems: GoogleSearchItem[], 
    searchParams: OpportunitySearchParams
  ): EnhancedOpportunity[] {
    return googleItems.map((item, index) => {
      const opportunity: EnhancedOpportunity = {
        id: `google-${Buffer.from(item.link).toString('base64').slice(0, 16)}`,
        title: this.cleanTitle(item.title),
        description: item.snippet || '',
        summary: this.extractSummary(item),
        type: this.inferOpportunityType(item, searchParams),
        status: OpportunityStatus.ACTIVE,
        
        organization: {
          organization: this.extractOrganization(item.displayLink),
          website: this.extractDomain(item.link),
          applicationUrl: item.link
        },
        
        location: {
          country: searchParams.location?.country
        },
        
        dates: {
          lastUpdated: new Date().toISOString(),
          announcementDate: this.extractPublishedDate(item)
        },
        
        images: [this.extractImage(item)].filter(Boolean),
        
        metadata: {
          source: this.config.name,
          sourceUrl: item.link,
          scrapedAt: new Date().toISOString(),
          trustScore: this.calculateTrustScore(item.displayLink),
          tags: this.extractTags(item)
        }
      };

      return opportunity;
    });
  }

  private inferOpportunityType(item: GoogleSearchItem, params: OpportunitySearchParams): OpportunityType {
    // If specific types requested, try to match
    if (params.type && params.type.length === 1) {
      return params.type[0];
    }

    const text = `${item.title} ${item.snippet}`.toLowerCase();
    
    if (text.includes('scholarship') || text.includes('bursary')) {
      return OpportunityType.SCHOLARSHIP;
    }
    if (text.includes('fellowship')) {
      return OpportunityType.FELLOWSHIP;
    }
    if (text.includes('internship') || text.includes('intern')) {
      return OpportunityType.INTERNSHIP;
    }
    if (text.includes('job') || text.includes('career') || text.includes('position')) {
      return OpportunityType.JOB;
    }
    if (text.includes('grant') || text.includes('funding')) {
      return OpportunityType.GRANT;
    }
    if (text.includes('competition') || text.includes('contest')) {
      return OpportunityType.COMPETITION;
    }
    
    return OpportunityType.SCHOLARSHIP; // Default
  }

  private filterAndRankResults(
    opportunities: EnhancedOpportunity[], 
    params: OpportunitySearchParams
  ): EnhancedOpportunity[] {
    let filtered = opportunities;

    // Filter by deadline if specified
    if (params.dateRange?.deadlineAfter || params.dateRange?.deadlineBefore) {
      filtered = filtered.filter(opp => {
        if (!opp.dates.applicationDeadline) return true; // Include if no deadline info
        
        const deadline = new Date(opp.dates.applicationDeadline);
        const now = new Date();
        
        if (params.dateRange?.deadlineAfter) {
          const afterDate = new Date(params.dateRange.deadlineAfter);
          if (deadline < afterDate) return false;
        }
        
        if (params.dateRange?.deadlineBefore) {
          const beforeDate = new Date(params.dateRange.deadlineBefore);
          if (deadline > beforeDate) return false;
        }
        
        return deadline > now; // Only include future deadlines
      });
    }

    // Sort results
    const sortBy = params.sortBy || 'relevance';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          const aDeadline = a.dates.applicationDeadline ? new Date(a.dates.applicationDeadline) : new Date('2099-12-31');
          const bDeadline = b.dates.applicationDeadline ? new Date(b.dates.applicationDeadline) : new Date('2099-12-31');
          return params.sortOrder === 'desc' ? bDeadline.getTime() - aDeadline.getTime() : aDeadline.getTime() - bDeadline.getTime();
          
        case 'posted':
          const aPosted = new Date(a.dates.lastUpdated);
          const bPosted = new Date(b.dates.lastUpdated);
          return params.sortOrder === 'desc' ? bPosted.getTime() - aPosted.getTime() : aPosted.getTime() - bPosted.getTime();
          
        case 'relevance':
        default:
          return (b.metadata.trustScore || 0) - (a.metadata.trustScore || 0);
      }
    });

    return filtered.slice(0, params.limit || 10);
  }

  // Helper methods (shortened for brevity, using existing logic from original service)
  private cleanTitle(title: string): string {
    return title.replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  private extractSummary(item: GoogleSearchItem): string {
    const ogDescription = item.pagemap?.metatags?.[0]?.['og:description'];
    return (ogDescription || item.snippet || '').slice(0, 300);
  }

  private extractImage(item: GoogleSearchItem): string {
    return item.pagemap?.metatags?.[0]?.['og:image'] || '';
  }

  private extractPublishedDate(item: GoogleSearchItem): string {
    const publishedTime = item.pagemap?.metatags?.[0]?.['article:published_time'];
    return publishedTime || new Date().toISOString();
  }

  private extractOrganization(displayLink: string): string {
    return displayLink.replace(/^www\./, '').split('.')[0];
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  }

  private calculateTrustScore(domain: string): number {
    const trustedDomains = Object.values(opportunitySources).flat();
    if (trustedDomains.some(trusted => domain.includes(trusted))) {
      return 85 + Math.random() * 15; // 85-100 for trusted sources
    }
    return 50 + Math.random() * 35; // 50-85 for others
  }

  private extractTags(item: GoogleSearchItem): string[] {
    const text = `${item.title} ${item.snippet}`.toLowerCase();
    const tags: string[] = [];
    
    const tagKeywords = {
      'international': ['international', 'global', 'worldwide'],
      'undergraduate': ['undergraduate', 'bachelor'],
      'graduate': ['graduate', 'master', 'phd', 'doctoral'],
      'stem': ['stem', 'science', 'technology', 'engineering', 'math'],
      'research': ['research', 'thesis', 'dissertation'],
      'full-time': ['full-time', 'fulltime'],
      'part-time': ['part-time', 'parttime'],
      'remote': ['remote', 'online', 'virtual']
    };

    Object.entries(tagKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(tag);
      }
    });

    return tags;
  }

  private getMockData(params: OpportunitySearchParams): EnhancedOpportunity[] {
    const query = params.query || 'opportunity';
    const type = params.type?.[0] || OpportunityType.SCHOLARSHIP;
    
    return [{
      id: 'mock-1',
      title: `Mock ${query} ${type}`,
      description: `This is a mock ${type} for ${query}. Configure Google Search API for real data.`,
      summary: `Mock opportunity for testing purposes`,
      type,
      status: OpportunityStatus.ACTIVE,
      organization: {
        organization: 'Mock Organization',
        website: 'https://example.com',
        applicationUrl: 'https://example.com/apply'
      },
      location: params.location || {},
      dates: {
        lastUpdated: new Date().toISOString(),
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      metadata: {
        source: this.config.name,
        sourceUrl: 'https://example.com',
        scrapedAt: new Date().toISOString(),
        trustScore: 75,
        tags: ['mock', 'test']
      }
    }];
  }
}