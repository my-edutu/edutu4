/**
 * Recommendations API Routes - Firebase Functions Version
 * Handles AI-powered opportunity recommendations using vector embeddings
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { verifyFirebaseToken, requireOwnership } from '../utils/auth';
import { generateEmbeddings } from '../services/aiService';
import {
  storeUserPreferencesEmbedding,
  getUserRecommendations,
  findSimilarScholarships,
  getEmbeddingStats,
} from '../utils/supabase';
import {
  getAllScholarships,
  getUserProfile,
} from '../utils/firebase';

export function createRecommendationRouter(): Router {
  const router = Router();

  /**
   * Get personalized recommendations for a user
   * GET /api/recommendations/user/:userId
   */
  router.get('/user/:userId', verifyFirebaseToken, requireOwnership, [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
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
      const limit = parseInt(req.query.limit as string) || 3;

      console.log(`Getting recommendations for user ${userId}`);

      // Get recommendations from vector database
      const recommendations = await getUserRecommendations(userId, limit);

      if (recommendations.length === 0) {
        // Fallback: Generate recommendations if none exist
        await generateUserRecommendations(userId);
        const fallbackRecommendations = await getUserRecommendations(userId, limit);
        
        return res.json({
          success: true,
          recommendations: fallbackRecommendations,
          message: 'Generated fresh recommendations',
          fresh: true
        });
      }

      res.json({
        success: true,
        recommendations,
        total: recommendations.length
      });

    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        error: 'Failed to get recommendations',
        message: error.message
      });
    }
  });

  /**
   * Generate fresh recommendations for a user
   * POST /api/recommendations/user/:userId/refresh
   */
  router.post('/user/:userId/refresh', verifyFirebaseToken, requireOwnership, [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
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

      console.log(`Refreshing recommendations for user ${userId}`);

      await generateUserRecommendations(userId);

      const recommendations = await getUserRecommendations(userId, 5);

      res.json({
        success: true,
        recommendations,
        message: 'Recommendations refreshed successfully',
        refreshedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error refreshing recommendations:', error);
      res.status(500).json({
        error: 'Failed to refresh recommendations',
        message: error.message
      });
    }
  });

  /**
   * Find similar scholarships to a given scholarship
   * GET /api/recommendations/similar/:scholarshipId
   */
  router.get('/similar/:scholarshipId', [
    param('scholarshipId').isString().notEmpty().withMessage('Scholarship ID is required'),
    query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10'),
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { scholarshipId } = req.params;
      const limit = parseInt(req.query.limit as string) || 3;

      console.log(`Finding similar scholarships to ${scholarshipId}`);

      const similarScholarships = await findSimilarScholarships(scholarshipId, limit);

      res.json({
        success: true,
        similar: similarScholarships,
        total: similarScholarships.length,
        sourceId: scholarshipId
      });

    } catch (error: any) {
      console.error('Error finding similar scholarships:', error);
      res.status(500).json({
        error: 'Failed to find similar scholarships',
        message: error.message
      });
    }
  });

  /**
   * Get recommendation system statistics
   * GET /api/recommendations/stats
   */
  router.get('/stats', async (req, res) => {
    try {
      console.log('Getting embedding statistics');

      const stats = await getEmbeddingStats();

      res.json({
        success: true,
        stats
      });

    } catch (error: any) {
      console.error('Error getting recommendation stats:', error);
      res.status(500).json({
        error: 'Failed to get recommendation stats',
        message: error.message
      });
    }
  });

  return router;
}

/**
 * Helper function to generate recommendations for a user
 */
async function generateUserRecommendations(userId: string): Promise<void> {
  try {
    // Get user profile
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      throw new Error(`User profile not found for ${userId}`);
    }

    // Generate embedding for user preferences
    const preferencesText = `
      Education Level: ${userProfile.preferences?.educationLevel || 'Not specified'}
      Career Interests: ${userProfile.preferences?.careerInterests?.join(', ') || 'Not specified'}
      Learning Style: ${userProfile.preferences?.learningStyle || 'Not specified'}
      Time Availability: ${userProfile.preferences?.timeAvailability || 'Not specified'}
      Goals: ${userProfile.preferences?.currentGoals || 'Not specified'}
      Skills: ${userProfile.preferences?.skillsToImprove?.join(', ') || 'Not specified'}
    `.trim();

    const embedding = await generateEmbeddings(preferencesText);
    
    // Store in Supabase vector database
    await storeUserPreferencesEmbedding(userId, embedding, userProfile);
    
    console.log(`Generated and stored recommendations for user ${userId}`);
  } catch (error) {
    console.error(`Error generating recommendations for user ${userId}:`, error);
    throw error;
  }
}