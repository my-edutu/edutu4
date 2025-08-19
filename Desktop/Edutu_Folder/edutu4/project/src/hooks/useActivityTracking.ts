// React Hook for Activity Tracking Integration

import { useCallback, useEffect } from 'react';
import { userActivityService } from '../services/userActivityService';
import { useAuth } from './useAuth';
import { ActivityType, ActivityDetails } from '../types/userActivity';

export const useActivityTracking = () => {
  const { user } = useAuth();

  /**
   * Track a generic activity
   */
  const trackActivity = useCallback(async (
    activityType: ActivityType,
    details: ActivityDetails,
    metadata?: Record<string, any>
  ) => {
    if (!user?.uid) return;
    
    try {
      await userActivityService.trackActivity(user.uid, activityType, details, metadata);
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }, [user?.uid]);

  /**
   * Track opportunity interactions
   */
  const trackOpportunityView = useCallback(async (
    opportunityId: string,
    opportunityTitle: string,
    opportunityCategory: string,
    viewDuration?: number
  ) => {
    await trackActivity('opportunity_clicked', {
      opportunityId,
      opportunityTitle,
      opportunityCategory,
      clickDuration: viewDuration
    });
  }, [trackActivity]);

  const trackOpportunitySave = useCallback(async (
    opportunityId: string,
    opportunityTitle: string,
    opportunityCategory: string,
    saveReason?: string
  ) => {
    await trackActivity('opportunity_saved', {
      opportunityId,
      opportunityTitle,
      opportunityCategory,
      saveReason
    });
  }, [trackActivity]);

  const trackOpportunityIgnore = useCallback(async (
    opportunityId: string,
    opportunityTitle: string,
    opportunityCategory: string,
    ignoreReason?: string
  ) => {
    await trackActivity('opportunity_ignored', {
      opportunityId,
      opportunityTitle,
      opportunityCategory,
      ignoreReason
    });
  }, [trackActivity]);

  const trackOpportunityApplication = useCallback(async (
    opportunityId: string,
    opportunityTitle: string,
    opportunityCategory: string,
    applicationStatus: 'started' | 'completed' | 'abandoned'
  ) => {
    await trackActivity('opportunity_applied', {
      opportunityId,
      opportunityTitle,
      opportunityCategory,
      applicationStatus
    });
  }, [trackActivity]);

  /**
   * Track roadmap interactions
   */
  const trackTaskCompletion = useCallback(async (
    roadmapId: string,
    taskId: string,
    taskTitle: string,
    completionTime?: number,
    difficultyRating?: number
  ) => {
    await trackActivity('roadmap_task_completed', {
      roadmapId,
      taskId,
      taskTitle,
      completionTime,
      difficultyRating
    });
  }, [trackActivity]);

  const trackTaskDelay = useCallback(async (
    roadmapId: string,
    taskId: string,
    taskTitle: string,
    delayReason?: string
  ) => {
    await trackActivity('roadmap_task_delayed', {
      roadmapId,
      taskId,
      taskTitle,
      delayReason
    });
  }, [trackActivity]);

  const trackTaskSkip = useCallback(async (
    roadmapId: string,
    taskId: string,
    taskTitle: string
  ) => {
    await trackActivity('roadmap_task_skipped', {
      roadmapId,
      taskId,
      taskTitle
    });
  }, [trackActivity]);

  /**
   * Track chat interactions
   */
  const trackChatQuestion = useCallback(async (
    question: string,
    responseId?: string
  ) => {
    await trackActivity('chat_question_asked', {
      question,
      responseId
    });
  }, [trackActivity]);

  const trackChatRating = useCallback(async (
    responseId: string,
    rating: number,
    responseHelpfulness: 'very_helpful' | 'somewhat_helpful' | 'not_helpful'
  ) => {
    await trackActivity('chat_response_rated', {
      responseId,
      responseRating: rating,
      responseHelpfulness
    });
  }, [trackActivity]);

  /**
   * Track search and filter activities
   */
  const trackSearch = useCallback(async (
    searchQuery: string,
    searchResults: number
  ) => {
    await trackActivity('search_performed', {
      searchQuery,
      searchResults
    });
  }, [trackActivity]);

  const trackFilter = useCallback(async (
    filterType: string,
    filterValue: string
  ) => {
    await trackActivity('filter_applied', {
      filterType,
      filterValue
    });
  }, [trackActivity]);

  /**
   * Track goal activities
   */
  const trackGoalCreation = useCallback(async (
    goalId: string,
    goalType: string,
    goalCategory: string
  ) => {
    await trackActivity('goal_created', {
      goalId,
      goalType,
      goalCategory
    });
  }, [trackActivity]);

  const trackGoalCompletion = useCallback(async (
    goalId: string,
    goalType: string,
    goalCategory: string
  ) => {
    await trackActivity('goal_completed', {
      goalId,
      goalType,
      goalCategory
    });
  }, [trackActivity]);

  /**
   * Track feedback
   */
  const trackFeedback = useCallback(async (
    rating: number,
    comment?: string,
    suggestions?: string[]
  ) => {
    await trackActivity('feedback_provided', {
      rating,
      comment,
      suggestions
    });
  }, [trackActivity]);

  return {
    // Generic tracking
    trackActivity,
    
    // Opportunity tracking
    trackOpportunityView,
    trackOpportunitySave,
    trackOpportunityIgnore,
    trackOpportunityApplication,
    
    // Roadmap tracking
    trackTaskCompletion,
    trackTaskDelay,
    trackTaskSkip,
    
    // Chat tracking
    trackChatQuestion,
    trackChatRating,
    
    // Search tracking
    trackSearch,
    trackFilter,
    
    // Goal tracking
    trackGoalCreation,
    trackGoalCompletion,
    
    // Feedback tracking
    trackFeedback
  };
};

/**
 * Hook for tracking time spent on a page/component
 */
export const usePageTimeTracking = (pageName: string) => {
  const { trackActivity } = useActivityTracking();
  
  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      const timeSpent = Date.now() - startTime;
      trackActivity('profile_updated', {}, {
        pageName,
        timeSpent: Math.round(timeSpent / 1000) // seconds
      });
    };
  }, [pageName, trackActivity]);
};

/**
 * Hook for tracking element visibility (for engagement metrics)
 */
export const useVisibilityTracking = (elementId: string, onVisible?: () => void) => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible?.();
        }
      },
      { threshold: 0.5 } // Element is considered visible when 50% is in view
    );

    const element = document.getElementById(elementId);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [elementId, onVisible]);
};