import React, { useState, useMemo, useCallback } from 'react';
import { Target, Sparkles, TrendingUp, Flame, RefreshCw, AlertCircle, Trophy, Zap } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { GoalStats } from '../types/goals';

interface MetricsOverviewProps {
  stats: GoalStats | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => Promise<void>;
  onOpportunitiesClick?: () => void;
  onGoalsClick?: () => void;
  onProgressClick?: () => void;
  onStreakClick?: () => void;
  className?: string;
}

// Smooth number animation component
const AnimatedNumber: React.FC<{ 
  value: number; 
  previousValue?: number;
  suffix?: string; 
  className?: string;
  duration?: number;
}> = React.memo(({ value, previousValue = 0, suffix = '', className = '', duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(previousValue);
  const [isAnimating, setIsAnimating] = useState(false);

  React.useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const startValue = displayValue;
      const difference = value - startValue;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out animation
        const easeOutProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (difference * easeOutProgress));
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, displayValue, duration]);

  return (
    <span className={`${className} ${isAnimating ? 'text-primary' : ''} transition-colors duration-300`}>
      {displayValue}{suffix}
    </span>
  );
});

AnimatedNumber.displayName = 'AnimatedNumber';

const OptimizedMetricsOverview: React.FC<MetricsOverviewProps> = ({
  stats,
  isLoading,
  error,
  onRefresh,
  onOpportunitiesClick,
  onGoalsClick, 
  onProgressClick,
  onStreakClick,
  className = ''
}) => {
  const { isDarkMode } = useDarkMode();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previousStats, setPreviousStats] = useState<GoalStats | null>(null);

  // Update previous stats when stats change
  React.useEffect(() => {
    if (stats && JSON.stringify(stats) !== JSON.stringify(previousStats)) {
      setPreviousStats(stats);
    }
  }, [stats, previousStats]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [onRefresh]);

  const getEncouragementMessage = useCallback(() => {
    if (!stats) return null;

    const { activeGoals, averageProgress, currentStreak } = stats;

    if (activeGoals === 0) {
      return {
        type: 'welcome',
        title: '🌟 Welcome to Edutu!',
        message: 'Start your journey by setting your first goal. Every expert was once a beginner!',
        action: 'Set Your First Goal'
      };
    }

    if (currentStreak >= 7) {
      return {
        type: 'celebration',
        title: '🔥 Amazing streak!',
        message: `${currentStreak} days of consistent progress. You're building incredible momentum!`,
        action: 'Keep Going Strong'
      };
    }

    if (averageProgress >= 75) {
      return {
        type: 'success',
        title: '🎯 Excellent progress!',
        message: 'You\'re crushing your goals with outstanding consistency. Success is within reach!',
        action: 'View Progress Details'
      };
    }

    return {
      type: 'motivation',
      title: '💪 Keep pushing forward!',
      message: 'Every small step leads to extraordinary outcomes. Your consistency is your superpower!',
      action: 'Continue Journey'
    };
  }, [stats]);

  const encouragement = useMemo(() => getEncouragementMessage(), [getEncouragementMessage]);

  // Memoized metrics to prevent unnecessary re-renders
  const metrics = useMemo(() => [
    {
      title: 'Active Goals',
      value: stats?.activeGoals ?? 0,
      previous: previousStats?.activeGoals ?? 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200',
      onClick: onGoalsClick
    },
    {
      title: 'Avg Progress',
      value: stats?.averageProgress ?? 0,
      previous: previousStats?.averageProgress ?? 0,
      suffix: '%',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200',
      onClick: onProgressClick,
      showProgress: true
    },
    {
      title: 'Days Streak',
      value: stats?.currentStreak ?? 0,
      previous: previousStats?.currentStreak ?? 0,
      icon: Flame,
      color: 'text-orange-600',
      bgColor: isDarkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200',
      onClick: onStreakClick
    },
    {
      title: 'Completed',
      value: stats?.completedGoals ?? 0,
      previous: previousStats?.completedGoals ?? 0,
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'
    }
  ], [stats, previousStats, isDarkMode, onGoalsClick, onProgressClick, onStreakClick]);

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
        {onRefresh && (
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
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <Trophy size={24} className="text-primary" />
            Your Progress Dashboard
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Real-time metrics updating automatically
          </p>
        </div>
        
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`
              p-3 rounded-xl transition-all disabled:opacity-50
              ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}
            `}
            title="Refresh metrics"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Encouragement Banner */}
      {encouragement && (
        <div className={`
          mb-6 p-4 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.01]
          ${encouragement.type === 'welcome' ? (isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200') : ''}
          ${encouragement.type === 'celebration' ? (isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200') : ''}
          ${encouragement.type === 'success' ? (isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200') : ''}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading && !stats ? (
          // Loading skeletons
          [...Array(4)].map((_, i) => (
            <div key={i} className={`p-4 rounded-2xl border animate-pulse ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-3`} />
              <div className={`h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`} />
              <div className={`h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4`} />
            </div>
          ))
        ) : (
          // Actual metrics
          metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.title}
                className={`
                  p-4 rounded-2xl border transition-all duration-300 hover:scale-105 
                  ${metric.bgColor}
                  ${metric.onClick ? 'cursor-pointer' : ''}
                  animate-fade-in
                `}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={metric.onClick}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${metric.bgColor.split(' ')[0]}`}>
                    <Icon size={20} className={metric.color} />
                  </div>
                  {metric.onClick && (
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {metric.title}
                  </p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <AnimatedNumber 
                      value={metric.value}
                      previousValue={metric.previous}
                      suffix={metric.suffix}
                    />
                  </p>
                  
                  {metric.showProgress && (
                    <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-1.5 mt-2`}>
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(metric.value, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Last Updated Indicator */}
      {stats && !isLoading && (
        <div className={`
          mt-4 text-center text-xs
          ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}
        `}>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default React.memo(OptimizedMetricsOverview);