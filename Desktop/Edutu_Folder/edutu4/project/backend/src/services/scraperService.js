import Parser from 'rss-parser';
import { db } from '../config/firebase.js';
import { RSS_FEEDS } from '../config/feeds.js';
import { mapRssItemToOpportunity } from '../utils/parser.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Edutu RSS Scraper 1.0'
  }
});

/**
 * Check if opportunity already exists (by title + link)
 * @param {string} title - Opportunity title
 * @param {string} link - Opportunity link
 * @returns {boolean} - Whether opportunity exists
 */
async function opportunityExists(title, link) {
  try {
    const query = db.collection('opportunities')
      .where('title', '==', title)
      .where('link', '==', link)
      .limit(1);
    
    const snapshot = await query.get();
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking opportunity existence:', error);
    return false;
  }
}

/**
 * Save opportunity to Firestore
 * @param {Object} opportunity - Opportunity data
 * @returns {Promise<boolean>} - Success status
 */
async function saveOpportunity(opportunity) {
  try {
    await db.collection('opportunities').add(opportunity);
    return true;
  } catch (error) {
    console.error('Error saving opportunity:', error);
    return false;
  }
}

/**
 * Scrape a single RSS feed
 * @param {Object} feedInfo - Feed configuration
 * @returns {Promise<Object>} - Scraping results
 */
export async function scrapeFeed(feedInfo) {
  const results = {
    feedName: feedInfo.name,
    processed: 0,
    saved: 0,
    duplicates: 0,
    errors: 0
  };

  try {
    console.log(`Scraping feed: ${feedInfo.name}`);
    const feed = await parser.parseURL(feedInfo.url);
    
    const maxItems = process.env.MAX_OPPORTUNITIES_PER_FEED || 50;
    const items = feed.items.slice(0, maxItems);
    
    for (const item of items) {
      results.processed++;
      
      try {
        // Skip items without title or link
        if (!item.title || !item.link) {
          results.errors++;
          continue;
        }
        
        // Check for duplicates
        const exists = await opportunityExists(item.title, item.link);
        if (exists) {
          results.duplicates++;
          continue;
        }
        
        // Map RSS item to opportunity format
        const opportunity = mapRssItemToOpportunity(item, feedInfo);
        
        // Save to Firestore
        const saved = await saveOpportunity(opportunity);
        if (saved) {
          results.saved++;
          console.log(`✓ Saved: ${opportunity.title}`);
        } else {
          results.errors++;
        }
        
      } catch (itemError) {
        console.error(`Error processing item: ${item.title}`, itemError);
        results.errors++;
      }
    }
    
  } catch (feedError) {
    console.error(`Error scraping feed ${feedInfo.name}:`, feedError);
    results.errors++;
  }
  
  return results;
}

/**
 * Scrape all configured RSS feeds
 * @returns {Promise<Object>} - Overall scraping results
 */
export async function scrapeAllFeeds() {
  const startTime = new Date();
  const overallResults = {
    startTime,
    totalFeeds: RSS_FEEDS.length,
    feedResults: [],
    totalProcessed: 0,
    totalSaved: 0,
    totalDuplicates: 0,
    totalErrors: 0
  };
  
  console.log(`\n🚀 Starting RSS scraping for ${RSS_FEEDS.length} feeds...`);
  
  for (const feed of RSS_FEEDS) {
    const feedResult = await scrapeFeed(feed);
    overallResults.feedResults.push(feedResult);
    
    overallResults.totalProcessed += feedResult.processed;
    overallResults.totalSaved += feedResult.saved;
    overallResults.totalDuplicates += feedResult.duplicates;
    overallResults.totalErrors += feedResult.errors;
    
    // Add delay between feeds to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  
  overallResults.endTime = endTime;
  overallResults.duration = duration;
  
  // Log summary
  console.log('\n📊 SCRAPING SUMMARY:');
  console.log(`Duration: ${duration}s`);
  console.log(`Feeds processed: ${overallResults.totalFeeds}`);
  console.log(`Items processed: ${overallResults.totalProcessed}`);
  console.log(`New opportunities saved: ${overallResults.totalSaved}`);
  console.log(`Duplicates skipped: ${overallResults.totalDuplicates}`);
  console.log(`Errors: ${overallResults.totalErrors}`);
  
  return overallResults;
}

/**
 * Clean up old opportunities (optional maintenance function)
 * @param {number} daysToKeep - Number of days to keep opportunities
 * @returns {Promise<number>} - Number of deleted opportunities
 */
export async function cleanupOldOpportunities(daysToKeep = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const query = db.collection('opportunities')
      .where('createdAt', '<', cutoffDate)
      .limit(500); // Process in batches
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log('No old opportunities to clean up');
      return 0;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Cleaned up ${snapshot.docs.length} old opportunities`);
    return snapshot.docs.length;
    
  } catch (error) {
    console.error('Error cleaning up old opportunities:', error);
    return 0;
  }
}