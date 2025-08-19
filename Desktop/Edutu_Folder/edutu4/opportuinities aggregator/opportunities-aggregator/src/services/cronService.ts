import * as cron from 'node-cron';
import { GoogleSearchService } from './googleSearch';
import cacheService from './cacheService';
import { cleanOpportunityData, filterOpportunityKeywords } from '../utils/cleanData';
import { logger } from '../utils/logger';

export class CronService {
  private googleSearchService: GoogleSearchService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  
  private readonly popularTopics = [
    'scholarships',
    'internships', 
    'fellowships',
    'grants',
    'study abroad',
    'research opportunities'
  ];

  constructor() {
    this.googleSearchService = new GoogleSearchService();
  }

  start(): void {
    logger.info('Starting cron service');

    const refreshJob = cron.schedule('0 */6 * * *', async () => {
      await this.refreshPopularTopics();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('refresh-popular-topics', refreshJob);
    refreshJob.start();

    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.performCleanup();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('cleanup', cleanupJob);
    cleanupJob.start();

    logger.info('Cron jobs scheduled', {
      refreshSchedule: 'Every 6 hours',
      cleanupSchedule: 'Daily at 2 AM UTC',
      totalJobs: this.jobs.size
    });

    process.nextTick(async () => {
      await this.initialCacheWarmup();
    });
  }

  stop(): void {
    logger.info('Stopping cron service');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.debug('Stopped cron job', { jobName: name });
    });
    
    this.jobs.clear();
    logger.info('All cron jobs stopped');
  }

  private async refreshPopularTopics(): Promise<void> {
    logger.info('Starting scheduled refresh of popular topics');
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    for (const topic of this.popularTopics) {
      try {
        await this.refreshTopicCache(topic);
        successCount++;
        
        await this.sleep(2000);
      } catch (error) {
        errorCount++;
        logger.error('Failed to refresh topic cache', {
          topic,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Completed scheduled refresh of popular topics', {
      duration,
      successCount,
      errorCount,
      totalTopics: this.popularTopics.length
    });
  }

  private async refreshTopicCache(topic: string): Promise<void> {
    const limit = 20;
    const page = 1;

    try {
      logger.debug('Refreshing cache for topic', { topic });

      const searchResults = await this.googleSearchService.searchMultiplePages({
        topic,
        limit,
        page
      });

      if (searchResults.length === 0) {
        logger.warn('No results found for topic during refresh', { topic });
        return;
      }

      const cleanedData = cleanOpportunityData(searchResults);
      const filteredOpportunities = cleanedData.filter(opportunity => 
        filterOpportunityKeywords(opportunity.title, opportunity.summary)
      );

      const cacheKey = cacheService.generateKey(topic, limit, page);
      cacheService.set(cacheKey, filteredOpportunities);

      logger.debug('Successfully refreshed cache for topic', {
        topic,
        resultsCount: filteredOpportunities.length,
        cacheKey
      });
    } catch (error) {
      logger.error('Error refreshing topic cache', {
        topic,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async performCleanup(): Promise<void> {
    logger.info('Starting scheduled cleanup');
    const startTime = Date.now();

    try {
      const statsBefore = cacheService.getStats();
      
      const duration = Date.now() - startTime;
      logger.info('Completed scheduled cleanup', {
        duration,
        cacheEntriesBefore: statsBefore.size,
        cacheEntriesAfter: cacheService.getStats().size
      });
    } catch (error) {
      logger.error('Error during scheduled cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async initialCacheWarmup(): Promise<void> {
    logger.info('Starting initial cache warmup');
    const startTime = Date.now();

    const warmupTopics = this.popularTopics.slice(0, 3);
    
    for (const topic of warmupTopics) {
      try {
        await this.refreshTopicCache(topic);
        await this.sleep(1000);
      } catch (error) {
        logger.warn('Failed to warm up cache for topic', {
          topic,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Completed initial cache warmup', {
      duration,
      warmedUpTopics: warmupTopics.length
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getJobStatus(): { name: string; running: boolean }[] {
    const status: { name: string; running: boolean }[] = [];
    
    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: true // node-cron doesn't expose status, assume running if in map
      });
    });

    return status;
  }
}

export default new CronService();