/**
 * Recommendations API Routes
 * Handles AI-powered opportunity recommendations using vector embeddings
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyFirebaseToken, requireOwnership, optionalAuth } = require('../middleware/auth');
const { 
  generateEmbeddings,
} = require('../config/ai');
const {
  storeUserPreferencesEmbedding,
  getUserRecommendations,
  findSimilarScholarships,
  getEmbeddingStats,
} = require('../config/supabase');
const {
  getAllScholarships,
  getUserProfile,
} = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

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
    const limit = parseInt(req.query.limit) || 3;

    logger.info(`Getting recommendations for user ${userId}`);

    // Get recommendations from vector database
    const recommendations = await getUserRecommendations(userId, limit);

    if (recommendations.length === 0) {
      // If no vector recommendations, try to generate user embedding first
      try {
        await updateUserEmbedding(userId);
        const retryRecommendations = await getUserRecommendations(userId, limit);
        
        if (retryRecommendations.length > 0) {
          return res.json({
            success: true,
            recommendations: retryRecommendations,
            total: retryRecommendations.length,
            message: 'Recommendations generated after embedding update'
          });
        }
      } catch (embeddingError) {
        logger.warn('Failed to generate user embedding:', embeddingError);
      }
      
      // Fallback to recent scholarships
      const scholarships = await getAllScholarships(limit);
      return res.json({
        success: true,
        recommendations: scholarships.map(s => ({
          scholarship_id: s.id,
          title: s.title,
          summary: s.summary,
          category: s.category,
          provider: s.provider,
          similarity: 0.5, // Default similarity for fallback
        })),
        total: scholarships.length,
        message: 'Showing recent opportunities (recommendations will improve as you interact more)'
      });
    }

    res.json({
      success: true,
      recommendations,
      total: recommendations.length,
      message: 'Personalized recommendations based on your profile'
    });

  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
});

/**
 * Update user preferences embedding
 * POST /api/recommendations/user/:userId/update-preferences
 */
router.post('/user/:userId/update-preferences', [
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

    logger.info(`Updating preferences embedding for user ${userId}`);

    await updateUserEmbedding(userId);

    res.json({
      success: true,
      message: 'User preferences embedding updated successfully'
    });

  } catch (error) {
    logger.error('Error updating user preferences embedding:', error);
    res.status(500).json({
      error: 'Failed to update preferences embedding',
      message: error.message
    });
  }
});

/**
 * Find similar opportunities to a given opportunity
 * GET /api/recommendations/similar/:opportunityId
 */
router.get('/similar/:opportunityId', [
  param('opportunityId').isString().notEmpty().withMessage('Opportunity ID is required'),
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

    const { opportunityId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    logger.debug(`Finding similar opportunities to ${opportunityId}`);

    // Get the opportunity details
    const scholarships = await getAllScholarships();
    const opportunity = scholarships.find(s => s.id === opportunityId);

    if (!opportunity) {
      return res.status(404).json({
        error: 'Opportunity not found',
        opportunityId
      });
    }

    // Generate embedding for the opportunity
    const opportunityText = `${opportunity.title} ${opportunity.summary} ${opportunity.category} ${opportunity.provider}`;
    const embedding = await generateEmbeddings(opportunityText);

    // Find similar opportunities
    const similarOpportunities = await findSimilarScholarships(embedding, limit + 1, 0.7);
    
    // Remove the original opportunity from results
    const filteredSimilar = similarOpportunities.filter(s => s.scholarship_id !== opportunityId);

    res.json({
      success: true,
      similar: filteredSimilar.slice(0, limit),
      total: filteredSimilar.length,
      reference: {
        id: opportunityId,
        title: opportunity.title
      }
    });

  } catch (error) {
    logger.error('Error finding similar opportunities:', error);
    res.status(500).json({
      error: 'Failed to find similar opportunities',
      message: error.message
    });
  }
});

/**
 * Search opportunities by text query
 * POST /api/recommendations/search
 */
router.post('/search', [
  body('query').isString().notEmpty().withMessage('Search query is required'),
  body('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  body('threshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Threshold must be between 0 and 1'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { query, limit = 10, threshold = 0.6 } = req.body;

    logger.info(`Searching opportunities with query: "${query}"`);

    // Generate embedding for search query
    const queryEmbedding = await generateEmbeddings(query);

    // Search similar opportunities
    const searchResults = await findSimilarScholarships(queryEmbedding, limit, threshold);

    res.json({
      success: true,
      results: searchResults,
      total: searchResults.length,
      query,
      threshold
    });

  } catch (error) {
    logger.error('Error searching opportunities:', error);
    res.status(500).json({
      error: 'Failed to search opportunities',
      message: error.message
    });
  }
});

/**
 * Get embedding statistics
 * GET /api/recommendations/stats
 */
router.get('/stats', async (req, res) => {
  try {
    logger.debug('Fetching embedding statistics');

    const stats = await getEmbeddingStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error getting embedding stats:', error);
    res.status(500).json({
      error: 'Failed to get embedding statistics',
      message: error.message
    });
  }
});

/**
 * Batch update scholarship embeddings
 * POST /api/recommendations/update-embeddings
 */
router.post('/update-embeddings', [
  body('force').optional().isBoolean(),
], async (req, res) => {
  try {
    const { force = false } = req.body;

    logger.info('Starting batch embedding update');

    // This is an admin operation - in production, add authentication
    const scholarships = await getAllScholarships();
    
    const { batchUpdateScholarshipEmbeddings } = require('../config/supabase');
    
    // Generate embeddings for all scholarships
    const texts = scholarships.map(s => 
      `${s.title} ${s.summary} ${s.category} ${s.provider} ${s.location}`
    );
    
    logger.info(`Generating embeddings for ${texts.length} scholarships`);
    const embeddings = await generateEmbeddings(texts);
    
    // Store in vector database
    await batchUpdateScholarshipEmbeddings(scholarships, embeddings);

    res.json({
      success: true,
      message: `Updated embeddings for ${scholarships.length} scholarships`,
      count: scholarships.length
    });

  } catch (error) {
    logger.error('Error updating embeddings:', error);
    res.status(500).json({
      error: 'Failed to update embeddings',
      message: error.message
    });
  }
});

/**
 * Helper function to update user embedding
 */
async function updateUserEmbedding(userId) {
  try {
    const userProfile = await getUserProfile(userId);
    const preferences = userProfile.preferences || {};
    
    // Create text representation of user preferences
    const userText = [
      preferences.educationLevel,
      preferences.careerInterests?.join(' '),
      preferences.learningStyle,
      preferences.timeAvailability,
      preferences.currentSkills?.join(' '),
      preferences.careerGoals?.join(' '),
      preferences.preferredLocations?.join(' ')
    ].filter(Boolean).join(' ');
    
    if (!userText.trim()) {
      throw new Error('No user preferences found to generate embedding');
    }
    
    // Generate embedding
    const embedding = await generateEmbeddings(userText);
    
    // Store in vector database
    await storeUserPreferencesEmbedding(userId, embedding, preferences);
    
    logger.info(`Updated embedding for user ${userId}`);
  } catch (error) {
    logger.error(`Error updating user embedding for ${userId}:`, error);
    throw error;
  }
}

module.exports = router;