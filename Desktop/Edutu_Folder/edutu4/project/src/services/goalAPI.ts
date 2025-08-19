import { GoalsService } from './goalsService';
import { authService } from './authService';
import { auth } from '../config/firebase';
import { CreateGoalData, UserGoal } from '../types/goals';
import { SuccessStory } from '../types/successStory';
import { Opportunity } from '../types/common';
import { goalEvents } from '../utils/goalEvents';

// Unified Goal Creation API for consistent goal management across the entire app
export class GoalAPI {
  private goalsService: GoalsService;

  constructor() {
    this.goalsService = new GoalsService();
  }

  /**
   * Universal goal creation method that handles all goal types
   * Ensures consistent data structure and synchronization across the app
   */
  async createGoal(goalData: UnifiedGoalData): Promise<string | null> {
    try {
      console.log('🔍 Creating goal with data:', {
        source: goalData.source,
        title: goalData.title,
        category: goalData.category,
        hasMonthlyRoadmap: !!(goalData.monthlyRoadmap && goalData.monthlyRoadmap.length > 0),
        monthlyRoadmapLength: goalData.monthlyRoadmap?.length || 0
      });

      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        console.error('❌ Authentication error: No current user');
        throw new Error('User must be authenticated to create goals');
      }

      console.log('✅ User authenticated:', currentUser.uid);

      // Standardize goal data regardless of source
      const standardizedGoalData = this.standardizeGoalData(goalData);
      
      console.log('🔧 Standardized goal data:', {
        title: standardizedGoalData.title,
        category: standardizedGoalData.category,
        hasMonthlyRoadmap: !!(standardizedGoalData.monthlyRoadmap && standardizedGoalData.monthlyRoadmap.length > 0),
        targetDate: standardizedGoalData.targetDate,
        targetDateType: typeof standardizedGoalData.targetDate,
        targetDateValid: standardizedGoalData.targetDate instanceof Date ? !isNaN(standardizedGoalData.targetDate.getTime()) : 'not a date'
      });
      
      // Create goal with enhanced metadata
      const goalId = await this.goalsService.createGoal(currentUser.uid, standardizedGoalData);
      
      if (!goalId) {
        throw new Error('Failed to create goal - service returned null');
      }
      
      // Emit goal creation event for system-wide notifications
      try {
        goalEvents.emitGoalCreated(goalId, standardizedGoalData, currentUser.uid);
      } catch (eventError) {
        console.warn('⚠️ Failed to emit goal creation event (goal still created):', eventError);
      }
      
      // Log goal creation event for analytics
      console.log('✅ Goal created successfully:', {
        goalId,
        source: goalData.source,
        title: goalData.title,
        category: goalData.category,
        userId: currentUser.uid
      });
      
      // Verify goal was actually saved by attempting to fetch it
      try {
        const savedGoal = await this.goalsService.getGoalById(goalId, currentUser.uid);
        if (savedGoal) {
          console.log('✅ Goal verification successful - goal exists in database');
        } else {
          console.warn('⚠️ Goal verification failed - goal not found in database');
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify goal creation:', verifyError);
      }

      return goalId;
    } catch (error) {
      console.error('❌ Error creating goal:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        goalData: {
          source: goalData.source,
          title: goalData.title,
          category: goalData.category
        }
      });
      throw error;
    }
  }

  /**
   * Create goal from roadmap template (AddGoalScreen)
   */
  async createGoalFromTemplate(templateData: any, customData?: any): Promise<string | null> {
    const goalData: UnifiedGoalData = {
      source: 'template',
      title: templateData.title,
      description: templateData.description,
      category: templateData.category,
      difficulty: templateData.difficulty?.toLowerCase() || 'medium',
      priority: customData?.priority || 'medium',
      targetDate: customData?.targetDate || this.calculateDefaultTargetDate(templateData.duration),
      milestones: templateData.milestones || [],
      skills: templateData.skills || [],
      estimatedTime: templateData.estimatedTime || templateData.duration,
      
      // Template-specific data
      templateId: templateData.id,
      templateType: templateData.type,
      
      // AI features
      aiGenerated: true,
      remindersEnabled: true,
      communityEnabled: true,
      progressTracking: true,
      
      // Generated roadmap data
      monthlyRoadmap: customData?.monthlyRoadmap || [],
      timelineView: 'monthly',
      tasks: this.generateTasksFromTemplate(templateData),
      totalTasks: templateData.milestones?.length || 0
    };

    return await this.createGoal(goalData);
  }

  /**
   * Create goal from success story (SuccessStoryBlog)
   */
  async createGoalFromSuccessStory(story: SuccessStory): Promise<string | null> {
    const goalData: UnifiedGoalData = {
      source: 'success_story',
      title: `${story.opportunity.title} - Following ${story.person.name}'s Path`,
      description: `Get the ${story.opportunity.title} role by following the exact roadmap that helped ${story.person.name} achieve a ${story.metrics.successRate} success rate.`,
      category: story.opportunity.category?.toLowerCase() || 'career',
      difficulty: story.roadmap.difficulty.toLowerCase(),
      priority: 'high',
      targetDate: this.calculateTargetDateFromSteps(story.roadmap.steps),
      milestones: story.roadmap.steps.map((step, index) => ({
        title: step.title,
        description: step.description,
        order: index,
        completed: false,
        estimatedDuration: step.duration || '1 week'
      })),
      skills: story.roadmap.skills || [],
      estimatedTime: story.roadmap.duration,
      
      // Success story specific data
      successStoryId: story.id,
      mentorName: story.person.name,
      targetRole: story.opportunity.title,
      targetOrganization: story.opportunity.organization,
      successRate: story.metrics.successRate,
      opportunityId: story.opportunity.id,
      
      // Generate tasks from roadmap steps
      tasks: this.generateTasksFromSuccessStory(story),
      totalTasks: story.roadmap.steps.reduce((total, step) => 
        total + (step.milestones?.length || 1), 0
      ),
      
      // AI features
      aiGenerated: true,
      remindersEnabled: true,
      communityEnabled: true,
      progressTracking: true
    };

    return await this.createGoal(goalData);
  }

  /**
   * Create goal from personalized roadmap (PersonalizedRoadmap)
   */
  async createGoalFromPersonalizedRoadmap(roadmapData: any): Promise<string | null> {
    const goalData: UnifiedGoalData = {
      source: 'personalized_roadmap',
      title: roadmapData.title,
      description: roadmapData.description || `Personalized roadmap for ${roadmapData.title}`,
      category: roadmapData.category || 'skill',
      difficulty: roadmapData.difficulty || 'medium',
      priority: roadmapData.priority || 'medium',
      targetDate: roadmapData.targetDate || this.calculateDefaultTargetDate('3 months'),
      milestones: roadmapData.milestones || [],
      skills: roadmapData.skills || [],
      estimatedTime: roadmapData.estimatedTime || '3 months',
      
      // Roadmap specific data
      roadmapId: roadmapData.id,
      roadmapType: 'personalized',
      
      // Monthly roadmap structure (key for MonthlyWeeklyRoadmap component)
      monthlyRoadmap: roadmapData.monthlyRoadmap || [],
      timelineView: 'monthly',
      
      // Task tracking
      tasks: roadmapData.tasks || [],
      totalTasks: roadmapData.totalTasks || 0,
      
      // AI features
      aiGenerated: true,
      remindersEnabled: true,
      communityEnabled: true,
      progressTracking: true
    };

    return await this.createGoal(goalData);
  }

  /**
   * Create goal from opportunity (OpportunityRoadmap)
   */
  async createGoalFromOpportunity(opportunity: Opportunity, roadmapData?: any): Promise<string | null> {
    const goalData: UnifiedGoalData = {
      source: 'opportunity',
      title: `Apply for ${opportunity.title} at ${opportunity.organization}`,
      description: `Complete application process for ${opportunity.title} position`,
      category: 'application',
      difficulty: opportunity.difficulty?.toLowerCase() || 'medium',
      priority: 'high',
      targetDate: new Date(opportunity.deadline),
      milestones: roadmapData?.milestones || this.generateDefaultApplicationMilestones(opportunity),
      skills: opportunity.skills || [],
      estimatedTime: roadmapData?.estimatedTime || '4 weeks',
      
      // Opportunity specific data
      opportunityId: opportunity.id,
      organizationName: opportunity.organization,
      applicationDeadline: opportunity.deadline,
      salary: opportunity.salary,
      location: opportunity.location,
      
      // Application tracking
      tasks: roadmapData?.tasks || this.generateApplicationTasks(opportunity),
      totalTasks: roadmapData?.totalTasks || 8,
      
      // AI features
      aiGenerated: true,
      remindersEnabled: true,
      communityEnabled: true,
      progressTracking: true
    };

    return await this.createGoal(goalData);
  }

  /**
   * Create custom goal (custom goal creation)
   */
  async createCustomGoal(customData: any): Promise<string | null> {
    const goalData: UnifiedGoalData = {
      source: 'custom',
      title: customData.title,
      description: customData.description,
      category: customData.category,
      difficulty: customData.difficulty || 'medium',
      priority: customData.priority || 'medium',
      targetDate: customData.targetDate || this.calculateDefaultTargetDate('3 months'),
      milestones: customData.milestones || this.generateCustomMilestones(customData),
      skills: customData.skills || [],
      estimatedTime: customData.estimatedTime || 'Custom timeline',
      
      // Custom goal data
      isCustom: true,
      
      // AI features
      aiGenerated: true,
      remindersEnabled: true,
      communityEnabled: true,
      progressTracking: true,
      
      // Generated roadmap if available
      monthlyRoadmap: customData.monthlyRoadmap || [],
      timelineView: 'monthly'
    };

    return await this.createGoal(goalData);
  }

  /**
   * Standardize goal data to ensure consistency across all creation methods
   */
  private standardizeGoalData(goalData: UnifiedGoalData): CreateGoalData {
    // Create base data structure with only defined values
    const baseData: CreateGoalData = {
      title: goalData.title,
      description: goalData.description,
      category: goalData.category,
      type: goalData.type || 'medium_term',
      difficulty: goalData.difficulty || 'medium',
      priority: goalData.priority,
      targetDate: goalData.targetDate,
      milestones: goalData.milestones || [],
      tags: goalData.skills || [],
      
      // Extended data
      tasks: goalData.tasks || [],
      totalTasks: goalData.totalTasks || 0,
      estimatedTime: goalData.estimatedTime || '',
      skills: goalData.skills || [],
      
      // Monthly roadmap structure (essential for MonthlyWeeklyRoadmap component)
      monthlyRoadmap: goalData.monthlyRoadmap || [],
      timelineView: goalData.timelineView || 'monthly'
    };

    // Add optional fields only if they are defined
    const optionalFields = [
      'opportunityId', 'roadmapId', 'templateId', 'templateType', 
      'successStoryId', 'mentorName', 'targetRole', 'targetOrganization',
      'successRate', 'organizationName', 'applicationDeadline', 'salary',
      'location', 'roadmapType', 'isCustom', 'aiGenerated', 'remindersEnabled',
      'communityEnabled', 'progressTracking'
    ];

    optionalFields.forEach(field => {
      if (goalData[field] !== undefined) {
        (baseData as any)[field] = goalData[field];
      }
    });

    return baseData;
  }

  /**
   * Generate tasks from template data
   */
  private generateTasksFromTemplate(templateData: any): any[] {
    if (!templateData.milestones) return [];
    
    return templateData.milestones.map((milestone: any, index: number) => ({
      id: `template_task_${index}`,
      title: milestone.title || milestone,
      description: milestone.description || `Complete ${milestone.title || milestone}`,
      completed: false,
      category: templateData.category,
      estimatedHours: 3,
      priority: index < 2 ? 'high' : 'medium'
    }));
  }

  /**
   * Generate tasks from success story roadmap
   */
  private generateTasksFromSuccessStory(story: SuccessStory): any[] {
    return story.roadmap.steps.flatMap((step, stepIndex) => 
      step.milestones?.map((milestone, milestoneIndex) => ({
        id: `story_task_${stepIndex}_${milestoneIndex}`,
        title: milestone,
        description: `Complete this milestone for: ${step.title}`,
        completed: false,
        stepId: step.id,
        stepTitle: step.title,
        category: step.type,
        estimatedHours: 2,
        priority: stepIndex < 2 ? 'high' : 'medium'
      })) || [{
        id: `story_task_${stepIndex}_0`,
        title: step.title,
        description: step.description,
        completed: false,
        stepId: step.id,
        stepTitle: step.title,
        category: step.type,
        estimatedHours: 4,
        priority: stepIndex < 2 ? 'high' : 'medium'
      }]
    );
  }

  /**
   * Generate default application milestones for opportunities
   */
  private generateDefaultApplicationMilestones(opportunity: Opportunity): any[] {
    return [
      {
        title: 'Research Company & Role',
        description: `Research ${opportunity.organization} and the ${opportunity.title} position`,
        order: 0,
        completed: false,
        estimatedDuration: '3 days'
      },
      {
        title: 'Prepare Application Materials',
        description: 'Update CV/resume and write cover letter',
        order: 1,
        completed: false,
        estimatedDuration: '1 week'
      },
      {
        title: 'Submit Application',
        description: 'Complete and submit application through proper channels',
        order: 2,
        completed: false,
        estimatedDuration: '1 day'
      },
      {
        title: 'Prepare for Interview',
        description: 'Practice interview questions and prepare examples',
        order: 3,
        completed: false,
        estimatedDuration: '1 week'
      }
    ];
  }

  /**
   * Generate application tasks for opportunities
   */
  private generateApplicationTasks(opportunity: Opportunity): any[] {
    return [
      {
        id: 'app_task_1',
        title: `Research ${opportunity.organization}`,
        description: 'Research company culture, values, and recent news',
        completed: false,
        category: 'research',
        estimatedHours: 2,
        priority: 'high'
      },
      {
        id: 'app_task_2',
        title: 'Analyze job requirements',
        description: 'Study the job description and required skills',
        completed: false,
        category: 'research',
        estimatedHours: 1,
        priority: 'high'
      },
      {
        id: 'app_task_3',
        title: 'Update CV/Resume',
        description: 'Tailor your CV to highlight relevant experience',
        completed: false,
        category: 'preparation',
        estimatedHours: 3,
        priority: 'high'
      },
      {
        id: 'app_task_4',
        title: 'Write cover letter',
        description: 'Write a personalized cover letter for this position',
        completed: false,
        category: 'preparation',
        estimatedHours: 2,
        priority: 'medium'
      },
      {
        id: 'app_task_5',
        title: 'Prepare portfolio/samples',
        description: 'Prepare work samples relevant to the role',
        completed: false,
        category: 'preparation',
        estimatedHours: 4,
        priority: 'medium'
      },
      {
        id: 'app_task_6',
        title: 'Submit application',
        description: 'Complete application form and submit all materials',
        completed: false,
        category: 'application',
        estimatedHours: 1,
        priority: 'high'
      },
      {
        id: 'app_task_7',
        title: 'Follow up',
        description: 'Send follow-up email if needed after application',
        completed: false,
        category: 'application',
        estimatedHours: 0.5,
        priority: 'low'
      },
      {
        id: 'app_task_8',
        title: 'Prepare for interview',
        description: 'Practice common interview questions and scenarios',
        completed: false,
        category: 'interview',
        estimatedHours: 4,
        priority: 'medium'
      }
    ];
  }

  /**
   * Generate custom milestones for custom goals
   */
  private generateCustomMilestones(customData: any): any[] {
    return [
      {
        title: 'Research and Planning',
        description: `Research best practices and create a plan for: ${customData.title}`,
        order: 0,
        completed: false,
        estimatedDuration: '1 week'
      },
      {
        title: 'Foundation Building',
        description: 'Establish the basic skills and resources needed',
        order: 1,
        completed: false,
        estimatedDuration: '2 weeks'
      },
      {
        title: 'Active Progress',
        description: 'Make consistent progress toward your objective',
        order: 2,
        completed: false,
        estimatedDuration: '4-6 weeks'
      },
      {
        title: 'Goal Achievement',
        description: 'Complete your goal and reflect on lessons learned',
        order: 3,
        completed: false,
        estimatedDuration: '1 week'
      }
    ];
  }

  /**
   * Calculate target date from steps
   */
  private calculateTargetDateFromSteps(steps: any[]): Date {
    const weeksNeeded = steps.length;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (weeksNeeded * 7));
    return targetDate;
  }

  /**
   * Calculate default target date from duration string
   */
  private calculateDefaultTargetDate(duration: string): Date {
    const targetDate = new Date();
    
    if (duration.includes('month')) {
      const months = parseInt(duration) || 3;
      targetDate.setMonth(targetDate.getMonth() + months);
    } else if (duration.includes('week')) {
      const weeks = parseInt(duration) || 12;
      targetDate.setDate(targetDate.getDate() + (weeks * 7));
    } else if (duration.includes('day')) {
      const days = parseInt(duration) || 90;
      targetDate.setDate(targetDate.getDate() + days);
    } else {
      // Default to 3 months
      targetDate.setMonth(targetDate.getMonth() + 3);
    }
    
    return targetDate;
  }
}

// Unified goal data interface that covers all creation scenarios
export interface UnifiedGoalData {
  // Core goal data
  source: 'template' | 'success_story' | 'personalized_roadmap' | 'opportunity' | 'custom';
  title: string;
  description: string;
  category: string;
  difficulty?: string;
  priority: string;
  type?: string;
  targetDate?: Date;
  milestones?: any[];
  skills?: string[];
  estimatedTime?: string;

  // Task tracking
  tasks?: any[];
  totalTasks?: number;

  // Source-specific data
  templateId?: string;
  templateType?: string;
  successStoryId?: string;
  mentorName?: string;
  targetRole?: string;
  targetOrganization?: string;
  successRate?: string;
  opportunityId?: string;
  organizationName?: string;
  applicationDeadline?: string;
  salary?: string;
  location?: string;
  roadmapId?: string;
  roadmapType?: string;
  isCustom?: boolean;

  // AI features
  aiGenerated?: boolean;
  remindersEnabled?: boolean;
  communityEnabled?: boolean;
  progressTracking?: boolean;

  // Enhanced roadmap data
  monthlyRoadmap?: any[];
  timelineView?: string;

  // Additional metadata
  [key: string]: any;
}

// Export singleton instance
export const goalAPI = new GoalAPI();