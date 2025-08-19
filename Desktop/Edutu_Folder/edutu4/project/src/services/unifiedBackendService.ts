// Unified Backend Service Coordinator
// Manages multiple backend services for optimal performance and reliability

import { auth } from '../config/firebase';
import { multiProviderLLMService, type LLMRequest, type LLMResponse } from './multiProviderLLMService';
import { performanceService } from './performanceService';

interface BackendService {
  name: string;
  baseUrl: string;
  priority: number;
  healthCheck: string;
  enabled: boolean;
  lastHealthCheck?: Date;
  isHealthy: boolean;
  responseTime: number;
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  userContext?: {
    name?: string;
    age?: number;
    ragContext?: any;
  };
}

interface ChatResponse {
  response: string;
  conversationId?: string;
  success: boolean;
  source: 'firebase-functions' | 'ai-backend' | 'api-server' | 'fallback-llm' | 'local';
  responseTime: number;
}

class UnifiedBackendService {
  private backends: BackendService[] = [
    {
      name: 'Firebase Functions',
      baseUrl: import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-edutu-3.cloudfunctions.net',
      priority: 1,
      healthCheck: '/health',
      enabled: true,
      isHealthy: true,
      responseTime: 0
    },
    {
      name: 'AI Backend',
      baseUrl: import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:8001',
      priority: 2,
      healthCheck: '/health',
      enabled: true,
      isHealthy: true,
      responseTime: 0
    },
    {
      name: 'API Server',
      baseUrl: import.meta.env.VITE_API_SERVER_URL || 'http://localhost:8002',
      priority: 3,
      healthCheck: '/health',
      enabled: true,
      isHealthy: true,
      responseTime: 0
    }
  ];

  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.startHealthChecks();
    console.log('Unified Backend Service initialized');
  }

  private startHealthChecks() {
    // Initial health check
    this.performHealthChecks();
    
    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async performHealthChecks() {
    console.log('🔍 Performing backend health checks...');
    
    for (const backend of this.backends) {
      if (!backend.enabled) continue;
      
      try {
        const startTime = performance.now();
        const response = await fetch(`${backend.baseUrl}${backend.healthCheck}`, {
          method: 'GET',
          headers: await this.getAuthHeaders(),
          signal: AbortSignal.timeout(5000) // 5 second timeout for health checks
        });
        
        const responseTime = performance.now() - startTime;
        backend.responseTime = responseTime;
        backend.isHealthy = response.ok;
        backend.lastHealthCheck = new Date();
        
        console.log(`${backend.name}: ${response.ok ? '✅' : '❌'} (${responseTime.toFixed(0)}ms)`);
        
      } catch (error) {
        backend.isHealthy = false;
        backend.lastHealthCheck = new Date();
        console.log(`${backend.name}: ❌ (${error})`);
      }
    }
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private getAvailableBackends(): BackendService[] {
    return this.backends
      .filter(backend => backend.enabled && backend.isHealthy)
      .sort((a, b) => a.priority - b.priority);
  }

  private getBestBackend(): BackendService | null {
    const available = this.getAvailableBackends();
    
    if (available.length === 0) return null;
    
    // Choose based on priority and response time
    const fastestInTopTier = available
      .filter(b => b.priority === available[0].priority)
      .sort((a, b) => a.responseTime - b.responseTime)[0];
    
    return fastestInTopTier;
  }

  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = performance.now();
    performanceService.startChatResponse();
    
    try {
      // Try backends in order of priority
      const availableBackends = this.getAvailableBackends();
      
      for (const backend of availableBackends) {
        try {
          console.log(`🚀 Trying ${backend.name} for chat request...`);
          
          const response = await this.callBackendChat(backend, request);
          const responseTime = performance.now() - startTime;
          
          console.log(`✅ ${backend.name} responded successfully (${responseTime.toFixed(0)}ms)`);
          
          performanceService.recordMetric('chat_response_time', responseTime);
          
          return {
            ...response,
            source: this.getSourceName(backend.name),
            responseTime
          };
          
        } catch (error) {
          console.warn(`❌ ${backend.name} failed:`, error);
          continue;
        }
      }
      
      // If all backends fail, try direct LLM fallback
      console.log('🤖 All backends failed, trying direct LLM fallback...');
      return await this.callLLMFallback(request, startTime);
      
    } catch (error) {
      console.error('All chat methods failed:', error);
      performanceService.recordChatError();
      
      // Ultimate fallback
      return {
        response: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        success: false,
        source: 'local',
        responseTime: performance.now() - startTime
      };
    }
  }

  private async callBackendChat(backend: BackendService, request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
    
    try {
      // Try different endpoints based on backend
      const endpoints = this.getChatEndpoints(backend.name);
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${backend.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({
              message: request.message,
              userId: auth.currentUser?.uid,
              sessionId: request.conversationId || `session_${Date.now()}`,
              userContext: request.userContext,
              ragContext: request.userContext?.ragContext,
              preferStreaming: false,
              maxResponseTime: 15000
            }),
            signal: controller.signal
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
          
          const data = await response.json();
          
          return {
            response: data.response || data.content || data.message,
            conversationId: data.conversationId || data.sessionId,
            success: true,
            source: 'api',
            responseTime: 0 // Will be set by caller
          };
          
        } catch (endpointError) {
          console.warn(`Endpoint ${endpoint} failed:`, endpointError);
          continue;
        }
      }
      
      throw new Error('All endpoints failed');
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getChatEndpoints(backendName: string): string[] {
    switch (backendName) {
      case 'Firebase Functions':
        return ['/simpleChat', '/api/chat/message', '/chat'];
      case 'AI Backend':
        return ['/api/chat', '/chat', '/api/chat/message'];
      case 'API Server':
        return ['/api/chat/message', '/chat'];
      default:
        return ['/chat', '/api/chat/message'];
    }
  }

  private async callLLMFallback(request: ChatRequest, startTime: number): Promise<ChatResponse> {
    try {
      const llmRequest: LLMRequest = {
        messages: [
          {
            role: 'system',
            content: `You are Edutu AI, an expert opportunity coach for young African professionals. 
            
            Your mission: Help users discover and pursue educational and career opportunities through personalized guidance.
            
            Core capabilities:
            - Find and recommend scholarships, grants, and educational opportunities
            - Provide career guidance and skill development advice
            - Create personalized learning and application roadmaps
            - Connect users with relevant communities and mentors
            
            Communication style:
            - Warm, encouraging, and professional
            - Specific and actionable advice
            - Focus on opportunities available to African youth globally
            - Always provide concrete next steps`
          },
          {
            role: 'user',
            content: request.message
          }
        ],
        maxTokens: 1000,
        temperature: 0.7
      };
      
      const llmResponse = await multiProviderLLMService.generateResponse(llmRequest);
      const responseTime = performance.now() - startTime;
      
      console.log(`✅ Direct LLM fallback successful via ${llmResponse.provider} (${responseTime.toFixed(0)}ms)`);
      performanceService.recordMetric('llm_fallback_response_time', responseTime);
      
      return {
        response: llmResponse.content,
        conversationId: request.conversationId || `llm_session_${Date.now()}`,
        success: true,
        source: 'fallback-llm',
        responseTime
      };
      
    } catch (error) {
      console.error('LLM fallback failed:', error);
      throw error;
    }
  }

  private getSourceName(backendName: string): ChatResponse['source'] {
    switch (backendName) {
      case 'Firebase Functions':
        return 'firebase-functions';
      case 'AI Backend':
        return 'ai-backend';
      case 'API Server':
        return 'api-server';
      default:
        return 'local';
    }
  }

  // Get opportunities from multiple backends
  async getOpportunities(limit: number = 20, filters?: any): Promise<any[]> {
    const availableBackends = this.getAvailableBackends();
    
    for (const backend of availableBackends) {
      try {
        console.log(`🔍 Fetching opportunities from ${backend.name}...`);
        
        const response = await fetch(`${backend.baseUrl}/api/opportunities?limit=${limit}`, {
          method: 'GET',
          headers: await this.getAuthHeaders(),
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const opportunities = data.opportunities || data.results || data;
          
          if (Array.isArray(opportunities) && opportunities.length > 0) {
            console.log(`✅ Got ${opportunities.length} opportunities from ${backend.name}`);
            return opportunities;
          }
        }
        
      } catch (error) {
        console.warn(`${backend.name} opportunities failed:`, error);
        continue;
      }
    }
    
    // Fallback to Firestore
    try {
      console.log('📊 Falling back to Firestore for opportunities...');
      const { fetchScholarships } = await import('./scholarshipService');
      const scholarships = await fetchScholarships(limit);
      
      if (scholarships.length > 0) {
        console.log(`✅ Got ${scholarships.length} opportunities from Firestore`);
        return scholarships;
      }
    } catch (error) {
      console.error('Firestore fallback failed:', error);
    }
    
    return [];
  }

  // Generate roadmap from backends
  async generateRoadmap(goalTitle: string, opportunityId?: string): Promise<any> {
    const availableBackends = this.getAvailableBackends();
    
    for (const backend of availableBackends) {
      try {
        const response = await fetch(`${backend.baseUrl}/api/roadmaps`, {
          method: 'POST',
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({
            goalTitle,
            opportunityId,
            userId: auth.currentUser?.uid
          }),
          signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Generated roadmap via ${backend.name}`);
          return data;
        }
        
      } catch (error) {
        console.warn(`${backend.name} roadmap generation failed:`, error);
        continue;
      }
    }
    
    throw new Error('All roadmap generation methods failed');
  }

  // Get system status
  getSystemStatus() {
    const availableBackends = this.getAvailableBackends();
    const llmStatus = multiProviderLLMService.getProviderStatus();
    
    return {
      backends: this.backends.map(b => ({
        name: b.name,
        enabled: b.enabled,
        healthy: b.isHealthy,
        responseTime: b.responseTime,
        lastCheck: b.lastHealthCheck
      })),
      availableBackends: availableBackends.length,
      llmProviders: llmStatus,
      overallHealth: availableBackends.length > 0 || llmStatus.some(p => p.available)
    };
  }

  // Test all systems
  async testAllSystems() {
    console.log('🧪 Testing all backend systems...');
    
    // Test backends
    await this.performHealthChecks();
    
    // Test LLM providers
    const llmTests = await multiProviderLLMService.testProviders();
    
    // Test chat functionality
    let chatWorking = false;
    try {
      const testResponse = await this.sendChatMessage({
        message: 'Hello, this is a test message. Please respond with "Test successful".',
        conversationId: 'test_session'
      });
      chatWorking = testResponse.success && testResponse.response.includes('Test successful');
    } catch (error) {
      console.error('Chat test failed:', error);
    }
    
    const results = {
      backends: this.getSystemStatus().backends,
      llmProviders: llmTests,
      chatWorking,
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 System test results:', results);
    return results;
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export const unifiedBackendService = new UnifiedBackendService();
export type { ChatRequest, ChatResponse };