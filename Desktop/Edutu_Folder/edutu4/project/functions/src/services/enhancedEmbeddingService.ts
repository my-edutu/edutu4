/**
 * Enhanced Embedding Service for Edutu RAG System
 * Supports multi-provider embeddings with intelligent fallback and caching
 */

import { OpenAI } from 'openai';
import { CohereClient } from 'cohere-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  provider: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

interface EmbeddingBatch {
  texts: string[];
  metadata: Record<string, any>[];
  ids: string[];
}

interface ContextualEmbedding {
  content: string;
  contentType: 'scholarship' | 'roadmap' | 'chat' | 'user_profile' | 'knowledge';
  metadata: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export class EnhancedEmbeddingService {
  private openai: OpenAI;
  private cohere: CohereClient;
  private gemini: GoogleGenerativeAI;
  private supabase: SupabaseClient;
  private db: FirebaseFirestore.Firestore;
  
  // Embedding providers configuration
  private readonly providers = {
    openai: {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      maxTokens: 8191,
      costPer1kTokens: 0.00002
    },
    cohere: {
      model: 'embed-english-light-v3.0',
      dimensions: 1024,
      maxTokens: 512,
      costPer1kTokens: 0.0001
    },
    gemini: {
      model: 'embedding-001',
      dimensions: 768,
      maxTokens: 2048,
      costPer1kTokens: 0.0000125
    }
  };

  // Cache for frequent embeddings
  private embeddingCache = new Map<string, EmbeddingResult>();
  private readonly cacheMaxSize = 1000;

  constructor() {
    // Initialize AI providers
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.cohere = new CohereClient({
      token: process.env.COHERE_API_KEY || ''
    });

    this.gemini = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || ''
    );

    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    this.db = admin.firestore();
  }

  /**
   * Generate embeddings with intelligent provider selection and fallback
   */
  async generateEmbedding(
    text: string, 
    preferredProvider: 'openai' | 'cohere' | 'gemini' = 'openai',
    options: {
      useCache?: boolean;
      userId?: string;
      contentType?: string;
    } = {}
  ): Promise<EmbeddingResult> {
    const { useCache = true, userId, contentType } = options;

    // Check cache first
    if (useCache) {
      const cacheKey = this.getCacheKey(text, preferredProvider);
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for ${contentType || 'content'} embedding`);
        return cached;
      }
    }

    // Clean and prepare text
    const cleanText = this.preprocessText(text);
    if (!cleanText.trim()) {
      throw new Error('Text is empty after preprocessing');
    }

    // Try providers in order with intelligent fallback
    const providers = this.getProviderOrder(preferredProvider, cleanText.length);
    
    for (const provider of providers) {
      try {
        const result = await this.generateWithProvider(cleanText, provider);
        
        // Cache successful result
        if (useCache) {
          this.cacheEmbedding(cleanText, preferredProvider, result);
        }

        // Log usage for analytics
        await this.logEmbeddingUsage(provider, result, userId, contentType);

        return result;
      } catch (error) {
        console.warn(`Embedding failed with ${provider}:`, error);
        continue;
      }
    }

    throw new Error('All embedding providers failed');
  }

  /**
   * Generate embeddings in batches for efficiency
   */
  async generateBatchEmbeddings(
    batch: EmbeddingBatch,
    preferredProvider: 'openai' | 'cohere' | 'gemini' = 'openai'
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const batchSize = this.getBatchSize(preferredProvider);

    // Process in smaller chunks to avoid rate limits
    for (let i = 0; i < batch.texts.length; i += batchSize) {
      const chunk = batch.texts.slice(i, i + batchSize);
      const chunkMetadata = batch.metadata.slice(i, i + batchSize);
      
      try {
        const chunkResults = await Promise.all(
          chunk.map((text, index) => 
            this.generateEmbedding(text, preferredProvider, {
              useCache: true,
              contentType: chunkMetadata[index]?.contentType
            })
          )
        );
        
        results.push(...chunkResults);
        
        // Rate limiting delay
        if (i + batchSize < batch.texts.length) {
          await this.delay(this.getRateLimitDelay(preferredProvider));
        }
      } catch (error) {
        console.error(`Batch embedding failed for chunk ${i}-${i + batchSize}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Generate contextual embeddings with enhanced metadata
   */
  async generateContextualEmbedding(
    context: ContextualEmbedding
  ): Promise<EmbeddingResult & { contextHash: string; metadata: Record<string, any> }> {
    // Enhanced text preparation based on content type
    const enhancedText = this.enhanceTextForContext(context);
    
    // Generate embedding
    const embedding = await this.generateEmbedding(
      enhancedText,
      this.getOptimalProvider(context.contentType),
      {
        useCache: true,
        userId: context.userId,
        contentType: context.contentType
      }
    );

    // Generate content hash for change detection
    const contextHash = this.generateContentHash(enhancedText);

    return {
      ...embedding,
      contextHash,
      metadata: {
        ...context.metadata,
        originalLength: context.content.length,
        enhancedLength: enhancedText.length,
        contentType: context.contentType,
        processingTimestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Store embeddings in Supabase with proper metadata
   */
  async storeEmbedding(
    tableName: string,
    data: {
      id: string;
      embedding: number[];
      metadata: Record<string, any>;
      contentHash?: string;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from(tableName)
      .upsert({
        ...data,
        embedding_model: data.metadata.model || 'text-embedding-3-small',
        last_updated: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`);
    }
  }

  /**
   * Batch store embeddings for efficiency
   */
  async storeBatchEmbeddings(
    tableName: string,
    embeddings: Array<{
      id: string;
      embedding: number[];
      metadata: Record<string, any>;
      contentHash?: string;
    }>
  ): Promise<void> {
    const batchSize = 100; // Supabase batch limit
    
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize).map(item => ({
        ...item,
        embedding_model: item.metadata.model || 'text-embedding-3-small',
        last_updated: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from(tableName)
        .upsert(batch);

      if (error) {
        throw new Error(`Failed to store batch embeddings: ${error.message}`);
      }
    }
  }

  /**
   * Update user context embeddings
   */
  async updateUserContextEmbedding(userId: string): Promise<void> {
    try {
      // Fetch user data from Firestore
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data()!;
      
      // Build comprehensive user context
      const profileContext = this.buildUserProfileContext(userData);
      const activityContext = await this.buildUserActivityContext(userId);
      const goalContext = await this.buildUserGoalContext(userId);

      // Generate embeddings for each context type
      const [profileEmbedding, activityEmbedding, goalEmbedding] = await Promise.all([
        this.generateEmbedding(profileContext, 'openai', { 
          userId, 
          contentType: 'user_profile' 
        }),
        activityContext ? this.generateEmbedding(activityContext, 'openai', { 
          userId, 
          contentType: 'user_activity' 
        }) : null,
        goalContext ? this.generateEmbedding(goalContext, 'openai', { 
          userId, 
          contentType: 'user_goals' 
        }) : null
      ]);

      // Store in Supabase
      await this.supabase
        .from('user_context_embeddings')
        .upsert({
          user_id: userId,
          profile_embedding: profileEmbedding.embedding,
          activity_embedding: activityEmbedding?.embedding || null,
          goal_embedding: goalEmbedding?.embedding || null,
          learning_style: userData.preferences?.learningStyle || 'mixed',
          career_stage: this.determineCareerStage(userData),
          skill_level: this.determineSkillLevel(userData),
          context_metadata: {
            profileTokens: profileEmbedding.usage?.totalTokens || 0,
            lastUpdated: new Date().toISOString(),
            dataVersion: '2.0'
          },
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log(`Updated context embeddings for user ${userId}`);
    } catch (error) {
      console.error(`Failed to update user context embedding for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process chat message and store embedding
   */
  async processChatMessage(
    userId: string,
    sessionId: string,
    messageId: string,
    messageText: string,
    messageType: 'user' | 'assistant',
    messageIntent?: string
  ): Promise<void> {
    try {
      // Generate embedding for the message
      const embedding = await this.generateEmbedding(
        messageText,
        'openai',
        {
          userId,
          contentType: 'chat'
        }
      );

      // Extract entities and analyze sentiment
      const entities = await this.extractEntities(messageText);
      const sentiment = await this.analyzeSentiment(messageText);

      // Store in Supabase
      await this.supabase
        .from('chat_history_embeddings')
        .insert({
          user_id: userId,
          session_id: sessionId,
          message_id: messageId,
          message_text: messageText,
          message_type: messageType,
          embedding: embedding.embedding,
          message_intent: messageIntent,
          context_entities: entities,
          sentiment_score: sentiment,
          created_at: new Date().toISOString()
        });

      // Update session message count
      await this.updateSessionMetrics(sessionId);

    } catch (error) {
      console.error(`Failed to process chat message ${messageId}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async generateWithProvider(
    text: string, 
    provider: 'openai' | 'cohere' | 'gemini'
  ): Promise<EmbeddingResult> {
    switch (provider) {
      case 'openai':
        return await this.generateOpenAIEmbedding(text);
      case 'cohere':
        return await this.generateCohereEmbedding(text);
      case 'gemini':
        return await this.generateGeminiEmbedding(text);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await this.openai.embeddings.create({
      model: this.providers.openai.model,
      input: text,
      dimensions: this.providers.openai.dimensions
    });

    return {
      embedding: response.data[0].embedding,
      model: this.providers.openai.model,
      dimensions: this.providers.openai.dimensions,
      provider: 'openai',
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens
      }
    };
  }

  private async generateCohereEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await this.cohere.embed({
      texts: [text],
      model: this.providers.cohere.model,
      inputType: 'search_document'
    });

    return {
      embedding: response.embeddings[0],
      model: this.providers.cohere.model,
      dimensions: this.providers.cohere.dimensions,
      provider: 'cohere',
      usage: {
        promptTokens: 0, // Cohere doesn't provide token usage
        totalTokens: 0
      }
    };
  }

  private async generateGeminiEmbedding(text: string): Promise<EmbeddingResult> {
    const model = this.gemini.getGenerativeModel({ 
      model: 'embedding-001' 
    });

    const result = await model.embedContent(text);
    
    return {
      embedding: result.embedding.values,
      model: this.providers.gemini.model,
      dimensions: this.providers.gemini.dimensions,
      provider: 'gemini',
      usage: {
        promptTokens: 0, // Gemini doesn't provide detailed usage
        totalTokens: 0
      }
    };
  }

  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?;:()"']/g, '') // Remove special chars
      .trim()
      .substring(0, 8000); // Limit length
  }

  private enhanceTextForContext(context: ContextualEmbedding): string {
    const { content, contentType, metadata } = context;
    
    switch (contentType) {
      case 'scholarship':
        return `Scholarship: ${metadata.title || ''}\n${content}\nProvider: ${metadata.provider || ''}\nCategory: ${metadata.category || ''}`;
      
      case 'roadmap':
        return `Learning Roadmap: ${metadata.title || ''}\n${content}\nSkills: ${metadata.skills?.join(', ') || ''}\nDifficulty: ${metadata.difficulty || ''}`;
      
      case 'chat':
        return `Chat message: ${content}`;
      
      case 'user_profile':
        return `User profile: ${content}`;
      
      default:
        return content;
    }
  }

  private buildUserProfileContext(userData: any): string {
    const preferences = userData.preferences || {};
    return `
      Education Level: ${preferences.educationLevel || 'Not specified'}
      Career Interests: ${preferences.careerInterests?.join(', ') || 'Not specified'}
      Learning Style: ${preferences.learningStyle || 'Not specified'}
      Current Skills: ${preferences.currentSkills?.join(', ') || 'Not specified'}
      Career Goals: ${preferences.careerGoals?.join(', ') || 'Not specified'}
      Time Availability: ${preferences.timeAvailability || 'Not specified'}
      Location Preferences: ${preferences.preferredLocations?.join(', ') || 'Not specified'}
      Age: ${userData.age || 'Not specified'}
    `.trim();
  }

  private async buildUserActivityContext(userId: string): Promise<string | null> {
    try {
      const recentActivity = await this.db
        .collection('userActivity')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      if (recentActivity.empty) return null;

      const activities = recentActivity.docs.map(doc => {
        const data = doc.data();
        return `${data.action}: ${data.details || data.target}`;
      });

      return `Recent activity: ${activities.join('; ')}`;
    } catch (error) {
      console.warn(`Failed to build activity context for ${userId}:`, error);
      return null;
    }
  }

  private async buildUserGoalContext(userId: string): Promise<string | null> {
    try {
      const goals = await this.db
        .collection('goals')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      if (goals.empty) return null;

      const goalTexts = goals.docs.map(doc => {
        const data = doc.data();
        return `${data.title}: ${data.description || ''}`;
      });

      return `Current goals: ${goalTexts.join('; ')}`;
    } catch (error) {
      console.warn(`Failed to build goal context for ${userId}:`, error);
      return null;
    }
  }

  private getCacheKey(text: string, provider: string): string {
    return crypto
      .createHash('md5')
      .update(`${provider}:${text}`)
      .digest('hex');
  }

  private cacheEmbedding(
    text: string, 
    provider: string, 
    result: EmbeddingResult
  ): void {
    if (this.embeddingCache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }

    const cacheKey = this.getCacheKey(text, provider);
    this.embeddingCache.set(cacheKey, result);
  }

  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getProviderOrder(
    preferred: string, 
    textLength: number
  ): ('openai' | 'cohere' | 'gemini')[] {
    // Optimize provider selection based on text length and cost
    if (textLength > 4000) {
      return ['openai', 'gemini', 'cohere'];
    } else if (textLength > 1000) {
      return [preferred as any, 'openai', 'cohere', 'gemini'].filter((v, i, a) => a.indexOf(v) === i);
    } else {
      return ['cohere', 'openai', 'gemini'];
    }
  }

  private getOptimalProvider(contentType: string): 'openai' | 'cohere' | 'gemini' {
    switch (contentType) {
      case 'scholarship':
      case 'roadmap':
        return 'openai'; // Best for long-form content
      case 'chat':
        return 'cohere'; // Fast and cheap for short messages
      case 'user_profile':
        return 'openai'; // Best for complex structured data
      default:
        return 'openai';
    }
  }

  private getBatchSize(provider: string): number {
    switch (provider) {
      case 'openai': return 20;
      case 'cohere': return 50;
      case 'gemini': return 10;
      default: return 10;
    }
  }

  private getRateLimitDelay(provider: string): number {
    switch (provider) {
      case 'openai': return 100; // 10 RPS limit
      case 'cohere': return 50;  // 20 RPS limit
      case 'gemini': return 200; // 5 RPS limit
      default: return 100;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private determineCareerStage(userData: any): string {
    const age = userData.age || 0;
    const education = userData.preferences?.educationLevel || '';
    
    if (age < 20 || education.includes('high school')) return 'student';
    if (age < 25 || education.includes('undergraduate')) return 'early_career';
    if (age < 30) return 'mid_career';
    return 'experienced';
  }

  private determineSkillLevel(userData: any): string {
    const skills = userData.preferences?.currentSkills || [];
    if (skills.length === 0) return 'beginner';
    if (skills.length < 3) return 'intermediate';
    return 'advanced';
  }

  private async extractEntities(text: string): Promise<string[]> {
    // Simple entity extraction - can be enhanced with NLP libraries
    const entities = [];
    
    // Look for scholarship-related terms
    const scholarshipTerms = ['scholarship', 'grant', 'fellowship', 'funding', 'financial aid'];
    const careerTerms = ['career', 'job', 'internship', 'work', 'profession'];
    const skillTerms = ['skill', 'learn', 'study', 'course', 'training'];
    
    const lowerText = text.toLowerCase();
    
    if (scholarshipTerms.some(term => lowerText.includes(term))) {
      entities.push('scholarship');
    }
    if (careerTerms.some(term => lowerText.includes(term))) {
      entities.push('career');
    }
    if (skillTerms.some(term => lowerText.includes(term))) {
      entities.push('skills');
    }
    
    return entities;
  }

  private async analyzeSentiment(text: string): Promise<number> {
    // Simple sentiment analysis - can be enhanced with ML models
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'helpful', 'thank'];
    const negativeWords = ['bad', 'terrible', 'awful', 'confused', 'frustrated', 'difficult'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private async updateSessionMetrics(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_sessions')
      .update({
        message_count: 'message_count + 1',
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (error) {
      console.warn(`Failed to update session metrics: ${error.message}`);
    }
  }

  private async logEmbeddingUsage(
    provider: string,
    result: EmbeddingResult,
    userId?: string,
    contentType?: string
  ): Promise<void> {
    try {
      await this.db.collection('embeddingLogs').add({
        provider,
        model: result.model,
        dimensions: result.dimensions,
        userId: userId || null,
        contentType: contentType || null,
        tokens: result.usage?.totalTokens || 0,
        cost: this.calculateCost(provider, result.usage?.totalTokens || 0),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.warn('Failed to log embedding usage:', error);
    }
  }

  private calculateCost(provider: string, tokens: number): number {
    const config = this.providers[provider as keyof typeof this.providers];
    return (tokens / 1000) * config.costPer1kTokens;
  }
}

export const enhancedEmbeddingService = new EnhancedEmbeddingService();