#!/usr/bin/env node

/**
 * Standalone scraper script for one-time execution
 * Usage: node src/scraper.js
 */

import dotenv from 'dotenv';
import { scrapeAllFeeds } from './services/scraperService.js';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🎓 Edutu RSS Scraper - One-time execution\n');
  
  try {
    const results = await scrapeAllFeeds();
    
    console.log('\n🎉 Scraping completed successfully!');
    console.log('📝 Final Summary:');
    console.log(`   • Duration: ${results.duration}s`);
    console.log(`   • New opportunities: ${results.totalSaved}`);
    console.log(`   • Duplicates skipped: ${results.totalDuplicates}`);
    console.log(`   • Errors: ${results.totalErrors}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  }
}

main();