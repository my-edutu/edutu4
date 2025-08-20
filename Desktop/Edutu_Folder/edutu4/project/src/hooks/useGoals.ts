import { useState, useEffect, useCallback, useRef } from 'react';
import { UserGoal, CreateGoalData, UpdateGoalData, GoalFilters } from '../types/goals';
import { GoalsService } from '../services/goalsService';
import { useAuth } from './useAuth';
import { activityTracker } from '../utils/realTimeActivityTracker';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const goalsService = new GoalsService();

export interface UseGoalsReturn {
  goals: UserGoal[];
  loading: boolean;
  error: string | null;
  createGoal: (goalData: CreateGoalData) => Promise<string | null>;
  updateGoal: (goalId: string, updates: UpdateGoalData) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  refreshGoals: () => Promise<void>;
  updateGoalProgress: (goalId: string, progress: number) => Promise<boolean>;
  updateTaskCompletion: (goalId: string, taskId: string, completed: boolean) => Promise<boolean>;
}

export const useGoals = (filters?: GoalFilters): UseGoalsReturn => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const retryCount = useRef<number>(0);
  const maxRetries = 3;

  // Manual fetch goals function
  const fetchGoals = useCallback(async (forceLoading = false) => {
    if (!user?.uid) {
      setGoals([]);
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    try {
      if (!hasInitialized || forceLoading) {
        setLoading(true);
      }
      setError(null);
      
      console.log('📥 Fetching goals for user:', user.uid);
      const userGoals = await goalsService.getUserGoals(user.uid, filters);
      console.log('✅ Goals fetched successfully:', userGoals.length, 'goals');
      
      setGoals(userGoals);
      setHasInitialized(true);
      retryCount.current = 0; // Reset retry count on success
    } catch (err) {
      console.error('❌ Error fetching goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
      setGoals([]);
      setHasInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, filters, hasInitialized]);

  // Set up real-time listener for goals with improved error handling
  const setupRealTimeListener = useCallback(() => {
    if (!user?.uid) {
      console.log('❌ Cannot setup listener: No user UID');
      return;
    }

    // Clean up existing listener FIRST to prevent multiple listeners
    if (unsubscribeRef.current) {
      console.log('🧹 Cleaning up existing listener...');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Add slight delay to ensure cleanup is complete
    setTimeout(() => {
      if (!user?.uid) return; // Double-check user is still valid
      
      try {
        console.log('🔄 Setting up real-time goals listener for user:', user.uid);
      
      // Query user's goals subcollection directly (better performance)
      const goalsQuery = query(
        collection(db, 'users', user.uid, 'goals')
      );

      const unsubscribe = onSnapshot(
        goalsQuery,
        (snapshot) => {
          try {
            console.log('📡 Real-time update received:', snapshot.docs.length, 'documents');
            
            const goalsData: UserGoal[] = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                targetDate: data.targetDate?.toDate?.() || null,
                updatedAt: data.updatedAt?.toDate?.() || new Date()
              } as UserGoal;
            });

            // Apply filters in JavaScript if needed
            let filteredGoals = goalsData;
            if (filters?.status && filters.status.length > 0) {
              filteredGoals = goalsData.filter(goal => 
                filters.status!.includes(goal.status)
              );
            }
            if (filters?.category && filters.category.length > 0) {
              filteredGoals = filteredGoals.filter(goal => 
                filters.category!.includes(goal.category)
              );
            }

            // Sort by creation date (newest first)
            const sortedGoals = filteredGoals.sort((a, b) => {
              const aDate = a.createdAt || new Date(0);
              const bDate = b.createdAt || new Date(0);
              return bDate.getTime() - aDate.getTime();
            });

            console.log('✅ Real-time goals processed:', sortedGoals.length, 'goals after filtering');
            setGoals(sortedGoals);
            setError(null);
            setHasInitialized(true);
            setLoading(false);
            retryCount.current = 0; // Reset retry count on success
          } catch (err) {
            console.error('❌ Error processing real-time goals update:', err);
            setError('Failed to process goals update');
          }
        },
        (err) => {
          console.error('❌ Real-time goals listener error:', err);
          retryCount.current += 1;
          
          // Check if it's a permission error (user might be offline)
          const isPermissionError = err.code === 'permission-denied';
          const isNetworkError = err.code === 'unavailable' || err.message?.includes('network');
          
          if (isPermissionError) {
            console.log('❌ Permission denied - user may need to re-authenticate');
            setError('Authentication required. Please refresh the page.');
            setLoading(false);
            return;
          }
          
          if (retryCount.current < maxRetries) {
            const delay = isNetworkError ? 5000 : 2000 * retryCount.current;
            console.log(`🔄 Retrying real-time listener (${retryCount.current}/${maxRetries}) in ${delay}ms...`);
            setTimeout(() => setupRealTimeListener(), delay);
          } else {
            console.log('🔄 Max retries reached, falling back to manual fetch');
            setError('Real-time updates temporarily unavailable. Using cached data.');
            fetchGoals(true);
          }
        }
      );

        unsubscribeRef.current = unsubscribe;
        console.log('✅ Real-time listener setup complete');
      } catch (err) {
        console.error('❌ Error setting up real-time listener:', err);
        retryCount.current += 1;
        
        if (retryCount.current < maxRetries) {
          console.log(`🔄 Retrying listener setup (${retryCount.current}/${maxRetries})...`);
          setTimeout(() => setupRealTimeListener(), 1000 * retryCount.current);
        } else {
          console.log('🔄 Max retries reached, using manual fetch');
          setError('Real-time updates unavailable, using manual refresh');
          fetchGoals(true);
        }
      }
    }, 100); // 100ms delay to ensure cleanup is complete
  }, [user?.uid, filters, fetchGoals]);

  // Create goal with immediate UI feedback and activity tracking
  const createGoal = useCallback(async (goalData: CreateGoalData): Promise<string | null> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      console.log('🚀 Creating goal:', goalData.title);
      
      const goalId = await goalsService.createGoal(user.uid, goalData);
      console.log('✅ Goal created with ID:', goalId);
      
      // Track activity for real-time dashboard sync
      await activityTracker.trackGoalCreated();
      console.log('📊 Goal creation tracked for dashboard sync');
      
      // Force a manual refresh to ensure the goal appears immediately
      // This provides immediate feedback even if real-time listener is slow
      setTimeout(() => {
        console.log('🔄 Refreshing goals after creation...');
        fetchGoals(false);
      }, 500);
      
      return goalId;
    } catch (err) {
      console.error('❌ Error creating goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create goal');
      return null;
    }
  }, [user?.uid, fetchGoals]);

  // Update goal with immediate UI feedback and activity tracking
  const updateGoal = useCallback(async (goalId: string, updates: UpdateGoalData): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const success = await goalsService.updateGoal(goalId, updates, user.uid);
      
      if (success) {
        // Track activity for real-time dashboard sync
        await activityTracker.trackGoalUpdated();
        console.log('📊 Goal update tracked for dashboard sync');
        
        // Force refresh to ensure immediate UI update
        setTimeout(() => fetchGoals(false), 200);
      }
      
      return success;
    } catch (err) {
      console.error('Error updating goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to update goal');
      return false;
    }
  }, [user?.uid, fetchGoals]);

  // Delete goal with optimistic UI update
  const deleteGoal = useCallback(async (goalId: string): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const success = await goalsService.deleteGoal(goalId, user.uid);
      
      if (success) {
        // Immediate UI update
        setGoals(prev => prev.filter(goal => goal.id !== goalId));
        setTimeout(() => fetchGoals(false), 200);
      }
      
      return success;
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
      return false;
    }
  }, [user?.uid, fetchGoals]);

  // Update goal progress with optimistic UI update
  const updateGoalProgress = useCallback(async (goalId: string, progress: number): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const success = await goalsService.updateGoalProgress(goalId, progress, user.uid);
      
      if (success) {
        // Optimistic UI update
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? { ...goal, progress } : goal
        ));
        setTimeout(() => fetchGoals(false), 200);
      }
      
      return success;
    } catch (err) {
      console.error('Error updating goal progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to update goal progress');
      return false;
    }
  }, [user?.uid, fetchGoals]);

  // Update task completion with activity tracking
  const updateTaskCompletion = useCallback(async (goalId: string, taskId: string, completed: boolean): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const success = await goalsService.updateTaskCompletion(goalId, taskId, completed, user.uid);
      
      if (success) {
        // Track task completion for real-time dashboard sync
        if (completed) {
          await activityTracker.trackTaskCompleted();
          console.log('📊 Task completion tracked for dashboard sync');
        }
        
        // Force refresh to show updated progress
        setTimeout(() => fetchGoals(false), 200);
      }
      
      return success;
    } catch (err) {
      console.error('Error updating task completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task completion');
      return false;
    }
  }, [user?.uid, fetchGoals]);

  // Manual refresh function
  const refreshGoals = useCallback(async () => {
    await fetchGoals(true); // Force loading for manual refresh
  }, [fetchGoals]);

  // Set up real-time listener and activity tracker when user or filters change
  useEffect(() => {
    console.log('🔄 useGoals effect triggered', {
      userUid: user?.uid,
      filtersStatus: filters?.status,
      hasInitialized
    });

    if (user?.uid) {
      console.log('📡 Setting up real-time listener...');
      setLoading(true);
      
      // Initialize activity tracker for dashboard sync
      activityTracker.initialize(user.uid);
      console.log('📊 Activity tracker initialized for dashboard sync');
      
      // Check for goal migration on first load
      if (!hasInitialized) {
        console.log('🔄 Checking for goal migration...');
        goalsService.migrateUserGoals(user.uid).catch(err => {
          console.warn('Migration check failed (this is normal for new users):', err);
        });
      }
      
      setupRealTimeListener();
    } else {
      console.log('❌ No user UID, cleaning up...');
      // Clean up when user logs out
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // Clean up activity tracker
      activityTracker.cleanup();
      console.log('📊 Activity tracker cleaned up');
      
      setGoals([]);
      setLoading(false);
      setHasInitialized(false);
      retryCount.current = 0;
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, filters?.status, filters?.category]); // Remove setupRealTimeListener from dependencies

  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refreshGoals,
    updateGoalProgress,
    updateTaskCompletion
  };
};