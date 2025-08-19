/**
 * Firebase Utilities for Edutu Functions
 */

import * as admin from 'firebase-admin';

/**
 * Get all scholarships from Firestore
 */
export async function getAllScholarships(): Promise<any[]> {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('scholarships')
      .orderBy('createdAt', 'desc')
      .limit(1000) // Limit to prevent memory issues
      .get();

    const scholarships: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      scholarships.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        publishedDate: data.publishedDate?.toDate(),
      });
    });

    return scholarships;
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    throw new Error('Failed to fetch scholarships');
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<any> {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error(`User profile not found for ${userId}`);
    }

    const data = userDoc.data();
    return {
      id: userDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Save user roadmap to Firestore
 */
export async function saveUserRoadmap(userId: string, roadmapData: any): Promise<any> {
  try {
    const db = admin.firestore();
    const roadmapId = `roadmap_${userId}_${Date.now()}`;
    
    const roadmap = {
      id: roadmapId,
      userId,
      ...roadmapData,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      status: 'active'
    };

    await db.collection('userRoadmaps').doc(roadmapId).set(roadmap);
    
    return roadmap;
  } catch (error) {
    console.error('Error saving user roadmap:', error);
    throw new Error('Failed to save roadmap');
  }
}

/**
 * Get user roadmaps from Firestore
 */
export async function getUserRoadmaps(userId: string): Promise<any[]> {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('userRoadmaps')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const roadmaps: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      roadmaps.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      });
    });

    return roadmaps;
  } catch (error) {
    console.error('Error fetching user roadmaps:', error);
    throw new Error('Failed to fetch roadmaps');
  }
}

/**
 * Update roadmap milestone progress
 */
export async function updateRoadmapProgress(
  roadmapId: string, 
  milestoneId: string, 
  isCompleted: boolean
): Promise<any> {
  try {
    const db = admin.firestore();
    const roadmapDoc = await db.collection('userRoadmaps').doc(roadmapId).get();

    if (!roadmapDoc.exists) {
      throw new Error(`Roadmap not found: ${roadmapId}`);
    }

    const roadmapData = roadmapDoc.data();
    const milestones = roadmapData?.milestones || [];

    // Update the milestone
    const updatedMilestones = milestones.map((milestone: any) => {
      if (milestone.id === milestoneId) {
        return {
          ...milestone,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        };
      }
      return milestone;
    });

    // Calculate progress
    const completedCount = updatedMilestones.filter((m: any) => m.isCompleted).length;
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
  } catch (error) {
    console.error('Error updating roadmap progress:', error);
    throw error;
  }
}

/**
 * Save chat message to Firestore
 */
export async function saveChatMessage(userId: string, messageData: any): Promise<string> {
  try {
    const db = admin.firestore();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const chatMessage = {
      id: messageId,
      userId,
      ...messageData,
      timestamp: new Date(),
    };

    await db.collection('chatMessages').doc(messageId).set(chatMessage);
    
    return messageId;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw new Error('Failed to save chat message');
  }
}

/**
 * Get chat history for a user
 */
export async function getChatHistory(
  userId: string, 
  sessionId?: string, 
  limit: number = 20
): Promise<any[]> {
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

    const messages: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate(),
      });
    });

    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw new Error('Failed to fetch chat history');
  }
}

/**
 * Log user activity
 */
export async function logUserActivity(activity: any): Promise<string> {
  try {
    const db = admin.firestore();
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const activityLog = {
      id: activityId,
      ...activity,
      timestamp: new Date(),
    };

    await db.collection('userActivity').doc(activityId).set(activityLog);
    
    return activityId;
  } catch (error) {
    console.error('Error logging user activity:', error);
    throw new Error('Failed to log activity');
  }
}

/**
 * Get user activity history
 */
export async function getUserActivity(
  userId: string, 
  options: {
    limit?: number;
    action?: string;
    resourceType?: string;
    days?: number;
  } = {}
): Promise<any[]> {
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

    const activities: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate(),
      });
    });

    return activities;
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw new Error('Failed to fetch user activity');
  }
}