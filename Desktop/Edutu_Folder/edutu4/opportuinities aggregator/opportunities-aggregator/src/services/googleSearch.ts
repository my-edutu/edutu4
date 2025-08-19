import axios, { AxiosResponse } from 'axios';
import { appConfig, opportunitySites } from '../config';
import { logger } from '../utils/logger';
import { GoogleSearchItem } from '../utils/cleanData';

export interface GoogleSearchResponse {
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

export interface SearchParams {
  topic: string;
  limit: number;
  page: number;
  siteFilter?: string[];
}

export class GoogleSearchService {
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = !appConfig.googleSearchApiKey.includes('placeholder') && 
                       !appConfig.googleSearchApiKey.includes('your_') &&
                       !appConfig.googleSearchCx.includes('placeholder') &&
                       !appConfig.googleSearchCx.includes('your_');
  }

  async searchOpportunities(params: SearchParams): Promise<GoogleSearchItem[]> {
    if (!this.isConfigured) {
      logger.warn('Google Search API not configured, returning mock data');
      return this.getMockData(params);
    }

    const { topic, limit, page, siteFilter } = params;
    const start = (page - 1) * limit + 1;

    const searchQuery = this.buildSearchQuery(topic, siteFilter);
    
    logger.info('Performing Google Custom Search', { 
      query: searchQuery, 
      start, 
      limit,
      page 
    });

    try {
      const response = await this.executeSearchWithRetry({
        q: searchQuery,
        cx: appConfig.googleSearchCx,
        key: appConfig.googleSearchApiKey,
        start: start.toString(),
        num: Math.min(limit, 10).toString(), // Google CSE max is 10 per request
        fields: 'items(title,snippet,link,displayLink,pagemap),searchInformation'
      });

      if (response.data.error) {
        throw new Error(`Google Search API error: ${response.data.error.message}`);
      }

      const items = response.data.items || [];
      
      logger.info('Google Custom Search completed', { 
        totalResults: response.data.searchInformation?.totalResults,
        returnedItems: items.length,
        searchTime: response.data.searchInformation?.searchTime
      });

      return items;
    } catch (error) {
      logger.error('Google Custom Search failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: searchQuery,
        start,
        limit
      });
      throw error;
    }
  }

  private buildSearchQuery(topic: string, siteFilter?: string[]): string {
    const sites = siteFilter || opportunitySites;
    const siteQuery = sites.map(site => `site:${site}`).join(' OR ');
    
    const opportunityTerms = [
      'scholarship', 'fellowship', 'internship', 'grant', 
      'opportunity', 'application', 'program'
    ];
    
    const topicWithOpportunityTerms = `${topic} (${opportunityTerms.join(' OR ')})`;
    
    return `${topicWithOpportunityTerms} (${siteQuery})`;
  }

  private async executeSearchWithRetry(params: Record<string, string>): Promise<AxiosResponse<GoogleSearchResponse>> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get<GoogleSearchResponse>(this.baseUrl, {
          params,
          timeout: 10000,
          headers: {
            'User-Agent': 'Edutu-Opportunities-Aggregator/1.0'
          }
        });

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        logger.warn(`Google Search attempt ${attempt} failed`, {
          error: lastError.message,
          attempt,
          maxRetries: this.maxRetries
        });

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchMultiplePages(params: SearchParams): Promise<GoogleSearchItem[]> {
    const { limit } = params;
    const itemsPerPage = 10; // Google CSE limitation
    const totalPages = Math.ceil(limit / itemsPerPage);
    
    const promises: Promise<GoogleSearchItem[]>[] = [];
    
    for (let i = 0; i < totalPages; i++) {
      const pageParams = {
        ...params,
        page: params.page + i,
        limit: Math.min(itemsPerPage, limit - (i * itemsPerPage))
      };
      
      if (pageParams.limit > 0) {
        promises.push(this.searchOpportunities(pageParams));
      }
    }

    try {
      const results = await Promise.allSettled(promises);
      const allItems: GoogleSearchItem[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allItems.push(...result.value);
        } else {
          logger.warn('Page search failed', { error: result.reason?.message });
        }
      }

      return allItems.slice(0, limit);
    } catch (error) {
      logger.error('Multiple page search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private getMockData(params: SearchParams): GoogleSearchItem[] {
    const { topic, limit } = params;
    
    const mockData: GoogleSearchItem[] = [
      {
        title: `Mock ${topic} Scholarship Opportunity`,
        snippet: `This is a mock scholarship opportunity for ${topic} students. Application deadline is upcoming.`,
        link: 'https://example.com/scholarship1',
        displayLink: 'opportunitydesk.org',
        pagemap: {
          metatags: [{
            'og:image': 'https://via.placeholder.com/400x200',
            'og:description': `Detailed description of ${topic} scholarship opportunity.`,
            'article:published_time': new Date().toISOString()
          }]
        }
      },
      {
        title: `${topic} Fellowship Program 2024`,
        snippet: `Apply for the prestigious ${topic} fellowship program. Full funding available for qualified candidates.`,
        link: 'https://example.com/fellowship1',
        displayLink: 'scholars4dev.com',
        pagemap: {
          metatags: [{
            'og:image': 'https://via.placeholder.com/400x200',
            'og:description': `Fellowship program focused on ${topic} research and development.`,
            'article:published_time': new Date().toISOString()
          }]
        }
      },
      {
        title: `${topic} Internship Opportunities`,
        snippet: `Discover exciting internship opportunities in ${topic}. Gain practical experience and build your career.`,
        link: 'https://example.com/internship1',
        displayLink: 'youthopportunitieshub.org',
        pagemap: {
          metatags: [{
            'og:image': 'https://via.placeholder.com/400x200',
            'og:description': `Professional internship program in ${topic} field.`,
            'article:published_time': new Date().toISOString()
          }]
        }
      }
    ];

    // Return limited results based on the limit parameter
    return mockData.slice(0, Math.min(limit, mockData.length));
  }
}