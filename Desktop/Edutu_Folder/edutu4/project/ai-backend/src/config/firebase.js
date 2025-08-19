/**
 * Firebase Admin SDK Configuration
 * Connects to existing Edutu Firestore database
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db = null;

/**
 * Initialize Firebase Admin SDK
 */
async function initializeFirebase() {
  try {
    if (admin.apps.length === 0) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    db = admin.firestore();
    
    // Test connection
    await db.collection('scholarships').limit(1).get();
    
    logger.info('Firebase Admin SDK initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Get Firestore database instance
 */
function getFirestore() {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return db;
}

/**
 * Fetch all scholarships from Firestore
 */
async function getAllScholarships(limit = 1000) {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('scholarships')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      publishedDate: doc.data().publishedDate?.toDate(),
    }));
  } catch (error) {
    logger.error('Error fetching scholarships:', error);
    throw error;
  }
}

/**
 * Fetch user preferences and profile
 */
async function getUserProfile(userId) {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    return {
      id: userId,
      ...userDoc.data(),
      createdAt: userDoc.data().createdAt?.toDate(),
    };
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Save user roadmap to Firestore
 */
async function saveUserRoadmap(userId, roadmapData) {
  try {
    const db = getFirestore();
    const roadmapRef = db.collection('userRoadmaps').doc();
    
    const roadmap = {
      ...roadmapData,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      progress: 0
    };
    
    await roadmapRef.set(roadmap);
    
    logger.info(`Roadmap saved for user ${userId}`);
    return { id: roadmapRef.id, ...roadmap };
  } catch (error) {
    logger.error('Error saving roadmap:', error);
    throw error;
  }
}

/**
 * Get user roadmaps
 */
async function getUserRoadmaps(userId) {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('userRoadmaps')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  } catch (error) {
    logger.error('Error fetching user roadmaps:', error);
    throw error;
  }
}

/**
 * Update roadmap progress
 */
async function updateRoadmapProgress(roadmapId, milestoneId, isCompleted) {
  try {
    const db = getFirestore();
    const roadmapRef = db.collection('userRoadmaps').doc(roadmapId);
    const roadmapDoc = await roadmapRef.get();
    
    if (!roadmapDoc.exists) {
      throw new Error('Roadmap not found');
    }
    
    const roadmapData = roadmapDoc.data();
    const milestones = roadmapData.milestones || [];
    
    // Update milestone completion status
    const updatedMilestones = milestones.map(milestone => {
      if (milestone.id === milestoneId) {
        return { ...milestone, isCompleted, completedAt: isCompleted ? new Date() : null };
      }
      return milestone;
    });
    
    // Calculate overall progress
    const completedCount = updatedMilestones.filter(m => m.isCompleted).length;
    const progress = Math.round((completedCount / updatedMilestones.length) * 100);
    
    await roadmapRef.update({
      milestones: updatedMilestones,
      progress,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: progress === 100 ? 'completed' : 'active'
    });
    
    logger.info(`Roadmap ${roadmapId} progress updated to ${progress}%`);
    return { progress, milestones: updatedMilestones };
  } catch (error) {
    logger.error('Error updating roadmap progress:', error);
    throw error;
  }
}

/**
 * Save chat message to Firestore
 */
async function saveChatMessage(userId, message, response, context) {
  try {
    const db = getFirestore();
    const chatRef = db.collection('chatHistory').doc();
    
    const chatData = {
      userId,
      message,
      response,
      context,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await chatRef.set(chatData);
    return { id: chatRef.id, ...chatData };
  } catch (error) {
    logger.error('Error saving chat message:', error);
    throw error;
  }
}

/**
 * Get user chat history
 */
async function getChatHistory(userId, limit = 50) {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('chatHistory')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    }));
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    throw error;
  }
}

/**
 * Track user activity for learning loop
 */
async function trackUserActivity(userId, activityType, details, metadata = {}) {
  try {
    const db = getFirestore();
    const activityRef = db.collection('userActivity').doc();
    
    const activityData = {
      userId,
      activityType,
      details,
      metadata,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await activityRef.set(activityData);
    
    logger.debug(`Activity tracked: ${activityType} for user ${userId}`);
    return activityRef.id;
  } catch (error) {
    logger.error('Error tracking user activity:', error);
    throw error;
  }
}

/**
 * Get user activity history with filters
 */
async function getUserActivityHistory(userId, filters = {}) {
  try {
    const db = getFirestore();
    let query = db.collection('userActivity').where('userId', '==', userId);
    
    // Apply filters
    if (filters.activityType) {
      query = query.where('activityType', '==', filters.activityType);
    }
    
    if (filters.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }
    
    query = query.orderBy('timestamp', 'desc').limit(filters.limit || 50);
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    }));
  } catch (error) {
    logger.error('Error fetching user activity history:', error);
    throw error;
  }
}

/**
 * Get activity analytics for a user
 */
async function getActivityAnalytics(userId, timeframe = 'month') {
  try {
    const db = getFirestore();
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
    
    const snapshot = await db.collection('userActivity')
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .get();
    
    // Analyze activities
    const activities = snapshot.docs.map(doc => doc.data());
    const activityCounts = {};
    const dailyCounts = {};
    
    activities.forEach(activity => {
      // Count by type
      activityCounts[activity.activityType] = (activityCounts[activity.activityType] || 0) + 1;
      
      // Count by day
      const day = activity.timestamp?.toDate()?.toISOString().split('T')[0];
      if (day) {
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    });
    
    return {
      timeframe,
      totalActivities: activities.length,
      activityTypes: activityCounts,
      dailyBreakdown: dailyCounts,
      mostActiveType: Object.entries(activityCounts).sort(([,a], [,b]) => b - a)[0]?.[0],
      averageDaily: Object.values(dailyCounts).reduce((sum, count) => sum + count, 0) / Object.keys(dailyCounts).length || 0
    };
  } catch (error) {
    logger.error('Error generating activity analytics:', error);
    throw error;
  }
}

/**
 * Update user preferences
 */
async function updateUserPreferences(userId, preferences) {
  try {
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      preferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.debug(`Updated preferences for user ${userId}`);
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAllScholarships,
  getUserProfile,
  saveUserRoadmap,
  getUserRoadmaps,
  updateRoadmapProgress,
  saveChatMessage,
  getChatHistory,
  trackUserActivity,
  getUserActivityHistory,
  getActivityAnalytics,
  updateUserPreferences,
};