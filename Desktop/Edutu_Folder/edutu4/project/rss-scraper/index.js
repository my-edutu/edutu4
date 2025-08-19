const RSSParser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');
const cron = require('node-cron');
const dotenv = require('dotenv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();
const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// RSS Feed URLs with their source names
const RSS_FEEDS = [
  { url: 'https://www.scholarshippositions.com/feed/', source: 'Scholarship Positions' },
  { url: 'https://www.opportunitydesk.org/feed/', source: 'Opportunity Desk' },
  { url: 'https://www.scholars4dev.com/feed/', source: 'Scholars4Dev' },
  { url: 'https://www.scholarshipportal.com/rss', source: 'Scholarship Portal' },
  { url: 'https://www.afterschoolafrica.com/feed/', source: 'After School Africa' },
  { url: 'https://www.opportunitydesk.org/category/fellowships/feed/', source: 'Opportunity Desk - Fellowships' },
  { url: 'https://www.youthopportunitieshub.com/feed/', source: 'Youth Opportunities Hub' },
  { url: 'https://oyaop.com/feed/', source: 'OYAOP' }
];

// Limited logging buffer for safe mode
let logBuffer = [];
let isSafeMode = false;

// Logging utility
const log = {
  info: (msg, data = '') => {
    const logLine = `[${new Date().toISOString()}] INFO: ${msg}`;
    if (isSafeMode) {
      logBuffer.push(logLine);
      if (logBuffer.length > 10) logBuffer.shift();
      // Only print the last 10 lines
      console.clear();
      logBuffer.forEach(line => console.log(line));
    } else {
      console.log(logLine, data);
    }
  },
  error: (msg, error = '') => {
    const logLine = `[${new Date().toISOString()}] ERROR: ${msg}`;
    if (isSafeMode) {
      logBuffer.push(logLine);
      if (logBuffer.length > 10) logBuffer.shift();
      console.clear();
      logBuffer.forEach(line => console.log(line));
    } else {
      console.error(logLine, error);
    }
  },
  warn: (msg, data = '') => {
    const logLine = `[${new Date().toISOString()}] WARN: ${msg}`;
    if (isSafeMode) {
      logBuffer.push(logLine);
      if (logBuffer.length > 10) logBuffer.shift();
      console.clear();
      logBuffer.forEach(line => console.log(line));
    } else {
      console.warn(logLine, data);
    }
  }
};

// Extract cover image from webpage
async function extractCoverImage(url, $) {
  try {
    // Priority 1: Open Graph image
    let imageUrl = $('meta[property="og:image"]').attr('content');
    
    // Priority 2: Twitter image
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content');
    }
    
    // Priority 3: First article image
    if (!imageUrl) {
      const articleImg = $('article img, .post-content img, .entry-content img, .content img').first();
      imageUrl = articleImg.attr('src') || articleImg.attr('data-src');
    }
    
    // Priority 4: Any image in the content
    if (!imageUrl) {
      const anyImg = $('img').first();
      imageUrl = anyImg.attr('src') || anyImg.attr('data-src');
    }
    
    // Convert relative URLs to absolute
    if (imageUrl) {
      try {
        const baseUrl = new URL(url);
        if (imageUrl.startsWith('//')) {
          imageUrl = baseUrl.protocol + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = baseUrl.origin + imageUrl;
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = baseUrl.origin + '/' + imageUrl;
        }
        
        // Validate image URL
        if (imageUrl.includes('placeholder') || imageUrl.includes('default') || imageUrl.length < 10) {
          imageUrl = null;
        }
      } catch (e) {
        imageUrl = null;
      }
    }
    
    return imageUrl || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop&q=80&auto=format`;
  } catch (error) {
    return `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop&q=80&auto=format`;
  }
}

// Extract location from content
function extractLocation($, text) {
  // Look for location patterns
  const locationPatterns = [
    /location[:\s]*(.*?)(?:\n|\.|\||$)/gi,
    /where[:\s]*(.*?)(?:\n|\.|\||$)/gi,
    /based in[:\s]*(.*?)(?:\n|\.|\||$)/gi,
    /country[:\s]*(.*?)(?:\n|\.|\||$)/gi
  ];
  
  for (let pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim().replace(/[^\w\s,-]/g, '').substring(0, 100);
      if (location.length > 3 && !location.toLowerCase().includes('not specified')) {
        return location;
      }
    }
  }
  
  // Check for common country/region names in the text
  const commonLocations = [
    'Africa', 'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Morocco',
    'United States', 'USA', 'United Kingdom', 'UK', 'Canada', 'Australia',
    'Germany', 'France', 'Netherlands', 'Sweden', 'Norway', 'Denmark',
    'Global', 'International', 'Worldwide', 'Various Countries', 'Multiple Locations'
  ];
  
  for (let location of commonLocations) {
    if (text.toLowerCase().includes(location.toLowerCase())) {
      return location;
    }
  }
  
  return 'Various';
}

// Extract category/tags from content
function extractCategory($, text, source) {
  // Priority 1: Check meta keywords
  const metaKeywords = $('meta[name="keywords"]').attr('content');
  if (metaKeywords) {
    const keywords = metaKeywords.toLowerCase().split(',').map(k => k.trim());
    for (let keyword of keywords) {
      if (keyword.includes('scholarship') || keyword.includes('fellowship') || 
          keyword.includes('grant') || keyword.includes('opportunity')) {
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
  }
  
  // Priority 2: Look for category patterns in text
  const categoryPatterns = [
    'scholarship', 'fellowship', 'grant', 'internship', 'program', 'competition',
    'leadership', 'entrepreneurship', 'technology', 'education', 'research',
    'masters', 'phd', 'undergraduate', 'postgraduate', 'doctoral'
  ];
  
  for (let pattern of categoryPatterns) {
    if (text.toLowerCase().includes(pattern)) {
      return pattern.charAt(0).toUpperCase() + pattern.slice(1);
    }
  }
  
  // Priority 3: Derive from source
  if (source.toLowerCase().includes('scholarship')) return 'Scholarship';
  if (source.toLowerCase().includes('fellowship')) return 'Fellowship';
  if (source.toLowerCase().includes('youth')) return 'Youth Program';
  if (source.toLowerCase().includes('entrepreneur')) return 'Entrepreneurship';
  
  return 'Scholarship'; // Default
}

// Improved deadline detection
function extractDeadline($, text) {
  // Look for deadline patterns with better regex
  const deadlinePatterns = [
    /(?:deadline|due date|application deadline|closing date)[:\s]*([^\n.!?]*)/gi,
    /(?:apply by|submit by|applications close)[:\s]*([^\n.!?]*)/gi,
    /(?:ends|closes)[:\s]*([^\n.!?]*)/gi,
    /(?:until|before)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi
  ];
  
  for (let pattern of deadlinePatterns) {
    const matches = text.matchAll(pattern);
    for (let match of matches) {
      const deadlineText = match[1] || match[0];
      if (deadlineText && deadlineText.trim().length > 3) {
        const cleaned = deadlineText.trim().replace(/[^\w\s,\-\/\.]/g, '').substring(0, 50);
        
        // Filter out common false positives
        if (!cleaned.toLowerCase().includes('not specified') && 
            !cleaned.toLowerCase().includes('various') &&
            !cleaned.toLowerCase().includes('ongoing') &&
            cleaned.length > 5) {
          return cleaned;
        }
      }
    }
  }
  
  // Look for specific date formats in the HTML
  const dateElements = $('[class*="date"], [class*="deadline"], [id*="date"], [id*="deadline"]');
  if (dateElements.length > 0) {
    const dateText = dateElements.first().text().trim();
    if (dateText && dateText.length > 5 && dateText.length < 50) {
      return dateText;
    }
  }
  
  return 'Not specified';
}

// Extract detailed content from article URL
async function extractDetailedContent(url, source) {
  try {
    const response = await axios.get(url, {
      timeout: 15000, // Increased timeout for image processing
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    let requirements = '';
    let benefits = '';
    let applicationProcess = '';
    let deadline = '';
    let eligibility = '';
    let successRate = '';
    let imageUrl = '';
    let location = '';
    let category = '';
    
    // Extract image
    imageUrl = await extractCoverImage(url, $);
    
    // Extract based on common patterns
    const content = $('article, .post-content, .entry-content, .content, main').first();
    const text = content.text().toLowerCase();
    
    // Extract location and category
    location = extractLocation($, text);
    category = extractCategory($, text, source);
    
    // Improved deadline extraction
    deadline = extractDeadline($, text);
    
    // Look for requirements
    const reqPatterns = [
      /requirements?[:\s]*(.*?)(?:benefits?|application|deadline|eligibility|$)/gi,
      /eligibility criteria[:\s]*(.*?)(?:benefits?|application|deadline|$)/gi,
      /who can apply[:\s]*(.*?)(?:benefits?|application|deadline|$)/gi
    ];
    
    for (let pattern of reqPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        requirements = match[1].trim().substring(0, 500);
        break;
      }
    }
    
    // Look for benefits
    const benefitPatterns = [
      /benefits?[:\s]*(.*?)(?:application|deadline|requirements?|$)/gi,
      /what you will get[:\s]*(.*?)(?:application|deadline|requirements?|$)/gi,
      /award[:\s]*(.*?)(?:application|deadline|requirements?|$)/gi
    ];
    
    for (let pattern of benefitPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        benefits = match[1].trim().substring(0, 500);
        break;
      }
    }
    
    // Look for application process
    const appPatterns = [
      /how to apply[:\s]*(.*?)(?:deadline|requirements?|benefits?|$)/gi,
      /application process[:\s]*(.*?)(?:deadline|requirements?|benefits?|$)/gi,
      /apply[:\s]*(.*?)(?:deadline|requirements?|benefits?|$)/gi
    ];
    
    for (let pattern of appPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        applicationProcess = match[1].trim().substring(0, 500);
        break;
      }
    }
    
    // Look for deadline
    const deadlinePatterns = [
      /deadline[:\s]*([^\n.!?]*)/gi,
      /application deadline[:\s]*([^\n.!?]*)/gi,
      /due date[:\s]*([^\n.!?]*)/gi
    ];
    
    for (let pattern of deadlinePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        deadline = match[1].trim().substring(0, 200);
        break;
      }
    }
    
    // Look for eligibility
    const eligibilityPatterns = [
      /eligibility[:\s]*(.*?)(?:requirements?|benefits?|application|deadline|$)/gi,
      /eligible[:\s]*(.*?)(?:requirements?|benefits?|application|deadline|$)/gi
    ];
    
    for (let pattern of eligibilityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        eligibility = match[1].trim().substring(0, 500);
        break;
      }
    }
    
    // Generate estimated success rate (simplified calculation)
    const competitiveWords = ['competitive', 'limited', 'selective', 'merit-based'];
    const hasCompetitiveWords = competitiveWords.some(word => text.includes(word));
    
    if (hasCompetitiveWords) {
      successRate = Math.floor(Math.random() * 10 + 5); // 5-15% for competitive
    } else {
      successRate = Math.floor(Math.random() * 30 + 20); // 20-50% for others
    }
    
    return {
      requirements: requirements || 'Not specified',
      benefits: benefits || 'Not specified',
      applicationProcess: applicationProcess || 'Check official website',
      deadline: deadline || 'Not specified',
      eligibility: eligibility || 'Not specified',
      successRate: `${successRate}%`,
      imageUrl: imageUrl,
      location: location,
      category: category
    };
    
  } catch (error) {
    log.warn(`Failed to extract detailed content from ${url}:`, error.message);
    return {
      requirements: 'Not specified',
      benefits: 'Not specified',
      applicationProcess: 'Check official website',
      deadline: 'Not specified',
      eligibility: 'Not specified',
      successRate: 'Not available',
      imageUrl: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop&q=80&auto=format`,
      location: 'Various',
      category: 'Scholarship'
    };
  }
}

// Check if scholarship already exists
async function scholarshipExists(title, link) {
  try {
    const snapshot = await db.collection('scholarships')
      .where('title', '==', title)
      .where('link', '==', link)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    log.error('Error checking scholarship existence:', error);
    return false;
  }
}

// Save scholarship to Firestore
async function saveScholarship(scholarship) {
  try {
    await db.collection('scholarships').add({
      ...scholarship,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      tags: []
    });
    
    log.info(`Saved scholarship: ${scholarship.title}`);
    return true;
  } catch (error) {
    log.error(`Failed to save scholarship "${scholarship.title}":`, error);
    return false;
  }
}

// Process a single RSS feed with improved error handling
async function processFeed(feedConfig) {
  const { url, source } = feedConfig;
  log.info(`Processing feed: ${source}`);
  
  try {
    const feed = await parser.parseURL(url);
    let newScholarships = 0;
    let duplicates = 0;
    let errors = 0;
    
    for (const item of feed.items) {
      try {
        // Skip if already exists
        const exists = await scholarshipExists(item.title, item.link);
        if (exists) {
          duplicates++;
          continue;
        }
        
        log.info(`Processing: ${item.title?.substring(0, 50) || 'Untitled'}...`);
        
        // Extract detailed content
        const details = await extractDetailedContent(item.link, source);
        
        const scholarship = {
          title: item.title || 'Untitled',
          summary: item.contentSnippet || item.summary || item.content || 'No description available',
          requirements: details.requirements,
          benefits: details.benefits,
          applicationProcess: details.applicationProcess,
          link: item.link,
          publishedDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          deadline: details.deadline,
          eligibility: details.eligibility,
          provider: source,
          successRate: details.successRate,
          imageUrl: details.imageUrl,
          location: details.location,
          category: details.category
        };
        
        const saved = await saveScholarship(scholarship);
        if (saved) {
          newScholarships++;
        }
        
        // Add delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, isSafeMode ? 1000 : 2000));
        
      } catch (error) {
        errors++;
        log.error(`Error processing item: ${error.message.substring(0, 100)}`);
        // Continue processing other items instead of stopping
        continue;
      }
    }
    
    log.info(`${source}: New: ${newScholarships}, Duplicates: ${duplicates}`);
    return { newScholarships, duplicates, errors };
    
  } catch (error) {
    log.error(`Feed ${source} failed: ${error.message.substring(0, 100)}`);
    return { newScholarships: 0, duplicates: 0, errors: 1 };
  }
}

// Main scraping function with better statistics
async function scrapeScholarships() {
  log.info('Starting scholarship scraping...');
  
  let totalNew = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  let successfulFeeds = 0;
  
  for (const feedConfig of RSS_FEEDS) {
    try {
      const result = await processFeed(feedConfig);
      totalNew += result.newScholarships;
      totalDuplicates += result.duplicates;
      totalErrors += (result.errors || 0);
      if (result.newScholarships > 0 || result.duplicates > 0) {
        successfulFeeds++;
      }
      
      // Add delay between feeds
      await new Promise(resolve => setTimeout(resolve, isSafeMode ? 1500 : 3000));
      
    } catch (error) {
      totalErrors++;
      log.error(`Feed ${feedConfig.source} failed: ${error.message.substring(0, 100)}`);
      // Continue with next feed instead of stopping
      continue;
    }
  }
  
  const stats = {
    new: totalNew,
    duplicates: totalDuplicates,
    errors: totalErrors,
    feeds: successfulFeeds,
    total: RSS_FEEDS.length
  };
  
  if (isSafeMode) {
    // Clear screen and show final summary for safe mode
    console.clear();
    console.log('\n=== Safe Mode Summary ===');
    console.log(`Safe run complete — New: ${stats.new}, Duplicates: ${stats.duplicates}, Errors: ${stats.errors}`);
    console.log(`Feeds processed: ${stats.feeds}/${stats.total}`);
    console.log('========================\n');
  } else {
    log.info(`Scraping completed - New: ${stats.new}, Duplicates: ${stats.duplicates}, Errors: ${stats.errors}, Feeds: ${stats.feeds}/${stats.total}`);
  }
  
  return stats;
}

// Validate environment variables
function validateEnvironment() {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    log.error(`Missing required environment variables: ${missing.join(', ')}`);
    log.error('Please check your .env file and ensure all Firebase credentials are set');
    process.exit(1);
  }
  
  log.info('Environment validation passed');
}

// Initialize and start the scraper
async function init(safeMode = false) {
  try {
    isSafeMode = safeMode;
    
    if (safeMode) {
      log.info('Initializing RSS Scraper in SAFE MODE...');
    } else {
      log.info('Initializing RSS Scholarship Scraper...');
    }
    
    // Validate environment
    validateEnvironment();
    
    // Test Firebase connection
    await db.collection('scholarships').limit(1).get();
    log.info('Firebase connection successful');
    
    // Run scrape
    if (safeMode) {
      log.info('Running safe mode scrape (once and exit)...');
      await scrapeScholarships();
      log.info('Safe mode complete. Exiting...');
      process.exit(0);
    } else {
      log.info('Running initial scholarship scrape...');
      await scrapeScholarships();
      
      // Set up cron job for every 6 hours
      const cronExpression = '0 */6 * * *'; // Every 6 hours
      log.info(`Setting up cron job: ${cronExpression} (every 6 hours)`);
      
      cron.schedule(cronExpression, async () => {
        log.info('Cron job triggered - Starting scheduled scrape...');
        await scrapeScholarships();
      }, {
        scheduled: true,
        timezone: "UTC"
      });
      
      log.info('RSS Scraper initialized successfully. Running every 6 hours...');
    }
    
  } catch (error) {
    log.error('Failed to initialize scraper:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.info('Received SIGINT. Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('Received SIGTERM. Gracefully shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
function parseArguments() {
  return yargs(hideBin(process.argv))
    .option('safe', {
      type: 'boolean',
      description: 'Run in safe mode: scrape once and exit with limited logging',
      default: false
    })
    .help()
    .alias('help', 'h')
    .usage('Usage: node index.js [--safe]')
    .example('node index.js', 'Run continuously with 6-hour intervals')
    .example('node index.js --safe', 'Run once in safe mode and exit')
    .argv;
}

// Start the application
if (require.main === module) {
  const argv = parseArguments();
  
  init(argv.safe).catch((error) => {
    log.error('Failed to start application:', error);
    process.exit(1);
  });
}

module.exports = {
  scrapeScholarships,
  processFeed,
  extractDetailedContent
};