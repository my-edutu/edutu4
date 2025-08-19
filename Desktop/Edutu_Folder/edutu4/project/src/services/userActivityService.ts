// User Activity Tracking Service for Continuous Learning Loop

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { supabase, SUPABASE_TABLES } from '../config/supabase';
import { 
  UserActivity, 
  ActivityType, 
  ActivityDetails, 
  UserEngagementMetrics,
  LearningPattern 
} from '../types/userActivity';

class UserActivityService {
  private currentSessionId: string;
  private activityBuffer: UserActivity[] = [];
  private bufferFlushInterval: number = 30000; // 30 seconds
  private maxBufferSize: number = 50;

  constructor() {
    this.currentSessionId = this.generateSessionId();
    this.startBufferFlushTimer();
  }

  /**
   * Track a user activity event
   */
  async trackActivity(
    userId: string,
    activityType: ActivityType,
    details: ActivityDetails,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const activity: UserActivity = {
      userId,
      timestamp: new Date(),
      sessionId: this.currentSessionId,
      activityType,
      details,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        ...metadata
      }
    };

    // Add to buffer for batch processing
    this.activityBuffer.push(activity);

    // Flush buffer if it's getting full
    if (this.activityBuffer.length >= this.maxBufferSize) {
      await this.flushBuffer();
    }

    // Also track critical activities immediately
    if (this.isCriticalActivity(activityType)) {
      await this.saveActivity(activity);
    }
  }

  /**
   * Track opportunity interaction
   */
  async trackOpportunityInteraction(
    userId: string,
    action: 'clicked' | 'saved' | 'ignored' | 'applied',
    opportunityId: string,
    opportunityTitle: string,
    opportunityCategory: string,
    additionalData: Partial<ActivityDetails> = {}
  ): Promise<void> {
    const activityType = `opportunity_${action}` as ActivityType;
    
    await this.trackActivity(userId, activityType, {
      opportunityId,
      opportunityTitle,
      opportunityCategory,
      ...additionalData
    });
  }

  /**
   * Track roadmap task progress
   */
  async trackRoadmapProgress(
    userId: string,
    action: 'completed' | 'delayed' | 'skipped',
    roadmapId: string,
    taskId: string,
    taskTitle: string,
    additionalData: Partial<ActivityDetails> = {}
  ): Promise<void> {
    const activityType = `roadmap_task_${action}` as ActivityType;
    
    await this.trackActivity(userId, activityType, {
      roadmapId,
      taskId,
      taskTitle,
      ...additionalData
    });
  }

  /**
   * Track chat interactions
   */
  async trackChatInteraction(
    userId: string,
    action: 'question_asked' | 'response_rated',
    details: {
      question?: string;
      responseId?: string;
      rating?: number;
      responseHelpfulness?: 'very_helpful' | 'somewhat_helpful' | 'not_helpful';
    }
  ): Promise<void> {
    const activityType = `chat_${action}` as ActivityType;
    
    await this.trackActivity(userId, activityType, details);
  }

  /**
   * Get user engagement metrics for a specific period
   */
  async getUserEngagementMetrics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<UserEngagementMetrics | null> {
    try {
      const activities = await this.getUserActivities(userId, startDate, endDate);
      
      if (activities.length === 0) {
        return null;
      }

      // Calculate engagement metrics
      const sessions = new Set(activities.map(a => a.sessionId));
      const opportunityViews = activities.filter(a => a.activityType === 'opportunity_clicked');
      const opportunityClicks = activities.filter(a => a.activityType === 'opportunity_clicked');
      const opportunitySaves = activities.filter(a => a.activityType === 'opportunity_saved');
      const opportunityApplications = activities.filter(a => a.activityType === 'opportunity_applied');
      const completedTasks = activities.filter(a => a.activityType === 'roadmap_task_completed');
      const delayedTasks = activities.filter(a => a.activityType === 'roadmap_task_delayed');
      const chatQuestions = activities.filter(a => a.activityType === 'chat_question_asked');
      const chatRatings = activities.filter(a => a.activityType === 'chat_response_rated');

      // Calculate time-based metrics (simplified)
      const totalTimeSpent = this.calculateTotalTimeSpent(activities);
      const averageSessionDuration = totalTimeSpent / sessions.size;

      // Calculate click-through rate
      const clickThroughRate = opportunityViews.length > 0 
        ? opportunityClicks.length / opportunityViews.length 
        : 0;

      // Calculate average task completion time
      const taskCompletionTimes = completedTasks
        .map(t => t.details.completionTime)
        .filter((time): time is number => typeof time === 'number');
      const averageTaskCompletionTime = taskCompletionTimes.length > 0
        ? taskCompletionTimes.reduce((sum, time) => sum + time, 0) / taskCompletionTimes.length
        : 0;

      // Calculate average response rating
      const ratings = chatRatings
        .map(r => r.details.responseRating)
        .filter((rating): rating is number => typeof rating === 'number');
      const averageResponseRating = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

      // Identify preferred categories
      const categoryCount: Record<string, number> = {};
      activities.forEach(activity => {
        if (activity.details.opportunityCategory) {
          categoryCount[activity.details.opportunityCategory] = 
            (categoryCount[activity.details.opportunityCategory] || 0) + 1;
        }
      });
      
      const preferredCategories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      return {
        userId,
        period,
        startDate,
        endDate,
        sessionsCount: sessions.size,
        totalTimeSpent: Math.round(totalTimeSpent),
        averageSessionDuration: Math.round(averageSessionDuration),
        opportunitiesViewed: opportunityViews.length,
        opportunitiesClicked: opportunityClicks.length,
        opportunitiesSaved: opportunitySaves.length,
        opportunitiesAppliedTo: opportunityApplications.length,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        tasksCompleted: completedTasks.length,
        tasksDelayed: delayedTasks.length,
        averageTaskCompletionTime: Math.round(averageTaskCompletionTime),
        roadmapsStarted: 0, // TODO: Implement roadmap start tracking
        roadmapsCompleted: 0, // TODO: Implement roadmap completion tracking
        questionsAsked: chatQuestions.length,
        averageResponseRating: Math.round(averageResponseRating * 100) / 100,
        chatSessionsInitiated: 0, // TODO: Implement chat session tracking
        preferredCategories,
        activeTimeOfDay: [], // TODO: Implement time-of-day analysis
        learningVelocity: completedTasks.length / this.getDaysDifference(startDate, endDate),
        feedbackProvided: 0, // TODO: Implement feedback tracking
        averageSatisfactionScore: 0 // TODO: Implement satisfaction tracking
      };
    } catch (error) {
      console.error('Error calculating engagement metrics:', error);
      return null;
    }
  }

  /**
   * Identify learning patterns from user activity
   */
  async identifyLearningPatterns(userId: string): Promise<LearningPattern[]> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activities = await this.getUserActivities(userId, thirtyDaysAgo, new Date());
      
      const patterns: LearningPattern[] = [];

      // Pattern 1: Preferred learning times
      const timePattern = this.analyzeTimePreferences(activities);
      if (timePattern.confidence > 0.5) {
        patterns.push({
          userId,
          patternType: 'behavior',
          pattern: {
            name: 'preferred_learning_times',
            confidence: timePattern.confidence,
            data: timePattern.data,
            lastUpdated: new Date()
          }
        });
      }

      // Pattern 2: Category preferences
      const categoryPattern = this.analyzeCategoryPreferences(activities);
      if (categoryPattern.confidence > 0.5) {
        patterns.push({
          userId,
          patternType: 'preference',
          pattern: {
            name: 'category_preferences',
            confidence: categoryPattern.confidence,
            data: categoryPattern.data,
            lastUpdated: new Date()
          }
        });
      }

      // Pattern 3: Task completion behavior
      const completionPattern = this.analyzeCompletionBehavior(activities);
      if (completionPattern.confidence > 0.5) {
        patterns.push({
          userId,
          patternType: 'performance',
          pattern: {
            name: 'task_completion_behavior',
            confidence: completionPattern.confidence,
            data: completionPattern.data,
            lastUpdated: new Date()
          }
        });
      }

      // Save patterns to Supabase if available
      if (supabase) {
        for (const pattern of patterns) {
          await supabase
            .from(SUPABASE_TABLES.LEARNING_PATTERNS)
            .upsert({
              user_id: pattern.userId,
              pattern_type: pattern.patternType,
              pattern_name: pattern.pattern.name,
              confidence: pattern.pattern.confidence,
              pattern_data: pattern.pattern.data,
              last_updated: pattern.pattern.lastUpdated.toISOString()
            });
        }
      }

      return patterns;
    } catch (error) {
      console.error('Error identifying learning patterns:', error);
      return [];
    }
  }

  /**
   * Get user activities for a date range
   */
  private async getUserActivities(
    userId: string, 
    startDate: Date, 
    endDate: Date,
    maxResults: number = 1000
  ): Promise<UserActivity[]> {
    try {
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      const q = query(
        collection(db, 'userActivities'),
        where('userId', '==', userId),
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          timestamp: data.timestamp.toDate(),
          sessionId: data.sessionId,
          activityType: data.activityType,
          details: data.details,
          metadata: data.metadata
        } as UserActivity;
      });
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
  }

  /**
   * Save activity to Firestore
   */
  private async saveActivity(activity: UserActivity): Promise<void> {
    try {
      const docData = {
        ...activity,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'userActivities'), docData);
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  }

  /**
   * Flush the activity buffer to Firestore
   */
  private async flushBuffer(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    const activities = [...this.activityBuffer];
    this.activityBuffer = [];

    try {
      // Batch save activities
      const promises = activities.map(activity => this.saveActivity(activity));
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error flushing activity buffer:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if activity type is critical and should be saved immediately
   */
  private isCriticalActivity(activityType: ActivityType): boolean {
    const criticalActivities: ActivityType[] = [
      'opportunity_applied',
      'goal_completed',
      'roadmap_task_completed'
    ];
    return criticalActivities.includes(activityType);
  }

  /**
   * Start buffer flush timer
   */
  private startBufferFlushTimer(): void {
    setInterval(async () => {
      await this.flushBuffer();
    }, this.bufferFlushInterval);

    // Also flush on page unload
    window.addEventListener('beforeunload', () => {
      // Use sendBeacon for reliable delivery on page unload
      if (this.activityBuffer.length > 0 && navigator.sendBeacon) {
        const data = JSON.stringify(this.activityBuffer);
        navigator.sendBeacon('/api/activities/flush', data);
      }
    });
  }

  /**
   * Calculate total time spent from activities
   */
  private calculateTotalTimeSpent(activities: UserActivity[]): number {
    // Simple heuristic: assume 5 minutes per session
    const sessions = new Set(activities.map(a => a.sessionId));
    return sessions.size * 5; // minutes
  }

  /**
   * Get difference in days between two dates
   */
  private getDaysDifference(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Analyze time preferences from activities
   */
  private analyzeTimePreferences(activities: UserActivity[]) {
    const hourCounts: Record<number, number> = {};
    
    activities.forEach(activity => {
      const hour = activity.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const totalActivities = activities.length;
    const maxHour = Object.entries(hourCounts)
      .reduce((max, [hour, count]) => 
        count > (hourCounts[parseInt(max)] || 0) ? hour : max, '0'
      );

    const peakHourPercentage = (hourCounts[parseInt(maxHour)] || 0) / totalActivities;

    return {
      confidence: Math.min(peakHourPercentage * 2, 1), // Cap at 1.0
      data: {
        peakHour: parseInt(maxHour),
        peakHourPercentage,
        hourlyDistribution: hourCounts
      }
    };
  }

  /**
   * Analyze category preferences from activities
   */
  private analyzeCategoryPreferences(activities: UserActivity[]) {
    const categoryInteractions: Record<string, { views: number, saves: number, applications: number }> = {};

    activities.forEach(activity => {
      const category = activity.details.opportunityCategory;
      if (!category) return;

      if (!categoryInteractions[category]) {
        categoryInteractions[category] = { views: 0, saves: 0, applications: 0 };
      }

      switch (activity.activityType) {
        case 'opportunity_clicked':
          categoryInteractions[category].views++;
          break;
        case 'opportunity_saved':
          categoryInteractions[category].saves++;
          break;
        case 'opportunity_applied':
          categoryInteractions[category].applications++;
          break;
      }
    });

    const categoryScores = Object.entries(categoryInteractions).map(([category, counts]) => ({
      category,
      score: counts.applications * 3 + counts.saves * 2 + counts.views * 1,
      engagement: counts
    }));

    categoryScores.sort((a, b) => b.score - a.score);

    const totalScore = categoryScores.reduce((sum, cat) => sum + cat.score, 0);
    const topCategoryScore = categoryScores[0]?.score || 0;
    const confidence = totalScore > 0 ? topCategoryScore / totalScore : 0;

    return {
      confidence: Math.min(confidence * 2, 1),
      data: {
        preferredCategories: categoryScores.slice(0, 3),
        categoryEngagement: categoryInteractions
      }
    };
  }

  /**
   * Analyze task completion behavior
   */
  private analyzeCompletionBehavior(activities: UserActivity[]) {
    const taskActivities = activities.filter(a => 
      a.activityType.startsWith('roadmap_task_') || a.activityType.startsWith('goal_')
    );

    const completed = taskActivities.filter(a => 
      a.activityType === 'roadmap_task_completed' || a.activityType === 'goal_completed'
    );

    const delayed = taskActivities.filter(a => a.activityType === 'roadmap_task_delayed');
    const skipped = taskActivities.filter(a => a.activityType === 'roadmap_task_skipped');

    const totalTasks = completed.length + delayed.length + skipped.length;
    const completionRate = totalTasks > 0 ? completed.length / totalTasks : 0;

    // Calculate average completion time for completed tasks
    const completionTimes = completed
      .map(t => t.details.completionTime)
      .filter((time): time is number => typeof time === 'number');
    
    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 0;

    return {
      confidence: totalTasks >= 5 ? 0.8 : totalTasks / 5 * 0.8, // Need at least 5 tasks for good confidence
      data: {
        completionRate,
        averageCompletionTime,
        taskStats: {
          completed: completed.length,
          delayed: delayed.length,
          skipped: skipped.length,
          total: totalTasks
        }
      }
    };
  }
}

export const userActivityService = new UserActivityService();
export { UserActivityService };