import { appConfig } from '../config';
import { logger } from '../utils/logger';
import { OpportunityItem } from '../utils/cleanData';

interface CacheEntry {
  data: OpportunityItem[];
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredEntries();
    }, 300000); // Clean every 5 minutes
  }

  generateKey(topic: string, limit: number, page: number, siteFilter?: string[]): string {
    const sites = siteFilter ? siteFilter.sort().join(',') : 'default';
    return `${topic}-${limit}-${page}-${sites}`.toLowerCase();
  }

  get(key: string): OpportunityItem[] | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      logger.debug('Cache entry expired and removed', { key });
      return null;
    }

    logger.debug('Cache hit', { key, dataLength: entry.data.length });
    return entry.data;
  }

  set(key: string, data: OpportunityItem[], ttl?: number): void {
    const actualTtl = ttl || appConfig.cacheTimeoutMs;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: actualTtl
    });

    logger.debug('Cache entry stored', { 
      key, 
      dataLength: data.length, 
      ttlMs: actualTtl 
    });
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache entry deleted', { key });
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', { previousSize: size });
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug('Cleaned up expired cache entries', { 
        expiredCount, 
        remainingEntries: this.cache.size 
      });
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

export default new CacheService();