/**
 * Activity Tracking Routes - Firebase Functions Version
 * Handles user activity logging for the learning loop
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { verifyFirebaseToken, requireOwnership } from '../utils/auth';
import { logUserActivity, getUserActivity } from '../utils/firebase';

export function createActivityRouter(): Router {
  const router = Router();

  /**
   * Log user activity
   * POST /api/activity/log
   */
  router.post('/log', verifyFirebaseToken, requireOwnership, [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('action').isString().notEmpty().withMessage('Action is required'),
    body('resourceType').isString().notEmpty().withMessage('Resource type is required'),
    body('resourceId').optional().isString(),
    body('metadata').optional().isObject(),
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId, action, resourceType, resourceId, metadata = {} } = req.body;

      console.log(`Logging activity: ${action} on ${resourceType} for user ${userId}`);

      const activity = {
        userId,
        action,
        resourceType,
        resourceId,
        metadata,
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('user-agent')
      };

      const activityId = await logUserActivity(activity);

      res.json({
        success: true,
        activityId,
        message: 'Activity logged successfully'
      });

    } catch (error: any) {
      console.error('Error logging activity:', error);
      res.status(500).json({
        error: 'Failed to log activity',
        message: error.message
      });
    }
  });

  /**
   * Get user activity history
   * GET /api/activity/user/:userId
   */
  router.get('/user/:userId', verifyFirebaseToken, requireOwnership, [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('action').optional().isString(),
    query('resourceType').optional().isString(),
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const { limit = '50', action, resourceType } = req.query;

      console.log(`Fetching activity history for user ${userId}`);

      const activities = await getUserActivity(userId, {
        limit: parseInt(limit as string),
        action: action as string,
        resourceType: resourceType as string,
      });

      res.json({
        success: true,
        activities,
        total: activities.length,
        filters: { action, resourceType, limit }
      });

    } catch (error: any) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({
        error: 'Failed to fetch user activity',
        message: error.message
      });
    }
  });

  /**
   * Get activity analytics for a user
   * GET /api/activity/user/:userId/analytics
   */
  router.get('/user/:userId/analytics', verifyFirebaseToken, requireOwnership, [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const { days = '30' } = req.query;

      console.log(`Generating activity analytics for user ${userId} (${days} days)`);

      const activities = await getUserActivity(userId, {
        limit: 1000,
        days: parseInt(days as string)
      });

      const analytics = generateActivityAnalytics(activities);

      res.json({
        success: true,
        analytics,
        period: `${days} days`,
        totalActivities: activities.length
      });

    } catch (error: any) {
      console.error('Error generating activity analytics:', error);
      res.status(500).json({
        error: 'Failed to generate activity analytics',
        message: error.message
      });
    }
  });

  return router;
}

/**
 * Generate analytics from user activities
 */
function generateActivityAnalytics(activities: any[]): any {
  const analytics = {
    totalActivities: activities.length,
    actionBreakdown: {} as Record<string, number>,
    resourceTypeBreakdown: {} as Record<string, number>,
    dailyActivity: {} as Record<string, number>,
    engagementScore: 0,
    trends: {
      mostActiveDay: '',
      mostCommonAction: '',
      mostEngagedResource: '',
    }
  };

  if (activities.length === 0) {
    return analytics;
  }

  // Count actions and resource types
  activities.forEach(activity => {
    // Action breakdown
    analytics.actionBreakdown[activity.action] = 
      (analytics.actionBreakdown[activity.action] || 0) + 1;

    // Resource type breakdown
    analytics.resourceTypeBreakdown[activity.resourceType] = 
      (analytics.resourceTypeBreakdown[activity.resourceType] || 0) + 1;

    // Daily activity (assuming timestamp is a Date or has toDate method)
    const date = activity.timestamp.toDate ? 
      activity.timestamp.toDate().toISOString().split('T')[0] :
      new Date(activity.timestamp).toISOString().split('T')[0];
    
    analytics.dailyActivity[date] = (analytics.dailyActivity[date] || 0) + 1;
  });

  // Calculate engagement score (simplified)
  const uniqueDays = Object.keys(analytics.dailyActivity).length;
  const avgDailyActivity = activities.length / Math.max(uniqueDays, 1);
  analytics.engagementScore = Math.min(100, Math.round(avgDailyActivity * 10));

  // Find trends
  const sortedActions = Object.entries(analytics.actionBreakdown)
    .sort(([,a], [,b]) => b - a);
  analytics.trends.mostCommonAction = sortedActions[0]?.[0] || '';

  const sortedResources = Object.entries(analytics.resourceTypeBreakdown)
    .sort(([,a], [,b]) => b - a);
  analytics.trends.mostEngagedResource = sortedResources[0]?.[0] || '';

  const sortedDays = Object.entries(analytics.dailyActivity)
    .sort(([,a], [,b]) => b - a);
  analytics.trends.mostActiveDay = sortedDays[0]?.[0] || '';

  return analytics;
}