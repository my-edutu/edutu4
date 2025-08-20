import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  onSnapshot, 
  QueryDocumentSnapshot,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface OpportunityData {
  id: string;
  title: string;
  summary: string;
  provider: string;
  deadline: string;
  imageUrl?: string;
  requirements: string[];
  benefits: string[];
  applicationProcess: string[];
  link: string;
  successRate: string;
  eligibility: string[];
  category?: string;
  location?: string;
  createdAt: Timestamp;
  publishedDate?: Timestamp;
  tags?: string[];
  match?: number;
}

interface UseOpportunitiesOptions {
  pageSize?: number;
  category?: string;
  location?: string;
  realTime?: boolean;
}

interface UseOpportunitiesReturn {
  opportunities: OpportunityData[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  totalCount: number;
}

export const useOpportunities = (options: UseOpportunitiesOptions = {}): UseOpportunitiesReturn => {
  const {
    pageSize = 20,
    category,
    location,
    realTime = true
  } = options;

  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Build base query
  const buildQuery = useCallback((startAfterDoc?: QueryDocumentSnapshot) => {
    let baseQuery = query(
      collection(db, 'scholarships'),
      orderBy('createdAt', 'desc')
    );

    // Add filters
    if (category) {
      baseQuery = query(baseQuery, where('category', '==', category));
    }
    if (location) {
      baseQuery = query(baseQuery, where('location', '==', location));
    }

    // Add pagination
    if (startAfterDoc) {
      baseQuery = query(baseQuery, startAfter(startAfterDoc), limit(pageSize));
    } else {
      baseQuery = query(baseQuery, limit(pageSize));
    }

    return baseQuery;
  }, [category, location, pageSize]);

  // Transform Firestore document to OpportunityData
  const transformDocument = (doc: QueryDocumentSnapshot): OpportunityData => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || '',
      summary: data.summary || data.description || '',
      provider: data.provider || data.organization || '',
      deadline: data.deadline || '',
      imageUrl: data.imageUrl || data.image || '',
      requirements: Array.isArray(data.requirements) ? data.requirements : [data.requirements || ''],
      benefits: Array.isArray(data.benefits) ? data.benefits : [data.benefits || ''],
      applicationProcess: Array.isArray(data.applicationProcess) ? data.applicationProcess : [data.applicationProcess || ''],
      link: data.link || data.url || '',
      successRate: data.successRate || 'Not specified',
      eligibility: Array.isArray(data.eligibility) ? data.eligibility : [data.eligibility || ''],
      category: data.category || 'General',
      location: data.location || '',
      createdAt: data.createdAt,
      publishedDate: data.publishedDate,
      tags: data.tags || [],
      match: data.match || Math.floor(Math.random() * 30) + 70 // Default match score 70-100%
    };
  };

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const q = buildQuery();
      const snapshot = await getDocs(q);
      
      const newOpportunities = snapshot.docs.map(transformDocument);
      
      setOpportunities(newOpportunities);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
      setTotalCount(snapshot.docs.length);
      
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setError('Failed to load opportunities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, pageSize]);

  // Load more data (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !lastDoc) return;

    try {
      setLoading(true);
      const q = buildQuery(lastDoc);
      const snapshot = await getDocs(q);
      
      const newOpportunities = snapshot.docs.map(transformDocument);
      
      setOpportunities(prev => [...prev, ...newOpportunities]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
      setTotalCount(prev => prev + snapshot.docs.length);
      
    } catch (err) {
      console.error('Error loading more opportunities:', err);
      setError('Failed to load more opportunities.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, hasMore, loading, lastDoc, pageSize]);

  // Refresh data
  const refresh = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchInitialData();
  }, [fetchInitialData]);

  // Set up real-time subscription or fetch data
  useEffect(() => {
    if (realTime) {
      // Real-time subscription
      const q = buildQuery();
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const newOpportunities = snapshot.docs.map(transformDocument);
          setOpportunities(newOpportunities);
          setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
          setHasMore(snapshot.docs.length === pageSize);
          setTotalCount(snapshot.docs.length);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Real-time subscription error:', err);
          setError('Connection error. Please refresh.');
          setLoading(false);
        }
      );

      return unsubscribe;
    } else {
      // One-time fetch
      fetchInitialData();
    }
  }, [buildQuery, fetchInitialData, realTime, pageSize]);

  return {
    opportunities,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    totalCount
  };
};

// Hook for getting top opportunities (used by Dashboard)
export const useTopOpportunities = (count: number = 3) => {
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📊 useTopOpportunities: Fetching ${count} opportunities...`);
      
      // Try API service first (which handles fallbacks internally)
      const { getTopOpportunities } = await import('../services/apiService');
      const apiOpportunities = await getTopOpportunities(count);
      
      if (apiOpportunities.length > 0) {
        // Transform API data to OpportunityData format
        const transformedOpportunities = apiOpportunities.map((opp, index) => ({
          id: opp.id || `api_${index}`,
          title: opp.title || '',
          summary: opp.summary || opp.description || '',
          provider: opp.provider || opp.organization || '',
          deadline: opp.deadline || '',
          imageUrl: opp.imageUrl || opp.image || '',
          requirements: Array.isArray(opp.requirements) ? opp.requirements : [opp.requirements || ''],
          benefits: Array.isArray(opp.benefits) ? opp.benefits : [opp.benefits || ''],
          applicationProcess: Array.isArray(opp.applicationProcess) ? opp.applicationProcess : [opp.applicationProcess || ''],
          link: opp.link || opp.url || '',
            successRate: opp.successRate || 'Not specified',
            eligibility: Array.isArray(opp.eligibility) ? opp.eligibility : [opp.eligibility || ''],
            category: opp.category || 'General',
            location: opp.location || '',
            createdAt: opp.createdAt || new Date() as any,
            publishedDate: opp.publishedDate,
            tags: opp.tags || [],
            match: opp.match || Math.floor(Math.random() * 30) + 70
          }));
          
          console.log(`✅ useTopOpportunities: Got ${transformedOpportunities.length} opportunities`);
          setOpportunities(transformedOpportunities);
          setLoading(false);
          return;
        }

        // Fallback to Firestore realtime subscription
        console.log('📊 useTopOpportunities: Falling back to Firestore subscription...');
        const q = query(
          collection(db, 'scholarships'),
          orderBy('createdAt', 'desc'),
          limit(count)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const newOpportunities = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                title: data.title || '',
                summary: data.summary || data.description || '',
                provider: data.provider || data.organization || '',
                deadline: data.deadline || '',
                imageUrl: data.imageUrl || data.image || '',
                requirements: Array.isArray(data.requirements) ? data.requirements : [data.requirements || ''],
                benefits: Array.isArray(data.benefits) ? data.benefits : [data.benefits || ''],
                applicationProcess: Array.isArray(data.applicationProcess) ? data.applicationProcess : [data.applicationProcess || ''],
                link: data.link || data.url || '',
                successRate: data.successRate || 'Not specified',
                eligibility: Array.isArray(data.eligibility) ? data.eligibility : [data.eligibility || ''],
                category: data.category || 'General',
                location: data.location || '',
                createdAt: data.createdAt,
                publishedDate: data.publishedDate,
                tags: data.tags || [],
                match: data.match || Math.floor(Math.random() * 30) + 70
              };
            });
            
            console.log(`✅ useTopOpportunities: Got ${newOpportunities.length} opportunities from Firestore`);
            setOpportunities(newOpportunities);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('❌ Top opportunities Firestore error:', err);
            setError('Unable to load opportunities. Please check your connection.');
            setLoading(false);
          }
        );

        return unsubscribe;
        
      } catch (err) {
        console.error('❌ useTopOpportunities: Error fetching opportunities:', err);
        setError('Failed to load opportunities. Please try again.');
        setLoading(false);
      }
    }, [count, refreshTrigger]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const refresh = useCallback(() => {
    console.log('🔄 Refreshing opportunities...');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return { opportunities, loading, error, refresh };
};

// Hook for single opportunity details
export const useOpportunityDetails = (opportunityId: string) => {
  const [opportunity, setOpportunity] = useState<OpportunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opportunityId) {
      setOpportunity(null);
      setLoading(false);
      return;
    }

    const docRef = collection(db, 'scholarships');
    const q = query(docRef, where('__name__', '==', opportunityId));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          const opportunityData: OpportunityData = {
            id: doc.id,
            title: data.title || '',
            summary: data.summary || data.description || '',
            provider: data.provider || data.organization || '',
            deadline: data.deadline || '',
            imageUrl: data.imageUrl || data.image || '',
            requirements: Array.isArray(data.requirements) ? data.requirements : [data.requirements || ''],
            benefits: Array.isArray(data.benefits) ? data.benefits : [data.benefits || ''],
            applicationProcess: Array.isArray(data.applicationProcess) ? data.applicationProcess : [data.applicationProcess || ''],
            link: data.link || data.url || '',
            successRate: data.successRate || 'Not specified',
            eligibility: Array.isArray(data.eligibility) ? data.eligibility : [data.eligibility || ''],
            category: data.category || 'General',
            location: data.location || '',
            createdAt: data.createdAt,
            publishedDate: data.publishedDate,
            tags: data.tags || [],
            match: data.match || Math.floor(Math.random() * 30) + 70
          };
          setOpportunity(opportunityData);
        } else {
          setOpportunity(null);
          setError('Opportunity not found.');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Opportunity details subscription error:', err);
        setError('Failed to load opportunity details.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [opportunityId]);

  return { opportunity, loading, error };
};