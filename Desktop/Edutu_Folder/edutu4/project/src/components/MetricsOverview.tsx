import React, { useState, useEffect } from 'react';
import { Target, Sparkles, TrendingUp, Flame, RefreshCw, AlertCircle, Trophy, Zap, Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import MetricsCard from './MetricsCard';
import { useRealTimeMetrics, useStreakTracking } from '../hooks/useRealTimeMetrics';
import { useDarkMode } from '../hooks/useDarkMode';

interface MetricsOverviewProps {
  onOpportunitiesClick?: () => void;
  onGoalsClick?: () => void;
  onProgressClick?: () => void;
  onStreakClick?: () => void;
  className?: string;
}

const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  onOpportunitiesClick,
  onGoalsClick, 
  onProgressClick,
  onStreakClick,
  className = ''
}) => {
  const { isDarkMode } = useDarkMode();
  const { 
    metrics, 
    isLoading, 
    error, 
    syncStatus,
    isConnected,
    refreshMetrics,
    formatTrendDisplay,
    getMetricTrend
  } = useRealTimeMetrics({ autoInitialize: true, enableCaching: true });
  
  const {
    currentStreak,
    streakRecord,
    getStreakStatus,
    isNewRecord
  } = useStreakTracking();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMetrics();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000); // Show refresh animation for at least 1s
    }
  };

  // Show connection status temporarily when it changes
  useEffect(() => {
    if (!isConnected) {
      setShowConnectionStatus(true);
      const timer = setTimeout(() => setShowConnectionStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const getEncouragementMessage = () => {
    if (!metrics) return null;

    const { opportunities, goalsActive, avgProgress } = metrics;

    if (opportunities === 0 && goalsActive === 0) {
      return {
        type: 'welcome',
        title: '🌟 Welcome to Edutu!',
        message: 'Start your journey by setting your first goal or exploring opportunities. Every expert was once a beginner!',
        action: 'Set Your First Goal'
      };
    }

    if (currentStreak >= 7) {
      return {
        type: 'celebration',
        title: `🔥 ${isNewRecord ? 'New Record!' : 'Amazing streak!'}`,
        message: `${currentStreak} days of consistent progress. ${isNewRecord ? 'You\'ve set a new personal record!' : 'You\'re building incredible momentum!'}`,
        action: 'Keep Going Strong'
      };
    }

    if (avgProgress >= 75) {
      return {
        type: 'success',
        title: '🎯 Excellent progress!',
        message: 'You\'re crushing your goals with outstanding consistency. Success is within reach!',
        action: 'View Progress Details'
      };
    }

    if (opportunities > 5) {
      return {
        type: 'opportunity',
        title: '💫 Rich opportunities!',
        message: `${opportunities} opportunities await you. Time to transform potential into achievement!`,
        action: 'Explore Opportunities'
      };
    }

    return {
      type: 'motivation',
      title: '💪 Keep pushing forward!',
      message: 'Every small step leads to extraordinary outcomes. Your consistency is your superpower!',
      action: 'Continue Journey'
    };
  };

  const encouragement = getEncouragementMessage();

  // Get trend data from real-time metrics
  const getTrend = (metricKey: 'opportunities' | 'goalsActive' | 'avgProgress' | 'daysStreak') => {
    const trend = getMetricTrend(metricKey);
    return {
      direction: trend.direction === 'stable' ? 'neutral' : trend.direction,
      percentage: Math.abs(trend.percentage),
      period: 'last week'
    };
  };

  // Get sync status icon and color
  const getSyncStatusDisplay = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: isConnected ? Cloud : CloudOff,
          color: 'text-green-500',
          label: 'Synced'
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          label: 'Syncing'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          label: 'Sync Error'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          label: 'Offline'
        };
      default:
        return {
          icon: Cloud,
          color: 'text-gray-400',
          label: 'Unknown'
        };
    }
  };

  const syncStatusDisplay = getSyncStatusDisplay();

  if (error) {
    return (
      <div className={`${className} p-6 rounded-2xl border ${isDarkMode ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={24} className="text-red-500" />
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Unable to Load Metrics
          </h3>
        </div>
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all
            ${isDarkMode ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-800'}
          `}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with Refresh and Sync Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <Trophy size={24} className="text-primary" />
            Your Progress Dashboard
            {/* Real-time indicator */}
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Live metrics with instant updates
            </p>
            {/* Sync Status */}
            <div className={`flex items-center gap-1 text-xs ${syncStatusDisplay.color}`}>
              <syncStatusDisplay.icon size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              <span>{syncStatusDisplay.label}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          {showConnectionStatus && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all
              ${isConnected ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}
            `}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          )}
          
          {/* Manual Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || syncStatus === 'syncing'}
            className={`
              p-3 rounded-xl transition-all disabled:opacity-50
              ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}
            `}
            title={`${syncStatus === 'syncing' ? 'Syncing...' : 'Refresh metrics'}`}
          >
            <RefreshCw size={20} className={isRefreshing || syncStatus === 'syncing' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Encouragement Banner */}
      {encouragement && (
        <div className={`
          mb-6 p-4 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.01]
          ${encouragement.type === 'welcome' ? (isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200') : ''}
          ${encouragement.type === 'celebration' ? (isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200') : ''}
          ${encouragement.type === 'success' ? (isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200') : ''}
          ${encouragement.type === 'opportunity' ? (isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200') : ''}
          ${encouragement.type === 'motivation' ? (isDarkMode ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200') : ''}
        `}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {encouragement.title}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {encouragement.message}
              </p>
            </div>
            <Zap size={24} className="text-primary animate-pulse" />
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricsCard
          title="Opportunities"
          value={metrics?.opportunities ?? 0}
          icon={Sparkles}
          color="blue"
          isLoading={isLoading}
          onClick={onOpportunitiesClick}
          trend={metrics ? getTrend('opportunities') : undefined}
          animationDelay={0}
        />

        <MetricsCard
          title="Goals Active"
          value={metrics?.goalsActive ?? 0}
          icon={Target}
          color="green"
          isLoading={isLoading}
          onClick={onGoalsClick}
          trend={metrics ? getTrend('goalsActive') : undefined}
          animationDelay={100}
        />

        <MetricsCard
          title="Avg Progress"
          value={metrics?.avgProgress ?? 0}
          icon={TrendingUp}
          color="yellow"
          suffix="%"
          isLoading={isLoading}
          onClick={onProgressClick}
          trend={metrics ? getTrend('avgProgress') : undefined}
          showProgress={true}
          maxValue={100}
          animationDelay={200}
        />

        <MetricsCard
          title={`Days Streak${isNewRecord ? ' 🏆' : ''}`}
          value={currentStreak}
          icon={Flame}
          color="purple"
          isLoading={isLoading}
          onClick={onStreakClick}
          trend={metrics ? getTrend('daysStreak') : undefined}
          animationDelay={300}
        />
      </div>


      {/* Last Updated Indicator with Enhanced Status */}
      {metrics && !isLoading && (
        <div className={`
          mt-4 flex items-center justify-center gap-4 text-xs
          ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}
        `}>
          <span>Last updated: {metrics.lastUpdated ? (
            typeof metrics.lastUpdated.toDate === 'function' 
              ? new Date(metrics.lastUpdated.toDate()).toLocaleTimeString()
              : new Date(metrics.lastUpdated).toLocaleTimeString()
          ) : 'Just now'}</span>
          
          {/* Streak Status */}
          {currentStreak > 0 && (
            <div className="flex items-center gap-1">
              <span>•</span>
              <span className={`
                font-medium
                ${getStreakStatus() === 'active' ? 'text-green-500' : ''}
                ${getStreakStatus() === 'at_risk' ? 'text-yellow-500' : ''}
                ${getStreakStatus() === 'broken' ? 'text-red-500' : ''}
              `}>
                Streak: {getStreakStatus() === 'active' ? '🔥 Active' : getStreakStatus() === 'at_risk' ? '⚠️ At Risk' : '💔 Broken'}
              </span>
              {streakRecord > 1 && (
                <span className="ml-1">(Record: {streakRecord})</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricsOverview;