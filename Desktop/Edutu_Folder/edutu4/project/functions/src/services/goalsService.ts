/**
 * Goals Service Layer
 * Business logic and AI integration for the Edutu Goals System
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as admin from 'firebase-admin';
import {
  GoalTemplate,
  MarketplaceGoal,
  UserGoal,
  GoalMilestone,
  SubTask,
  Resource,
  CreateGoalRequest,
  SearchGoalsRequest
} from '../schemas/goalsSchema';
import {
  getAllGoalTemplates,
  getGoalTemplateById,
  searchMarketplaceGoals,
  getMarketplaceGoalById,
  getFeaturedMarketplaceGoals,
  createUserGoal,
  getUserGoals,
  getUserGoalById,
  updateGoalProgress,
  submitGoalToMarketplace,
  logGoalSession
} from '../utils/goalsFirebase';
import { getUserProfile } from '../utils/firebase';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GoalsService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Template Operations
  async getTemplatesByCategory(category?: string): Promise<GoalTemplate[]> {
    const templates = await getAllGoalTemplates();
    if (category) {
      return templates.filter(template => template.category === category);
    }
    return templates;
  }

  async getRecommendedTemplates(userId: string): Promise<GoalTemplate[]> {
    try {
      const userProfile = await getUserProfile(userId);
      const userGoals = await getUserGoals(userId);
      const allTemplates = await getAllGoalTemplates();

      // AI-powered recommendations based on user profile and goals
      const recommendations = await this.generateTemplateRecommendations(
        userProfile,
        userGoals,
        allTemplates
      );

      return recommendations;
    } catch (error) {
      console.error('Error getting recommended templates:', error);
      // Fallback to popular templates
      const templates = await getAllGoalTemplates();
      return templates.filter(template => template.featured).slice(0, 5);
    }
  }

  // Marketplace Operations
  async searchGoals(params: SearchGoalsRequest): Promise<{
    goals: MarketplaceGoal[];
    total: number;
    hasMore: boolean;
    suggestions?: string[];
  }> {
    const results = await searchMarketplaceGoals(params);
    
    // Add AI-powered search suggestions if query provided
    if (params.query && results.goals.length < 10) {
      const suggestions = await this.generateSearchSuggestions(params.query, results.goals);
      return { ...results, suggestions };
    }

    return results;
  }

  async getFeaturedGoals(): Promise<MarketplaceGoal[]> {
    return getFeaturedMarketplaceGoals();
  }

  async getTrendingGoals(): Promise<MarketplaceGoal[]> {
    const params: SearchGoalsRequest = {
      sortBy: 'trending',
      limit: 10
    };
    const results = await searchMarketplaceGoals(params);
    return results.goals;
  }

  // User Goal Operations
  async getUserGoals(userId: string, status?: string): Promise<UserGoal[]> {
    return getUserGoals(userId, status);
  }

  async getUserGoalById(goalId: string): Promise<UserGoal | null> {
    return getUserGoalById(goalId);
  }

  async createGoal(userId: string, request: CreateGoalRequest): Promise<UserGoal> {
    // If creating a custom goal, enhance it with AI
    if (request.sourceType === 'custom' && request.title && request.description) {
      const enhancedRoadmap = await this.generateCustomGoalRoadmap(
        request.title,
        request.description,
        request.category || 'personal',
        userId
      );
      request.customRoadmap = enhancedRoadmap;
    }

    return createUserGoal(userId, request);
  }

  async getUserDashboard(userId: string): Promise<{
    activeGoals: UserGoal[];
    completedGoals: UserGoal[];
    totalProgress: number;
    weeklyStats: {
      timeSpent: number;
      tasksCompleted: number;
      streakDays: number;
    };
    recommendations: MarketplaceGoal[];
  }> {
    const [activeGoals, completedGoals, recommendations] = await Promise.all([
      getUserGoals(userId, 'active'),
      getUserGoals(userId, 'completed'),
      this.getPersonalizedRecommendations(userId)
    ]);

    // Calculate overall progress
    const totalProgress = activeGoals.length > 0 
      ? Math.round(activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length)
      : 0;

    // Calculate weekly stats
    const weeklyStats = await this.calculateWeeklyStats(userId);

    return {
      activeGoals,
      completedGoals: completedGoals.slice(0, 5), // Latest 5 completed
      totalProgress,
      weeklyStats,
      recommendations
    };
  }

  async updateProgress(
    goalId: string,
    userId: string,
    milestoneId: string,
    subtaskId?: string,
    isCompleted: boolean = true,
    timeSpent?: number,
    sessionNotes?: string
  ): Promise<{ progress: number; goal: UserGoal; achievements?: string[] }> {
    const result = await updateGoalProgress(goalId, userId, {
      milestoneId,
      subtaskId,
      isCompleted,
      timeSpent,
      sessionNotes
    });

    // Check for achievements
    const achievements = await this.checkForAchievements(userId, result.goal);

    // Generate AI encouragement or tips if progress is stalling
    if (result.goal.progress < 50 && this.isProgressStalling(result.goal)) {
      await this.generateEncouragementMessage(userId, result.goal);
    }

    return {
      ...result,
      achievements
    };
  }

  // AI-Powered Features
  async generateCustomGoalRoadmap(
    title: string,
    description: string,
    category: string,
    userId: string
  ): Promise<GoalMilestone[]> {
    try {
      const userProfile = await getUserProfile(userId);
      
      const prompt = `
Create a detailed roadmap for achieving this goal:
Title: ${title}
Description: ${description}
Category: ${category}

User Context:
- Field of study: ${userProfile.fieldOfStudy || 'General'}
- Experience level: ${userProfile.experienceLevel || 'Beginner'}
- Available time per week: ${userProfile.availableHours || '5-10'} hours

Please create a roadmap with 4-8 milestones, each containing 3-6 subtasks.
Each milestone should have:
- A clear title and description
- Estimated duration in days
- Relevant resources (articles, courses, tools)
- Prerequisites (if any)
- Subtasks that are specific and actionable

Format the response as JSON with this structure:
{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "estimatedDuration": number,
      "prerequisites": [],
      "subtasks": [
        {
          "title": "string",
          "description": "string",
          "order": number
        }
      ],
      "resources": [
        {
          "type": "article|video|course|book|tool|website",
          "title": "string",
          "url": "string",
          "description": "string",
          "isFree": boolean
        }
      ],
      "points": number
    }
  ]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse the JSON response
      const parsed = JSON.parse(response.replace(/```json\n?|```/g, ''));
      
      return parsed.milestones.map((milestone: any, index: number) => ({
        id: `milestone_${Date.now()}_${index}`,
        title: milestone.title,
        description: milestone.description,
        order: index + 1,
        estimatedDuration: milestone.estimatedDuration || 7,
        prerequisites: milestone.prerequisites || [],
        resources: milestone.resources.map((resource: any, rIndex: number) => ({
          id: `resource_${Date.now()}_${rIndex}`,
          ...resource
        })),
        isCompleted: false,
        subtasks: milestone.subtasks.map((subtask: any, sIndex: number) => ({
          id: `subtask_${Date.now()}_${sIndex}`,
          title: subtask.title,
          description: subtask.description,
          isCompleted: false,
          order: sIndex + 1
        })),
        points: milestone.points || 10
      }));
    } catch (error) {
      console.error('Error generating custom roadmap:', error);
      
      // Fallback roadmap
      return [{
        id: `milestone_${Date.now()}_0`,
        title: 'Getting Started',
        description: 'Initial steps to begin your journey',
        order: 1,
        estimatedDuration: 7,
        prerequisites: [],
        resources: [],
        isCompleted: false,
        subtasks: [
          {
            id: `subtask_${Date.now()}_0`,
            title: 'Research and planning',
            description: 'Understand the requirements and create a plan',
            isCompleted: false,
            order: 1
          },
          {
            id: `subtask_${Date.now()}_1`,
            title: 'Set up workspace',
            description: 'Prepare necessary tools and environment',
            isCompleted: false,
            order: 2
          }
        ],
        points: 10
      }];
    }
  }

  async generateTemplateRecommendations(
    userProfile: any,
    userGoals: UserGoal[],
    allTemplates: GoalTemplate[]
  ): Promise<GoalTemplate[]> {
    try {
      const prompt = `
Based on the user profile and current goals, recommend the most suitable goal templates.

User Profile:
- Field of study: ${userProfile.fieldOfStudy || 'Not specified'}
- Experience level: ${userProfile.experienceLevel || 'Beginner'}
- Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
- Goals completed: ${userGoals.filter(g => g.status === 'completed').length}
- Active goals: ${userGoals.filter(g => g.status === 'active').length}

Current Active Goal Categories: ${userGoals
  .filter(g => g.status === 'active')
  .map(g => g.category)
  .join(', ')}

Available Templates: ${allTemplates.map(t => `${t.title} (${t.category})`).join(', ')}

Return the IDs of the 5 most relevant templates in order of relevance.
Consider diversity of categories and avoid recommending templates similar to active goals.
Format as JSON: {"recommendedIds": ["id1", "id2", "id3", "id4", "id5"]}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const parsed = JSON.parse(response.replace(/```json\n?|```/g, ''));
      
      return parsed.recommendedIds
        .map((id: string) => allTemplates.find(t => t.id === id))
        .filter(Boolean)
        .slice(0, 5);
    } catch (error) {
      console.error('Error generating template recommendations:', error);
      // Fallback to featured templates
      return allTemplates.filter(t => t.featured).slice(0, 5);
    }
  }

  async generateSearchSuggestions(query: string, currentResults: MarketplaceGoal[]): Promise<string[]> {
    try {
      const prompt = `
The user searched for: "${query}"
Current results returned ${currentResults.length} goals.

Generate 3-5 alternative search suggestions that might help the user find more relevant goals.
Consider:
- Related terms and synonyms
- Broader or narrower search terms
- Different approaches to the same objective
- Popular goal categories

Format as JSON: {"suggestions": ["suggestion1", "suggestion2", "suggestion3"]}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const parsed = JSON.parse(response.replace(/```json\n?|```/g, ''));
      
      return parsed.suggestions || [];
    } catch (error) {
      console.error('Error generating search suggestions:', error);
      return [];
    }
  }

  async getPersonalizedRecommendations(userId: string): Promise<MarketplaceGoal[]> {
    try {
      const [userProfile, userGoals] = await Promise.all([
        getUserProfile(userId),
        getUserGoals(userId)
      ]);

      // Get trending goals in categories user hasn't explored
      const exploredCategories = new Set(userGoals.map(g => g.category));
      const searchParams: SearchGoalsRequest = {
        sortBy: 'trending',
        limit: 20
      };
      
      const trendingResults = await searchMarketplaceGoals(searchParams);
      
      // Filter for unexplored categories
      const recommendations = trendingResults.goals
        .filter(goal => !exploredCategories.has(goal.category))
        .slice(0, 5);

      return recommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  private async calculateWeeklyStats(userId: string): Promise<{
    timeSpent: number;
    tasksCompleted: number;
    streakDays: number;
  }> {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const db = admin.firestore();
      
      const sessionsSnapshot = await db.collection('goalSessions')
        .where('userId', '==', userId)
        .where('startTime', '>', weekAgo)
        .get();

      const sessions = sessionsSnapshot.docs.map(doc => doc.data());
      const timeSpent = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const tasksCompleted = sessions.reduce((sum, session) => sum + (session.tasksCompleted?.length || 0), 0);
      
      // Calculate streak (simplified)
      const streakDays = await this.calculateUserStreak(userId);

      return {
        timeSpent,
        tasksCompleted,
        streakDays
      };
    } catch (error) {
      console.error('Error calculating weekly stats:', error);
      return { timeSpent: 0, tasksCompleted: 0, streakDays: 0 };
    }
  }

  private async calculateUserStreak(userId: string): Promise<number> {
    // Simplified streak calculation
    // In production, this would track daily activity more comprehensively
    try {
      const db = admin.firestore();
      const recentGoals = await db.collection('userGoals')
        .where('userId', '==', userId)
        .where('updatedAt', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .orderBy('updatedAt', 'desc')
        .limit(30)
        .get();

      let streak = 0;
      let currentDate = new Date();
      
      for (const doc of recentGoals.docs) {
        const updatedAt = doc.data().updatedAt?.toDate();
        if (updatedAt) {
          const daysDiff = Math.floor((currentDate.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000));
          if (daysDiff <= 1) {
            streak++;
            currentDate = updatedAt;
          } else {
            break;
          }
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }

  private async checkForAchievements(userId: string, goal: UserGoal): Promise<string[]> {
    const achievements: string[] = [];

    // Check for milestone achievements
    if (goal.progress === 25) achievements.push('Quarter Way There!');
    if (goal.progress === 50) achievements.push('Halfway Hero!');
    if (goal.progress === 75) achievements.push('Almost There!');
    if (goal.progress === 100) achievements.push('Goal Crusher!');

    // Check for streak achievements
    const streak = await this.calculateUserStreak(userId);
    if (streak === 7) achievements.push('Week Warrior!');
    if (streak === 30) achievements.push('Monthly Master!');

    return achievements;
  }

  private isProgressStalling(goal: UserGoal): boolean {
    const daysSinceUpdate = Math.floor(
      (Date.now() - goal.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    return daysSinceUpdate > 7 && goal.progress < 50;
  }

  private async generateEncouragementMessage(userId: string, goal: UserGoal): Promise<void> {
    try {
      const prompt = `
Generate an encouraging and motivational message for a user who seems to be struggling with their goal.

Goal: ${goal.title}
Progress: ${goal.progress}%
Days since last update: ${Math.floor((Date.now() - goal.updatedAt.getTime()) / (24 * 60 * 60 * 1000))}

The message should be:
- Encouraging and supportive
- Offer specific actionable advice
- Be concise (2-3 sentences)
- Acknowledge their effort so far

Format as JSON: {"message": "encouraging message here"}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const parsed = JSON.parse(response.replace(/```json\n?|```/g, ''));
      
      // In a real implementation, this would create a notification
      console.log(`Encouragement for user ${userId}:`, parsed.message);
    } catch (error) {
      console.error('Error generating encouragement message:', error);
    }
  }

  // Marketplace submission
  async submitToMarketplace(userId: string, goalId: string, additionalDescription?: string): Promise<string> {
    return submitGoalToMarketplace(userId, {
      goalId,
      makePublic: true,
      additionalDescription
    });
  }

  // Analytics helpers
  async getGoalAnalytics(goalId: string): Promise<{
    totalSessions: number;
    totalTimeSpent: number;
    averageSessionDuration: number;
    completionRate: number;
    weeklyProgress: number[];
  }> {
    try {
      const db = admin.firestore();
      const sessionsSnapshot = await db.collection('goalSessions')
        .where('goalId', '==', goalId)
        .get();

      const sessions = sessionsSnapshot.docs.map(doc => doc.data());
      const totalSessions = sessions.length;
      const totalTimeSpent = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const averageSessionDuration = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;

      const goal = await getUserGoalById(goalId);
      const completionRate = goal ? goal.progress : 0;

      // Calculate weekly progress (simplified)
      const weeklyProgress = [0, 10, 25, 40, 60, 75, 90]; // Mock data

      return {
        totalSessions,
        totalTimeSpent,
        averageSessionDuration,
        completionRate,
        weeklyProgress
      };
    } catch (error) {
      console.error('Error getting goal analytics:', error);
      return {
        totalSessions: 0,
        totalTimeSpent: 0,
        averageSessionDuration: 0,
        completionRate: 0,
        weeklyProgress: []
      };
    }
  }
}