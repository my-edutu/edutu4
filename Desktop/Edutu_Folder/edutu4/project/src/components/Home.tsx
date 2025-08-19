import React, { useState, useEffect } from 'react';
import { 
  Home as HomeIcon, 
  MessageCircle, 
  User, 
  Briefcase, 
  Bell,
  Search,
  TrendingUp,
  Target,
  Award,
  Calendar,
  ArrowRight,
  Sparkles,
  Brain,
  Plus,
  BarChart3
} from 'lucide-react';
import OpportunityCard from './ui/OpportunityCard';
import ChatFAB from './ChatFAB';
import { useDarkMode } from '../hooks/useDarkMode';
import { OpportunityData } from '../hooks/useOpportunities';
import { useGoals } from '../hooks/useGoals';
import { useRealTimeMetrics } from '../hooks/useRealTimeMetrics';
import Button from './ui/Button';

interface HomeProps {
  user: { name: string; age: number; uid?: string } | null;
  opportunities: OpportunityData[];
  onOpportunityClick: (opportunity: OpportunityData) => void;
  onRoadmapClick?: (opportunity: OpportunityData) => void;
  onNavigate: (screen: string) => void;
  onViewAllOpportunities: () => void;
  onChatClick?: () => void;
  loading?: boolean;
}

type TabType = 'home' | 'chat' | 'profile' | 'opportunities';

const Home: React.FC<HomeProps> = ({
  user,
  opportunities,
  onOpportunityClick,
  onRoadmapClick,
  onNavigate,
  onViewAllOpportunities,
  onChatClick,
  loading = false
}) => {
  const { isDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications] = useState(3);
  
  // Fetch user goals for display
  const { goals: userGoals, loading: goalsLoading, error: goalsError, refreshGoals } = useGoals();
  
  // Refresh goals when component mounts or user changes
  useEffect(() => {
    if (user?.uid && !goalsLoading) {
      console.log('🔄 Home component mounted, refreshing goals for user:', user.uid);
      refreshGoals();
    }
  }, [user?.uid]);

  // Get top opportunities (limit to 6 for grid display)
  const topOpportunities = opportunities.slice(0, 6);

  // Import real-time metrics hook
  const {
    metrics: realTimeMetrics,
    isLoading: metricsLoading,
    recordActivity
  } = useRealTimeMetrics({ autoInitialize: true });
  
  // Use real-time metrics data or fallback to static data
  const stats = {
    applications: realTimeMetrics?.totalOpportunities || 12,
    matched: realTimeMetrics?.opportunities || opportunities.length,
    completed: realTimeMetrics?.completedGoals || 3,
    streak: realTimeMetrics?.daysStreak || 7
  };
  
  // Record activity when component mounts
  useEffect(() => {
    if (user?.uid) {
      recordActivity('login');
    }
  }, [user?.uid, recordActivity]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <div className={`p-4 rounded-2xl border transition-all hover:scale-105 cursor-pointer ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } shadow-sm hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-xl ${color}`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-500 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {title}
      </div>
    </div>
  );

  const QuickAction: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
  }> = ({ title, description, icon, color, onClick }) => (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 hover:shadow-md ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl ${color} flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            {description}
          </p>
        </div>
        <ArrowRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 mt-1`} />
      </div>
    </button>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Main Content */}
      <div className="pb-20">
        {/* Header */}
        <div className={`sticky top-0 z-40 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {user?.name?.[0] || 'E'}
                  </span>
                </div>
                <div>
                  <h1 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Welcome back, {user?.name || 'Explorer'}!
                  </h1>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ready to discover new opportunities?
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('notifications')}
                  className={`relative p-2 rounded-xl transition-colors ${
                    isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{notifications}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                searchFocused ? 'text-primary' : 'text-gray-400'
              } transition-colors`} />
              <input
                type="text"
                placeholder="Search opportunities, skills, or goals..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onClick={() => onNavigate('search')}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm transition-all ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                } ${searchFocused ? 'border-primary shadow-lg' : ''} focus:outline-none`}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Applications"
              value={stats.applications}
              icon={<Briefcase className="w-4 h-4 text-white" />}
              color="bg-gradient-to-r from-blue-500 to-blue-600"
              trend="+2"
            />
            <StatCard
              title="Matched"
              value={stats.matched}
              icon={<Target className="w-4 h-4 text-white" />}
              color="bg-gradient-to-r from-green-500 to-green-600"
              trend="+5"
            />
            <StatCard
              title="Completed"
              value={stats.completed}
              icon={<Award className="w-4 h-4 text-white" />}
              color="bg-gradient-to-r from-purple-500 to-purple-600"
            />
            <StatCard
              title="Day Streak"
              value={stats.streak}
              icon={<Calendar className="w-4 h-4 text-white" />}
              color="bg-gradient-to-r from-orange-500 to-orange-600"
              trend="🔥"
            />
          </div>

          {/* AI Insights Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Your AI-Powered Dashboard
                </h3>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                  Based on your profile, we've found {topOpportunities.length} highly matched opportunities. 
                  Your success rate has improved by 23% this month!
                </p>
                <Button
                  size="sm"
                  onClick={() => onNavigate('analytics')}
                  className="bg-white/10 hover:bg-white/20 text-primary border-primary/20"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickAction
                title="Create Learning Roadmap"
                description="Let AI build a personalized learning path"
                icon={<Sparkles className="w-5 h-5 text-white" />}
                color="bg-gradient-to-r from-purple-500 to-pink-600"
                onClick={() => onNavigate('roadmapBuilder')}
              />
              <QuickAction
                title="Set New Goal"
                description="Define your next achievement milestone"
                icon={<Plus className="w-5 h-5 text-white" />}
                color="bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={() => onNavigate('addGoal')}
              />
            </div>
          </div>

          {/* Top Opportunities */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Top Matches for You
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewAllOpportunities}
                className="flex items-center gap-2"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse"
                  >
                    <div className="h-32 bg-gray-200 dark:bg-gray-700" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : topOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topOpportunities.map((opportunity, index) => (
                  <div
                    key={opportunity.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <OpportunityCard
                      opportunity={opportunity}
                      onClick={onOpportunityClick}
                      onRoadmapClick={onRoadmapClick}
                      className="h-full"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🎯</div>
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  No opportunities yet
                </h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                  Complete your profile to get personalized recommendations
                </p>
                <Button onClick={() => onNavigate('profile')}>
                  Complete Profile
                </Button>
              </div>
            )}
          </div>

          {/* Your Goals Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Your Goals
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('goals')}
                className="flex items-center gap-2"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {goalsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : goalsError ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target size={32} className="text-red-600 dark:text-red-400" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Unable to load goals
                </h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                  {goalsError}
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Retry
                </Button>
              </div>
            ) : userGoals && userGoals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGoals.slice(0, 3).map((goal, index) => (
                  <div
                    key={goal.id}
                    className="animate-fade-in-up cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => onNavigate('goals')}
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-all transform hover:scale-[1.02]">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          goal.category === 'skill' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          goal.category === 'education' ? 'bg-purple-100 dark:bg-purple-900/30' :
                          goal.category === 'career' ? 'bg-green-100 dark:bg-green-900/30' :
                          goal.category === 'personal' ? 'bg-orange-100 dark:bg-orange-900/30' :
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {goal.category === 'skill' ? '💻' :
                           goal.category === 'education' ? '🎓' :
                           goal.category === 'career' ? '💼' :
                           goal.category === 'personal' ? '🌟' :
                           goal.category === 'roadmap' ? '🗺️' :
                           '🎯'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-1 mb-1`}>
                            {goal.title}
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} capitalize`}>
                            {goal.category} • {goal.difficulty || 'Medium'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Progress
                          </span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {goal.progress || 0}%
                          </span>
                        </div>
                        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2`}>
                          <div 
                            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                            style={{ width: `${goal.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Next Milestone */}
                      {goal.milestones && goal.milestones.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-primary" />
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-1`}>
                            Next: {goal.milestones.find(m => !m.completed)?.title || 'All milestones completed!'}
                          </span>
                        </div>
                      )}

                      {/* Target Date */}
                      {goal.targetDate && (
                        <div className="flex items-center gap-2 text-sm mt-2">
                          <Calendar className="w-4 h-4 text-accent" />
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Due: {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target size={32} className="text-white" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Ready to set your first goal?
                </h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                  Start your journey by creating a personalized learning goal
                </p>
                <Button onClick={() => onNavigate('addGoal')} className="inline-flex items-center gap-2">
                  <Plus size={16} />
                  Create Your First Goal
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 ${
        isDarkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'
      } backdrop-blur-sm border-t z-50`}>
        <div className="grid grid-cols-4 py-2">
          {[
            { id: 'home', icon: HomeIcon, label: 'Home' },
            { id: 'opportunities', icon: Briefcase, label: 'Opportunities' },
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id as TabType);
                if (id === 'home') return; // Already on home
                if (id === 'opportunities') onViewAllOpportunities();
                else if (id === 'chat') onChatClick?.();
                else onNavigate(id);
              }}
              className={`flex flex-col items-center gap-1 py-2 px-1 transition-colors ${
                activeTab === id
                  ? 'text-primary'
                  : isDarkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
              {activeTab === id && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat FAB */}
      <ChatFAB onChatClick={onChatClick} />

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Home;