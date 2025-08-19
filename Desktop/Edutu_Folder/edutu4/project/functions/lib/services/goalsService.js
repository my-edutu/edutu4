"use strict";
/**
 * Goals Service Layer
 * Business logic and AI integration for the Edutu Goals System
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalsService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const admin = __importStar(require("firebase-admin"));
const goalsFirebase_1 = require("../utils/goalsFirebase");
const firebase_1 = require("../utils/firebase");
// Initialize Gemini AI
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
class GoalsService {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    // Template Operations
    async getTemplatesByCategory(category) {
        const templates = await (0, goalsFirebase_1.getAllGoalTemplates)();
        if (category) {
            return templates.filter(template => template.category === category);
        }
        return templates;
    }
    async getRecommendedTemplates(userId) {
        try {
            const userProfile = await (0, firebase_1.getUserProfile)(userId);
            const userGoals = await (0, goalsFirebase_1.getUserGoals)(userId);
            const allTemplates = await (0, goalsFirebase_1.getAllGoalTemplates)();
            // AI-powered recommendations based on user profile and goals
            const recommendations = await this.generateTemplateRecommendations(userProfile, userGoals, allTemplates);
            return recommendations;
        }
        catch (error) {
            console.error('Error getting recommended templates:', error);
            // Fallback to popular templates
            const templates = await (0, goalsFirebase_1.getAllGoalTemplates)();
            return templates.filter(template => template.featured).slice(0, 5);
        }
    }
    // Marketplace Operations
    async searchGoals(params) {
        const results = await (0, goalsFirebase_1.searchMarketplaceGoals)(params);
        // Add AI-powered search suggestions if query provided
        if (params.query && results.goals.length < 10) {
            const suggestions = await this.generateSearchSuggestions(params.query, results.goals);
            return Object.assign(Object.assign({}, results), { suggestions });
        }
        return results;
    }
    async getFeaturedGoals() {
        return (0, goalsFirebase_1.getFeaturedMarketplaceGoals)();
    }
    async getTrendingGoals() {
        const params = {
            sortBy: 'trending',
            limit: 10
        };
        const results = await (0, goalsFirebase_1.searchMarketplaceGoals)(params);
        return results.goals;
    }
    // User Goal Operations
    async getUserGoals(userId, status) {
        return (0, goalsFirebase_1.getUserGoals)(userId, status);
    }
    async getUserGoalById(goalId) {
        return (0, goalsFirebase_1.getUserGoalById)(goalId);
    }
    async createGoal(userId, request) {
        // If creating a custom goal, enhance it with AI
        if (request.sourceType === 'custom' && request.title && request.description) {
            const enhancedRoadmap = await this.generateCustomGoalRoadmap(request.title, request.description, request.category || 'personal', userId);
            request.customRoadmap = enhancedRoadmap;
        }
        return (0, goalsFirebase_1.createUserGoal)(userId, request);
    }
    async getUserDashboard(userId) {
        const [activeGoals, completedGoals, recommendations] = await Promise.all([
            (0, goalsFirebase_1.getUserGoals)(userId, 'active'),
            (0, goalsFirebase_1.getUserGoals)(userId, 'completed'),
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
    async updateProgress(goalId, userId, milestoneId, subtaskId, isCompleted = true, timeSpent, sessionNotes) {
        const result = await (0, goalsFirebase_1.updateGoalProgress)(goalId, userId, {
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
        return Object.assign(Object.assign({}, result), { achievements });
    }
    // AI-Powered Features
    async generateCustomGoalRoadmap(title, description, category, userId) {
        try {
            const userProfile = await (0, firebase_1.getUserProfile)(userId);
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
            return parsed.milestones.map((milestone, index) => ({
                id: `milestone_${Date.now()}_${index}`,
                title: milestone.title,
                description: milestone.description,
                order: index + 1,
                estimatedDuration: milestone.estimatedDuration || 7,
                prerequisites: milestone.prerequisites || [],
                resources: milestone.resources.map((resource, rIndex) => (Object.assign({ id: `resource_${Date.now()}_${rIndex}` }, resource))),
                isCompleted: false,
                subtasks: milestone.subtasks.map((subtask, sIndex) => ({
                    id: `subtask_${Date.now()}_${sIndex}`,
                    title: subtask.title,
                    description: subtask.description,
                    isCompleted: false,
                    order: sIndex + 1
                })),
                points: milestone.points || 10
            }));
        }
        catch (error) {
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
    async generateTemplateRecommendations(userProfile, userGoals, allTemplates) {
        var _a;
        try {
            const prompt = `
Based on the user profile and current goals, recommend the most suitable goal templates.

User Profile:
- Field of study: ${userProfile.fieldOfStudy || 'Not specified'}
- Experience level: ${userProfile.experienceLevel || 'Beginner'}
- Interests: ${((_a = userProfile.interests) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'Not specified'}
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
                .map((id) => allTemplates.find(t => t.id === id))
                .filter(Boolean)
                .slice(0, 5);
        }
        catch (error) {
            console.error('Error generating template recommendations:', error);
            // Fallback to featured templates
            return allTemplates.filter(t => t.featured).slice(0, 5);
        }
    }
    async generateSearchSuggestions(query, currentResults) {
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
        }
        catch (error) {
            console.error('Error generating search suggestions:', error);
            return [];
        }
    }
    async getPersonalizedRecommendations(userId) {
        try {
            const [userProfile, userGoals] = await Promise.all([
                (0, firebase_1.getUserProfile)(userId),
                (0, goalsFirebase_1.getUserGoals)(userId)
            ]);
            // Get trending goals in categories user hasn't explored
            const exploredCategories = new Set(userGoals.map(g => g.category));
            const searchParams = {
                sortBy: 'trending',
                limit: 20
            };
            const trendingResults = await (0, goalsFirebase_1.searchMarketplaceGoals)(searchParams);
            // Filter for unexplored categories
            const recommendations = trendingResults.goals
                .filter(goal => !exploredCategories.has(goal.category))
                .slice(0, 5);
            return recommendations;
        }
        catch (error) {
            console.error('Error getting personalized recommendations:', error);
            return [];
        }
    }
    async calculateWeeklyStats(userId) {
        try {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const db = admin.firestore();
            const sessionsSnapshot = await db.collection('goalSessions')
                .where('userId', '==', userId)
                .where('startTime', '>', weekAgo)
                .get();
            const sessions = sessionsSnapshot.docs.map(doc => doc.data());
            const timeSpent = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
            const tasksCompleted = sessions.reduce((sum, session) => { var _a; return sum + (((_a = session.tasksCompleted) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0);
            // Calculate streak (simplified)
            const streakDays = await this.calculateUserStreak(userId);
            return {
                timeSpent,
                tasksCompleted,
                streakDays
            };
        }
        catch (error) {
            console.error('Error calculating weekly stats:', error);
            return { timeSpent: 0, tasksCompleted: 0, streakDays: 0 };
        }
    }
    async calculateUserStreak(userId) {
        var _a;
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
                const updatedAt = (_a = doc.data().updatedAt) === null || _a === void 0 ? void 0 : _a.toDate();
                if (updatedAt) {
                    const daysDiff = Math.floor((currentDate.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000));
                    if (daysDiff <= 1) {
                        streak++;
                        currentDate = updatedAt;
                    }
                    else {
                        break;
                    }
                }
            }
            return streak;
        }
        catch (error) {
            console.error('Error calculating streak:', error);
            return 0;
        }
    }
    async checkForAchievements(userId, goal) {
        const achievements = [];
        // Check for milestone achievements
        if (goal.progress === 25)
            achievements.push('Quarter Way There!');
        if (goal.progress === 50)
            achievements.push('Halfway Hero!');
        if (goal.progress === 75)
            achievements.push('Almost There!');
        if (goal.progress === 100)
            achievements.push('Goal Crusher!');
        // Check for streak achievements
        const streak = await this.calculateUserStreak(userId);
        if (streak === 7)
            achievements.push('Week Warrior!');
        if (streak === 30)
            achievements.push('Monthly Master!');
        return achievements;
    }
    isProgressStalling(goal) {
        const daysSinceUpdate = Math.floor((Date.now() - goal.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
        return daysSinceUpdate > 7 && goal.progress < 50;
    }
    async generateEncouragementMessage(userId, goal) {
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
        }
        catch (error) {
            console.error('Error generating encouragement message:', error);
        }
    }
    // Marketplace submission
    async submitToMarketplace(userId, goalId, additionalDescription) {
        return (0, goalsFirebase_1.submitGoalToMarketplace)(userId, {
            goalId,
            makePublic: true,
            additionalDescription
        });
    }
    // Analytics helpers
    async getGoalAnalytics(goalId) {
        try {
            const db = admin.firestore();
            const sessionsSnapshot = await db.collection('goalSessions')
                .where('goalId', '==', goalId)
                .get();
            const sessions = sessionsSnapshot.docs.map(doc => doc.data());
            const totalSessions = sessions.length;
            const totalTimeSpent = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
            const averageSessionDuration = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;
            const goal = await (0, goalsFirebase_1.getUserGoalById)(goalId);
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
        }
        catch (error) {
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
exports.GoalsService = GoalsService;
//# sourceMappingURL=goalsService.js.map