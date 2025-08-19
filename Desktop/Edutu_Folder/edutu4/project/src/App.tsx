import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AuthFlow from './components/AuthFlow';
import OptimizedChatInterface from './components/OptimizedChatInterface';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Navigation from './components/Navigation';
import OpportunityDetail from './components/OpportunityDetail';
import AllOpportunities from './components/AllOpportunities';
import PersonalizedRoadmap from './components/PersonalizedRoadmap';
import OpportunityRoadmap from './components/OpportunityRoadmap';
import SettingsMenu from './components/SettingsMenu';
import EditProfileScreen from './components/EditProfileScreen';
import NotificationsScreen from './components/NotificationsScreen';
import PrivacyScreen from './components/PrivacyScreen';
import HelpScreen from './components/HelpScreen';
import CVManagement from './components/CVManagement';
import AddGoalScreen from './components/AddGoalScreen';
import CommunityMarketplace from './components/CommunityMarketplace';
import IntroductionPopup from './components/IntroductionPopup';
import GoalsPage from './components/GoalsPage';
import AchievementsPage from './components/AchievementsPage';
import RoadmapBuilder from './components/RoadmapBuilder';
import ResourcesPage from './components/ResourcesPage';
import SuccessStoryBlog from './components/SuccessStoryBlog';
import MonthlyWeeklyRoadmap from './components/MonthlyWeeklyRoadmap';
import GoalCreationFlow from './components/GoalCreationFlow';
import GoalRoadmapView from './components/GoalRoadmapView';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ui/ErrorBoundary';
import PerformanceDashboard from './components/PerformanceDashboard';
import CompactCookieConsentBanner from './components/CompactCookieConsentBanner';
import DebugScreen from './components/DebugScreen';
import { useDarkMode } from './hooks/useDarkMode';
import { useGoals } from './hooks/useGoals';
import { getSuccessStoryByOpportunity } from './data/successStories';
import { SuccessStory } from './types/successStory';
import { Opportunity, Goal, UserProfile, NavigationHandler } from './types/common';
import { secureStorage } from './utils/security';
import { authService } from './services/authService';
import { opportunityRefreshService } from './services/apiService';

export type Screen = 'landing' | 'auth' | 'chat' | 'dashboard' | 'profile' | 'opportunity-detail' | 'all-opportunities' | 'roadmap' | 'opportunity-roadmap' | 'settings' | 'profile-edit' | 'notifications' | 'privacy' | 'help' | 'cv-management' | 'add-goal' | 'community-marketplace' | 'goals-page' | 'achievements' | 'roadmap-builder' | 'resources' | 'success-story' | 'monthly-weekly-roadmap' | 'goal-creation-flow' | 'goal-roadmap-view' | 'admin-dashboard';

export function App() {
  console.log('🎯 App component initializing...');
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [user, setUser] = useState<{ name: string; age: number; uid: string } | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedGoalData, setSelectedGoalData] = useState<any>(null);
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  const [selectedSuccessStory, setSelectedSuccessStory] = useState<SuccessStory | null>(null);
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const { isDarkMode } = useDarkMode();
  const { goals, updateTaskCompletion } = useGoals();
  
  console.log('🎯 App state:', { currentScreen, user: !!user, isDarkMode });

  // Initialize auto-refresh service
  useEffect(() => {
    // Start auto-refresh when app loads
    console.log('🚀 Starting opportunity auto-refresh service...');
    opportunityRefreshService.startAutoRefresh(6); // Refresh every 6 hours

    // Cleanup on unmount
    return () => {
      opportunityRefreshService.stopAutoRefresh();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGetStarted = (userData?: { name: string; age: number }) => {
    scrollToTop();
    if (userData) {
      setUser(userData);
      setShowIntroPopup(true);
    } else {
      setCurrentScreen('auth');
    }
  };

  const handleAuthSuccess = (userData: { name: string; age: number; uid: string }) => {
    scrollToTop();
    setUser(userData);
    // Only show intro popup if user hasn't seen it before
    const hasSeenIntro = secureStorage.getItem(`intro_completed_${userData.uid}`);
    if (!hasSeenIntro) {
      setShowIntroPopup(true);
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const handleIntroComplete = (profileData: UserProfile) => {
    setShowIntroPopup(false);
    // Mark intro as completed for this user
    if (user?.uid) {
      secureStorage.setItem(`intro_completed_${user.uid}`, 'true');
    }
    setCurrentScreen('dashboard');
  };

  const handleOpportunitySelect = (opportunity: Opportunity) => {
    scrollToTop();
    setSelectedOpportunity(opportunity);
    setCurrentScreen('opportunity-detail');
  };

  const handleAddToGoals = (opportunity: Opportunity) => {
    scrollToTop();
    setSelectedOpportunity(opportunity);
    setCurrentScreen('opportunity-roadmap');
  };

  const handleGoalClick = (goalId: string) => {
    scrollToTop();
    // Find the goal by ID
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoal(goalId);
      setSelectedGoalData(goal);
      // Always use the new goal roadmap view
      setCurrentScreen('goal-roadmap-view');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      scrollToTop();
      setUser(null);
      setCurrentScreen('landing');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if sign out fails, clear local state
      scrollToTop();
      setUser(null);
      setCurrentScreen('landing');
    }
  };

  const handleNavigate = (screen: Screen | string) => {
    scrollToTop();
    setCurrentScreen(screen as Screen);
  };

  const handleBack = (targetScreen: Screen) => {
    scrollToTop();
    setCurrentScreen(targetScreen);
  };

  const handleAddGoal = () => {
    scrollToTop();
    setCurrentScreen('goal-creation-flow');
  };

  const handleGoalCreated = (goalId: string) => {
    console.log('🎯 Goal created with ID:', goalId);
    
    // Trigger dashboard refresh to show new goal
    setDashboardRefreshTrigger(prev => prev + 1);
    
    // Always navigate to dashboard so user can see their new goal
    scrollToTop();
    setCurrentScreen('dashboard');
  };

  const handleCommunityRoadmapSelect = (roadmap: { title: string }) => {
    setSelectedGoal(roadmap.title);
    setCurrentScreen('roadmap');
  };

  const handleViewSuccessStory = (opportunity: Opportunity) => {
    scrollToTop();
    const story = getSuccessStoryByOpportunity(opportunity.id);
    if (story) {
      setSelectedSuccessStory(story);
      setCurrentScreen('success-story');
    } else {
      // Fallback to roadmap if no success story found
      handleAddToGoals(opportunity);
    }
  };

  const handleGetRoadmapFromStory = (story: SuccessStory) => {
    scrollToTop();
    // Create a goal based on the success story's roadmap
    setSelectedGoal(story.roadmap.title);
    setCurrentScreen('roadmap');
  };

  const handleGetRoadmapFromOpportunity = (opportunity: Opportunity) => {
    scrollToTop();
    setSelectedOpportunity(opportunity);
    
    // Check if this opportunity has an existing goal with roadmap data
    if (opportunity.existingGoal && opportunity.existingGoal.monthlyRoadmap) {
      // Navigate directly to active roadmap tracking
      setSelectedGoal(opportunity.existingGoal.id);
      setSelectedGoalData(opportunity.existingGoal);
      setCurrentScreen('monthly-weekly-roadmap');
    } else {
      // Navigate to preview roadmap
      setSelectedGoal(opportunity.title);
      setCurrentScreen('roadmap');
    }
  };

  // Centralized goal creation success handler
  const handleSuccessfulGoalCreation = () => {
    console.log('🎯 Goal creation successful - triggering dashboard refresh');
    
    try {
      // Trigger dashboard refresh to show new goal
      setDashboardRefreshTrigger(prev => {
        const newValue = prev + 1;
        console.log('📊 Dashboard refresh trigger updated:', newValue);
        return newValue;
      });
    } catch (error) {
      console.error('❌ Error updating dashboard refresh trigger:', error);
    }
  };

  // Direct dashboard navigation for success popups with safe async handling
  const handleNavigateToDashboard = () => {
    // Prevent multiple navigation calls
    if (isNavigating) {
      console.log('⚠️ Navigation already in progress, ignoring request');
      return;
    }

    console.log('🏠 Navigating to dashboard from success popup');
    setIsNavigating(true);
    
    try {
      // Add a small delay to ensure any pending state updates complete
      setTimeout(() => {
        try {
          console.log('📊 Triggering dashboard refresh before navigation');
          setDashboardRefreshTrigger(prev => prev + 1);
          
          // Short delay to let the refresh trigger update
          setTimeout(() => {
            try {
              scrollToTop();
              setCurrentScreen('dashboard');
              console.log('✅ Successfully navigated to dashboard');
            } catch (navError) {
              console.error('❌ Error during screen transition:', navError);
              // Force page reload as last resort
              window.location.reload();
            } finally {
              setIsNavigating(false);
            }
          }, 50);
        } catch (error) {
          console.error('❌ Error during delayed navigation:', error);
          // Fallback to direct navigation
          try {
            scrollToTop();
            setCurrentScreen('dashboard');
          } catch (fallbackError) {
            console.error('❌ Fallback navigation failed:', fallbackError);
            window.location.reload();
          } finally {
            setIsNavigating(false);
          }
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error setting up navigation:', error);
      // Immediate fallback
      try {
        scrollToTop();
        setCurrentScreen('dashboard');
      } catch (immediateError) {
        console.error('❌ Immediate fallback failed:', immediateError);
        window.location.reload();
      } finally {
        setIsNavigating(false);
      }
    }
  };

  const renderScreen = () => {
    console.log('📺 Rendering screen:', currentScreen);
    
    try {
      switch (currentScreen) {
        case 'landing':
          console.log('🏠 Rendering LandingPage');
          try {
            return <LandingPage onGetStarted={() => handleGetStarted()} />;
          } catch (landingError) {
            console.error('❌ LandingPage error:', landingError);
            return (
              <DebugScreen
                title="Landing Page Error"
                status="error"
                message="The landing page failed to load. This might be due to a component or styling issue."
                details={landingError instanceof Error ? landingError.message : String(landingError)}
                onAction={() => window.location.reload()}
                actionText="Refresh Page"
              />
            );
          }
      case 'auth':
        return <AuthFlow onComplete={handleAuthSuccess} />;
      case 'chat':
        return <OptimizedChatInterface user={user} onBack={() => handleBack('dashboard')} />;
      case 'dashboard':
        return (
          <ErrorBoundary fallback={({ error, retry }) => (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Dashboard Error
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  There was an error loading your dashboard. This might be due to a goal update issue.
                </p>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Refresh Page
                  </button>
                  <button 
                    onClick={retry} 
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}>
            <Dashboard 
              user={user} 
              onOpportunityClick={handleOpportunitySelect}
              onViewAllOpportunities={() => handleNavigate('all-opportunities')}
              onGoalClick={handleGoalClick}
              onNavigate={handleNavigate}
              onAddGoal={handleAddGoal}
              onLogout={handleLogout}
              refreshTrigger={dashboardRefreshTrigger}
              onGetRoadmap={handleGetRoadmapFromOpportunity}
            />
          </ErrorBoundary>
        );
      case 'profile':
        return (
          <Profile 
            user={user} 
            setUser={setUser}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        );
      case 'opportunity-detail':
        return (
          <OpportunityDetail
            opportunity={selectedOpportunity}
            onBack={() => handleBack('dashboard')}
            onAddToGoals={handleAddToGoals}
            onViewSuccessStory={handleViewSuccessStory}
            onGetRoadmap={handleGetRoadmapFromOpportunity}
            onGoalCreated={handleSuccessfulGoalCreation}
            onNavigateToDashboard={handleNavigateToDashboard}
          />
        );
      case 'all-opportunities':
        return (
          <AllOpportunities
            onBack={() => handleBack('dashboard')}
            onSelectOpportunity={handleOpportunitySelect}
            onGetRoadmap={handleGetRoadmapFromOpportunity}
          />
        );
      case 'roadmap':
        return (
          <PersonalizedRoadmap 
            onBack={() => handleBack('dashboard')}
            goalTitle={selectedGoal}
            onNavigate={handleNavigate}
            onGoalCreated={handleSuccessfulGoalCreation}
          />
        );
      case 'opportunity-roadmap':
        return (
          <OpportunityRoadmap
            onBack={() => handleBack('dashboard')}
            opportunity={selectedOpportunity}
            onNavigate={handleNavigate}
          />
        );
      case 'settings':
        return (
          <SettingsMenu
            onBack={() => handleBack('profile')}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            user={user}
          />
        );
      case 'profile-edit':
        return (
          <EditProfileScreen
            user={user}
            setUser={setUser}
            onBack={() => handleBack('settings')}
          />
        );
      case 'notifications':
        return (
          <NotificationsScreen
            onBack={() => handleBack('settings')}
          />
        );
      case 'privacy':
        return (
          <PrivacyScreen
            onBack={() => handleBack('settings')}
          />
        );
      case 'help':
        return (
          <HelpScreen
            onBack={() => handleBack('settings')}
          />
        );
      case 'cv-management':
        return (
          <CVManagement
            onBack={() => handleBack('profile')}
          />
        );
      case 'add-goal':
        return (
          <AddGoalScreen
            onBack={() => handleBack('dashboard')}
            onGoalCreated={handleGoalCreated}
            onNavigate={handleNavigate}
            user={user}
          />
        );
      case 'community-marketplace':
        return (
          <CommunityMarketplace
            onBack={() => handleBack('dashboard')}
            onRoadmapSelect={handleCommunityRoadmapSelect}
            onGoalCreated={handleGoalCreated}
            user={user}
          />
        );
      case 'goal-creation-flow':
        return (
          <GoalCreationFlow
            isOpen={true}
            onClose={() => handleBack('dashboard')}
            onGoalCreated={handleGoalCreated}
            user={user}
          />
        );
      case 'goal-roadmap-view':
        return (
          <GoalRoadmapView
            goalId={selectedGoal}
            onBack={() => handleBack('dashboard')}
            user={user}
          />
        );
      case 'goals-page':
        return (
          <GoalsPage
            onBack={() => handleBack('dashboard')}
            onAddGoal={handleAddGoal}
            onGoalClick={handleGoalClick}
          />
        );
      case 'achievements':
        return (
          <AchievementsPage
            onBack={() => handleBack('dashboard')}
          />
        );
      case 'roadmap-builder':
        return (
          <RoadmapBuilder
            onBack={() => handleBack('dashboard')}
            onSave={(roadmapData) => {
              // Handle saving the roadmap data
              handleBack('dashboard');
            }}
          />
        );
      case 'resources':
        return (
          <ResourcesPage
            onBack={() => handleBack('dashboard')}
            roadmapType="python"
            roadmapTitle="Complete Python Course"
          />
        );
      case 'success-story':
        return selectedSuccessStory ? (
          <SuccessStoryBlog
            story={selectedSuccessStory}
            onBack={() => handleBack('opportunity-detail')}
            onGetRoadmap={handleGetRoadmapFromStory}
            onNavigate={handleNavigate}
          />
        ) : (
          <div>Success story not found</div>
        );
      case 'monthly-weekly-roadmap':
        return (
          <MonthlyWeeklyRoadmap
            onBack={() => handleBack('dashboard')}
            goalTitle={selectedGoalData?.title || selectedGoal}
            monthlyRoadmap={selectedGoalData?.monthlyRoadmap || []}
            onTaskComplete={async (taskId, completed) => {
              // Update task completion in Firestore
              if (selectedGoal) {
                try {
                  await updateTaskCompletion(selectedGoal, taskId, completed);
                  // Update local state for immediate UI feedback
                  if (selectedGoalData) {
                    const updatedRoadmap = selectedGoalData.monthlyRoadmap.map((month: any) => ({
                      ...month,
                      tasks: month.tasks?.map((task: any) => 
                        task.id === taskId ? { ...task, completed } : task
                      ) || []
                    }));
                    setSelectedGoalData({
                      ...selectedGoalData,
                      monthlyRoadmap: updatedRoadmap
                    });
                  }
                } catch (error) {
                  console.error('Failed to update task completion:', error);
                }
              }
            }}
            onNavigate={handleNavigate}
          />
        );
      case 'admin-dashboard':
        return (
          <AdminDashboard
            onBack={() => handleBack('dashboard')}
            user={user}
          />
        );
      default:
        console.log('⚠️ Unknown screen, defaulting to LandingPage:', currentScreen);
        return <LandingPage onGetStarted={() => handleGetStarted()} />;
    }
    } catch (error) {
      console.error('❌ Error rendering screen:', error);
      return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Application Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              There was an error loading the application. 
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
  };

  const showNavigation = currentScreen !== 'landing' && 
                        currentScreen !== 'auth' && 
                        !['opportunity-detail', 'roadmap', 'opportunity-roadmap', 'settings', 'profile-edit', 'notifications', 'privacy', 'help', 'cv-management', 'add-goal', 'community-marketplace', 'goals-page', 'achievements', 'roadmap-builder', 'success-story', 'monthly-weekly-roadmap', 'goal-creation-flow', 'goal-roadmap-view', 'chat', 'admin-dashboard'].includes(currentScreen);

  console.log('🚀 App rendering, darkMode:', isDarkMode, 'screen:', currentScreen);
  
  return (
    <div className={`min-h-screen font-inter ${isDarkMode ? 'dark' : ''}`} style={{ minHeight: '100vh', backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}>
      {showNavigation && (
        <Navigation currentScreen={currentScreen} onNavigate={handleNavigate} />
      )}
      <main className={showNavigation ? 'pb-20 lg:pb-24' : ''}>
        <ErrorBoundary
          fallback={({ error, retry }) => (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center">
                <h2 className="text-xl font-bold text-red-600 mb-4">
                  Component Error
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {error.message}
                </p>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Refresh Page
                  </button>
                  <button 
                    onClick={retry} 
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        >
          {renderScreen()}
        </ErrorBoundary>
      </main>
      
      {/* Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex items-center gap-3 shadow-2xl">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-800 dark:text-white font-medium">
              Loading Dashboard...
            </span>
          </div>
        </div>
      )}
      
      {/* Introduction Popup */}
      {showIntroPopup && user && (
        <IntroductionPopup
          isOpen={showIntroPopup}
          onComplete={handleIntroComplete}
          userName={user.name}
        />
      )}
      
      {/* Cookie Consent Banner */}
      <CompactCookieConsentBanner />
      
      {/* Performance Dashboard (dev only) */}
      <PerformanceDashboard isVisible={true} />
    </div>
  );
}

export { App as default };