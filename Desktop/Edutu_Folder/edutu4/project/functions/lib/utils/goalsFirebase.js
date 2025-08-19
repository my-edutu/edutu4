"use strict";
/**
 * Firebase Utilities for Goals System
 * Comprehensive database operations for the Edutu Goals System
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
exports.getAllGoalTemplates = getAllGoalTemplates;
exports.getGoalTemplateById = getGoalTemplateById;
exports.searchMarketplaceGoals = searchMarketplaceGoals;
exports.getMarketplaceGoalById = getMarketplaceGoalById;
exports.getFeaturedMarketplaceGoals = getFeaturedMarketplaceGoals;
exports.createUserGoal = createUserGoal;
exports.getUserGoals = getUserGoals;
exports.getUserGoalById = getUserGoalById;
exports.updateGoalProgress = updateGoalProgress;
exports.logGoalSession = logGoalSession;
exports.submitGoalToMarketplace = submitGoalToMarketplace;
exports.getModerationQueue = getModerationQueue;
exports.moderateGoal = moderateGoal;
exports.getSystemAnalytics = getSystemAnalytics;
exports.generateDailyAnalytics = generateDailyAnalytics;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Goal Templates Operations
async function getAllGoalTemplates() {
    try {
        const snapshot = await db.collection('goalTemplates')
            .where('isPublic', '==', true)
            .orderBy('featured', 'desc')
            .orderBy('metadata.usageCount', 'desc')
            .limit(100)
            .get();
        return snapshot.docs.map(doc => {
            var _a, _b;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
        });
    }
    catch (error) {
        console.error('Error fetching goal templates:', error);
        throw new Error('Failed to fetch goal templates');
    }
}
async function getGoalTemplateById(templateId) {
    var _a, _b;
    try {
        const doc = await db.collection('goalTemplates').doc(templateId).get();
        if (!doc.exists)
            return null;
        const data = doc.data();
        return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: (_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() });
    }
    catch (error) {
        console.error('Error fetching goal template:', error);
        throw error;
    }
}
// Marketplace Goals Operations
async function searchMarketplaceGoals(params) {
    try {
        let query = db.collection('marketplaceGoals')
            .where('status', '==', 'approved');
        // Apply filters
        if (params.category) {
            query = query.where('category', '==', params.category);
        }
        if (params.difficulty && params.difficulty.length > 0) {
            query = query.where('difficulty', 'in', params.difficulty);
        }
        if (params.tags && params.tags.length > 0) {
            query = query.where('tags', 'array-contains-any', params.tags);
        }
        // Apply sorting
        switch (params.sortBy) {
            case 'popularity':
                query = query.orderBy('metadata.subscriptions', 'desc');
                break;
            case 'rating':
                query = query.orderBy('metadata.averageRating', 'desc');
                break;
            case 'recent':
                query = query.orderBy('createdAt', 'desc');
                break;
            case 'trending':
                query = query.orderBy('metadata.views', 'desc');
                break;
            default:
                query = query.orderBy('featured', 'desc').orderBy('metadata.subscriptions', 'desc');
        }
        const limit = params.limit || 20;
        const offset = ((params.page || 1) - 1) * limit;
        const snapshot = await query.limit(limit + 1).offset(offset).get();
        const hasMore = snapshot.docs.length > limit;
        const goals = snapshot.docs.slice(0, limit).map(doc => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), featuredUntil: (_c = doc.data().featuredUntil) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
        return {
            goals,
            total: goals.length,
            hasMore
        };
    }
    catch (error) {
        console.error('Error searching marketplace goals:', error);
        throw new Error('Failed to search marketplace goals');
    }
}
async function getMarketplaceGoalById(goalId) {
    var _a, _b, _c;
    try {
        const doc = await db.collection('marketplaceGoals').doc(goalId).get();
        if (!doc.exists)
            return null;
        // Increment view count
        await doc.ref.update({
            'metadata.views': admin.firestore.FieldValue.increment(1)
        });
        const data = doc.data();
        return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: (_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), featuredUntil: (_c = data === null || data === void 0 ? void 0 : data.featuredUntil) === null || _c === void 0 ? void 0 : _c.toDate() });
    }
    catch (error) {
        console.error('Error fetching marketplace goal:', error);
        throw error;
    }
}
async function getFeaturedMarketplaceGoals() {
    try {
        const now = new Date();
        const snapshot = await db.collection('marketplaceGoals')
            .where('status', '==', 'approved')
            .where('featured', '==', true)
            .where('featuredUntil', '>', now)
            .orderBy('featuredUntil', 'desc')
            .limit(10)
            .get();
        return snapshot.docs.map(doc => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), featuredUntil: (_c = doc.data().featuredUntil) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
    }
    catch (error) {
        console.error('Error fetching featured goals:', error);
        throw new Error('Failed to fetch featured goals');
    }
}
// User Goals Operations
async function createUserGoal(userId, request) {
    try {
        const goalId = `goal_${userId}_${Date.now()}`;
        let goalData;
        if (request.sourceType === 'marketplace' && request.sourceId) {
            const marketplaceGoal = await getMarketplaceGoalById(request.sourceId);
            if (!marketplaceGoal) {
                throw new Error('Marketplace goal not found');
            }
            goalData = {
                title: marketplaceGoal.title,
                description: marketplaceGoal.description,
                category: marketplaceGoal.category,
                difficulty: marketplaceGoal.difficulty,
                estimatedDuration: marketplaceGoal.estimatedDuration,
                tags: marketplaceGoal.tags,
                roadmap: marketplaceGoal.roadmap.map(milestone => (Object.assign(Object.assign({}, milestone), { isCompleted: false, subtasks: milestone.subtasks.map(subtask => (Object.assign(Object.assign({}, subtask), { isCompleted: false }))) })))
            };
            // Update subscription count
            await db.collection('marketplaceGoals').doc(request.sourceId).update({
                'metadata.subscriptions': admin.firestore.FieldValue.increment(1)
            });
        }
        else if (request.sourceType === 'template' && request.sourceId) {
            const template = await getGoalTemplateById(request.sourceId);
            if (!template) {
                throw new Error('Goal template not found');
            }
            goalData = {
                title: template.title,
                description: template.description,
                category: template.category,
                difficulty: template.difficulty,
                estimatedDuration: template.estimatedDuration,
                tags: template.tags,
                roadmap: template.roadmap.map(milestone => (Object.assign(Object.assign({}, milestone), { isCompleted: false, subtasks: milestone.subtasks.map(subtask => (Object.assign(Object.assign({}, subtask), { isCompleted: false }))) })))
            };
            // Update usage count
            await db.collection('goalTemplates').doc(request.sourceId).update({
                'metadata.usageCount': admin.firestore.FieldValue.increment(1)
            });
        }
        else {
            // Custom goal
            if (!request.title || !request.description || !request.category) {
                throw new Error('Title, description, and category are required for custom goals');
            }
            goalData = {
                title: request.title,
                description: request.description,
                category: request.category,
                difficulty: 'beginner',
                estimatedDuration: 4, // default 4 weeks
                tags: [],
                roadmap: (request.customRoadmap || []).map((milestone, index) => ({
                    id: milestone.id || `milestone_${Date.now()}_${index}`,
                    title: milestone.title || `Milestone ${index + 1}`,
                    description: milestone.description || '',
                    order: milestone.order || index + 1,
                    estimatedDuration: milestone.estimatedDuration || 7,
                    prerequisites: milestone.prerequisites || [],
                    resources: milestone.resources || [],
                    isCompleted: milestone.isCompleted || false,
                    subtasks: milestone.subtasks || [],
                    points: milestone.points || 10
                }))
            };
        }
        const userGoal = Object.assign(Object.assign({ id: goalId, userId, sourceType: request.sourceType, sourceId: request.sourceId }, goalData), { status: 'active', progress: 0, createdAt: new Date(), updatedAt: new Date(), settings: Object.assign({ isPrivate: false, reminders: {
                    enabled: false,
                    frequency: 'weekly'
                }, notifications: {
                    milestoneCompleted: true,
                    weeklyProgress: true,
                    encouragement: true
                } }, request.settings), statistics: {
                timeSpent: 0,
                sessionsCount: 0,
                currentStreak: 0,
                longestStreak: 0,
                averageSessionDuration: 0,
                completionRate: 0,
                pointsEarned: 0
            } });
        await db.collection('users').doc(userId).collection('goals').doc(goalId).set(userGoal);
        return userGoal;
    }
    catch (error) {
        console.error('Error creating user goal:', error);
        throw error;
    }
}
async function getUserGoals(userId, status) {
    try {
        let query = db.collection('users').doc(userId).collection('goals')
            .orderBy('createdAt', 'desc');
        if (status) {
            query = query.where('status', '==', status);
        }
        const snapshot = await query.limit(50).get();
        return snapshot.docs.map(doc => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), startedAt: (_c = doc.data().startedAt) === null || _c === void 0 ? void 0 : _c.toDate(), completedAt: (_d = doc.data().completedAt) === null || _d === void 0 ? void 0 : _d.toDate(), pausedAt: (_e = doc.data().pausedAt) === null || _e === void 0 ? void 0 : _e.toDate() }));
        });
    }
    catch (error) {
        console.error('Error fetching user goals:', error);
        throw new Error('Failed to fetch user goals');
    }
}
async function getUserGoalById(goalId) {
    var _a, _b, _c, _d, _e;
    try {
        // Need userId to construct path - try to extract from goalId or require it
        // For now, we'll search across all users (inefficient but works for migration)
        const usersSnapshot = await db.collection('users').get();
        for (const userDoc of usersSnapshot.docs) {
            const goalDoc = await db.collection('users').doc(userDoc.id).collection('goals').doc(goalId).get();
            if (goalDoc.exists) {
                const data = goalDoc.data();
                return Object.assign(Object.assign({ id: goalDoc.id }, data), { createdAt: (_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), startedAt: (_c = data === null || data === void 0 ? void 0 : data.startedAt) === null || _c === void 0 ? void 0 : _c.toDate(), completedAt: (_d = data === null || data === void 0 ? void 0 : data.completedAt) === null || _d === void 0 ? void 0 : _d.toDate(), pausedAt: (_e = data === null || data === void 0 ? void 0 : data.pausedAt) === null || _e === void 0 ? void 0 : _e.toDate() });
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error fetching user goal:', error);
        throw error;
    }
}
async function updateGoalProgress(goalId, userId, request) {
    try {
        // Extract userId from goalData or search
        const usersSnapshot = await db.collection('users').get();
        let goalDoc = null;
        let userIdFromDoc = userId;
        for (const userDoc of usersSnapshot.docs) {
            const tempGoalDoc = await db.collection('users').doc(userDoc.id).collection('goals').doc(goalId).get();
            if (tempGoalDoc.exists) {
                goalDoc = tempGoalDoc;
                userIdFromDoc = userDoc.id;
                break;
            }
        }
        if (!goalDoc.exists) {
            throw new Error('Goal not found');
        }
        const goalData = goalDoc.data();
        if (goalData.userId !== userId) {
            throw new Error('Unauthorized');
        }
        const updatedRoadmap = goalData.roadmap.map(milestone => {
            if (milestone.id === request.milestoneId) {
                if (request.subtaskId) {
                    // Update specific subtask
                    const updatedSubtasks = milestone.subtasks.map(subtask => {
                        if (subtask.id === request.subtaskId) {
                            return Object.assign(Object.assign({}, subtask), { isCompleted: request.isCompleted, completedAt: request.isCompleted ? new Date() : undefined });
                        }
                        return subtask;
                    });
                    // Check if all subtasks are completed
                    const allSubtasksCompleted = updatedSubtasks.every(subtask => subtask.isCompleted);
                    return Object.assign(Object.assign({}, milestone), { subtasks: updatedSubtasks, isCompleted: allSubtasksCompleted, completedAt: allSubtasksCompleted ? new Date() : milestone.completedAt });
                }
                else {
                    // Update entire milestone
                    const updatedSubtasks = milestone.subtasks.map(subtask => (Object.assign(Object.assign({}, subtask), { isCompleted: request.isCompleted, completedAt: request.isCompleted ? new Date() : undefined })));
                    return Object.assign(Object.assign({}, milestone), { subtasks: updatedSubtasks, isCompleted: request.isCompleted, completedAt: request.isCompleted ? new Date() : undefined });
                }
            }
            return milestone;
        });
        // Calculate overall progress
        const totalSubtasks = updatedRoadmap.reduce((sum, milestone) => sum + milestone.subtasks.length, 0);
        const completedSubtasks = updatedRoadmap.reduce((sum, milestone) => sum + milestone.subtasks.filter(subtask => subtask.isCompleted).length, 0);
        const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
        // Update goal status if completed
        const status = progress === 100 ? 'completed' : goalData.status;
        const completedAt = progress === 100 && goalData.status !== 'completed' ? new Date() : goalData.completedAt;
        const updateData = {
            roadmap: updatedRoadmap,
            progress,
            status,
            completedAt,
            updatedAt: new Date(),
            statistics: Object.assign(Object.assign({}, goalData.statistics), { timeSpent: goalData.statistics.timeSpent + (request.timeSpent || 0) })
        };
        await db.collection('users').doc(userIdFromDoc).collection('goals').doc(goalId).update(updateData);
        // Log session if time was spent
        if (request.timeSpent && request.timeSpent > 0) {
            await logGoalSession(userId, goalId, request.milestoneId, request.timeSpent, request.sessionNotes);
        }
        const updatedGoal = await getUserGoalById(goalId);
        return { progress, goal: updatedGoal };
    }
    catch (error) {
        console.error('Error updating goal progress:', error);
        throw error;
    }
}
async function logGoalSession(userId, goalId, milestoneId, duration, notes) {
    try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = {
            id: sessionId,
            userId,
            goalId,
            milestoneId,
            startTime: new Date(Date.now() - duration * 60000), // Calculate start time
            endTime: new Date(),
            duration,
            notes,
            tasksCompleted: [], // Would be populated from the request if available
        };
        await db.collection('goalSessions').doc(sessionId).set(session);
        // Update goal statistics
        // Extract userId from goalId or session data
        const goalDoc = await getUserGoalById(goalId);
        if (goalDoc) {
            await db.collection('users').doc(goalDoc.userId).collection('goals').doc(goalId).update({
                'statistics.sessionsCount': admin.firestore.FieldValue.increment(1),
                'statistics.averageSessionDuration': admin.firestore.FieldValue.increment(duration) // This needs proper calculation
            });
        }
    }
    catch (error) {
        console.error('Error logging goal session:', error);
        throw error;
    }
}
// Marketplace Operations
async function submitGoalToMarketplace(userId, request) {
    try {
        const userGoal = await getUserGoalById(request.goalId);
        if (!userGoal || userGoal.userId !== userId) {
            throw new Error('Goal not found or unauthorized');
        }
        const marketplaceGoalId = `marketplace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const marketplaceGoal = {
            id: marketplaceGoalId,
            title: userGoal.title,
            description: request.additionalDescription || userGoal.description,
            category: userGoal.category,
            difficulty: userGoal.difficulty,
            estimatedDuration: userGoal.estimatedDuration,
            tags: userGoal.tags,
            roadmap: userGoal.roadmap,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'pending',
            moderationInfo: {
                flagCount: 0,
                flags: []
            },
            metadata: {
                views: 0,
                subscriptions: 0,
                likes: 0,
                ratings: [],
                averageRating: 0
            },
            featured: false
        };
        await db.collection('marketplaceGoals').doc(marketplaceGoalId).set(marketplaceGoal);
        // Add to moderation queue
        const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const moderationItem = {
            id: queueId,
            type: 'goal_submission',
            itemId: marketplaceGoalId,
            priority: 'medium',
            status: 'pending',
            createdAt: new Date(),
            metadata: {
                submittedBy: userId,
                originalGoalId: request.goalId
            }
        };
        await db.collection('adminModerationQueue').doc(queueId).set(moderationItem);
        return marketplaceGoalId;
    }
    catch (error) {
        console.error('Error submitting goal to marketplace:', error);
        throw error;
    }
}
// Admin Operations
async function getModerationQueue(status, type, limit = 50) {
    try {
        let query = db.collection('adminModerationQueue')
            .orderBy('createdAt', 'desc');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (type) {
            query = query.where('type', '==', type);
        }
        const snapshot = await query.limit(limit).get();
        return snapshot.docs.map(doc => {
            var _a, _b;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), resolvedAt: (_b = doc.data().resolvedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
        });
    }
    catch (error) {
        console.error('Error fetching moderation queue:', error);
        throw new Error('Failed to fetch moderation queue');
    }
}
async function moderateGoal(queueId, goalId, adminId, request) {
    try {
        const batch = db.batch();
        // Update marketplace goal
        const goalRef = db.collection('marketplaceGoals').doc(goalId);
        const updates = {
            updatedAt: new Date(),
            'moderationInfo.moderatedBy': adminId,
            'moderationInfo.moderatedAt': new Date(),
            'moderationInfo.moderationNotes': request.notes
        };
        switch (request.action) {
            case 'approve':
                updates.status = 'approved';
                break;
            case 'reject':
                updates.status = 'rejected';
                updates['moderationInfo.rejectionReason'] = request.reason;
                break;
            case 'archive':
                updates.status = 'archived';
                break;
            case 'feature':
                updates.featured = true;
                updates.featuredUntil = request.featuredUntil;
                break;
            case 'unfeature':
                updates.featured = false;
                updates.featuredUntil = undefined;
                break;
        }
        batch.update(goalRef, updates);
        // Update moderation queue item
        const queueRef = db.collection('adminModerationQueue').doc(queueId);
        batch.update(queueRef, {
            status: 'resolved',
            assignedTo: adminId,
            resolvedAt: new Date()
        });
        await batch.commit();
    }
    catch (error) {
        console.error('Error moderating goal:', error);
        throw error;
    }
}
// Analytics
async function getSystemAnalytics(days = 30) {
    try {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const snapshot = await db.collection('systemAnalytics')
            .where('createdAt', '>', cutoffDate)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        throw new Error('Failed to fetch analytics');
    }
}
async function generateDailyAnalytics() {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        // Get various counts and metrics
        const [totalUsersSnapshot, activeUsersSnapshot, goalsCreatedSnapshot, goalsCompletedSnapshot, marketplaceSubmissionsSnapshot, marketplaceApprovalsSnapshot] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('userGoals').where('updatedAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)).count().get(),
            db.collection('userGoals').where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)).count().get(),
            db.collection('userGoals').where('status', '==', 'completed').where('completedAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)).count().get(),
            db.collection('marketplaceGoals').where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)).count().get(),
            db.collection('marketplaceGoals').where('status', '==', 'approved').where('moderationInfo.moderatedAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)).count().get()
        ]);
        const analytics = {
            id: `analytics_${todayStr}`,
            date: todayStr,
            metrics: {
                totalUsers: totalUsersSnapshot.data().count,
                activeUsers: activeUsersSnapshot.data().count,
                goalsCreated: goalsCreatedSnapshot.data().count,
                goalsCompleted: goalsCompletedSnapshot.data().count,
                marketplaceSubmissions: marketplaceSubmissionsSnapshot.data().count,
                marketplaceApprovals: marketplaceApprovalsSnapshot.data().count,
                averageCompletionRate: 0, // Would need complex aggregation
                topCategories: [], // Would need aggregation
                userEngagement: {
                    dailyActiveUsers: activeUsersSnapshot.data().count,
                    weeklyActiveUsers: 0, // Would need complex query
                    monthlyActiveUsers: 0, // Would need complex query
                    averageSessionDuration: 0 // Would need aggregation from goalSessions
                }
            },
            createdAt: today
        };
        await db.collection('systemAnalytics').doc(analytics.id).set(analytics);
    }
    catch (error) {
        console.error('Error generating daily analytics:', error);
        throw error;
    }
}
//# sourceMappingURL=goalsFirebase.js.map