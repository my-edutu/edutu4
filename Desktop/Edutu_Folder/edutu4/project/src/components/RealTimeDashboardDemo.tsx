import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, TrendingUp, Target, Sparkles, Flame, Plus, Minus } from 'lucide-react';
import { useRealTimeMetrics, useStreakTracking } from '../hooks/useRealTimeMetrics';
import { useDarkMode } from '../hooks/useDarkMode';
import MetricsOverview from './MetricsOverview';
import Button from './ui/Button';

/**
 * Demo component showcasing real-time dashboard synchronization
 * This component allows testing of real-time metrics updates
 */
const RealTimeDashboardDemo: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const { 
    metrics, 
    isLoading, 
    error, 
    syncStatus, 
    isConnected, 
    refreshMetrics, 
    recordActivity 
  } = useRealTimeMetrics({ autoInitialize: true });

  const { currentStreak, recordStreakActivity, getStreakStatus } = useStreakTracking();

  const [isAutoDemo, setIsAutoDemo] = useState(false);
  const [demoInterval, setDemoInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastActivity, setLastActivity] = useState<string>('');

  // Simulate real-time metric changes
  const simulateActivity = async (activityType: 'goal_created' | 'goal_updated' | 'task_completed') => {
    try {
      await recordActivity(activityType);
      setLastActivity(`${activityType.replace('_', ' ')} - ${new Date().toLocaleTimeString()}`);
      console.log(`🎯 Demo: Simulated ${activityType}`);
    } catch (error) {
      console.error('Demo activity error:', error);
    }
  };

  const startAutoDemo = () => {
    setIsAutoDemo(true);
    
    const activities: Array<'goal_created' | 'goal_updated' | 'task_completed'> = [
      'task_completed', 'goal_updated', 'task_completed', 'goal_created'
    ];
    
    let activityIndex = 0;
    
    const interval = setInterval(() => {
      simulateActivity(activities[activityIndex % activities.length]);
      activityIndex++;
    }, 3000); // Every 3 seconds
    
    setDemoInterval(interval);
  };

  const stopAutoDemo = () => {
    setIsAutoDemo(false);
    if (demoInterval) {
      clearInterval(demoInterval);
      setDemoInterval(null);
    }
  };

  const resetDemo = () => {
    stopAutoDemo();
    setLastActivity('');
    // In a real app, this would reset the user's metrics
    console.log('🔄 Demo: Reset triggered (would reset user metrics in real app)');
  };

  useEffect(() => {
    return () => {
      if (demoInterval) {
        clearInterval(demoInterval);
      }
    };
  }, [demoInterval]);

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Demo Header */}
      <div className={`max-w-6xl mx-auto mb-8 p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              Real-Time Dashboard Demo
            </h1>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Experience live metrics synchronization with instant updates and historical comparisons
            </p>
          </div>
          
          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isConnected 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={isAutoDemo ? stopAutoDemo : startAutoDemo}
            variant={isAutoDemo ? "secondary" : "primary"}
            icon={isAutoDemo ? <Pause size={16} /> : <Play size={16} />}
            disabled={isLoading}
          >
            {isAutoDemo ? 'Stop Demo' : 'Start Auto Demo'}
          </Button>

          <Button
            onClick={() => simulateActivity('task_completed')}
            variant="outline"
            icon={<Target size={16} />}
            disabled={isLoading || isAutoDemo}
          >
            Complete Task
          </Button>

          <Button
            onClick={() => simulateActivity('goal_updated')}
            variant="outline"
            icon={<TrendingUp size={16} />}
            disabled={isLoading || isAutoDemo}
          >
            Update Goal
          </Button>

          <Button
            onClick={() => simulateActivity('goal_created')}
            variant="outline"
            icon={<Plus size={16} />}
            disabled={isLoading || isAutoDemo}
          >
            Create Goal
          </Button>

          <Button
            onClick={resetDemo}
            variant="outline"
            icon={<RotateCcw size={16} />}
            disabled={isLoading}
          >
            Reset Demo
          </Button>

          <Button
            onClick={refreshMetrics}
            variant="outline"
            icon={<RotateCcw size={16} />}
            disabled={isLoading}
          >
            Manual Refresh
          </Button>
        </div>

        {/* Status Information */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sync Status */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
              Sync Status
            </h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced' ? 'bg-green-500' :
                syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                syncStatus === 'error' ? 'bg-red-500' :
                'bg-gray-500'
              }`}></div>
              <span className={`text-sm capitalize ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {syncStatus}
              </span>
            </div>
          </div>

          {/* Last Activity */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
              Last Activity
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {lastActivity || 'No activity yet'}
            </p>
          </div>

          {/* Streak Status */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
              Current Streak
            </h3>
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-orange-500" />
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {currentStreak} days ({getStreakStatus()})
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
              Error
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Real-Time Metrics Dashboard */}
      <div className="max-w-6xl mx-auto">
        <MetricsOverview
          onOpportunitiesClick={() => console.log('Opportunities clicked')}
          onGoalsClick={() => console.log('Goals clicked')}
          onProgressClick={() => console.log('Progress clicked')}
          onStreakClick={() => console.log('Streak clicked')}
        />
      </div>

      {/* Technical Details */}
      <div className={`max-w-6xl mx-auto mt-8 p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
          Technical Implementation
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Real-Time Features */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
              Real-Time Features
            </h3>
            <ul className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Firebase Firestore real-time listeners</li>
              <li>• Instant metric synchronization</li>
              <li>• Offline caching with automatic sync</li>
              <li>• Connection status monitoring</li>
              <li>• Optimistic UI updates</li>
              <li>• Error handling with retry logic</li>
            </ul>
          </div>

          {/* Data Architecture */}
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
              Data Architecture
            </h3>
            <ul className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• User metrics collection</li>
              <li>• Daily snapshots for historical trends</li>
              <li>• Streak events tracking</li>
              <li>• Week-over-week comparisons</li>
              <li>• Automatic data aggregation</li>
              <li>• Performance optimized queries</li>
            </ul>
          </div>
        </div>

        {/* Current Metrics Debug Info */}
        {metrics && (
          <div className="mt-6">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
              Current Metrics (Debug)
            </h3>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-auto`}>
              <pre className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {JSON.stringify({
                  opportunities: metrics.opportunities,
                  goalsActive: metrics.goalsActive,
                  avgProgress: metrics.avgProgress,
                  daysStreak: metrics.daysStreak,
                  syncStatus: syncStatus,
                  lastUpdated: metrics.lastUpdated ? new Date(metrics.lastUpdated.toDate()).toISOString() : null,
                  weeklyComparison: metrics.weeklyComparison
                }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeDashboardDemo;