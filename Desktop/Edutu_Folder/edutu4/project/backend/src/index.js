#!/usr/bin/env node

import dotenv from 'dotenv';
import { startScheduler, stopScheduler } from './scheduler.js';
import { scrapeAllFeeds } from './services/scraperService.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

// Main application
async function main() {
  console.log('🎓 Edutu RSS Scraper Starting...\n');
  
  // Validate environment
  validateEnvironment();
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'scrape') {
    // One-time scraping
    console.log('🔄 Running one-time scraping...\n');
    try {
      await scrapeAllFeeds();
      console.log('\n✅ One-time scraping completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ One-time scraping failed:', error);
      process.exit(1);
    }
  } else if (command === 'help' || command === '--help' || command === '-h') {
    // Show help
    console.log('📖 Edutu RSS Scraper Commands:');
    console.log('');
    console.log('  npm start          Start the scheduler (runs every 6 hours)');
    console.log('  npm run scrape     Run scraping once and exit');
    console.log('  npm run dev        Start with file watching (development)');
    console.log('');
    console.log('Environment Variables:');
    console.log('  FIREBASE_PROJECT_ID     - Your Firebase project ID');
    console.log('  FIREBASE_PRIVATE_KEY    - Firebase service account private key');
    console.log('  FIREBASE_CLIENT_EMAIL   - Firebase service account email');
    console.log('  CRON_SCHEDULE          - Custom cron schedule (optional)');
    console.log('  MAX_OPPORTUNITIES_PER_FEED - Max items per feed (default: 50)');
    console.log('  RUN_ON_STARTUP         - Run scraping on startup (default: true)');
    console.log('');
    process.exit(0);
  } else {
    // Default: Start scheduler
    console.log('⚡ Starting scheduled RSS scraper...');
    console.log('📋 Available commands: npm start, npm run scrape, npm start help\n');
    
    startScheduler();
    
    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
      stopScheduler();
      console.log('👋 RSS Scraper stopped. Goodbye!');
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    console.log('✅ RSS Scraper is running. Press Ctrl+C to stop.\n');
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch(error => {
  console.error('💥 Application failed to start:', error);
  process.exit(1);
});