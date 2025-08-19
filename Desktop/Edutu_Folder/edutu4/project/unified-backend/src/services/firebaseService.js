/**
 * Firebase Service
 * Unified Firebase integration for authentication, Firestore, and user management
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');
const config = require('../config');

class FirebaseService {
  constructor() {
    this.db = null;
    this.auth = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('🔥 Initializing Firebase Admin...');

      // Initialize Firebase Admin
      const serviceAccount = {
        type: 'service_account',
        project_id: config.firebase.projectId,
        private_key_id: config.firebase.privateKeyId,
        private_key: config.firebase.privateKey,
        client_email: config.firebase.clientEmail,
        client_id: config.firebase.clientId,
        auth_uri: config.firebase.authUri,
        token_uri: config.firebase.tokenUri,
        auth_provider_x509_cert_url: config.firebase.authProviderCertUrl,
        client_x509_cert_url: config.firebase.clientCertUrl
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: config.firebase.databaseURL
      });

      this.db = admin.firestore();
      this.auth = admin.auth();
      
      // Configure Firestore settings
      this.db.settings({
        ignoreUndefinedProperties: true
      });

      this.initialized = true;
      logger.info('✅ Firebase Admin initialized successfully');
      
    } catch (error) {
      logger.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        logger.debug(`User profile not found for userId: ${userId}`);
        return null;
      }

      const userData = userDoc.data();
      return {
        uid: userId,
        ...userData,
        lastAccessed: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, profileData) {
    try {
      const updateData = {
        ...profileData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModified: new Date().toISOString()
      };

      await this.db.collection('users').doc(userId).set(updateData, { merge: true });
      
      logger.info(`User profile updated for userId: ${userId}`);
      return { success: true };

    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Save chat message to Firestore
   */
  async saveChatMessage(userId, messageData) {
    try {
      const chatDoc = {
        userId,
        message: messageData.message,
        response: messageData.response,
        sessionId: messageData.sessionId,
        context: messageData.context || {},
        type: messageData.type || 'user_message',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: messageData.timestamp || new Date().toISOString(),
        requestId: messageData.requestId
      };

      const docRef = await this.db.collection('chatMessages').add(chatDoc);
      
      logger.debug(`Chat message saved with ID: ${docRef.id}`);
      return { id: docRef.id, success: true };

    } catch (error) {
      logger.error('Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Get chat history for user/session
   */
  async getChatHistory(userId, sessionId = null, limit = 50) {
    try {
      let query = this.db.collection('chatMessages')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (sessionId) {
        query = query.where('sessionId', '==', sessionId);
      }

      const snapshot = await query.get();
      
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt
        });
      });

      // Return in chronological order (oldest first)
      return messages.reverse();

    } catch (error) {
      logger.error('Error fetching chat history:', error);
      throw error;
    }
  }

  /**
   * Get relevant opportunities based on message content
   */
  async getRelevantOpportunities(message, userId, limit = 5) {
    try {
      const messageLower = message.toLowerCase();
      
      // Get scholarships with basic text matching
      let query = this.db.collection('scholarships')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(50); // Get more for filtering

      const snapshot = await query.get();
      
      const opportunities = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const searchText = [
          data.title || '',
          data.description || '',
          data.summary || '',
          data.category || '',
          data.provider || '',
          ...(data.tags || [])
        ].join(' ').toLowerCase();

        // Simple relevance scoring
        let score = 0;
        const messageWords = messageLower.split(' ').filter(word => word.length > 2);
        
        messageWords.forEach(word => {
          if (searchText.includes(word)) {
            score += searchText.includes(data.title?.toLowerCase() || '') ? 3 : 1;
          }
        });

        if (score > 0) {
          opportunities.push({
            id: doc.id,
            ...data,
            relevanceScore: score,
            deadline: data.deadline?.toDate?.()?.toISOString() || data.deadline
          });
        }
      });

      // Sort by relevance and return top results
      return opportunities
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error fetching relevant opportunities:', error);
      return [];
    }
  }

  /**
   * Get user recommendations based on profile
   */
  async getUserRecommendations(userId, limit = 10) {
    try {
      const userProfile = await this.getUserProfile(userId);
      
      if (!userProfile?.preferences) {
        // Return general opportunities if no preferences
        return await this.getGeneralOpportunities(limit);
      }

      const interests = userProfile.preferences.careerInterests || [];
      const educationLevel = userProfile.preferences.educationLevel || '';
      
      let query = this.db.collection('scholarships')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(100); // Get more for scoring

      const snapshot = await query.get();
      
      const scored = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const score = this.calculateRecommendationScore(data, userProfile.preferences);
        
        if (score > 0) {
          scored.push({
            id: doc.id,
            ...data,
            recommendationScore: score,
            deadline: data.deadline?.toDate?.()?.toISOString() || data.deadline
          });
        }
      });

      return scored
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error getting user recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate recommendation score based on user preferences
   */
  calculateRecommendationScore(opportunity, preferences) {
    let score = 1; // Base score

    const searchText = [
      opportunity.title || '',
      opportunity.description || '',
      opportunity.category || '',
      ...(opportunity.tags || [])
    ].join(' ').toLowerCase();

    // Career interests matching
    if (preferences.careerInterests) {
      preferences.careerInterests.forEach(interest => {
        if (searchText.includes(interest.toLowerCase())) {
          score += 5;
        }
      });
    }

    // Education level matching
    if (preferences.educationLevel) {
      const eduLevel = preferences.educationLevel.toLowerCase();
      if (searchText.includes(eduLevel) || 
          (eduLevel.includes('bachelor') && searchText.includes('undergraduate')) ||
          (eduLevel.includes('master') && searchText.includes('graduate'))) {
        score += 3;
      }
    }

    // Skills matching
    if (preferences.currentSkills) {
      preferences.currentSkills.forEach(skill => {
        if (searchText.includes(skill.toLowerCase())) {
          score += 2;
        }
      });
    }

    // Location preferences
    if (preferences.preferredLocations) {
      preferences.preferredLocations.forEach(location => {
        if (searchText.includes(location.toLowerCase())) {
          score += 2;
        }
      });
    }

    return score;
  }

  /**
   * Get general opportunities when no user preferences available
   */
  async getGeneralOpportunities(limit = 10) {
    try {
      const snapshot = await this.db.collection('scholarships')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const opportunities = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        opportunities.push({
          id: doc.id,
          ...data,
          deadline: data.deadline?.toDate?.()?.toISOString() || data.deadline
        });
      });

      return opportunities;

    } catch (error) {
      logger.error('Error fetching general opportunities:', error);
      return [];
    }
  }

  /**
   * Search opportunities by text
   */
  async searchOpportunities(searchTerm, limit = 20) {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a simple implementation - for production, consider Algolia or Elasticsearch
      
      const snapshot = await this.db.collection('scholarships')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      const searchLower = searchTerm.toLowerCase();
      const results = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const searchableText = [
          data.title || '',
          data.description || '',
          data.summary || '',
          data.category || '',
          data.provider || '',
          ...(data.tags || [])
        ].join(' ').toLowerCase();

        if (searchableText.includes(searchLower)) {
          results.push({
            id: doc.id,
            ...data,
            deadline: data.deadline?.toDate?.()?.toISOString() || data.deadline
          });
        }
      });

      return results.slice(0, limit);

    } catch (error) {
      logger.error('Error searching opportunities:', error);
      return [];
    }
  }

  /**
   * Verify Firebase auth token
   */
  async verifyAuthToken(token) {
    try {
      const decodedToken = await this.auth.verifyIdToken(token);
      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name
      };
    } catch (error) {
      logger.warn('Token verification failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get opportunity categories
   */
  async getOpportunityCategories() {
    try {
      const snapshot = await this.db.collection('scholarships')
        .where('status', '==', 'active')
        .get();

      const categories = new Set(['All']);
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });

      return Array.from(categories);

    } catch (error) {
      logger.error('Error fetching categories:', error);
      return ['All', 'Scholarships', 'Leadership', 'Tech', 'Entrepreneurship'];
    }
  }

  /**
   * Health check for Firebase
   */
  async healthCheck() {
    try {
      // Test Firestore connection
      await this.db.collection('health').limit(1).get();
      
      return {
        status: 'healthy',
        initialized: this.initialized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        initialized: this.initialized,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Shutdown Firebase service
   */
  async shutdown() {
    logger.info('Shutting down Firebase service...');
    if (this.initialized) {
      // Firebase Admin doesn't need explicit cleanup
      this.initialized = false;
    }
  }
}

module.exports = new FirebaseService();