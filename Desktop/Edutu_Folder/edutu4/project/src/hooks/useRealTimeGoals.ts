import { useState, useEffect, useCallback, useRef } from 'react';
import { UserGoal, GoalStats } from '../types/goals';
import { goalsService } from '../services/goalsService';
import { useAuth } from './useAuth';

interface UseRealTimeGoalsReturn {
  goals: UserGoal[];
  stats: GoalStats | null;
  loading: boolean;
  error: string | null;
  refreshGoals: () => Promise<void>;
  updateGoalProgress: (goalId: string, progress: number) => Promise<boolean>;
  createGoal: (goalData: any) => Promise<string | null>;
}

export const useRealTimeGoals = (): UseRealTimeGoalsReturn => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track the latest values for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Memoized stats update function
  const updateStats = useCallback(async (userId: string) => {
    if (!isMountedRef.current) return;
    
    try {
      const newStats = await goalsService.getGoalStats(userId);
      if (isMountedRef.current) {
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error updating stats:', error);
      if (isMountedRef.current) {
        setError('Failed to update statistics');
      }
    }
  }, []);

  // Optimized goals callback with debouncing
  const handleGoalsUpdate = useCallback((updatedGoals: UserGoal[]) => {
    if (!isMountedRef.current) return;
    
    setGoals(prevGoals => {
      // Only update if goals actually changed
      if (JSON.stringify(prevGoals) !== JSON.stringify(updatedGoals)) {
        return updatedGoals;
      }
      return prevGoals;
    });
    
    setLoading(false);
    setError(null);
    
    // Update stats when goals change
    if (user?.uid) {
      updateStats(user.uid);
    }
  }, [user?.uid, updateStats]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user?.uid) {
      setGoals([]);
      setStats(null);
      setLoading(false);
      return;
    }

    const setupSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Setup real-time goals subscription
        const unsubscribe = goalsService.subscribeToUserGoals(
          user.uid,
          handleGoalsUpdate,
          { status: ['active', 'completed'] }
        );
        
        unsubscribeRef.current = unsubscribe;

        // Initial stats fetch
        await updateStats(user.uid);

        // Setup periodic stats updates (every 30 seconds)
        const statsInterval = setInterval(() => {
          if (isMountedRef.current && user?.uid) {
            updateStats(user.uid);
          }
        }, 30000);
        
        statsIntervalRef.current = statsInterval;

      } catch (error) {
        console.error('Error setting up real-time subscriptions:', error);
        if (isMountedRef.current) {
          setError('Failed to setup real-time updates');
          setLoading(false);
        }
      }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [user?.uid, handleGoalsUpdate, updateStats]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Optimized refresh function
  const refreshGoals = useCallback(async () => {
    if (!user?.uid || !isMountedRef.current) return;

    try {
      setError(null);
      const [updatedGoals, updatedStats] = await Promise.all([
        goalsService.getUserGoals(user.uid, { status: ['active', 'completed'] }),
        goalsService.getGoalStats(user.uid)
      ]);

      if (isMountedRef.current) {
        setGoals(updatedGoals);
        setStats(updatedStats);
      }
    } catch (error) {
      console.error('Error refreshing goals:', error);
      if (isMountedRef.current) {
        setError('Failed to refresh goals');
      }
    }
  }, [user?.uid]);

  // Optimized goal progress update
  const updateGoalProgress = useCallback(async (goalId: string, progress: number): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      const success = await goalsService.updateGoalProgress(goalId, progress);
      if (success && isMountedRef.current) {
        // The real-time subscription will handle the UI update
        // Just update stats to reflect the change immediately
        await updateStats(user.uid);
      }
      return success;
    } catch (error) {
      console.error('Error updating goal progress:', error);
      if (isMountedRef.current) {
        setError('Failed to update goal progress');
      }
      return false;
    }
  }, [user?.uid, updateStats]);

  // Optimized goal creation
  const createGoal = useCallback(async (goalData: any): Promise<string | null> => {
    if (!user?.uid) return null;

    try {
      const goalId = await goalsService.createGoal(user.uid, goalData);
      if (goalId && isMountedRef.current) {
        // The real-time subscription will handle the UI update
        // Just update stats to reflect the new goal
        await updateStats(user.uid);
      }
      return goalId;
    } catch (error) {
      console.error('Error creating goal:', error);
      if (isMountedRef.current) {
        setError('Failed to create goal');
      }
      return null;
    }
  }, [user?.uid, updateStats]);

  return {
    goals,
    stats,
    loading,
    error,
    refreshGoals,
    updateGoalProgress,
    createGoal
  };
};