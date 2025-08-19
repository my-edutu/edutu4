"use strict";
/**
 * Activity Tracking Routes - Firebase Functions Version
 * Handles user activity logging for the learning loop
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActivityRouter = createActivityRouter;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../utils/auth");
const firebase_1 = require("../utils/firebase");
function createActivityRouter() {
    const router = (0, express_1.Router)();
    /**
     * Log user activity
     * POST /api/activity/log
     */
    router.post('/log', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.body)('userId').isString().notEmpty().withMessage('User ID is required'),
        (0, express_validator_1.body)('action').isString().notEmpty().withMessage('Action is required'),
        (0, express_validator_1.body)('resourceType').isString().notEmpty().withMessage('Resource type is required'),
        (0, express_validator_1.body)('resourceId').optional().isString(),
        (0, express_validator_1.body)('metadata').optional().isObject(),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
            const activityId = await (0, firebase_1.logUserActivity)(activity);
            res.json({
                success: true,
                activityId,
                message: 'Activity logged successfully'
            });
        }
        catch (error) {
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
    router.get('/user/:userId', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.param)('userId').isString().notEmpty().withMessage('User ID is required'),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        (0, express_validator_1.query)('action').optional().isString(),
        (0, express_validator_1.query)('resourceType').optional().isString(),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { userId } = req.params;
            const { limit = '50', action, resourceType } = req.query;
            console.log(`Fetching activity history for user ${userId}`);
            const activities = await (0, firebase_1.getUserActivity)(userId, {
                limit: parseInt(limit),
                action: action,
                resourceType: resourceType,
            });
            res.json({
                success: true,
                activities,
                total: activities.length,
                filters: { action, resourceType, limit }
            });
        }
        catch (error) {
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
    router.get('/user/:userId/analytics', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.param)('userId').isString().notEmpty().withMessage('User ID is required'),
        (0, express_validator_1.query)('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { userId } = req.params;
            const { days = '30' } = req.query;
            console.log(`Generating activity analytics for user ${userId} (${days} days)`);
            const activities = await (0, firebase_1.getUserActivity)(userId, {
                limit: 1000,
                days: parseInt(days)
            });
            const analytics = generateActivityAnalytics(activities);
            res.json({
                success: true,
                analytics,
                period: `${days} days`,
                totalActivities: activities.length
            });
        }
        catch (error) {
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
function generateActivityAnalytics(activities) {
    var _a, _b, _c;
    const analytics = {
        totalActivities: activities.length,
        actionBreakdown: {},
        resourceTypeBreakdown: {},
        dailyActivity: {},
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
        .sort(([, a], [, b]) => b - a);
    analytics.trends.mostCommonAction = ((_a = sortedActions[0]) === null || _a === void 0 ? void 0 : _a[0]) || '';
    const sortedResources = Object.entries(analytics.resourceTypeBreakdown)
        .sort(([, a], [, b]) => b - a);
    analytics.trends.mostEngagedResource = ((_b = sortedResources[0]) === null || _b === void 0 ? void 0 : _b[0]) || '';
    const sortedDays = Object.entries(analytics.dailyActivity)
        .sort(([, a], [, b]) => b - a);
    analytics.trends.mostActiveDay = ((_c = sortedDays[0]) === null || _c === void 0 ? void 0 : _c[0]) || '';
    return analytics;
}
//# sourceMappingURL=activity.js.map