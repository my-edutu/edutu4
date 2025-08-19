// Enhanced opportunity data models for comprehensive aggregation

export enum OpportunityType {
  SCHOLARSHIP = 'scholarship',
  FELLOWSHIP = 'fellowship',
  INTERNSHIP = 'internship',
  JOB = 'job',
  GRANT = 'grant',
  COMPETITION = 'competition',
  COURSE = 'course',
  FREELANCE = 'freelance',
  VOLUNTEER = 'volunteer'
}

export enum OpportunityStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  UPCOMING = 'upcoming',
  DRAFT = 'draft'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  INTERMEDIATE = 'intermediate',
  SENIOR = 'senior',
  EXECUTIVE = 'executive'
}

export enum RemoteType {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ONSITE = 'onsite'
}

export interface OpportunityLocation {
  country?: string;
  state?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  remote?: RemoteType;
}

export interface OpportunityCompensation {
  type: 'salary' | 'hourly' | 'stipend' | 'award' | 'equity' | 'unpaid';
  amount?: {
    min?: number;
    max?: number;
    currency: string;
  };
  benefits?: string[];
}

export interface OpportunityRequirements {
  education?: string[];
  experience?: ExperienceLevel[];
  skills?: string[];
  languages?: string[];
  citizenship?: string[];
  age?: {
    min?: number;
    max?: number;
  };
  gpa?: {
    min: number;
    scale: number;
  };
}

export interface OpportunityDates {
  applicationDeadline?: string;
  startDate?: string;
  endDate?: string;
  announcementDate?: string;
  lastUpdated: string;
}

export interface OpportunityContact {
  organization: string;
  email?: string;
  phone?: string;
  website?: string;
  applicationUrl?: string;
}

export interface OpportunityMetadata {
  source: string;
  sourceUrl: string;
  scrapedAt: string;
  lastVerified?: string;
  trustScore?: number; // 0-100 based on source reliability
  viewCount?: number;
  applicationCount?: number;
  tags?: string[];
}

export interface BaseOpportunity {
  id: string;
  title: string;
  description: string;
  summary: string;
  type: OpportunityType;
  status: OpportunityStatus;
  
  // Core details
  organization: OpportunityContact;
  location: OpportunityLocation;
  compensation?: OpportunityCompensation;
  requirements?: OpportunityRequirements;
  dates: OpportunityDates;
  
  // Media
  images?: string[];
  documents?: string[];
  
  // Metadata
  metadata: OpportunityMetadata;
}

// Specialized opportunity types
export interface ScholarshipOpportunity extends BaseOpportunity {
  type: OpportunityType.SCHOLARSHIP;
  fieldOfStudy?: string[];
  degreeLevel?: string[];
  coverageType?: 'full' | 'partial' | 'stipend';
  renewability?: boolean;
}

export interface JobOpportunity extends BaseOpportunity {
  type: OpportunityType.JOB;
  department?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'temporary';
  industry?: string[];
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
}

export interface InternshipOpportunity extends BaseOpportunity {
  type: OpportunityType.INTERNSHIP;
  duration?: string;
  creditsAvailable?: boolean;
  mentorshipProvided?: boolean;
  conversionPotential?: boolean;
}

export interface GrantOpportunity extends BaseOpportunity {
  type: OpportunityType.GRANT;
  fundingAgency?: string;
  projectType?: string[];
  collaborationRequired?: boolean;
  maxFundingAmount?: number;
}

export type EnhancedOpportunity = 
  | ScholarshipOpportunity 
  | JobOpportunity 
  | InternshipOpportunity 
  | GrantOpportunity 
  | BaseOpportunity;

// Search and filtering interfaces
export interface OpportunitySearchParams {
  query?: string;
  type?: OpportunityType[];
  location?: {
    country?: string;
    remote?: boolean;
    radius?: number;
    coordinates?: { lat: number; lng: number };
  };
  compensation?: {
    minAmount?: number;
    currency?: string;
  };
  experience?: ExperienceLevel[];
  dateRange?: {
    deadlineAfter?: string;
    deadlineBefore?: string;
  };
  tags?: string[];
  source?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'deadline' | 'posted' | 'compensation';
  sortOrder?: 'asc' | 'desc';
}

export interface OpportunitySearchResult {
  opportunities: EnhancedOpportunity[];
  total: number;
  hasMore: boolean;
  filters: {
    types: { type: OpportunityType; count: number }[];
    locations: { country: string; count: number }[];
    organizations: { name: string; count: number }[];
  };
  searchMeta: {
    query: string;
    took: number;
    cached: boolean;
  };
}