// Adaptive Recommendation Service with Continuous Learning

import { supabase, vectorOperations, SUPABASE_TABLES } from '../config/supabase';
import { userActivityService } from './userActivityService';
import { fetchOpportunities } from './opportunitiesService';
import { 
  Opportunity,
  UserProfile 
} from '../types/common';
import {
  OpportunityEmbedding,
  UserPreferenceEmbedding,
  RecommendationScore,
  UserEngagementMetrics
} from '../types/userActivity';

class AdaptiveRecommendationService {
  private embeddingDimensions = 384; // Standard embedding size
  private recommendationCache = new Map<string, RecommendationScore[]>();
  private cacheExpiry = 1000 * 60 * 60 * 2; // 2 hours

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string, 
    limit: number = 20,
    filters: {
      category?: string;
      difficulty?: string;
      location?: string;
    } = {}
  ): Promise<Opportunity[]> {
    try {
      // Check cache first
      const cacheKey = `${userId}_${JSON.stringify(filters)}`;
      const cached = this.recommendationCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached[0]?.lastCalculated)) {
        return this.getOpportunitiesByIds(cached.slice(0, limit).map(r => r.opportunityId));
      }

      // Get or create user preference embedding
      let userEmbedding = await this.getUserPreferenceEmbedding(userId);
      if (!userEmbedding) {
        userEmbedding = await this.createUserPreferenceEmbedding(userId);
      }

      // Get all opportunity embeddings
      const opportunityEmbeddings = await this.getOpportunityEmbeddings(filters);

      // Calculate recommendation scores
      const recommendations = await this.calculateRecommendationScores(
        userEmbedding,
        opportunityEmbeddings,
        userId
      );

      // Sort by score and cache
      recommendations.sort((a, b) => b.score - a.score);
      this.recommendationCache.set(cacheKey, recommendations);

      // Return top opportunities
      const topOpportunityIds = recommendations.slice(0, limit).map(r => r.opportunityId);
      return this.getOpportunitiesByIds(topOpportunityIds);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      // Fallback to basic recommendations
      return fetchOpportunities(limit, filters);
    }
  }

  /**
   * Update user preferences based on recent activity
   */
  async updateUserPreferences(userId: string): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const engagementMetrics = await userActivityService.getUserEngagementMetrics(
        userId, 
        'monthly',
        thirtyDaysAgo, 
        new Date()
      );

      if (!engagementMetrics) return;

      // Generate new preference vector based on recent activity
      const preferencesVector = await this.generatePreferencesVector(engagementMetrics);
      const interactionVector = await this.generateInteractionVector(engagementMetrics);
      const successVector = await this.generateSuccessVector(engagementMetrics);

      // Update or create user preference embedding
      await this.upsertUserPreferenceEmbedding(userId, {
        preferencesVector,
        interactionVector,
        successVector,
        metadata: {
          lastUpdated: new Date(),
          totalInteractions: engagementMetrics.opportunitiesClicked + engagementMetrics.opportunitiesSaved,
          completedApplications: engagementMetrics.opportunitiesAppliedTo,
          averageEngagement: this.calculateAverageEngagement(engagementMetrics)
        }
      });

      // Clear recommendation cache for this user
      this.clearUserCache(userId);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  /**
   * Process opportunity for embeddings storage
   */
  async processOpportunityEmbedding(opportunity: Opportunity): Promise<void> {
    try {
      if (!supabase) return;

      // Create text for embedding
      const text = `${opportunity.title} ${opportunity.description} ${opportunity.category} ${opportunity.requirements.join(' ')} ${opportunity.benefits.join(' ')}`;
      
      // Generate embedding
      const embedding = vectorOperations.createTextEmbedding(text, this.embeddingDimensions);

      // Store in Supabase
      await supabase
        .from(SUPABASE_TABLES.OPPORTUNITY_EMBEDDINGS)
        .upsert({
          opportunity_id: opportunity.id,
          title: opportunity.title,
          category: opportunity.category,
          description: opportunity.description,
          embedding: embedding,
          metadata: {
            provider: opportunity.organization,
            tags: opportunity.skills || [],
            difficulty: opportunity.difficulty,
            location: opportunity.location,
            created_at: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Error processing opportunity embedding:', error);
    }
  }

  /**
   * Batch update recommendations (called by learning pipeline)
   */
  async batchUpdateRecommendations(userIds: string[]): Promise<void> {
    try {
      console.log(`Starting batch update for ${userIds.length} users`);

      for (const userId of userIds) {
        await this.updateUserPreferences(userId);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('Batch update completed');
    } catch (error) {
      console.error('Error in batch update:', error);
    }
  }

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRecommendations: number;
    clickThroughRate: number;
    saveRate: number;
    applicationRate: number;
    averageEngagementTime: number;
  }> {
    try {
      // This would typically query activity data to calculate performance
      // For now, return mock data
      return {
        totalRecommendations: 1000,
        clickThroughRate: 0.15,
        saveRate: 0.08,
        applicationRate: 0.03,
        averageEngagementTime: 45 // seconds
      };
    } catch (error) {
      console.error('Error getting recommendation performance:', error);
      return {
        totalRecommendations: 0,
        clickThroughRate: 0,
        saveRate: 0,
        applicationRate: 0,
        averageEngagementTime: 0
      };
    }
  }

  /**
   * Private Methods
   */

  private async getUserPreferenceEmbedding(userId: string): Promise<UserPreferenceEmbedding | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.USER_PREFERENCE_EMBEDDINGS)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        preferencesVector: data.preferences_vector,
        interactionVector: data.interaction_vector,
        successVector: data.success_vector,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error fetching user preference embedding:', error);
      return null;
    }
  }

  private async createUserPreferenceEmbedding(userId: string): Promise<UserPreferenceEmbedding> {
    // Create default preference embedding based on basic user data
    const defaultPreferencesVector = new Array(this.embeddingDimensions).fill(0.1);
    const defaultInteractionVector = new Array(this.embeddingDimensions).fill(0);
    
    const embedding: Omit<UserPreferenceEmbedding, 'id'> = {
      userId,
      preferencesVector: defaultPreferencesVector,
      interactionVector: defaultInteractionVector,
      metadata: {
        lastUpdated: new Date(),
        totalInteractions: 0,
        completedApplications: 0,
        averageEngagement: 0
      }
    };

    await this.upsertUserPreferenceEmbedding(userId, embedding);
    
    return {
      id: userId,
      ...embedding
    };
  }

  private async upsertUserPreferenceEmbedding(
    userId: string, 
    embedding: Omit<UserPreferenceEmbedding, 'id'>
  ): Promise<void> {
    if (!supabase) return;

    try {
      await supabase
        .from(SUPABASE_TABLES.USER_PREFERENCE_EMBEDDINGS)
        .upsert({
          user_id: userId,
          preferences_vector: embedding.preferencesVector,
          interaction_vector: embedding.interactionVector,
          success_vector: embedding.successVector,
          metadata: embedding.metadata
        });
    } catch (error) {
      console.error('Error upserting user preference embedding:', error);
    }
  }

  private async getOpportunityEmbeddings(filters: any = {}): Promise<OpportunityEmbedding[]> {
    if (!supabase) return [];

    try {
      let query = supabase
        .from(SUPABASE_TABLES.OPPORTUNITY_EMBEDDINGS)
        .select('*');

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('Error fetching opportunity embeddings:', error);
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        opportunityId: item.opportunity_id,
        title: item.title,
        category: item.category,
        description: item.description,
        embedding: item.embedding,
        metadata: item.metadata
      }));
    } catch (error) {
      console.error('Error fetching opportunity embeddings:', error);
      return [];
    }
  }

  private async calculateRecommendationScores(
    userEmbedding: UserPreferenceEmbedding,
    opportunityEmbeddings: OpportunityEmbedding[],
    userId: string
  ): Promise<RecommendationScore[]> {
    const scores: RecommendationScore[] = [];

    for (const oppEmbedding of opportunityEmbeddings) {
      // Calculate preference similarity
      const preferenceMatch = vectorOperations.cosineSimilarity(
        userEmbedding.preferencesVector,
        oppEmbedding.embedding
      );

      // Calculate behavior similarity (how user interacts with similar content)
      const behaviorMatch = userEmbedding.interactionVector ? 
        vectorOperations.cosineSimilarity(
          userEmbedding.interactionVector,
          oppEmbedding.embedding
        ) : 0;

      // Calculate success similarity (opportunities that led to applications)
      const successMatch = userEmbedding.successVector ?
        vectorOperations.cosineSimilarity(
          userEmbedding.successVector,
          oppEmbedding.embedding
        ) : 0;

      // Recency boost for newer opportunities
      const opportunityAge = Date.now() - new Date(oppEmbedding.metadata.createdAt).getTime();
      const daysSinceCreated = opportunityAge / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 1 - (daysSinceCreated / 30)); // Boost decreases over 30 days

      // Popularity boost (would be calculated from interaction data)
      const popularityBoost = 0.1; // Placeholder

      // Combine factors with weights
      const totalScore = 
        preferenceMatch * 0.4 +
        behaviorMatch * 0.3 +
        successMatch * 0.2 +
        recencyBoost * 0.05 +
        popularityBoost * 0.05;

      scores.push({
        opportunityId: oppEmbedding.opportunityId,
        userId,
        score: Math.min(Math.max(totalScore, 0), 1), // Clamp between 0 and 1
        factors: {
          preferenceMatch,
          behaviorMatch,
          successMatch,
          recencyBoost,
          popularityBoost
        },
        lastCalculated: new Date()
      });
    }

    return scores;
  }

  private async getOpportunitiesByIds(opportunityIds: string[]): Promise<Opportunity[]> {
    try {
      const opportunities = await fetchOpportunities(opportunityIds.length * 2); // Get extra to handle missing IDs
      return opportunities.filter(opp => opportunityIds.includes(opp.id));
    } catch (error) {
      console.error('Error fetching opportunities by IDs:', error);
      return [];
    }
  }

  private generatePreferencesVector(metrics: UserEngagementMetrics): number[] {
    // Convert user preferences to vector representation
    const vector = new Array(this.embeddingDimensions).fill(0);
    
    // Use preferred categories to influence the vector
    metrics.preferredCategories.forEach((category, index) => {
      const weight = 1 / (index + 1); // Decrease weight for lower-ranked categories
      const categoryHash = this.hashString(category) % this.embeddingDimensions;
      vector[categoryHash] += weight;
    });

    // Add engagement patterns
    const engagementScore = metrics.clickThroughRate + (metrics.averageSessionDuration / 100);
    for (let i = 0; i < 10; i++) {
      vector[i] += engagementScore * 0.1;
    }

    return vectorOperations.normalizeVector(vector);
  }

  private generateInteractionVector(metrics: UserEngagementMetrics): number[] {
    const vector = new Array(this.embeddingDimensions).fill(0);
    
    // Encode interaction patterns
    vector[0] = metrics.clickThroughRate;
    vector[1] = metrics.opportunitiesSaved / Math.max(metrics.opportunitiesViewed, 1);
    vector[2] = metrics.opportunitiesAppliedTo / Math.max(metrics.opportunitiesSaved, 1);
    vector[3] = metrics.averageSessionDuration / 60; // Convert to relative minutes
    vector[4] = metrics.learningVelocity;

    // Fill remaining dimensions with derived patterns
    for (let i = 5; i < this.embeddingDimensions; i++) {
      vector[i] = (vector[0] + vector[1] + vector[2]) * Math.random() * 0.1;
    }

    return vectorOperations.normalizeVector(vector);
  }

  private generateSuccessVector(metrics: UserEngagementMetrics): number[] | undefined {
    if (metrics.opportunitiesAppliedTo === 0) return undefined;

    const vector = new Array(this.embeddingDimensions).fill(0);
    
    // Success patterns based on applications and completions
    const applicationRate = metrics.opportunitiesAppliedTo / Math.max(metrics.opportunitiesViewed, 1);
    const taskCompletionRate = metrics.tasksCompleted / Math.max(metrics.tasksCompleted + metrics.tasksDelayed, 1);
    
    vector[0] = applicationRate;
    vector[1] = taskCompletionRate;
    vector[2] = metrics.averageResponseRating / 5; // Normalize to 0-1

    // Fill with success-related patterns
    for (let i = 3; i < this.embeddingDimensions; i++) {
      vector[i] = (applicationRate + taskCompletionRate) * Math.random() * 0.1;
    }

    return vectorOperations.normalizeVector(vector);
  }

  private calculateAverageEngagement(metrics: UserEngagementMetrics): number {
    const factors = [
      metrics.clickThroughRate,
      metrics.averageSessionDuration / 60, // Convert to relative score
      metrics.learningVelocity / 5, // Normalize
      metrics.averageResponseRating / 5
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isCacheValid(lastCalculated?: Date): boolean {
    if (!lastCalculated) return false;
    return Date.now() - lastCalculated.getTime() < this.cacheExpiry;
  }

  private clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    this.recommendationCache.forEach((_, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.recommendationCache.delete(key));
  }
}

export const adaptiveRecommendationService = new AdaptiveRecommendationService();
export { AdaptiveRecommendationService };