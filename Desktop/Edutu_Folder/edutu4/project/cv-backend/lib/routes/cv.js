"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cvRouter = void 0;
const express_1 = require("express");
const cvService_1 = require("../services/cvService");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
exports.cvRouter = (0, express_1.Router)();
const cvService = new cvService_1.CVService();
/**
 * Get all CVs for authenticated user
 * GET /api/cv
 */
exports.cvRouter.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 50;
    logger_1.logger.info('Get user CVs requested', { userId, limit });
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get user CVs', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new errors_1.AppError('Failed to retrieve CVs', 500);
    }
}));
/**
 * Get specific CV by ID
 * GET /api/cv/:cvId
 */
exports.cvRouter.get('/:cvId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId } = req.params;
    logger_1.logger.info('Get CV details requested', { userId, cvId });
    try {
        const cv = await cvService.getCVById(cvId, userId);
        if (!cv) {
            throw new errors_1.AppError('CV not found', 404);
        }
        res.json({
            success: true,
            data: cv
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get CV details', {
            userId,
            cvId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to retrieve CV', 500);
    }
}));
/**
 * Update CV metadata
 * PUT /api/cv/:cvId
 */
exports.cvRouter.put('/:cvId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId } = req.params;
    const { originalName, tags } = req.body;
    logger_1.logger.info('Update CV requested', { userId, cvId });
    try {
        const updates = {};
        if (originalName)
            updates.originalName = originalName;
        if (tags && Array.isArray(tags))
            updates.tags = tags;
        const updatedCV = await cvService.updateCV(cvId, userId, updates);
        res.json({
            success: true,
            data: updatedCV,
            message: 'CV updated successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update CV', {
            userId,
            cvId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to update CV', 500);
    }
}));
/**
 * Delete CV
 * DELETE /api/cv/:cvId
 */
exports.cvRouter.delete('/:cvId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId } = req.params;
    logger_1.logger.info('Delete CV requested', { userId, cvId });
    try {
        const success = await cvService.deleteCV(cvId, userId);
        if (!success) {
            throw new errors_1.AppError('CV not found or already deleted', 404);
        }
        res.json({
            success: true,
            message: 'CV deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete CV', {
            userId,
            cvId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to delete CV', 500);
    }
}));
/**
 * Get CV analytics
 * GET /api/cv/analytics/summary
 */
exports.cvRouter.get('/analytics/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    logger_1.logger.info('CV analytics requested', { userId });
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
            fileTypes: cvs.reduce((acc, cv) => {
                const type = cv.fileMetadata.mimeType.includes('pdf') ? 'PDF' : 'DOCX';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
            averageFileSize: cvs.length > 0 ?
                Math.round(cvs.reduce((sum, cv) => sum + cv.fileMetadata.size, 0) / cvs.length / 1024) : 0,
            processingMethods: cvs.reduce((acc, cv) => {
                var _a;
                const method = ((_a = cv.fileMetadata.processingMetadata) === null || _a === void 0 ? void 0 : _a.method) || 'unknown';
                acc[method] = (acc[method] || 0) + 1;
                return acc;
            }, {}),
            mostRecentUpload: cvs.length > 0 ? cvs[0].uploadedAt : null
        };
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get CV analytics', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new errors_1.AppError('Failed to retrieve CV analytics', 500);
    }
}));
//# sourceMappingURL=cv.js.map