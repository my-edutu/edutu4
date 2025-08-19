import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { realTimeMetricsService, RealTimeMetrics } from '../services/realTimeMetricsService';

interface UseRealTimeMetricsOptions {
  autoInitialize?: boolean;
  enableCaching?: boolean;
  refreshInterval?: number; // Manual refresh interval in ms (optional)
}

interface UseRealTimeMetricsReturn {
  metrics: RealTimeMetrics | null;
  isLoading: boolean;
  error: string | null;
  syncStatus: RealTimeMetrics['syncStatus'];
  isConnected: boolean;
  refreshMetrics: () => Promise<void>;
  recordActivity: (activityType: 'goal_created' | 'goal_updated' | 'task_completed' | 'login') => Promise<void>;
  getMetricTrend: (metricKey: keyof RealTimeMetrics['weeklyComparison']) => RealTimeMetrics['weeklyComparison'][keyof RealTimeMetrics['weeklyComparison']];
  formatTrendDisplay: (trend: RealTimeMetrics['weeklyComparison'][keyof RealTimeMetrics['weeklyComparison']]) => string;
}

export const useRealTimeMetrics = (options: UseRealTimeMetricsOptions = {}): UseRealTimeMetricsReturn => {
  const {
    autoInitialize = true,
    enableCaching = true,
    refreshInterval
  } = options;

  const { user } = useAuth();
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<RealTimeMetrics['syncStatus']>('syncing');
  const [isConnected, setIsConnected] = useState(navigator.onLine);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);

  /**
   * Handle metrics updates from the service
   */
  const handleMetricsUpdate = useCallback((updatedMetrics: RealTimeMetrics) => {
    setMetrics(updatedMetrics);
    setSyncStatus(updatedMetrics.syncStatus);
    setIsLoading(false);
    setError(null);
    
    console.log('📊 Real-time metrics updated:', {
      opportunities: updatedMetrics.opportunities,
      goalsActive: updatedMetrics.goalsActive,
      avgProgress: updatedMetrics.avgProgress,
      daysStreak: updatedMetrics.daysStreak,
      syncStatus: updatedMetrics.syncStatus
    });
  }, []);

  /**
   * Initialize real-time metrics service
   */
  const initializeService = useCallback(async () => {
    if (!user?.uid || initializingRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      initializingRef.current = true;

      console.log('🚀 Initializing real-time metrics service...');

      // Subscribe to metrics updates
      const unsubscribe = realTimeMetricsService.addListener(handleMetricsUpdate);
      unsubscribeRef.current = unsubscribe;

      // Initialize the service
      await realTimeMetricsService.initializeRealTimeMetrics(user.uid);

      console.log('✅ Real-time metrics service initialized');
    } catch (err) {
      console.error('❌ Failed to initialize real-time metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize metrics');
      setIsLoading(false);
    } finally {
      initializingRef.current = false;
    }
  }, [user?.uid, handleMetricsUpdate]);

  /**
   * Manual refresh function
   */
  const refreshMetrics = useCallback(async () => {
    if (!user?.uid) {
      console.warn('⚠️ Cannot refresh metrics: No user ID');
      return;
    }

    try {
      console.log('🔄 Manually refreshing metrics...');
      
      // Re-initialize to get fresh data
      await realTimeMetricsService.initializeRealTimeMetrics(user.uid);
      
      console.log('✅ Metrics refreshed manually');
    } catch (err) {
      console.error('❌ Failed to refresh metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh metrics');
    }
  }, [user?.uid]);

  /**
   * Record user activity
   */
  const recordActivity = useCallback(async (activityType: 'goal_created' | 'goal_updated' | 'task_completed' | 'login') => {
    if (!user?.uid) {
      console.warn('⚠️ Cannot record activity: No user ID');
      return;
    }

    try {
      await realTimeMetricsService.recordActivity(user.uid, activityType);
      console.log('✅ Activity recorded:', activityType);
    } catch (err) {
      console.error('❌ Failed to record activity:', err);
      // Don't throw error for activity recording to avoid disrupting user flow
    }
  }, [user?.uid]);

  /**
   * Get trend data for a specific metric
   */
  const getMetricTrend = useCallback((metricKey: keyof RealTimeMetrics['weeklyComparison']) => {
    if (!metrics?.weeklyComparison) {
      return {
        current: 0,
        previous: 0,
        change: 0,
        percentage: 0,
        direction: 'stable' as const
      };
    }

    return metrics.weeklyComparison[metricKey];
  }, [metrics]);

  /**
   * Format trend for display
   */
  const formatTrendDisplay = useCallback((trend: RealTimeMetrics['weeklyComparison'][keyof RealTimeMetrics['weeklyComparison']]) => {
    const { percentage, direction } = trend;
    const sign = direction === 'up' ? '+' : direction === 'down' ? '-' : '';
    const absPercentage = Math.abs(percentage);
    
    if (direction === 'stable') {
      return '0%';
    }
    
    return `${sign}${absPercentage}%`;
  }, []);

  /**
   * Handle network status changes
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      console.log('🌐 Network connection restored');
    };

    const handleOffline = () => {
      setIsConnected(false);
      console.log('📱 Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Initialize service when user changes
   */
  useEffect(() => {
    if (user?.uid && autoInitialize) {
      initializeService();
    } else if (!user?.uid) {
      // Clean up when user logs out
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      setMetrics(null);
      setIsLoading(false);
      setError(null);
      setSyncStatus('offline');
      
      realTimeMetricsService.cleanup();
    }

    return () => {
      // Cleanup on unmount
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, autoInitialize, initializeService]);

  /**
   * Set up manual refresh interval if specified
   */
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        if (isConnected && user?.uid) {
          console.log('⏰ Auto-refreshing metrics...');
          refreshMetrics();
        }
      }, refreshInterval);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }
  }, [refreshInterval, isConnected, user?.uid, refreshMetrics]);

  /**
   * Record login activity when hook is first used
   */
  useEffect(() => {
    if (user?.uid && metrics) {
      recordActivity('login');
    }
  }, [user?.uid, metrics, recordActivity]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    metrics,
    isLoading,
    error,
    syncStatus,
    isConnected,
    refreshMetrics,
    recordActivity,
    getMetricTrend,
    formatTrendDisplay
  };
};

// Additional hook for specific metric subscriptions
export const useMetricSubscription = (metricKey: keyof RealTimeMetrics, userId?: string) => {
  const [value, setValue] = useState<number>(0);
  const [trend, setTrend] = useState<RealTimeMetrics['weeklyComparison'][keyof RealTimeMetrics['weeklyComparison']] | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = realTimeMetricsService.addListener((metrics) => {
      if (metricKey in metrics) {
        setValue(metrics[metricKey] as number);
      }
      
      if (metrics.weeklyComparison && metricKey in metrics.weeklyComparison) {
        setTrend(metrics.weeklyComparison[metricKey as keyof RealTimeMetrics['weeklyComparison']]);
      }
    });

    return unsubscribe;
  }, [metricKey, userId]);

  return { value, trend };
};

// Hook for streak-specific functionality
export const useStreakTracking = () => {
  const { user } = useAuth();
  const { metrics, recordActivity } = useRealTimeMetrics();

  const currentStreak = metrics?.daysStreak || 1;
  const streakRecord = metrics?.streakRecord || 1;
  const lastActiveDate = metrics?.lastActiveDate;

  const recordStreakActivity = useCallback(async (activityType: 'goal_created' | 'goal_updated' | 'task_completed') => {
    await recordActivity(activityType);
  }, [recordActivity]);

  const getStreakStatus = useCallback(() => {
    if (!lastActiveDate) return 'inactive';
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (lastActiveDate === today) return 'active';
    if (lastActiveDate === yesterday) return 'at_risk';
    return 'broken';
  }, [lastActiveDate]);

  const isNewRecord = currentStreak >= streakRecord;

  return {
    currentStreak,
    streakRecord,
    lastActiveDate,
    recordStreakActivity,
    getStreakStatus,
    isNewRecord,
    streakTrend: metrics?.weeklyComparison.daysStreak
  };
};