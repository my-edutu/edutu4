import { useState, useCallback } from 'react';
import { goalAPI, UnifiedGoalData } from '../services/goalAPI';
import { SuccessStory } from '../types/successStory';
import { Opportunity } from '../types/common';

export interface UseGoalCreationReturn {
  // State
  isCreating: boolean;
  isSuccess: boolean;
  error: string | null;
  createdGoalId: string | null;

  // Universal creation methods
  createGoalFromTemplate: (templateData: any, customData?: any) => Promise<string | null>;
  createGoalFromSuccessStory: (story: SuccessStory) => Promise<string | null>;
  createGoalFromPersonalizedRoadmap: (roadmapData: any) => Promise<string | null>;
  createGoalFromOpportunity: (opportunity: Opportunity, roadmapData?: any) => Promise<string | null>;
  createCustomGoal: (customData: any) => Promise<string | null>;
  
  // Generic creation method
  createGoal: (goalData: UnifiedGoalData) => Promise<string | null>;
  
  // Utility methods
  resetState: () => void;
  clearError: () => void;
}

/**
 * Unified hook for goal creation across the entire Edutu app
 * Provides consistent interface and state management for all goal creation scenarios
 */
export const useGoalCreation = (): UseGoalCreationReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);

  // Reset all state
  const resetState = useCallback(() => {
    setIsCreating(false);
    setIsSuccess(false);
    setError(null);
    setCreatedGoalId(null);
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Generic goal creation with comprehensive error handling and state management
  const createGoal = useCallback(async (goalData: UnifiedGoalData): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);
      setIsSuccess(false);

      console.log('🚀 Creating goal:', {
        source: goalData.source,
        title: goalData.title,
        category: goalData.category
      });

      const goalId = await goalAPI.createGoal(goalData);

      if (goalId) {
        setCreatedGoalId(goalId);
        setIsSuccess(true);
        
        // Success feedback
        console.log('✅ Goal created successfully:', goalId);
        
        // Auto-reset success state after 3 seconds
        setTimeout(() => {
          setIsSuccess(false);
        }, 3000);

        return goalId;
      } else {
        throw new Error('Failed to create goal - no ID returned');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal';
      setError(errorMessage);
      console.error('❌ Goal creation failed:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Create goal from template (AddGoalScreen)
  const createGoalFromTemplate = useCallback(async (
    templateData: any, 
    customData?: any
  ): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);
      
      console.log('🎯 Creating goal from template:', templateData.title);
      
      const goalId = await goalAPI.createGoalFromTemplate(templateData, customData);
      
      if (goalId) {
        setCreatedGoalId(goalId);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
        return goalId;
      } else {
        throw new Error('Failed to create goal from template');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal from template';
      setError(errorMessage);
      console.error('❌ Template goal creation failed:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Create goal from success story (SuccessStoryBlog)
  const createGoalFromSuccessStory = useCallback(async (story: SuccessStory): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);
      
      console.log('👨‍💼 Creating goal from success story:', story.person.name);
      
      const goalId = await goalAPI.createGoalFromSuccessStory(story);
      
      if (goalId) {
        setCreatedGoalId(goalId);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
        return goalId;
      } else {
        throw new Error('Failed to create goal from success story');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal from success story';
      setError(errorMessage);
      console.error('❌ Success story goal creation failed:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Create goal from personalized roadmap (PersonalizedRoadmap)
  const createGoalFromPersonalizedRoadmap = useCallback(async (roadmapData: any): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);
      
      console.log('🛣️ Creating goal from personalized roadmap:', roadmapData.title);
      
      const goalId = await goalAPI.createGoalFromPersonalizedRoadmap(roadmapData);
      
      if (goalId) {
        setCreatedGoalId(goalId);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
        return goalId;
      } else {
        throw new Error('Failed to create goal from roadmap');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal from roadmap';
      setError(errorMessage);
      console.error('❌ Roadmap goal creation failed:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Create goal from opportunity (OpportunityRoadmap)
  const createGoalFromOpportunity = useCallback(async (
    opportunity: Opportunity, 
    roadmapData?: any
  ): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);
      
      console.log('💼 Creating goal from opportunity:', opportunity.title);
      
      const goalId = await goalAPI.createGoalFromOpportunity(opportunity, roadmapData);
      
      if (goalId) {
        setCreatedGoalId(goalId);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
        return goalId;
      } else {
        throw new Error('Failed to create goal from opportunity');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal from opportunity';
      setError(errorMessage);
      console.error('❌ Opportunity goal creation failed:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Create custom goal (custom goal creation)
  const createCustomGoal = useCallback(async (customData: any): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);
      
      console.log('⚡ Creating custom goal:', customData.title);
      
      const goalId = await goalAPI.createCustomGoal(customData);
      
      if (goalId) {
        setCreatedGoalId(goalId);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
        return goalId;
      } else {
        throw new Error('Failed to create custom goal');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create custom goal';
      setError(errorMessage);
      console.error('❌ Custom goal creation failed:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    // State
    isCreating,
    isSuccess,
    error,
    createdGoalId,

    // Creation methods
    createGoalFromTemplate,
    createGoalFromSuccessStory,
    createGoalFromPersonalizedRoadmap,
    createGoalFromOpportunity,
    createCustomGoal,
    createGoal,

    // Utility methods
    resetState,
    clearError
  };
};

// Hook for components that need to show unified goal creation feedback
export const useGoalCreationFeedback = () => {
  const { isCreating, isSuccess, error, resetState, clearError } = useGoalCreation();

  return {
    isCreating,
    isSuccess,
    error,
    resetState,
    clearError,
    
    // Helper methods for UI feedback
    getStatusMessage: () => {
      if (isCreating) return 'Creating your goal...';
      if (isSuccess) return 'Goal created successfully!';
      if (error) return `Error: ${error}`;
      return null;
    },
    
    getStatusColor: () => {
      if (isCreating) return 'blue';
      if (isSuccess) return 'green';
      if (error) return 'red';
      return 'gray';
    }
  };
};