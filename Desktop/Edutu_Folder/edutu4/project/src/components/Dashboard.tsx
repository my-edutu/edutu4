import React, { useState, useEffect } from 'react';
import { MessageCircle, Target, TrendingUp, Users, Award, ChevronRight, Sparkles, CheckCircle2, FileText, Plus, Globe, Bell, Menu, X, Star, Trophy, Briefcase, GraduationCap, Heart, LogOut, Loader2, Brain, Calendar } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import NotificationInbox from './NotificationInbox';
import MetricsOverview from './MetricsOverview';
import SuccessStories from './SuccessStories';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoals } from '../hooks/useGoals';
import { opportunityRefreshService } from '../services/apiService';
import { useTopOpportunities } from '../hooks/useOpportunities';
import MCPDashboard from './MCPDashboard';
import ErrorBoundary from './ui/ErrorBoundary';
import OpportunityList from './ui/OpportunityList';
import { useGoalEvents } from '../utils/goalEvents';
import GoalProgressTracker from './GoalProgressTracker';
import DashboardDiagnostics from './DashboardDiagnostics';

interface DashboardProps {
  user: { name: string; age: number } | null;
  onOpportunityClick: (opportunity: any) => void;
  onViewAllOpportunities: () => void;
  onGoalClick: (goalId: string) => void;
  onNavigate?: (screen: string) => void;
  onAddGoal?: () => void;
  onLogout?: () => void;
  refreshTrigger?: number;
  onGetRoadmap?: (opportunity: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  onOpportunityClick, 
  onViewAllOpportunities,
  onGoalClick,
  onNavigate,
  onAddGoal,
  onLogout,
  refreshTrigger,
  onGetRoadmap 
}) => {
  const { isDarkMode } = useDarkMode();
  // Temporarily remove status filter for debugging
  const { goals, loading: goalsLoading, createGoal, refreshGoals } = useGoals(); // { status: ['active'] }
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Transform goals into individual tasks for display
  const getDisplayTasks = () => {
    const tasks: any[] = [];
    
    goals.forEach(goal => {
      // If goal has monthlyRoadmap, extract individual tasks
      if (goal.monthlyRoadmap && goal.monthlyRoadmap.length > 0) {
        goal.monthlyRoadmap.forEach(month => {
          if (month.tasks && month.tasks.length > 0) {
            month.tasks.forEach(task => {
              tasks.push({
                id: `${goal.id}_${month.id}_${task.id}`,
                goalId: goal.id,
                goalTitle: goal.title,
                taskTitle: task.title,
                description: task.description || `${month.title} - ${task.title}`,
                month: month.title,
                monthOrder: month.month,
                completed: task.completed || false,
                progress: task.completed ? 100 : 0,
                dueDate: task.dueDate || month.dueDate,
                estimatedTime: task.estimatedTime || '1-2 hours',
                priority: task.priority || goal.priority || 'medium',
                category: goal.category,
                originalGoal: goal
              });
            });
          } else {
            // If no tasks, show month as a task
            tasks.push({
              id: `${goal.id}_${month.id}`,
              goalId: goal.id,
              goalTitle: goal.title,
              taskTitle: month.title,
              description: month.description,
              month: month.title,
              monthOrder: month.month,
              completed: month.completed || false,
              progress: month.completed ? 100 : (month.progress || 0),
              dueDate: month.dueDate,
              estimatedTime: '2-4 hours',
              priority: goal.priority || 'medium',
              category: goal.category,
              originalGoal: goal
            });
          }
        });
      } else {
        // Fallback: show goal milestones as tasks
        if (goal.milestones && goal.milestones.length > 0) {
          goal.milestones.slice(0, 3).forEach(milestone => {
            tasks.push({
              id: `${goal.id}_milestone_${milestone.id}`,
              goalId: goal.id,
              goalTitle: goal.title,
              taskTitle: milestone.title,
              description: milestone.description || milestone.title,
              month: 'General',
              monthOrder: milestone.order || 0,
              completed: milestone.completed,
              progress: milestone.completed ? 100 : 0,
              dueDate: milestone.dueDate,
              estimatedTime: '1-3 hours',
              priority: goal.priority || 'medium',
              category: goal.category,
              originalGoal: goal
            });
          });
        } else {
          // Last fallback: show goal as single task
          tasks.push({
            id: goal.id,
            goalId: goal.id,
            goalTitle: goal.title,
            taskTitle: goal.title,
            description: goal.description,
            month: 'General',
            monthOrder: 0,
            completed: goal.status === 'completed',
            progress: goal.progress || 0,
            dueDate: goal.targetDate,
            estimatedTime: goal.estimatedTime || '2-4 hours',
            priority: goal.priority || 'medium',
            category: goal.category,
            originalGoal: goal
          });
        }
      }
    });

    // Sort tasks by month order and priority
    return tasks.sort((a, b) => {
      if (a.monthOrder !== b.monthOrder) {
        return a.monthOrder - b.monthOrder;
      }
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    });
  };

  const displayTasks = getDisplayTasks();

  // Refresh goals when Dashboard component mounts or user changes
  useEffect(() => {
    if (user) {
      refreshGoals();
    }
  }, [user, refreshGoals]);

  // Refresh goals when refresh trigger changes (after goal creation)
  useEffect(() => {
    if (user && refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Dashboard refreshing goals due to trigger:', refreshTrigger);
      refreshGoals();
    }
  }, [refreshTrigger, user, refreshGoals]);

  // Listen for goal creation events as additional backup
  useGoalEvents((event) => {
    if (event.type === 'goal_created' && event.userId === user?.uid) {
      console.log('📢 Dashboard received goal creation event:', event.goalId);
      // The real-time listener should handle this, but this is a backup
      setTimeout(() => refreshGoals(), 100);
    }
  }, { 
    eventTypes: ['goal_created'], 
    userId: user?.uid || undefined 
  });

  // Track initial load completion to prevent flickering
  useEffect(() => {
    if (!goalsLoading && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [goalsLoading, hasInitiallyLoaded]);

  // Set up auto-refresh for opportunities every 6 hours (optional enhancement)
  useEffect(() => {
    if (user) {
      try {
        opportunityRefreshService.startAutoRefresh(6);
      } catch (error) {
        console.warn('Auto-refresh service not available:', error);
      }
    }
  }, [user]);

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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Use the new hook for opportunities
  const { opportunities, loading: opportunitiesLoading, error: opportunitiesError } = useTopOpportunities(3);
  const [hasNewOpportunities, setHasNewOpportunities] = useState(false);

  // Set hasNewOpportunities when opportunities are loaded
  useEffect(() => {
    if (opportunities && opportunities.length > 0) {
      setHasNewOpportunities(true);
    }
  }, [opportunities]);

  // Static goals removed - now using real goals from useGoals hook
  // Dashboard only shows goals that users have explicitly created from opportunities
  // No demo data or static goals are displayed here

  const userStories = [
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
    {
      id: '2',
      name: 'Kwame Asante',
      avatar: '👨🏿‍💼',
      title: 'Built a $1M E-commerce Business',
      description: 'My journey from idea to million-dollar revenue',
      bio: 'Former marketing executive who left corporate to build his own e-commerce empire. Started with $5,000 savings and scaled to $1M+ revenue through strategic planning and execution.',
      achievement: '$1M+ Revenue',
      timeframe: '24 months',
      category: 'Entrepreneurship',
      roadmapData: {
        title: 'E-commerce Business Builder',
        type: 'roadmap',
        template: {
          id: 'ecommerce-business',
          title: 'Build a Million-Dollar E-commerce Business',
          description: 'Step-by-step guide to building a successful e-commerce business from idea to $1M revenue with proven strategies',
          duration: '24 months',
          difficulty: 'Advanced',
          icon: <Trophy size={24} className="text-green-600" />,
          category: 'Business',
          milestones: 30,
          estimatedTime: '20-25 hours/week',
          skills: ['E-commerce Strategy', 'Digital Marketing', 'Supply Chain', 'Customer Service', 'Scaling'],
          color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }
      }
    },
    {
      id: '3',
      name: 'Fatima Hassan',
      avatar: '👩🏽‍🎓',
      title: 'Rhodes Scholar Success Story',
      description: 'How I won the prestigious Rhodes Scholarship',
      bio: 'Passionate about education and social impact. Overcame financial challenges through academic excellence and community leadership. Now pursuing DPhil at Oxford while advocating for African education.',
      achievement: 'Rhodes Scholar',
      timeframe: '4 years',
      category: 'Education',
      roadmapData: {
        title: 'Rhodes Scholar Achievement Path',
        type: 'roadmap',
        template: {
          id: 'rhodes-scholar',
          title: 'Rhodes Scholarship Success Roadmap',
          description: 'Complete roadmap to becoming a Rhodes Scholar with academic excellence, leadership development, and application strategy',
          duration: '4 years',
          difficulty: 'Advanced',
          icon: <GraduationCap size={24} className="text-purple-600" />,
          category: 'Education',
          milestones: 48,
          estimatedTime: '10-15 hours/week',
          skills: ['Academic Excellence', 'Leadership', 'Research', 'Essay Writing', 'Interview Skills'],
          color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
        }
      }
    },
    {
      id: '4',
      name: 'Chidi Nwosu',
      avatar: '👨🏿‍⚕️',
      title: 'Medical School to WHO Leadership',
      description: 'From medical student to leading health initiatives at WHO',
      bio: 'Medical doctor turned global health leader. Specialized in public health policy and international development. Led vaccination campaigns across 15 African countries before joining WHO.',
      achievement: 'WHO Program Director',
      timeframe: '8 years',
      category: 'Healthcare Leadership',
      roadmapData: {
        title: 'Global Health Leadership Path',
        type: 'roadmap',
        template: {
          id: 'who-leadership',
          title: 'WHO Leadership Career Roadmap',
          description: 'Path from medical education to global health leadership with WHO and international organizations',
          duration: '8 years',
          difficulty: 'Advanced',
          icon: <Heart size={24} className="text-red-600" />,
          category: 'Healthcare',
          milestones: 40,
          estimatedTime: '12-18 hours/week',
          skills: ['Public Health', 'Policy Development', 'International Relations', 'Program Management', 'Research'],
          color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }
      }
    },
    {
      id: '5',
      name: 'Zara Mwangi',
      avatar: '👩🏾‍🎨',
      title: 'Netflix Content Creator Success',
      description: 'How I became a Netflix original series creator',
      bio: 'Film school graduate who started with short films on YouTube. Built audience through authentic storytelling about African experiences. Pitched and sold first series to Netflix at age 28.',
      achievement: 'Netflix Series Creator',
      timeframe: '5 years',
      category: 'Creative Industry',
      roadmapData: {
        title: 'Netflix Creator Journey',
        type: 'roadmap',
        template: {
          id: 'netflix-creator',
          title: 'Netflix Content Creator Roadmap',
          description: 'Complete journey from aspiring filmmaker to Netflix original series creator with industry insights',
          duration: '5 years',
          difficulty: 'Advanced',
          icon: <Star size={24} className="text-yellow-600" />,
          category: 'Creative',
          milestones: 35,
          estimatedTime: '15-20 hours/week',
          skills: ['Screenwriting', 'Film Production', 'Networking', 'Pitching', 'Content Strategy'],
          color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }
      }
    },
    {
      id: '6',
      name: 'Kofi Mensah',
      avatar: '👨🏿‍💼',
      title: 'UN Sustainable Development Leader',
      description: 'Leading climate action initiatives across Africa',
      bio: 'Environmental science graduate passionate about climate change. Started with local NGO work, then joined UN Climate Program. Now leads $50M sustainability initiatives across 20 African nations.',
      achievement: 'UN Climate Program Lead',
      timeframe: '6 years',
      category: 'Sustainability',
      roadmapData: {
        title: 'UN Climate Leadership Path',
        type: 'roadmap',
        template: {
          id: 'un-climate-leader',
          title: 'UN Climate Leadership Roadmap',
          description: 'Path to leading sustainable development and climate action initiatives with international organizations',
          duration: '6 years',
          difficulty: 'Advanced',
          icon: <Globe size={24} className="text-green-600" />,
          category: 'Sustainability',
          milestones: 36,
          estimatedTime: '12-15 hours/week',
          skills: ['Environmental Science', 'Policy Development', 'Project Management', 'Stakeholder Engagement', 'Climate Finance'],
          color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }
      }
    }
  ];

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Target size={20} /> },
    { id: 'chat', label: 'AI Coach', icon: <MessageCircle size={20} /> },
    { id: 'all-opportunities', label: 'All Opportunities', icon: <Sparkles size={20} /> },
    { id: 'mcp-dashboard', label: 'MCP Integration', icon: <Brain size={20} /> },
    { id: 'diagnostics', label: 'Sync Diagnostics', icon: <MessageCircle size={20} /> },
    { id: 'community-marketplace', label: 'Community Roadmaps', icon: <Globe size={20} /> },
    { id: 'cv-management', label: 'CV Management', icon: <FileText size={20} /> },
    { id: 'add-goal', label: 'Add Goal', icon: <Plus size={20} /> },
    { id: 'profile', label: 'Profile', icon: <Users size={20} /> },
    { id: 'sign-out', label: 'Sign Out', icon: <LogOut size={20} />, isSignOut: true }
  ];

  const handleViewMoreAchievements = () => {
    if (onNavigate) {
      onNavigate('achievements');
    }
  };

  const handleCVManagement = () => {
    if (onNavigate) {
      onNavigate('cv-management');
    }
  };

  const handleCommunityMarketplace = () => {
    if (onNavigate) {
      onNavigate('community-marketplace');
    }
  };

  const handleMenuItemClick = (itemId: string) => {
    setShowMenu(false);
    if (itemId === 'sign-out' && onLogout) {
      onLogout();
    } else if (itemId === 'add-goal' && onAddGoal) {
      onAddGoal();
    } else if (itemId === 'mcp-dashboard') {
      setShowMCPDashboard(true);
    } else if (itemId === 'diagnostics') {
      setShowDiagnostics(true);
    } else if (onNavigate) {
      onNavigate(itemId);
    }
  };

  const handleMetricsClick = {
    onOpportunitiesClick: () => onViewAllOpportunities(),
    onGoalsClick: () => onNavigate && onNavigate('goals-page'),
    onProgressClick: () => handleViewMoreAchievements(),
    onStreakClick: () => setShowStreakPopup(true)
  };

  const handleGetRoadmap = (story: any) => {
    // Create a roadmap goal based on the story
    const goalData = {
      type: 'roadmap',
      template: story.roadmapData.template,
      title: story.roadmapData.title
    };
    
    // Navigate to add goal with pre-filled data
    if (onNavigate) {
      // For now, navigate to community marketplace
      // In a real app, you'd pass the goalData to the add goal screen
      onNavigate('community-marketplace');
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

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

          {/* Dynamic Metrics Overview */}
          <MetricsOverview 
            {...handleMetricsClick}
            className=""
          />
        </div>
      </div>

      <main className="safe-area-x px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8" role="main">
        {/* Success Stories Carousel */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <SuccessStories onGetRoadmap={handleGetRoadmap} />
        </Card>

        {/* Enhanced Goals Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Target size={24} className="text-primary" />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Your Goals</h2>
          </div>
          
          {goalsLoading && !hasInitiallyLoaded ? (
            // Loading skeleton - only show on initial load
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`animate-pulse p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className={`h-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded mb-3`} />
                  <div className={`h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-3/4 mb-3`} />
                  <div className={`h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-full mb-2`} />
                  <div className={`h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/3`} />
                </div>
              ))}
            </div>
          ) : (!hasInitiallyLoaded || goals.length === 0) ? (
            // Empty state - stable, no flickering
            <div className={`p-6 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300`}>
                  <Target size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 transition-all duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {goals.length === 0 ? 'Ready to start your journey?' : 'Loading your goals...'}
                  </h3>
                  <p className={`text-sm mb-3 transition-all duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {goals.length === 0 
                      ? 'Add your first goal to track your progress and unlock your potential. You can create custom goals or convert opportunities into actionable goals.'
                      : `Found ${goals.length} goals, loading progress...`
                    }
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={onAddGoal}
                      size="sm"
                      icon={<Plus size={14} />}
                    >
                      Add Goal
                    </Button>
                    <Button 
                      onClick={onViewAllOpportunities}
                      variant="secondary"
                      size="sm"
                      icon={<Globe size={14} />}
                    >
                      Browse Opportunities
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.slice(0, 4).map((goal, index) => {
                // Calculate progress based on completed tasks
                const completedTasks = goal.monthlyRoadmap?.reduce((count, month) => {
                  return count + (month.tasks?.filter(task => task.completed).length || 0);
                }, 0) || 0;
                
                const totalTasks = goal.monthlyRoadmap?.reduce((count, month) => {
                  return count + (month.tasks?.length || 0);
                }, 0) || goal.milestones?.length || 1;
                
                const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : goal.progress || 0;
                
                // Get next upcoming task
                const nextTask = goal.monthlyRoadmap?.find(month => 
                  month.tasks?.some(task => !task.completed)
                )?.tasks?.find(task => !task.completed);
                
                // Calculate days until deadline or format target date
                const targetDate = goal.targetDate instanceof Date ? goal.targetDate : 
                  (goal.targetDate?.toDate ? goal.targetDate.toDate() : null);
                const daysUntilDeadline = targetDate ? 
                  Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <div 
                    key={goal.id} 
                    className={`cursor-pointer hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-2xl transition-all group border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} hover:shadow-lg`}
                    onClick={() => onGoalClick(goal.id)}
                    style={{ 
                      opacity: hasInitiallyLoaded ? 1 : 0,
                      transform: hasInitiallyLoaded ? 'translateY(0)' : 'translateY(10px)',
                      transition: `all 0.3s ease-out ${index * 100}ms`
                    }}
                  >
                    {/* Goal Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`font-semibold text-lg transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            {goal.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            goal.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {goal.priority}
                          </span>
                        </div>
                        <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2 line-clamp-2`}>
                          {goal.description}
                        </p>
                        {nextTask && (
                          <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                            Next: {nextTask.title}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className={`text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <div className="text-2xl font-bold">{progressPercentage}%</div>
                          <div className="text-xs">{completedTasks} of {totalTasks} tasks</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-3 mb-3 overflow-hidden`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          progressPercentage >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          progressPercentage >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          progressPercentage >= 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                          'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    
                    {/* Goal Footer */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-xs">
                        <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Star size={12} />
                          {goal.category}
                        </span>
                        {daysUntilDeadline !== null && (
                          <span className={`flex items-center gap-1 ${
                            daysUntilDeadline < 7 ? 'text-red-500' : 
                            daysUntilDeadline < 30 ? 'text-yellow-500' : 
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <Calendar size={12} />
                            {daysUntilDeadline < 0 ? 'Overdue' : 
                             daysUntilDeadline === 0 ? 'Due today' :
                             daysUntilDeadline === 1 ? '1 day left' :
                             `${daysUntilDeadline} days left`}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:translate-x-1 transition-transform`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Show "View All" link if user has more than 4 goals */}
          {goals.length > 4 && (
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

        {/* Custom Roadmap Builder - Compact */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm hover:shadow-md transition-all cursor-pointer group`} onClick={() => onNavigate && onNavigate('roadmap-builder')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${isDarkMode ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-50 to-purple-100'} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <Target size={20} className={`${isDarkMode ? 'text-white' : 'text-purple-600'}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} group-hover:text-primary transition-colors`}>Build Custom Roadmap</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Create your personalized success blueprint</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'} rounded-full text-xs font-medium`}>
                Pro
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate && onNavigate('roadmap-builder');
            }}
            size="sm"
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <Plus size={14} />
            Start Building
          </Button>
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
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onViewAllOpportunities}
            >
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
              onRoadmapClick={onGetRoadmap}
              showLoadMore={false}
              compact={true}
              emptyTitle="No opportunities yet"
              emptyMessage="Our AI is currently discovering new opportunities for you."
            />
          )}
        </Card>

        {/* CV Management - Compact */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm hover:shadow-md transition-all cursor-pointer group`} onClick={handleCVManagement}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${isDarkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-50 to-blue-100'} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <FileText size={20} className={`${isDarkMode ? 'text-white' : 'text-primary'}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} group-hover:text-primary transition-colors`}>CV Management</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upload, optimize, and enhance your CV</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'} rounded-full text-xs font-medium`}>
                New
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <Button 
            onClick={(e) => {
              e.stopPropagation();
              handleCVManagement();
            }}
            size="sm"
            className="w-full"
          >
            <FileText size={14} />
            Open CV Tools
          </Button>
        </Card>

        {/* Community Roadmaps - Compact */}
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm hover:shadow-md transition-all cursor-pointer group`} onClick={handleCommunityMarketplace}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${isDarkMode ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-green-50 to-green-100'} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <Globe size={20} className={`${isDarkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} group-hover:text-primary transition-colors`}>Community Roadmaps</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Browse proven success paths from others</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'} rounded-full text-xs font-medium`}>
                500+
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <Button 
            onClick={(e) => {
              e.stopPropagation();
              handleCommunityMarketplace();
            }}
            size="sm"
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            <Globe size={14} />
            Browse Roadmaps
          </Button>
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
              7-Day Streak! 🎉
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 leading-relaxed`}>
              Amazing! You've been consistently working on your goals for 7 days straight. 
              This dedication is what separates dreamers from achievers. Keep going!
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                <div className="text-2xl font-bold text-primary">7</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Days</div>
              </div>
              <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                <div className="text-2xl font-bold text-accent">15</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tasks Done</div>
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

      {/* Dashboard Diagnostics */}
      {showDiagnostics && (
        <DashboardDiagnostics onClose={() => setShowDiagnostics(false)} />
      )}

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
const DashboardWithErrorBoundary: React.FC<DashboardProps> = (props) => (
  <ErrorBoundary>
    <Dashboard {...props} />
  </ErrorBoundary>
);

export default DashboardWithErrorBoundary;