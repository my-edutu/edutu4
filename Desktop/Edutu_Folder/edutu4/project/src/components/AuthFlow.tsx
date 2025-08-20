import React, { useState } from 'react';
import AuthScreen from './AuthScreen';
import OnboardingScreen from './OnboardingScreen';
import { preferencesService } from '../services/preferencesService';
import { UserPreferences } from '../types/user';

interface AuthFlowProps {
  onComplete: (userData: { name: string; age: number; uid: string }) => void;
  onNavigate?: (screen: string) => void;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ onComplete, onNavigate }) => {
  const [authStep, setAuthStep] = useState<'auth' | 'onboarding' | 'complete'>('auth');
  const [userInfo, setUserInfo] = useState<{ 
    name: string; 
    age: number; 
    uid: string; 
    onboardingCompleted: boolean 
  } | null>(null);

  const handleAuthComplete = (userData: { 
    name: string; 
    age: number; 
    uid: string; 
    onboardingCompleted: boolean 
  }) => {
    setUserInfo(userData);
    
    if (userData.onboardingCompleted) {
      // User has already completed onboarding, proceed to app
      onComplete({
        name: userData.name,
        age: userData.age,
        uid: userData.uid
      });
    } else {
      // User needs to complete onboarding
      setAuthStep('onboarding');
    }
  };

  const handleOnboardingComplete = async (preferences: UserPreferences) => {
    if (!userInfo) return;

    try {
      // Save preferences to Firestore
      await preferencesService.saveUserPreferences(userInfo.uid, preferences);
      
      // Generate RAG training data
      const ragData = preferencesService.generateRAGTrainingData(userInfo.uid, preferences);
      console.log('RAG Training Data Generated:', ragData);
      
      // Send RAG data to training pipeline via Firebase Functions
      try {
        // This would integrate with your AI backend to enhance recommendations
        await fetch('/api/rag/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ragData)
        });
      } catch (error) {
        // RAG training is non-blocking - continue with user flow
      }
      
      // Complete the flow
      onComplete({
        name: userInfo.name,
        age: userInfo.age,
        uid: userInfo.uid
      });
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Handle error - maybe show a retry option
    }
  };

  if (authStep === 'auth') {
    return <AuthScreen onAuthComplete={handleAuthComplete} />;
  }

  if (authStep === 'onboarding' && userInfo) {
    return (
      <OnboardingScreen 
        onComplete={handleOnboardingComplete}
        onNavigate={onNavigate}
        userInfo={{
          name: userInfo.name,
          age: userInfo.age,
          uid: userInfo.uid
        }}
      />
    );
  }

  return null;
};

export default AuthFlow;