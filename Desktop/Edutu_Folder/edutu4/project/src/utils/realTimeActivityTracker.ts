import { realTimeMetricsService } from '../services/realTimeMetricsService';

/**
 * Activity tracker to ensure real-time metrics are properly updated
 * when users perform actions in the application
 */
export class RealTimeActivityTracker {
  private static instance: RealTimeActivityTracker;
  private userId: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): RealTimeActivityTracker {
    if (!RealTimeActivityTracker.instance) {
      RealTimeActivityTracker.instance = new RealTimeActivityTracker();
    }
    return RealTimeActivityTracker.instance;
  }

  /**
   * Initialize the tracker with user ID
   */
  initialize(userId: string): void {
    this.userId = userId;
    this.isInitialized = true;
    console.log('🔄 Real-time activity tracker initialized for user:', userId);
  }

  /**
   * Track goal creation
   */
  async trackGoalCreated(): Promise<void> {
    if (!this.isInitialized || !this.userId) {
      console.warn('⚠️ Activity tracker not initialized');
      return;
    }

    try {
      await realTimeMetricsService.recordActivity(this.userId, 'goal_created');
      console.log('✅ Goal creation activity tracked');
    } catch (error) {
      console.error('❌ Failed to track goal creation:', error);
    }
  }

  /**
   * Track goal update
   */
  async trackGoalUpdated(): Promise<void> {
    if (!this.isInitialized || !this.userId) {
      console.warn('⚠️ Activity tracker not initialized');
      return;
    }

    try {
      await realTimeMetricsService.recordActivity(this.userId, 'goal_updated');
      console.log('✅ Goal update activity tracked');
    } catch (error) {
      console.error('❌ Failed to track goal update:', error);
    }
  }

  /**
   * Track task completion
   */
  async trackTaskCompleted(): Promise<void> {
    if (!this.isInitialized || !this.userId) {
      console.warn('⚠️ Activity tracker not initialized');
      return;
    }

    try {
      await realTimeMetricsService.recordActivity(this.userId, 'task_completed');
      console.log('✅ Task completion activity tracked');
    } catch (error) {
      console.error('❌ Failed to track task completion:', error);
    }
  }

  /**
   * Track user login
   */
  async trackLogin(): Promise<void> {
    if (!this.isInitialized || !this.userId) {
      console.warn('⚠️ Activity tracker not initialized');
      return;
    }

    try {
      await realTimeMetricsService.recordActivity(this.userId, 'login');
      console.log('✅ Login activity tracked');
    } catch (error) {
      console.error('❌ Failed to track login:', error);
    }
  }

  /**
   * Clean up when user logs out
   */
  cleanup(): void {
    this.userId = null;
    this.isInitialized = false;
    console.log('🧹 Activity tracker cleaned up');
  }
}

// Export singleton instance
export const activityTracker = RealTimeActivityTracker.getInstance();