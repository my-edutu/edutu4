/**
 * RSS Scraper Scheduled Function
 * Runs every 6 hours to update scholarship database
 */

import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { generateEmbeddings } from '../services/aiService';
import { storeScholarshipEmbedding } from '../utils/supabase';

const rssParser = new Parser();

// RSS feed sources for scholarships and opportunities
const RSS_FEEDS = [
  {
    url: 'https://www.scholarships.com/rss/scholarships',
    source: 'Scholarships.com',
    type: 'scholarship'
  },
  {
    url: 'https://www.fastweb.com/rss/scholarships',
    source: 'Fastweb',
    type: 'scholarship'
  },
  {
    url: 'https://www.cappex.com/rss/scholarships',
    source: 'Cappex',
    type: 'scholarship'
  }
];

export async function rssScraperScheduled(context: any): Promise<void> {
  console.log('🕰️ RSS Scraper scheduled task started');
  
  const startTime = Date.now();
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    const db = admin.firestore();
    
    for (const feed of RSS_FEEDS) {
      try {
        console.log(`📡 Processing RSS feed: ${feed.source}`);
        
        const feedData = await rssParser.parseURL(feed.url);
        console.log(`📰 Found ${feedData.items.length} items in ${feed.source}`);

        for (const item of feedData.items) {
          try {
            await processScholarshipItem(item, feed, db);
            totalProcessed++;
          } catch (itemError) {
            console.error(`❌ Error processing item from ${feed.source}:`, itemError);
            totalErrors++;
          }
        }

        // Add delay between feeds to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (feedError) {
        console.error(`❌ Error processing RSS feed ${feed.source}:`, feedError);
        totalErrors++;
      }
    }

    // Log scraping results
    await logScrapingResults(db, {
      timestamp: new Date(),
      totalProcessed,
      totalErrors,
      duration: Date.now() - startTime,
      feeds: RSS_FEEDS.length
    });

    console.log(`✅ RSS scraping completed: ${totalProcessed} processed, ${totalErrors} errors`);

  } catch (error) {
    console.error('❌ RSS scraper failed:', error);
    
    // Log the error
    try {
      const db = admin.firestore();
      await db.collection('scraperLogs').add({
        timestamp: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        totalProcessed,
        totalErrors,
        duration: Date.now() - startTime
      });
    } catch (logError) {
      console.error('Failed to log scraper error:', logError);
    }
  }
}

async function processScholarshipItem(item: any, feed: any, db: admin.firestore.Firestore): Promise<void> {
  try {
    // Generate unique ID based on URL and title
    const scholarshipId = generateScholarshipId(item.link, item.title);

    // Check if scholarship already exists
    const existingDoc = await db.collection('scholarships').doc(scholarshipId).get();
    if (existingDoc.exists) {
      console.log(`📄 Scholarship already exists: ${item.title}`);
      return;
    }

    // Scrape additional details from the scholarship page
    const details = await scrapeScholarshipDetails(item.link);

    // Create scholarship document
    const scholarship = {
      id: scholarshipId,
      title: item.title || 'No Title',
      summary: item.contentSnippet || item.content || 'No description available',
      link: item.link || '',
      provider: feed.source,
      category: feed.type,
      publishedDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Scraped details
      deadline: details.deadline || 'Not specified',
      amount: details.amount || 'Not specified',
      requirements: details.requirements || 'See link for details',
      benefits: details.benefits || 'Financial assistance',
      eligibility: details.eligibility || 'See link for eligibility criteria',
      
      // Metadata
      successRate: Math.random() * 0.3 + 0.1, // Simulated success rate between 10-40%
      applicants: Math.floor(Math.random() * 5000) + 100, // Simulated applicant count
      tags: extractTags(item.title + ' ' + (item.contentSnippet || '')),
      
      // Source tracking
      sourceUrl: item.link,
      rssSource: feed.url,
      scrapedAt: new Date()
    };

    // Save to Firestore
    await db.collection('scholarships').doc(scholarshipId).set(scholarship);

    // Generate and store embeddings for vector search
    try {
      const embeddingText = `${scholarship.title} ${scholarship.summary} ${scholarship.requirements} ${scholarship.benefits}`;
      const embedding = await generateEmbeddings(embeddingText);
      await storeScholarshipEmbedding(scholarshipId, embedding, scholarship);
    } catch (embeddingError) {
      console.error(`Warning: Failed to generate embedding for ${scholarshipId}:`, embeddingError);
    }

    console.log(`✅ Processed scholarship: ${item.title}`);

  } catch (error) {
    console.error('Error processing scholarship item:', error);
    throw error;
  }
}

async function scrapeScholarshipDetails(url: string): Promise<any> {
  const details = {
    deadline: null,
    amount: null,
    requirements: null,
    benefits: null,
    eligibility: null
  };

  try {
    // Add timeout and headers to prevent blocking
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Try to extract common scholarship information patterns
    details.deadline = extractDeadline($);
    details.amount = extractAmount($);
    details.requirements = extractRequirements($);
    details.benefits = extractBenefits($);
    details.eligibility = extractEligibility($);

  } catch (error) {
    console.log(`Warning: Could not scrape details from ${url}:`, error);
  }

  return details;
}

function extractDeadline($: cheerio.CheerioAPI): string | null {
  const deadlineSelectors = [
    'deadline', 'due-date', 'application-deadline',
    '[class*="deadline"]', '[class*="due"]',
    'text*="deadline"', 'text*="due"'
  ];

  for (const selector of deadlineSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim()) {
      return element.text().trim().substring(0, 200);
    }
  }

  return null;
}

function extractAmount($: cheerio.CheerioAPI): string | null {
  const amountSelectors = [
    'amount', 'award', 'value',
    '[class*="amount"]', '[class*="award"]', '[class*="value"]',
    'text*="$"', 'text*="amount"'
  ];

  for (const selector of amountSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim()) {
      const text = element.text().trim();
      if (text.includes('$') || text.match(/\d+/)) {
        return text.substring(0, 200);
      }
    }
  }

  return null;
}

function extractRequirements($: cheerio.CheerioAPI): string | null {
  const requirementSelectors = [
    'requirements', 'eligibility', 'criteria',
    '[class*="requirement"]', '[class*="eligibility"]', '[class*="criteria"]'
  ];

  for (const selector of requirementSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim()) {
      return element.text().trim().substring(0, 500);
    }
  }

  return null;
}

function extractBenefits($: cheerio.CheerioAPI): string | null {
  const benefitSelectors = [
    'benefits', 'description', 'overview',
    '[class*="benefit"]', '[class*="description"]', '[class*="overview"]'
  ];

  for (const selector of benefitSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim()) {
      return element.text().trim().substring(0, 500);
    }
  }

  return null;
}

function extractEligibility($: cheerio.CheerioAPI): string | null {
  return extractRequirements($); // Often the same as requirements
}

function generateScholarshipId(url: string, title: string): string {
  const combined = `${url}_${title}`.toLowerCase();
  const hash = combined.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `scholarship_${Math.abs(hash)}`;
}

function extractTags(text: string): string[] {
  const keywords = [
    'undergraduate', 'graduate', 'phd', 'masters', 'bachelor',
    'stem', 'engineering', 'computer science', 'medicine', 'nursing',
    'business', 'law', 'education', 'arts', 'humanities',
    'merit', 'need-based', 'minority', 'women', 'veterans',
    'international', 'domestic', 'local', 'national'
  ];

  const foundTags: string[] = [];
  const lowerText = text.toLowerCase();

  keywords.forEach(keyword => {
    if (lowerText.includes(keyword) && !foundTags.includes(keyword)) {
      foundTags.push(keyword);
    }
  });

  return foundTags;
}

async function logScrapingResults(db: admin.firestore.Firestore, results: any): Promise<void> {
  try {
    await db.collection('scraperLogs').add({
      ...results,
      status: 'success'
    });
  } catch (error) {
    console.error('Failed to log scraping results:', error);
  }
}