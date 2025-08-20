import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Star, ExternalLink, Target, BookOpen, Loader2, TrendingUp, Globe, CheckCircle, AlertCircle, Play } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import SuccessPopup from './ui/SuccessPopup';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoals } from '../hooks/useGoals';
import { useAuth } from '../hooks/useAuth';
import { generateRoadmap } from '../services/apiService';
import { subscribeToOpportunity } from '../services/opportunitiesService';
import { getScholarshipById } from '../services/scholarshipService';

interface OpportunityDetailProps {
  opportunity: {
    id: string;
    title: string;
    organization: string;
    category: string;
    deadline: string;
    location: string;
    description: string;
    summary?: string;
    requirements: string[];
    benefits: string[];
    applicationProcess: string[];
    image: string;
    imageUrl?: string;
    match: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    applicants: string;
    successRate: string;
    link?: string;
    provider?: string;
    tags?: string[];
    eligibility?: string;
    salary?: string;
    skills?: string[];
  };
  onBack: () => void;
  onAddToGoals: (opportunity: any) => void;
  onViewSuccessStory: (opportunity: any) => void;
  onGetRoadmap?: (opportunity: any) => void;
  onGoalCreated?: () => void;
  onNavigateToDashboard?: () => void;
}

const OpportunityDetail: React.FC<OpportunityDetailProps> = ({ 
  opportunity, 
  onBack, 
  onAddToGoals,
  onViewSuccessStory,
  onGetRoadmap,
  onGoalCreated,
  onNavigateToDashboard
}) => {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const { createGoal } = useGoals();
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'subscribing' | 'subscribed'>('idle');

  // Check if user has already applied (simulate with localStorage for demo)
  useEffect(() => {
    const appliedOpportunities = JSON.parse(localStorage.getItem('appliedOpportunities') || '[]');
    setHasApplied(appliedOpportunities.includes(opportunity.id));
  }, [opportunity.id]);

  const handleApply = async () => {
    if (!user) return;
    
    setIsApplying(true);
    
    try {
      // Simulate application process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as applied
      const appliedOpportunities = JSON.parse(localStorage.getItem('appliedOpportunities') || '[]');
      appliedOpportunities.push(opportunity.id);
      localStorage.setItem('appliedOpportunities', JSON.stringify(appliedOpportunities));
      
      setHasApplied(true);
      setSuccessMessage('Application submitted successfully! 🎉');
      setShowSuccessPopup(true);
      
      // Subscribe to opportunity updates
      if (opportunity.link) {
        window.open(opportunity.link, '_blank');
      }
      
    } catch (error) {
      console.error('Error applying to opportunity:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateRoadmap = async () => {
    if (!user) return;
    
    setIsGeneratingRoadmap(true);
    
    try {
      // Create a goal based on the opportunity
      const goalData = {
        title: `${opportunity.title} Preparation`,
        description: `Complete preparation and application for ${opportunity.title} at ${opportunity.organization}`,
        category: 'application' as const,
        type: 'medium_term' as const,
        priority: 'high' as const,
        difficulty: opportunity.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
        tags: [opportunity.category, 'opportunity', ...(opportunity.tags || [])],
        targetDate: new Date(opportunity.deadline),
        opportunityId: opportunity.id,
        
        // Generate roadmap structure
        monthlyRoadmap: [
          {
            month: 'Month 1',
            title: 'Research & Requirements',
            description: 'Deep dive into opportunity requirements and preparation',
            tasks: [
              {
                id: 'task_1',
                title: 'Review all requirements thoroughly',
                description: 'Understand what\'s needed for the application',
                completed: false,
                type: 'research'
              },
              {
                id: 'task_2', 
                title: 'Gather necessary documents',
                description: 'Collect transcripts, letters, etc.',
                completed: false,
                type: 'preparation'
              },
              {
                id: 'task_3',
                title: 'Research the organization',
                description: `Learn about ${opportunity.organization}'s mission and values`,
                completed: false,
                type: 'research'
              }
            ],
            color: '#3B82F6'
          },
          {
            month: 'Month 2',
            title: 'Application Preparation',
            description: 'Prepare all application materials',
            tasks: [
              {
                id: 'task_4',
                title: 'Draft application essays/statements',
                description: 'Write compelling personal statements',
                completed: false,
                type: 'writing'
              },
              {
                id: 'task_5',
                title: 'Get recommendation letters',
                description: 'Request and follow up on references',
                completed: false,
                type: 'networking'
              },
              {
                id: 'task_6',
                title: 'Review and edit all materials',
                description: 'Proofread and perfect your application',
                completed: false,
                type: 'review'
              }
            ],
            color: '#10B981'
          },
          {
            month: 'Month 3',
            title: 'Final Submission',
            description: 'Submit application and follow up',
            tasks: [
              {
                id: 'task_7',
                title: 'Submit complete application',
                description: 'Final submission before deadline',
                completed: false,
                type: 'action'
              },
              {
                id: 'task_8',
                title: 'Follow up if needed',
                description: 'Check application status',
                completed: false,
                type: 'followup'
              }
            ],
            color: '#F59E0B'
          }
        ]
      };

      const goalId = await createGoal(goalData);
      
      if (goalId) {
        setSuccessMessage('Roadmap created successfully! 🗺️');
        setShowSuccessPopup(true);
        
        // Navigate to goals or dashboard after creation
        setTimeout(() => {
          if (onGoalCreated) onGoalCreated();
          if (onNavigateToDashboard) onNavigateToDashboard();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error creating roadmap:', error);
      alert('Failed to create roadmap. Please try again.');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Hard': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getMatchColor = (match: number) => {
    if (match >= 80) return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
    if (match >= 60) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={onBack}
              icon={ArrowLeft}
              size="md"
            >
              Back
            </Button>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {opportunity.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {opportunity.organization} • {opportunity.location}
              </p>
            </div>

            {/* Match Score */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getMatchColor(opportunity.match)}`}>
              <Star className="inline w-4 h-4 mr-1" />
              {opportunity.match}% match
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="md:w-1/3">
              <div className="aspect-video md:aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {(opportunity.image || opportunity.imageUrl) ? (
                  <img 
                    src={opportunity.image || opportunity.imageUrl} 
                    alt={opportunity.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl ${(opportunity.image || opportunity.imageUrl) ? 'hidden' : ''}`}>
                  {opportunity.organization?.[0] || opportunity.title[0]}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="md:w-2/3 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {opportunity.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {opportunity.summary || opportunity.description}
                </p>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">Deadline</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {opportunity.deadline}
                  </p>
                </div>
                
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Users className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">Applicants</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {opportunity.applicants}
                  </p>
                </div>
                
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">Success Rate</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {opportunity.successRate}
                  </p>
                </div>
                
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(opportunity.difficulty)}`}>
                    {opportunity.difficulty}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant={hasApplied ? "secondary" : "primary"}
                  onClick={handleApply}
                  disabled={isApplying || hasApplied}
                  loading={isApplying}
                  icon={hasApplied ? CheckCircle : ExternalLink}
                  className="flex-1"
                  size="lg"
                >
                  {hasApplied ? 'Applied ✓' : isApplying ? 'Applying...' : 'Apply Now'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCreateRoadmap}
                  disabled={isGeneratingRoadmap}
                  loading={isGeneratingRoadmap}
                  icon={Target}
                  className="flex-1"
                  size="lg"
                >
                  {isGeneratingRoadmap ? 'Creating...' : 'Create Roadmap'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Requirements */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Requirements
            </h3>
            <ul className="space-y-2">
              {opportunity.requirements.map((req, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm">{req}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Benefits */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Benefits
            </h3>
            <ul className="space-y-2">
              {opportunity.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Application Process */}
          <Card className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
              Application Process
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {opportunity.applicationProcess.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{step}</p>
                    </div>
                  </div>
                  {index < opportunity.applicationProcess.length - 1 && (
                    <div className="hidden lg:block absolute top-4 left-8 w-full h-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Tags */}
        {opportunity.tags && opportunity.tags.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {opportunity.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <SuccessPopup
          message={successMessage}
          onClose={() => setShowSuccessPopup(false)}
        />
      )}
    </div>
  );
};

export default OpportunityDetail;