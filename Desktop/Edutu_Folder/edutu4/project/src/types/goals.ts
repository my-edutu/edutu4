import type { FirebaseTimestamp } from './common';

export interface UserGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'career' | 'skill' | 'education' | 'personal' | 'roadmap' | 'learning' | 'application';
  type: 'short_term' | 'medium_term' | 'long_term'; // 1 month, 3-6 months, 1+ year
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  
  // Progress tracking
  progress: number; // 0-100
  milestones: GoalMilestone[];
  
  // Timeline
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  targetDate?: FirebaseTimestamp;
  completedAt?: FirebaseTimestamp;
  
  // Metadata
  priority: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  
  // Related data
  opportunityId?: string; // If created from an opportunity
  roadmapId?: string; // If created from a roadmap
  
  // Tracking
  lastCheckedAt?: FirebaseTimestamp;
  checkInCount: number; // Number of times user checked progress
  streakDays: number; // Consecutive days working on this goal

  // Monthly/Weekly Roadmap Structure
  monthlyRoadmap?: MonthlyRoadmap[];
  weeklyTasks?: WeeklyTask[];
  timelineView?: 'monthly' | 'weekly' | 'milestone';
  estimatedDuration?: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: FirebaseTimestamp;
  dueDate?: FirebaseTimestamp;
  order: number; // For sorting milestones
}

export interface UserActivity {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format for easy grouping
  timestamp: FirebaseTimestamp;
  activities: ActivityType[];
  goalsWorkedOn: string[]; // Goal IDs
  streakCount: number; // Current streak at this date
}

export type ActivityType = 
  | 'login'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_completed'
  | 'milestone_completed'
  | 'roadmap_accessed'
  | 'opportunity_viewed'
  | 'profile_updated';

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  streakHistory: StreakDay[];
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface StreakDay {
  date: string; // YYYY-MM-DD
  active: boolean;
  activitiesCount: number;
  goalsWorkedOn: string[];
}

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  goalsCompletedThisMonth: number;
  currentStreak: number;
  longestStreak: number;
}

export interface CreateGoalData {
  title: string;
  description: string;
  category: UserGoal['category'];
  type?: UserGoal['type'];
  priority: UserGoal['priority'];
  difficulty?: UserGoal['difficulty'];
  targetDate?: Date;
  tags?: string[];
  milestones?: Omit<GoalMilestone, 'id' | 'completed' | 'completedAt'>[];
  opportunityId?: string;
  roadmapId?: string;
  // Additional roadmap-specific data
  tasks?: WeeklyTask[];
  monthlyRoadmap?: MonthlyRoadmap[]; // Add support for monthly roadmap structure
  totalTasks?: number;
  estimatedTime?: string;
  skills?: string[];
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  progress?: number;
  status?: UserGoal['status'];
  priority?: UserGoal['priority'];
  targetDate?: Date;
  tags?: string[];
}

export interface GoalFilters {
  status?: UserGoal['status'][];
  category?: UserGoal['category'][];
  type?: UserGoal['type'][];
  priority?: UserGoal['priority'][];
}

export interface GoalSortOptions {
  field: 'createdAt' | 'updatedAt' | 'targetDate' | 'progress' | 'title';
  direction: 'asc' | 'desc';
}

// Monthly/Weekly Roadmap Interfaces
export interface MonthlyRoadmap {
  id: string;
  month: number; // 1-12
  year: number;
  title: string;
  description: string;
  weeks: WeeklyRoadmap[];
  milestones: string[]; // Milestone IDs to complete this month
  focusAreas: string[];
  targetProgress: number; // Expected progress % by end of month
  isExpanded?: boolean;
}

export interface WeeklyRoadmap {
  id: string;
  weekNumber: number; // Week of month (1-4)
  weekOfYear: number; // Week of year (1-52)
  startDate: Date;
  endDate: Date;
  title: string;
  description: string;
  tasks: WeeklyTask[];
  targetProgress: number; // Expected progress % by end of week
  priority: 'low' | 'medium' | 'high';
  isExpanded?: boolean;
}

export interface WeeklyTask {
  id: string;
  title: string;
  description?: string;
  weekId: string;
  monthId: string;
  completed: boolean;
  completedAt?: FirebaseTimestamp;
  priority: 'low' | 'medium' | 'high';
  estimatedHours: number;
  category: string;
  tags: string[];
  dueDate?: Date;
  dependencies?: string[]; // Task IDs that must be completed first
  resources?: TaskResource[];
}

export interface TaskResource {
  id: string;
  title: string;
  type: 'link' | 'document' | 'video' | 'course' | 'tool';
  url?: string;
  description?: string;
}