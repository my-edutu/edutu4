/**
 * Roadmaps API Routes - Firebase Functions Version
 * Handles personalized roadmap generation and management
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as admin from 'firebase-admin';
import { verifyFirebaseToken, requireOwnership } from '../utils/auth';
import { generateRoadmap } from '../services/aiService';
import { 
  getAllScholarships,
  getUserProfile,
  saveUserRoadmap,
  getUserRoadmaps,
  updateRoadmapProgress,
} from '../utils/firebase';

export function createRoadmapRouter(): Router {
  const router = Router();

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

      console.log(`Generating roadmap for user ${userId}, opportunity ${opportunityId}`);

      // Get user profile
      const userProfile = await getUserProfile(userId);
      
      // Get opportunity details
      const scholarships = await getAllScholarships();
      const opportunity = scholarships.find((s: any) => s.id === opportunityId);
      
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

      console.log(`Roadmap generated and saved for user ${userId}`);

      res.json({
        success: true,
        roadmap: savedRoadmap,
        message: 'Personalized roadmap generated successfully'
      });

    } catch (error: any) {
      console.error('Error generating roadmap:', error);
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
      const { status, limit = '50' } = req.query;

      console.log(`Fetching roadmaps for user ${userId}`);

      const roadmaps = await getUserRoadmaps(userId);
      
      // Filter by status if provided
      let filteredRoadmaps = roadmaps;
      if (status) {
        filteredRoadmaps = roadmaps.filter((r: any) => r.status === status);
      }
      
      // Apply limit
      filteredRoadmaps = filteredRoadmaps.slice(0, parseInt(limit as string));

      res.json({
        success: true,
        roadmaps: filteredRoadmaps,
        total: filteredRoadmaps.length,
        filters: { status, limit }
      });

    } catch (error: any) {
      console.error('Error fetching user roadmaps:', error);
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

      console.log(`Updating milestone ${milestoneId} in roadmap ${roadmapId}: ${isCompleted ? 'completed' : 'incomplete'}`);

      const result = await updateRoadmapProgress(roadmapId, milestoneId, isCompleted);

      res.json({
        success: true,
        progress: result.progress,
        milestones: result.milestones,
        message: `Milestone ${isCompleted ? 'completed' : 'marked incomplete'}`
      });

    } catch (error: any) {
      console.error('Error updating roadmap progress:', error);
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

      console.log(`Fetching roadmap ${roadmapId}`);

      // Get roadmap from Firestore
      const db = admin.firestore();
      const roadmapDoc = await db.collection('userRoadmaps').doc(roadmapId).get();

      if (!roadmapDoc.exists) {
        return res.status(404).json({
          error: 'Roadmap not found',
          roadmapId
        });
      }

      const data = roadmapDoc.data();
      const roadmap = {
        id: roadmapDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
      };

      res.json({
        success: true,
        roadmap
      });

    } catch (error: any) {
      console.error('Error fetching roadmap:', error);
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

      console.log(`Deleting roadmap ${roadmapId}`);

      const db = admin.firestore();
      await db.collection('userRoadmaps').doc(roadmapId).delete();

      res.json({
        success: true,
        message: 'Roadmap deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting roadmap:', error);
      res.status(500).json({
        error: 'Failed to delete roadmap',
        message: error.message
      });
    }
  });

  return router;
}