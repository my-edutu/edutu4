"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizationRouter = void 0;
const express_1 = require("express");
const aiService_1 = require("../services/aiService");
const cvService_1 = require("../services/cvService");
const rateLimiter_1 = require("../middleware/rateLimiter");
const optimizationValidator_1 = require("../validators/optimizationValidator");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
exports.optimizationRouter = (0, express_1.Router)();
const aiService = new aiService_1.AIService();
const cvService = new cvService_1.CVService();
/**
 * Optimize CV with AI suggestions
 * POST /api/optimize/cv
 */
exports.optimizationRouter.post('/cv', rateLimiter_1.aiRateLimit, optimizationValidator_1.validateOptimization, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId, jobDescription, industry, targetRole } = req.body;
    if (!cvId) {
        throw new errors_1.AppError('CV ID is required', 400);
    }
    logger_1.logger.info('CV optimization requested', {
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
            throw new errors_1.AppError('CV not found', 404);
        }
        // Run AI optimization
        const optimization = await aiService.optimizeCV(cv.extractedText, jobDescription, industry, targetRole);
        // Save optimization results
        const savedOptimization = await cvService.saveOptimization(cvId, userId, Object.assign(Object.assign({ optimizationId: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }, optimization), { jobDescription,
            industry,
            targetRole, createdAt: new Date() }));
        logger_1.logger.info('CV optimization completed', {
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
    }
    catch (error) {
        logger_1.logger.error('CV optimization failed', {
            userId,
            cvId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('CV optimization failed', 500);
    }
}));
/**
 * Get optimization history for a CV
 * GET /api/optimize/cv/:cvId/history
 */
exports.optimizationRouter.get('/cv/:cvId/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId } = req.params;
    logger_1.logger.info('Optimization history requested', { userId, cvId });
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
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch optimization history', {
            userId,
            cvId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new errors_1.AppError('Failed to fetch optimization history', 500);
    }
}));
/**
 * Get specific optimization result
 * GET /api/optimize/:optimizationId
 */
exports.optimizationRouter.get('/:optimizationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { optimizationId } = req.params;
    logger_1.logger.info('Optimization details requested', { userId, optimizationId });
    try {
        const optimization = await cvService.getOptimizationById(optimizationId, userId);
        if (!optimization) {
            throw new errors_1.AppError('Optimization not found', 404);
        }
        res.json({
            success: true,
            data: optimization
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch optimization details', {
            userId,
            optimizationId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to fetch optimization details', 500);
    }
}));
/**
 * Generate industry-specific tips
 * POST /api/optimize/industry-tips
 */
exports.optimizationRouter.post('/industry-tips', rateLimiter_1.aiRateLimit, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { industry, role, experienceLevel = 'mid-level' } = req.body;
    if (!industry || !role) {
        throw new errors_1.AppError('Industry and role are required', 400);
    }
    logger_1.logger.info('Industry tips requested', {
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
    }
    catch (error) {
        logger_1.logger.error('Failed to generate industry tips', {
            userId,
            industry,
            role,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new errors_1.AppError('Failed to generate industry tips', 500);
    }
}));
/**
 * Apply optimization suggestions to create improved version
 * POST /api/optimize/apply
 */
exports.optimizationRouter.post('/apply', rateLimiter_1.aiRateLimit, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId, optimizationId, selectedSuggestions } = req.body;
    if (!cvId || !optimizationId) {
        throw new errors_1.AppError('CV ID and optimization ID are required', 400);
    }
    logger_1.logger.info('Optimization application requested', {
        userId,
        cvId,
        optimizationId,
        selectedSuggestionsCount: (selectedSuggestions === null || selectedSuggestions === void 0 ? void 0 : selectedSuggestions.length) || 0
    });
    try {
        // Get the CV and optimization
        const cv = await cvService.getCVById(cvId, userId);
        const optimization = await cvService.getOptimizationById(optimizationId, userId);
        if (!cv || !optimization) {
            throw new errors_1.AppError('CV or optimization not found', 404);
        }
        // Apply selected suggestions (this would typically involve more sophisticated text processing)
        const appliedOptimization = await cvService.applyOptimizations(cvId, userId, optimizationId, selectedSuggestions || optimization.suggestions.map(s => s.title));
        logger_1.logger.info('Optimization applied successfully', {
            userId,
            cvId,
            optimizationId,
            appliedSuggestionsCount: (selectedSuggestions === null || selectedSuggestions === void 0 ? void 0 : selectedSuggestions.length) || optimization.suggestions.length
        });
        res.json({
            success: true,
            data: {
                appliedOptimization,
                message: 'Optimization suggestions have been applied to your CV'
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to apply optimization', {
            userId,
            cvId,
            optimizationId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to apply optimization', 500);
    }
}));
/**
 * Compare CV versions (original vs optimized)
 * GET /api/optimize/compare/:cvId/:optimizationId
 */
exports.optimizationRouter.get('/compare/:cvId/:optimizationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId, optimizationId } = req.params;
    logger_1.logger.info('CV comparison requested', { userId, cvId, optimizationId });
    try {
        const comparison = await cvService.compareVersions(cvId, optimizationId, userId);
        if (!comparison) {
            throw new errors_1.AppError('CV or optimization not found', 404);
        }
        res.json({
            success: true,
            data: comparison
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to compare CV versions', {
            userId,
            cvId,
            optimizationId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to compare CV versions', 500);
    }
}));
/**
 * Generate optimized CV download
 * POST /api/optimize/generate-download
 */
exports.optimizationRouter.post('/generate-download', rateLimiter_1.aiRateLimit, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId, optimizationId, format = 'pdf' } = req.body;
    if (!cvId || !optimizationId) {
        throw new errors_1.AppError('CV ID and optimization ID are required', 400);
    }
    logger_1.logger.info('Optimized CV download generation requested', {
        userId,
        cvId,
        optimizationId,
        format
    });
    try {
        const downloadInfo = await cvService.generateOptimizedDownload(cvId, optimizationId, userId, format);
        res.json({
            success: true,
            data: {
                downloadUrl: downloadInfo.downloadUrl,
                fileName: downloadInfo.fileName,
                format: downloadInfo.format,
                expiresAt: downloadInfo.expiresAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate optimized CV download', {
            userId,
            cvId,
            optimizationId,
            format,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to generate optimized CV download', 500);
    }
}));
/**
 * Get optimization analytics for user
 * GET /api/optimize/analytics
 */
exports.optimizationRouter.get('/analytics', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    logger_1.logger.info('Optimization analytics requested', { userId });
    try {
        const analytics = await cvService.getOptimizationAnalytics(userId);
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch optimization analytics', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new errors_1.AppError('Failed to fetch optimization analytics', 500);
    }
}));
//# sourceMappingURL=optimization.js.map