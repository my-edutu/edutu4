import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc, 
  where,
  QueryConstraint,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  startAfter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Scholarship, Opportunity, UserProfile } from '../types/common';

/**
 * Convert Firestore document to Scholarship interface
 */
function convertDocToScholarship(id: string, data: DocumentData): Scholarship {
  return {
    id,
    title: data.title || 'Untitled Scholarship',
    summary: data.summary || 'No description available',
    requirements: data.requirements || 'Not specified',
    benefits: data.benefits || 'Not specified',
    applicationProcess: data.applicationProcess || 'Check official website',
    link: data.link || '#',
    publishedDate: data.publishedDate ? data.publishedDate.toDate() : new Date(),
    deadline: data.deadline || 'Not specified',
    eligibility: data.eligibility || 'Not specified',
    provider: data.provider || 'Unknown',
    successRate: data.successRate || 'Not available',
    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    tags: data.tags || [],
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop&q=80&auto=format',
    location: data.location || 'Various',
    category: data.category || 'Scholarship'
  };
}

/**
 * Generate a cover image from scholarship link using a placeholder service
 */
function generateCoverImage(link: string): string {
  // Extract domain for favicon-based image
  try {
    const url = new URL(link);
    const domain = url.hostname.replace('www.', '');
    // Use a combination of favicon and placeholder
    return `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&q=80`;
  } catch {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&q=80';
  }
}

/**
 * Calculate match percentage (simplified version - will be improved with user preferences)
 */
function calculateMatchPercentage(scholarship: Scholarship, userPreferences?: UserProfile): number {
  // For now, return a random-ish percentage based on scholarship properties
  const baseScore = 60;
  const titleLength = scholarship.title.length;
  const hasDeadline = scholarship.deadline !== 'Not specified' ? 10 : 0;
  const hasRequirements = scholarship.requirements !== 'Not specified' ? 10 : 0;
  const providerBonus = scholarship.provider.length > 5 ? 5 : 0;
  
  const matchScore = baseScore + hasDeadline + hasRequirements + providerBonus + (titleLength % 15);
  return Math.min(Math.max(matchScore, 60), 98);
}

/**
 * Convert scholarship to opportunity format for compatibility
 */
function scholarshipToOpportunity(scholarship: Scholarship): Opportunity {
  return {
    id: scholarship.id,
    title: scholarship.title,
    organization: scholarship.provider,
    category: scholarship.category, // Use extracted category
    deadline: scholarship.deadline,
    location: scholarship.location, // Use extracted location
    description: scholarship.summary,
    requirements: scholarship.requirements.split('\n').filter(r => r.trim()),
    benefits: scholarship.benefits.split('\n').filter(b => b.trim()),
    applicationProcess: scholarship.applicationProcess.split('\n').filter(a => a.trim()),
    image: scholarship.imageUrl, // Use extracted image
    match: calculateMatchPercentage(scholarship),
    difficulty: 'Medium' as const, // Default difficulty
    applicants: 'N/A',
    successRate: scholarship.successRate,
    link: scholarship.link,
    provider: scholarship.provider,
    tags: scholarship.tags,
    imageUrl: scholarship.imageUrl, // Add imageUrl field
    eligibility: scholarship.eligibility
  };
}

// Pagination interface
export interface PaginationResult {
  scholarships: Opportunity[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  total: number;
}

/**
 * Fetch scholarships with pagination support
 */
export async function fetchScholarshipsPage(
  pageSize: number = 20,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  filters: {
    category?: string;
    provider?: string;
  } = {}
): Promise<PaginationResult> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    ];

    // Add filters if provided
    if (filters.provider) {
      constraints.unshift(where('provider', '==', filters.provider));
    }
    if (filters.category) {
      constraints.unshift(where('category', '==', filters.category));
    }

    // Add pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, 'scholarships'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const scholarships = querySnapshot.docs.map(docSnapshot => {
      const scholarship = convertDocToScholarship(docSnapshot.id, docSnapshot.data());
      return scholarshipToOpportunity(scholarship);
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    const hasMore = querySnapshot.docs.length === pageSize;

    // Get total count (approximate for large collections)
    const totalQuery = query(collection(db, 'scholarships'));
    const totalSnapshot = await getDocs(totalQuery);
    const total = totalSnapshot.size;

    return {
      scholarships,
      lastDoc: lastVisible,
      hasMore,
      total
    };
  } catch (error) {
    console.error('Error fetching scholarships page:', error);
    return {
      scholarships: [],
      lastDoc: null,
      hasMore: false,
      total: 0
    };
  }
}

/**
 * Subscribe to scholarships with pagination (real-time)
 */
export function subscribeToScholarshipsPage(
  callback: (result: PaginationResult) => void,
  pageSize: number = 20,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  filters: {
    category?: string;
    provider?: string;
  } = {}
): () => void {
  const constraints: QueryConstraint[] = [
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  ];

  // Add filters if provided
  if (filters.provider) {
    constraints.unshift(where('provider', '==', filters.provider));
  }
  if (filters.category) {
    constraints.unshift(where('category', '==', filters.category));
  }

  // Add pagination
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, 'scholarships'), ...constraints);
  
  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const scholarships = querySnapshot.docs.map(docSnapshot => {
      const scholarship = convertDocToScholarship(docSnapshot.id, docSnapshot.data());
      return scholarshipToOpportunity(scholarship);
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    const hasMore = querySnapshot.docs.length === pageSize;

    // Get total count (cached or estimated)
    const total = querySnapshot.size;

    callback({
      scholarships,
      lastDoc: lastVisible,
      hasMore,
      total
    });
  }, (error) => {
    console.error('Error subscribing to scholarships page:', error);
    callback({
      scholarships: [],
      lastDoc: null,
      hasMore: false,
      total: 0
    });
  });
}

/**
 * Fetch scholarships from Firestore with real-time updates (legacy - for dashboard)
 */
export function subscribeToScholarships(
  callback: (scholarships: Opportunity[]) => void,
  limitCount: number = 50,
  filters: {
    category?: string;
    provider?: string;
  } = {}
): () => void {
  const constraints: QueryConstraint[] = [
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ];

  // Add filters if provided
  if (filters.provider) {
    constraints.unshift(where('provider', '==', filters.provider));
  }

  const q = query(collection(db, 'scholarships'), ...constraints);
  
  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const scholarships = querySnapshot.docs.map(docSnapshot => {
      const scholarship = convertDocToScholarship(docSnapshot.id, docSnapshot.data());
      return scholarshipToOpportunity(scholarship);
    });
    
    callback(scholarships);
  }, (error) => {
    console.error('Error subscribing to scholarships:', error);
    callback([]);
  });
}

/**
 * Fetch scholarships from Firestore (one-time fetch)
 */
export async function fetchScholarships(
  limitCount: number = 50,
  filters: {
    category?: string;
    provider?: string;
  } = {}
): Promise<Opportunity[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];

    // Add filters if provided
    if (filters.provider) {
      constraints.unshift(where('provider', '==', filters.provider));
    }

    const q = query(collection(db, 'scholarships'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnapshot => {
      const scholarship = convertDocToScholarship(docSnapshot.id, docSnapshot.data());
      return scholarshipToOpportunity(scholarship);
    });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    return [];
  }
}

/**
 * Get a single scholarship by ID
 */
export async function getScholarshipById(id: string): Promise<Opportunity | null> {
  try {
    const docRef = doc(db, 'scholarships', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const scholarship = convertDocToScholarship(docSnap.id, docSnap.data());
      return scholarshipToOpportunity(scholarship);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching scholarship:', error);
    return null;
  }
}

/**
 * Search scholarships by keyword
 */
export async function searchScholarships(
  searchTerm: string,
  limitCount: number = 20
): Promise<Opportunity[]> {
  try {
    // Get more items to filter through (Firestore doesn't have full-text search)
    const q = query(
      collection(db, 'scholarships'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const allScholarships = querySnapshot.docs.map(docSnapshot => {
      const scholarship = convertDocToScholarship(docSnapshot.id, docSnapshot.data());
      return scholarshipToOpportunity(scholarship);
    });
    
    // Client-side filtering
    const searchLower = searchTerm.toLowerCase();
    const filtered = allScholarships.filter(opp => 
      opp.title.toLowerCase().includes(searchLower) ||
      opp.organization.toLowerCase().includes(searchLower) ||
      opp.description.toLowerCase().includes(searchLower) ||
      opp.provider.toLowerCase().includes(searchLower)
    );
    
    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error searching scholarships:', error);
    return [];
  }
}

/**
 * Get available providers from scholarships
 */
export async function getScholarshipProviders(): Promise<string[]> {
  try {
    const q = query(collection(db, 'scholarships'), limit(1000));
    const querySnapshot = await getDocs(q);
    
    const providers = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.provider) {
        providers.add(data.provider);
      }
    });
    
    return Array.from(providers).sort();
  } catch (error) {
    console.error('Error fetching providers:', error);
    return [];
  }
}

/**
 * Get count of scholarships by provider
 */
export async function getScholarshipCounts(): Promise<Record<string, number>> {
  try {
    const q = query(collection(db, 'scholarships'));
    const querySnapshot = await getDocs(q);
    
    const counts: Record<string, number> = {};
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const provider = data.provider || 'Other';
      counts[provider] = (counts[provider] || 0) + 1;
    });
    
    return counts;
  } catch (error) {
    console.error('Error fetching scholarship counts:', error);
    return {};
  }
}