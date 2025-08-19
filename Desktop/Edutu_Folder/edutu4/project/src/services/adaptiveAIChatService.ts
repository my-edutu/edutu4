// Adaptive AI Chat Service - Evolves Based on User Engagement

import { supabase, SUPABASE_TABLES } from '../config/supabase';
import { userActivityService } from './userActivityService';
import { adaptiveRecommendationService } from './adaptiveRecommendationService';
import { aiChatService } from './aiChatService';
import { UserEngagementMetrics, LearningPattern } from '../types/userActivity';
import { Opportunity } from '../types/common';

interface ChatPersonalization {
  userId: string;
  preferredTopics: string[];
  communicationStyle: 'detailed' | 'concise' | 'mixed';
  engagementLevel: 'high' | 'medium' | 'low';
  successfulResponsePatterns: Array<{
    pattern: string;
    successRate: number;
    avgRating: number;
  }>;
  recentInterests: string[];
  learningGoals: string[];
  lastUpdated: Date;
}

interface AdaptiveResponse {
  content: string;
  personalizedContent?: string;
  recommendedOpportunities?: Opportunity[];
  buttons?: Array<{
    text: string;
    type: 'scholarship' | 'community' | 'expert' | 'link' | 'opportunity';
    data?: any;
    priority?: number; // Based on user engagement patterns
  }>;
  responseId: string;
  personalizationScore: number; // How personalized this response is
  engagementPrediction: number; // Predicted engagement score 0-1
}

class AdaptiveAIChatService {
  private personalizationCache = new Map<string, ChatPersonalization>();
  private responsePatterns = new Map<string, { pattern: string; successRate: number }>();
  private learningInsights = new Map<string, any>();

  /**
   * Generate adaptive response based on user patterns and engagement
   */
  async generateAdaptiveResponse(
    userId: string,
    userMessage: string,
    userContext?: { name?: string; age?: number }
  ): Promise<AdaptiveResponse> {
    try {
      // Get user personalization profile
      const personalization = await this.getUserPersonalization(userId);
      
      // Generate base response
      const baseResponse = await aiChatService.generateResponse(userMessage, userContext);
      
      // Enhance with personalized content
      const enhancedContent = await this.personalizeContent(
        baseResponse.content,
        personalization,
        userMessage
      );

      // Get personalized opportunity recommendations
      const recommendedOpportunities = await this.getContextualOpportunities(
        userId,
        userMessage,
        personalization
      );

      // Adapt buttons based on engagement patterns
      const adaptiveButtons = await this.adaptButtons(
        baseResponse.buttons || [],
        personalization
      );

      // Generate response ID for tracking
      const responseId = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate personalization score
      const personalizationScore = this.calculatePersonalizationScore(
        personalization,
        enhancedContent,
        recommendedOpportunities
      );

      // Predict engagement
      const engagementPrediction = this.predictEngagement(
        personalization,
        userMessage,
        enhancedContent
      );

      return {
        content: enhancedContent,
        personalizedContent: enhancedContent !== baseResponse.content ? enhancedContent : undefined,
        recommendedOpportunities,
        buttons: adaptiveButtons,
        responseId,
        personalizationScore,
        engagementPrediction
      };
    } catch (error) {
      console.error('Error generating adaptive response:', error);
      // Fallback to base response
      const fallbackResponse = await aiChatService.generateResponse(userMessage, userContext);
      return {
        ...fallbackResponse,
        responseId: `fallback_${Date.now()}`,
        personalizationScore: 0,
        engagementPrediction: 0.5
      };
    }
  }

  /**
   * Update user personalization based on response feedback
   */
  async updatePersonalizationFromFeedback(
    userId: string,
    responseId: string,
    feedback: {
      rating?: number;
      helpfulness?: 'very_helpful' | 'somewhat_helpful' | 'not_helpful';
      followUpEngagement?: boolean;
      timeSpentReading?: number;
    }
  ): Promise<void> {
    try {
      const personalization = await this.getUserPersonalization(userId);
      
      // Extract patterns from successful interactions
      if (feedback.rating && feedback.rating >= 4) {
        // This was a successful interaction - learn from it
        await this.learnFromSuccessfulInteraction(userId, responseId, feedback);
      }

      // Update communication style preference
      if (feedback.timeSpentReading) {
        if (feedback.timeSpentReading > 30 && personalization.communicationStyle !== 'detailed') {
          personalization.communicationStyle = 'detailed';
        } else if (feedback.timeSpentReading < 10 && personalization.communicationStyle !== 'concise') {
          personalization.communicationStyle = 'concise';
        }
      }

      // Update engagement level
      if (feedback.followUpEngagement) {
        personalization.engagementLevel = 'high';
      }

      personalization.lastUpdated = new Date();
      await this.saveUserPersonalization(userId, personalization);
    } catch (error) {
      console.error('Error updating personalization from feedback:', error);
    }
  }

  /**
   * Analyze chat patterns and update response strategies
   */
  async analyzeChatPatternsAndUpdate(): Promise<void> {
    try {
      console.log('Analyzing chat patterns for adaptive improvements...');

      // Get all users with recent chat activity
      const activeUsers = await this.getActiveChatUsers();

      for (const userId of activeUsers) {
        // Analyze conversation patterns
        const patterns = await this.analyzeUserConversationPatterns(userId);
        
        // Update personalization profile
        await this.updatePersonalizationFromPatterns(userId, patterns);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update global response patterns
      await this.updateGlobalResponsePatterns();

      console.log(`Updated chat personalization for ${activeUsers.length} users`);
    } catch (error) {
      console.error('Error analyzing chat patterns:', error);
    }
  }

  /**
   * Get top-performing responses for learning
   */
  async getTopPerformingResponses(
    category?: string,
    limit: number = 50
  ): Promise<Array<{
    responsePattern: string;
    avgRating: number;
    engagementRate: number;
    successfulOutcomes: number;
    category: string;
  }>> {
    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('chat_response_analytics')
        .select('*')
        .gte('avg_rating', 4.0)
        .gte('engagement_rate', 0.7)
        .order('successful_outcomes', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching top performing responses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting top performing responses:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private async getUserPersonalization(userId: string): Promise<ChatPersonalization> {
    // Check cache first
    const cached = this.personalizationCache.get(userId);
    if (cached && this.isCacheValid(cached.lastUpdated)) {
      return cached;
    }

    try {
      // Fetch from Supabase if available
      if (supabase) {
        const { data, error } = await supabase
          .from('chat_personalization')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          const personalization: ChatPersonalization = {
            userId: data.user_id,
            preferredTopics: data.preferred_topics,
            communicationStyle: data.communication_style,
            engagementLevel: data.engagement_level,
            successfulResponsePatterns: data.successful_response_patterns,
            recentInterests: data.recent_interests,
            learningGoals: data.learning_goals,
            lastUpdated: new Date(data.last_updated)
          };
          
          this.personalizationCache.set(userId, personalization);
          return personalization;
        }
      }

      // Create default personalization
      return await this.createDefaultPersonalization(userId);
    } catch (error) {
      console.error('Error fetching user personalization:', error);
      return await this.createDefaultPersonalization(userId);
    }
  }

  private async createDefaultPersonalization(userId: string): Promise<ChatPersonalization> {
    // Get user engagement metrics to inform defaults
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const metrics = await userActivityService.getUserEngagementMetrics(
      userId,
      'monthly',
      thirtyDaysAgo,
      new Date()
    );

    const personalization: ChatPersonalization = {
      userId,
      preferredTopics: metrics?.preferredCategories || ['General'],
      communicationStyle: 'mixed',
      engagementLevel: metrics && metrics.averageSessionDuration > 10 ? 'high' : 'medium',
      successfulResponsePatterns: [],
      recentInterests: [],
      learningGoals: [],
      lastUpdated: new Date()
    };

    await this.saveUserPersonalization(userId, personalization);
    return personalization;
  }

  private async saveUserPersonalization(
    userId: string,
    personalization: ChatPersonalization
  ): Promise<void> {
    try {
      this.personalizationCache.set(userId, personalization);

      if (supabase) {
        await supabase
          .from('chat_personalization')
          .upsert({
            user_id: userId,
            preferred_topics: personalization.preferredTopics,
            communication_style: personalization.communicationStyle,
            engagement_level: personalization.engagementLevel,
            successful_response_patterns: personalization.successfulResponsePatterns,
            recent_interests: personalization.recentInterests,
            learning_goals: personalization.learningGoals,
            last_updated: personalization.lastUpdated.toISOString()
          });
      }
    } catch (error) {
      console.error('Error saving user personalization:', error);
    }
  }

  private async personalizeContent(
    baseContent: string,
    personalization: ChatPersonalization,
    userMessage: string
  ): Promise<string> {
    let personalizedContent = baseContent;

    // Adjust communication style
    if (personalization.communicationStyle === 'concise') {
      // Shorten responses, remove some details
      personalizedContent = this.makeContentConcise(personalizedContent);
    } else if (personalization.communicationStyle === 'detailed') {
      // Add more specific examples and details
      personalizedContent = this.addDetailedExamples(personalizedContent, personalization);
    }

    // Incorporate preferred topics
    if (personalization.preferredTopics.length > 0) {
      personalizedContent = this.incorporatePreferredTopics(
        personalizedContent,
        personalization.preferredTopics
      );
    }

    // Add recent interests context
    if (personalization.recentInterests.length > 0) {
      personalizedContent = this.addRecentInterestsContext(
        personalizedContent,
        personalization.recentInterests
      );
    }

    return personalizedContent;
  }

  private async getContextualOpportunities(
    userId: string,
    userMessage: string,
    personalization: ChatPersonalization
  ): Promise<Opportunity[]> {
    try {
      // Extract keywords from user message
      const keywords = this.extractKeywords(userMessage);
      
      // Get personalized recommendations
      const opportunities = await adaptiveRecommendationService.getPersonalizedRecommendations(
        userId,
        5, // Limit to top 5 for chat context
        {
          category: personalization.preferredTopics[0] // Use top preferred category
        }
      );

      // Filter opportunities that match conversation context
      const contextualOpportunities = opportunities.filter(opp => 
        keywords.some(keyword => 
          opp.title.toLowerCase().includes(keyword.toLowerCase()) ||
          opp.description.toLowerCase().includes(keyword.toLowerCase()) ||
          opp.category.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      return contextualOpportunities.slice(0, 3); // Return top 3 contextual opportunities
    } catch (error) {
      console.error('Error getting contextual opportunities:', error);
      return [];
    }
  }

  private async adaptButtons(
    baseButtons: any[],
    personalization: ChatPersonalization
  ): Promise<any[]> {
    // Sort buttons based on user engagement patterns
    const adaptiveButtons = baseButtons.map(button => {
      // Calculate priority based on personalization
      let priority = 1;
      
      if (personalization.preferredTopics.includes(button.data?.category)) {
        priority += 2;
      }
      
      if (personalization.engagementLevel === 'high' && button.type === 'community') {
        priority += 1;
      }

      return { ...button, priority };
    });

    // Sort by priority (higher first)
    return adaptiveButtons.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  }

  private calculatePersonalizationScore(
    personalization: ChatPersonalization,
    content: string,
    opportunities: Opportunity[]
  ): number {
    let score = 0;

    // Base score for having personalization data
    if (personalization.preferredTopics.length > 0) score += 0.3;
    if (personalization.successfulResponsePatterns.length > 0) score += 0.2;
    if (personalization.recentInterests.length > 0) score += 0.2;

    // Score for contextual opportunities
    if (opportunities.length > 0) score += 0.2;

    // Score for communication style adaptation
    score += 0.1;

    return Math.min(score, 1.0);
  }

  private predictEngagement(
    personalization: ChatPersonalization,
    userMessage: string,
    content: string
  ): number {
    let engagementScore = 0.5; // Base score

    // User engagement level factor
    switch (personalization.engagementLevel) {
      case 'high':
        engagementScore += 0.2;
        break;
      case 'low':
        engagementScore -= 0.1;
        break;
    }

    // Topic relevance factor
    const messageTopics = this.extractKeywords(userMessage);
    const topicMatch = messageTopics.some(topic => 
      personalization.preferredTopics.some(prefTopic => 
        prefTopic.toLowerCase().includes(topic.toLowerCase())
      )
    );
    
    if (topicMatch) engagementScore += 0.15;

    // Content length factor based on communication style
    const wordCount = content.split(' ').length;
    if (personalization.communicationStyle === 'concise' && wordCount < 100) {
      engagementScore += 0.1;
    } else if (personalization.communicationStyle === 'detailed' && wordCount > 200) {
      engagementScore += 0.1;
    }

    return Math.min(Math.max(engagementScore, 0), 1);
  }

  private async learnFromSuccessfulInteraction(
    userId: string,
    responseId: string,
    feedback: any
  ): Promise<void> {
    // Store successful interaction pattern for future learning
    if (supabase) {
      await supabase
        .from('successful_chat_interactions')
        .insert({
          user_id: userId,
          response_id: responseId,
          rating: feedback.rating,
          helpfulness: feedback.helpfulness,
          engagement_metrics: {
            timeSpentReading: feedback.timeSpentReading,
            followUpEngagement: feedback.followUpEngagement
          },
          created_at: new Date().toISOString()
        });
    }
  }

  // Content adaptation helper methods
  private makeContentConcise(content: string): string {
    // Simple implementation - remove some verbose parts
    return content
      .replace(/\n\n\*\*💡 Pro Tips:\*\*[\s\S]*?\n\n/g, '\n\n')
      .replace(/Here are some excellent options:\n\n/g, '')
      .substring(0, Math.min(content.length, 800));
  }

  private addDetailedExamples(content: string, personalization: ChatPersonalization): string {
    // Add specific examples based on user's preferred topics
    const examples = this.getDetailedExamples(personalization.preferredTopics);
    return content + (examples.length > 0 ? '\n\n**Specific Examples:**\n' + examples.join('\n') : '');
  }

  private incorporatePreferredTopics(content: string, topics: string[]): string {
    // Mention preferred topics when relevant
    if (topics.includes('Technology') && content.includes('career')) {
      content += '\n\n💻 Since you\'re interested in technology, check out coding bootcamps and tech scholarships!';
    }
    return content;
  }

  private addRecentInterestsContext(content: string, interests: string[]): string {
    if (interests.length > 0) {
      content += `\n\n🔍 Based on your recent interest in ${interests[0]}, you might also find related opportunities valuable.`;
    }
    return content;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10);
  }

  private getDetailedExamples(topics: string[]): string[] {
    const examples: string[] = [];
    // Add topic-specific examples
    if (topics.includes('Technology')) {
      examples.push('• Google Developer Scholarship Program');
      examples.push('• Meta Software Engineer Training');
    }
    if (topics.includes('Business')) {
      examples.push('• McKinsey Forward Program');
      examples.push('• African Leadership Academy Fellowship');
    }
    return examples;
  }

  private async getActiveChatUsers(): Promise<string[]> {
    // Get users with chat activity in the last 7 days
    // This would query your user activity data
    return []; // Placeholder
  }

  private async analyzeUserConversationPatterns(userId: string): Promise<any> {
    // Analyze conversation patterns for this user
    return {}; // Placeholder
  }

  private async updatePersonalizationFromPatterns(userId: string, patterns: any): Promise<void> {
    // Update personalization based on analyzed patterns
  }

  private async updateGlobalResponsePatterns(): Promise<void> {
    // Update global response patterns based on successful interactions
  }

  private isCacheValid(lastUpdated: Date): boolean {
    const cacheExpiry = 1000 * 60 * 60 * 2; // 2 hours
    return Date.now() - lastUpdated.getTime() < cacheExpiry;
  }
}

export const adaptiveAIChatService = new AdaptiveAIChatService();
export { AdaptiveAIChatService };