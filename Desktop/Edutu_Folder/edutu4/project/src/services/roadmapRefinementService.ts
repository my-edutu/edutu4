// Roadmap Refinement Service - Learns from User Completion Patterns

import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { supabase } from '../config/supabase';
import { userActivityService } from './userActivityService';
import { Goal } from '../types/common';
import { UserEngagementMetrics, LearningPattern } from '../types/userActivity';

interface TaskDifficulty {
  taskId: string;
  taskTitle: string;
  category: string;
  averageCompletionTime: number;
  completionRate: number;
  delayRate: number;
  skipRate: number;
  averageDifficultyRating: number;
  commonBottlenecks: string[];
  suggestedPrerequisites: string[];
  optimalPosition: number; // Where in roadmap this task should be
}

interface RoadmapPattern {
  roadmapType: string;
  category: string;
  totalAnalyzedUsers: number;
  patterns: {
    commonPaths: Array<{
      sequence: string[];
      completionRate: number;
      averageTime: number;
      userCount: number;
    }>;
    bottleneckTasks: TaskDifficulty[];
    skipPatterns: Array<{
      taskId: string;
      skipRate: number;
      commonReasons: string[];
    }>;
    optimalSequencing: string[];
    personalizedAdjustments: Array<{
      userProfile: string;
      adjustments: string[];
    }>;
  };
}

interface RoadmapRecommendation {
  roadmapId: string;
  userId: string;
  adjustments: {
    tasksToRemove: string[];
    tasksToAdd: Array<{
      title: string;
      description: string;
      position: number;
      reasoning: string;
    }>;
    sequenceChanges: Array<{
      taskId: string;
      newPosition: number;
      reasoning: string;
    }>;
    difficultyAdjustments: Array<{
      taskId: string;
      adjustedDifficulty: 'easier' | 'harder';
      reasoning: string;
    }>;
  };
  confidence: number;
  lastUpdated: Date;
}

class RoadmapRefinementService {
  private roadmapPatterns = new Map<string, RoadmapPattern>();
  private taskDifficultyCache = new Map<string, TaskDifficulty>();
  private patternsLastUpdated = 0;
  private readonly PATTERN_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

  /**
   * Analyze roadmap completion patterns across all users
   */
  async analyzeRoadmapPatterns(): Promise<void> {
    try {
      console.log('Starting roadmap pattern analysis...');

      // Get all roadmaps
      const roadmaps = await this.getAllRoadmaps();
      
      for (const roadmap of roadmaps) {
        const pattern = await this.analyzeRoadmapPattern(roadmap);
        this.roadmapPatterns.set(`${roadmap.category}_${roadmap.difficulty}`, pattern);
      }

      this.patternsLastUpdated = Date.now();
      console.log(`Analyzed patterns for ${roadmaps.length} roadmap types`);
    } catch (error) {
      console.error('Error analyzing roadmap patterns:', error);
    }
  }

  /**
   * Get personalized roadmap recommendations for a user
   */
  async getPersonalizedRoadmapRecommendations(
    userId: string,
    roadmapId: string
  ): Promise<RoadmapRecommendation | null> {
    try {
      // Get user's learning patterns and engagement metrics
      const userPatterns = await userActivityService.identifyLearningPatterns(userId);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const metrics = await userActivityService.getUserEngagementMetrics(
        userId,
        'monthly',
        thirtyDaysAgo,
        new Date()
      );

      if (!metrics) return null;

      // Get roadmap details
      const roadmap = await this.getRoadmapById(roadmapId);
      if (!roadmap) return null;

      // Get relevant patterns
      const patternKey = `${roadmap.category}_${roadmap.difficulty}`;
      let pattern = this.roadmapPatterns.get(patternKey);
      
      if (!pattern || this.isPatternStale()) {
        await this.analyzeRoadmapPatterns();
        pattern = this.roadmapPatterns.get(patternKey);
      }

      if (!pattern) return null;

      // Generate personalized recommendations
      const recommendations = await this.generatePersonalizedAdjustments(
        roadmap,
        pattern,
        userPatterns,
        metrics
      );

      return {
        roadmapId,
        userId,
        adjustments: recommendations,
        confidence: this.calculateRecommendationConfidence(pattern, metrics),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting personalized roadmap recommendations:', error);
      return null;
    }
  }

  /**
   * Update roadmap based on continuous learning
   */
  async updateRoadmapFromLearning(
    roadmapId: string,
    learningInsights: {
      commonBottlenecks: string[];
      highSkipTasks: string[];
      successfulSequences: string[][];
      userFeedback: Array<{
        taskId: string;
        feedback: string;
        rating: number;
      }>;
    }
  ): Promise<void> {
    try {
      const roadmap = await this.getRoadmapById(roadmapId);
      if (!roadmap) return;

      // Apply learning insights to roadmap structure
      const updatedRoadmap = await this.applyLearningInsights(roadmap, learningInsights);

      // Save updated roadmap (would typically update in database)
      console.log('Updated roadmap with learning insights:', {
        roadmapId,
        updatedRoadmap,
        changes: {
          bottlenecksAddressed: learningInsights.commonBottlenecks.length,
          tasksReordered: learningInsights.successfulSequences.length,
          feedbackIncorporated: learningInsights.userFeedback.length
        }
      });

      // Store learning insights in Supabase for future analysis
      if (supabase) {
        await supabase
          .from('roadmap_learning_insights')
          .upsert({
            roadmap_id: roadmapId,
            insights: learningInsights,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating roadmap from learning:', error);
    }
  }

  /**
   * Identify bottleneck tasks that users frequently struggle with
   */
  async identifyBottleneckTasks(category?: string): Promise<TaskDifficulty[]> {
    try {
      const bottlenecks: TaskDifficulty[] = [];

      // Analyze task completion data across all users
      const taskAnalysis = await this.analyzeTaskCompletionAcrossUsers(category);

      for (const [taskId, analysis] of taskAnalysis) {
        if (analysis.delayRate > 0.3 || analysis.skipRate > 0.2) { // High delay/skip rates
          bottlenecks.push({
            taskId,
            taskTitle: analysis.taskTitle,
            category: analysis.category,
            averageCompletionTime: analysis.averageCompletionTime,
            completionRate: analysis.completionRate,
            delayRate: analysis.delayRate,
            skipRate: analysis.skipRate,
            averageDifficultyRating: analysis.averageDifficultyRating,
            commonBottlenecks: analysis.commonReasons,
            suggestedPrerequisites: analysis.suggestedPrerequisites,
            optimalPosition: analysis.optimalPosition
          });
        }
      }

      return bottlenecks.sort((a, b) => (b.delayRate + b.skipRate) - (a.delayRate + a.skipRate));
    } catch (error) {
      console.error('Error identifying bottleneck tasks:', error);
      return [];
    }
  }

  /**
   * Get roadmap optimization suggestions based on completion data
   */
  async getRoadmapOptimizations(roadmapType: string): Promise<{
    sequenceOptimizations: Array<{
      currentSequence: string[];
      suggestedSequence: string[];
      expectedImprovement: number;
      reasoning: string;
    }>;
    taskOptimizations: Array<{
      taskId: string;
      optimization: 'remove' | 'simplify' | 'split' | 'reorder';
      reasoning: string;
      expectedImpact: number;
    }>;
    prerequisitesSuggestions: Array<{
      taskId: string;
      suggestedPrerequisites: string[];
      reasoning: string;
    }>;
  }> {
    try {
      // Get completion patterns for this roadmap type
      const completionData = await this.getCompletionPatternsForRoadmapType(roadmapType);
      
      // Analyze for optimizations
      const sequenceOptimizations = await this.analyzeSequenceOptimizations(completionData);
      const taskOptimizations = await this.analyzeTaskOptimizations(completionData);
      const prerequisitesSuggestions = await this.analyzePrerequisites(completionData);

      return {
        sequenceOptimizations,
        taskOptimizations,
        prerequisitesSuggestions
      };
    } catch (error) {
      console.error('Error getting roadmap optimizations:', error);
      return {
        sequenceOptimizations: [],
        taskOptimizations: [],
        prerequisitesSuggestions: []
      };
    }
  }

  /**
   * Private helper methods
   */

  private async getAllRoadmaps(): Promise<Goal[]> {
    try {
      const q = query(
        collection(db, 'goals'),
        where('type', '==', 'roadmap'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
      return [];
    }
  }

  private async getRoadmapById(roadmapId: string): Promise<Goal | null> {
    try {
      // This would fetch from your goals/roadmaps collection
      const roadmaps = await this.getAllRoadmaps();
      return roadmaps.find(r => r.id === roadmapId) || null;
    } catch (error) {
      console.error('Error fetching roadmap by ID:', error);
      return null;
    }
  }

  private async analyzeRoadmapPattern(roadmap: Goal): Promise<RoadmapPattern> {
    // Analyze completion patterns for this specific roadmap
    const pattern: RoadmapPattern = {
      roadmapType: roadmap.type || 'general',
      category: roadmap.category || 'general',
      totalAnalyzedUsers: 0,
      patterns: {
        commonPaths: [],
        bottleneckTasks: [],
        skipPatterns: [],
        optimalSequencing: [],
        personalizedAdjustments: []
      }
    };

    // This would involve complex analysis of user completion data
    // For now, return a basic structure
    return pattern;
  }

  private async analyzeTaskCompletionAcrossUsers(category?: string): Promise<Map<string, any>> {
    const taskAnalysis = new Map();

    try {
      // Query user activities for task completions
      const q = query(
        collection(db, 'userActivities'),
        where('activityType', 'in', ['roadmap_task_completed', 'roadmap_task_delayed', 'roadmap_task_skipped']),
        orderBy('timestamp', 'desc'),
        limit(5000)
      );

      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map(doc => doc.data());

      // Group by task ID and analyze
      const taskGroups = new Map<string, any[]>();
      activities.forEach(activity => {
        const taskId = activity.details?.taskId;
        if (taskId) {
          if (!taskGroups.has(taskId)) {
            taskGroups.set(taskId, []);
          }
          taskGroups.get(taskId)!.push(activity);
        }
      });

      // Analyze each task
      taskGroups.forEach((taskActivities, taskId) => {
        const completed = taskActivities.filter(a => a.activityType === 'roadmap_task_completed');
        const delayed = taskActivities.filter(a => a.activityType === 'roadmap_task_delayed');
        const skipped = taskActivities.filter(a => a.activityType === 'roadmap_task_skipped');
        const total = taskActivities.length;

        const completionTimes = completed
          .map(a => a.details?.completionTime)
          .filter((time): time is number => typeof time === 'number');

        const analysis = {
          taskTitle: taskActivities[0].details?.taskTitle || 'Unknown',
          category: category || 'general',
          completionRate: completed.length / total,
          delayRate: delayed.length / total,
          skipRate: skipped.length / total,
          averageCompletionTime: completionTimes.length > 0 
            ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
            : 0,
          averageDifficultyRating: 3, // Default
          commonReasons: delayed.map(a => a.details?.delayReason).filter(Boolean),
          suggestedPrerequisites: [],
          optimalPosition: 0
        };

        taskAnalysis.set(taskId, analysis);
      });
    } catch (error) {
      console.error('Error analyzing task completion:', error);
    }

    return taskAnalysis;
  }

  private async generatePersonalizedAdjustments(
    roadmap: Goal,
    pattern: RoadmapPattern,
    userPatterns: LearningPattern[],
    metrics: UserEngagementMetrics
  ): Promise<RoadmapRecommendation['adjustments']> {
    const adjustments: RoadmapRecommendation['adjustments'] = {
      tasksToRemove: [],
      tasksToAdd: [],
      sequenceChanges: [],
      difficultyAdjustments: []
    };

    // Analyze user's completion behavior
    const completionPattern = userPatterns.find(p => p.pattern.name === 'task_completion_behavior');
    
    if (completionPattern) {
      const completionRate = completionPattern.pattern.data.completionRate;
      
      // If user has low completion rate, suggest easier tasks or better sequencing
      if (completionRate < 0.7) {
        // Remove commonly skipped tasks for struggling users
        pattern.patterns.skipPatterns
          .filter(skip => skip.skipRate > 0.4)
          .slice(0, 2)
          .forEach(skip => {
            adjustments.tasksToRemove.push(skip.taskId);
          });

        // Add supportive tasks
        adjustments.tasksToAdd.push({
          title: 'Foundation Review',
          description: 'Review key concepts before proceeding',
          position: 1,
          reasoning: 'User shows lower completion rates - adding foundation task for better success'
        });
      }

      // If user has high completion rate, suggest more challenging tasks
      if (completionRate > 0.9) {
        adjustments.tasksToAdd.push({
          title: 'Advanced Challenge',
          description: 'Extended project to showcase mastery',
          position: roadmap.tasks?.length || 5,
          reasoning: 'User shows high completion rates - adding challenge for growth'
        });
      }
    }

    // Adjust based on user's learning velocity
    if (metrics.learningVelocity > 2) { // High velocity learner
      adjustments.sequenceChanges.push({
        taskId: 'intro_task',
        newPosition: 0,
        reasoning: 'Fast learner - can skip some introductory content'
      });
    } else if (metrics.learningVelocity < 0.5) { // Slow velocity learner
      adjustments.tasksToAdd.push({
        title: 'Practice Session',
        description: 'Additional practice before moving forward',
        position: 2,
        reasoning: 'Slower learning pace - adding practice session for reinforcement'
      });
    }

    return adjustments;
  }

  private calculateRecommendationConfidence(
    pattern: RoadmapPattern,
    metrics: UserEngagementMetrics
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on pattern data quality
    if (pattern.totalAnalyzedUsers > 100) confidence += 0.2;
    if (pattern.totalAnalyzedUsers > 500) confidence += 0.1;

    // Increase confidence based on user data quality
    if (metrics.tasksCompleted > 10) confidence += 0.1;
    if (metrics.questionsAsked > 5) confidence += 0.05;
    if (metrics.averageResponseRating > 4) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private async applyLearningInsights(roadmap: Goal, _insights: unknown): Promise<Goal> {
    // This would apply the learning insights to update the roadmap
    // Implementation would depend on your roadmap structure
    return roadmap;
  }

  private async getCompletionPatternsForRoadmapType(_roadmapType: string): Promise<unknown> {
    // Fetch completion patterns from database
    return {};
  }

  private async analyzeSequenceOptimizations(_completionData: unknown): Promise<unknown[]> {
    // Analyze optimal task sequences
    return [];
  }

  private async analyzeTaskOptimizations(_completionData: unknown): Promise<unknown[]> {
    // Analyze task optimization opportunities
    return [];
  }

  private async analyzePrerequisites(_completionData: unknown): Promise<unknown[]> {
    // Analyze prerequisite requirements
    return [];
  }

  private isPatternStale(): boolean {
    return Date.now() - this.patternsLastUpdated > this.PATTERN_CACHE_DURATION;
  }
}

export const roadmapRefinementService = new RoadmapRefinementService();
export { RoadmapRefinementService };