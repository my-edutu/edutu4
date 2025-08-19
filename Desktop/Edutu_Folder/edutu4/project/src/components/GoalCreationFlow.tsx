import React, { useState } from 'react';
import { X, Target, Globe, Plus, Sparkles, Users, Trophy, ChevronRight } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import CommunityMarketplace from './CommunityMarketplace';
import GoalTemplates from './GoalTemplates';
import CustomGoalCreator from './CustomGoalCreator';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoalCreation } from '../hooks/useGoalCreation';

interface GoalCreationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: (goalId: string) => void;
  user: { name: string; age: number; uid: string } | null;
}

type CreationStep = 'selection' | 'marketplace' | 'templates' | 'custom';

const GoalCreationFlow: React.FC<GoalCreationFlowProps> = ({
  isOpen,
  onClose,
  onGoalCreated,
  user
}) => {
  const { isDarkMode } = useDarkMode();
  const [currentStep, setCurrentStep] = useState<CreationStep>('selection');
  const { isCreating } = useGoalCreation();

  if (!isOpen) return null;

  const handleGoalCreated = (goalId: string) => {
    onGoalCreated(goalId);
    onClose();
  };

  const creationOptions = [
    {
      id: 'marketplace',
      title: '🌟 Community Roadmap Marketplace',
      description: 'Browse proven success paths shared by accomplished community members',
      icon: <Globe size={32} className="text-green-600" />,
      features: ['500+ Success Stories', 'Verified Results', 'Real Achievements', 'Proven Strategies'],
      color: 'from-green-500 to-blue-500',
      bgColor: 'bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      id: 'templates',
      title: 'Roadmap Templates',
      description: 'Choose from our curated collection of expert-designed goal templates',
      icon: <Target size={32} className="text-blue-600" />,
      features: ['Expert Designed', 'Step-by-Step Guide', 'Proven Framework', 'Quick Setup'],
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'custom',
      title: 'Create Custom Goal',
      description: 'Build your own personalized goal from scratch with AI assistance',
      icon: <Plus size={32} className="text-purple-600" />,
      features: ['Complete Flexibility', 'AI Assistance', 'Personal Touch', 'Custom Milestones'],
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    }
  ];

  const renderSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Create Your Goal
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Choose how you'd like to create your goal. We'll guide you every step of the way.
        </p>
      </div>

      <div className="space-y-4">
        {creationOptions.map((option, index) => (
          <Card
            key={option.id}
            className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] ${option.bgColor} ${option.borderColor} animate-slide-up group`}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => setCurrentStep(option.id as CreationStep)}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                {option.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-primary transition-colors">
                  {option.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {option.description}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {option.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Trophy size={14} className="text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'marketplace':
        return (
          <CommunityMarketplace
            onBack={() => setCurrentStep('selection')}
            onRoadmapSelect={(roadmap) => {
              // Handle roadmap selection and goal creation
              console.log('Roadmap selected:', roadmap);
            }}
            user={user}
            onGoalCreated={handleGoalCreated}
          />
        );
      case 'templates':
        return (
          <GoalTemplates
            onBack={() => setCurrentStep('selection')}
            onTemplateSelect={(template) => {
              // Handle template selection and goal creation
              console.log('Template selected:', template);
            }}
            user={user}
            onGoalCreated={handleGoalCreated}
          />
        );
      case 'custom':
        return (
          <CustomGoalCreator
            onBack={() => setCurrentStep('selection')}
            onGoalCreated={handleGoalCreated}
            user={user}
          />
        );
      default:
        return renderSelection();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-2xl`}>
        {/* Header */}
        <div className="sticky top-0 bg-inherit border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {currentStep === 'selection' && 'Add New Goal'}
                {currentStep === 'marketplace' && 'Community Marketplace'}
                {currentStep === 'templates' && 'Goal Templates'}
                {currentStep === 'custom' && 'Custom Goal Creator'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentStep === 'selection' && 'Choose your preferred goal creation method'}
                {currentStep === 'marketplace' && 'Browse proven success stories'}
                {currentStep === 'templates' && 'Select from expert-designed templates'}
                {currentStep === 'custom' && 'Build your personalized goal'}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isCreating}
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

export default GoalCreationFlow;