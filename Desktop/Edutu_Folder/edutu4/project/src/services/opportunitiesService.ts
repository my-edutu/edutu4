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
  startAfter,
  DocumentSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Opportunity } from '../types/common';

/**
 * Fetch opportunities from Firestore (populated by RSS scraper)
 */
export async function fetchOpportunities(
  limitCount: number = 50,
  filters: {
    category?: string;
    difficulty?: string;
    location?: string;
  } = {}
): Promise<Opportunity[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];

    // Add filters if provided
    if (filters.category) {
      constraints.unshift(where('category', '==', filters.category));
    }
    if (filters.difficulty) {
      constraints.unshift(where('difficultyLevel', '==', filters.difficulty));
    }
    if (filters.location && filters.location !== 'Various') {
      constraints.unshift(where('location', '==', filters.location));
    }

    const q = query(collection(db, 'opportunities'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        title: data.title || 'Untitled Opportunity',
        organization: data.organization || 'Unknown',
        category: data.category || 'General',
        deadline: data.applicationDeadline || 'Not specified',
        location: data.location || 'Various',
        description: data.description || '',
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        applicationProcess: data.applicationProcess || [],
        image: data.image || '', // RSS feeds don't typically have images
        match: data.matchScore || 0, // Will be calculated with AI later
        difficulty: data.difficultyLevel || 'Medium',
        applicants: data.applicantCount || 'N/A',
        successRate: data.successRate || 'N/A',
        skills: data.skills || [],
        salary: data.salary || undefined,
        // Additional fields from RSS scraper
        link: data.link,
        provider: data.provider,
        tags: data.tags || []
      } as Opportunity;
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return [];
  }
}

/**
 * Get a single opportunity by ID
 */
export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  try {
    const docRef = doc(db, 'opportunities', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || 'Untitled Opportunity',
        organization: data.organization || 'Unknown',
        category: data.category || 'General',
        deadline: data.applicationDeadline || 'Not specified',
        location: data.location || 'Various',
        description: data.description || '',
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        applicationProcess: data.applicationProcess || [],
        image: data.image || '',
        match: data.matchScore || 0,
        difficulty: data.difficultyLevel || 'Medium',
        applicants: data.applicantCount || 'N/A',
        successRate: data.successRate || 'N/A',
        skills: data.skills || [],
        salary: data.salary || undefined,
        link: data.link,
        provider: data.provider,
        tags: data.tags || []
      } as Opportunity;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return null;
  }
}

/**
 * Get available categories from opportunities
 */
export async function getOpportunityCategories(): Promise<string[]> {
  try {
    const q = query(collection(db, 'opportunities'), limit(1000));
    const querySnapshot = await getDocs(q);
    
    const categories = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.category) {
        categories.add(data.category);
      }
    });
    
    return Array.from(categories).sort();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return ['Scholarship', 'Fellowship', 'Technology', 'Mixed'];
  }
}

/**
 * Search opportunities by keyword
 */
export async function searchOpportunities(
  searchTerm: string,
  limitCount: number = 20
): Promise<Opportunity[]> {
  try {
    // Note: Firestore doesn't have full-text search, so this is a basic implementation
    // For production, consider using Algolia or Firebase Extensions for search
    const q = query(
      collection(db, 'opportunities'),
      orderBy('createdAt', 'desc'),
      limit(100) // Get more items to filter through
    );
    
    const querySnapshot = await getDocs(q);
    const allOpportunities = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        title: data.title || '',
        organization: data.organization || '',
        category: data.category || '',
        deadline: data.applicationDeadline || '',
        location: data.location || '',
        description: data.description || '',
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        applicationProcess: data.applicationProcess || [],
        image: data.image || '',
        match: data.matchScore || 0,
        difficulty: data.difficultyLevel || 'Medium',
        applicants: data.applicantCount || 'N/A',
        successRate: data.successRate || 'N/A',
        skills: data.skills || [],
        salary: data.salary || undefined,
        link: data.link,
        provider: data.provider,
        tags: data.tags || []
      } as Opportunity;
    });
    
    // Client-side filtering (not ideal for large datasets)
    const searchLower = searchTerm.toLowerCase();
    const filtered = allOpportunities.filter(opp => 
      opp.title.toLowerCase().includes(searchLower) ||
      opp.organization.toLowerCase().includes(searchLower) ||
      opp.description.toLowerCase().includes(searchLower) ||
      opp.category.toLowerCase().includes(searchLower)
    );
    
    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error searching opportunities:', error);
    return [];
  }
}

/**
 * Get count of opportunities by category
 */
export async function getOpportunityCounts(): Promise<Record<string, number>> {
  try {
    const q = query(collection(db, 'opportunities'));
    const querySnapshot = await getDocs(q);
    
    const counts: Record<string, number> = {};
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Other';
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return counts;
  } catch (error) {
    console.error('Error fetching opportunity counts:', error);
    return {};
  }
}

/**
 * Transform Firestore document to Opportunity object
 */
function transformFirestoreDoc(docSnapshot: DocumentSnapshot): Opportunity {
  const data = docSnapshot.data();
  if (!data) throw new Error('Document data is undefined');
  
  return {
    id: docSnapshot.id,
    title: data.title || 'Untitled Opportunity',
    organization: data.organization || 'Unknown',
    category: data.category || 'General',
    deadline: data.applicationDeadline || 'Not specified',
    location: data.location || 'Various',
    description: data.description || '',
    requirements: data.requirements || [],
    benefits: data.benefits || [],
    applicationProcess: data.applicationProcess || [],
    image: data.image || data.imageUrl || '', // Support both field names
    match: data.matchScore || 0,
    difficulty: data.difficultyLevel || 'Medium',
    applicants: data.applicantCount || 'N/A',
    successRate: data.successRate || 'N/A',
    skills: data.skills || [],
    salary: data.salary || undefined,
    link: data.link,
    provider: data.provider,
    tags: data.tags || [],
    summary: data.summary || data.description || '', // Add summary field
    createdAt: data.createdAt
  } as Opportunity;
}

/**
 * Subscribe to real-time opportunities updates (top N opportunities)
 */
export function subscribeToTopOpportunities(
  limitCount: number = 3,
  callback: (opportunities: Opportunity[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'opportunities'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      try {
        const opportunities = querySnapshot.docs.map(transformFirestoreDoc);
        callback(opportunities);
      } catch (error) {
        console.error('Error processing opportunities snapshot:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Error in opportunities subscription:', error);
      onError?.(error);
    }
  );
}

/**
 * Subscribe to paginated opportunities with real-time updates
 */
export function subscribeToPaginatedOpportunities(
  limitCount: number = 20,
  filters: {
    category?: string;
    difficulty?: string;
    location?: string;
  } = {},
  lastDocument?: DocumentSnapshot,
  callback: (opportunities: Opportunity[], hasMore: boolean) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints: QueryConstraint[] = [
    orderBy('createdAt', 'desc'),
    limit(limitCount + 1) // Get one extra to check if there are more
  ];

  // Add filters if provided
  if (filters.category) {
    constraints.unshift(where('category', '==', filters.category));
  }
  if (filters.difficulty) {
    constraints.unshift(where('difficultyLevel', '==', filters.difficulty));
  }
  if (filters.location && filters.location !== 'Various') {
    constraints.unshift(where('location', '==', filters.location));
  }

  // Add pagination
  if (lastDocument) {
    constraints.push(startAfter(lastDocument));
  }

  const q = query(collection(db, 'opportunities'), ...constraints);

  return onSnapshot(
    q,
    (querySnapshot) => {
      try {
        const docs = querySnapshot.docs;
        const hasMore = docs.length > limitCount;
        const opportunities = docs.slice(0, limitCount).map(transformFirestoreDoc);
        
        callback(opportunities, hasMore);
      } catch (error) {
        console.error('Error processing paginated opportunities snapshot:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Error in paginated opportunities subscription:', error);
      onError?.(error);
    }
  );
}

/**
 * Get paginated opportunities (one-time fetch with pagination support)
 */
export async function getPaginatedOpportunities(
  limitCount: number = 20,
  filters: {
    category?: string;
    difficulty?: string;
    location?: string;
  } = {},
  lastDocument?: DocumentSnapshot
): Promise<{ opportunities: Opportunity[], lastDoc?: DocumentSnapshot, hasMore: boolean }> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(limitCount + 1) // Get one extra to check if there are more
    ];

    // Add filters if provided
    if (filters.category) {
      constraints.unshift(where('category', '==', filters.category));
    }
    if (filters.difficulty) {
      constraints.unshift(where('difficultyLevel', '==', filters.difficulty));
    }
    if (filters.location && filters.location !== 'Various') {
      constraints.unshift(where('location', '==', filters.location));
    }

    // Add pagination
    if (lastDocument) {
      constraints.push(startAfter(lastDocument));
    }

    const q = query(collection(db, 'opportunities'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const docs = querySnapshot.docs;
    const hasMore = docs.length > limitCount;
    const opportunities = docs.slice(0, limitCount).map(transformFirestoreDoc);
    const lastDoc = opportunities.length > 0 ? docs[opportunities.length - 1] : undefined;

    return {
      opportunities,
      lastDoc,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching paginated opportunities:', error);
    return { opportunities: [], hasMore: false };
  }
}

/**
 * Subscribe to a single opportunity by ID
 */
export function subscribeToOpportunity(
  id: string,
  callback: (opportunity: Opportunity | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = doc(db, 'opportunities', id);

  return onSnapshot(
    docRef,
    (docSnap) => {
      try {
        if (docSnap.exists()) {
          const opportunity = transformFirestoreDoc(docSnap);
          callback(opportunity);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Error processing opportunity snapshot:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      console.error('Error in opportunity subscription:', error);
      onError?.(error);
    }
  );
}