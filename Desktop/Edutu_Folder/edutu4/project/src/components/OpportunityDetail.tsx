import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Star, Bell, ExternalLink, Target, BookOpen, Loader2, TrendingUp, Filter } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import SuccessPopup from './ui/SuccessPopup';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoals } from '../hooks/useGoals';
import { useGoalCreation } from '../hooks/useGoalCreation';
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
  onGoalCreated?: () => void; // Add callback for goal creation success
  onNavigateToDashboard?: () => void; // Direct dashboard navigation
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currentOpportunity, setCurrentOpportunity] = useState(opportunity);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const { goals } = useGoals();
  const { createGoalFromPersonalizedRoadmap, isCreating: isCreatingGoal, error: goalCreationError } = useGoalCreation();

  // Load and subscribe to real-time updates for this opportunity
  useEffect(() => {
    if (!opportunity.id) return;

    const loadOpportunityData = async () => {
      setIsLoading(true);
      
      try {
        // Try to get from scholarships collection first (live data)
        const scholarshipData = await getScholarshipById(opportunity.id);
        if (scholarshipData) {
          setCurrentOpportunity(scholarshipData);
          setIsLoading(false);
          return;
        }
        
        // Fallback to opportunities collection with real-time subscription
        const unsubscribe = subscribeToOpportunity(
          opportunity.id,
          (updatedOpportunity) => {
            if (updatedOpportunity) {
              setCurrentOpportunity(updatedOpportunity);
            }
            setIsLoading(false);
          },
          (error) => {
            console.error('Error subscribing to opportunity:', error);
            setIsLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading opportunity data:', error);
        setIsLoading(false);
      }
    };

    loadOpportunityData();
  }, [opportunity.id]);

  const handleApply = () => {
    const applicationUrl = currentOpportunity.link || '#';
    if (applicationUrl !== '#') {
      window.open(applicationUrl, '_blank');
    } else {
      alert('Application link not available. Please check the opportunity details.');
    }
  };

  // Check if a goal already exists for this opportunity
  const findExistingGoal = () => {
    return goals.find(goal => 
      goal.title.includes(currentOpportunity.title) ||
      goal.description.includes(currentOpportunity.title) ||
      (goal.tags && goal.tags.some(tag => 
        tag.toLowerCase().includes(currentOpportunity.title.toLowerCase())
      ))
    );
  };

  const handleGetRoadmapAndCreateGoal = async () => {
    if (!user) {
      alert('Please log in to create goals and access roadmaps');
      return;
    }

    // Check if goal already exists for this opportunity
    const existingGoal = findExistingGoal();
    
    if (existingGoal && existingGoal.monthlyRoadmap && existingGoal.monthlyRoadmap.length > 0) {
      // Goal already exists with roadmap data - navigate to active roadmap tracking
      if (onGetRoadmap) {
        // Pass the existing goal data to navigate to MonthlyWeeklyRoadmap
        onGetRoadmap({
          ...opportunity,
          existingGoal: existingGoal
        });
      }
      return;
    }

    // No goal exists - create new goal and navigate to roadmap
    try {
      // Generate monthly/weekly roadmap for this opportunity
      const monthlyRoadmap = generateMonthlyRoadmapForOpportunity(currentOpportunity.title);
      
      // Create a goal with proper monthlyRoadmap structure using the unified API
      const roadmapGoalData = {
        title: `Apply to ${currentOpportunity.title}`,
        description: `Goal to apply for ${currentOpportunity.title} at ${currentOpportunity.organization || currentOpportunity.provider}`,
        category: 'opportunity',
        difficulty: 'medium',
        type: 'opportunity',
        priority: 'high',
        targetDate: currentOpportunity.deadline ? new Date(currentOpportunity.deadline) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        monthlyRoadmap, // This is the key structure needed for MonthlyWeeklyRoadmap component
        milestones: [], // Add empty milestones array
        totalTasks: monthlyRoadmap.reduce((total, month) => 
          total + month.weeks.reduce((weekTotal, week) => weekTotal + week.tasks.length, 0), 0
        ),
        estimatedTime: '3 months',
        tags: [currentOpportunity.category, currentOpportunity.organization || currentOpportunity.provider, 'application'].filter(Boolean),
        skills: ['Application Preparation', 'Research', 'Writing', 'Documentation'],
        tasks: [] // Add empty tasks array
      };

      const goalId = await createGoalFromPersonalizedRoadmap(roadmapGoalData);
      
      if (goalId) {
        console.log('✅ Goal created successfully from OpportunityDetail:', goalId);
        
        // Trigger dashboard refresh through parent component
        if (onGoalCreated) {
          onGoalCreated();
        }
        
        // Show success popup
        setShowSuccessPopup(true);
      } else {
        throw new Error('Failed to create goal');
      }
    } catch (error) {
      console.error('Error creating goal and roadmap:', error);
      alert(`Failed to create goal and roadmap: ${goalCreationError || error.message}. Please try again.`);
    }
  };

  // Generate a realistic monthly/weekly roadmap for opportunity applications
  const generateMonthlyRoadmapForOpportunity = (opportunityTitle: string) => {
    const now = new Date();
    
    return [
      {
        id: 'month-1',
        month: 1,
        title: 'Research & Planning',
        description: 'Deep research and initial preparation phase',
        targetProgress: 30,
        focusAreas: ['Research', 'Requirements Analysis', 'Initial Planning'],
        weeks: [
          {
            id: 'week-1-1',
            weekNumber: 1,
            title: 'Opportunity Research',
            description: 'Thoroughly research the opportunity and requirements',
            startDate: now,
            endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            priority: 'high',
            tasks: [
              {
                id: 'task-1-1-1',
                title: `Research ${opportunityTitle} organization background`,
                description: 'Learn about the organization, their mission, and recent news',
                completed: false,
                priority: 'high',
                estimatedHours: 3
              },
              {
                id: 'task-1-1-2', 
                title: 'Analyze application requirements in detail',
                description: 'Create a comprehensive list of all required documents and criteria',
                completed: false,
                priority: 'high',
                estimatedHours: 2
              },
              {
                id: 'task-1-1-3',
                title: 'Study previous successful applications',
                description: 'Research examples and tips from successful applicants',
                completed: false,
                priority: 'medium',
                estimatedHours: 2
              }
            ]
          },
          {
            id: 'week-1-2',
            weekNumber: 2,
            title: 'Document Preparation',
            description: 'Gather and prepare initial documents',
            startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            priority: 'high',
            tasks: [
              {
                id: 'task-1-2-1',
                title: 'Collect academic transcripts and certificates',
                description: 'Request and organize all required academic documents',
                completed: false,
                priority: 'high',
                estimatedHours: 4
              },
              {
                id: 'task-1-2-2',
                title: 'Update CV/Resume for this specific opportunity',
                description: 'Tailor your CV to highlight relevant experience',
                completed: false,
                priority: 'high',
                estimatedHours: 3
              }
            ]
          }
        ]
      },
      {
        id: 'month-2',
        month: 2,
        title: 'Application Writing',
        description: 'Draft and refine application essays and statements',
        targetProgress: 70,
        focusAreas: ['Essay Writing', 'Personal Statement', 'Cover Letters'],
        weeks: [
          {
            id: 'week-2-1',
            weekNumber: 3,
            title: 'Essay Drafting',
            description: 'Write first drafts of required essays',
            startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
            priority: 'high',
            tasks: [
              {
                id: 'task-2-1-1',
                title: 'Draft personal statement/essay',
                description: 'Write compelling first draft of your main essay',
                completed: false,
                priority: 'high',
                estimatedHours: 6
              },
              {
                id: 'task-2-1-2',
                title: 'Write motivation letter',
                description: 'Explain why you want this specific opportunity',
                completed: false,
                priority: 'high',
                estimatedHours: 4
              }
            ]
          },
          {
            id: 'week-2-2',
            weekNumber: 4,
            title: 'Review & References',
            description: 'Get feedback and secure references',
            startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
            priority: 'high',
            tasks: [
              {
                id: 'task-2-2-1',
                title: 'Get feedback on essays from mentors/peers',
                description: 'Share drafts with trusted advisors for review',
                completed: false,
                priority: 'high',
                estimatedHours: 2
              },
              {
                id: 'task-2-2-2',
                title: 'Request letters of recommendation',
                description: 'Contact referees and provide them with necessary information',
                completed: false,
                priority: 'high',
                estimatedHours: 3
              }
            ]
          }
        ]
      },
      {
        id: 'month-3',
        month: 3,
        title: 'Final Submission',
        description: 'Complete final preparations and submit application',
        targetProgress: 100,
        focusAreas: ['Final Review', 'Submission', 'Follow-up'],
        weeks: [
          {
            id: 'week-3-1',
            weekNumber: 5,
            title: 'Final Preparations',
            description: 'Complete all remaining requirements',
            startDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
            priority: 'high',
            tasks: [
              {
                id: 'task-3-1-1',
                title: 'Complete final application review',
                description: 'Proofread everything and check for completeness',
                completed: false,
                priority: 'high',
                estimatedHours: 3
              },
              {
                id: 'task-3-1-2',
                title: 'Submit application before deadline',
                description: 'Complete the submission process carefully',
                completed: false,
                priority: 'high',
                estimatedHours: 2
              }
            ]
          }
        ]
      }
    ];
  };


  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="p-4 lg:px-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="p-2 lg:p-3"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-white line-clamp-2">{currentOpportunity.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{currentOpportunity.organization || currentOpportunity.provider}</p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`p-2 lg:p-3 rounded-full transition-all ${
                notificationsEnabled 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Bell size={20} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 sm:gap-4 text-sm overflow-x-auto pb-2">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Star size={16} className="text-yellow-500" />
              <span className="font-medium text-green-600 dark:text-green-400">{currentOpportunity.match || 0}% match</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs border whitespace-nowrap ${getDifficultyColor(currentOpportunity.difficulty)}`}>
              {currentOpportunity.difficulty}
            </div>
            <div className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {currentOpportunity.applicants} applicants
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:px-6 lg:max-w-4xl lg:mx-auto space-y-6 pb-24 lg:pb-6">
        {/* Hero Image */}
        <div className="relative h-48 sm:h-56 lg:h-64 rounded-2xl overflow-hidden">
          {currentOpportunity.imageUrl || currentOpportunity.image ? (
            <img
              src={currentOpportunity.imageUrl || currentOpportunity.image}
              alt={currentOpportunity.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback image if the main image fails to load
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop&q=80&auto=format';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-4xl font-bold mb-2">{currentOpportunity.title.charAt(0)}</div>
                <div className="text-sm opacity-90">No Image Available</div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <div className="text-sm opacity-90">{currentOpportunity.category}</div>
            <div className="text-lg lg:text-xl font-bold line-clamp-2">{currentOpportunity.title}</div>
          </div>
        </div>

        {/* Key Information */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Key Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-white">Application Deadline</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{currentOpportunity.deadline || 'No deadline specified'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-white">Location</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{currentOpportunity.location || 'Various'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users size={20} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-white">Success Rate</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{currentOpportunity.successRate || 'N/A'}</div>
              </div>
            </div>
            {currentOpportunity.category && (
              <div className="flex items-center gap-3">
                <Filter size={20} className="text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 dark:text-white">Category</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{currentOpportunity.category}</div>
                </div>
              </div>
            )}
            {currentOpportunity.provider && (
              <div className="flex items-center gap-3">
                <ExternalLink size={20} className="text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 dark:text-white">Provider</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{currentOpportunity.provider}</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Summary (if available) */}
        {currentOpportunity.summary && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Summary</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{currentOpportunity.summary}</p>
          </Card>
        )}

        {/* Description */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">About This Opportunity</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{currentOpportunity.description || 'No description available'}</p>
        </Card>

        {/* Requirements */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Requirements</h2>
          <div className="space-y-2">
            {Array.isArray(currentOpportunity.requirements) ? (
              currentOpportunity.requirements.map((req, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600 dark:text-gray-300">{req}</p>
                </div>
              ))
            ) : (
              <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {currentOpportunity.requirements || 'Not specified'}
              </div>
            )}
          </div>
        </Card>

        {/* Benefits */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">What You'll Get</h2>
          <div className="space-y-2">
            {Array.isArray(currentOpportunity.benefits) ? (
              currentOpportunity.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600 dark:text-gray-300">{benefit}</p>
                </div>
              ))
            ) : (
              <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {currentOpportunity.benefits || 'Not specified'}
              </div>
            )}
          </div>
        </Card>

        {/* Application Process */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Application Process</h2>
          <div className="space-y-4">
            {Array.isArray(currentOpportunity.applicationProcess) ? (
              currentOpportunity.applicationProcess.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-600 dark:text-gray-300">{step}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {currentOpportunity.applicationProcess || 'Check official website'}
              </div>
            )}
          </div>
        </Card>

        {/* Eligibility (new for scholarships) */}
        {currentOpportunity.eligibility && currentOpportunity.eligibility !== 'Not specified' && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Eligibility</h2>
            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {currentOpportunity.eligibility}
            </div>
          </Card>
        )}

        {/* Skills Required (if available) */}
        {currentOpportunity.skills && currentOpportunity.skills.length > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Skills Required</h2>
            <div className="flex flex-wrap gap-2">
              {currentOpportunity.skills.map((skill, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm border border-blue-200 dark:border-blue-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Tags (if available) */}
        {currentOpportunity.tags && currentOpportunity.tags.length > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {currentOpportunity.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm border border-gray-200 dark:border-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Enhanced Details */}
        {(currentOpportunity.provider || currentOpportunity.salary || currentOpportunity.link) && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Additional Information</h2>
            <div className="space-y-3">
              {currentOpportunity.provider && currentOpportunity.provider !== currentOpportunity.organization && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Source</span>
                  <span className="text-gray-900 dark:text-white font-medium">{currentOpportunity.provider}</span>
                </div>
              )}
              {currentOpportunity.salary && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Compensation</span>
                  <span className="text-gray-900 dark:text-white font-medium">{currentOpportunity.salary}</span>
                </div>
              )}
              {currentOpportunity.link && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Official Source</span>
                  <Button
                    variant="outline"
                    onClick={() => window.open(currentOpportunity.link, '_blank')}
                    className="text-xs px-3 py-1 h-auto"
                  >
                    <ExternalLink size={12} className="mr-1" />
                    Visit Source
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Button
            onClick={handleGetRoadmapAndCreateGoal}
            variant="primary"
            className="flex items-center justify-center gap-2 order-1 sm:order-1"
            disabled={isCreatingGoal}
          >
            {isCreatingGoal ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Goal & Roadmap...
              </>
            ) : (
              <>
                <TrendingUp size={16} />
                Create Goal & Get Roadmap
              </>
            )}
          </Button>
          <Button
            onClick={handleApply}
            variant="outline"
            className="flex items-center justify-center gap-2 order-2 sm:order-2"
          >
            <ExternalLink size={16} />
            Apply Now
          </Button>
        </div>

        {/* Notification Banner */}
        {notificationsEnabled && (
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 animate-slide-up">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="font-medium text-blue-800 dark:text-blue-300">Notifications Enabled</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">We'll remind you about important deadlines</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title="Goal Added Successfully! 🎉"
        message={`Your goal for "${currentOpportunity.title}" has been created and added to your dashboard. You can now track your progress with organized monthly and weekly tasks!`}
        actionText="Go to Dashboard"
        onAction={() => {
          console.log('🎯 Success popup - navigating to dashboard');
          try {
            if (onNavigateToDashboard) {
              onNavigateToDashboard();
            } else {
              console.warn('⚠️ onNavigateToDashboard not provided, closing popup only');
            }
          } catch (error) {
            console.error('❌ Error in success popup navigation:', error);
            // Close popup at minimum
            setShowSuccessPopup(false);
          }
        }}
      />
    </div>
  );
};

export default OpportunityDetail;