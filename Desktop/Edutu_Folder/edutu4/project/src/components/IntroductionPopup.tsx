import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Target, BookOpen, Briefcase, Heart, Globe, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface IntroductionPopupProps {
  isOpen: boolean;
  onComplete: (userData: any) => void;
  userName: string;
}

const IntroductionPopup: React.FC<IntroductionPopupProps> = ({ isOpen, onComplete, userName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    interests: [] as string[],
    goals: [] as string[],
    experience: '',
    location: '',
    education: '',
    skills: [] as string[],
    timeCommitment: '',
    preferredLearning: [] as string[]
  });
  const { isDarkMode } = useDarkMode();

  const steps = [
    {
      title: "Welcome to Edutu! 👋",
      subtitle: `Hi ${userName}! I'm your AI opportunity coach`,
      content: "welcome"
    },
    {
      title: "What interests you most?",
      subtitle: "Select all that apply - this helps me find the best opportunities for you",
      content: "interests"
    },
    {
      title: "What are your main goals?",
      subtitle: "Choose your primary objectives so I can create personalized roadmaps",
      content: "goals"
    },
    {
      title: "Tell me about your background",
      subtitle: "This helps me understand your starting point and recommend appropriate opportunities",
      content: "background"
    },
    {
      title: "How do you prefer to learn?",
      subtitle: "I'll customize your experience based on your learning style",
      content: "learning"
    },
    {
      title: "Perfect! Let's get started 🚀",
      subtitle: "I'm analyzing your profile to find the best opportunities for you",
      content: "completion"
    }
  ];

  const interestOptions = [
    { id: 'technology', label: 'Technology & Programming', icon: '💻' },
    { id: 'business', label: 'Business & Entrepreneurship', icon: '💼' },
    { id: 'education', label: 'Education & Research', icon: '🎓' },
    { id: 'healthcare', label: 'Healthcare & Medicine', icon: '🏥' },
    { id: 'arts', label: 'Arts & Creative Fields', icon: '🎨' },
    { id: 'science', label: 'Science & Engineering', icon: '🔬' },
    { id: 'social', label: 'Social Impact & NGOs', icon: '🌍' },
    { id: 'finance', label: 'Finance & Economics', icon: '💰' }
  ];

  const goalOptions = [
    { id: 'scholarship', label: 'Get Scholarships', icon: '🎓' },
    { id: 'job', label: 'Find Job Opportunities', icon: '💼' },
    { id: 'skills', label: 'Develop New Skills', icon: '📚' },
    { id: 'network', label: 'Build Professional Network', icon: '🤝' },
    { id: 'startup', label: 'Start a Business', icon: '🚀' },
    { id: 'leadership', label: 'Develop Leadership', icon: '👑' },
    { id: 'research', label: 'Pursue Research', icon: '🔍' },
    { id: 'travel', label: 'Study/Work Abroad', icon: '✈️' }
  ];

  const learningOptions = [
    { id: 'visual', label: 'Visual Learning', icon: '👁️', desc: 'Charts, diagrams, videos' },
    { id: 'hands-on', label: 'Hands-on Practice', icon: '🛠️', desc: 'Projects and exercises' },
    { id: 'reading', label: 'Reading & Research', icon: '📖', desc: 'Articles and documentation' },
    { id: 'community', label: 'Community Learning', icon: '👥', desc: 'Group discussions and forums' },
    { id: 'mentorship', label: 'One-on-One Mentorship', icon: '🎯', desc: 'Personal guidance' },
    { id: 'structured', label: 'Structured Courses', icon: '📋', desc: 'Step-by-step curriculum' }
  ];

  const handleMultiSelect = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Start loading when completing the final step
      setIsLoading(true);
      
      // Show loading for 2 seconds then complete
      setTimeout(() => {
        onComplete(formData);
      }, 2000);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return formData.interests.length > 0;
      case 2: return formData.goals.length > 0;
      case 3: return formData.experience && formData.location && formData.education;
      case 4: return formData.preferredLearning.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  if (!isOpen) return null;

  // Loading screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className={`w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Loader2 size={40} className="text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Setting up your profile...</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We're personalizing your experience and finding the best opportunities for you.
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.content) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
              <Sparkles size={40} className="text-white" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              I'm here to help you discover amazing opportunities and create personalized roadmaps to achieve your goals. 
              Let's get to know each other better so I can provide the best guidance for your journey!
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Target size={16} className="text-primary" />
                <span>Personalized recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <BookOpen size={16} className="text-accent" />
                <span>Custom learning paths</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Briefcase size={16} className="text-green-600" />
                <span>Career opportunities</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Heart size={16} className="text-red-500" />
                <span>Ongoing support</span>
              </div>
            </div>
          </div>
        );

      case 'interests':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {interestOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleMultiSelect('interests', option.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    formData.interests.includes(option.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goalOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleMultiSelect('goals', option.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    formData.goals.includes(option.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'background':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Education Level
              </label>
              <select
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select your education level</option>
                <option value="high-school">High School</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="postgraduate">Postgraduate</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location (Country/City)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Lagos, Nigeria"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Experience Level
              </label>
              <select
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select your experience level</option>
                <option value="beginner">Beginner (Just starting out)</option>
                <option value="intermediate">Intermediate (Some experience)</option>
                <option value="advanced">Advanced (Experienced)</option>
                <option value="expert">Expert (Highly experienced)</option>
              </select>
            </div>
          </div>
        );

      case 'learning':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {learningOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleMultiSelect('preferredLearning', option.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${
                    formData.preferredLearning.includes(option.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm opacity-75">{option.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'completion':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
              <Globe size={40} className="text-white" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Perfect! I now have everything I need to provide you with personalized recommendations. 
              Your dashboard is being prepared with opportunities and roadmaps tailored just for you.
            </p>
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 p-4 rounded-2xl">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                🎯 <strong>Ready to explore:</strong> {formData.interests.length} interest areas, {formData.goals.length} goals, and personalized learning paths
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{steps[currentStep].title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{steps[currentStep].subtitle}</p>
            </div>
            {currentStep === 0 && (
              <button
                onClick={() => onComplete({})}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between gap-4">
            <Button
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              variant="primary"
              rightIcon={currentStep === steps.length - 1 ? undefined : ChevronRight}
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroductionPopup;