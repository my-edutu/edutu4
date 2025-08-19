"use strict";
/**
 * Firebase Utilities for Edutu Functions
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
exports.getAllScholarships = getAllScholarships;
exports.getUserProfile = getUserProfile;
exports.saveUserRoadmap = saveUserRoadmap;
exports.getUserRoadmaps = getUserRoadmaps;
exports.updateRoadmapProgress = updateRoadmapProgress;
exports.saveChatMessage = saveChatMessage;
exports.getChatHistory = getChatHistory;
exports.logUserActivity = logUserActivity;
exports.getUserActivity = getUserActivity;
const admin = __importStar(require("firebase-admin"));
/**
 * Get all scholarships from Firestore
 */
async function getAllScholarships() {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('scholarships')
            .orderBy('createdAt', 'desc')
            .limit(1000) // Limit to prevent memory issues
            .get();
        const scholarships = [];
        snapshot.forEach(doc => {
            var _a, _b, _c;
            const data = doc.data();
            scholarships.push(Object.assign(Object.assign({ id: doc.id }, data), { createdAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), publishedDate: (_c = data.publishedDate) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
        return scholarships;
    }
    catch (error) {
        console.error('Error fetching scholarships:', error);
        throw new Error('Failed to fetch scholarships');
    }
}
/**
 * Get user profile from Firestore
 */
async function getUserProfile(userId) {
    var _a, _b;
    try {
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error(`User profile not found for ${userId}`);
        }
        const data = userDoc.data();
        return Object.assign(Object.assign({ id: userDoc.id }, data), { createdAt: (_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() });
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}
/**
 * Save user roadmap to Firestore
 */
async function saveUserRoadmap(userId, roadmapData) {
    try {
        const db = admin.firestore();
        const roadmapId = `roadmap_${userId}_${Date.now()}`;
        const roadmap = Object.assign(Object.assign({ id: roadmapId, userId }, roadmapData), { createdAt: new Date(), updatedAt: new Date(), version: 1, status: 'active' });
        await db.collection('userRoadmaps').doc(roadmapId).set(roadmap);
        return roadmap;
    }
    catch (error) {
        console.error('Error saving user roadmap:', error);
        throw new Error('Failed to save roadmap');
    }
}
/**
 * Get user roadmaps from Firestore
 */
async function getUserRoadmaps(userId) {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('userRoadmaps')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const roadmaps = [];
        snapshot.forEach(doc => {
            var _a, _b;
            const data = doc.data();
            roadmaps.push(Object.assign(Object.assign({ id: doc.id }, data), { createdAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
        });
        return roadmaps;
    }
    catch (error) {
        console.error('Error fetching user roadmaps:', error);
        throw new Error('Failed to fetch roadmaps');
    }
}
/**
 * Update roadmap milestone progress
 */
async function updateRoadmapProgress(roadmapId, milestoneId, isCompleted) {
    try {
        const db = admin.firestore();
        const roadmapDoc = await db.collection('userRoadmaps').doc(roadmapId).get();
        if (!roadmapDoc.exists) {
            throw new Error(`Roadmap not found: ${roadmapId}`);
        }
        const roadmapData = roadmapDoc.data();
        const milestones = (roadmapData === null || roadmapData === void 0 ? void 0 : roadmapData.milestones) || [];
        // Update the milestone
        const updatedMilestones = milestones.map((milestone) => {
            if (milestone.id === milestoneId) {
                return Object.assign(Object.assign({}, milestone), { isCompleted, completedAt: isCompleted ? new Date() : null });
            }
            return milestone;
        });
        // Calculate progress
        const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
        const progress = updatedMilestones.length > 0 ?
            Math.round((completedCount / updatedMilestones.length) * 100) : 0;
        // Update the roadmap
        await db.collection('userRoadmaps').doc(roadmapId).update({
            milestones: updatedMilestones,
            progress,
            updatedAt: new Date(),
        });
        return {
            progress,
            milestones: updatedMilestones,
        };
    }
    catch (error) {
        console.error('Error updating roadmap progress:', error);
        throw error;
    }
}
/**
 * Save chat message to Firestore
 */
async function saveChatMessage(userId, messageData) {
    try {
        const db = admin.firestore();
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const chatMessage = Object.assign(Object.assign({ id: messageId, userId }, messageData), { timestamp: new Date() });
        await db.collection('chatMessages').doc(messageId).set(chatMessage);
        return messageId;
    }
    catch (error) {
        console.error('Error saving chat message:', error);
        throw new Error('Failed to save chat message');
    }
}
/**
 * Get chat history for a user
 */
async function getChatHistory(userId, sessionId, limit = 20) {
    try {
        const db = admin.firestore();
        let query = db.collection('chatMessages')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(limit);
        if (sessionId) {
            query = query.where('sessionId', '==', sessionId);
        }
        const snapshot = await query.get();
        const messages = [];
        snapshot.forEach(doc => {
            var _a;
            const data = doc.data();
            messages.push(Object.assign(Object.assign({ id: doc.id }, data), { timestamp: (_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        return messages.reverse(); // Return in chronological order
    }
    catch (error) {
        console.error('Error fetching chat history:', error);
        throw new Error('Failed to fetch chat history');
    }
}
/**
 * Log user activity
 */
async function logUserActivity(activity) {
    try {
        const db = admin.firestore();
        const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const activityLog = Object.assign(Object.assign({ id: activityId }, activity), { timestamp: new Date() });
        await db.collection('userActivity').doc(activityId).set(activityLog);
        return activityId;
    }
    catch (error) {
        console.error('Error logging user activity:', error);
        throw new Error('Failed to log activity');
    }
}
/**
 * Get user activity history
 */
async function getUserActivity(userId, options = {}) {
    try {
        const db = admin.firestore();
        let query = db.collection('userActivity')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc');
        if (options.action) {
            query = query.where('action', '==', options.action);
        }
        if (options.resourceType) {
            query = query.where('resourceType', '==', options.resourceType);
        }
        if (options.days) {
            const cutoff = new Date(Date.now() - (options.days * 24 * 60 * 60 * 1000));
            query = query.where('timestamp', '>', cutoff);
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const snapshot = await query.get();
        const activities = [];
        snapshot.forEach(doc => {
            var _a;
            const data = doc.data();
            activities.push(Object.assign(Object.assign({ id: doc.id }, data), { timestamp: (_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        return activities;
    }
    catch (error) {
        console.error('Error fetching user activity:', error);
        throw new Error('Failed to fetch user activity');
    }
}
//# sourceMappingURL=firebase.js.map