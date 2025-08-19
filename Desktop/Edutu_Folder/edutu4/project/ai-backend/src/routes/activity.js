/**
 * Activity Tracking API Routes
 * Handles user activity tracking for the learning loop system
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { 
  trackUserActivity,
  getUserActivityHistory,
  getActivityAnalytics,
  getRecommendationFeedback,
} = require('../config/firebase');
const { verifyFirebaseToken, requireOwnership, rateLimitByUser } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Track user activity
 * POST /api/activity/track
 */
router.post('/track', verifyFirebaseToken, rateLimitByUser(60000, 50), [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('activityType').isIn([
    'opportunity_clicked',
    'opportunity_saved',
    'opportunity_ignored',
    'opportunity_applied',
    'roadmap_task_completed',
    'roadmap_task_delayed',
    'roadmap_task_skipped',
    'chat_question_asked',
    'chat_response_rated',
    'search_performed',
    'filter_applied',
    'goal_created',
    'goal_completed',
    'feedback_provided',
    'profile_updated'
  ]).withMessage('Invalid activity type'),
  body('details').isObject().withMessage('Activity details must be an object'),
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

    const { userId, activityType, details, metadata = {} } = req.body;

    logger.debug(`Tracking activity: ${activityType} for user ${userId}`);

    // Add tracking metadata
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
      userAgent: req.get('user-agent'),
      ip: req.ip,
    };

    // Save activity to Firestore
    const activityId = await trackUserActivity(userId, activityType, details, enrichedMetadata);

    // Trigger learning loop updates if needed
    await triggerLearningLoop(userId, activityType, details);

    logger.debug(`Activity tracked: ${activityId} for user ${userId}`);

    res.json({
      success: true,
      activityId,
      message: 'Activity tracked successfully'
    });

  } catch (error) {
    logger.error('Error tracking activity:', error);
    res.status(500).json({
      error: 'Failed to track activity',
      message: error.message
    });
  }
});

/**
 * Get user activity history
 * GET /api/activity/user/:userId/history
 */
router.get('/user/:userId/history', verifyFirebaseToken, requireOwnership, [
  param('userId').isString().notEmpty().withMessage('User ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('activityType').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
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
    const {
      limit = 50,
      activityType,
      startDate,
      endDate
    } = req.query;

    logger.debug(`Fetching activity history for user ${userId}`);

    const filters = {
      limit: parseInt(limit),
      activityType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    const activities = await getUserActivityHistory(userId, filters);

    res.json({
      success: true,
      activities,
      total: activities.length,
      filters
    });

  } catch (error) {
    logger.error('Error fetching activity history:', error);
    res.status(500).json({
      error: 'Failed to fetch activity history',
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
  query('timeframe').optional().isIn(['day', 'week', 'month', 'year']),
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
    const { timeframe = 'month' } = req.query;

    logger.debug(`Generating activity analytics for user ${userId}`);

    const analytics = await getActivityAnalytics(userId, timeframe);

    res.json({
      success: true,
      analytics,
      timeframe,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating activity analytics:', error);
    res.status(500).json({
      error: 'Failed to generate analytics',
      message: error.message
    });
  }
});

/**
 * Provide feedback on recommendations
 * POST /api/activity/feedback/recommendation
 */
router.post('/feedback/recommendation', verifyFirebaseToken, requireOwnership, [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('recommendationId').isString().notEmpty().withMessage('Recommendation ID is required'),
  body('feedback').isIn(['helpful', 'somewhat_helpful', 'not_helpful']).withMessage('Invalid feedback value'),
  body('comment').optional().isString().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, recommendationId, feedback, comment } = req.body;

    logger.info(`Received recommendation feedback from user ${userId}`);

    // Track the feedback as an activity
    await trackUserActivity(userId, 'feedback_provided', {
      recommendationId,
      feedback,
      comment,
      type: 'recommendation_feedback'
    });

    // Store feedback for learning loop
    await storeRecommendationFeedback(userId, recommendationId, feedback, comment);

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    logger.error('Error recording feedback:', error);
    res.status(500).json({
      error: 'Failed to record feedback',
      message: error.message
    });
  }
});

/**
 * Get aggregated activity statistics
 * GET /api/activity/stats
 */
router.get('/stats', async (req, res) => {
  try {
    logger.debug('Fetching aggregated activity statistics');

    const { getFirestore } = require('../config/firebase');
    const db = getFirestore();

    // Get activity counts by type
    const activityStats = await db.collection('userActivity')
      .aggregate({
        count: db.FieldValue.aggregate.count()
      }).get();

    // Get user engagement metrics
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivities = await db.collection('userActivity')
      .where('timestamp', '>=', oneWeekAgo)
      .aggregate({
        count: db.FieldValue.aggregate.count()
      }).get();

    const stats = {
      totalActivities: activityStats.data().count,
      weeklyActivities: recentActivities.data().count,
      averageDailyActivities: Math.round(recentActivities.data().count / 7),
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error fetching activity stats:', error);
    res.status(500).json({
      error: 'Failed to fetch activity statistics',
      message: error.message
    });
  }
});

/**
 * Helper function to trigger learning loop updates
 */
async function triggerLearningLoop(userId, activityType, details) {
  try {
    // Import learning pipeline service
    const { processUserActivity } = require('../services/learningPipeline');
    
    // Process the activity for learning improvements
    await processUserActivity(userId, activityType, details);
    
    logger.debug(`Learning loop triggered for user ${userId}`);
  } catch (error) {
    logger.error('Error triggering learning loop:', error);
    // Don't throw - learning loop failures shouldn't block activity tracking
  }
}

/**
 * Helper function to store recommendation feedback
 */
async function storeRecommendationFeedback(userId, recommendationId, feedback, comment) {
  try {
    const { getFirestore } = require('../config/firebase');
    const db = getFirestore();

    await db.collection('recommendationFeedback').add({
      userId,
      recommendationId,
      feedback,
      comment,
      timestamp: new Date(),
      processed: false // Flag for learning loop processing
    });

    logger.debug(`Stored recommendation feedback for user ${userId}`);
  } catch (error) {
    logger.error('Error storing recommendation feedback:', error);
    throw error;
  }
}

module.exports = router;