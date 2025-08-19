import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import AuthFlow from './components/AuthFlow';
import Dashboard from './components/Dashboard';
import DebugScreen from './components/DebugScreen';

export type Screen = 'landing' | 'auth' | 'dashboard' | 'debug';

export function AppMinimal() {
  console.log('🎯 Minimal App component initializing...');
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [user, setUser] = useState<{ name: string; age: number; uid: string } | null>(null);
  const [isDarkMode] = useState(false); // Simplified dark mode

  console.log('🎯 App state:', { currentScreen, user: !!user, isDarkMode });

  const handleGetStarted = (userData?: { name: string; age: number }) => {
    if (userData) {
      setUser({ ...userData, uid: `user_${Date.now()}` });
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('auth');
    }
  };

  const handleAuthSuccess = (userData: { name: string; age: number; uid: string }) => {
    setUser(userData);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('landing');
  };

  const renderScreen = () => {
    console.log('📺 Rendering screen:', currentScreen);
    
    try {
      switch (currentScreen) {
        case 'landing':
          console.log('🏠 Rendering LandingPage');
          return <LandingPage onGetStarted={() => handleGetStarted()} />;
          
        case 'auth':
          console.log('🔐 Rendering AuthFlow');
          return <AuthFlow onComplete={handleAuthSuccess} />;
          
        case 'dashboard':
          console.log('📊 Rendering Dashboard');
          return (
            <Dashboard 
              user={user} 
              onOpportunityClick={() => {}}
              onViewAllOpportunities={() => {}}
              onGoalClick={() => {}}
              onNavigate={() => {}}
              onAddGoal={() => {}}
              onLogout={handleLogout}
              refreshTrigger={0}
              onGetRoadmap={() => {}}
            />
          );
          
        case 'debug':
          return (
            <DebugScreen
              title="Debug Mode"
              status="info"
              message="Application is running in debug mode"
              onAction={() => setCurrentScreen('landing')}
              actionText="Go to Landing"
            />
          );
          
        default:
          console.log('⚠️ Unknown screen, defaulting to LandingPage:', currentScreen);
          return <LandingPage onGetStarted={() => handleGetStarted()} />;
      }
    } catch (error) {
      console.error('❌ Error rendering screen:', error);
      return (
        <DebugScreen
          title="Component Error"
          status="error"
          message={`Failed to render ${currentScreen} screen`}
          details={error instanceof Error ? error.message : String(error)}
          onAction={() => setCurrentScreen('landing')}
          actionText="Go to Landing"
        />
      );
    }
  };

  console.log('🚀 App rendering, screen:', currentScreen);
  
  return (
    <div 
      className="min-h-screen font-inter" 
      style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}
    >
      {renderScreen()}
    </div>
  );
}

export { AppMinimal as default };