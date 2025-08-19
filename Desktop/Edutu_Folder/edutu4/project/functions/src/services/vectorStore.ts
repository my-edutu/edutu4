/**
 * Advanced Vector Store Operations for Edutu RAG System
 * Handles all vector database operations with intelligent retrieval strategies
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';
import { enhancedEmbeddingService } from './enhancedEmbeddingService';

interface VectorSearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  relevanceScore?: number;
}

interface ContextRetrievalParams {
  userId: string;
  sessionId?: string;
  query: string;
  queryEmbedding?: number[];
  maxResults?: number;
  similarityThreshold?: number;
  includeHistory?: boolean;
  timeWindow?: number; // hours
}

interface HybridSearchParams {
  query: string;
  queryEmbedding: number[];
  userId: string;
  contentTypes?: string[];
  maxResults?: number;
  semanticWeight?: number;
  contextWeight?: number;
  recencyWeight?: number;
}

export class VectorStore {
  public supabase: SupabaseClient;
  private db: FirebaseFirestore.Firestore;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    this.db = admin.firestore();
  }

  /**
   * Advanced context retrieval for RAG
   * Combines multiple context sources with intelligent ranking
   */
  async retrieveContext(params: ContextRetrievalParams): Promise<{
    scholarships: VectorSearchResult[];
    roadmaps: VectorSearchResult[];
    chatHistory: VectorSearchResult[];
    userContext: Record<string, any>;
    totalTokens: number;
  }> {
    const {
      userId,
      sessionId,
      query,
      queryEmbedding,
      maxResults = 10,
      similarityThreshold = 0.7,
      includeHistory = true,
      timeWindow = 24
    } = params;

    // Generate query embedding if not provided
    const embedding = queryEmbedding || (await enhancedEmbeddingService.generateEmbedding(
      query,
      'openai',
      { userId, contentType: 'query' }
    )).embedding;

    // Parallel retrieval of different context types
    const [scholarships, roadmaps, chatHistory, userContext] = await Promise.all([
      this.searchScholarships(embedding, userId, maxResults, similarityThreshold),
      this.searchRoadmaps(embedding, userId, maxResults, similarityThreshold),
      includeHistory ? this.searchChatHistory(
        userId, sessionId, embedding, maxResults, timeWindow
      ) : [],
      this.getUserContext(userId)
    ]);

    // Calculate total tokens for context management
    const totalTokens = this.estimateTokenCount([
      ...scholarships.map(s => s.content),
      ...roadmaps.map(r => r.content),
      ...chatHistory.map(c => c.content)
    ]);

    return {
      scholarships,
      roadmaps,
      chatHistory,
      userContext,
      totalTokens
    };
  }

  /**
   * Hybrid search combining semantic similarity with contextual relevance
   */
  async hybridSearch(params: HybridSearchParams): Promise<VectorSearchResult[]> {
    const {
      query,
      queryEmbedding,
      userId,
      contentTypes = ['scholarships', 'roadmaps'],
      maxResults = 15,
      semanticWeight = 0.4,
      contextWeight = 0.4,
      recencyWeight = 0.2
    } = params;

    const results: VectorSearchResult[] = [];

    // Search across different content types
    for (const contentType of contentTypes) {
      let searchResults: VectorSearchResult[] = [];

      switch (contentType) {
        case 'scholarships':
          searchResults = await this.searchScholarshipsAdvanced(
            queryEmbedding, userId, maxResults, 0.6
          );
          break;
        
        case 'roadmaps':
          searchResults = await this.searchRoadmapsAdvanced(
            queryEmbedding, userId, maxResults, 0.6
          );
          break;
        
        case 'knowledge':
          searchResults = await this.searchKnowledgeEntities(
            queryEmbedding, maxResults, 0.6
          );
          break;
      }

      // Calculate hybrid scores
      searchResults.forEach(result => {
        result.relevanceScore = this.calculateHybridScore(
          result,
          { semanticWeight, contextWeight, recencyWeight }
        );
      });

      results.push(...searchResults);
    }

    // Sort by relevance score and return top results
    return results
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, maxResults);
  }

  /**
   * Search scholarships with contextual ranking
   */
  private async searchScholarships(
    queryEmbedding: number[],
    userId: string,
    limit: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    const { data, error } = await this.supabase.rpc(
      'match_contextual_scholarships',
      {
        query_embedding: queryEmbedding,
        user_id_param: userId,
        match_threshold: threshold,
        match_count: limit,
        recency_boost: 0.1
      }
    );

    if (error) {
      console.error('Scholarship search error:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.scholarship_id,
      content: `${item.title}\n\n${item.summary}`,
      metadata: {
        title: item.title,
        category: item.category,
        provider: item.provider,
        type: 'scholarship'
      },
      similarity: item.similarity,
      relevanceScore: item.final_score
    }));
  }

  /**
   * Advanced scholarship search with user preferences
   */
  private async searchScholarshipsAdvanced(
    queryEmbedding: number[],
    userId: string,
    limit: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    // Get user skills for matching
    const userSkills = await this.getUserSkills(userId);

    const { data, error } = await this.supabase.rpc(
      'match_contextual_scholarships',
      {
        query_embedding: queryEmbedding,
        user_id_param: userId,
        match_threshold: threshold,
        match_count: limit,
        recency_boost: 0.15
      }
    );

    if (error) {
      console.error('Advanced scholarship search error:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.scholarship_id,
      content: this.formatScholarshipContent(item),
      metadata: {
        title: item.title,
        category: item.category,
        provider: item.provider,
        type: 'scholarship',
        contextScore: item.context_score
      },
      similarity: item.similarity,
      relevanceScore: item.final_score
    }));
  }

  /**
   * Search roadmaps with skill matching
   */
  private async searchRoadmaps(
    queryEmbedding: number[],
    userId: string,
    limit: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    const userSkills = await this.getUserSkills(userId);

    const { data, error } = await this.supabase.rpc(
      'match_relevant_roadmaps',
      {
        query_embedding: queryEmbedding,
        user_skills: userSkills,
        difficulty_preference: 'any',
        match_threshold: threshold,
        match_count: limit
      }
    );

    if (error) {
      console.error('Roadmap search error:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.roadmap_id,
      content: `${item.title}\n\n${item.description}`,
      metadata: {
        title: item.title,
        skills: item.skills_involved,
        difficulty: item.difficulty_level,
        duration: item.estimated_duration,
        type: 'roadmap'
      },
      similarity: item.similarity,
      relevanceScore: item.skill_match_score
    }));
  }

  /**
   * Advanced roadmap search with personalized matching
   */
  private async searchRoadmapsAdvanced(
    queryEmbedding: number[],
    userId: string,
    limit: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    const [userSkills, userLevel] = await Promise.all([
      this.getUserSkills(userId),
      this.getUserSkillLevel(userId)
    ]);

    const difficultyPreference = this.mapSkillLevelToDifficulty(userLevel);

    const { data, error } = await this.supabase.rpc(
      'match_relevant_roadmaps',
      {
        query_embedding: queryEmbedding,
        user_skills: userSkills,
        difficulty_preference: difficultyPreference,
        match_threshold: threshold,
        match_count: limit
      }
    );

    if (error) {
      console.error('Advanced roadmap search error:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.roadmap_id,
      content: this.formatRoadmapContent(item),
      metadata: {
        title: item.title,
        skills: item.skills_involved,
        difficulty: item.difficulty_level,
        duration: item.estimated_duration,
        type: 'roadmap',
        skillMatch: item.skill_match_score
      },
      similarity: item.similarity,
      relevanceScore: item.similarity * 0.7 + item.skill_match_score * 0.3
    }));
  }

  /**
   * Search chat history for context
   */
  private async searchChatHistory(
    userId: string,
    sessionId: string | undefined,
    queryEmbedding: number[],
    limit: number,
    timeWindowHours: number
  ): Promise<VectorSearchResult[]> {
    // Get recent conversation context
    const { data: contextData, error: contextError } = await this.supabase.rpc(
      'get_conversation_context',
      {
        user_id_param: userId,
        session_id_param: sessionId,
        context_limit: limit,
        similarity_threshold: 0.75
      }
    );

    if (contextError) {
      console.error('Chat history search error:', contextError);
      return [];
    }

    // If we have query embedding, also do semantic search
    let semanticResults: any[] = [];
    if (queryEmbedding.length > 0) {
      const timeThreshold = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
      
      const { data: semanticData, error: semanticError } = await this.supabase
        .from('chat_history_embeddings')
        .select('message_id, message_text, message_type, message_intent, created_at')
        .eq('user_id', userId)
        .gte('created_at', timeThreshold.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!semanticError && semanticData) {
        // Calculate similarities (this would be more efficient with a proper vector search function)
        semanticResults = semanticData.map(item => ({
          ...item,
          similarity: 0.8 // Placeholder - would calculate actual similarity
        }));
      }
    }

    // Combine and format results
    const allResults = [...contextData, ...semanticResults];
    const uniqueResults = this.deduplicateById(allResults, 'message_id');

    return uniqueResults.map((item: any) => ({
      id: item.message_id,
      content: item.message_text,
      metadata: {
        type: 'chat_history',
        messageType: item.message_type,
        intent: item.message_intent,
        timestamp: item.created_at
      },
      similarity: item.similarity || item.relevance_score || 0.8,
      relevanceScore: item.relevance_score || 0.8
    })).slice(0, limit);
  }

  /**
   * Search knowledge entities
   */
  private async searchKnowledgeEntities(
    queryEmbedding: number[],
    limit: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    const { data, error } = await this.supabase
      .from('knowledge_entities')
      .select('*')
      .order('popularity_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Knowledge entities search error:', error);
      return [];
    }

    // Calculate similarities and filter
    const results = data
      .map(item => ({
        id: item.entity_id,
        content: `${item.entity_name}: ${item.entity_description || ''}`,
        metadata: {
          name: item.entity_name,
          type: item.entity_type,
          popularity: item.popularity_score,
          relatedEntities: item.related_entities
        },
        similarity: 0.8, // Placeholder - would calculate actual similarity
        relevanceScore: item.popularity_score * 0.3 + 0.7 // Combine with similarity
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return results;
  }

  /**
   * Get comprehensive user context
   */
  public async getUserContext(userId: string): Promise<Record<string, any>> {
    try {
      // Get user profile from Firestore
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      // Get user context embeddings from Supabase
      const { data: contextData } = await this.supabase
        .from('user_context_embeddings')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get recent goals
      const recentGoals = await this.db
        .collection('goals')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(5)
        .get();

      const goals = recentGoals.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        profile: userData?.preferences || {},
        demographics: {
          age: userData?.age,
          educationLevel: userData?.preferences?.educationLevel
        },
        context: contextData?.context_metadata || {},
        learningStyle: contextData?.learning_style || 'mixed',
        careerStage: contextData?.career_stage || 'student',
        skillLevel: contextData?.skill_level || 'beginner',
        activeGoals: goals,
        lastActivity: contextData?.last_activity
      };
    } catch (error) {
      console.error(`Failed to get user context for ${userId}:`, error);
      return {};
    }
  }

  /**
   * Store chat message embedding
   */
  async storeChatMessage(
    userId: string,
    sessionId: string,
    messageId: string,
    messageText: string,
    messageType: 'user' | 'assistant',
    messageIntent?: string
  ): Promise<void> {
    await enhancedEmbeddingService.processChatMessage(
      userId,
      sessionId,
      messageId,
      messageText,
      messageType,
      messageIntent
    );
  }

  /**
   * Create or update conversation session
   */
  async upsertConversationSession(
    sessionId: string,
    userId: string,
    sessionTitle?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_sessions')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        session_title: sessionTitle,
        is_active: true,
        started_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to upsert conversation session:', error);
      throw error;
    }
  }

  /**
   * End conversation session with summary
   */
  async endConversationSession(
    sessionId: string,
    summary?: string,
    keyTopics?: string[],
    sentimentTrend?: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        session_summary: summary,
        key_topics: keyTopics,
        sentiment_trend: sentimentTrend
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Failed to end conversation session:', error);
      throw error;
    }
  }

  /**
   * Store scholarship embedding
   */
  async storeScholarshipEmbedding(
    scholarshipId: string,
    title: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const embeddingResult = await enhancedEmbeddingService.generateContextualEmbedding({
      content: `${title}\n\n${content}`,
      contentType: 'scholarship',
      metadata: { ...metadata, title }
    });

    await this.supabase
      .from('scholarships_embeddings')
      .upsert({
        scholarship_id: scholarshipId,
        title,
        summary: content,
        category: metadata.category || 'General',
        provider: metadata.provider || 'Unknown',
        embedding: embeddingResult.embedding,
        content_hash: embeddingResult.contextHash,
        embedding_model: embeddingResult.model,
        metadata: embeddingResult.metadata,
        last_updated: new Date().toISOString()
      });
  }

  /**
   * Store roadmap embedding
   */
  async storeRoadmapEmbedding(
    roadmapId: string,
    title: string,
    description: string,
    phases: any[],
    metadata: Record<string, any>
  ): Promise<void> {
    const phaseContent = phases
      .map(phase => `${phase.phase}: ${phase.tasks?.join(', ') || ''}`)
      .join('\n');

    const fullContent = `${title}\n\n${description}\n\nPhases:\n${phaseContent}`;

    const embeddingResult = await enhancedEmbeddingService.generateContextualEmbedding({
      content: fullContent,
      contentType: 'roadmap',
      metadata: { ...metadata, title, description }
    });

    await this.supabase
      .from('roadmap_embeddings')
      .upsert({
        roadmap_id: roadmapId,
        title,
        description,
        phase_content: phaseContent,
        skills_involved: metadata.skills || [],
        difficulty_level: metadata.difficulty || 'intermediate',
        estimated_duration: metadata.duration || '6 weeks',
        embedding: embeddingResult.embedding,
        content_hash: embeddingResult.contextHash,
        embedding_model: embeddingResult.model,
        last_updated: new Date().toISOString()
      });
  }

  // Helper methods

  private calculateHybridScore(
    result: VectorSearchResult,
    weights: { semanticWeight: number; contextWeight: number; recencyWeight: number }
  ): number {
    const semantic = result.similarity || 0;
    const context = result.metadata?.contextScore || 0;
    const recency = this.calculateRecencyScore(result.metadata?.timestamp);

    return (
      semantic * weights.semanticWeight +
      context * weights.contextWeight +
      recency * weights.recencyWeight
    );
  }

  private calculateRecencyScore(timestamp?: string): number {
    if (!timestamp) return 0;
    
    const age = Date.now() - new Date(timestamp).getTime();
    const ageInHours = age / (1000 * 60 * 60);
    
    // Exponential decay: newer content gets higher scores
    return Math.exp(-ageInHours / 24); // Half-life of 24 hours
  }

  private async getUserSkills(userId: string): Promise<string[]> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      return userData?.preferences?.currentSkills || [];
    } catch (error) {
      console.error(`Failed to get user skills for ${userId}:`, error);
      return [];
    }
  }

  private async getUserSkillLevel(userId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('user_context_embeddings')
        .select('skill_level')
        .eq('user_id', userId)
        .single();
      
      return data?.skill_level || 'beginner';
    } catch (error) {
      return 'beginner';
    }
  }

  private mapSkillLevelToDifficulty(skillLevel: string): string {
    switch (skillLevel) {
      case 'beginner': return 'easy';
      case 'intermediate': return 'medium';
      case 'advanced': return 'hard';
      default: return 'any';
    }
  }

  private formatScholarshipContent(item: any): string {
    return `${item.title}

Provider: ${item.provider}
Category: ${item.category}

${item.summary}

This scholarship has a ${item.context_score > 0.8 ? 'high' : 'moderate'} relevance match to your profile.`;
  }

  private formatRoadmapContent(item: any): string {
    return `${item.title}

Duration: ${item.estimated_duration}
Difficulty: ${item.difficulty_level}
Skills: ${item.skills_involved?.join(', ')}

${item.description}

This roadmap has a ${item.skill_match_score > 0.7 ? 'strong' : 'moderate'} skill match for your current level.`;
  }

  private deduplicateById<T extends Record<string, any>>(
    items: T[],
    idField: string
  ): T[] {
    const seen = new Set();
    return items.filter(item => {
      const id = item[idField];
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private estimateTokenCount(texts: string[]): number {
    // Rough estimation: ~4 characters per token
    return texts.reduce((total, text) => total + Math.ceil(text.length / 4), 0);
  }

  /**
   * Get vector database statistics
   */
  async getVectorStats(): Promise<Record<string, any>> {
    const { data, error } = await this.supabase
      .from('rag_performance_stats')
      .select('*');

    if (error) {
      console.error('Failed to get vector stats:', error);
      return {};
    }

    return data.reduce((acc, row) => {
      acc[row.table_name] = {
        totalRecords: row.total_records,
        uniqueUsers: row.unique_users,
        avgAge: row.avg_age_days
      };
      return acc;
    }, {});
  }
}

export const vectorStore = new VectorStore();