import { secureStorage } from '../utils/security';

export interface UserMetrics {
  opportunities: number;
  goalsActive: number;
  avgProgress: number;
  daysStreak: number;
  lastActiveDate: string;
  totalOpportunities: number;
  completedGoals: number;
  streakRecord: number;
}

export interface Goal {
  id: string;
  title: string;
  progress: number;
  isActive: boolean;
  createdAt: string;
  completedAt?: string;
  category: string;
}

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: string;
  match: number;
  isActive: boolean;
  addedAt: string;
  deadline: string;
}

class MetricsService {
  private readonly METRICS_KEY = 'edutu_user_metrics';
  private readonly GOALS_KEY = 'edutu_user_goals';
  private readonly OPPORTUNITIES_KEY = 'edutu_user_opportunities';
  
  // Mock data for demonstration
  private mockGoals: Goal[] = [
    {
      id: '1',
      title: 'Complete Python Course',
      progress: 75,
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'skill-development'
    },
    {
      id: '2', 
      title: 'Apply to 5 Scholarships',
      progress: 40,
      isActive: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'education'
    },
    {
      id: '3',
      title: 'Build Portfolio Website', 
      progress: 20,
      isActive: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'career'
    },
    {
      id: '4',
      title: 'Learn Data Analysis',
      progress: 100,
      isActive: false,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'skill-development'
    }
  ];

  private mockOpportunities: Opportunity[] = [
    {
      id: '1',
      title: 'Software Developer Internship',
      organization: 'MTN Ghana',
      category: 'Technology',
      match: 92,
      isActive: true,
      addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: '2024-03-15'
    },
    {
      id: '2',
      title: 'Digital Marketing Associate',
      organization: 'Unilever Ghana', 
      category: 'Marketing',
      match: 89,
      isActive: true,
      addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: '2024-02-28'
    },
    {
      id: '3',
      title: 'Young Entrepreneurs Network',
      organization: 'African Entrepreneurship Network',
      category: 'Networking',
      match: 82,
      isActive: true,
      addedAt: new Date().toISOString(),
      deadline: 'Ongoing'
    }
  ];

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    const existingMetrics = this.getStoredMetrics();
    if (!existingMetrics) {
      const initialMetrics: UserMetrics = {
        opportunities: 0,
        goalsActive: 0,
        avgProgress: 0,
        daysStreak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        totalOpportunities: 0,
        completedGoals: 0,
        streakRecord: 1
      };
      this.saveMetrics(initialMetrics);
    }
  }

  private getStoredMetrics(): UserMetrics | null {
    try {
      const stored = secureStorage.getItem(this.METRICS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveMetrics(metrics: UserMetrics): void {
    secureStorage.setItem(this.METRICS_KEY, JSON.stringify(metrics));
  }

  private getStoredGoals(): Goal[] {
    try {
      const stored = secureStorage.getItem(this.GOALS_KEY);
      return stored ? JSON.parse(stored) : this.mockGoals;
    } catch {
      return this.mockGoals;
    }
  }

  private saveGoals(goals: Goal[]): void {
    secureStorage.setItem(this.GOALS_KEY, JSON.stringify(goals));
  }

  private getStoredOpportunities(): Opportunity[] {
    try {
      const stored = secureStorage.getItem(this.OPPORTUNITIES_KEY);
      return stored ? JSON.parse(stored) : this.mockOpportunities;
    } catch {
      return this.mockOpportunities;
    }
  }

  private saveOpportunities(opportunities: Opportunity[]): void {
    secureStorage.setItem(this.OPPORTUNITIES_KEY, JSON.stringify(opportunities));
  }

  private calculateDaysStreak(): number {
    const metrics = this.getStoredMetrics();
    if (!metrics) return 1;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = metrics.lastActiveDate;
    
    if (lastActive === today) {
      return metrics.daysStreak;
    }

    const lastActiveDate = new Date(lastActive);
    const todayDate = new Date(today);
    const daysDifference = Math.floor((todayDate.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference === 1) {
      // Consecutive day - increment streak
      return metrics.daysStreak + 1;
    } else if (daysDifference > 1) {
      // Missed days - reset streak
      return 1;
    }

    return metrics.daysStreak;
  }

  private updateLastActiveDate(): void {
    const metrics = this.getStoredMetrics();
    if (!metrics) return;

    const today = new Date().toISOString().split('T')[0];
    const newStreak = this.calculateDaysStreak();
    
    const updatedMetrics: UserMetrics = {
      ...metrics,
      lastActiveDate: today,
      daysStreak: newStreak,
      streakRecord: Math.max(metrics.streakRecord, newStreak)
    };

    this.saveMetrics(updatedMetrics);
  }

  // Public API methods
  
  async getUserMetrics(): Promise<UserMetrics> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.updateLastActiveDate();
    
    const goals = this.getStoredGoals();
    const opportunities = this.getStoredOpportunities();
    const metrics = this.getStoredMetrics()!;

    const activeGoals = goals.filter(goal => goal.isActive);
    const activeOpportunities = opportunities.filter(opp => opp.isActive);
    
    const avgProgress = activeGoals.length > 0 
      ? Math.round(activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length)
      : 0;

    const updatedMetrics: UserMetrics = {
      ...metrics,
      opportunities: activeOpportunities.length,
      goalsActive: activeGoals.length,
      avgProgress,
      totalOpportunities: opportunities.length,
      completedGoals: goals.filter(goal => !goal.isActive && goal.completedAt).length
    };

    this.saveMetrics(updatedMetrics);
    return updatedMetrics;
  }

  async getGoals(): Promise<Goal[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.getStoredGoals();
  }

  async getOpportunities(): Promise<Opportunity[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.getStoredOpportunities();
  }

  async addGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
    const goals = this.getStoredGoals();
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    goals.push(newGoal);
    this.saveGoals(goals);
    
    return newGoal;
  }

  async updateGoalProgress(goalId: string, progress: number): Promise<void> {
    const goals = this.getStoredGoals();
    const goalIndex = goals.findIndex(goal => goal.id === goalId);
    
    if (goalIndex !== -1) {
      goals[goalIndex].progress = Math.min(Math.max(progress, 0), 100);
      
      if (progress >= 100) {
        goals[goalIndex].isActive = false;
        goals[goalIndex].completedAt = new Date().toISOString();
      }
      
      this.saveGoals(goals);
    }
  }

  async addOpportunity(opportunity: Omit<Opportunity, 'id' | 'addedAt'>): Promise<Opportunity> {
    const opportunities = this.getStoredOpportunities();
    const newOpportunity: Opportunity = {
      ...opportunity,
      id: Date.now().toString(),
      addedAt: new Date().toISOString()
    };
    
    opportunities.push(newOpportunity);
    this.saveOpportunities(opportunities);
    
    return newOpportunity;
  }

  async removeOpportunity(opportunityId: string): Promise<void> {
    const opportunities = this.getStoredOpportunities();
    const filtered = opportunities.filter(opp => opp.id !== opportunityId);
    this.saveOpportunities(filtered);
  }

  // Activity tracking
  async recordActivity(activity: 'goal_created' | 'goal_updated' | 'opportunity_added' | 'login'): Promise<void> {
    this.updateLastActiveDate();
    
    // Here you could also track specific activities for analytics
    const timestamp = new Date().toISOString();
    console.log(`Activity recorded: ${activity} at ${timestamp}`);
  }

  // Analytics helpers for future implementation
  async getMetricsTrends(days: number = 30): Promise<any> {
    // Placeholder for future analytics implementation
    // This would return metrics over time for charting
    return {
      opportunities: Array.from({length: days}, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 10) + 1
      })),
      goals: Array.from({length: days}, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 5) + 1
      }))
    };
  }

  // Reset data (useful for testing)
  async resetUserData(): Promise<void> {
    secureStorage.removeItem(this.METRICS_KEY);
    secureStorage.removeItem(this.GOALS_KEY);
    secureStorage.removeItem(this.OPPORTUNITIES_KEY);
    this.initializeMetrics();
  }
}

export const metricsService = new MetricsService();