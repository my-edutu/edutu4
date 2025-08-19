import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MessageCircle, Target, TrendingUp, BookOpen, Users, Award, ChevronRight, Sparkles, CheckCircle2, FileText, Upload, BarChart3, Zap, Plus, Globe, Bell, Menu, X, Star, Trophy, Calendar, Briefcase, GraduationCap, Heart, LogOut, Loader2, Brain, Flame } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import NotificationInbox from './NotificationInbox';
import SuccessStories from './SuccessStories';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuth } from '../hooks/useAuth';
import { goalsService } from '../services/goalsService';
import { UserGoal, GoalStats } from '../types/goals';
import { useTopOpportunities } from '../hooks/useOpportunities';
import MCPDashboard from './MCPDashboard';
import { LoadingSpinner, OpportunityCardSkeleton, ErrorState } from './ui/LoadingStates';
import ErrorBoundary from './ui/ErrorBoundary';
import OpportunityList from './ui/OpportunityList';

interface DashboardProps {
  user: { name: string; age: number } | null;
  onOpportunityClick: (opportunity: any) => void;
  onViewAllOpportunities: () => void;
  onGoalClick: (goalTitle: string) => void;
  onNavigate?: (screen: string) => void;
  onAddGoal?: () => void;
  onLogout?: () => void;
}

// Smooth number animation component
const AnimatedNumber: React.FC<{ 
  value: number; 
  previousValue?: number;
  suffix?: string; 
  className?: string;
  duration?: number;
}> = ({ value, previousValue = 0, suffix = '', className = '', duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(previousValue);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
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
};

// Optimized Progress Dashboard Component
const ProgressDashboard: React.FC<{
  stats: GoalStats | null;
  isLoading: boolean;
  onGoalsClick?: () => void;
  onStreakClick?: () => void;
  className?: string;
}> = React.memo(({ stats, isLoading, onGoalsClick, onStreakClick, className = '' }) => {
  const { isDarkMode } = useDarkMode();
  const [previousStats, setPreviousStats] = useState<GoalStats | null>(null);

  useEffect(() => {
    if (stats && JSON.stringify(stats) !== JSON.stringify(previousStats)) {
      setPreviousStats(stats);
    }
  }, [stats, previousStats]);

  if (isLoading && !stats) {
    return (
      <div className={`${className} grid grid-cols-2 lg:grid-cols-4 gap-4`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} animate-pulse`}>
            <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`} />
            <div className={`h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`} />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Active Goals',
      value: stats?.activeGoals ?? 0,
      previous: previousStats?.activeGoals ?? 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      onClick: onGoalsClick
    },
    {
      title: 'Avg Progress',
      value: stats?.averageProgress ?? 0,
      previous: previousStats?.averageProgress ?? 0,
      suffix: '%',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: isDarkMode ? 'bg-green-900/20' : 'bg-green-50',
      showProgress: true
    },
    {
      title: 'Days Streak',
      value: stats?.currentStreak ?? 0,
      previous: previousStats?.currentStreak ?? 0,
      icon: Flame,
      color: 'text-orange-600',
      bgColor: isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      onClick: onStreakClick
    },
    {
      title: 'Completed',
      value: stats?.completedGoals ?? 0,
      previous: previousStats?.completedGoals ?? 0,
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'
    }
  ];

  return (
    <div className={`${className} grid grid-cols-2 lg:grid-cols-4 gap-4`}>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.title}
            className={`
              p-4 rounded-2xl border transition-all duration-300 hover:scale-105 
              ${metric.bgColor} 
              ${isDarkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'}
              ${metric.onClick ? 'cursor-pointer' : ''}
              animate-fade-in
            `}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={metric.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${metric.bgColor}`}>
                <Icon size={20} className={metric.color} />
              </div>
              {metric.onClick && (
                <ChevronRight size={16} className="text-gray-400" />
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
      })}
    </div>
  );
});

ProgressDashboard.displayName = 'ProgressDashboard';

const OptimizedDashboard: React.FC<DashboardProps> = ({ 
  user, 
  onOpportunityClick, 
  onViewAllOpportunities,
  onGoalClick,
  onNavigate,
  onAddGoal,
  onLogout 
}) => {
  const { isDarkMode } = useDarkMode();
  const { user: authUser } = useAuth();
  
  // Real-time goals state
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // UI state
  const [recentAchievements, setRecentAchievements] = useState([
    { 
      id: '1',
      title: "Set up Python development environment", 
      icon: <CheckCircle2 size={14} />, 
      date: "Today",
      type: "task_completed"
    },
    { 
      id: '2',
      title: "Complete Python basics tutorial", 
      icon: <CheckCircle2 size={14} />, 
      date: "Today",
      type: "task_completed"
    },
    { 
      id: '3',
      title: "Profile Complete", 
      icon: <Award size={14} />, 
      date: "Yesterday",
      type: "milestone"
    }
  ]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [unreadCount] = useState(3);
  const [showMCPDashboard, setShowMCPDashboard] = useState(false);
  
  // Use the optimized opportunities hook
  const { opportunities, loading: opportunitiesLoading, error: opportunitiesError } = useTopOpportunities(3);
  const [hasNewOpportunities, setHasNewOpportunities] = useState(false);

  // Real-time goals subscription
  useEffect(() => {
    if (!authUser?.uid) {
      setGoals([]);
      setGoalsLoading(false);
      setStats(null);
      setStatsLoading(false);
      return;
    }

    let unsubscribeGoals: (() => void) | undefined;
    let statsInterval: NodeJS.Timeout;

    const setupRealTimeUpdates = async () => {
      try {
        // Set up real-time goals subscription
        unsubscribeGoals = goalsService.subscribeToUserGoals(
          authUser.uid,
          (updatedGoals) => {
            setGoals(updatedGoals);
            setGoalsLoading(false);
            setGoalsError(null);
          },
          { status: ['active', 'completed'] }
        );

        // Initial stats fetch
        const initialStats = await goalsService.getGoalStats(authUser.uid);
        setStats(initialStats);
        setStatsLoading(false);

        // Set up periodic stats updates (every 30 seconds)
        statsInterval = setInterval(async () => {
          try {
            const updatedStats = await goalsService.getGoalStats(authUser.uid);
            setStats(updatedStats);
          } catch (error) {
            console.error('Error updating stats:', error);
          }
        }, 30000);

      } catch (error) {
        console.error('Error setting up real-time updates:', error);
        setGoalsError('Failed to load goals');
        setGoalsLoading(false);
        setStatsLoading(false);
      }
    };

    setupRealTimeUpdates();

    return () => {
      if (unsubscribeGoals) {
        unsubscribeGoals();
      }
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    };
  }, [authUser?.uid]);

  // Set hasNewOpportunities when opportunities are loaded
  useEffect(() => {
    if (opportunities && opportunities.length > 0) {
      setHasNewOpportunities(true);
    }
  }, [opportunities]);

  // Memoized user stories to prevent unnecessary re-renders
  const userStories = useMemo(() => [
    {
      id: '1',
      name: 'Amara Okafor',
      avatar: '👩🏾‍💻',
      title: 'From Zero to Google Software Engineer',
      description: 'How I landed my dream job at Google using Edutu\'s roadmap',
      bio: 'Started as a complete beginner in programming at 22. Through dedication and Edutu\'s structured roadmap, mastered algorithms, system design, and interview skills. Now mentoring other aspiring engineers.',
      achievement: 'Software Engineer at Google',
      timeframe: '18 months',
      category: 'Tech Career',
      roadmapData: {
        title: 'Google Software Engineer Path',
        type: 'roadmap',
        template: {
          id: 'google-swe-path',
          title: 'Google Software Engineer Career Path',
          description: 'Complete roadmap from beginner to Google Software Engineer with coding practice, system design, and interview preparation',
          duration: '18 months',
          difficulty: 'Advanced',
          icon: <Briefcase size={24} className="text-blue-600" />,
          category: 'Programming',
          milestones: 24,
          estimatedTime: '15-20 hours/week',
          skills: ['Data Structures', 'Algorithms', 'System Design', 'Coding Interviews', 'Software Engineering'],
          color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }
      }
    },
    // Add other stories as needed...
  ], []);

  const menuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: <Target size={20} /> },
    { id: 'chat', label: 'AI Coach', icon: <MessageCircle size={20} /> },
    { id: 'all-opportunities', label: 'All Opportunities', icon: <Sparkles size={20} /> },
    { id: 'mcp-dashboard', label: 'MCP Integration', icon: <Brain size={20} /> },
    { id: 'community-marketplace', label: 'Community Roadmaps', icon: <Globe size={20} /> },
    { id: 'cv-management', label: 'CV Management', icon: <FileText size={20} /> },
    { id: 'add-goal', label: 'Add Goal', icon: <Plus size={20} /> },
    { id: 'profile', label: 'Profile', icon: <Users size={20} /> },
    { id: 'sign-out', label: 'Sign Out', icon: <LogOut size={20} />, isSignOut: true }
  ], []);

  // Optimized event handlers with useCallback
  const handleViewMoreAchievements = useCallback(() => {
    if (onNavigate) {
      onNavigate('achievements');
    }
  }, [onNavigate]);

  const handleCVManagement = useCallback(() => {
    if (onNavigate) {
      onNavigate('cv-management');
    }
  }, [onNavigate]);

  const handleCommunityMarketplace = useCallback(() => {
    if (onNavigate) {
      onNavigate('community-marketplace');
    }
  }, [onNavigate]);

  const handleMenuItemClick = useCallback((itemId: string) => {
    setShowMenu(false);
    if (itemId === 'sign-out' && onLogout) {
      onLogout();
    } else if (itemId === 'add-goal' && onAddGoal) {
      onAddGoal();
    } else if (itemId === 'mcp-dashboard') {
      setShowMCPDashboard(true);
    } else if (onNavigate) {
      onNavigate(itemId);
    }
  }, [onLogout, onAddGoal, onNavigate]);

  const handleMetricsClick = useMemo(() => ({
    onOpportunitiesClick: () => onViewAllOpportunities(),
    onGoalsClick: () => onNavigate && onNavigate('goals-page'),
    onProgressClick: () => handleViewMoreAchievements(),
    onStreakClick: () => setShowStreakPopup(true)
  }), [onViewAllOpportunities, onNavigate, handleViewMoreAchievements]);

  const handleGetRoadmap = useCallback((story: any) => {
    const goalData = {
      type: 'roadmap',
      template: story.roadmapData.template,
      title: story.roadmapData.title
    };
    
    if (onNavigate) {
      onNavigate('community-marketplace');
    }
  }, [onNavigate]);

  const getTimeOfDay = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []);

  const timeOfDay = getTimeOfDay();
  const greeting = `Good ${timeOfDay}`;

  // Show MCP Dashboard if requested
  if (showMCPDashboard) {
    return <MCPDashboard onBack={() => setShowMCPDashboard(false)} />;
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} animate-fade-in`}>
      {/* Professional Welcome Header */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles size={28} className="text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                  {greeting}, {user?.name}! 👋
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
                  Ready to unlock new opportunities today?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(true)}
                  className={`relative p-3 rounded-2xl transition-all hover:scale-110 ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Bell size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </div>
                  )}
                </button>
              </div>

              {/* Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className={`relative p-3 rounded-2xl transition-all hover:scale-110 ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {showMenu ? (
                    <X size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                  ) : (
                    <Menu size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                  )}
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-64 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-xl z-50 animate-slide-up`}>
                    <div className="p-2">
                      {menuItems.map((item, index) => {
                        const getButtonClasses = () => {
                          let classes = 'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left animate-slide-up';
                          
                          if (item.isSignOut) {
                            classes += isDarkMode 
                              ? ' border-t border-gray-600 mt-2 pt-4 hover:bg-red-900/20' 
                              : ' border-t border-gray-200 mt-2 pt-4 hover:bg-red-50';
                          } else {
                            classes += isDarkMode ? ' hover:bg-gray-700' : ' hover:bg-gray-50';
                          }
                          
                          return classes;
                        };
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleMenuItemClick(item.id)}
                            className={getButtonClasses()}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className={`w-10 h-10 ${item.isSignOut ? (isDarkMode ? 'bg-red-900/30' : 'bg-red-50') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-100')} rounded-xl flex items-center justify-center`}>
                              <div className={item.isSignOut ? 'text-red-500' : ''}>
                                {item.icon}
                              </div>
                            </div>
                            <span className={`font-medium ${item.isSignOut ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-800')}`}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optimized Progress Dashboard */}
          <ProgressDashboard
            stats={stats}
            isLoading={statsLoading}
            onGoalsClick={handleMetricsClick.onGoalsClick}
            onStreakClick={handleMetricsClick.onStreakClick}
            className=""
          />
        </div>
      </div>

      <main className="safe-area-x px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8" role="main">
        {/* Success Stories Carousel */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <SuccessStories onGetRoadmap={handleGetRoadmap} />
        </Card>

        {/* Current Goals - Optimized */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Target size={24} className="text-primary" />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Your Goals</h2>
          </div>
          
          {goalsLoading && goals.length === 0 ? (
            // Loading skeleton - only show when no cached data
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`animate-pulse p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded mb-2`} />
                  <div className={`h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-full mb-2`} />
                  <div className={`h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/4`} />
                </div>
              ))}
            </div>
          ) : goals.length === 0 ? (
            // Empty state
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Target size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Ready to start your journey?
                  </h3>
                  <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Add your first goal to track your progress and unlock your potential. You can create custom goals or convert opportunities into actionable goals.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={onAddGoal}
                      size="sm"
                      className="inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      Add Goal
                    </Button>
                    <Button 
                      onClick={onViewAllOpportunities}
                      variant="secondary"
                      size="sm"
                      className="inline-flex items-center gap-1.5"
                    >
                      <Globe size={14} />
                      Browse Opportunities
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Display real goals with smooth animations
            goals.slice(0, 3).map((goal, index) => (
              <div 
                key={goal.id} 
                className={`animate-slide-up cursor-pointer hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-2xl transition-all group border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onGoalClick(goal.title)}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{goal.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {goal.targetDate ? new Date(goal.targetDate.toDate ? goal.targetDate.toDate() : goal.targetDate).toLocaleDateString() : 'No deadline'}
                    </span>
                    <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div className={`w-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full h-3 mb-2`}>
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${goal.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-sm text-primary font-medium">
                  <AnimatedNumber value={goal.progress} suffix="% complete" />
                </div>
              </div>
            ))
          )}
          
          {/* Show "View All" link if user has more than 3 goals */}
          {goals.length > 3 && (
            <div className="pt-2">
              <button
                onClick={() => onNavigate && onNavigate('goals-page')}
                className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} flex items-center gap-1 font-medium`}
              >
                View all {goals.length} goals
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Custom Roadmap Builder */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm hover:shadow-lg transition-all cursor-pointer group`} onClick={() => onNavigate && onNavigate('roadmap-builder')}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${isDarkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-50 to-purple-100'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                <Target size={32} className={`${isDarkMode ? 'text-white' : 'text-purple-600'}`} />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1 group-hover:text-primary transition-colors`}>Build Custom Roadmap</h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Create your personalized success blueprint from scratch</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'} rounded-full text-sm font-medium`}>
                Pro Tool
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          
          <div className="mb-4">
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed mb-4`}>
              Design your own success journey with our advanced roadmap builder. Perfect for unique goals, 
              complex projects, or when you want complete control over your path to achievement.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
                <Target size={20} className="text-purple-600 mx-auto mb-2" />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Custom Tasks</p>
              </div>
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
                <Calendar size={20} className="text-blue-600 mx-auto mb-2" />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Timeline Control</p>
              </div>
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
                <TrendingUp size={20} className="text-green-600 mx-auto mb-2" />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Progress Tracking</p>
              </div>
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
                <Sparkles size={20} className="text-yellow-600 mx-auto mb-2" />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Visual Design</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate && onNavigate('roadmap-builder');
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <Plus size={16} />
              Start Building Your Roadmap
            </Button>
          </div>
        </Card>

        {/* Personalized Opportunities */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles size={24} className="text-primary" />
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Opportunities for You
                {hasNewOpportunities && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    NEW
                  </span>
                )}
              </h2>
            </div>
            <Button variant="secondary" className={`${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}`} onClick={onViewAllOpportunities}>
              View All
            </Button>
          </div>
          
          {opportunitiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className={`ml-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading opportunities...</span>
            </div>
          ) : opportunitiesError ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Connection Error</h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>{opportunitiesError}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Refresh Page
                </Button>
                <Button onClick={onViewAllOpportunities} variant="primary" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>No opportunities yet</h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Our AI is currently discovering new opportunities for you.</p>
              <Button onClick={onViewAllOpportunities} variant="outline" size="sm">
                Check Back Later
              </Button>
            </div>
          ) : (
            <OpportunityList
              opportunities={opportunities}
              loading={false}
              error={null}
              onOpportunityClick={onOpportunityClick}
              showLoadMore={false}
              compact={true}
              emptyTitle="No opportunities yet"
              emptyMessage="Our AI is currently discovering new opportunities for you."
            />
          )}
        </Card>

        {/* CV Management Section */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${isDarkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-50 to-blue-100'} rounded-2xl flex items-center justify-center`}>
                <FileText size={24} className={`${isDarkMode ? 'text-white' : 'text-primary'}`} />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1`}>CV Management</h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upload, optimize, and enhance your CV for better opportunities</p>
              </div>
            </div>
            <div className={`px-3 py-1 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'} rounded-full text-sm font-medium`}>
              New Features
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
              <Upload size={20} className="text-primary mx-auto mb-2" />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Upload & Scan</p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
              <Zap size={20} className="text-accent mx-auto mb-2" />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>AI Optimization</p>
            </div>
          </div>

          <Button 
            onClick={handleCVManagement}
            className="w-full flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            Open CV Management
            <ChevronRight size={16} />
          </Button>
        </Card>

        {/* Community Marketplace Section */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] group`} onClick={handleCommunityMarketplace}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${isDarkMode ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-green-50 to-green-100'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Globe size={24} className={`${isDarkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1 group-hover:text-primary transition-colors`}>Community Roadmaps</h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Discover success paths shared by accomplished community members</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'} rounded-full text-sm font-medium`}>
                500+ Roadmaps
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
              <Users size={20} className="text-green-600 mx-auto mb-2" />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Success Stories</p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
              <Award size={20} className="text-yellow-600 mx-auto mb-2" />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Proven Results</p>
            </div>
            <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}>
              <MessageCircle size={20} className="text-blue-600 mx-auto mb-2" />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Connect & Learn</p>
            </div>
          </div>

          <div className="text-center">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
              Browse roadmaps from successful entrepreneurs, scholars, and professionals
            </p>
          </div>
        </Card>

        {/* Recent Achievements - Reduced Size */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-accent" />
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Recent Achievements</h2>
            </div>
            <Button variant="secondary" className={`${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'} text-sm px-3 py-1`} onClick={handleViewMoreAchievements}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentAchievements.slice(0, 3).map((achievement, index) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-accent/10 dark:bg-accent/20 rounded-xl animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white">
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{achievement.title}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>

      {/* Streak Popup */}
      {showStreakPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-2xl p-8 text-center animate-fade-in`}>
            <div className="text-6xl mb-4">🔥</div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
              {stats?.currentStreak || 1}-Day Streak! 🎉
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 leading-relaxed`}>
              Amazing! You've been consistently working on your goals for {stats?.currentStreak || 1} days straight. 
              This dedication is what separates dreamers from achievers. Keep going!
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                <div className="text-2xl font-bold text-primary">
                  <AnimatedNumber value={stats?.currentStreak || 1} />
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Days</div>
              </div>
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                <div className="text-2xl font-bold text-accent">
                  <AnimatedNumber value={stats?.activeGoals || 0} />
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Goals</div>
              </div>
            </div>
            <Button
              onClick={() => setShowStreakPopup(false)}
              className="w-full"
            >
              Keep Going! 💪
            </Button>
          </div>
        </div>
      )}

      {/* Notification Inbox */}
      <NotificationInbox 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />

      {/* Menu Backdrop */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40 bg-black/20" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

// Wrap with ErrorBoundary for production resilience
const OptimizedDashboardWithErrorBoundary: React.FC<DashboardProps> = (props) => (
  <ErrorBoundary>
    <OptimizedDashboard {...props} />
  </ErrorBoundary>
);

export default OptimizedDashboardWithErrorBoundary;