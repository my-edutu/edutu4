"use strict";
/**
 * Admin Dashboard API Routes
 * Administrative functions for the Edutu Goals System
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminRouter = createAdminRouter;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../utils/auth");
const admin = __importStar(require("firebase-admin"));
const goalsFirebase_1 = require("../utils/goalsFirebase");
// Admin role verification middleware
async function requireAdminRole(req, res, next) {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Check if user has admin role in custom claims
        const userRecord = await admin.auth().getUser(userId);
        const customClaims = userRecord.customClaims;
        if (!(customClaims === null || customClaims === void 0 ? void 0 : customClaims.admin) && !(customClaims === null || customClaims === void 0 ? void 0 : customClaims.moderator)) {
            return res.status(403).json({
                error: 'Admin or moderator privileges required',
                userRole: (customClaims === null || customClaims === void 0 ? void 0 : customClaims.role) || 'user'
            });
        }
        req.admin = {
            userId,
            role: customClaims.admin ? 'admin' : 'moderator',
            permissions: customClaims.permissions || []
        };
        next();
    }
    catch (error) {
        console.error('Error verifying admin role:', error);
        res.status(500).json({ error: 'Failed to verify admin privileges' });
    }
}
function createAdminRouter() {
    const router = (0, express_1.Router)();
    // Apply authentication and admin role verification to all routes
    router.use(auth_1.verifyFirebaseToken);
    router.use(requireAdminRole);
    // =============================================================================
    // MODERATION QUEUE ENDPOINTS
    // =============================================================================
    /**
     * GET /api/admin/moderation/queue
     * Get moderation queue items
     */
    router.get('/moderation/queue', [
        (0, express_validator_1.query)('status').optional().isIn(['pending', 'in_review', 'resolved']),
        (0, express_validator_1.query)('type').optional().isIn(['goal_submission', 'flag_report', 'user_report']),
        (0, express_validator_1.query)('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
        (0, express_validator_1.query)('assignedTo').optional().isString(),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 })
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { status, type, priority, assignedTo, limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 50;
            const queueItems = await (0, goalsFirebase_1.getModerationQueue)(status, type, limitNum);
            // Filter by additional criteria
            let filteredItems = queueItems;
            if (priority) {
                filteredItems = filteredItems.filter(item => item.priority === priority);
            }
            if (assignedTo) {
                filteredItems = filteredItems.filter(item => item.assignedTo === assignedTo);
            }
            res.json({
                success: true,
                queueItems: filteredItems,
                total: filteredItems.length,
                filters: { status, type, priority, assignedTo, limit }
            });
        }
        catch (error) {
            console.error('Error fetching moderation queue:', error);
            res.status(500).json({
                error: 'Failed to fetch moderation queue',
                message: error.message
            });
        }
    });
    /**
     * GET /api/admin/moderation/queue/stats
     * Get moderation queue statistics
     */
    router.get('/moderation/queue/stats', async (req, res) => {
        try {
            const db = admin.firestore();
            const [pendingSnapshot, inReviewSnapshot, resolvedTodaySnapshot, urgentSnapshot] = await Promise.all([
                db.collection('adminModerationQueue').where('status', '==', 'pending').count().get(),
                db.collection('adminModerationQueue').where('status', '==', 'in_review').count().get(),
                db.collection('adminModerationQueue')
                    .where('status', '==', 'resolved')
                    .where('resolvedAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
                    .count().get(),
                db.collection('adminModerationQueue').where('priority', '==', 'urgent').where('status', '!=', 'resolved').count().get()
            ]);
            const stats = {
                pending: pendingSnapshot.data().count,
                inReview: inReviewSnapshot.data().count,
                resolvedToday: resolvedTodaySnapshot.data().count,
                urgent: urgentSnapshot.data().count,
                totalActive: pendingSnapshot.data().count + inReviewSnapshot.data().count
            };
            res.json({
                success: true,
                stats
            });
        }
        catch (error) {
            console.error('Error fetching queue stats:', error);
            res.status(500).json({
                error: 'Failed to fetch queue statistics',
                message: error.message
            });
        }
    });
    /**
     * PUT /api/admin/moderation/queue/:queueId/assign
     * Assign moderation item to admin
     */
    router.put('/moderation/queue/:queueId/assign', [
        (0, express_validator_1.param)('queueId').isString().notEmpty(),
        (0, express_validator_1.body)('assignedTo').optional().isString()
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { queueId } = req.params;
            const assignedTo = req.body.assignedTo || req.admin.userId;
            const db = admin.firestore();
            await db.collection('adminModerationQueue').doc(queueId).update({
                assignedTo,
                status: 'in_review',
                updatedAt: new Date()
            });
            res.json({
                success: true,
                message: 'Moderation item assigned successfully'
            });
        }
        catch (error) {
            console.error('Error assigning moderation item:', error);
            res.status(500).json({
                error: 'Failed to assign moderation item',
                message: error.message
            });
        }
    });
    /**
     * POST /api/admin/moderation/goals/:goalId/moderate
     * Moderate a marketplace goal
     */
    router.post('/moderation/goals/:goalId/moderate', [
        (0, express_validator_1.param)('goalId').isString().notEmpty(),
        (0, express_validator_1.body)('queueId').isString().notEmpty(),
        (0, express_validator_1.body)('action').isIn(['approve', 'reject', 'archive', 'feature', 'unfeature']),
        (0, express_validator_1.body)('reason').optional().isString(),
        (0, express_validator_1.body)('notes').optional().isString(),
        (0, express_validator_1.body)('featuredUntil').optional().isISO8601()
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { goalId } = req.params;
            const { queueId, action, reason, notes, featuredUntil } = req.body;
            const adminId = req.admin.userId;
            const moderationRequest = {
                action,
                reason,
                notes,
                featuredUntil: featuredUntil ? new Date(featuredUntil) : undefined
            };
            await (0, goalsFirebase_1.moderateGoal)(queueId, goalId, adminId, moderationRequest);
            res.json({
                success: true,
                message: `Goal ${action}d successfully`
            });
        }
        catch (error) {
            console.error('Error moderating goal:', error);
            res.status(500).json({
                error: 'Failed to moderate goal',
                message: error.message
            });
        }
    });
    // =============================================================================
    // ANALYTICS AND REPORTING ENDPOINTS
    // =============================================================================
    /**
     * GET /api/admin/analytics/overview
     * Get system analytics overview
     */
    router.get('/analytics/overview', [
        (0, express_validator_1.query)('days').optional().isInt({ min: 1, max: 365 })
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const days = req.query.days ? parseInt(req.query.days) : 30;
            const analytics = await (0, goalsFirebase_1.getSystemAnalytics)(days);
            // Calculate aggregated metrics
            const aggregated = {
                totalUsers: analytics.length > 0 ? analytics[0].metrics.totalUsers : 0,
                totalGoalsCreated: analytics.reduce((sum, a) => sum + a.metrics.goalsCreated, 0),
                totalGoalsCompleted: analytics.reduce((sum, a) => sum + a.metrics.goalsCompleted, 0),
                averageCompletionRate: analytics.length > 0
                    ? analytics.reduce((sum, a) => sum + a.metrics.averageCompletionRate, 0) / analytics.length
                    : 0,
                marketplaceSubmissions: analytics.reduce((sum, a) => sum + a.metrics.marketplaceSubmissions, 0),
                marketplaceApprovals: analytics.reduce((sum, a) => sum + a.metrics.marketplaceApprovals, 0),
                approvalRate: 0
            };
            if (aggregated.marketplaceSubmissions > 0) {
                aggregated.approvalRate = (aggregated.marketplaceApprovals / aggregated.marketplaceSubmissions) * 100;
            }
            res.json({
                success: true,
                overview: aggregated,
                dailyData: analytics,
                period: { days, from: new Date(Date.now() - days * 24 * 60 * 60 * 1000), to: new Date() }
            });
        }
        catch (error) {
            console.error('Error fetching analytics overview:', error);
            res.status(500).json({
                error: 'Failed to fetch analytics overview',
                message: error.message
            });
        }
    });
    /**
     * GET /api/admin/analytics/goals
     * Get goal-specific analytics
     */
    router.get('/analytics/goals', [
        (0, express_validator_1.query)('category').optional().isString(),
        (0, express_validator_1.query)('period').optional().isIn(['7d', '30d', '90d', '1y'])
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { category, period } = req.query;
            const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
            const db = admin.firestore();
            let query = db.collection('userGoals')
                .where('createdAt', '>', new Date(Date.now() - days * 24 * 60 * 60 * 1000));
            if (category) {
                query = query.where('category', '==', category);
            }
            const snapshot = await query.get();
            const goals = snapshot.docs.map(doc => doc.data());
            // Calculate analytics
            const analytics = {
                totalGoals: goals.length,
                completedGoals: goals.filter(g => g.status === 'completed').length,
                activeGoals: goals.filter(g => g.status === 'active').length,
                pausedGoals: goals.filter(g => g.status === 'paused').length,
                abandonedGoals: goals.filter(g => g.status === 'abandoned').length,
                averageProgress: goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length || 0,
                categoryBreakdown: {},
                difficultyBreakdown: {},
                sourceTypeBreakdown: {}
            };
            // Category breakdown
            const categories = goals.reduce((acc, goal) => {
                acc[goal.category] = (acc[goal.category] || 0) + 1;
                return acc;
            }, {});
            analytics.categoryBreakdown = categories;
            // Difficulty breakdown
            const difficulties = goals.reduce((acc, goal) => {
                acc[goal.difficulty] = (acc[goal.difficulty] || 0) + 1;
                return acc;
            }, {});
            analytics.difficultyBreakdown = difficulties;
            // Source type breakdown
            const sourceTypes = goals.reduce((acc, goal) => {
                acc[goal.sourceType] = (acc[goal.sourceType] || 0) + 1;
                return acc;
            }, {});
            analytics.sourceTypeBreakdown = sourceTypes;
            res.json({
                success: true,
                analytics,
                filters: { category, period }
            });
        }
        catch (error) {
            console.error('Error fetching goal analytics:', error);
            res.status(500).json({
                error: 'Failed to fetch goal analytics',
                message: error.message
            });
        }
    });
    /**
     * GET /api/admin/analytics/users
     * Get user engagement analytics
     */
    router.get('/analytics/users', [
        (0, express_validator_1.query)('period').optional().isIn(['7d', '30d', '90d']),
        (0, express_validator_1.query)('metric').optional().isIn(['engagement', 'retention', 'activity'])
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { period, metric } = req.query;
            const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
            const db = admin.firestore();
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const [totalUsersSnapshot, activeUsersSnapshot, newUsersSnapshot] = await Promise.all([
                db.collection('users').count().get(),
                db.collection('userGoals')
                    .where('updatedAt', '>', cutoffDate)
                    .get(),
                db.collection('users')
                    .where('createdAt', '>', cutoffDate)
                    .count().get()
            ]);
            // Get unique active users
            const activeUsers = new Set();
            activeUsersSnapshot.docs.forEach(doc => {
                activeUsers.add(doc.data().userId);
            });
            const userAnalytics = {
                totalUsers: totalUsersSnapshot.data().count,
                activeUsers: activeUsers.size,
                newUsers: newUsersSnapshot.data().count,
                engagementRate: totalUsersSnapshot.data().count > 0
                    ? (activeUsers.size / totalUsersSnapshot.data().count) * 100
                    : 0,
                period: `${days} days`
            };
            res.json({
                success: true,
                userAnalytics,
                filters: { period, metric }
            });
        }
        catch (error) {
            console.error('Error fetching user analytics:', error);
            res.status(500).json({
                error: 'Failed to fetch user analytics',
                message: error.message
            });
        }
    });
    /**
     * POST /api/admin/analytics/generate
     * Manually trigger analytics generation
     */
    router.post('/analytics/generate', async (req, res) => {
        try {
            await (0, goalsFirebase_1.generateDailyAnalytics)();
            res.json({
                success: true,
                message: 'Daily analytics generated successfully'
            });
        }
        catch (error) {
            console.error('Error generating analytics:', error);
            res.status(500).json({
                error: 'Failed to generate analytics',
                message: error.message
            });
        }
    });
    // =============================================================================
    // USER MANAGEMENT ENDPOINTS
    // =============================================================================
    /**
     * GET /api/admin/users
     * Get user list with filters
     */
    router.get('/users', [
        (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive', 'banned']),
        (0, express_validator_1.query)('role').optional().isIn(['user', 'moderator', 'admin']),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
        (0, express_validator_1.query)('search').optional().isString()
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { status, role, limit, search } = req.query;
            const limitNum = limit ? parseInt(limit) : 50;
            const db = admin.firestore();
            let query = db.collection('users').limit(limitNum);
            if (status) {
                query = query.where('status', '==', status);
            }
            const snapshot = await query.get();
            let users = snapshot.docs.map(doc => {
                var _a, _b;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), lastLoginAt: (_b = data.lastLoginAt) === null || _b === void 0 ? void 0 : _b.toDate() });
            });
            // Apply additional filters
            if (search) {
                const searchLower = search.toString().toLowerCase();
                users = users.filter((user) => {
                    var _a, _b;
                    return ((_a = user.email) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
                        ((_b = user.displayName) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower));
                });
            }
            res.json({
                success: true,
                users,
                total: users.length,
                filters: { status, role, limit, search }
            });
        }
        catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                error: 'Failed to fetch users',
                message: error.message
            });
        }
    });
    /**
     * PUT /api/admin/users/:userId/role
     * Update user role and permissions
     */
    router.put('/users/:userId/role', [
        (0, express_validator_1.param)('userId').isString().notEmpty(),
        (0, express_validator_1.body)('role').isIn(['user', 'moderator', 'admin']),
        (0, express_validator_1.body)('permissions').optional().isArray()
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
            const { role, permissions } = req.body;
            // Only admins can assign admin role
            if (role === 'admin' && req.admin.role !== 'admin') {
                return res.status(403).json({
                    error: 'Only admins can assign admin role'
                });
            }
            // Set custom claims
            const customClaims = { role };
            if (role === 'admin')
                customClaims.admin = true;
            if (role === 'moderator')
                customClaims.moderator = true;
            if (permissions)
                customClaims.permissions = permissions;
            await admin.auth().setCustomUserClaims(userId, customClaims);
            res.json({
                success: true,
                message: `User role updated to ${role}`
            });
        }
        catch (error) {
            console.error('Error updating user role:', error);
            res.status(500).json({
                error: 'Failed to update user role',
                message: error.message
            });
        }
    });
    // =============================================================================
    // CONTENT MANAGEMENT ENDPOINTS
    // =============================================================================
    /**
     * GET /api/admin/content/templates
     * Get and manage goal templates
     */
    router.get('/content/templates', [
        (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive']),
        (0, express_validator_1.query)('category').optional().isString(),
        (0, express_validator_1.query)('featured').optional().isBoolean()
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { status, category, featured } = req.query;
            const db = admin.firestore();
            let query = db.collection('goalTemplates');
            if (status) {
                query = query.where('isPublic', '==', status === 'active');
            }
            if (category) {
                query = query.where('category', '==', category);
            }
            if (featured !== undefined) {
                query = query.where('featured', '==', featured === 'true');
            }
            const snapshot = await query.get();
            const templates = snapshot.docs.map(doc => {
                var _a, _b;
                return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
            });
            res.json({
                success: true,
                templates,
                total: templates.length,
                filters: { status, category, featured }
            });
        }
        catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({
                error: 'Failed to fetch templates',
                message: error.message
            });
        }
    });
    /**
     * PUT /api/admin/content/templates/:templateId/feature
     * Feature or unfeature a template
     */
    router.put('/content/templates/:templateId/feature', [
        (0, express_validator_1.param)('templateId').isString().notEmpty(),
        (0, express_validator_1.body)('featured').isBoolean()
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { templateId } = req.params;
            const { featured } = req.body;
            const db = admin.firestore();
            await db.collection('goalTemplates').doc(templateId).update({
                featured,
                updatedAt: new Date()
            });
            res.json({
                success: true,
                message: `Template ${featured ? 'featured' : 'unfeatured'} successfully`
            });
        }
        catch (error) {
            console.error('Error updating template feature status:', error);
            res.status(500).json({
                error: 'Failed to update template feature status',
                message: error.message
            });
        }
    });
    // =============================================================================
    // SYSTEM HEALTH ENDPOINTS
    // =============================================================================
    /**
     * GET /api/admin/system/health
     * Get system health status
     */
    router.get('/system/health', async (req, res) => {
        try {
            const db = admin.firestore();
            // Check database connectivity
            const healthCheck = await db.collection('health').doc('check').get();
            // Get recent error logs (if any)
            const recentErrors = await db.collection('systemLogs')
                .where('level', '==', 'error')
                .where('timestamp', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
                .limit(10)
                .get();
            const health = {
                status: 'healthy',
                database: 'connected',
                timestamp: new Date(),
                recentErrors: recentErrors.docs.length,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: '1.0.0'
            };
            res.json({
                success: true,
                health
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                health: {
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date()
                }
            });
        }
    });
    return router;
}
//# sourceMappingURL=admin.js.map