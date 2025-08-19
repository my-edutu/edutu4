import { logger } from './logger';

export interface OpportunityItem {
  title: string;
  summary: string;
  link: string;
  image: string;
  publishedDate: string;
  source: string;
}

export interface GoogleSearchItem {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
  pagemap?: {
    metatags?: Array<{
      'og:image'?: string;
      'og:description'?: string;
      'article:published_time'?: string;
      'article:modified_time'?: string;
      'og:title'?: string;
    }>;
    cse_image?: Array<{
      src: string;
    }>;
  };
}

export function cleanOpportunityData(items: GoogleSearchItem[]): OpportunityItem[] {
  return items.map(item => {
    try {
      const cleanedItem: OpportunityItem = {
        title: cleanTitle(item.title),
        summary: extractSummary(item),
        link: item.link,
        image: extractImage(item),
        publishedDate: extractPublishedDate(item),
        source: extractSource(item.displayLink),
      };

      return cleanedItem;
    } catch (error) {
      logger.warn('Error cleaning opportunity item', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        item: item.title 
      });
      
      return {
        title: item.title || 'Untitled Opportunity',
        summary: item.snippet || 'No description available',
        link: item.link,
        image: '',
        publishedDate: '',
        source: item.displayLink || 'Unknown Source',
      };
    }
  });
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\(\)\[\]]/gi, '')
    .trim()
    .slice(0, 200);
}

function extractSummary(item: GoogleSearchItem): string {
  let summary = item.snippet || '';
  
  const ogDescription = item.pagemap?.metatags?.[0]?.['og:description'];
  if (ogDescription && ogDescription.length > summary.length) {
    summary = ogDescription;
  }

  return summary
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function extractImage(item: GoogleSearchItem): string {
  const ogImage = item.pagemap?.metatags?.[0]?.['og:image'];
  if (ogImage && isValidImageUrl(ogImage)) {
    return ogImage;
  }

  const cseImage = item.pagemap?.cse_image?.[0]?.src;
  if (cseImage && isValidImageUrl(cseImage)) {
    return cseImage;
  }

  return '';
}

function extractPublishedDate(item: GoogleSearchItem): string {
  const publishedTime = item.pagemap?.metatags?.[0]?.['article:published_time'];
  if (publishedTime) {
    return formatDate(publishedTime);
  }

  const modifiedTime = item.pagemap?.metatags?.[0]?.['article:modified_time'];
  if (modifiedTime) {
    return formatDate(modifiedTime);
  }

  return '';
}

function extractSource(displayLink: string): string {
  return displayLink
    .replace(/^www\./, '')
    .replace(/\.com$|\.org$|\.net$/, '')
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const pathname = parsedUrl.pathname.toLowerCase();
    
    return validExtensions.some(ext => pathname.includes(ext)) || 
           pathname.includes('image') || 
           parsedUrl.hostname.includes('img');
  } catch {
    return false;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } catch {
    return '';
  }
}

export function filterOpportunityKeywords(title: string, summary: string): boolean {
  const opportunityKeywords = [
    'scholarship', 'fellowship', 'internship', 'grant', 'opportunity',
    'application', 'program', 'course', 'training', 'education',
    'career', 'job', 'position', 'opening', 'vacancy', 'award',
    'competition', 'contest', 'study', 'university', 'college'
  ];

  const text = `${title} ${summary}`.toLowerCase();
  return opportunityKeywords.some(keyword => text.includes(keyword));
}