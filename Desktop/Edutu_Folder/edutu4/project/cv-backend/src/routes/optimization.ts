import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { CVService } from '../services/cvService';
import { aiRateLimit } from '../middleware/rateLimiter';
import { validateOptimization } from '../validators/optimizationValidator';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export const optimizationRouter = Router();
const aiService = new AIService();
const cvService = new CVService();

/**
 * Optimize CV with AI suggestions
 * POST /api/optimize/cv
 */
optimizationRouter.post('/cv',
  aiRateLimit,
  validateOptimization,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, jobDescription, industry, targetRole } = req.body;

    if (!cvId) {
      throw new AppError('CV ID is required', 400);
    }

    logger.info('CV optimization requested', {
      userId,
      cvId,
      hasJobDescription: !!jobDescription,
      industry,
      targetRole
    });

    try {
      // Get the CV
      const cv = await cvService.getCVById(cvId, userId);
      if (!cv) {
        throw new AppError('CV not found', 404);
      }

      // Run AI optimization
      const optimization = await aiService.optimizeCV(
        cv.extractedText,
        jobDescription,
        industry,
        targetRole
      );

      // Save optimization results
      const savedOptimization = await cvService.saveOptimization(cvId, userId, {
        optimizationId: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...optimization,
        jobDescription,
        industry,
        targetRole,
        createdAt: new Date()
      });

      logger.info('CV optimization completed', {
        userId,
        cvId,
        overallScore: optimization.overallScore,
        suggestionCount: optimization.suggestions.length,
        optimizationId: savedOptimization.optimizationId
      });

      res.json({
        success: true,
        data: {
          optimization: savedOptimization,
          summary: {
            overallScore: optimization.overallScore,
            totalSuggestions: optimization.suggestions.length,
            criticalIssues: optimization.suggestions.filter(s => s.severity === 'critical').length,
            highPriorityIssues: optimization.suggestions.filter(s => s.severity === 'high').length,
            keywordAnalysis: {
              currentKeywordsCount: optimization.keywordAnalysis.currentKeywords.length,
              missingKeywordsCount: optimization.keywordAnalysis.missingKeywords.length
            }
          }
        }
      });

    } catch (error) {
      logger.error('CV optimization failed', {
        userId,
        cvId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('CV optimization failed', 500);
    }
  })
);

/**
 * Get optimization history for a CV
 * GET /api/optimize/cv/:cvId/history
 */
optimizationRouter.get('/cv/:cvId/history',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId } = req.params;

    logger.info('Optimization history requested', { userId, cvId });

    try {
      const history = await cvService.getOptimizationHistory(cvId, userId);
      
      res.json({
        success: true,
        data: {
          cvId,
          optimizations: history,
          count: history.length
        }
      });

    } catch (error) {
      logger.error('Failed to fetch optimization history', {
        userId,
        cvId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to fetch optimization history', 500);
    }
  })
);

/**
 * Get specific optimization result
 * GET /api/optimize/:optimizationId
 */
optimizationRouter.get('/:optimizationId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { optimizationId } = req.params;

    logger.info('Optimization details requested', { userId, optimizationId });

    try {
      const optimization = await cvService.getOptimizationById(optimizationId, userId);
      
      if (!optimization) {
        throw new AppError('Optimization not found', 404);
      }

      res.json({
        success: true,
        data: optimization
      });

    } catch (error) {
      logger.error('Failed to fetch optimization details', {
        userId,
        optimizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to fetch optimization details', 500);
    }
  })
);

/**
 * Generate industry-specific tips
 * POST /api/optimize/industry-tips
 */
optimizationRouter.post('/industry-tips',
  aiRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { industry, role, experienceLevel = 'mid-level' } = req.body;

    if (!industry || !role) {
      throw new AppError('Industry and role are required', 400);
    }

    logger.info('Industry tips requested', {
      userId,
      industry,
      role,
      experienceLevel
    });

    try {
      const tips = await aiService.getIndustryTips(industry, role, experienceLevel);

      res.json({
        success: true,
        data: {
          industry,
          role,
          experienceLevel,
          tips,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to generate industry tips', {
        userId,
        industry,
        role,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to generate industry tips', 500);
    }
  })
);

/**
 * Apply optimization suggestions to create improved version
 * POST /api/optimize/apply
 */
optimizationRouter.post('/apply',
  aiRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, optimizationId, selectedSuggestions } = req.body;

    if (!cvId || !optimizationId) {
      throw new AppError('CV ID and optimization ID are required', 400);
    }

    logger.info('Optimization application requested', {
      userId,
      cvId,
      optimizationId,
      selectedSuggestionsCount: selectedSuggestions?.length || 0
    });

    try {
      // Get the CV and optimization
      const cv = await cvService.getCVById(cvId, userId);
      const optimization = await cvService.getOptimizationById(optimizationId, userId);

      if (!cv || !optimization) {
        throw new AppError('CV or optimization not found', 404);
      }

      // Apply selected suggestions (this would typically involve more sophisticated text processing)
      const appliedOptimization = await cvService.applyOptimizations(
        cvId,
        userId,
        optimizationId,
        selectedSuggestions || optimization.suggestions.map(s => s.title)
      );

      logger.info('Optimization applied successfully', {
        userId,
        cvId,
        optimizationId,
        appliedSuggestionsCount: selectedSuggestions?.length || optimization.suggestions.length
      });

      res.json({
        success: true,
        data: {
          appliedOptimization,
          message: 'Optimization suggestions have been applied to your CV'
        }
      });

    } catch (error) {
      logger.error('Failed to apply optimization', {
        userId,
        cvId,
        optimizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to apply optimization', 500);
    }
  })
);

/**
 * Compare CV versions (original vs optimized)
 * GET /api/optimize/compare/:cvId/:optimizationId
 */
optimizationRouter.get('/compare/:cvId/:optimizationId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, optimizationId } = req.params;

    logger.info('CV comparison requested', { userId, cvId, optimizationId });

    try {
      const comparison = await cvService.compareVersions(cvId, optimizationId, userId);

      if (!comparison) {
        throw new AppError('CV or optimization not found', 404);
      }

      res.json({
        success: true,
        data: comparison
      });

    } catch (error) {
      logger.error('Failed to compare CV versions', {
        userId,
        cvId,
        optimizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to compare CV versions', 500);
    }
  })
);

/**
 * Generate optimized CV download
 * POST /api/optimize/generate-download
 */
optimizationRouter.post('/generate-download',
  aiRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, optimizationId, format = 'pdf' } = req.body;

    if (!cvId || !optimizationId) {
      throw new AppError('CV ID and optimization ID are required', 400);
    }

    logger.info('Optimized CV download generation requested', {
      userId,
      cvId,
      optimizationId,
      format
    });

    try {
      const downloadInfo = await cvService.generateOptimizedDownload(
        cvId,
        optimizationId,
        userId,
        format
      );

      res.json({
        success: true,
        data: {
          downloadUrl: downloadInfo.downloadUrl,
          fileName: downloadInfo.fileName,
          format: downloadInfo.format,
          expiresAt: downloadInfo.expiresAt
        }
      });

    } catch (error) {
      logger.error('Failed to generate optimized CV download', {
        userId,
        cvId,
        optimizationId,
        format,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to generate optimized CV download', 500);
    }
  })
);

/**
 * Get optimization analytics for user
 * GET /api/optimize/analytics
 */
optimizationRouter.get('/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;

    logger.info('Optimization analytics requested', { userId });

    try {
      const analytics = await cvService.getOptimizationAnalytics(userId);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Failed to fetch optimization analytics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to fetch optimization analytics', 500);
    }
  })
);