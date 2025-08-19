/**
 * Goals System Database Schema Definitions
 * Comprehensive TypeScript interfaces for the Edutu Goals System
 */

export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // in weeks
  tags: string[];
  roadmap: GoalMilestone[];
  isPublic: boolean;
  featured: boolean;
  createdBy: string; // system for templates
  createdAt: Date;
  updatedAt: Date;
  version: number;
  metadata: {
    usageCount: number;
    averageRating: number;
    totalRatings: number;
  };
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedDuration: number; // in days
  prerequisites: string[]; // milestone IDs
  resources: Resource[];
  isCompleted: boolean;
  completedAt?: Date;
  subtasks: SubTask[];
  points: number; // gamification
}

export interface SubTask {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: Date;
  order: number;
}

export interface Resource {
  id: string;
  type: 'article' | 'video' | 'course' | 'book' | 'tool' | 'website';
  title: string;
  url?: string;
  description?: string;
  duration?: number; // in minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  isFree: boolean;
}

export interface MarketplaceGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  tags: string[];
  roadmap: GoalMilestone[];
  createdBy: string; // user ID
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  moderationInfo: ModerationInfo;
  metadata: {
    views: number;
    subscriptions: number;
    likes: number;
    ratings: Rating[];
    averageRating: number;
  };
  featured: boolean;
  featuredUntil?: Date;
}

export interface ModerationInfo {
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationNotes?: string;
  rejectionReason?: string;
  flagCount: number;
  flags: Flag[];
}

export interface Flag {
  id: string;
  reportedBy: string;
  reason: 'inappropriate' | 'spam' | 'copyright' | 'inaccurate' | 'other';
  description: string;
  reportedAt: Date;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface Rating {
  userId: string;
  rating: number; // 1-5
  review?: string;
  createdAt: Date;
}

export interface UserGoal {
  id: string;
  userId: string;
  sourceType: 'marketplace' | 'template' | 'custom';
  sourceId?: string; // marketplace goal ID or template ID
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  tags: string[];
  roadmap: GoalMilestone[];
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  settings: GoalSettings;
  statistics: GoalStatistics;
}

export interface GoalSettings {
  isPrivate: boolean;
  reminders: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'custom';
    time?: string; // HH:MM format
    customDays?: number[]; // 0-6 (Sunday-Saturday)
  };
  notifications: {
    milestoneCompleted: boolean;
    weeklyProgress: boolean;
    encouragement: boolean;
  };
}

export interface GoalStatistics {
  timeSpent: number; // in minutes
  sessionsCount: number;
  currentStreak: number; // days
  longestStreak: number; // days
  averageSessionDuration: number; // in minutes
  completionRate: number; // percentage of subtasks completed on time
  pointsEarned: number;
}

export interface GoalSubscription {
  id: string;
  userId: string;
  marketplaceGoalId: string;
  subscribedAt: Date;
  isActive: boolean;
  rating?: number;
  review?: string;
  reviewedAt?: Date;
}

export interface GoalSession {
  id: string;
  userId: string;
  goalId: string;
  milestoneId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  notes?: string;
  tasksCompleted: string[]; // subtask IDs
  mood?: 'excited' | 'motivated' | 'neutral' | 'frustrated' | 'overwhelmed';
  productivityRating?: number; // 1-5
}

export interface AdminModerationQueue {
  id: string;
  type: 'goal_submission' | 'flag_report' | 'user_report';
  itemId: string; // goal ID or user ID
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_review' | 'resolved';
  assignedTo?: string; // admin user ID
  createdAt: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export interface SystemAnalytics {
  id: string;
  date: string; // YYYY-MM-DD
  metrics: {
    totalUsers: number;
    activeUsers: number;
    goalsCreated: number;
    goalsCompleted: number;
    marketplaceSubmissions: number;
    marketplaceApprovals: number;
    averageCompletionRate: number;
    topCategories: Array<{ category: string; count: number }>;
    userEngagement: {
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
      averageSessionDuration: number;
    };
  };
  createdAt: Date;
}

// API Request/Response Types
export interface CreateGoalRequest {
  sourceType: 'marketplace' | 'template' | 'custom';
  sourceId?: string;
  title?: string;
  description?: string;
  category?: string;
  customRoadmap?: Partial<GoalMilestone>[];
  settings?: Partial<GoalSettings>;
}

export interface UpdateGoalProgressRequest {
  milestoneId: string;
  subtaskId?: string;
  isCompleted: boolean;
  sessionNotes?: string;
  timeSpent?: number;
}

export interface SubmitToMarketplaceRequest {
  goalId: string;
  makePublic: boolean;
  additionalDescription?: string;
}

export interface SearchGoalsRequest {
  query?: string;
  category?: string;
  difficulty?: string[];
  tags?: string[];
  duration?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'popularity' | 'rating' | 'recent' | 'trending';
  page?: number;
  limit?: number;
}

export interface ModerationActionRequest {
  action: 'approve' | 'reject' | 'archive' | 'feature' | 'unfeature';
  reason?: string;
  notes?: string;
  featuredUntil?: Date;
}