import { auth } from '../config/firebase';
import { performanceService } from './performanceService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     import.meta.env.VITE_API_URL || 
                     import.meta.env.VITE_REACT_APP_API_BASE || 
                     'https://us-central1-edutu-3.cloudfunctions.net';

/**
 * Get authentication headers for API requests
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

/**
 * Generic API request function with error handling and performance monitoring
 */
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = await getAuthHeaders();
  
  // Start performance tracking
  const endTracking = performanceService.startChatResponse();
  const startTime = performance.now();
  
  try {
    console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const responseTime = performance.now() - startTime;
    console.log(`📡 API Response: ${response.status} ${response.statusText} (${responseTime.toFixed(0)}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      performanceService.recordChatError();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`✅ API Success:`, data);
      return data;
    } else {
      const data = await response.text() as unknown as T;
      console.log(`✅ API Success (text):`, data);
      return data;
    }
  } catch (error) {
    const responseTime = performance.now() - startTime;
    console.error(`❌ API request failed for ${endpoint} (${responseTime.toFixed(0)}ms):`, error);
    performanceService.recordChatError();
    throw error;
  } finally {
    endTracking();
  }
}

// Types for API responses
export interface OpportunityResponse {
  opportunities: any[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface RoadmapResponse {
  roadmap: {
    title: string;
    description: string;
    timeline: string;
    steps: Array<{
      phase: string;
      duration: string;
      tasks: string[];
      milestones: string[];
      resources: string[];
    }>;
    requirements: string[];
    tips: string[];
  };
  success: boolean;
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
  success: boolean;
}

export interface RecommendationResponse {
  recommendations: any[];
  totalScore: number;
  categories: Record<string, number>;
  success: boolean;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  services: Record<string, boolean>;
}

/**
 * Fetch paginated opportunities from the backend
 */
export async function fetchOpportunitiesFromAPI(
  page: number = 1,
  limit: number = 20,
  filters?: {
    category?: string;
    location?: string;
    search?: string;
  }
): Promise<OpportunityResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(filters?.category && { category: filters.category }),
    ...(filters?.location && { location: filters.location }),
    ...(filters?.search && { search: filters.search })
  });

  return await apiRequest<OpportunityResponse>(`/api/opportunities?${params}`);
}

/**
 * Generate AI-powered personalized roadmap
 */
export async function generateRoadmap(
  opportunityId?: string, 
  goalTitle?: string,
  customPrompt?: string
): Promise<RoadmapResponse> {
  const user = auth.currentUser;
  
  return await apiRequest<RoadmapResponse>('/api/roadmaps', {
    method: 'POST',
    body: JSON.stringify({ 
      opportunityId,
      goalTitle,
      customPrompt,
      userId: user?.uid
    })
  });
}

/**
 * Get existing roadmaps for a user
 */
export async function getUserRoadmaps(): Promise<{roadmaps: any[], success: boolean}> {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User must be authenticated to fetch roadmaps');
  }
  
  return await apiRequest<{roadmaps: any[], success: boolean}>(`/api/roadmaps?userId=${user.uid}`, {
    method: 'GET'
  });
}

/**
 * Update roadmap progress
 */
export async function updateRoadmapProgress(
  roadmapId: string, 
  taskId: string, 
  completed: boolean
): Promise<{success: boolean}> {
  const user = auth.currentUser;
  
  return await apiRequest<{success: boolean}>(`/api/roadmaps/${roadmapId}/progress`, {
    method: 'PUT',
    body: JSON.stringify({
      taskId,
      completed,
      userId: user?.uid
    })
  });
}

/**
 * Get personalized recommendations
 */
export async function getRecommendations(
  preferences?: {
    interests?: string[];
    skills?: string[];
    experience_level?: string;
    location?: string;
  }
): Promise<RecommendationResponse> {
  return await apiRequest<RecommendationResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify({ preferences })
  });
}

/**
 * Send message to AI chat
 */
export async function sendChatMessage(
  message: string,
  conversationId?: string,
  userContext?: { name?: string; age?: number; ragContext?: any }
): Promise<ChatResponse> {
  const user = auth.currentUser;
  const startTime = performance.now();
  
  // Enhanced request payload with RAG context and performance hints
  const requestPayload = {
    message,
    userId: user?.uid,
    sessionId: conversationId || `session_${Date.now()}`,
    userContext: {
      name: userContext?.name,
      age: userContext?.age
    },
    // Pass RAG context to backend for enhanced responses
    ragContext: userContext?.ragContext,
    // Performance hints
    preferStreaming: true,
    maxResponseTime: 10000 // 10 second preference
  };

  // Try multiple endpoints for resilience
  const endpoints = ['/simpleChat', '/api/chat/message', '/api/chat'];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔄 Trying chat endpoint: ${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      // Record performance metrics
      const responseTime = performance.now() - startTime;
      performanceService.recordMetric('api_chat_response_time', responseTime);
      
      // Log successful connection
      console.log(`✅ Chat API successful via ${endpoint}`);
      
      if (userContext?.ragContext?.contextUsed) {
        console.log('✅ RAG-enhanced response received from backend');
        performanceService.recordRAGContextUsage(true);
      }

      return result;
      
    } catch (error) {
      console.warn(`❌ Chat endpoint ${endpoint} failed:`, error.message);
      performanceService.recordChatError();
      // Continue to next endpoint
    }
  }
  
  // If all endpoints failed, throw error
  throw new Error('All chat endpoints failed - backend may be unavailable');
}

/**
 * Check backend health status
 */
export async function checkHealth(): Promise<HealthResponse> {
  return await apiRequest<HealthResponse>('/health');
}

/**
 * Get user preferences from their profile for recommendations
 */
async function getUserPreferencesForRecommendations() {
  const user = auth.currentUser;
  if (!user) return undefined;
  
  try {
    // Try to get user preferences from Firestore
    const { db } = await import('../config/firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Enhance preferences with MCP analysis if available
      const basePreferences = {
        interests: userData.preferences?.careerInterests || [],
        skills: userData.preferences?.skills || [],
        experience_level: userData.preferences?.experienceLevel || 'beginner',
        location: userData.preferences?.location || 'Various'
      };

      // Add MCP-enhanced technical skills analysis
      try {
        const { mcpService } = await import('./mcpService');
        const mcpStatus = mcpService.getStatus();
        
        if (mcpStatus.connected && basePreferences.skills.length > 0) {
          // Get enhanced recommendations for each skill
          const enhancedRecommendations = await Promise.all(
            basePreferences.skills.slice(0, 3).map(skill => 
              mcpService.getCodingRecommendations(skill, basePreferences.skills)
            )
          );
          
          // Merge additional languages and frameworks from MCP
          const allLanguages = new Set(basePreferences.skills);
          const allFrameworks = new Set();
          
          enhancedRecommendations.forEach(rec => {
            rec.languages.forEach(lang => allLanguages.add(lang));
            rec.frameworks.forEach(fw => allFrameworks.add(fw));
          });
          
          return {
            ...basePreferences,
            enhanced_skills: Array.from(allLanguages),
            frameworks: Array.from(allFrameworks),
            mcp_enhanced: true
          };
        }
      } catch (mcpError) {
        console.warn('MCP enhancement failed:', mcpError);
      }
      
      return basePreferences;
    }
  } catch (error) {
    console.warn('Could not fetch user preferences:', error);
  }
  
  return undefined;
}

/**
 * Get personalized top opportunities for dashboard using AI recommendations
 */
export async function getTopOpportunities(limit: number = 3): Promise<any[]> {
  console.log(`🎯 Getting top ${limit} opportunities...`);
  
  try {
    // Try Firestore first for reliability
    console.log('📊 Trying Firestore for opportunities...');
    const { fetchScholarships } = await import('./scholarshipService');
    const firestoreOpportunities = await fetchScholarships(limit);
    
    if (firestoreOpportunities.length > 0) {
      console.log(`✅ Got ${firestoreOpportunities.length} opportunities from Firestore`);
      return firestoreOpportunities;
    }

    // Try AI recommendations if authenticated
    const user = auth.currentUser;
    if (user) {
      try {
        console.log('🤖 Trying AI recommendations...');
        const userPreferences = await getUserPreferencesForRecommendations();
        const recommendationResponse = await getRecommendations(userPreferences);
        
        if (recommendationResponse.success && recommendationResponse.recommendations.length > 0) {
          console.log(`✅ Got ${recommendationResponse.recommendations.length} AI recommendations`);
          return recommendationResponse.recommendations.slice(0, limit);
        }
      } catch (recommendationError) {
        console.warn('AI recommendations failed:', recommendationError);
      }
    }
    
    // Try regular opportunities API
    console.log('🌐 Trying opportunities API...');
    const response = await fetchOpportunitiesFromAPI(1, limit);
    if (response.opportunities && response.opportunities.length > 0) {
      console.log(`✅ Got ${response.opportunities.length} opportunities from API`);
      return response.opportunities;
    }

    // Return empty array if all methods fail
    console.warn('⚠️ All opportunity sources failed, returning empty array');
    return [];
    
  } catch (error) {
    console.error('❌ Failed to fetch top opportunities:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

/**
 * Enhanced opportunity search with API integration
 */
export async function searchOpportunitiesWithAPI(
  searchTerm: string,
  page: number = 1,
  limit: number = 20
): Promise<OpportunityResponse> {
  try {
    return await fetchOpportunitiesFromAPI(page, limit, { search: searchTerm });
  } catch (error) {
    console.error('API search failed, falling back to Firestore:', error);
    // Fallback to existing search
    const { searchScholarships } = await import('./scholarshipService');
    const results = await searchScholarships(searchTerm, limit);
    return {
      opportunities: results,
      total: results.length,
      page: 1,
      hasMore: false
    };
  }
}

/**
 * Get opportunity categories from API
 */
export async function getOpportunityCategories(): Promise<string[]> {
  try {
    // This would need to be implemented in the backend
    const response = await apiRequest<{categories: string[]}>('/api/opportunities/categories');
    return response.categories;
  } catch (error) {
    console.error('Failed to fetch categories from API:', error);
    // Return default categories as specified in requirements
    return ['All', 'Scholarships', 'Leadership', 'Tech', 'Entrepreneurship', 'Global Programs'];
  }
}

/**
 * Auto-refresh service for opportunities
 */
class OpportunityRefreshService {
  private refreshInterval: NodeJS.Timeout | null = null;
  private onRefreshCallbacks: Array<(opportunities: any[]) => void> = [];
  private lastRefreshTime: Date | null = null;
  
  startAutoRefresh(intervalHours: number = 6) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    this.refreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Auto-refreshing opportunities...');
        
        // Try to get fresh data from scholarships collection (live data)
        const { fetchScholarships } = await import('./scholarshipService');
        const scholarships = await fetchScholarships(20);
        
        if (scholarships.length > 0) {
          console.log(`✅ Auto-refresh successful: ${scholarships.length} opportunities loaded from live data`);
          this.lastRefreshTime = new Date();
          
          // Notify all registered callbacks
          this.onRefreshCallbacks.forEach(callback => {
            callback(scholarships);
          });
        } else {
          // Fallback to API if no scholarships found
          const response = await fetchOpportunitiesFromAPI(1, 20);
          console.log(`✅ Auto-refresh successful: ${response.opportunities.length} opportunities loaded from API`);
          this.lastRefreshTime = new Date();
          
          this.onRefreshCallbacks.forEach(callback => {
            callback(response.opportunities);
          });
        }
        
      } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
      }
    }, intervalMs);
    
    console.log(`🚀 Auto-refresh started - will refresh opportunities every ${intervalHours} hours`);
    
    // Trigger immediate refresh
    setTimeout(() => {
      if (this.refreshInterval) {
        this.manualRefresh();
      }
    }, 1000);
  }
  
  async manualRefresh(): Promise<void> {
    try {
      console.log('🔄 Manual refresh triggered...');
      
      // Get fresh data from scholarships collection
      const { fetchScholarships } = await import('./scholarshipService');
      const scholarships = await fetchScholarships(20);
      
      if (scholarships.length > 0) {
        console.log(`✅ Manual refresh successful: ${scholarships.length} opportunities loaded`);
        this.lastRefreshTime = new Date();
        
        // Notify all registered callbacks
        this.onRefreshCallbacks.forEach(callback => {
          callback(scholarships);
        }); 
      }
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    }
  }
  
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('🛑 Auto-refresh stopped');
    }
  }
  
  onRefresh(callback: (opportunities: any[]) => void) {
    this.onRefreshCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onRefreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.onRefreshCallbacks.splice(index, 1);
      }
    };
  }
  
  getLastRefreshTime(): Date | null {
    return this.lastRefreshTime;
  }
  
  isRunning(): boolean {
    return this.refreshInterval !== null;
  }
}

export const opportunityRefreshService = new OpportunityRefreshService();