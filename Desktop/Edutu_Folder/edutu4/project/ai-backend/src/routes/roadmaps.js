/**
 * Roadmaps API Routes
 * Handles personalized roadmap generation and management
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyFirebaseToken, requireOwnership, optionalAuth } = require('../middleware/auth');
const { 
  generateRoadmap,
} = require('../config/ai');
const {
  getAllScholarships,
  getUserProfile,
  saveUserRoadmap,
  getUserRoadmaps,
  updateRoadmapProgress,
} = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Generate personalized roadmap for an opportunity
 * POST /api/roadmaps/generate
 */
router.post('/generate', verifyFirebaseToken, requireOwnership, [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('opportunityId').isString().notEmpty().withMessage('Opportunity ID is required'),
  body('options').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, opportunityId, options = {} } = req.body;

    logger.info(`Generating roadmap for user ${userId}, opportunity ${opportunityId}`);

    // Get user profile
    const userProfile = await getUserProfile(userId);
    
    // Get opportunity details
    const scholarships = await getAllScholarships();
    const opportunity = scholarships.find(s => s.id === opportunityId);
    
    if (!opportunity) {
      return res.status(404).json({
        error: 'Opportunity not found',
        opportunityId
      });
    }

    // Generate AI roadmap
    const roadmapData = await generateRoadmap(opportunity, userProfile, options);
    
    // Save to Firestore
    const savedRoadmap = await saveUserRoadmap(userId, roadmapData);

    logger.info(`Roadmap generated and saved for user ${userId}`);

    res.json({
      success: true,
      roadmap: savedRoadmap,
      message: 'Personalized roadmap generated successfully'
    });

  } catch (error) {
    logger.error('Error generating roadmap:', error);
    res.status(500).json({
      error: 'Failed to generate roadmap',
      message: error.message
    });
  }
});

/**
 * Get user's roadmaps
 * GET /api/roadmaps/user/:userId
 */
router.get('/user/:userId', verifyFirebaseToken, requireOwnership, [
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
    const { status, limit = 50 } = req.query;

    logger.debug(`Fetching roadmaps for user ${userId}`);

    const roadmaps = await getUserRoadmaps(userId);
    
    // Filter by status if provided
    let filteredRoadmaps = roadmaps;
    if (status) {
      filteredRoadmaps = roadmaps.filter(r => r.status === status);
    }
    
    // Apply limit
    filteredRoadmaps = filteredRoadmaps.slice(0, parseInt(limit));

    res.json({
      success: true,
      roadmaps: filteredRoadmaps,
      total: filteredRoadmaps.length,
      filters: { status, limit }
    });

  } catch (error) {
    logger.error('Error fetching user roadmaps:', error);
    res.status(500).json({
      error: 'Failed to fetch roadmaps',
      message: error.message
    });
  }
});

/**
 * Update roadmap milestone progress
 * PUT /api/roadmaps/:roadmapId/milestones/:milestoneId
 */
router.put('/:roadmapId/milestones/:milestoneId', [
  param('roadmapId').isString().notEmpty().withMessage('Roadmap ID is required'),
  param('milestoneId').isString().notEmpty().withMessage('Milestone ID is required'),
  body('isCompleted').isBoolean().withMessage('Completion status must be boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { roadmapId, milestoneId } = req.params;
    const { isCompleted } = req.body;

    logger.info(`Updating milestone ${milestoneId} in roadmap ${roadmapId}: ${isCompleted ? 'completed' : 'incomplete'}`);

    const result = await updateRoadmapProgress(roadmapId, milestoneId, isCompleted);

    res.json({
      success: true,
      progress: result.progress,
      milestones: result.milestones,
      message: `Milestone ${isCompleted ? 'completed' : 'marked incomplete'}`
    });

  } catch (error) {
    logger.error('Error updating roadmap progress:', error);
    res.status(500).json({
      error: 'Failed to update roadmap progress',
      message: error.message
    });
  }
});

/**
 * Get roadmap by ID
 * GET /api/roadmaps/:roadmapId
 */
router.get('/:roadmapId', [
  param('roadmapId').isString().notEmpty().withMessage('Roadmap ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { roadmapId } = req.params;

    logger.debug(`Fetching roadmap ${roadmapId}`);

    // Get roadmap from Firestore
    const { getFirestore } = require('../config/firebase');
    const db = getFirestore();
    const roadmapDoc = await db.collection('userRoadmaps').doc(roadmapId).get();

    if (!roadmapDoc.exists) {
      return res.status(404).json({
        error: 'Roadmap not found',
        roadmapId
      });
    }

    const roadmap = {
      id: roadmapDoc.id,
      ...roadmapDoc.data(),
      createdAt: roadmapDoc.data().createdAt?.toDate(),
      updatedAt: roadmapDoc.data().updatedAt?.toDate(),
    };

    res.json({
      success: true,
      roadmap
    });

  } catch (error) {
    logger.error('Error fetching roadmap:', error);
    res.status(500).json({
      error: 'Failed to fetch roadmap',
      message: error.message
    });
  }
});

/**
 * Delete roadmap
 * DELETE /api/roadmaps/:roadmapId
 */
router.delete('/:roadmapId', [
  param('roadmapId').isString().notEmpty().withMessage('Roadmap ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { roadmapId } = req.params;

    logger.info(`Deleting roadmap ${roadmapId}`);

    const { getFirestore } = require('../config/firebase');
    const db = getFirestore();
    await db.collection('userRoadmaps').doc(roadmapId).delete();

    res.json({
      success: true,
      message: 'Roadmap deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting roadmap:', error);
    res.status(500).json({
      error: 'Failed to delete roadmap',
      message: error.message
    });
  }
});

/**
 * Regenerate roadmap with new preferences
 * POST /api/roadmaps/:roadmapId/regenerate
 */
router.post('/:roadmapId/regenerate', [
  param('roadmapId').isString().notEmpty().withMessage('Roadmap ID is required'),
  body('options').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { roadmapId } = req.params;
    const { options = {} } = req.body;

    logger.info(`Regenerating roadmap ${roadmapId}`);

    // Get existing roadmap
    const { getFirestore } = require('../config/firebase');
    const db = getFirestore();
    const roadmapDoc = await db.collection('userRoadmaps').doc(roadmapId).get();

    if (!roadmapDoc.exists) {
      return res.status(404).json({
        error: 'Roadmap not found',
        roadmapId
      });
    }

    const existingRoadmap = roadmapDoc.data();
    const { userId, opportunityId } = existingRoadmap;

    // Get updated user profile and opportunity
    const userProfile = await getUserProfile(userId);
    const scholarships = await getAllScholarships();
    const opportunity = scholarships.find(s => s.id === opportunityId);

    if (!opportunity) {
      return res.status(404).json({
        error: 'Associated opportunity not found',
        opportunityId
      });
    }

    // Generate new roadmap
    const newRoadmapData = await generateRoadmap(opportunity, userProfile, options);

    // Update existing roadmap
    await db.collection('userRoadmaps').doc(roadmapId).update({
      ...newRoadmapData,
      updatedAt: new Date(),
      regeneratedAt: new Date(),
      version: (existingRoadmap.version || 1) + 1
    });

    res.json({
      success: true,
      message: 'Roadmap regenerated successfully',
      roadmapId
    });

  } catch (error) {
    logger.error('Error regenerating roadmap:', error);
    res.status(500).json({
      error: 'Failed to regenerate roadmap',
      message: error.message
    });
  }
});

module.exports = router;