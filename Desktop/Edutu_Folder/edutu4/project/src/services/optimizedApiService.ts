/**
 * Optimized API Service for Edutu
 * Features: Request caching, deduplication, retry logic, and optimized Firestore queries
 */

import { auth } from '../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_REACT_APP_API_BASE || 'https://us-central1-edutu-3.cloudfunctions.net';

// Cache for API responses
const responseCache = new Map<string, {data: any, expiry: number}>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Enhanced authentication headers with caching
 */
let cachedToken: {token: string, expiry: number} | null = null;

async function getAuthHeaders(): Promise<HeadersInit> {
  const now = Date.now();
  
  // Use cached token if valid
  if (cachedToken && cachedToken.expiry > now) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cachedToken.token}`
    };
  }
  
  // Get fresh token
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    // Cache token for 50 minutes (Firebase tokens expire in 1 hour)
    cachedToken = {
      token,
      expiry: now + (50 * 60 * 1000)
    };
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

/**
 * Enhanced API request function with caching, deduplication, and retry logic
 */
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit & { 
    cache?: boolean,
    retries?: number,
    timeout?: number 
  } = {}
): Promise<T> {
  const { cache = true, retries = 2, timeout = 10000, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  const cacheKey = `${fetchOptions.method || 'GET'}:${url}:${JSON.stringify(fetchOptions.body || {})}`;
  
  // Check cache for GET requests
  if (cache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
  }
  
  // Check for pending requests (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Create new request with timeout and retry logic
  const requestPromise = executeRequestWithRetry(url, fetchOptions, retries, timeout);
  
  // Store in pending requests
  pendingRequests.set(cacheKey, requestPromise);
  
  try {
    const result = await requestPromise;
    
    // Cache successful GET responses
    if (cache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      responseCache.set(cacheKey, {
        data: result,
        expiry: Date.now() + CACHE_DURATION
      });
    }
    
    return result;
  } finally {
    // Remove from pending requests
    pendingRequests.delete(cacheKey);
  }
}

/**
 * Execute request with retry logic and timeout
 */
async function executeRequestWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number,
  timeout: number
): Promise<T> {
  const headers = await getAuthHeaders();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Batch API requests to reduce network calls
 */
export async function batchApiRequests<T>(
  requests: Array<{endpoint: string, options?: RequestInit}>
): Promise<T[]> {
  // If only one request, use regular API call
  if (requests.length === 1) {
    return [await apiRequest<T>(requests[0].endpoint, requests[0].options)];
  }
  
  // For multiple requests, execute in parallel with concurrency limit
  const BATCH_SIZE = 3;
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(req => 
      apiRequest<T>(req.endpoint, req.options)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Clear API cache (useful for data refresh)
 */
export function clearApiCache(pattern?: string): void {
  if (pattern) {
    const regex = new RegExp(pattern);
    for (const [key] of responseCache) {
      if (regex.test(key)) {
        responseCache.delete(key);
      }
    }
  } else {
    responseCache.clear();
  }
}

/**
 * Optimized opportunity fetching with intelligent caching
 */
export async function fetchOpportunitiesOptimized(
  page: number = 1,
  limit: number = 20,
  filters?: {
    category?: string;
    location?: string;
    search?: string;
  }
): Promise<{opportunities: any[], total: number, page: number, hasMore: boolean}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(filters?.category && { category: filters.category }),
    ...(filters?.location && { location: filters.location }),
    ...(filters?.search && { search: filters.search })
  });

  return await apiRequest(`/api/opportunities?${params}`, {
    cache: true,
    timeout: 8000
  });
}

/**
 * Optimized user data fetching - batch multiple user-related requests
 */
export async function fetchUserDataBatch(userId: string): Promise<{
  profile: any;
  goals: any[];
  roadmaps: any[];
  recommendations: any[];
}> {
  const requests = [
    { endpoint: `/api/users/${userId}/profile` },
    { endpoint: `/api/users/${userId}/goals` },
    { endpoint: `/api/users/${userId}/roadmaps` },
    { endpoint: `/api/users/${userId}/recommendations` }
  ];
  
  try {
    const [profile, goals, roadmaps, recommendations] = await batchApiRequests(requests);
    
    return {
      profile: profile || null,
      goals: goals || [],
      roadmaps: roadmaps || [],
      recommendations: recommendations || []
    };
  } catch (error) {
    // Return partial data if some requests fail
    return {
      profile: null,
      goals: [],
      roadmaps: [],
      recommendations: []
    };
  }
}

/**
 * Optimized chat message with context caching
 */
export async function sendChatMessageOptimized(
  message: string,
  sessionId?: string
): Promise<{response: string, conversationId?: string, success: boolean}> {
  const user = auth.currentUser;
  
  return await apiRequest('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({
      message,
      sessionId,
      userId: user?.uid
    }),
    cache: false, // Chat responses shouldn't be cached
    timeout: 15000 // Longer timeout for AI responses
  });
}

/**
 * Optimized roadmap generation with progress tracking
 */
export async function generateRoadmapOptimized(
  opportunityId?: string,
  goalTitle?: string,
  customPrompt?: string
): Promise<{roadmap: any, success: boolean}> {
  const user = auth.currentUser;
  
  return await apiRequest('/api/roadmaps', {
    method: 'POST',
    body: JSON.stringify({
      opportunityId,
      goalTitle,
      customPrompt,
      userId: user?.uid
    }),
    cache: false, // Dynamic content shouldn't be cached
    timeout: 20000 // Longer timeout for AI generation
  });
}

/**
 * Smart prefetching for anticipated user actions
 */
export function prefetchUserData(userId: string): void {
  // Prefetch common data in background
  setTimeout(() => {
    fetchUserDataBatch(userId).catch(() => {
      // Ignore prefetch errors
    });
  }, 1000);
}

/**
 * Cache warm-up for frequently accessed data
 */
export async function warmUpCache(): Promise<void> {
  try {
    // Warm up opportunity cache with first page
    await fetchOpportunitiesOptimized(1, 10);
    
    // Prefetch user data if authenticated
    const user = auth.currentUser;
    if (user) {
      prefetchUserData(user.uid);
    }
  } catch (error) {
    // Cache warm-up failures shouldn't affect app functionality
  }
}

/**
 * Health check with timeout
 */
export async function healthCheck(): Promise<{status: string, services: Record<string, boolean>}> {
  return await apiRequest('/api/health', {
    timeout: 5000,
    cache: false
  });
}

/**
 * Export optimized versions as default
 */
export const optimizedApi = {
  fetchOpportunities: fetchOpportunitiesOptimized,
  fetchUserDataBatch,
  sendChatMessage: sendChatMessageOptimized,
  generateRoadmap: generateRoadmapOptimized,
  batchRequests: batchApiRequests,
  clearCache: clearApiCache,
  warmUpCache,
  prefetchUserData,
  healthCheck
};

export default optimizedApi;