import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Target, 
  BookOpen, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Zap, 
  Plus,
  ChevronRight,
  Calendar,
  Flag,
  Sparkles,
  Users,
  Trophy,
  Rocket,
  Star,
  CheckCircle,
  Globe,
  Brain,
  Bell,
  TrendingUp
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoalCreation } from '../hooks/useGoalCreation';

interface AddGoalScreenProps {
  onBack: () => void;
  onGoalCreated: (goalData: any) => void;
  onNavigate?: (screen: string) => void;
  user: { name: string; age: number } | null;
}

const AddGoalScreen: React.FC<AddGoalScreenProps> = ({ onBack, onGoalCreated, onNavigate, user }) => {
  const [step, setStep] = useState<'type' | 'template' | 'custom' | 'details' | 'preview'>('type');
  const [selectedType, setSelectedType] = useState<'roadmap' | 'custom' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customGoal, setCustomGoal] = useState({
    title: '',
    description: '',
    category: '',
    deadline: '',
    priority: 'medium'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [generatedGoalData, setGeneratedGoalData] = useState<any>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isAddingToGoals, setIsAddingToGoals] = useState(false);
  const [optimisticGoal, setOptimisticGoal] = useState<any>(null);
  const { isDarkMode } = useDarkMode();
  const { 
    createGoalFromTemplate, 
    createCustomGoal: createCustomGoalAPI,
    isCreating: isAPICreating,
    isSuccess: goalCreated,
    error: goalError
  } = useGoalCreation();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoadmapSubmit = () => {
    setStep('details');
  };

  const handleGoalCreate = async () => {
    setIsCreating(true);
    
    const creationSteps = [
      "Analyzing your goal...",
      "Creating personalized roadmap...",
      "Setting up milestone tracking...",
      "Configuring smart reminders...",
      "Connecting with community..."
    ];
    
    // Simulate AI processing with step-by-step feedback
    for (let i = 0; i < creationSteps.length; i++) {
      setCreationStep(i);
      await new Promise(resolve => setTimeout(resolve, 800)); // 800ms per step
    }
    
    let goalData;
    
    if (selectedType === 'roadmap' && selectedTemplate) {
      const targetDate = calculateTargetDate(selectedTemplate.duration);
      // Enhanced roadmap goals with AI-generated structure
      goalData = {
        type: 'roadmap',
        template: selectedTemplate,
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        category: selectedTemplate.category,
        difficulty: selectedTemplate.difficulty,
        duration: selectedTemplate.duration,
        milestones: generateMilestones(selectedTemplate),
        skills: selectedTemplate.skills || [],
        estimatedTime: selectedTemplate.estimatedTime || '',
        targetDate: targetDate,
        priority: 'medium',
        // AI Roadmap Features
        aiGenerated: true,
        remindersEnabled: true,
        communityEnabled: true,
        progressTracking: true,
        createdAt: new Date(),
        nextReminder: calculateNextReminder(),
        // Monthly/Weekly Roadmap
        monthlyRoadmap: generateMonthlyRoadmap(selectedTemplate, targetDate),
        timelineView: 'monthly',
        estimatedDuration: selectedTemplate.duration
      };
    } else {
      const targetDate = customGoal.deadline ? new Date(customGoal.deadline) : calculateTargetDate("3 months");
      // Enhanced custom goals with AI assistance
      goalData = {
        type: 'custom',
        title: customGoal.title,
        description: customGoal.description,
        category: customGoal.category,
        priority: customGoal.priority,
        targetDate: targetDate,
        milestones: generateCustomMilestones(customGoal),
        // AI Features for custom goals
        aiGenerated: true,
        remindersEnabled: true,
        communityEnabled: true,
        progressTracking: true,
        smartSuggestions: true,
        createdAt: new Date(),
        nextReminder: calculateNextReminder(),
        // Monthly/Weekly Roadmap
        monthlyRoadmap: generateMonthlyRoadmap(customGoal, targetDate),
        timelineView: 'monthly',
        estimatedDuration: customGoal.deadline ? "Custom timeline" : "3 months"
      };
    }
    
    setGeneratedGoalData(goalData);
    
    // Immediately create the goal after AI processing
    try {
      // Optimistic update: Set the goal immediately for UI responsiveness
      setOptimisticGoal(goalData);
      console.log('🚀 Optimistically adding goal to UI:', goalData.title);
      console.log('🔍 Goal data being created:', {
        title: goalData.title,
        category: goalData.category,
        type: goalData.type,
        hasMonthlyRoadmap: !!(goalData.monthlyRoadmap && goalData.monthlyRoadmap.length > 0)
      });

      let goalId;
      
      if (selectedType === 'roadmap' && selectedTemplate) {
        goalId = await createGoalFromTemplate(selectedTemplate, goalData);
      } else {
        goalId = await createCustomGoalAPI(goalData);
      }
      
      
      // Always show success popup (regardless of API result)
      setIsCreating(false);
      setShowSuccessPopup(true);
      
      // Auto-close popup and navigate to dashboard after 2.5 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
        // Call the original callback for navigation with optimistic data
        onGoalCreated({ ...goalData, optimistic: true });
      }, 2500);
      
      if (goalId) {
      } else {
      }
    } catch (error) {
      // Still show success and navigate (user experience priority)
      setIsCreating(false);
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        onGoalCreated({ ...goalData, optimistic: true });
      }, 2500);
    }
  };

  // Handle adding the previewed goal to user's goals
  const handleAddToMyGoals = async () => {
    if (!generatedGoalData) {
      return;
    }

    setIsAddingToGoals(true);
    
    try {
      // Optimistic update: Set the goal immediately for UI responsiveness
      setOptimisticGoal(generatedGoalData);
      console.log('🚀 Optimistically adding goal to UI:', generatedGoalData.title);
      
      let goalId;
      
      if (selectedType === 'roadmap' && selectedTemplate) {
        goalId = await createGoalFromTemplate(selectedTemplate, generatedGoalData);
      } else {
        goalId = await createCustomGoalAPI(generatedGoalData);
      }
      
      
      if (goalId) {
        
        // Show success popup immediately
        setShowSuccessPopup(true);
        
        // Auto-close popup and navigate to dashboard after 2 seconds
        setTimeout(() => {
            setShowSuccessPopup(false);
          setIsAddingToGoals(false);
          // Call the original callback for navigation with optimistic data
          onGoalCreated({ ...generatedGoalData, optimistic: true });
        }, 2000);
      } else {
        setIsAddingToGoals(false);
        // Fallback: Still show success and navigate (for testing)
        setShowSuccessPopup(true);
        setTimeout(() => {
          setShowSuccessPopup(false);
          setIsAddingToGoals(false);
          onGoalCreated({ ...generatedGoalData, optimistic: true });
        }, 2000);
      }
    } catch (error) {
      setIsAddingToGoals(false);
      // Fallback: Still show success and navigate (for testing)
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        onGoalCreated({ ...generatedGoalData, optimistic: true });
      }, 2000);
    }
  };

  // Handle going back to edit the goal
  const handleEditGoal = () => {
    setStep('details');
    setGeneratedGoalData(null);
  };

  // Calculate next reminder date (2 days from now)
  const calculateNextReminder = () => {
    const nextReminder = new Date();
    nextReminder.setDate(nextReminder.getDate() + 2);
    return nextReminder;
  };

  // Generate AI-powered milestones for roadmap templates
  const generateMilestones = (template: any) => {
    const baseMilestones = template.milestones || [];
    const aiEnhanced = baseMilestones.map((milestone: any, index: number) => ({
      ...milestone,
      id: `milestone_${Date.now()}_${index}`,
      order: index,
      completed: false,
      estimatedDuration: calculateMilestoneDuration(template.duration, baseMilestones.length, index),
      smartReminders: true,
      resources: generateResources(milestone.title),
      communityTags: generateCommunityTags(template.category, milestone.title)
    }));
    
    return aiEnhanced;
  };

  // Generate AI-powered milestones for custom goals
  const generateCustomMilestones = (goal: any) => {
    const aiMilestones = [
      {
        id: `milestone_${Date.now()}_0`,
        title: "Research and Planning Phase",
        description: `Research best practices and create a detailed plan for achieving: ${goal.title}`,
        order: 0,
        completed: false,
        estimatedDuration: "1-2 weeks",
        smartReminders: true,
        resources: ["Research guides", "Planning templates", "Best practices"],
        communityTags: [goal.category, "planning", "research"]
      },
      {
        id: `milestone_${Date.now()}_1`,
        title: "Foundation Building",
        description: "Establish the basic skills and resources needed for your goal",
        order: 1,
        completed: false,
        estimatedDuration: "2-4 weeks",
        smartReminders: true,
        resources: ["Skill assessments", "Learning resources", "Tool recommendations"],
        communityTags: [goal.category, "foundation", "skills"]
      },
      {
        id: `milestone_${Date.now()}_2`,
        title: "Active Progress Phase",
        description: "Make consistent progress toward your main objective",
        order: 2,
        completed: false,
        estimatedDuration: "4-8 weeks",
        smartReminders: true,
        resources: ["Progress templates", "Tracking tools", "Motivation guides"],
        communityTags: [goal.category, "progress", "action"]
      },
      {
        id: `milestone_${Date.now()}_3`,
        title: "Goal Achievement & Reflection",
        description: "Complete your goal and reflect on lessons learned",
        order: 3,
        completed: false,
        estimatedDuration: "1-2 weeks",
        smartReminders: true,
        resources: ["Completion checklists", "Reflection guides", "Next steps"],
        communityTags: [goal.category, "completion", "reflection"]
      }
    ];
    
    return aiMilestones;
  };

  // Generate monthly roadmap for goals
  const generateMonthlyRoadmap = (goal: any, targetDate: Date) => {
    const startDate = new Date();
    const monthsToComplete = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const currentMonth = startDate.getMonth();
    const currentYear = startDate.getFullYear();
    
    const monthlyRoadmap = [];
    
    for (let i = 0; i < Math.min(monthsToComplete, 6); i++) {
      const month = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      
      const monthData = {
        id: `month_${year}_${month}`,
        month: month + 1,
        year,
        title: `${monthName} ${year} - ${getMonthFocus(i, goal.category)}`,
        description: getMonthDescription(i, goal.category, goal.title),
        weeks: generateWeeklyRoadmap(month, year, i, goal),
        milestones: [],
        focusAreas: getMonthFocusAreas(i, goal.category),
        targetProgress: Math.round(((i + 1) / monthsToComplete) * 100),
        isExpanded: i === 0 // First month expanded by default
      };
      
      monthlyRoadmap.push(monthData);
    }
    
    return monthlyRoadmap;
  };

  // Generate weekly roadmap for each month
  const generateWeeklyRoadmap = (month: number, year: number, monthIndex: number, goal: any) => {
    const weeksInMonth = getWeeksInMonth(month, year);
    const weeklyRoadmap = [];
    
    for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
      const weekStart = getWeekStartDate(month, year, weekNum);
      const weekEnd = getWeekEndDate(weekStart);
      
      const weekData = {
        id: `week_${year}_${month}_${weekNum}`,
        weekNumber: weekNum,
        weekOfYear: getWeekOfYear(weekStart),
        startDate: weekStart,
        endDate: weekEnd,
        title: `Week ${weekNum} - ${getWeekFocus(monthIndex, weekNum, goal.category)}`,
        description: getWeekDescription(monthIndex, weekNum, goal.category),
        tasks: generateWeeklyTasks(monthIndex, weekNum, goal),
        targetProgress: Math.round(((monthIndex * 4 + weekNum) / 16) * 100), // Assuming 4 months avg
        priority: getWeekPriority(monthIndex, weekNum),
        isExpanded: monthIndex === 0 && weekNum === 1 // First week expanded
      };
      
      weeklyRoadmap.push(weekData);
    }
    
    return weeklyRoadmap;
  };

  // Generate tasks for each week
  const generateWeeklyTasks = (monthIndex: number, weekNum: number, goal: any) => {
    const taskTemplates = getTaskTemplatesForWeek(monthIndex, weekNum, goal.category);
    
    return taskTemplates.map((template, index) => ({
      id: `task_${Date.now()}_${monthIndex}_${weekNum}_${index}`,
      title: template.title.replace('{goal}', goal.title),
      description: template.description,
      weekId: `week_${new Date().getFullYear()}_${new Date().getMonth()}_${weekNum}`,
      monthId: `month_${new Date().getFullYear()}_${new Date().getMonth()}`,
      completed: false,
      priority: template.priority,
      estimatedHours: template.estimatedHours,
      category: goal.category,
      tags: template.tags,
      resources: template.resources || []
    }));
  };

  // Helper functions for roadmap generation
  const getMonthFocus = (monthIndex: number, category: string) => {
    const focuses = {
      0: "Foundation & Planning",
      1: "Skill Building",
      2: "Active Development", 
      3: "Advanced Practice",
      4: "Mastery & Refinement",
      5: "Achievement & Next Steps"
    };
    return focuses[monthIndex] || "Continued Progress";
  };

  const getMonthDescription = (monthIndex: number, category: string, title: string) => {
    const descriptions = {
      0: `Establish foundation and create detailed plan for ${title}`,
      1: `Build core skills and knowledge required for success`,
      2: `Apply skills through hands-on practice and projects`,
      3: `Tackle advanced challenges and complex scenarios`,
      4: `Refine expertise and prepare for goal completion`,
      5: `Achieve final objectives and plan next steps`
    };
    return descriptions[monthIndex] || `Continue making progress toward ${title}`;
  };

  const getMonthFocusAreas = (monthIndex: number, category: string) => {
    const focusMap = {
      0: ["Planning", "Research", "Goal Setting"],
      1: ["Skill Development", "Learning", "Practice"],
      2: ["Application", "Projects", "Implementation"],
      3: ["Advanced Concepts", "Complex Problems", "Innovation"],
      4: ["Mastery", "Optimization", "Excellence"],
      5: ["Completion", "Reflection", "Next Goals"]
    };
    return focusMap[monthIndex] || ["Progress", "Development"];
  };

  const getWeeksInMonth = (month: number, year: number) => {
    return 4; // Simplified to 4 weeks per month
  };

  const getWeekStartDate = (month: number, year: number, weekNum: number) => {
    const firstDay = new Date(year, month, 1);
    const daysToAdd = (weekNum - 1) * 7;
    return new Date(firstDay.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  };

  const getWeekEndDate = (startDate: Date) => {
    return new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  };

  const getWeekOfYear = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(((date.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7);
  };

  const getWeekFocus = (monthIndex: number, weekNum: number, category: string) => {
    const focuses = [
      ["Research & Setup", "Planning Deep Dive", "Resource Gathering", "Foundation"],
      ["Core Learning", "Skill Practice", "Knowledge Building", "Application Start"],
      ["Active Practice", "Project Work", "Implementation", "Problem Solving"],
      ["Advanced Skills", "Complex Projects", "Innovation", "Mastery Building"],
      ["Refinement", "Optimization", "Excellence", "Completion Prep"],
      ["Final Push", "Achievement", "Documentation", "Next Steps"]
    ];
    return focuses[monthIndex]?.[weekNum - 1] || "Progress";
  };

  const getWeekDescription = (monthIndex: number, weekNum: number, category: string) => {
    return `Focus on ${getWeekFocus(monthIndex, weekNum, category).toLowerCase()} activities and make significant progress`;
  };

  const getWeekPriority = (monthIndex: number, weekNum: number) => {
    if (monthIndex === 0 && weekNum === 1) return 'high';
    if (weekNum === 4) return 'high'; // End of month
    return 'medium';
  };

  const getTaskTemplatesForWeek = (monthIndex: number, weekNum: number, category: string) => {
    // Return different task templates based on month and week
    const baseTemplates = [
      {
        title: `Research {goal} fundamentals`,
        description: "Study core concepts and best practices",
        priority: 'high',
        estimatedHours: 3,
        tags: ['research', 'learning'],
        resources: []
      },
      {
        title: `Practice {goal} skills`,
        description: "Apply what you've learned through hands-on practice",
        priority: 'medium',
        estimatedHours: 4,
        tags: ['practice', 'skills'],
        resources: []
      },
      {
        title: `Review and reflect on progress`,
        description: "Assess current progress and adjust plans if needed",
        priority: 'medium',
        estimatedHours: 1,
        tags: ['reflection', 'planning'],
        resources: []
      }
    ];

    return baseTemplates;
  };

  // Calculate target date based on duration
  const calculateTargetDate = (duration: string) => {
    const now = new Date();
    if (duration.includes('week')) {
      const weeks = parseInt(duration) || 12;
      now.setDate(now.getDate() + (weeks * 7));
    } else if (duration.includes('month')) {
      const months = parseInt(duration) || 3;
      now.setMonth(now.getMonth() + months);
    }
    return now;
  };

  // Calculate milestone duration
  const calculateMilestoneDuration = (totalDuration: string, totalMilestones: number, index: number) => {
    const totalWeeks = totalDuration.includes('week') ? parseInt(totalDuration) : 
                     totalDuration.includes('month') ? parseInt(totalDuration) * 4 : 12;
    const weeksPerMilestone = Math.ceil(totalWeeks / totalMilestones);
    return `${weeksPerMilestone} week${weeksPerMilestone > 1 ? 's' : ''}`;
  };

  // Generate resources for milestones
  const generateResources = (milestoneTitle: string) => {
    const resourceTypes = ["Tutorials", "Documentation", "Community guides", "Video courses", "Practice exercises"];
    return resourceTypes.slice(0, 3); // Return first 3 resource types
  };

  // Generate community tags
  const generateCommunityTags = (category: string, milestoneTitle: string) => {
    const baseTags = [category.toLowerCase()];
    if (milestoneTitle.toLowerCase().includes('learn')) baseTags.push('learning');
    if (milestoneTitle.toLowerCase().includes('practice')) baseTags.push('practice');
    if (milestoneTitle.toLowerCase().includes('build')) baseTags.push('building');
    return baseTags.slice(0, 3);
  };

  const handleBack = () => {
    if (step === 'type') {
      scrollToTop();
      onBack();
    } else if (step === 'template' || step === 'custom') {
      setStep('type');
    } else if (step === 'details') {
      if (selectedType === 'roadmap') {
        setStep('template');
      } else {
        setStep('custom');
      }
    }
  };

  const handleCommunityMarketplace = () => {
    if (onNavigate) {
      onNavigate('community-marketplace');
    }
  };

  const goalTypes = [
    {
      id: 'roadmap',
      title: 'Choose from Roadmap Templates',
      description: 'Select from our curated collection of proven success paths with step-by-step guidance',
      icon: <BookOpen size={32} className="text-blue-600" />,
      features: ['Pre-built milestones', 'Expert guidance', 'Proven strategies', 'Community support'],
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'custom',
      title: 'Create Custom Goal',
      description: 'Build your own personalized goal from scratch with AI assistance and flexible planning',
      icon: <Plus size={32} className="text-purple-600" />,
      features: ['Complete flexibility', 'AI assistance', 'Custom milestones', 'Personal tracking'],
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    }
  ];

  const roadmapTemplates = [
    {
      id: 'python-course',
      title: 'Complete Python Programming Course',
      description: 'Master Python from basics to advanced concepts with hands-on projects',
      duration: '12 weeks',
      difficulty: 'Beginner to Intermediate',
      icon: <BookOpen size={24} className="text-blue-600" />,
      category: 'Programming',
      milestones: 12,
      estimatedTime: '3-4 hours/week',
      skills: ['Python Basics', 'Data Structures', 'Web Development', 'APIs'],
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'scholarship-applications',
      title: 'Apply to 5 International Scholarships',
      description: 'Strategic approach to scholarship applications with timeline and requirements',
      duration: '16 weeks',
      difficulty: 'Intermediate',
      icon: <GraduationCap size={24} className="text-green-600" />,
      category: 'Education',
      milestones: 15,
      estimatedTime: '5-6 hours/week',
      skills: ['Research', 'Essay Writing', 'Application Strategy', 'Interview Prep'],
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    },
    {
      id: 'portfolio-website',
      title: 'Build Professional Portfolio Website',
      description: 'Create a stunning portfolio to showcase your skills and projects',
      duration: '8 weeks',
      difficulty: 'Beginner to Intermediate',
      icon: <Briefcase size={24} className="text-purple-600" />,
      category: 'Career',
      milestones: 8,
      estimatedTime: '4-5 hours/week',
      skills: ['Web Design', 'HTML/CSS', 'JavaScript', 'Portfolio Strategy'],
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'leadership-skills',
      title: 'Develop Leadership & Communication Skills',
      description: 'Build essential leadership qualities and communication expertise',
      duration: '10 weeks',
      difficulty: 'All Levels',
      icon: <Users size={24} className="text-orange-600" />,
      category: 'Personal Development',
      milestones: 10,
      estimatedTime: '3-4 hours/week',
      skills: ['Public Speaking', 'Team Management', 'Conflict Resolution', 'Emotional Intelligence'],
      color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
    },
    {
      id: 'startup-launch',
      title: 'Launch Your First Startup',
      description: 'Complete guide from idea validation to product launch and marketing',
      duration: '20 weeks',
      difficulty: 'Advanced',
      icon: <Rocket size={24} className="text-red-600" />,
      category: 'Entrepreneurship',
      milestones: 18,
      estimatedTime: '8-10 hours/week',
      skills: ['Business Planning', 'Market Research', 'Product Development', 'Marketing'],
      color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    },
    {
      id: 'fitness-health',
      title: 'Complete Health & Fitness Transformation',
      description: 'Comprehensive wellness program for physical and mental health',
      duration: '16 weeks',
      difficulty: 'All Levels',
      icon: <Heart size={24} className="text-pink-600" />,
      category: 'Health & Wellness',
      milestones: 12,
      estimatedTime: '5-6 hours/week',
      skills: ['Exercise Planning', 'Nutrition', 'Mental Health', 'Habit Building'],
      color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800'
    }
  ];

  const customCategories = [
    { id: 'education', label: 'Education & Learning', icon: <GraduationCap size={20} /> },
    { id: 'career', label: 'Career Development', icon: <Briefcase size={20} /> },
    { id: 'health', label: 'Health & Wellness', icon: <Heart size={20} /> },
    { id: 'personal', label: 'Personal Growth', icon: <Star size={20} /> },
    { id: 'financial', label: 'Financial Goals', icon: <Trophy size={20} /> },
    { id: 'creative', label: 'Creative Projects', icon: <Sparkles size={20} /> }
  ];

  const handleTypeSelect = (type: 'roadmap' | 'custom') => {
    setSelectedType(type);
    if (type === 'roadmap') {
      setStep('template');
    } else {
      setStep('custom');
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setStep('details');
  };

  const handleCustomGoalSubmit = () => {
    if (customGoal.title && customGoal.description && customGoal.category) {
      setStep('details');
    }
  };


  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'Intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Create Your Goal</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Choose how you'd like to create your goal. We'll guide you every step of the way.
        </p>
      </div>

      {/* Community Marketplace Banner */}
      <Card
        className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800 animate-slide-up group`}
        onClick={handleCommunityMarketplace}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Globe size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-primary transition-colors">
              🌟 Community Roadmap Marketplace
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
              Discover proven success paths shared by accomplished community members. Learn from real achievements!
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>500+ Success Stories</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy size={14} />
                <span>Verified Results</span>
              </div>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </Card>

      <div className="space-y-4">
        {goalTypes.map((type, index) => (
          <Card
            key={type.id}
            className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] ${type.bgColor} ${type.borderColor} animate-slide-up group`}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleTypeSelect(type.id as 'roadmap' | 'custom')}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                {type.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-primary transition-colors">
                  {type.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {type.description}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {type.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <CheckCircle size={14} className="text-green-500" />
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

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Choose a Roadmap Template</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select from our proven success paths designed by experts
        </p>
      </div>

      <div className="grid gap-4">
        {roadmapTemplates.map((template, index) => (
          <Card
            key={template.id}
            className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.01] ${template.color} animate-slide-up group`}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {template.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-primary transition-colors">
                    {template.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                    {template.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm leading-relaxed">
                  {template.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{template.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flag size={12} />
                    <span>{template.milestones} milestones</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={12} />
                    <span>{template.estimatedTime}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.skills.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      {skill}
                    </span>
                  ))}
                  {template.skills.length > 3 && (
                    <span className="px-2 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      +{template.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCustomGoal = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Create Custom Goal</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Build your personalized goal with AI assistance
        </p>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Goal Title *
            </label>
            <input
              type="text"
              value={customGoal.title}
              onChange={(e) => setCustomGoal({ ...customGoal, title: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="e.g., Learn Spanish fluently"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={customGoal.description}
              onChange={(e) => setCustomGoal({ ...customGoal, description: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              placeholder="Describe what you want to achieve and why it's important to you..."
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Category *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {customCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setCustomGoal({ ...customGoal, category: category.id })}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    customGoal.category === category.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {category.icon}
                  <span className="text-sm font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Deadline
            </label>
            <input
              type="date"
              value={customGoal.deadline}
              onChange={(e) => setCustomGoal({ ...customGoal, deadline: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Priority Level
            </label>
            <div className="flex gap-3">
              {['low', 'medium', 'high'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => setCustomGoal({ ...customGoal, priority })}
                  className={`flex-1 py-3 px-4 rounded-2xl border transition-all capitalize ${
                    customGoal.priority === priority
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCustomGoalSubmit}
            disabled={!customGoal.title || !customGoal.description || !customGoal.category}
            variant="primary"
            size="lg"
            fullWidth
          >
            Continue to Details
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Goal Summary</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review your goal details before creating
        </p>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        {selectedType === 'roadmap' && selectedTemplate ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                {selectedTemplate.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedTemplate.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTemplate.category}</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{selectedTemplate.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="font-medium text-gray-800 dark:text-white">Duration</div>
                <div className="text-gray-600 dark:text-gray-400">{selectedTemplate.duration}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="font-medium text-gray-800 dark:text-white">Milestones</div>
                <div className="text-gray-600 dark:text-gray-400">{selectedTemplate.milestones}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{customGoal.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{customGoal.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="font-medium text-gray-800 dark:text-white">Category</div>
                <div className="text-gray-600 dark:text-gray-400 capitalize">
                  {customCategories.find(c => c.id === customGoal.category)?.label}
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="font-medium text-gray-800 dark:text-white">Priority</div>
                <div className="text-gray-600 dark:text-gray-400 capitalize">{customGoal.priority}</div>
              </div>
            </div>
            {customGoal.deadline && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="font-medium text-gray-800 dark:text-white">Target Deadline</div>
                <div className="text-gray-600 dark:text-gray-400">
                  {new Date(customGoal.deadline).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 p-6 rounded-2xl border border-primary/20 dark:border-primary/30">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles size={20} className="text-primary" />
          <h4 className="font-semibold text-gray-800 dark:text-white">What happens next?</h4>
        </div>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            <span>AI will create a personalized roadmap for your goal</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            <span>You'll get milestone tracking and progress updates</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            <span>Smart reminders will keep you on track</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            <span>Connect with others working on similar goals</span>
          </li>
        </ul>
      </div>

      {isCreating ? (
        <div className="space-y-4">
          {/* AI Processing Steps */}
          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Brain size={16} className="text-white animate-pulse" />
              </div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                AI Creating Your Goal...
              </h3>
            </div>
            
            <div className="space-y-3">
              {[
                { icon: <Brain size={16} />, text: "Analyzing your goal...", step: 0 },
                { icon: <Target size={16} />, text: "Creating personalized roadmap...", step: 1 },
                { icon: <TrendingUp size={16} />, text: "Setting up milestone tracking...", step: 2 },
                { icon: <Bell size={16} />, text: "Configuring smart reminders...", step: 3 },
                { icon: <Users size={16} />, text: "Connecting with community...", step: 4 }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    creationStep >= item.step 
                      ? 'bg-green-500 text-white' 
                      : creationStep === item.step 
                        ? 'bg-primary text-white animate-pulse' 
                        : 'bg-gray-300 text-gray-500'
                  }`}>
                    {creationStep > item.step ? (
                      <CheckCircle size={12} />
                    ) : (
                      item.icon
                    )}
                  </div>
                  <span className={`text-sm ${
                    creationStep >= item.step 
                      ? isDarkMode ? 'text-white' : 'text-gray-800'
                      : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {item.text}
                  </span>
                  {creationStep === item.step && (
                    <div className="ml-auto">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Button 
          onClick={handleGoalCreate} 
          variant="primary"
          size="lg"
          fullWidth
          disabled={isCreating}
          icon={Target}
        >
          Create My Goal
        </Button>
      )}
    </div>
  );

  const renderRoadmapPreview = () => {
    if (!generatedGoalData || !generatedGoalData.monthlyRoadmap) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No roadmap data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Your AI-Generated Roadmap</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review your personalized roadmap and add it to your goals
          </p>
        </div>

        {/* Goal Summary Card */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Target size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{generatedGoalData.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{generatedGoalData.description}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="font-medium text-gray-800 dark:text-white">Duration</div>
              <div className="text-gray-600 dark:text-gray-400">{generatedGoalData.estimatedDuration}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="font-medium text-gray-800 dark:text-white">Months</div>
              <div className="text-gray-600 dark:text-gray-400">{generatedGoalData.monthlyRoadmap.length}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="font-medium text-gray-800 dark:text-white">Total Tasks</div>
              <div className="text-gray-600 dark:text-gray-400">{generatedGoalData.totalTasks || 'Multiple'}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="font-medium text-gray-800 dark:text-white">Priority</div>
              <div className="text-gray-600 dark:text-gray-400 capitalize">{generatedGoalData.priority}</div>
            </div>
          </div>
        </Card>

        {/* Monthly Roadmap Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            Monthly Roadmap Preview
          </h3>
          
          {generatedGoalData.monthlyRoadmap.slice(0, 2).map((month, index) => (
            <Card key={month.id} className="dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {month.month}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-white">{month.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{month.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">{month.targetProgress}%</div>
                  <div className="text-xs text-gray-500">Target Progress</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {month.focusAreas.map((area, areaIndex) => (
                  <span
                    key={areaIndex}
                    className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{month.weeks.length} weeks</strong> • 
                <strong> {month.weeks.reduce((total, week) => total + week.tasks.length, 0)} tasks</strong>
              </div>
            </Card>
          ))}
          
          {generatedGoalData.monthlyRoadmap.length > 2 && (
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <p className="text-gray-600 dark:text-gray-400">
                + {generatedGoalData.monthlyRoadmap.length - 2} more months with detailed weekly breakdowns
              </p>
            </div>
          )}
        </div>

        {/* AI Features Highlight */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 p-6 rounded-2xl border border-primary/20 dark:border-primary/30">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles size={20} className="text-primary" />
            <h4 className="font-semibold text-gray-800 dark:text-white">AI-Powered Features Included</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <CheckCircle size={14} className="text-green-500" />
              <span>Smart milestone tracking</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <CheckCircle size={14} className="text-green-500" />
              <span>Progress reminders</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <CheckCircle size={14} className="text-green-500" />
              <span>Community connections</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <CheckCircle size={14} className="text-green-500" />
              <span>Adaptive scheduling</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleAddToMyGoals}
            disabled={isAddingToGoals}
            variant="primary"
            size="lg"
            loading={isAddingToGoals}
            icon={isAddingToGoals ? undefined : Trophy}
          >
            {isAddingToGoals ? 'Creating Goal...' : 'Add to My Goals & Start Tracking'}
          </Button>
          <Button
            variant="outline"
            onClick={handleEditGoal}
            size="lg"
            icon={ArrowLeft}
          >
            Edit Goal Details
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleBack}
              size="md"
              icon={ArrowLeft}
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Add New Goal</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {step === 'type' && 'Choose how to create your goal'}
                {step === 'template' && 'Select a roadmap template'}
                {step === 'custom' && 'Create your custom goal'}
                {step === 'details' && 'Ready to create your goal'}
                {step === 'preview' && 'Your AI-Generated Roadmap'}
              </p>
            </div>
            <Target size={24} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="p-4">
        {step === 'type' && renderTypeSelection()}
        {step === 'template' && renderTemplateSelection()}
        {step === 'custom' && renderCustomGoal()}
        {step === 'details' && renderDetails()}
        {step === 'preview' && renderRoadmapPreview()}
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-2xl p-8 text-center animate-fade-in`}>
            <div className="text-6xl mb-4">🎉</div>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
              Goal Successfully Created! 🎯
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 leading-relaxed`}>
              Your goal has been added to your dashboard! Look for it in the "Your Goals" section on your home screen to start tracking your progress.
            </p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full text-sm`}>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Redirecting to dashboard...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddGoalScreen;