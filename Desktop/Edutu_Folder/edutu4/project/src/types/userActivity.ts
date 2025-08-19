// User Activity Tracking Types for Continuous Learning Loop

export interface UserActivity {
  id?: string;
  userId: string;
  timestamp: Date;
  sessionId: string;
  activityType: ActivityType;
  details: ActivityDetails;
  metadata?: Record<string, unknown>;
}

export type ActivityType = 
  | 'opportunity_clicked'
  | 'opportunity_saved'
  | 'opportunity_ignored'
  | 'opportunity_applied'
  | 'roadmap_task_completed'
  | 'roadmap_task_delayed'
  | 'roadmap_task_skipped'
  | 'chat_question_asked'
  | 'chat_response_rated'
  | 'goal_created'
  | 'goal_completed'
  | 'search_performed'
  | 'filter_applied'
  | 'profile_updated'
  | 'feedback_provided';

export interface ActivityDetails {
  // Opportunity-related activities
  opportunityId?: string;
  opportunityTitle?: string;
  opportunityCategory?: string;
  clickDuration?: number; // milliseconds spent viewing
  saveReason?: string;
  ignoreReason?: string;
  applicationStatus?: 'started' | 'completed' | 'abandoned';

  // Roadmap-related activities
  roadmapId?: string;
  taskId?: string;
  taskTitle?: string;
  completionTime?: number; // time taken to complete task
  delayReason?: string;
  difficultyRating?: number; // 1-5 scale

  // Chat-related activities
  question?: string;
  responseId?: string;
  responseRating?: number; // 1-5 scale
  responseHelpfulness?: 'very_helpful' | 'somewhat_helpful' | 'not_helpful';
  followUpQuestion?: boolean;

  // Search and filter activities
  searchQuery?: string;
  searchResults?: number;
  filterType?: string;
  filterValue?: string;

  // Goal-related activities
  goalId?: string;
  goalType?: string;
  goalCategory?: string;
  
  // General feedback
  rating?: number;
  comment?: string;
  suggestions?: string[];
}

export interface UserEngagementMetrics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  
  // Engagement metrics
  sessionsCount: number;
  totalTimeSpent: number; // minutes
  averageSessionDuration: number;
  
  // Opportunity engagement
  opportunitiesViewed: number;
  opportunitiesClicked: number;
  opportunitiesSaved: number;
  opportunitiesAppliedTo: number;
  clickThroughRate: number;
  
  // Roadmap engagement
  tasksCompleted: number;
  tasksDelayed: number;
  averageTaskCompletionTime: number;
  roadmapsStarted: number;
  roadmapsCompleted: number;
  
  // Chat engagement
  questionsAsked: number;
  averageResponseRating: number;
  chatSessionsInitiated: number;
  
  // Learning patterns
  preferredCategories: string[];
  activeTimeOfDay: string[];
  learningVelocity: number; // tasks completed per day
  
  // Feedback metrics
  feedbackProvided: number;
  averageSatisfactionScore: number;
}

export interface LearningPattern {
  userId: string;
  patternType: 'preference' | 'behavior' | 'performance';
  pattern: {
    name: string;
    confidence: number; // 0-1 scale
    data: Record<string, unknown>;
    lastUpdated: Date;
  };
}

// Embedding-related types for Supabase vector storage
export interface OpportunityEmbedding {
  id: string;
  opportunityId: string;
  title: string;
  category: string;
  description: string;
  embedding: number[]; // Vector embedding
  metadata: {
    provider: string;
    tags: string[];
    difficulty: string;
    location: string;
    createdAt: Date;
  };
}

export interface UserPreferenceEmbedding {
  id: string;
  userId: string;
  preferencesVector: number[]; // Combined user preferences as vector
  interactionVector: number[]; // User behavior patterns as vector
  successVector?: number[]; // Success patterns if available
  metadata: {
    lastUpdated: Date;
    totalInteractions: number;
    completedApplications: number;
    averageEngagement: number;
  };
}

export interface RecommendationScore {
  opportunityId: string;
  userId: string;
  score: number; // 0-1 similarity score
  factors: {
    preferenceMatch: number;
    behaviorMatch: number;
    successMatch: number;
    recencyBoost: number;
    popularityBoost: number;
  };
  lastCalculated: Date;
}

// Learning loop pipeline types
export interface LearningUpdate {
  id: string;
  updateType: 'recommendations' | 'embeddings' | 'patterns' | 'feedback';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledAt: Date;
  completedAt?: Date;
  metadata: {
    affectedUsers?: number;
    processedActivities?: number;
    updatedRecommendations?: number;
    errors?: string[];
  };
}