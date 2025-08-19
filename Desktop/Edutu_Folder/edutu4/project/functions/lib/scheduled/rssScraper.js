"use strict";
/**
 * RSS Scraper Scheduled Function
 * Runs every 6 hours to update scholarship database
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rssScraperScheduled = rssScraperScheduled;
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const rss_parser_1 = __importDefault(require("rss-parser"));
const aiService_1 = require("../services/aiService");
const supabase_1 = require("../utils/supabase");
const rssParser = new rss_parser_1.default();
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
async function rssScraperScheduled(context) {
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
                    }
                    catch (itemError) {
                        console.error(`❌ Error processing item from ${feed.source}:`, itemError);
                        totalErrors++;
                    }
                }
                // Add delay between feeds to be respectful
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (feedError) {
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
    }
    catch (error) {
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
        }
        catch (logError) {
            console.error('Failed to log scraper error:', logError);
        }
    }
}
async function processScholarshipItem(item, feed, db) {
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
            const embedding = await (0, aiService_1.generateEmbeddings)(embeddingText);
            await (0, supabase_1.storeScholarshipEmbedding)(scholarshipId, embedding, scholarship);
        }
        catch (embeddingError) {
            console.error(`Warning: Failed to generate embedding for ${scholarshipId}:`, embeddingError);
        }
        console.log(`✅ Processed scholarship: ${item.title}`);
    }
    catch (error) {
        console.error('Error processing scholarship item:', error);
        throw error;
    }
}
async function scrapeScholarshipDetails(url) {
    const details = {
        deadline: null,
        amount: null,
        requirements: null,
        benefits: null,
        eligibility: null
    };
    try {
        // Add timeout and headers to prevent blocking
        const response = await axios_1.default.get(url, {
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
    }
    catch (error) {
        console.log(`Warning: Could not scrape details from ${url}:`, error);
    }
    return details;
}
function extractDeadline($) {
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
function extractAmount($) {
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
function extractRequirements($) {
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
function extractBenefits($) {
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
function extractEligibility($) {
    return extractRequirements($); // Often the same as requirements
}
function generateScholarshipId(url, title) {
    const combined = `${url}_${title}`.toLowerCase();
    const hash = combined.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return `scholarship_${Math.abs(hash)}`;
}
function extractTags(text) {
    const keywords = [
        'undergraduate', 'graduate', 'phd', 'masters', 'bachelor',
        'stem', 'engineering', 'computer science', 'medicine', 'nursing',
        'business', 'law', 'education', 'arts', 'humanities',
        'merit', 'need-based', 'minority', 'women', 'veterans',
        'international', 'domestic', 'local', 'national'
    ];
    const foundTags = [];
    const lowerText = text.toLowerCase();
    keywords.forEach(keyword => {
        if (lowerText.includes(keyword) && !foundTags.includes(keyword)) {
            foundTags.push(keyword);
        }
    });
    return foundTags;
}
async function logScrapingResults(db, results) {
    try {
        await db.collection('scraperLogs').add(Object.assign(Object.assign({}, results), { status: 'success' }));
    }
    catch (error) {
        console.error('Failed to log scraping results:', error);
    }
}
//# sourceMappingURL=rssScraper.js.map