// Common interfaces to replace 'any' types

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: string;
  deadline: string;
  location: string;
  description: string;
  requirements: string[];
  benefits: string[];
  applicationProcess: string[];
  image: string;
  match: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Beginner' | 'Intermediate' | 'Advanced';
  applicants: string;
  successRate: string;
  skills?: string[];
  salary?: string;
}

// Scholarship interface matching our RSS scraper schema
export interface Scholarship {
  id: string;
  title: string;
  summary: string;
  requirements: string;
  benefits: string;
  applicationProcess: string;
  link: string;
  publishedDate: Date;
  deadline: string;
  eligibility: string;
  provider: string;
  successRate: string;
  createdAt: Date;
  tags: string[];
  imageUrl: string;
  location: string;
  category: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  progress?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  estimatedTime?: string;
  dueDate?: Date;
  dependencies?: string[];
}

export interface MonthlyRoadmapItem {
  month: number;
  title: string;
  description: string;
  tasks: Task[];
  milestones: Milestone[];
  resources?: string[];
}

export interface Goal {
  id?: string;
  title: string;
  description?: string;
  category?: string;
  type?: string;
  priority?: string;
  targetDate?: Date;
  milestones?: Milestone[];
  skills?: string[];
  template?: string;
  monthlyRoadmap?: MonthlyRoadmapItem[];
  timelineView?: string;
  estimatedDuration?: string;
  aiGenerated?: boolean;
  remindersEnabled?: boolean;
  communityEnabled?: boolean;
  progressTracking?: boolean;
  createdAt?: Date;
  nextReminder?: Date;
  tasks?: Task[];
  totalTasks?: number;
  estimatedTime?: string;
}

export interface UserProfile {
  name: string;
  interests: string[];
  skills: string[];
  goals: string[];
  learningStyle: string;
  role?: 'user' | 'admin' | 'moderator';
  permissions?: string[];
}

export interface RoadmapData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  steps: string[];
}

export interface NavigationHandler {
  (screen: string): void;
}

// Firebase timestamp type
export type FirebaseTimestamp = {
  seconds: number;
  nanoseconds: number;
} | Date;

// Chat and AI related interfaces
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId?: string;
}

export interface AIResponse {
  content: string;
  buttons?: Array<{
    text: string;
    type: 'scholarship' | 'community' | 'expert' | 'link';
    data?: Record<string, unknown>;
  }>;
  streaming?: boolean;
}

// User activity and metrics
export interface UserActivity {
  id: string;
  userId: string;
  type: 'goal_created' | 'task_completed' | 'opportunity_viewed' | 'chat_interaction';
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface UserMetrics {
  totalGoals: number;
  completedTasks: number;
  streakDays: number;
  lastActive: Date;
  achievements: string[];
}

// API response interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Admin-specific interfaces
export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator';
  permissions: string[];
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface ModerationItem {
  id: string;
  type: 'goal' | 'roadmap' | 'community_post';
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationReason?: string;
  content: any;
  priority: 'low' | 'medium' | 'high';
  reportCount?: number;
  category: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalGoals: number;
  pendingModerations: number;
  completedGoals: number;
  userGrowthRate: number;
  goalCompletionRate: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  databaseStatus: 'connected' | 'disconnected' | 'slow';
  lastUpdated: Date;
}