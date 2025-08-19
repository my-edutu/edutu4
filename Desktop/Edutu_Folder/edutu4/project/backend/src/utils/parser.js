import { load } from 'cheerio';
import { randomBytes } from 'crypto';

// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (randomBytes(1)[0] % 16) | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Extract clean text from HTML content
 * @param {string} html - HTML content
 * @returns {string} - Clean text
 */
export function extractTextFromHtml(html) {
  if (!html) return '';
  const $ = load(html);
  return $.text().trim().replace(/\s+/g, ' ');
}

/**
 * Extract deadline from text using various patterns
 * @param {string} content - Content to search for deadline
 * @returns {string|null} - Deadline string or null
 */
export function extractDeadline(content) {
  if (!content) return null;
  
  const deadlinePatterns = [
    /deadline[:\s]*([^.\n]+)/i,
    /apply\s+by[:\s]*([^.\n]+)/i,
    /applications?\s+close[:\s]*([^.\n]+)/i,
    /due\s+date[:\s]*([^.\n]+)/i,
    /expires?[:\s]*([^.\n]+)/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i
  ];
  
  for (const pattern of deadlinePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1] ? match[1].trim() : match[0].trim();
    }
  }
  
  return null;
}

/**
 * Extract location from text content
 * @param {string} content - Content to search for location
 * @returns {string} - Location or 'Various'
 */
export function extractLocation(content) {
  if (!content) return 'Various';
  
  const locationPatterns = [
    /location[:\s]*([^.\n]+)/i,
    /based\s+in[:\s]*([^.\n]+)/i,
    /country[:\s]*([^.\n]+)/i,
    /(usa|uk|canada|australia|germany|france|netherlands|switzerland|sweden|denmark|norway)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1] ? match[1].trim() : match[0].trim();
    }
  }
  
  return 'Various';
}

/**
 * Extract requirements from content
 * @param {string} content - Content to search for requirements
 * @returns {string[]} - Array of requirements
 */
export function extractRequirements(content) {
  if (!content) return [];
  
  const requirements = [];
  const text = extractTextFromHtml(content);
  
  // Look for common requirement patterns
  const reqPatterns = [
    /requirements?[:\s]*([^.]+)/i,
    /eligibility[:\s]*([^.]+)/i,
    /must\s+have[:\s]*([^.]+)/i,
    /bachelor'?s?\s+degree/i,
    /master'?s?\s+degree/i,
    /\d+\s+years?\s+experience/i,
    /undergraduate/i,
    /postgraduate/i,
    /phd/i,
    /english\s+proficiency/i,
    /ielts|toefl/i
  ];
  
  for (const pattern of reqPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      requirements.push(match[0].trim());
    }
  }
  
  return requirements.slice(0, 5); // Limit to 5 requirements
}

/**
 * Extract benefits from content
 * @param {string} content - Content to search for benefits
 * @returns {string[]} - Array of benefits
 */
export function extractBenefits(content) {
  if (!content) return [];
  
  const benefits = [];
  const text = extractTextFromHtml(content);
  
  const benefitPatterns = [
    /benefits?[:\s]*([^.]+)/i,
    /offers?[:\s]*([^.]+)/i,
    /includes?[:\s]*([^.]+)/i,
    /tuition\s+fees?/i,
    /stipend/i,
    /scholarship/i,
    /funding/i,
    /accommodation/i,
    /health\s+insurance/i,
    /visa\s+support/i
  ];
  
  for (const pattern of benefitPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      benefits.push(match[0].trim());
    }
  }
  
  return benefits.slice(0, 5); // Limit to 5 benefits
}

/**
 * Determine difficulty level based on content
 * @param {string} content - Content to analyze
 * @returns {string} - Difficulty level
 */
export function determineDifficulty(content) {
  if (!content) return 'Medium';
  
  const text = content.toLowerCase();
  
  if (text.includes('phd') || text.includes('doctorate') || text.includes('postdoc')) {
    return 'Advanced';
  }
  
  if (text.includes('master') || text.includes('graduate') || text.includes('experienced')) {
    return 'Intermediate';
  }
  
  if (text.includes('undergraduate') || text.includes('bachelor') || text.includes('beginner')) {
    return 'Beginner';
  }
  
  return 'Medium';
}

/**
 * Map RSS item to Opportunity format
 * @param {Object} item - RSS feed item
 * @param {Object} feedInfo - Feed information
 * @returns {Object} - Mapped opportunity
 */
export function mapRssItemToOpportunity(item, feedInfo) {
  const content = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`;
  const deadline = extractDeadline(content);
  
  return {
    id: uuidv4(),
    title: item.title || 'Untitled Opportunity',
    organization: feedInfo.provider.replace('.com', '').replace('.org', ''),
    matchScore: null, // Will be calculated later with personalization
    difficultyLevel: determineDifficulty(content),
    applicantCount: null, // Not available from RSS
    category: feedInfo.category,
    applicationDeadline: deadline || 'Not specified',
    location: extractLocation(content),
    successRate: null, // Not available from RSS
    description: extractTextFromHtml(item.contentSnippet || item.content || '').slice(0, 500),
    requirements: extractRequirements(content),
    benefits: extractBenefits(content),
    applicationProcess: ['Visit the link for detailed application instructions'],
    link: item.link || item.guid || '',
    provider: feedInfo.provider,
    createdAt: new Date(),
    tags: [], // Will be populated later
    // Additional fields for frontend compatibility
    image: '', // RSS feeds typically don't have images
    match: 0, // Will be calculated with personalization
    difficulty: determineDifficulty(content),
    applicants: 'N/A',
    skills: []
  };
}