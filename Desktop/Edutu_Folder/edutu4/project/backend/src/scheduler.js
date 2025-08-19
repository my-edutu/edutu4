import cron from 'node-cron';
import { scrapeAllFeeds, cleanupOldOpportunities } from './services/scraperService.js';

/**
 * Schedule RSS scraping to run every 6 hours
 */
export function startScheduler() {
  console.log('🕐 Starting RSS scraper scheduler...');
  
  // Run every 6 hours: 0 */6 * * *
  // For testing, you can use '*/5 * * * *' to run every 5 minutes
  const schedulePattern = process.env.CRON_SCHEDULE || '0 */6 * * *';
  
  cron.schedule(schedulePattern, async () => {
    console.log('\n⏰ Scheduled scraping started at:', new Date().toISOString());
    
    try {
      await scrapeAllFeeds();
      console.log('✅ Scheduled scraping completed successfully\n');
    } catch (error) {
      console.error('❌ Scheduled scraping failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  // Optional: Weekly cleanup on Sundays at 2 AM
  cron.schedule('0 2 * * 0', async () => {
    console.log('\n🧹 Weekly cleanup started at:', new Date().toISOString());
    
    try {
      await cleanupOldOpportunities(90);
      console.log('✅ Weekly cleanup completed successfully\n');
    } catch (error) {
      console.error('❌ Weekly cleanup failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  console.log(`✅ Scheduler started with pattern: ${schedulePattern}`);
  console.log('📅 Next run times will be logged when they occur');
  
  // Run initial scrape on startup (optional)
  if (process.env.RUN_ON_STARTUP !== 'false') {
    console.log('🚀 Running initial scrape on startup...');
    setTimeout(async () => {
      try {
        await scrapeAllFeeds();
        console.log('✅ Initial scraping completed\n');
      } catch (error) {
        console.error('❌ Initial scraping failed:', error);
      }
    }, 5000); // Wait 5 seconds after startup
  }
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopScheduler() {
  console.log('⏹️ Stopping RSS scraper scheduler...');
  cron.getTasks().forEach((task, name) => {
    task.stop();
    console.log(`Stopped task: ${name}`);
  });
}