import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, User, BookOpen, Target, Clock, MapPin, MessageCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { UserPreferences } from '../types/user';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface OnboardingScreenProps {
  onComplete: (preferences: UserPreferences) => void;
  onNavigate?: (screen: string) => void;
  userInfo: { name: string; age: number; uid: string };
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, onNavigate, userInfo }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode } = useDarkMode();

  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    careerInterests: [],
    preferredIndustries: [],
    currentSkills: [],
    skillLevels: {},
    primaryGoals: [],
    motivationFactors: [],
    biggestChallenges: [],
    concerns: [],
    version: '1.0'
  });

  const steps = [
    {
      id: 'education',
      title: 'Education Background',
      description: 'Tell us about your educational journey',
      icon: BookOpen
    },
    {
      id: 'career',
      title: 'Career Interests',
      description: 'What career paths interest you?',
      icon: Target
    },
    {
      id: 'skills',
      title: 'Skills & Experience',
      description: 'What skills do you currently have?',
      icon: User
    },
    {
      id: 'learning',
      title: 'Learning Preferences',
      description: 'How do you prefer to learn?',
      icon: Clock
    },
    {
      id: 'goals',
      title: 'Goals & Timeline',
      description: 'What are your main objectives?',
      icon: Target
    },
    {
      id: 'context',
      title: 'Personal Context',
      description: 'Help us understand your situation',
      icon: MapPin
    },
    {
      id: 'communication',
      title: 'Communication Style',
      description: 'How do you like to interact and learn?',
      icon: MessageCircle
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Create complete preferences object
      const completePreferences: UserPreferences = {
        ...preferences as UserPreferences,
        completedAt: new Date(),
        version: '1.0'
      };

      // Save onboarding data to Firestore under users/{uid}/onboarding
      const onboardingRef = doc(db, `users/${userInfo.uid}/onboarding`, 'preferences');
      await setDoc(onboardingRef, completePreferences);

      // Also update the main user document to mark onboarding as completed
      const userRef = doc(db, 'users', userInfo.uid);
      await setDoc(userRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      }, { merge: true });

      console.log('✅ Onboarding data saved successfully to Firestore');
      
      // Call the onComplete callback
      onComplete(completePreferences);
      
      // Redirect to dashboard
      if (onNavigate) {
        onNavigate('dashboard');
      } else {
        // Fallback: try to redirect via window location
        window.location.hash = '#dashboard';
      }
      
    } catch (error) {
      console.error('❌ Error saving onboarding data:', error);
      
      // Even if saving fails, still complete onboarding and redirect
      const completePreferences: UserPreferences = {
        ...preferences as UserPreferences,
        completedAt: new Date(),
        version: '1.0'
      };
      
      onComplete(completePreferences);
      
      // Redirect to dashboard anyway
      if (onNavigate) {
        onNavigate('dashboard');
      } else {
        window.location.hash = '#dashboard';
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const renderStep = () => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'education':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What's your current education level?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'high_school', label: 'High School' },
                  { value: 'undergraduate', label: 'Undergraduate' },
                  { value: 'graduate', label: 'Graduate' },
                  { value: 'other', label: 'Other' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ educationLevel: option.value as any })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      preferences.educationLevel === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Field of Study (if applicable)
              </label>
              <input
                type="text"
                value={preferences.fieldOfStudy || ''}
                onChange={(e) => updatePreferences({ fieldOfStudy: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="e.g., Computer Science, Business, Engineering"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Institution (optional)
              </label>
              <input
                type="text"
                value={preferences.currentInstitution || ''}
                onChange={(e) => updatePreferences({ currentInstitution: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="e.g., University of Ghana, KNUST"
              />
            </div>
          </div>
        );

      case 'career':
        const careerFields = [
          'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing', 
          'Design', 'Engineering', 'Business', 'Media', 'Research',
          'Entrepreneurship', 'Government', 'Non-profit', 'Agriculture'
        ];

        const industries = [
          'Software Development', 'Data Science', 'Digital Marketing', 'Graphic Design',
          'Project Management', 'Sales', 'Consulting', 'Banking', 'Insurance',
          'E-commerce', 'Manufacturing', 'Tourism', 'Real Estate', 'Construction'
        ];

        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Which career fields interest you? (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {careerFields.map(field => (
                  <button
                    key={field}
                    onClick={() => updatePreferences({ 
                      careerInterests: toggleArrayItem(preferences.careerInterests || [], field)
                    })}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      preferences.careerInterests?.includes(field)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {field}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Preferred specific industries? (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {industries.map(industry => (
                  <button
                    key={industry}
                    onClick={() => updatePreferences({ 
                      preferredIndustries: toggleArrayItem(preferences.preferredIndustries || [], industry)
                    })}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      preferences.preferredIndustries?.includes(industry)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'skills':
        const skillsList = [
          'Programming', 'Web Development', 'Mobile Development', 'Data Analysis',
          'Digital Marketing', 'Graphic Design', 'Video Editing', 'Writing',
          'Project Management', 'Communication', 'Leadership', 'Sales',
          'Customer Service', 'Accounting', 'Microsoft Office', 'Languages'
        ];

        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What skills do you currently have? (Select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {skillsList.map(skill => (
                  <button
                    key={skill}
                    onClick={() => updatePreferences({ 
                      currentSkills: toggleArrayItem(preferences.currentSkills || [], skill)
                    })}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      preferences.currentSkills?.includes(skill)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Do you have work experience?
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => updatePreferences({ hasWorkExperience: true })}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      preferences.hasWorkExperience === true
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updatePreferences({ hasWorkExperience: false })}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      preferences.hasWorkExperience === false
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    No
                  </button>
                </div>

                {preferences.hasWorkExperience && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      What type of work experience?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['internship', 'part_time', 'full_time', 'freelance'].map(type => (
                        <button
                          key={type}
                          onClick={() => updatePreferences({ workExperienceType: type as any })}
                          className={`p-2 rounded-lg text-sm transition-all capitalize ${
                            preferences.workExperienceType === type
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'learning':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                How do you learn best?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'visual', label: 'Visual (images, diagrams)' },
                  { value: 'auditory', label: 'Auditory (listening)' },
                  { value: 'kinesthetic', label: 'Hands-on practice' },
                  { value: 'reading_writing', label: 'Reading & writing' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ learningStyle: option.value as any })}
                    className={`p-3 rounded-xl border-2 text-sm transition-all ${
                      preferences.learningStyle === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                How much time can you dedicate to learning per week?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'less_than_5h', label: 'Less than 5 hours' },
                  { value: '5_to_10h', label: '5-10 hours' },
                  { value: '10_to_20h', label: '10-20 hours' },
                  { value: 'more_than_20h', label: 'More than 20 hours' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ timeAvailability: option.value as any })}
                    className={`p-3 rounded-xl border-2 text-sm transition-all ${
                      preferences.timeAvailability === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What's your preferred learning pace?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'slow', label: 'Slow & Steady' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'fast', label: 'Fast-paced' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ preferredLearningPace: option.value as any })}
                    className={`p-3 rounded-xl border-2 text-sm transition-all ${
                      preferences.preferredLearningPace === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'goals':
        const goals = [
          'Get a job', 'Learn new skills', 'Career change', 'Start a business',
          'Improve current job performance', 'Prepare for further education',
          'Personal development', 'Networking'
        ];

        const motivations = [
          'Better salary', 'Job security', 'Personal passion', 'Flexibility',
          'Work-life balance', 'Make an impact', 'Creative expression', 'Continuous learning'
        ];

        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What are your primary goals? (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {goals.map(goal => (
                  <button
                    key={goal}
                    onClick={() => updatePreferences({ 
                      primaryGoals: toggleArrayItem(preferences.primaryGoals || [], goal)
                    })}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      preferences.primaryGoals?.includes(goal)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What motivates you most? (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {motivations.map(motivation => (
                  <button
                    key={motivation}
                    onClick={() => updatePreferences({ 
                      motivationFactors: toggleArrayItem(preferences.motivationFactors || [], motivation)
                    })}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      preferences.motivationFactors?.includes(motivation)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {motivation}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What's your timeline for achieving your main goal?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '3_months', label: '3 months' },
                  { value: '6_months', label: '6 months' },
                  { value: '1_year', label: '1 year' },
                  { value: '2_plus_years', label: '2+ years' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ timelineGoal: option.value as any })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      preferences.timelineGoal === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'context':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Where are you located?
              </label>
              <input
                type="text"
                value={preferences.location || ''}
                onChange={(e) => updatePreferences({ location: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="e.g., Accra, Ghana"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Are you willing to relocate for opportunities?
              </label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => updatePreferences({ willingToRelocate: true })}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    preferences.willingToRelocate === true
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => updatePreferences({ willingToRelocate: false })}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    preferences.willingToRelocate === false
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What's your preferred work mode?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'in_person', label: 'In-person' },
                  { value: 'flexible', label: 'Flexible' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ preferredWorkMode: option.value as any })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      preferences.preferredWorkMode === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What are your biggest challenges? (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Lack of experience', 'Time constraints', 'Financial limitations',
                  'Limited network', 'Skill gaps', 'Confidence issues',
                  'Market competition', 'Technology changes'
                ].map(challenge => (
                  <button
                    key={challenge}
                    onClick={() => updatePreferences({ 
                      biggestChallenges: toggleArrayItem(preferences.biggestChallenges || [], challenge)
                    })}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      preferences.biggestChallenges?.includes(challenge)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {challenge}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'communication':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                How would you describe your communication style?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'direct', label: 'Direct & Straightforward' },
                  { value: 'collaborative', label: 'Collaborative' },
                  { value: 'independent', label: 'Independent' },
                  { value: 'supportive', label: 'Supportive & Encouraging' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ communicationStyle: option.value as any })}
                    className={`p-3 rounded-xl border-2 text-sm transition-all ${
                      preferences.communicationStyle === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Would you like mentorship opportunities?
              </label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => updatePreferences({ wantsMentorship: true })}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    preferences.wantsMentorship === true
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => updatePreferences({ wantsMentorship: false })}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    preferences.wantsMentorship === false
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                How comfortable are you with networking?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'very_comfortable', label: 'Very comfortable' },
                  { value: 'somewhat_comfortable', label: 'Somewhat comfortable' },
                  { value: 'uncomfortable', label: 'Uncomfortable' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updatePreferences({ networkingComfort: option.value as any })}
                    className={`p-3 rounded-xl border-2 text-sm transition-all ${
                      preferences.networkingComfort === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not implemented</div>;
    }
  };

  const canProceed = () => {
    switch (steps[currentStep].id) {
      case 'education':
        return preferences.educationLevel && preferences.fieldOfStudy;
      case 'career':
        return preferences.careerInterests && preferences.careerInterests.length > 0;
      case 'skills':
        return preferences.hasWorkExperience !== undefined;
      case 'learning':
        return preferences.learningStyle && preferences.timeAvailability && preferences.preferredLearningPace;
      case 'goals':
        return preferences.primaryGoals && preferences.primaryGoals.length > 0 && preferences.timelineGoal;
      case 'context':
        return preferences.location && preferences.willingToRelocate !== undefined && preferences.preferredWorkMode;
      case 'communication':
        return preferences.communicationStyle && preferences.wantsMentorship !== undefined && preferences.networkingComfort;
      default:
        return true;
    }
  };

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className={`min-h-screen p-4 bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <CurrentIcon size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Welcome, {userInfo.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let's personalize your Edutu experience
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step Content */}
        <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {steps[currentStep].description}
            </p>
          </div>

          {renderStep()}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            
            {/* Skip Button */}
            <Button
              variant="ghost"
              size="sm"
              loading={isLoading}
              onClick={async () => {
                setIsLoading(true);
                try {
                  // Update user document to mark onboarding as skipped but completed
                  const userRef = doc(db, 'users', userInfo.uid);
                  await setDoc(userRef, {
                    onboardingCompleted: true,
                    onboardingSkipped: true,
                    onboardingCompletedAt: new Date()
                  }, { merge: true });

                  console.log('✅ Onboarding skipped successfully');
                  
                  // Complete onboarding with minimal preferences
                  const skippedPreferences: UserPreferences = {
                    version: '1.0',
                    completedAt: new Date(),
                    skipped: true,
                    careerInterests: [],
                    preferredIndustries: [],
                    currentSkills: [],
                    skillLevels: {},
                    primaryGoals: [],
                    motivationFactors: [],
                    biggestChallenges: [],
                    concerns: []
                  } as UserPreferences;
                  
                  onComplete(skippedPreferences);
                  
                  // Redirect to dashboard
                  if (onNavigate) {
                    onNavigate('dashboard');
                  } else {
                    window.location.hash = '#dashboard';
                  }
                } catch (error) {
                  console.error('❌ Error skipping onboarding:', error);
                  // Still redirect even if saving fails
                  if (onNavigate) {
                    onNavigate('dashboard');
                  } else {
                    window.location.hash = '#dashboard';
                  }
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Skipping...' : 'Skip for now'}
            </Button>
          </div>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index <= currentStep ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            variant="primary"
            loading={currentStep === steps.length - 1 ? isLoading : false}
            icon={currentStep === steps.length - 1 
              ? (isLoading ? undefined : Check)
              : undefined
            }
            rightIcon={currentStep === steps.length - 1 
              ? undefined 
              : ChevronRight
            }
          >
            {currentStep === steps.length - 1 ? (
              isLoading ? 'Completing...' : 'Complete Setup'
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;