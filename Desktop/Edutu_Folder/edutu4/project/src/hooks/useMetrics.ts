import { useState, useEffect, useCallback } from 'react';
import { metricsService, UserMetrics, Goal, Opportunity } from '../services/metricsService';

interface UseMetricsReturn {
  metrics: UserMetrics | null;
  goals: Goal[];
  opportunities: Opportunity[];
  isLoading: boolean;
  error: string | null;
  refreshMetrics: () => Promise<void>;
  updateGoalProgress: (goalId: string, progress: number) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'addedAt'>) => Promise<void>;
  removeOpportunity: (opportunityId: string) => Promise<void>;
  recordActivity: (activity: 'goal_created' | 'goal_updated' | 'opportunity_added' | 'login') => Promise<void>;
}

export const useMetrics = (autoRefresh: boolean = true, refreshInterval: number = 30000): UseMetricsReturn => {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all data in parallel
      const [metricsData, goalsData, opportunitiesData] = await Promise.all([
        metricsService.getUserMetrics(),
        metricsService.getGoals(),
        metricsService.getOpportunities()
      ]);

      setMetrics(metricsData);
      setGoals(goalsData);
      setOpportunities(opportunitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics data');
      console.error('Error fetching metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  const updateGoalProgress = useCallback(async (goalId: string, progress: number) => {
    try {
      await metricsService.updateGoalProgress(goalId, progress);
      await metricsService.recordActivity('goal_updated');
      // Refresh data to reflect changes
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal progress');
    }
  }, [fetchData]);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    try {
      await metricsService.addGoal(goal);
      await metricsService.recordActivity('goal_created');
      // Refresh data to reflect changes
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add goal');
    }
  }, [fetchData]);

  const addOpportunity = useCallback(async (opportunity: Omit<Opportunity, 'id' | 'addedAt'>) => {
    try {
      await metricsService.addOpportunity(opportunity);
      await metricsService.recordActivity('opportunity_added');
      // Refresh data to reflect changes
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add opportunity');
    }
  }, [fetchData]);

  const removeOpportunity = useCallback(async (opportunityId: string) => {
    try {
      await metricsService.removeOpportunity(opportunityId);
      // Refresh data to reflect changes
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove opportunity');
    }
  }, [fetchData]);

  const recordActivity = useCallback(async (activity: 'goal_created' | 'goal_updated' | 'opportunity_added' | 'login') => {
    try {
      await metricsService.recordActivity(activity);
      // Refresh metrics after activity (may affect streak)
      const updatedMetrics = await metricsService.getUserMetrics();
      setMetrics(updatedMetrics);
    } catch (err) {
      console.error('Failed to record activity:', err);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  // Record login activity on mount
  useEffect(() => {
    recordActivity('login');
  }, [recordActivity]);

  return {
    metrics,
    goals,
    opportunities,
    isLoading,
    error,
    refreshMetrics,
    updateGoalProgress,
    addGoal,
    addOpportunity,
    removeOpportunity,
    recordActivity
  };
};