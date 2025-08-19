// Automated Learning Pipeline Service - Weekly Batch Processing

import { supabase, SUPABASE_TABLES } from '../config/supabase';
import { userActivityService } from './userActivityService';
import { adaptiveRecommendationService } from './adaptiveRecommendationService';
import { roadmapRefinementService } from './roadmapRefinementService';
import { adaptiveAIChatService } from './adaptiveAIChatService';
import { fetchOpportunities } from './opportunitiesService';
import { LearningUpdate } from '../types/userActivity';

interface PipelineSchedule {
  id: string;
  taskType: 'recommendations' | 'embeddings' | 'patterns' | 'feedback' | 'full_analysis';
  frequency: 'daily' | 'weekly' | 'monthly';
  lastRun: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'failed';
  config: Record<string, any>;
}

interface LearningMetrics {
  date: Date;
  totalUsers: number;
  activeUsers: number;
  newInteractions: number;
  recommendationAccuracy: number;
  chatSatisfactionScore: number;
  roadmapCompletionRate: number;
  systemPerformance: {
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

class LearningPipelineService {
  private schedules: Map<string, PipelineSchedule> = new Map();
  private isRunning = false;
  private metrics: LearningMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 90; // Keep 90 days of metrics

  constructor() {
    this.initializeSchedules();
    this.startScheduler();
  }

  /**
   * Initialize default pipeline schedules
   */
  private initializeSchedules(): void {
    const defaultSchedules: Omit<PipelineSchedule, 'id'>[] = [
      {
        taskType: 'recommendations',
        frequency: 'daily',
        lastRun: new Date(0),
        nextRun: new Date(),
        status: 'active',
        config: { batchSize: 100, maxUsers: 1000 }
      },
      {
        taskType: 'embeddings',
        frequency: 'daily',
        lastRun: new Date(0),
        nextRun: new Date(),
        status: 'active',
        config: { processNewOpportunities: true, updateUserEmbeddings: true }
      },
      {
        taskType: 'patterns',
        frequency: 'weekly',
        lastRun: new Date(0),
        nextRun: this.getNextWeeklyRun(),
        status: 'active',
        config: { analysisDepth: 'full', minUserActivity: 5 }
      },
      {
        taskType: 'feedback',
        frequency: 'weekly',
        lastRun: new Date(0),
        nextRun: this.getNextWeeklyRun(),
        status: 'active',
        config: { improvementThreshold: 0.1 }
      },
      {
        taskType: 'full_analysis',
        frequency: 'weekly',
        lastRun: new Date(0),
        nextRun: this.getNextWeeklyRun(),
        status: 'active',
        config: { comprehensive: true }
      }
    ];

    defaultSchedules.forEach(schedule => {
      const id = `${schedule.taskType}_${schedule.frequency}`;
      this.schedules.set(id, { id, ...schedule });
    });
  }

  /**
   * Start the automated scheduler
   */
  private startScheduler(): void {
    // Check every hour for tasks that need to run
    setInterval(() => {
      if (!this.isRunning) {
        this.checkAndRunScheduledTasks();
      }
    }, 1000 * 60 * 60); // 1 hour

    // Also check immediately on startup (after a short delay)
    setTimeout(() => {
      this.checkAndRunScheduledTasks();
    }, 5000);

    console.log('Learning pipeline scheduler started');
  }

  /**
   * Check for scheduled tasks and run them
   */
  private async checkAndRunScheduledTasks(): Promise<void> {
    const now = new Date();
    
    for (const [id, schedule] of this.schedules) {
      if (schedule.status === 'active' && now >= schedule.nextRun) {
        console.log(`Running scheduled task: ${schedule.taskType}`);
        await this.runScheduledTask(schedule);
      }
    }
  }

  /**
   * Run a specific scheduled task
   */
  private async runScheduledTask(schedule: PipelineSchedule): Promise<void> {
    if (this.isRunning) {
      console.log('Pipeline already running, skipping task');
      return;
    }

    this.isRunning = true;
    const updateRecord: LearningUpdate = {
      id: `update_${Date.now()}`,
      updateType: schedule.taskType,
      status: 'processing',
      scheduledAt: new Date(),
      metadata: {}
    };

    try {
      console.log(`Starting ${schedule.taskType} pipeline...`);
      
      switch (schedule.taskType) {
        case 'recommendations':
          await this.runRecommendationUpdate(updateRecord, schedule.config);
          break;
        case 'embeddings':
          await this.runEmbeddingUpdate(updateRecord, schedule.config);
          break;
        case 'patterns':
          await this.runPatternAnalysis(updateRecord, schedule.config);
          break;
        case 'feedback':
          await this.runFeedbackAnalysis(updateRecord, schedule.config);
          break;
        case 'full_analysis':
          await this.runFullAnalysis(updateRecord, schedule.config);
          break;
      }

      // Update schedule for next run
      schedule.lastRun = new Date();
      schedule.nextRun = this.calculateNextRun(schedule.frequency);
      updateRecord.status = 'completed';
      updateRecord.completedAt = new Date();
      
      console.log(`${schedule.taskType} pipeline completed successfully`);
    } catch (error) {
      console.error(`Error in ${schedule.taskType} pipeline:`, error);
      updateRecord.status = 'failed';
      updateRecord.metadata.errors = [error instanceof Error ? error.message : String(error)];
    } finally {
      this.isRunning = false;
      await this.saveUpdateRecord(updateRecord);
    }
  }

  /**
   * Update recommendation engine with new user data
   */
  private async runRecommendationUpdate(
    updateRecord: LearningUpdate,
    config: any
  ): Promise<void> {
    const activeUsers = await this.getActiveUsers(config.maxUsers || 1000);
    
    console.log(`Updating recommendations for ${activeUsers.length} users`);
    
    await adaptiveRecommendationService.batchUpdateRecommendations(activeUsers);
    
    updateRecord.metadata.affectedUsers = activeUsers.length;
    updateRecord.metadata.updatedRecommendations = activeUsers.length;
  }

  /**
   * Update embeddings for new opportunities and user preferences
   */
  private async runEmbeddingUpdate(
    updateRecord: LearningUpdate,
    config: any
  ): Promise<void> {
    let processedCount = 0;

    // Process new opportunities
    if (config.processNewOpportunities) {
      const newOpportunities = await this.getNewOpportunities();
      
      for (const opportunity of newOpportunities) {
        await adaptiveRecommendationService.processOpportunityEmbedding(opportunity);
        processedCount++;
      }
      
      console.log(`Processed ${newOpportunities.length} new opportunity embeddings`);
    }

    // Update user preference embeddings
    if (config.updateUserEmbeddings) {
      const activeUsers = await this.getActiveUsers(500);
      
      for (const userId of activeUsers) {
        await adaptiveRecommendationService.updateUserPreferences(userId);
        processedCount++;
      }
      
      console.log(`Updated ${activeUsers.length} user preference embeddings`);
    }

    updateRecord.metadata.processedEmbeddings = processedCount;
  }

  /**
   * Analyze user behavior patterns and learning trends
   */
  private async runPatternAnalysis(
    updateRecord: LearningUpdate,
    config: any
  ): Promise<void> {
    console.log('Running comprehensive pattern analysis...');

    // Analyze roadmap patterns
    await roadmapRefinementService.analyzeRoadmapPatterns();
    
    // Analyze chat patterns
    await adaptiveAIChatService.analyzeChatPatternsAndUpdate();
    
    // Generate learning insights
    const insights = await this.generateLearningInsights();
    
    // Store insights for future use
    await this.storeLearningInsights(insights);
    
    updateRecord.metadata.patternsAnalyzed = insights.length;
    console.log(`Generated ${insights.length} learning insights`);
  }

  /**
   * Analyze feedback and implement improvements
   */
  private async runFeedbackAnalysis(
    updateRecord: LearningUpdate,
    config: any
  ): Promise<void> {
    console.log('Analyzing feedback for system improvements...');

    // Get performance metrics
    const metrics = await this.calculateSystemMetrics();
    
    // Identify improvement opportunities
    const improvements = await this.identifyImprovements(metrics, config.improvementThreshold);
    
    // Apply automatic improvements
    const applied = await this.applyAutomaticImprovements(improvements);
    
    updateRecord.metadata.improvementsApplied = applied.length;
    console.log(`Applied ${applied.length} automatic improvements`);
  }

  /**
   * Run comprehensive full system analysis
   */
  private async runFullAnalysis(
    updateRecord: LearningUpdate,
    config: any
  ): Promise<void> {
    console.log('Running comprehensive system analysis...');

    // Run all analysis types
    await this.runRecommendationUpdate(updateRecord, { maxUsers: 2000 });
    await this.runEmbeddingUpdate(updateRecord, { processNewOpportunities: true, updateUserEmbeddings: true });
    await this.runPatternAnalysis(updateRecord, config);
    await this.runFeedbackAnalysis(updateRecord, config);

    // Generate comprehensive report
    const report = await this.generateComprehensiveReport();
    
    // Store the report
    await this.storeAnalysisReport(report);
    
    console.log('Comprehensive analysis completed');
  }

  /**
   * Get performance metrics for the system
   */
  async getSystemMetrics(days: number = 7): Promise<LearningMetrics[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    return this.metrics.filter(metric => 
      metric.date >= startDate && metric.date <= endDate
    );
  }

  /**
   * Manually trigger a pipeline task
   */
  async triggerPipelineTask(
    taskType: PipelineSchedule['taskType'],
    config?: Record<string, any>
  ): Promise<void> {
    const schedule = Array.from(this.schedules.values()).find(s => s.taskType === taskType);
    if (schedule) {
      if (config) {
        schedule.config = { ...schedule.config, ...config };
      }
      await this.runScheduledTask(schedule);
    } else {
      throw new Error(`No schedule found for task type: ${taskType}`);
    }
  }

  /**
   * Get pipeline status and schedules
   */
  getPipelineStatus(): {
    isRunning: boolean;
    schedules: PipelineSchedule[];
    lastMetrics: LearningMetrics | null;
    upcomingTasks: Array<{ taskType: string; nextRun: Date }>;
  } {
    const schedules = Array.from(this.schedules.values());
    const upcomingTasks = schedules
      .filter(s => s.status === 'active')
      .map(s => ({ taskType: s.taskType, nextRun: s.nextRun }))
      .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());

    return {
      isRunning: this.isRunning,
      schedules,
      lastMetrics: this.metrics[this.metrics.length - 1] || null,
      upcomingTasks
    };
  }

  /**
   * Private helper methods
   */

  private async getActiveUsers(limit: number): Promise<string[]> {
    // Get users who have been active in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from(SUPABASE_TABLES.USER_ACTIVITY_LOGS)
          .select('user_id')
          .gte('timestamp', thirtyDaysAgo.toISOString())
          .limit(limit);

        if (!error && data) {
          return [...new Set(data.map(row => row.user_id))];
        }
      }

      // Fallback - return empty array
      return [];
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  private async getNewOpportunities(): Promise<any[]> {
    // Get opportunities added in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const opportunities = await fetchOpportunities(100);
    
    // Filter for new opportunities (simplified - in real implementation would check creation date)
    return opportunities.slice(0, 10); // Return first 10 as "new"
  }

  private async generateLearningInsights(): Promise<any[]> {
    // Generate insights from user behavior patterns
    const insights = [];

    try {
      // Analyze completion rates by category
      const categoryInsights = await this.analyzeCategoryPerformance();
      insights.push(...categoryInsights);

      // Analyze time-based patterns
      const timeInsights = await this.analyzeTimeBasedPatterns();
      insights.push(...timeInsights);

      // Analyze user journey patterns
      const journeyInsights = await this.analyzeUserJourneyPatterns();
      insights.push(...journeyInsights);

    } catch (error) {
      console.error('Error generating learning insights:', error);
    }

    return insights;
  }

  private async calculateSystemMetrics(): Promise<LearningMetrics> {
    const now = new Date();
    
    // Calculate metrics (simplified implementation)
    const metrics: LearningMetrics = {
      date: now,
      totalUsers: 1000, // Would fetch from database
      activeUsers: 250,  // Would calculate from recent activity
      newInteractions: 500, // Would count from activity logs
      recommendationAccuracy: 0.75, // Would calculate from feedback
      chatSatisfactionScore: 4.2, // Would calculate from ratings
      roadmapCompletionRate: 0.68, // Would calculate from roadmap data
      systemPerformance: {
        avgResponseTime: 150, // milliseconds
        errorRate: 0.02, // 2%
        cacheHitRate: 0.85 // 85%
      }
    };

    // Store metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    return metrics;
  }

  private async identifyImprovements(
    metrics: LearningMetrics,
    threshold: number
  ): Promise<any[]> {
    const improvements = [];

    // Check if recommendation accuracy is below threshold
    if (metrics.recommendationAccuracy < 0.8) {
      improvements.push({
        type: 'recommendation_accuracy',
        current: metrics.recommendationAccuracy,
        target: 0.8,
        action: 'retrain_embeddings'
      });
    }

    // Check chat satisfaction
    if (metrics.chatSatisfactionScore < 4.0) {
      improvements.push({
        type: 'chat_satisfaction',
        current: metrics.chatSatisfactionScore,
        target: 4.0,
        action: 'update_response_patterns'
      });
    }

    // Check system performance
    if (metrics.systemPerformance.errorRate > 0.05) {
      improvements.push({
        type: 'error_rate',
        current: metrics.systemPerformance.errorRate,
        target: 0.02,
        action: 'improve_error_handling'
      });
    }

    return improvements;
  }

  private async applyAutomaticImprovements(improvements: any[]): Promise<any[]> {
    const applied = [];

    for (const improvement of improvements) {
      try {
        switch (improvement.action) {
          case 'retrain_embeddings':
            // Trigger embedding retraining
            await this.triggerPipelineTask('embeddings');
            applied.push(improvement);
            break;
          case 'update_response_patterns':
            // Trigger chat pattern analysis
            await this.triggerPipelineTask('patterns');
            applied.push(improvement);
            break;
          // Add more automatic improvements as needed
        }
      } catch (error) {
        console.error('Error applying improvement:', improvement, error);
      }
    }

    return applied;
  }

  private async generateComprehensiveReport(): Promise<any> {
    return {
      timestamp: new Date(),
      metrics: await this.calculateSystemMetrics(),
      insights: await this.generateLearningInsights(),
      performance: {
        recommendationEngine: 'healthy',
        chatService: 'optimal',
        roadmapRefinement: 'improving'
      }
    };
  }

  private async analyzeCategoryPerformance(): Promise<any[]> {
    // Analyze performance by opportunity category
    return []; // Placeholder
  }

  private async analyzeTimeBasedPatterns(): Promise<any[]> {
    // Analyze patterns based on time of day, day of week, etc.
    return []; // Placeholder
  }

  private async analyzeUserJourneyPatterns(): Promise<any[]> {
    // Analyze common user journey patterns
    return []; // Placeholder
  }

  private async storeLearningInsights(insights: any[]): Promise<void> {
    if (supabase) {
      await supabase
        .from('learning_insights')
        .insert({
          insights,
          generated_at: new Date().toISOString()
        });
    }
  }

  private async storeAnalysisReport(report: any): Promise<void> {
    if (supabase) {
      await supabase
        .from('analysis_reports')
        .insert({
          report,
          generated_at: new Date().toISOString()
        });
    }
  }

  private async saveUpdateRecord(updateRecord: LearningUpdate): Promise<void> {
    if (supabase) {
      await supabase
        .from(SUPABASE_TABLES.LEARNING_UPDATES)
        .insert({
          update_id: updateRecord.id,
          update_type: updateRecord.updateType,
          status: updateRecord.status,
          scheduled_at: updateRecord.scheduledAt.toISOString(),
          completed_at: updateRecord.completedAt?.toISOString(),
          metadata: updateRecord.metadata
        });
    }
  }

  private getNextWeeklyRun(): Date {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextWeek.setHours(2, 0, 0, 0); // Run at 2 AM
    return nextWeek;
  }

  private calculateNextRun(frequency: PipelineSchedule['frequency']): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(1, 0, 0, 0); // Run at 1 AM daily
        return tomorrow;
      case 'weekly':
        return this.getNextWeeklyRun();
      case 'monthly':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 3, 0, 0, 0);
        return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

export const learningPipelineService = new LearningPipelineService();
export { LearningPipelineService };