// Enhanced caching system for opportunity aggregation

import { EnhancedOpportunity, OpportunitySearchParams, OpportunitySearchResult } from '../../types/opportunities';
import { logger } from '../../utils/logger';
import { appConfig } from '../../config';

export interface CacheEntry {
  data: OpportunitySearchResult;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  searchParams: OpportunitySearchParams;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // Approximate size in bytes
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageAccessCount: number;
  oldestEntry?: string;
  newestEntry?: string;
}

export interface CacheConfig {
  maxEntries: number;
  defaultTtl: number;
  maxSize: number; // Max cache size in bytes
  compressionEnabled: boolean;
  persistToDisk: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'hybrid';
}

export class EnhancedCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private accessHistory: Map<string, number[]> = new Map(); // For LRU tracking
  private cleanupInterval: NodeJS.Timeout;
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    totalEvictions: 0
  };

  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: 1000,
      defaultTtl: appConfig.cacheTimeoutMs,
      maxSize: 100 * 1024 * 1024, // 100MB default
      compressionEnabled: false,
      persistToDisk: false,
      evictionPolicy: 'hybrid',
      ...config
    };

    this.startCleanupTask();
    logger.info('Enhanced Cache Service initialized', {
      config: this.config
    });
  }

  // Generate cache key from search parameters
  generateKey(params: OpportunitySearchParams): string {
    const normalized = {
      query: params.query?.toLowerCase().trim() || '',
      type: params.type?.sort().join(',') || '',
      location: JSON.stringify(params.location || {}),
      compensation: JSON.stringify(params.compensation || {}),
      experience: params.experience?.sort().join(',') || '',
      dateRange: JSON.stringify(params.dateRange || {}),
      tags: params.tags?.sort().join(',') || '',
      source: params.source?.sort().join(',') || '',
      limit: params.limit || 10,
      offset: params.offset || 0,
      sortBy: params.sortBy || 'relevance',
      sortOrder: params.sortOrder || 'desc'
    };

    const keyString = JSON.stringify(normalized);
    return Buffer.from(keyString).toString('base64').slice(0, 32);
  }

  // Get cached result
  async get(key: string): Promise<OpportunitySearchResult | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.totalMisses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.accessHistory.delete(key);
      this.stats.totalMisses++;
      logger.debug('Cache entry expired and removed', { key });
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessHistory(key);
    
    this.stats.totalHits++;
    
    // Mark as cached for the response
    const result = {
      ...entry.data,
      searchMeta: {
        ...entry.data.searchMeta,
        cached: true
      }
    };

    logger.debug('Cache hit', { 
      key, 
      accessCount: entry.accessCount,
      resultCount: result.opportunities.length
    });

    return result;
  }

  // Store result in cache
  async set(key: string, data: OpportunitySearchResult, params: OpportunitySearchParams, ttl?: number): Promise<void> {
    const actualTtl = ttl || this.config.defaultTtl;
    const now = Date.now();
    
    const entry: CacheEntry = {
      data: { ...data }, // Deep copy to avoid mutations
      timestamp: now,
      ttl: actualTtl,
      accessCount: 1,
      lastAccessed: now,
      searchParams: { ...params }
    };

    // Check if we need to evict entries before adding
    await this.enforceCapacityLimits();

    this.cache.set(key, entry);
    this.updateAccessHistory(key);

    logger.debug('Cache entry stored', { 
      key, 
      dataLength: data.opportunities.length,
      ttlMs: actualTtl,
      totalEntries: this.cache.size
    });
  }

  // Smart cache invalidation based on search parameters
  async invalidateRelated(params: OpportunitySearchParams): Promise<number> {
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.areSearchParamsRelated(params, entry.searchParams)) {
        this.cache.delete(key);
        this.accessHistory.delete(key);
        invalidatedCount++;
      }
    }

    if (invalidatedCount > 0) {
      logger.info('Related cache entries invalidated', {
        count: invalidatedCount,
        params: params
      });
    }

    return invalidatedCount;
  }

  // Check if search parameters are related enough to invalidate
  private areSearchParamsRelated(params1: OpportunitySearchParams, params2: OpportunitySearchParams): boolean {
    // Same query with different pagination - related
    if (params1.query === params2.query && 
        JSON.stringify(params1.type) === JSON.stringify(params2.type)) {
      return true;
    }

    // Same source and type - could be related
    if (JSON.stringify(params1.source) === JSON.stringify(params2.source) &&
        JSON.stringify(params1.type) === JSON.stringify(params2.type)) {
      return true;
    }

    return false;
  }

  // Advanced search in cache with fuzzy matching
  async findSimilar(params: OpportunitySearchParams, threshold: number = 0.8): Promise<OpportunitySearchResult[]> {
    const results: OpportunitySearchResult[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const similarity = this.calculateSearchSimilarity(params, entry.searchParams);
      
      if (similarity >= threshold) {
        // Update access stats
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.updateAccessHistory(key);
        
        const result = {
          ...entry.data,
          searchMeta: {
            ...entry.data.searchMeta,
            cached: true,
            similarity
          }
        };
        
        results.push(result);
      }
    }

    return results.sort((a, b) => (b.searchMeta as any).similarity - (a.searchMeta as any).similarity);
  }

  private calculateSearchSimilarity(params1: OpportunitySearchParams, params2: OpportunitySearchParams): number {
    let score = 0;
    let factors = 0;

    // Query similarity (most important)
    if (params1.query && params2.query) {
      const query1 = params1.query.toLowerCase();
      const query2 = params2.query.toLowerCase();
      
      if (query1 === query2) {
        score += 0.4;
      } else {
        const words1 = new Set(query1.split(' '));
        const words2 = new Set(query2.split(' '));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        if (union.size > 0) {
          score += 0.4 * (intersection.size / union.size);
        }
      }
      factors++;
    }

    // Type similarity
    const types1 = params1.type || [];
    const types2 = params2.type || [];
    if (types1.length > 0 || types2.length > 0) {
      const typeSet1 = new Set(types1);
      const typeSet2 = new Set(types2);
      const intersection = new Set([...typeSet1].filter(x => typeSet2.has(x)));
      const union = new Set([...typeSet1, ...typeSet2]);
      
      if (union.size > 0) {
        score += 0.3 * (intersection.size / union.size);
      }
      factors++;
    }

    // Location similarity
    if (params1.location?.country && params2.location?.country) {
      score += params1.location.country === params2.location.country ? 0.2 : 0;
      factors++;
    }

    // Source similarity
    const sources1 = params1.source || [];
    const sources2 = params2.source || [];
    if (sources1.length > 0 || sources2.length > 0) {
      const sourceSet1 = new Set(sources1);
      const sourceSet2 = new Set(sources2);
      const intersection = new Set([...sourceSet1].filter(x => sourceSet2.has(x)));
      const union = new Set([...sourceSet1, ...sourceSet2]);
      
      if (union.size > 0) {
        score += 0.1 * (intersection.size / union.size);
      }
      factors++;
    }

    return factors > 0 ? score : 0;
  }

  private updateAccessHistory(key: string): void {
    const now = Date.now();
    const history = this.accessHistory.get(key) || [];
    
    // Keep only recent access times (last hour)
    const recentHistory = history.filter(time => now - time < 3600000);
    recentHistory.push(now);
    
    this.accessHistory.set(key, recentHistory);
  }

  private async enforceCapacityLimits(): Promise<void> {
    // Check entry count limit
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictEntries(Math.floor(this.config.maxEntries * 0.1)); // Evict 10%
    }

    // Check memory size limit (approximate)
    const currentSize = this.estimateCacheSize();
    if (currentSize > this.config.maxSize) {
      const targetEvictions = Math.floor(this.cache.size * 0.2); // Evict 20%
      await this.evictEntries(targetEvictions);
    }
  }

  private estimateCacheSize(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimation: JSON stringify size
      totalSize += JSON.stringify(entry).length * 2; // Assume UTF-16
    }
    
    return totalSize;
  }

  private async evictEntries(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    let evicted = 0;

    switch (this.config.evictionPolicy) {
      case 'lru':
        entries.sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);
        break;
        
      case 'lfu':
        entries.sort(([,a], [,b]) => a.accessCount - b.accessCount);
        break;
        
      case 'ttl':
        entries.sort(([,a], [,b]) => (a.timestamp + a.ttl) - (b.timestamp + b.ttl));
        break;
        
      case 'hybrid':
      default:
        // Combine LRU and LFU with TTL as tiebreaker
        entries.sort(([,a], [,b]) => {
          const scoreA = a.accessCount * 0.6 + (Date.now() - a.lastAccessed) * -0.0001;
          const scoreB = b.accessCount * 0.6 + (Date.now() - b.lastAccessed) * -0.0001;
          return scoreA - scoreB;
        });
        break;
    }

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.accessHistory.delete(key);
      evicted++;
      this.stats.totalEvictions++;
    }

    logger.info('Cache entries evicted', {
      count: evicted,
      policy: this.config.evictionPolicy,
      remainingEntries: this.cache.size
    });
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredEntries();
    }, 300000); // Clean every 5 minutes
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        this.accessHistory.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug('Expired cache entries cleaned', { 
        expiredCount, 
        remainingEntries: this.cache.size 
      });
    }
  }

  // Public API methods
  public clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.accessHistory.clear();
    
    logger.info('Cache cleared', { previousSize });
  }

  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessHistory.delete(key);
      logger.debug('Cache entry deleted', { key });
    }
    return deleted;
  }

  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalHits = this.stats.totalHits;
    const totalMisses = this.stats.totalMisses;
    const totalRequests = totalHits + totalMisses;

    return {
      totalEntries: this.cache.size,
      totalSize: this.estimateCacheSize(),
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      totalHits,
      totalMisses,
      averageAccessCount: entries.length > 0 ? 
        entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length : 0,
      oldestEntry: entries.length > 0 ? 
        entries.reduce((oldest, entry) => entry.timestamp < oldest.timestamp ? entry : oldest).searchParams.query : undefined,
      newestEntry: entries.length > 0 ?
        entries.reduce((newest, entry) => entry.timestamp > newest.timestamp ? entry : newest).searchParams.query : undefined
    };
  }

  public updateConfig(updates: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Cache configuration updated', updates);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    logger.info('Enhanced Cache Service destroyed');
  }
}