import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Target, CheckCircle, Circle, Star, BookOpen, Video, Users, FileText, ExternalLink, Download, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import SuccessPopup from './ui/SuccessPopup';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoals } from '../hooks/useGoals';
import { useGoalCreation } from '../hooks/useGoalCreation';
import { roadmapService, ApiRoadmap } from '../services/roadmapService';

interface PersonalizedRoadmapProps {
  onBack: () => void;
  goalTitle: string;
  onNavigate?: (page: string) => void;
  onGoalCreated?: () => void; // Add callback for goal creation success
}

const PersonalizedRoadmap: React.FC<PersonalizedRoadmapProps> = ({ onBack, goalTitle, onNavigate, onGoalCreated }) => {
  const { isDarkMode } = useDarkMode();
  const { goals, updateTaskCompletion } = useGoals();
  const { 
    isCreating: isAddingGoal, 
    isSuccess: goalAdded, 
    createGoalFromPersonalizedRoadmap 
  } = useGoalCreation();
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1])); // First phase expanded by default
  const [linkedGoal, setLinkedGoal] = useState<any>(null);
  const [apiRoadmap, setApiRoadmap] = useState<ApiRoadmap | null>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load roadmap from API
  useEffect(() => {
    const loadRoadmap = async () => {
      setLoadingRoadmap(true);
      setRoadmapError(null);
      
      try {
        // Try to generate a new roadmap based on the goal title
        const roadmap = await roadmapService.generatePersonalizedRoadmap({
          goalTitle: goalTitle
        });
        
        setApiRoadmap(roadmap);
      } catch (error) {
        console.error('Error loading roadmap:', error);
        setRoadmapError('Failed to load personalized roadmap. Using cached data.');
      } finally {
        setLoadingRoadmap(false);
      }
    };
    
    loadRoadmap();
  }, [goalTitle]);

  // Find linked goal based on title or ID - Enhanced detection logic
  useEffect(() => {
    if (!goalTitle || !goals || goals.length === 0) {
      setLinkedGoal(null);
      return;
    }

    // Try multiple matching strategies to find the linked goal
    const goal = goals.find(g => {
      // Strategy 1: Exact ID match (if goalTitle is actually a goal ID)
      if (g.id === goalTitle) return true;
      
      // Strategy 2: Exact title match
      if (g.title === goalTitle) return true;
      
      // Strategy 3: Goal title contains the opportunity title
      if (g.title.includes(goalTitle)) return true;
      
      // Strategy 4: Opportunity title contains part of goal title
      if (goalTitle.includes(g.title.replace('Apply to ', ''))) return true;
      
      // Strategy 5: Check description for opportunity reference
      if (g.description && g.description.includes(goalTitle)) return true;
      
      // Strategy 6: Check tags for opportunity reference
      if (g.tags && g.tags.some(tag => 
        tag.toLowerCase().includes(goalTitle.toLowerCase()) ||
        goalTitle.toLowerCase().includes(tag.toLowerCase())
      )) return true;
      
      return false;
    });
    
    if (goal) {
      setLinkedGoal(goal);
      console.log('🎯 Found linked goal:', {
        goalTitle: goal.title,
        goalId: goal.id,
        hasMonthlyRoadmap: !!(goal.monthlyRoadmap && goal.monthlyRoadmap.length > 0),
        searchedFor: goalTitle
      });
      
      // Sync completed tasks from goal's monthlyRoadmap or tasks
      if (goal.monthlyRoadmap && goal.monthlyRoadmap.length > 0) {
        const completed = new Set<number>();
        goal.monthlyRoadmap.forEach((month: any) => {
          month.weeks?.forEach((week: any) => {
            week.tasks?.forEach((task: any) => {
              if (task.completed) {
                completed.add(task.id);
              }
            });
          });
          // Also check month-level tasks if any
          month.tasks?.forEach((task: any) => {
            if (task.completed) {
              completed.add(task.id);
            }
          });
        });
        setCompletedTasks(completed);
      } else if (goal.tasks) {
        const completed = new Set<number>();
        goal.tasks.forEach((task: any) => {
          if (task.completed) {
            completed.add(task.id);
          }
        });
        setCompletedTasks(completed);
      }
    } else {
      console.log('❌ No linked goal found for:', goalTitle, 'in', goals.length, 'goals');
      setLinkedGoal(null);
      setCompletedTasks(new Set());
    }
  }, [goals, goalTitle]);

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const toggleTask = async (taskId: number) => {
    const newCompleted = new Set(completedTasks);
    const isCompleting = !newCompleted.has(taskId);
    
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    
    setCompletedTasks(newCompleted);
    
    // If linked to a goal, update the task completion in the database
    if (linkedGoal && updateTaskCompletion) {
      try {
        await updateTaskCompletion(linkedGoal.id, taskId.toString(), isCompleting);
      } catch (error) {
        console.error('Error updating task in goal:', error);
        // Revert local state if database update fails
        const revertedCompleted = new Set(completedTasks);
        setCompletedTasks(revertedCompleted);
      }
    }
  };

  const togglePhase = (phaseId: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };
  const handleViewResources = () => {
    if (onNavigate) {
      onNavigate('resources');
    }
  };

  const handleAddAsGoal = async () => {
    try {
      console.log('🎯 Starting goal creation from PersonalizedRoadmap...');
      
      // Generate monthly/weekly roadmap structure based on opportunity title
      const monthlyRoadmap = generateMonthlyRoadmapForOpportunity(goalTitle);
      
      // Convert roadmap data to goal format with monthlyRoadmap structure
      const roadmapGoalData = {
        title: goalTitle,
        description: `Complete the ${goalTitle} application roadmap with organized monthly and weekly tasks`,
        category: 'opportunity',
        difficulty: 'medium',
        type: 'opportunity',
        priority: 'high',
        estimatedTime: roadmapData.duration,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Set target date to 3 months from now
        monthlyRoadmap, // This is the key structure needed for MonthlyWeeklyRoadmap component
        milestones: roadmapData.phases.map((phase, index) => ({
          title: phase.title,
          description: `Complete all tasks in ${phase.title}`,
          order: index,
          completed: false,
          estimatedDuration: phase.duration
        })),
        totalTasks: monthlyRoadmap.reduce((total, month) => 
          total + month.weeks.reduce((weekTotal, week) => weekTotal + week.tasks.length, 0), 0
        ),
        skills: ['Application Preparation', 'Research', 'Writing', 'Documentation'],
        tasks: [] // Add empty tasks array to prevent errors
      };
      
      console.log('📊 Goal data prepared:', {
        title: roadmapGoalData.title,
        category: roadmapGoalData.category,
        totalTasks: roadmapGoalData.totalTasks,
        monthlyRoadmapLength: monthlyRoadmap.length
      });
      
      const goalId = await createGoalFromPersonalizedRoadmap(roadmapGoalData);
      
      if (goalId) {
        console.log('✅ Goal created successfully:', goalId);
        
        // Trigger dashboard refresh through parent component
        if (onGoalCreated) {
          onGoalCreated();
        }
        
        // Show success popup
        setShowSuccessPopup(true);
      } else {
        throw new Error('Goal creation returned null');
      }
    } catch (error) {
      console.error('❌ Error creating goal from roadmap:', error);
      
      // Show error popup
      alert(`❌ Failed to create goal: ${error.message || 'Unknown error'}. Please try again or check your internet connection.`);
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
              },
              {
                id: 'task-1-2-3',
                title: 'Create document checklist and timeline',
                description: 'Plan what documents you need and when to complete them',
                completed: false,
                priority: 'medium',
                estimatedHours: 1
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
              },
              {
                id: 'task-2-1-3',
                title: 'Complete supplemental essays (if any)',
                description: 'Address any additional essay requirements',
                completed: false,
                priority: 'medium',
                estimatedHours: 3
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
              },
              {
                id: 'task-2-2-3',
                title: 'Revise essays based on feedback',
                description: 'Incorporate suggestions and improve your writing',
                completed: false,
                priority: 'high',
                estimatedHours: 4
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
                title: 'Prepare for interview (if applicable)',
                description: 'Practice common questions and prepare examples',
                completed: false,
                priority: 'medium',
                estimatedHours: 4
              },
              {
                id: 'task-3-1-3',
                title: 'Submit application before deadline',
                description: 'Complete the submission process carefully',
                completed: false,
                priority: 'high',
                estimatedHours: 2
              }
            ]
          },
          {
            id: 'week-3-2',
            weekNumber: 6,
            title: 'Post-Submission',
            description: 'Follow-up and prepare for next steps',
            startDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
            priority: 'low',
            tasks: [
              {
                id: 'task-3-2-1',
                title: 'Confirm application receipt',
                description: 'Verify that your application was received successfully',
                completed: false,
                priority: 'medium',
                estimatedHours: 1
              },
              {
                id: 'task-3-2-2',
                title: 'Send thank you notes to referees',
                description: 'Thank people who helped with your application',
                completed: false,
                priority: 'low',
                estimatedHours: 1
              },
              {
                id: 'task-3-2-3',
                title: 'Plan next steps while waiting for results',
                description: 'Consider backup options and continue skill development',
                completed: false,
                priority: 'low',
                estimatedHours: 2
              }
            ]
          }
        ]
      }
    ];
  };

  // Sample roadmap data - this would typically come from props or API
  const roadmapData = {
    duration: "6 months",
    difficulty: "Intermediate",
    phases: [
      {
        id: 1,
        title: "Foundation Phase",
        duration: "Month 1-2",
        tasks: [
          { id: 1, title: "Learn Python basics and syntax", completed: false, priority: "High" },
          { id: 2, title: "Set up development environment", completed: false, priority: "High" },
          { id: 3, title: "Complete basic programming exercises", completed: false, priority: "Medium" },
          { id: 4, title: "Understand data types and structures", completed: false, priority: "High" }
        ]
      },
      {
        id: 2,
        title: "Intermediate Skills",
        duration: "Month 3-4",
        tasks: [
          { id: 5, title: "Master object-oriented programming", completed: false, priority: "High" },
          { id: 6, title: "Learn file handling and databases", completed: false, priority: "Medium" },
          { id: 7, title: "Build first complete project", completed: false, priority: "High" },
          { id: 8, title: "Understand error handling", completed: false, priority: "Medium" }
        ]
      },
      {
        id: 3,
        title: "Advanced Applications",
        duration: "Month 5-6",
        tasks: [
          { id: 9, title: "Learn web frameworks (Django/Flask)", completed: false, priority: "High" },
          { id: 10, title: "Build portfolio projects", completed: false, priority: "High" },
          { id: 11, title: "Practice coding interviews", completed: false, priority: "Medium" },
          { id: 12, title: "Apply for positions", completed: false, priority: "High" }
        ]
      }
    ]
  };

  const totalTasks = roadmapData.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const completedCount = completedTasks.size;
  const progressPercentage = linkedGoal ? linkedGoal.progress : Math.round((completedCount / totalTasks) * 100);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 dark:text-red-400';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'Low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {linkedGoal ? 'My Goal Roadmap' : 'Personalized Roadmap'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {linkedGoal ? (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Target size={12} />
                      Active Goal: {linkedGoal.title}
                    </span>
                    {linkedGoal.targetDate && (
                      <span className="ml-2 text-xs">
                        Due: {new Date(linkedGoal.targetDate.toDate ? linkedGoal.targetDate.toDate() : linkedGoal.targetDate).toLocaleDateString()}
                      </span>
                    )}
                  </>
                ) : (
                  `Roadmap for: ${goalTitle}`
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800 dark:text-white">{progressPercentage}% Complete</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{completedCount}/{totalTasks} tasks</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Overview Card */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              {linkedGoal ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Your Active Goal</h2>
                  <p className="text-gray-600 dark:text-gray-400">Track your progress on this opportunity</p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Welcome to Your Personalized Roadmap!</h2>
                  <p className="text-gray-600 dark:text-gray-400">Here's your customized plan for <strong>{goalTitle}</strong>. Click "Add as Goal" below to start tracking your progress.</p>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Duration: {roadmapData.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Level: {roadmapData.difficulty}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
              <span className="text-gray-800 dark:text-white font-medium">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Add as Goal Section */}
          {!linkedGoal && (
            <div className="space-y-3">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  🎯 Ready to Start Your Journey?
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Add this roadmap as a goal to track your progress, receive reminders, and celebrate achievements along the way!
                </p>
              </div>
              
              <Button 
                onClick={handleAddAsGoal}
                disabled={isAddingGoal || goalAdded}
                className={`w-full transition-all ${
                  goalAdded 
                    ? 'bg-green-600 hover:bg-green-600 text-white' 
                    : 'bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                } ${isAddingGoal ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isAddingGoal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Adding Goal...
                  </>
                ) : goalAdded ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Goal Added Successfully!
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add as Goal to Track Progress
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Linked Goal Indicator */}
          {linkedGoal && (
            <div className="w-full p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Tracking progress in your goals dashboard
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Roadmap Phases */}
        {roadmapData.phases.map((phase, index) => (
          <Card key={phase.id} className="dark:bg-gray-800 dark:border-gray-700">
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full flex items-center gap-3 mb-4 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 -m-2 rounded-2xl transition-all"
            >
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{phase.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{phase.duration}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {phase.tasks.filter(t => completedTasks.has(t.id)).length}/{phase.tasks.length}
                </div>
                {expandedPhases.has(phase.id) ? (
                  <ChevronDown size={20} className="text-gray-400" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
              </div>
            </button>

            {expandedPhases.has(phase.id) && (
              <div className="space-y-3 animate-slide-up">
                {phase.tasks.map((task, taskIndex) => (
                  <div 
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${taskIndex * 50}ms` }}
                    onClick={() => toggleTask(task.id)}
                  >
                    {completedTasks.has(task.id) ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${completedTasks.has(task.id) ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                        {task.title}
                      </p>
                      <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        {/* Helpful Resources Section */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Helpful Resources</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Curated materials to support your learning journey</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-800 dark:text-white">Documentation</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Official guides</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Video className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-800 dark:text-white">Video Tutorials</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Step-by-step</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-800 dark:text-white">Communities</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Get support</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-800 dark:text-white">Courses</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Structured learning</p>
            </div>
          </div>

          <Button 
            onClick={handleViewResources}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            View All Resources
          </Button>
        </Card>
      </div>

      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title="Goal Added Successfully! 🎉"
        message={`Your goal "${goalTitle}" has been added to your dashboard. You can now track your progress, complete tasks, and celebrate achievements along the way!`}
        actionText="Go to Dashboard"
        onAction={() => {
          if (onNavigate) {
            onNavigate('dashboard');
          }
        }}
      />
    </div>
  );
};

export default PersonalizedRoadmap;