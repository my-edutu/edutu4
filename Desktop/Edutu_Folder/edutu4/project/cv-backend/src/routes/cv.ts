import { Router, Request, Response } from 'express';
import { CVService } from '../services/cvService';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export const cvRouter = Router();
const cvService = new CVService();

/**
 * Get all CVs for authenticated user
 * GET /api/cv
 */
cvRouter.get('/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const limit = parseInt(req.query.limit as string) || 50;

    logger.info('Get user CVs requested', { userId, limit });

    try {
      const cvs = await cvService.getUserCVs(userId, limit);

      res.json({
        success: true,
        data: {
          cvs,
          count: cvs.length,
          userId
        }
      });
    } catch (error) {
      logger.error('Failed to get user CVs', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to retrieve CVs', 500);
    }
  })
);

/**
 * Get specific CV by ID
 * GET /api/cv/:cvId
 */
cvRouter.get('/:cvId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId } = req.params;

    logger.info('Get CV details requested', { userId, cvId });

    try {
      const cv = await cvService.getCVById(cvId, userId);

      if (!cv) {
        throw new AppError('CV not found', 404);
      }

      res.json({
        success: true,
        data: cv
      });
    } catch (error) {
      logger.error('Failed to get CV details', {
        userId,
        cvId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to retrieve CV', 500);
    }
  })
);

/**
 * Update CV metadata
 * PUT /api/cv/:cvId
 */
cvRouter.put('/:cvId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId } = req.params;
    const { originalName, tags } = req.body;

    logger.info('Update CV requested', { userId, cvId });

    try {
      const updates: any = {};
      if (originalName) updates.originalName = originalName;
      if (tags && Array.isArray(tags)) updates.tags = tags;

      const updatedCV = await cvService.updateCV(cvId, userId, updates);

      res.json({
        success: true,
        data: updatedCV,
        message: 'CV updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update CV', {
        userId,
        cvId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update CV', 500);
    }
  })
);

/**
 * Delete CV
 * DELETE /api/cv/:cvId
 */
cvRouter.delete('/:cvId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId } = req.params;

    logger.info('Delete CV requested', { userId, cvId });

    try {
      const success = await cvService.deleteCV(cvId, userId);

      if (!success) {
        throw new AppError('CV not found or already deleted', 404);
      }

      res.json({
        success: true,
        message: 'CV deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete CV', {
        userId,
        cvId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to delete CV', 500);
    }
  })
);

/**
 * Get CV analytics
 * GET /api/cv/analytics/summary
 */
cvRouter.get('/analytics/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;

    logger.info('CV analytics requested', { userId });

    try {
      const cvs = await cvService.getUserCVs(userId);
      
      const analytics = {
        totalCVs: cvs.length,
        uploadedThisMonth: cvs.filter(cv => {
          const uploadDate = new Date(cv.uploadedAt);
          const now = new Date();
          return uploadDate.getMonth() === now.getMonth() && 
                 uploadDate.getFullYear() === now.getFullYear();
        }).length,
        fileTypes: cvs.reduce((acc: any, cv) => {
          const type = cv.fileMetadata.mimeType.includes('pdf') ? 'PDF' : 'DOCX';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        averageFileSize: cvs.length > 0 ? 
          Math.round(cvs.reduce((sum, cv) => sum + cv.fileMetadata.size, 0) / cvs.length / 1024) : 0,
        processingMethods: cvs.reduce((acc: any, cv) => {
          const method = cv.fileMetadata.processingMetadata?.method || 'unknown';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {}),
        mostRecentUpload: cvs.length > 0 ? cvs[0].uploadedAt : null
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get CV analytics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to retrieve CV analytics', 500);
    }
  })
);