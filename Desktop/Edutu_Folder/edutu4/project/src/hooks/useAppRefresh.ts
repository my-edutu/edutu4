import { useCallback } from 'react';
import { useGoals } from './useGoals';

/**
 * Hook for providing intelligent refresh functionality across the app
 * Attempts to refresh data without full page reload when possible
 */
export const useAppRefresh = () => {
  const { refreshGoals } = useGoals();

  const refreshCurrentScreen = useCallback(async (screenType?: string) => {
    console.log('🔄 Refreshing current screen data:', screenType);
    
    try {
      switch (screenType) {
        case 'dashboard':
          // For dashboard, refresh both goals and opportunities
          await refreshGoals();
          // Opportunities will be refreshed by the Dashboard component's refresh trigger
          console.log('✅ Dashboard data refreshed');
          break;
          
        case 'goals':
        case 'goals-page':
        case 'goal-roadmap-view':
        case 'animated-roadmap-view':
          // For goal-related screens, refresh goals only
          await refreshGoals();
          console.log('✅ Goals data refreshed');
          break;
          
        case 'opportunities':
        case 'all-opportunities':
        case 'opportunity-detail':
          // For opportunity screens, we'll need to trigger a refresh
          // This will be handled by the specific components
          console.log('✅ Opportunity refresh requested');
          break;
          
        default:
          // For unknown screens or critical errors, fall back to page refresh
          console.log('⚠️ Falling back to page refresh for screen:', screenType);
          window.location.reload();
          return;
      }
    } catch (error) {
      console.error('❌ Error during screen refresh:', error);
      // If data refresh fails, fall back to page refresh
      window.location.reload();
    }
  }, [refreshGoals]);

  const forcePageRefresh = useCallback(() => {
    console.log('🔄 Force refreshing entire page');
    window.location.reload();
  }, []);

  return {
    refreshCurrentScreen,
    forcePageRefresh
  };
};