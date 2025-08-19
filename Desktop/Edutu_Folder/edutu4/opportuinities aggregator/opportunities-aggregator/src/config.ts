import { config } from 'dotenv';

config();

export interface Config {
  port: number;
  googleSearchApiKey: string;
  googleSearchCx: string;
  cacheTimeoutMs: number;
  defaultPageSize: number;
  maxPageSize: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

const requiredEnvVars = {
  GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY,
  GOOGLE_SEARCH_CX: process.env.GOOGLE_SEARCH_CX,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.includes('placeholder') || value.includes('your_')) {
    console.warn(`⚠️  Missing or placeholder value for environment variable: ${key}`);
    console.warn(`   Please set a valid value in your .env file for Google Custom Search to work.`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export const appConfig: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  googleSearchApiKey: requiredEnvVars.GOOGLE_SEARCH_API_KEY!,
  googleSearchCx: requiredEnvVars.GOOGLE_SEARCH_CX!,
  cacheTimeoutMs: parseInt(process.env.CACHE_TIMEOUT_MS || '3600000', 10), // 1 hour
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '50', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};

// Expanded opportunity sources by category
export const opportunitySources = {
  scholarships: [
    'opportunitydesk.org',
    'scholarship-positions.com',
    'scholars4dev.com',
    'worldscholarshipforum.com',
    'studyportals.com',
    'scholarships.com',
    'fastweb.com'
  ],
  jobs: [
    'linkedin.com/jobs',
    'indeed.com',
    'glassdoor.com',
    'monster.com',
    'ziprecruiter.com',
    'careerbuilder.com'
  ],
  internships: [
    'internships.com',
    'chegg.com/internships',
    'wayup.com',
    'handshake.com',
    'experience.com'
  ],
  fellowships: [
    'grants.gov',
    'nsf.gov',
    'fulbrightscholar.org',
    'rhodesfund.org'
  ],
  freelance: [
    'upwork.com',
    'freelancer.com',
    'fiverr.com',
    'toptal.com',
    '99designs.com'
  ],
  grants: [
    'grants.gov',
    'foundation.org',
    'grantwatch.com',
    'candid.org'
  ],
  competitions: [
    'challenge.gov',
    'devpost.com',
    'topcoder.com',
    'kaggle.com'
  ]
};

// Legacy support
export const opportunitySites = [
  ...opportunitySources.scholarships,
  'youthopportunitieshub.org',
  'afterschoolafrica.com',
  'ophs.org',
  'opportunitiesforafricans.com',
];