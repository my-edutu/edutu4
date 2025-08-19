"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const Busboy = __importStar(require("busboy"));
const fileProcessor_1 = require("../services/fileProcessor");
const cvService_1 = require("../services/cvService");
const rateLimiter_1 = require("../middleware/rateLimiter");
const uploadValidator_1 = require("../validators/uploadValidator");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
exports.uploadRouter = (0, express_1.Router)();
const fileProcessor = new fileProcessor_1.FileProcessor();
const cvService = new cvService_1.CVService();
/**
 * Upload and process CV file
 * POST /api/upload/cv
 */
exports.uploadRouter.post('/cv', rateLimiter_1.uploadRateLimit, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    logger_1.logger.info('CV upload initiated', {
        userId,
        contentType: req.get('content-type')
    });
    try {
        const fileData = await parseMultipartFile(req);
        if (!fileData) {
            throw new errors_1.AppError('No file uploaded', 400);
        }
        // Process the uploaded file
        const processedFile = await fileProcessor.processFile(fileData, userId);
        // Save CV data to Firestore
        const cvData = await cvService.createCV({
            userId,
            originalName: processedFile.originalName,
            fileId: processedFile.id,
            extractedText: processedFile.text,
            fileMetadata: {
                size: processedFile.size,
                mimeType: processedFile.mimeType,
                downloadUrl: processedFile.downloadUrl,
                thumbnailUrl: processedFile.thumbnailUrl,
                processingMetadata: processedFile.metadata
            },
            confidence: processedFile.confidence,
            isProcessed: true,
            uploadedAt: new Date()
        });
        logger_1.logger.info('CV upload completed successfully', {
            userId,
            cvId: cvData.id,
            fileId: processedFile.id,
            processingTime: processedFile.metadata.processingTime,
            textLength: processedFile.text.length
        });
        res.status(201).json({
            success: true,
            data: {
                cv: cvData,
                file: processedFile,
                extractionSummary: {
                    wordCount: processedFile.metadata.wordCount,
                    characterCount: processedFile.metadata.characterCount,
                    confidence: processedFile.confidence,
                    method: processedFile.metadata.method,
                    processingTime: processedFile.metadata.processingTime
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('CV upload failed', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.FileProcessingError || error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('CV upload failed', 500);
    }
}));
/**
 * Scan CV from camera/image
 * POST /api/upload/scan
 */
exports.uploadRouter.post('/scan', rateLimiter_1.uploadRateLimit, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    logger_1.logger.info('CV scan initiated', { userId });
    try {
        const fileData = await parseMultipartFile(req);
        if (!fileData) {
            throw new errors_1.AppError('No image uploaded', 400);
        }
        // Validate that it's an image
        if (!fileData.mimeType.startsWith('image/')) {
            throw new errors_1.FileProcessingError('Only image files are allowed for scanning');
        }
        // Process the scanned image
        const processedFile = await fileProcessor.processFile(fileData, userId);
        // Check OCR confidence
        if (processedFile.confidence && processedFile.confidence < 70) {
            logger_1.logger.warn('Low OCR confidence detected', {
                userId,
                confidence: processedFile.confidence,
                fileName: fileData.originalName
            });
        }
        // Save scan data to Firestore
        const cvData = await cvService.createCV({
            userId,
            originalName: processedFile.originalName,
            fileId: processedFile.id,
            extractedText: processedFile.text,
            fileMetadata: {
                size: processedFile.size,
                mimeType: processedFile.mimeType,
                downloadUrl: processedFile.downloadUrl,
                thumbnailUrl: processedFile.thumbnailUrl,
                processingMetadata: processedFile.metadata
            },
            confidence: processedFile.confidence,
            isProcessed: true,
            isScanned: true,
            uploadedAt: new Date()
        });
        logger_1.logger.info('CV scan completed successfully', {
            userId,
            cvId: cvData.id,
            confidence: processedFile.confidence,
            textLength: processedFile.text.length
        });
        res.status(201).json({
            success: true,
            data: {
                cv: cvData,
                file: processedFile,
                scanResults: {
                    confidence: processedFile.confidence,
                    qualityAssessment: processedFile.confidence >= 80 ? 'excellent' :
                        processedFile.confidence >= 70 ? 'good' :
                            processedFile.confidence >= 60 ? 'fair' : 'poor',
                    wordCount: processedFile.metadata.wordCount,
                    characterCount: processedFile.metadata.characterCount,
                    recommendations: generateScanRecommendations(processedFile.confidence)
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('CV scan failed', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.FileProcessingError || error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('CV scan failed', 500);
    }
}));
/**
 * Convert CV file format
 * POST /api/upload/convert
 */
exports.uploadRouter.post('/convert', rateLimiter_1.uploadRateLimit, uploadValidator_1.validateUpload, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId, toFormat } = req.body;
    if (!cvId || !toFormat) {
        throw new errors_1.AppError('CV ID and target format are required', 400);
    }
    logger_1.logger.info('CV conversion initiated', { userId, cvId, toFormat });
    try {
        // Get existing CV
        const existingCV = await cvService.getCVById(cvId, userId);
        if (!existingCV) {
            throw new errors_1.AppError('CV not found', 404);
        }
        // Determine source format
        const fromFormat = existingCV.fileMetadata.mimeType.includes('pdf') ? 'pdf' : 'docx';
        if (fromFormat === toFormat) {
            throw new errors_1.AppError(`CV is already in ${toFormat} format`, 400);
        }
        // Convert file
        const convertedFile = await fileProcessor.convertFile(existingCV.extractedText, fromFormat, toFormat, userId, existingCV.fileMetadata);
        // Update CV with converted file info
        const updatedCV = await cvService.updateCV(cvId, userId, {
            convertedFiles: Object.assign(Object.assign({}, existingCV.convertedFiles), { [toFormat]: {
                    downloadUrl: convertedFile.downloadUrl,
                    mimeType: convertedFile.mimeType,
                    convertedAt: new Date()
                } })
        });
        logger_1.logger.info('CV conversion completed', {
            userId,
            cvId,
            fromFormat,
            toFormat
        });
        res.json({
            success: true,
            data: {
                cv: updatedCV,
                convertedFile: {
                    format: toFormat,
                    downloadUrl: convertedFile.downloadUrl,
                    mimeType: convertedFile.mimeType
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('CV conversion failed', {
            userId,
            cvId,
            toFormat,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof errors_1.AppError || error instanceof errors_1.FileProcessingError) {
            throw error;
        }
        throw new errors_1.AppError('CV conversion failed', 500);
    }
}));
/**
 * Delete uploaded CV
 * DELETE /api/upload/cv/:cvId
 */
exports.uploadRouter.delete('/cv/:cvId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { cvId } = req.params;
    logger_1.logger.info('CV deletion initiated', { userId, cvId });
    try {
        const success = await cvService.deleteCV(cvId, userId);
        if (!success) {
            throw new errors_1.AppError('CV not found or already deleted', 404);
        }
        logger_1.logger.info('CV deleted successfully', { userId, cvId });
        res.json({
            success: true,
            message: 'CV deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('CV deletion failed', {
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
 * Parse multipart file upload using Busboy
 */
function parseMultipartFile(req) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: req.headers,
            limits: {
                fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10) * 1024 * 1024,
                files: 1
            }
        });
        let fileData = null;
        busboy.on('file', (name, file, info) => {
            const { filename, mimeType } = info;
            const chunks = [];
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            file.on('end', () => {
                fileData = {
                    buffer: Buffer.concat(chunks),
                    originalName: filename,
                    mimeType: mimeType,
                    size: Buffer.concat(chunks).length
                };
            });
        });
        busboy.on('finish', () => {
            resolve(fileData);
        });
        busboy.on('error', (error) => {
            logger_1.logger.error('Busboy error', { error });
            reject(new errors_1.FileProcessingError('Failed to parse uploaded file'));
        });
        req.pipe(busboy);
    });
}
/**
 * Generate recommendations based on OCR confidence
 */
function generateScanRecommendations(confidence) {
    if (!confidence)
        return [];
    const recommendations = [];
    if (confidence < 80) {
        recommendations.push('Try scanning in better lighting conditions');
        recommendations.push('Ensure the document is flat and not wrinkled');
    }
    if (confidence < 70) {
        recommendations.push('Use a higher resolution camera or scanner');
        recommendations.push('Make sure the entire document is within the frame');
    }
    if (confidence < 60) {
        recommendations.push('Consider uploading a PDF or Word document instead');
        recommendations.push('Check if the document text is clear and readable');
    }
    return recommendations;
}
//# sourceMappingURL=upload.js.map