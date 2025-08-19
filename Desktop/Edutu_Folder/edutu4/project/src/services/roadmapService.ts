// Enhanced Roadmap Service for API Integration
import { generateRoadmap, getUserRoadmaps, updateRoadmapProgress } from './apiService';

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  estimatedTime?: string;
  resources?: string[];
}

export interface RoadmapPhase {
  id: string;
  phase: string;
  duration: string;
  tasks: RoadmapTask[];
  milestones: string[];
  resources: string[];
}

export interface ApiRoadmap {
  id: string;
  title: string;
  description: string;
  timeline: string;
  phases: RoadmapPhase[];
  requirements: string[];
  tips: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

class RoadmapService {
  private cache: Map<string, ApiRoadmap> = new Map();
  
  /**
   * Generate a new roadmap from API
   */
  async generatePersonalizedRoadmap(
    options: {
      opportunityId?: string;
      goalTitle?: string;
      customPrompt?: string;
    }
  ): Promise<ApiRoadmap> {
    try {
      const response = await generateRoadmap(
        options.opportunityId,
        options.goalTitle,
        options.customPrompt
      );
      
      if (response.success && response.roadmap) {
        const roadmap = this.transformApiRoadmap(response.roadmap);
        this.cache.set(roadmap.id, roadmap);
        return roadmap;
      } else {
        throw new Error('Failed to generate roadmap');
      }
    } catch (error) {
      console.error('Error generating roadmap:', error);
      // Return a fallback roadmap
      return this.getFallbackRoadmap(options.goalTitle || 'Personal Development');
    }
  }
  
  /**
   * Get all user roadmaps
   */
  async getUserRoadmaps(): Promise<ApiRoadmap[]> {
    try {
      const response = await getUserRoadmaps();
      
      if (response.success && response.roadmaps) {
        const roadmaps = response.roadmaps.map(r => this.transformApiRoadmap(r));
        
        // Update cache
        roadmaps.forEach(roadmap => {
          this.cache.set(roadmap.id, roadmap);
        });
        
        return roadmaps;
      } else {
        throw new Error('Failed to fetch user roadmaps');
      }
    } catch (error) {
      console.error('Error fetching user roadmaps:', error);
      return this.getFallbackRoadmaps();
    }
  }
  
  /**
   * Update task completion status
   */
  async updateTaskProgress(
    roadmapId: string,
    taskId: string,
    completed: boolean
  ): Promise<boolean> {
    try {
      const response = await updateRoadmapProgress(roadmapId, taskId, completed);
      
      if (response.success) {
        // Update cache
        const cachedRoadmap = this.cache.get(roadmapId);
        if (cachedRoadmap) {
          this.updateCachedTask(cachedRoadmap, taskId, completed);
        }
        
        return true;
      } else {
        throw new Error('Failed to update task progress');
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
      
      // Update cache optimistically for better UX
      const cachedRoadmap = this.cache.get(roadmapId);
      if (cachedRoadmap) {
        this.updateCachedTask(cachedRoadmap, taskId, completed);
      }
      
      return false;
    }
  }
  
  /**
   * Get roadmap by ID (with caching)
   */
  getRoadmap(roadmapId: string): ApiRoadmap | null {
    return this.cache.get(roadmapId) || null;
  }
  
  /**
   * Calculate roadmap progress
   */
  calculateProgress(roadmap: ApiRoadmap): number {
    let totalTasks = 0;
    let completedTasks = 0;
    
    roadmap.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        totalTasks++;
        if (task.completed) {
          completedTasks++;
        }
      });
    });
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }
  
  private transformApiRoadmap(apiData: Record<string, unknown>): ApiRoadmap {
    return {
      id: (apiData.id as string) || `roadmap_${Date.now()}`,
      title: apiData.title as string,
      description: apiData.description as string,
      timeline: apiData.timeline as string,
      phases: (apiData.steps as unknown[])?.map((step: Record<string, unknown>, index: number) => ({
        id: `phase_${index}`,
        phase: step.phase as string,
        duration: step.duration as string,
        tasks: (step.tasks as string[])?.map((task: string, taskIndex: number) => ({
          id: `task_${index}_${taskIndex}`,
          title: task,
          description: task,
          completed: false,
          priority: 'medium' as const
        })) || [],
        milestones: (step.milestones as string[]) || [],
        resources: (step.resources as string[]) || []
      })) || [],
      requirements: (apiData.requirements as string[]) || [],
      tips: (apiData.tips as string[]) || [],
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  private updateCachedTask(roadmap: ApiRoadmap, taskId: string, completed: boolean): void {
    roadmap.phases.forEach(phase => {
      const task = phase.tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = completed;
        roadmap.progress = this.calculateProgress(roadmap);
        roadmap.updatedAt = new Date();
      }
    });
  }
  
  private getFallbackRoadmap(title: string): ApiRoadmap {
    return {
      id: `fallback_${Date.now()}`,
      title: `${title} Learning Path`,
      description: `A comprehensive roadmap to achieve your goal: ${title}`,
      timeline: '3-6 months',
      phases: [
        {
          id: 'phase_1',
          phase: 'Foundation Building',
          duration: '2-4 weeks',
          tasks: [
            {
              id: 'task_1_1',
              title: 'Define clear objectives',
              description: 'Set specific, measurable goals',
              completed: false,
              priority: 'high'
            },
            {
              id: 'task_1_2',
              title: 'Research requirements',
              description: 'Understand what skills and knowledge you need',
              completed: false,
              priority: 'high'
            }
          ],
          milestones: ['Goals defined', 'Requirements understood'],
          resources: ['Online research', 'Mentor guidance']
        },
        {
          id: 'phase_2',
          phase: 'Skill Development',
          duration: '6-8 weeks',
          tasks: [
            {
              id: 'task_2_1',
              title: 'Start learning core concepts',
              description: 'Begin with fundamental knowledge',
              completed: false,
              priority: 'high'
            },
            {
              id: 'task_2_2',
              title: 'Practice regularly',
              description: 'Apply what you learn through exercises',
              completed: false,
              priority: 'medium'
            }
          ],
          milestones: ['Core concepts learned', 'Practice routine established'],
          resources: ['Online courses', 'Practice exercises']
        },
        {
          id: 'phase_3',
          phase: 'Application & Growth',
          duration: '4-6 weeks',
          tasks: [
            {
              id: 'task_3_1',
              title: 'Work on projects',
              description: 'Apply skills to real-world projects',
              completed: false,
              priority: 'high'
            },
            {
              id: 'task_3_2',
              title: 'Seek feedback',
              description: 'Get input from mentors and peers',
              completed: false,
              priority: 'medium'
            }
          ],
          milestones: ['Project completed', 'Feedback incorporated'],
          resources: ['Project ideas', 'Community feedback']
        }
      ],
      requirements: ['Commitment to learning', 'Regular practice time'],
      tips: ['Stay consistent', 'Seek help when needed', 'Celebrate small wins'],
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  private getFallbackRoadmaps(): ApiRoadmap[] {
    return [
      this.getFallbackRoadmap('Python Programming'),
      this.getFallbackRoadmap('Web Development'),
      this.getFallbackRoadmap('Data Science')
    ];
  }
}

export const roadmapService = new RoadmapService();