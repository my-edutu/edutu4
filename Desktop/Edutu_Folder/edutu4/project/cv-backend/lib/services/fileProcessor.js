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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessor = void 0;
const admin = __importStar(require("firebase-admin"));
const sharp = __importStar(require("sharp"));
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const pdfParse = __importStar(require("pdf-parse"));
const mammoth = __importStar(require("mammoth"));
const docx_1 = require("docx");
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class FileProcessor {
    constructor() {
        this.storage = admin.storage();
        this.bucket = this.storage.bucket();
        this.MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10) * 1024 * 1024;
        this.SUPPORTED_TYPES = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];
        this.OCR_LANGUAGES = process.env.TESSERACT_LANG || 'eng';
        this.OCR_CONFIDENCE_THRESHOLD = parseInt(process.env.OCR_CONFIDENCE_THRESHOLD || '60', 10);
    }
    /**
     * Validate uploaded file
     */
    validateFile(file) {
        if (!file.buffer || file.buffer.length === 0) {
            throw new errors_1.FileProcessingError('File is empty');
        }
        if (file.size > this.MAX_FILE_SIZE) {
            throw new errors_1.FileProcessingError(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`, file.mimeType);
        }
        if (!this.SUPPORTED_TYPES.includes(file.mimeType)) {
            throw new errors_1.FileProcessingError(`Unsupported file type. Supported types: ${this.SUPPORTED_TYPES.join(', ')}`, file.mimeType);
        }
    }
    /**
     * Process uploaded file and extract text
     */
    async processFile(file, userId) {
        const startTime = Date.now();
        try {
            this.validateFile(file);
            const fileId = (0, uuid_1.v4)();
            const fileName = `${fileId}_${this.sanitizeFileName(file.originalName)}`;
            logger_1.logger.info('Starting file processing', {
                fileId,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
                userId
            });
            let processedResult;
            // Process based on file type
            if (file.mimeType === 'application/pdf') {
                processedResult = await this.processPDF(file.buffer);
            }
            else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                processedResult = await this.processDOCX(file.buffer);
            }
            else if (file.mimeType === 'application/msword') {
                throw new errors_1.FileProcessingError('Legacy DOC format not supported. Please convert to DOCX format.');
            }
            else {
                processedResult = await this.processImage(file.buffer);
            }
            // Upload original file to storage
            const downloadUrl = await this.uploadToStorage(file.buffer, `cv-documents/${userId}/${fileName}`, file.mimeType);
            // Generate thumbnail for images
            let thumbnailUrl;
            if (file.mimeType.startsWith('image/')) {
                thumbnailUrl = await this.generateThumbnail(file.buffer, userId, fileId);
            }
            const processingTime = Date.now() - startTime;
            const result = {
                id: fileId,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
                text: processedResult.text,
                confidence: processedResult.confidence,
                pages: processedResult.pages,
                downloadUrl,
                thumbnailUrl,
                metadata: {
                    processedAt: new Date(),
                    processingTime,
                    method: processedResult.method,
                    ocrLanguage: this.OCR_LANGUAGES,
                    wordCount: this.countWords(processedResult.text),
                    characterCount: processedResult.text.length
                }
            };
            logger_1.logger.info('File processing completed', {
                fileId,
                processingTime: `${processingTime}ms`,
                method: processedResult.method,
                textLength: processedResult.text.length,
                confidence: processedResult.confidence,
                userId
            });
            return result;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logger_1.logger.error('File processing failed', {
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
                processingTime: `${processingTime}ms`,
                error: error instanceof Error ? error.message : 'Unknown error',
                userId
            });
            if (error instanceof errors_1.FileProcessingError) {
                throw error;
            }
            throw new errors_1.FileProcessingError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Process PDF file
     */
    async processPDF(buffer) {
        try {
            const data = await pdfParse(buffer, {
                max: parseInt(process.env.PDF_MAX_PAGES || '20', 10)
            });
            if (!data.text || data.text.trim().length === 0) {
                throw new errors_1.FileProcessingError('No text found in PDF. The PDF might be image-based or corrupted.');
            }
            return {
                text: data.text.trim(),
                pages: data.numpages,
                method: 'pdf-extract'
            };
        }
        catch (error) {
            logger_1.logger.error('PDF processing failed', { error });
            throw new errors_1.FileProcessingError('Failed to extract text from PDF');
        }
    }
    /**
     * Process DOCX file
     */
    async processDOCX(buffer) {
        try {
            const result = await mammoth.extractRawText({ buffer });
            if (!result.value || result.value.trim().length === 0) {
                throw new errors_1.FileProcessingError('No text found in DOCX file');
            }
            if (result.messages.length > 0) {
                logger_1.logger.warn('DOCX processing warnings', { messages: result.messages });
            }
            return {
                text: result.value.trim(),
                method: 'docx-extract'
            };
        }
        catch (error) {
            logger_1.logger.error('DOCX processing failed', { error });
            throw new errors_1.FileProcessingError('Failed to extract text from DOCX file');
        }
    }
    /**
     * Process image using OCR
     */
    async processImage(buffer) {
        try {
            // Optimize image for OCR
            const processedBuffer = await this.optimizeImageForOCR(buffer);
            const { data } = await tesseract_js_1.default.recognize(processedBuffer, this.OCR_LANGUAGES, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        logger_1.logger.debug('OCR progress', { progress: `${Math.round(m.progress * 100)}%` });
                    }
                },
                tessedit_pageseg_mode: parseInt(process.env.OCR_PSM_MODE || '6', 10),
                preserve_interword_spaces: '1'
            });
            if (!data.text || data.text.trim().length === 0) {
                throw new errors_1.FileProcessingError('No text detected in image');
            }
            const confidence = data.confidence;
            if (confidence < this.OCR_CONFIDENCE_THRESHOLD) {
                logger_1.logger.warn('Low OCR confidence', {
                    confidence,
                    threshold: this.OCR_CONFIDENCE_THRESHOLD,
                    textLength: data.text.length
                });
            }
            return {
                text: data.text.trim(),
                confidence,
                method: 'ocr'
            };
        }
        catch (error) {
            logger_1.logger.error('OCR processing failed', { error });
            throw new errors_1.FileProcessingError('Failed to extract text from image using OCR');
        }
    }
    /**
     * Optimize image for better OCR results
     */
    async optimizeImageForOCR(buffer) {
        try {
            return await sharp(buffer)
                .resize(null, 2000, {
                withoutEnlargement: true
            })
                .greyscale()
                .normalize()
                .sharpen()
                .png({ quality: 100 })
                .toBuffer();
        }
        catch (error) {
            logger_1.logger.warn('Image optimization failed, using original', { error });
            return buffer;
        }
    }
    /**
     * Generate thumbnail for image files
     */
    async generateThumbnail(buffer, userId, fileId) {
        try {
            const thumbnailBuffer = await sharp(buffer)
                .resize(300, 400, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .jpeg({ quality: 80 })
                .toBuffer();
            const thumbnailPath = `cv-documents/${userId}/thumbnails/${fileId}_thumb.jpg`;
            return await this.uploadToStorage(thumbnailBuffer, thumbnailPath, 'image/jpeg');
        }
        catch (error) {
            logger_1.logger.warn('Thumbnail generation failed', { error, userId, fileId });
            return '';
        }
    }
    /**
     * Upload file to Firebase Storage
     */
    async uploadToStorage(buffer, path, mimeType) {
        try {
            const file = this.bucket.file(path);
            await file.save(buffer, {
                metadata: {
                    contentType: mimeType,
                    metadata: {
                        uploadedAt: new Date().toISOString()
                    }
                }
            });
            // Make file publicly accessible
            await file.makePublic();
            return `https://storage.googleapis.com/${this.bucket.name}/${path}`;
        }
        catch (error) {
            logger_1.logger.error('Storage upload failed', { error, path });
            throw new errors_1.StorageError(`Failed to upload file to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Convert CV to different formats
     */
    async convertFile(originalText, fromFormat, toFormat, userId, metadata) {
        try {
            const fileId = (0, uuid_1.v4)();
            if (toFormat === 'pdf' && fromFormat === 'docx') {
                return await this.convertToPDF(originalText, userId, fileId, metadata);
            }
            else if (toFormat === 'docx' && fromFormat === 'pdf') {
                return await this.convertToDOCX(originalText, userId, fileId, metadata);
            }
            else {
                throw new errors_1.FileProcessingError(`Conversion from ${fromFormat} to ${toFormat} not supported`);
            }
        }
        catch (error) {
            logger_1.logger.error('File conversion failed', {
                fromFormat,
                toFormat,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            if (error instanceof errors_1.FileProcessingError) {
                throw error;
            }
            throw new errors_1.FileProcessingError('File conversion failed');
        }
    }
    /**
     * Convert text to PDF
     */
    async convertToPDF(text, userId, fileId, metadata) {
        // Note: This is a simplified implementation. In production, you might want to use
        // a more sophisticated PDF generation library like PDFKit or Puppeteer with HTML templates
        throw new errors_1.FileProcessingError('PDF conversion feature coming soon. Use a dedicated PDF generation service.');
    }
    /**
     * Convert text to DOCX
     */
    async convertToDOCX(text, userId, fileId, metadata) {
        try {
            const doc = new docx_1.Document({
                sections: [{
                        properties: {},
                        children: text.split('\n\n').map(paragraph => new docx_1.Paragraph({
                            children: [new docx_1.TextRun(paragraph)]
                        }))
                    }]
            });
            const buffer = await docx_1.Packer.toBuffer(doc);
            const path = `cv-documents/${userId}/converted/${fileId}_converted.docx`;
            const downloadUrl = await this.uploadToStorage(buffer, path, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            return {
                buffer,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                downloadUrl
            };
        }
        catch (error) {
            throw new errors_1.FileProcessingError('Failed to convert to DOCX format');
        }
    }
    /**
     * Delete file from storage
     */
    async deleteFile(path) {
        try {
            const file = this.bucket.file(path);
            await file.delete();
            logger_1.logger.info('File deleted from storage', { path });
        }
        catch (error) {
            logger_1.logger.error('File deletion failed', { path, error });
            throw new errors_1.StorageError('Failed to delete file from storage');
        }
    }
    /**
     * Utility functions
     */
    sanitizeFileName(fileName) {
        return fileName
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
    }
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
}
exports.FileProcessor = FileProcessor;
//# sourceMappingURL=fileProcessor.js.map