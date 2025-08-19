/**
 * Optimized Firestore Service for Edutu
 * Features: Reduced reads, intelligent caching, batch operations, and cost optimization
 */

import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  writeBatch,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from '../config/firebase';

// In-memory cache for Firestore documents
const firestoreCache = new Map<string, {
  data: any;
  expiry: number;
  etag?: string;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 500; // Firestore batch limit

// Network state management
let isOnline = navigator.onLine;
window.addEventListener('online', () => { isOnline = true; enableNetwork(db); });
window.addEventListener('offline', () => { isOnline = false; disableNetwork(db); });

/**
 * Generate cache key for Firestore documents
 */
function getCacheKey(path: string, params?: Record<string, any>): string {
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${path}:${paramsStr}`;
}

/**
 * Optimized document fetching with caching
 */
export async function getDocumentOptimized<T>(
  collectionPath: string,
  docId: string,
  options: {
    cache?: boolean;
    source?: 'server' | 'cache' | 'default';
  } = {}
): Promise<T | null> {
  const { cache = true, source = 'default' } = options;
  const cacheKey = getCacheKey(`${collectionPath}/${docId}`);
  
  // Check cache first
  if (cache && source !== 'server') {
    const cached = firestoreCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
  }
  
  try {
    const docRef = doc(db, collectionPath, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as T;
      
      // Cache the result
      if (cache) {
        firestoreCache.set(cacheKey, {
          data,
          expiry: Date.now() + CACHE_DURATION
        });
      }
      
      return data;
    }
    
    return null;
  } catch (error) {
    // Return cached data if network fails
    if (!isOnline && cache) {
      const cached = firestoreCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
    }
    throw error;
  }
}

/**
 * Batch document operations to reduce writes
 */
export async function batchOperations(
  operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    docId: string;
    data?: any;
  }>
): Promise<void> {
  // Split into batches of 500 (Firestore limit)
  const batches: any[] = [];
  
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchOps = operations.slice(i, i + BATCH_SIZE);
    
    for (const op of batchOps) {
      const docRef = doc(db, op.collection, op.docId);
      
      switch (op.type) {
        case 'set':
          batch.set(docRef, { ...op.data, updatedAt: Timestamp.now() });
          break;
        case 'update':
          batch.update(docRef, { ...op.data, updatedAt: Timestamp.now() });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    }
    
    batches.push(batch);
  }
  
  // Execute all batches
  await Promise.all(batches.map(batch => batch.commit()));
  
  // Clear related cache entries
  operations.forEach(op => {
    const cacheKey = getCacheKey(`${op.collection}/${op.docId}`);
    firestoreCache.delete(cacheKey);
  });
}

/**
 * Optimized query with cursor-based pagination and caching
 */
export async function queryOptimized<T>(
  collectionPath: string,
  filters: Array<{ field: string; operator: any; value: any }> = [],
  options: {
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
    limitCount?: number;
    startAfterDoc?: QueryDocumentSnapshot;
    cache?: boolean;
  } = {}
): Promise<{
  documents: T[];
  lastDoc?: QueryDocumentSnapshot;
  hasMore: boolean;
}> {
  const {
    orderByField = 'createdAt',
    orderDirection = 'desc',
    limitCount = 20,
    startAfterDoc,
    cache = true
  } = options;
  
  // Generate cache key
  const cacheKey = getCacheKey(collectionPath, {
    filters,
    orderByField,
    orderDirection,
    limitCount,
    startAfter: startAfterDoc?.id
  });
  
  // Check cache
  if (cache) {
    const cached = firestoreCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
  }
  
  try {
    let q = query(collection(db, collectionPath));
    
    // Apply filters
    filters.forEach(filter => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });
    
    // Apply ordering
    q = query(q, orderBy(orderByField, orderDirection));
    
    // Apply pagination
    q = query(q, limit(limitCount + 1)); // +1 to check if there are more
    
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs.slice(0, limitCount).map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
    
    const hasMore = querySnapshot.docs.length > limitCount;
    const lastDoc = hasMore ? querySnapshot.docs[limitCount - 1] : querySnapshot.docs[querySnapshot.docs.length - 1];
    
    const result = {
      documents,
      lastDoc,
      hasMore
    };
    
    // Cache the result
    if (cache) {
      firestoreCache.set(cacheKey, {
        data: result,
        expiry: Date.now() + CACHE_DURATION
      });
    }
    
    return result;
  } catch (error) {
    // Return cached data if available
    if (!isOnline && cache) {
      const cached = firestoreCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
    }
    throw error;
  }
}

/**
 * Smart user data fetching with minimal reads
 */
export async function getUserDataOptimized(userId: string): Promise<{
  profile: any;
  preferences: any;
  goals: any[];
  recentActivity: any[];
}> {
  try {
    // Batch fetch user-related data
    const [profile, goals, activity] = await Promise.all([
      getDocumentOptimized('users', userId),
      queryOptimized('goals', [
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'active' }
      ], { limitCount: 10 }),
      queryOptimized('user_activity', [
        { field: 'userId', operator: '==', value: userId }
      ], { limitCount: 5 })
    ]);
    
    return {
      profile: profile || null,
      preferences: profile?.preferences || {},
      goals: goals.documents || [],
      recentActivity: activity.documents || []
    };
  } catch (error) {
    return {
      profile: null,
      preferences: {},
      goals: [],
      recentActivity: []
    };
  }
}

/**
 * Optimized opportunity search with caching and filtering
 */
export async function searchOpportunitiesOptimized(
  searchParams: {
    category?: string;
    location?: string;
    keywords?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  opportunities: any[];
  hasMore: boolean;
  total: number;
}> {
  const { category, location, keywords, page = 1, limit: limitCount = 20 } = searchParams;
  
  const filters: Array<{ field: string; operator: any; value: any }> = [];
  
  // Add filters based on search params
  if (category) {
    filters.push({ field: 'category', operator: '==', value: category });
  }
  
  if (location) {
    filters.push({ field: 'location', operator: '==', value: location });
  }
  
  // Note: Full-text search with keywords would require Algolia or similar
  // For now, we'll do basic title/description matching
  
  try {
    const result = await queryOptimized('scholarships', filters, {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
      cache: true
    });
    
    let opportunities = result.documents;
    
    // Client-side keyword filtering (temporary solution)
    if (keywords) {
      const keywordRegex = new RegExp(keywords, 'i');
      opportunities = opportunities.filter(opp => 
        keywordRegex.test(opp.title) || 
        keywordRegex.test(opp.description) ||
        keywordRegex.test(opp.provider)
      );
    }
    
    return {
      opportunities,
      hasMore: result.hasMore,
      total: opportunities.length
    };
  } catch (error) {
    return {
      opportunities: [],
      hasMore: false,
      total: 0
    };
  }
}

/**
 * Real-time listener with automatic cleanup
 */
export function createRealtimeListener<T>(
  collectionPath: string,
  filters: Array<{ field: string; operator: any; value: any }> = [],
  callback: (data: T[]) => void,
  options: {
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
    limitCount?: number;
  } = {}
): () => void {
  const {
    orderByField = 'createdAt',
    orderDirection = 'desc',
    limitCount = 50
  } = options;
  
  let q = query(collection(db, collectionPath));
  
  // Apply filters
  filters.forEach(filter => {
    q = query(q, where(filter.field, filter.operator, filter.value));
  });
  
  // Apply ordering and limit
  q = query(q, orderBy(orderByField, orderDirection), limit(limitCount));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
    
    callback(documents);
    
    // Update cache with real-time data
    const cacheKey = getCacheKey(collectionPath, { filters, orderByField, orderDirection, limitCount });
    firestoreCache.set(cacheKey, {
      data: { documents, hasMore: false },
      expiry: Date.now() + CACHE_DURATION
    });
  });
  
  return unsubscribe;
}

/**
 * Optimized user preference updates with conflict resolution
 */
export async function updateUserPreferencesOptimized(
  userId: string,
  preferences: Partial<any>,
  merge: boolean = true
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  
  try {
    if (merge) {
      // Get current preferences to merge
      const currentDoc = await getDoc(docRef);
      const currentPreferences = currentDoc.data()?.preferences || {};
      
      const mergedPreferences = {
        ...currentPreferences,
        ...preferences,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, {
        preferences: mergedPreferences,
        lastModified: Timestamp.now()
      });
    } else {
      await updateDoc(docRef, {
        preferences: {
          ...preferences,
          updatedAt: Timestamp.now()
        },
        lastModified: Timestamp.now()
      });
    }
    
    // Clear user cache
    const cacheKey = getCacheKey(`users/${userId}`);
    firestoreCache.delete(cacheKey);
    
  } catch (error) {
    throw new Error(`Failed to update user preferences: ${error}`);
  }
}

/**
 * Cache management utilities
 */
export const cacheUtils = {
  clear: (pattern?: string) => {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of firestoreCache) {
        if (regex.test(key)) {
          firestoreCache.delete(key);
        }
      }
    } else {
      firestoreCache.clear();
    }
  },
  
  size: () => firestoreCache.size,
  
  warmUp: async (userId: string) => {
    // Pre-load common user data
    try {
      await getUserDataOptimized(userId);
      await searchOpportunitiesOptimized({ limit: 10 });
    } catch (error) {
      // Ignore warm-up errors
    }
  }
};

/**
 * Export optimized Firestore operations
 */
export const optimizedFirestore = {
  getDocument: getDocumentOptimized,
  query: queryOptimized,
  batchOperations,
  getUserData: getUserDataOptimized,
  searchOpportunities: searchOpportunitiesOptimized,
  updateUserPreferences: updateUserPreferencesOptimized,
  createRealtimeListener,
  cache: cacheUtils
};

export default optimizedFirestore;