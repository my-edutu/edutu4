/**
 * Scheduler Service
 * Handles scheduled tasks for embedding updates and maintenance
 */

const cron = require('node-cron');
const { 
  performEmbeddingMaintenance,
  syncScholarshipEmbeddings,
  getEmbeddingServiceStats,
} = require('./embeddingService');
const { getAllScholarships } = require('../config/firebase');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler service is already running');
      return;
    }

    logger.info('Starting scheduler service');

    // Schedule embedding sync every hour
    this.scheduleEmbeddingSync();

    // Schedule maintenance every 6 hours
    this.scheduleMaintenanceTasks();

    // Schedule stats collection every 30 minutes
    this.scheduleStatsCollection();

    // Schedule daily cleanup at 2 AM
    this.scheduleDailyCleanup();

    // Schedule daily learning loop at 3 AM
    this.scheduleDailyLearningLoop();

    this.isRunning = true;
    logger.info('All scheduled tasks started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler service is not running');
      return;
    }

    logger.info('Stopping scheduler service');

    // Destroy all cron tasks
    for (const [taskName, task] of this.tasks) {
      if (task && typeof task.destroy === 'function') {
        task.destroy();
        logger.debug(`Stopped task: ${taskName}`);
      }
    }

    this.tasks.clear();
    this.isRunning = false;
    logger.info('Scheduler service stopped');
  }

  /**
   * Schedule embedding synchronization
   */
  scheduleEmbeddingSync() {
    const taskName = 'embeddingSync';
    
    // Run every hour at minute 0
    const task = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting scheduled embedding sync');
        const startTime = Date.now();

        const results = await syncScholarshipEmbeddings();
        
        const duration = Date.now() - startTime;
        logger.info('Scheduled embedding sync completed', {
          duration: `${duration}ms`,
          ...results
        });

        // Log metrics for monitoring
        this.logTaskMetrics(taskName, duration, true, results);

      } catch (error) {
        logger.error('Scheduled embedding sync failed:', error);
        this.logTaskMetrics(taskName, null, false, { error: error.message });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set(taskName, task);
    task.start();
    
    logger.info('Scheduled embedding sync task (every hour)');
  }

  /**
   * Schedule maintenance tasks
   */
  scheduleMaintenanceTasks() {
    const taskName = 'maintenance';
    
    // Run every 6 hours at minute 0
    const task = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Starting scheduled maintenance');
        const startTime = Date.now();

        const results = await performEmbeddingMaintenance();
        
        const duration = Date.now() - startTime;
        logger.info('Scheduled maintenance completed', {
          duration: `${duration}ms`,
          errorCount: results.errors?.length || 0
        });

        this.logTaskMetrics(taskName, duration, true, results);

      } catch (error) {
        logger.error('Scheduled maintenance failed:', error);
        this.logTaskMetrics(taskName, null, false, { error: error.message });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set(taskName, task);
    task.start();
    
    logger.info('Scheduled maintenance task (every 6 hours)');
  }

  /**
   * Schedule stats collection
   */
  scheduleStatsCollection() {
    const taskName = 'statsCollection';
    
    // Run every 30 minutes
    const task = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.debug('Collecting embedding service stats');
        const stats = await getEmbeddingServiceStats();
        
        // Log stats for monitoring
        logger.info('Embedding service stats collected', {
          scholarshipEmbeddings: stats.scholarshipEmbeddings,
          userEmbeddings: stats.userEmbeddings
        });

      } catch (error) {
        logger.error('Stats collection failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set(taskName, task);
    task.start();
    
    logger.debug('Scheduled stats collection task (every 30 minutes)');
  }

  /**
   * Schedule daily cleanup
   */
  scheduleDailyCleanup() {
    const taskName = 'dailyCleanup';
    
    // Run daily at 2 AM UTC
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily cleanup');
        const startTime = Date.now();

        const cleanupResults = await this.performDailyCleanup();
        
        const duration = Date.now() - startTime;
        logger.info('Daily cleanup completed', {
          duration: `${duration}ms`,
          ...cleanupResults
        });

        this.logTaskMetrics(taskName, duration, true, cleanupResults);

      } catch (error) {
        logger.error('Daily cleanup failed:', error);
        this.logTaskMetrics(taskName, null, false, { error: error.message });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set(taskName, task);
    task.start();
    
    logger.info('Scheduled daily cleanup task (2 AM UTC)');
  }

  /**
   * Schedule daily learning loop
   */
  scheduleDailyLearningLoop() {
    const taskName = 'learningLoop';
    
    // Run daily at 3 AM UTC
    const task = cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Starting daily learning loop');
        const startTime = Date.now();

        const { runDailyLearningLoop } = require('./learningPipeline');
        const results = await runDailyLearningLoop();
        
        const duration = Date.now() - startTime;
        logger.info('Daily learning loop completed', {
          duration: `${duration}ms`,
          ...results
        });

        this.logTaskMetrics(taskName, duration, true, results);

      } catch (error) {
        logger.error('Daily learning loop failed:', error);
        this.logTaskMetrics(taskName, null, false, { error: error.message });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set(taskName, task);
    task.start();
    
    logger.info('Scheduled daily learning loop task (3 AM UTC)');
  }

  /**
   * Perform daily cleanup operations
   */
  async performDailyCleanup() {
    const results = {
      orphanedEmbeddingsRemoved: 0,
      oldChatSessionsCleaned: 0,
      statisticsArchived: false,
      errors: []
    };

    try {
      // Clean up orphaned embeddings (embeddings without corresponding scholarships)
      const { getSupabase } = require('../config/supabase');
      const supabase = getSupabase();
      
      const scholarships = await getAllScholarships();
      const currentScholarshipIds = scholarships.map(s => s.id);

      const { data: orphanedEmbeddings, error } = await supabase
        .from('scholarships_embeddings')
        .select('scholarship_id')
        .not('scholarship_id', 'in', `(${currentScholarshipIds.map(id => `"${id}"`).join(',')})`);

      if (error) {
        logger.error('Error finding orphaned embeddings:', error);
        results.errors.push({ task: 'orphaned_embeddings', error: error.message });
      } else if (orphanedEmbeddings && orphanedEmbeddings.length > 0) {
        const { error: deleteError } = await supabase
          .from('scholarships_embeddings')
          .delete()
          .in('scholarship_id', orphanedEmbeddings.map(e => e.scholarship_id));

        if (deleteError) {
          logger.error('Error removing orphaned embeddings:', deleteError);
          results.errors.push({ task: 'remove_orphaned', error: deleteError.message });
        } else {
          results.orphanedEmbeddingsRemoved = orphanedEmbeddings.length;
          logger.info(`Removed ${orphanedEmbeddings.length} orphaned embeddings`);
        }
      }

      // Clean up old chat sessions (older than 30 days)
      const { getFirestore } = require('../config/firebase');
      const db = getFirestore();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const oldChatsQuery = await db.collection('chatHistory')
        .where('createdAt', '<', thirtyDaysAgo)
        .limit(100) // Limit for performance
        .get();

      const batch = db.batch();
      oldChatsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (oldChatsQuery.size > 0) {
        await batch.commit();
        results.oldChatSessionsCleaned = oldChatsQuery.size;
        logger.info(`Cleaned up ${oldChatsQuery.size} old chat messages`);
      }

    } catch (error) {
      logger.error('Error in daily cleanup:', error);
      results.errors.push({ task: 'general', error: error.message });
    }

    return results;
  }

  /**
   * Run a task immediately (for testing/manual triggering)
   */
  async runTaskNow(taskName) {
    try {
      logger.info(`Manually triggering task: ${taskName}`);
      const startTime = Date.now();

      let results;
      switch (taskName) {
        case 'embeddingSync':
          results = await syncScholarshipEmbeddings();
          break;
        case 'maintenance':
          results = await performEmbeddingMaintenance();
          break;
        case 'dailyCleanup':
          results = await this.performDailyCleanup();
          break;
        case 'statsCollection':
          results = await getEmbeddingServiceStats();
          break;
        case 'learningLoop':
          const { runDailyLearningLoop } = require('./learningPipeline');
          results = await runDailyLearningLoop();
          break;
        default:
          throw new Error(`Unknown task: ${taskName}`);
      }

      const duration = Date.now() - startTime;
      logger.info(`Manual task ${taskName} completed`, {
        duration: `${duration}ms`,
        results
      });

      return { success: true, duration, results };

    } catch (error) {
      logger.error(`Manual task ${taskName} failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.tasks.keys()),
      uptime: this.isRunning ? process.uptime() : 0,
      nextRuns: this.getNextRunTimes(),
    };
  }

  /**
   * Get next run times for all tasks
   */
  getNextRunTimes() {
    const nextRuns = {};
    
    // This is a simplified version - in production you might want to use a more sophisticated scheduling library
    const now = new Date();
    
    // Embedding sync - every hour
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    nextRuns.embeddingSync = nextHour.toISOString();
    
    // Maintenance - every 6 hours
    const nextMaintenance = new Date(now);
    const hoursToNext6 = 6 - (now.getHours() % 6);
    nextMaintenance.setHours(nextMaintenance.getHours() + hoursToNext6);
    nextMaintenance.setMinutes(0, 0, 0);
    nextRuns.maintenance = nextMaintenance.toISOString();
    
    // Daily cleanup - 2 AM UTC next day
    const nextCleanup = new Date(now);
    nextCleanup.setUTCDate(nextCleanup.getUTCDate() + 1);
    nextCleanup.setUTCHours(2, 0, 0, 0);
    nextRuns.dailyCleanup = nextCleanup.toISOString();
    
    return nextRuns;
  }

  /**
   * Log task metrics for monitoring
   */
  logTaskMetrics(taskName, duration, success, results) {
    const metrics = {
      task: taskName,
      success,
      timestamp: new Date().toISOString(),
      duration,
      results
    };

    if (success) {
      logger.info('Scheduled task completed', metrics);
    } else {
      logger.error('Scheduled task failed', metrics);
    }

    // In production, you might want to send these metrics to a monitoring service
    // like DataDog, New Relic, or CloudWatch
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;