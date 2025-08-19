// Abstract base class for all data sources

import { EnhancedOpportunity, OpportunitySearchParams } from '../../../types/opportunities';
import { logger } from '../../../utils/logger';

export interface DataSourceConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
  timeout: number;
  retries: number;
  enabled: boolean;
  priority: number; // Higher priority sources are checked first
}

export interface DataSourceStats {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: string;
  rateLimitStatus: {
    remaining: number;
    resetTime?: string;
  };
}

export abstract class DataSourceBase {
  protected config: DataSourceConfig;
  protected stats: DataSourceStats;
  private requestHistory: number[] = []; // Timestamps for rate limiting

  constructor(config: DataSourceConfig) {
    this.config = config;
    this.stats = {
      name: config.name,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitStatus: {
        remaining: config.rateLimit.requestsPerMinute
      }
    };
  }

  // Abstract methods that must be implemented by each data source
  abstract searchOpportunities(params: OpportunitySearchParams): Promise<EnhancedOpportunity[]>;
  abstract validateConfig(): boolean;
  abstract getHealthStatus(): Promise<{ healthy: boolean; message?: string }>;

  // Rate limiting check
  protected canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // Remove requests older than 1 minute
    this.requestHistory = this.requestHistory.filter(time => time > oneMinuteAgo);
    
    // Check if we can make another request
    const requestsInLastMinute = this.requestHistory.length;
    return requestsInLastMinute < this.config.rateLimit.requestsPerMinute;
  }

  protected recordRequest(): void {
    this.requestHistory.push(Date.now());
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date().toISOString();
    this.updateRateLimitStatus();
  }

  protected recordSuccess(responseTime: number): void {
    this.stats.successfulRequests++;
    this.updateAverageResponseTime(responseTime);
  }

  protected recordFailure(): void {
    this.stats.failedRequests++;
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.successfulRequests - 1);
    this.stats.averageResponseTime = (totalResponseTime + responseTime) / this.stats.successfulRequests;
  }

  private updateRateLimitStatus(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const recentRequests = this.requestHistory.filter(time => time > oneMinuteAgo).length;
    this.stats.rateLimitStatus.remaining = Math.max(0, this.config.rateLimit.requestsPerMinute - recentRequests);
  }

  // Public method to execute search with error handling and metrics
  public async search(params: OpportunitySearchParams): Promise<EnhancedOpportunity[]> {
    if (!this.config.enabled) {
      logger.debug(`Data source ${this.config.name} is disabled`);
      return [];
    }

    if (!this.canMakeRequest()) {
      logger.warn(`Rate limit exceeded for data source ${this.config.name}`);
      throw new Error(`Rate limit exceeded for ${this.config.name}`);
    }

    const startTime = Date.now();
    this.recordRequest();

    try {
      logger.info(`Searching opportunities via ${this.config.name}`, {
        source: this.config.name,
        params: { ...params, limit: params.limit || 10 }
      });

      const opportunities = await this.searchOpportunities(params);
      
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);

      logger.info(`Search completed via ${this.config.name}`, {
        source: this.config.name,
        resultCount: opportunities.length,
        responseTime
      });

      return opportunities;
    } catch (error) {
      this.recordFailure();
      const responseTime = Date.now() - startTime;
      
      logger.error(`Search failed via ${this.config.name}`, {
        source: this.config.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      });

      throw error;
    }
  }

  public getStats(): DataSourceStats {
    this.updateRateLimitStatus();
    return { ...this.stats };
  }

  public getConfig(): DataSourceConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<DataSourceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Helper method for implementing exponential backoff
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method for retry logic
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Cap at 10 seconds
          logger.warn(`Attempt ${attempt} failed for ${this.config.name}, retrying in ${delay}ms`, {
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }
}