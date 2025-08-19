import { Router, Request, Response } from 'express';
import * as Busboy from 'busboy';
import { FileProcessor, FileUpload } from '../services/fileProcessor';
import { CVService } from '../services/cvService';
import { uploadRateLimit } from '../middleware/rateLimiter';
import { validateUpload } from '../validators/uploadValidator';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AppError, FileProcessingError } from '../utils/errors';

export const uploadRouter = Router();
const fileProcessor = new FileProcessor();
const cvService = new CVService();

/**
 * Upload and process CV file
 * POST /api/upload/cv
 */
uploadRouter.post('/cv', 
  uploadRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    
    logger.info('CV upload initiated', { 
      userId, 
      contentType: req.get('content-type') 
    });

    try {
      const fileData = await parseMultipartFile(req);
      
      if (!fileData) {
        throw new AppError('No file uploaded', 400);
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

      logger.info('CV upload completed successfully', {
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

    } catch (error) {
      logger.error('CV upload failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof FileProcessingError || error instanceof AppError) {
        throw error;
      }

      throw new AppError('CV upload failed', 500);
    }
  })
);

/**
 * Scan CV from camera/image
 * POST /api/upload/scan
 */
uploadRouter.post('/scan',
  uploadRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    
    logger.info('CV scan initiated', { userId });

    try {
      const fileData = await parseMultipartFile(req);
      
      if (!fileData) {
        throw new AppError('No image uploaded', 400);
      }

      // Validate that it's an image
      if (!fileData.mimeType.startsWith('image/')) {
        throw new FileProcessingError('Only image files are allowed for scanning');
      }

      // Process the scanned image
      const processedFile = await fileProcessor.processFile(fileData, userId);

      // Check OCR confidence
      if (processedFile.confidence && processedFile.confidence < 70) {
        logger.warn('Low OCR confidence detected', {
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

      logger.info('CV scan completed successfully', {
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

    } catch (error) {
      logger.error('CV scan failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof FileProcessingError || error instanceof AppError) {
        throw error;
      }

      throw new AppError('CV scan failed', 500);
    }
  })
);

/**
 * Convert CV file format
 * POST /api/upload/convert
 */
uploadRouter.post('/convert',
  uploadRateLimit,
  validateUpload,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, toFormat } = req.body;

    if (!cvId || !toFormat) {
      throw new AppError('CV ID and target format are required', 400);
    }

    logger.info('CV conversion initiated', { userId, cvId, toFormat });

    try {
      // Get existing CV
      const existingCV = await cvService.getCVById(cvId, userId);
      if (!existingCV) {
        throw new AppError('CV not found', 404);
      }

      // Determine source format
      const fromFormat = existingCV.fileMetadata.mimeType.includes('pdf') ? 'pdf' : 'docx';
      
      if (fromFormat === toFormat) {
        throw new AppError(`CV is already in ${toFormat} format`, 400);
      }

      // Convert file
      const convertedFile = await fileProcessor.convertFile(
        existingCV.extractedText,
        fromFormat,
        toFormat,
        userId,
        existingCV.fileMetadata
      );

      // Update CV with converted file info
      const updatedCV = await cvService.updateCV(cvId, userId, {
        convertedFiles: {
          ...existingCV.convertedFiles,
          [toFormat]: {
            downloadUrl: convertedFile.downloadUrl,
            mimeType: convertedFile.mimeType,
            convertedAt: new Date()
          }
        }
      });

      logger.info('CV conversion completed', {
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

    } catch (error) {
      logger.error('CV conversion failed', {
        userId,
        cvId,
        toFormat,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError || error instanceof FileProcessingError) {
        throw error;
      }

      throw new AppError('CV conversion failed', 500);
    }
  })
);

/**
 * Delete uploaded CV
 * DELETE /api/upload/cv/:cvId
 */
uploadRouter.delete('/cv/:cvId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId } = req.params;

    logger.info('CV deletion initiated', { userId, cvId });

    try {
      const success = await cvService.deleteCV(cvId, userId);
      
      if (!success) {
        throw new AppError('CV not found or already deleted', 404);
      }

      logger.info('CV deleted successfully', { userId, cvId });

      res.json({
        success: true,
        message: 'CV deleted successfully'
      });

    } catch (error) {
      logger.error('CV deletion failed', {
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
 * Parse multipart file upload using Busboy
 */
function parseMultipartFile(req: Request): Promise<FileUpload | null> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10) * 1024 * 1024,
        files: 1
      }
    });

    let fileData: FileUpload | null = null;

    busboy.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];

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
      logger.error('Busboy error', { error });
      reject(new FileProcessingError('Failed to parse uploaded file'));
    });

    req.pipe(busboy);
  });
}

/**
 * Generate recommendations based on OCR confidence
 */
function generateScanRecommendations(confidence?: number): string[] {
  if (!confidence) return [];

  const recommendations: string[] = [];

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