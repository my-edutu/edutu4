import * as admin from 'firebase-admin';
import * as sharp from 'sharp';
import Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError, FileProcessingError, StorageError } from '../utils/errors';

export interface ProcessedFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  text: string;
  confidence?: number;
  pages?: number;
  downloadUrl: string;
  thumbnailUrl?: string;
  metadata: {
    processedAt: Date;
    processingTime: number;
    method: 'ocr' | 'pdf-extract' | 'docx-extract';
    ocrLanguage?: string;
    wordCount: number;
    characterCount: number;
  };
}

export interface FileUpload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export class FileProcessor {
  private storage = admin.storage();
  private bucket = this.storage.bucket();

  private readonly MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10) * 1024 * 1024;
  private readonly SUPPORTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];
  private readonly OCR_LANGUAGES = process.env.TESSERACT_LANG || 'eng';
  private readonly OCR_CONFIDENCE_THRESHOLD = parseInt(process.env.OCR_CONFIDENCE_THRESHOLD || '60', 10);

  /**
   * Validate uploaded file
   */
  validateFile(file: FileUpload): void {
    if (!file.buffer || file.buffer.length === 0) {
      throw new FileProcessingError('File is empty');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new FileProcessingError(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        file.mimeType
      );
    }

    if (!this.SUPPORTED_TYPES.includes(file.mimeType)) {
      throw new FileProcessingError(
        `Unsupported file type. Supported types: ${this.SUPPORTED_TYPES.join(', ')}`,
        file.mimeType
      );
    }
  }

  /**
   * Process uploaded file and extract text
   */
  async processFile(file: FileUpload, userId: string): Promise<ProcessedFile> {
    const startTime = Date.now();
    
    try {
      this.validateFile(file);

      const fileId = uuidv4();
      const fileName = `${fileId}_${this.sanitizeFileName(file.originalName)}`;
      
      logger.info('Starting file processing', {
        fileId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        userId
      });

      let processedResult: {
        text: string;
        confidence?: number;
        pages?: number;
        method: 'ocr' | 'pdf-extract' | 'docx-extract';
      };

      // Process based on file type
      if (file.mimeType === 'application/pdf') {
        processedResult = await this.processPDF(file.buffer);
      } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        processedResult = await this.processDOCX(file.buffer);
      } else if (file.mimeType === 'application/msword') {
        throw new FileProcessingError('Legacy DOC format not supported. Please convert to DOCX format.');
      } else {
        processedResult = await this.processImage(file.buffer);
      }

      // Upload original file to storage
      const downloadUrl = await this.uploadToStorage(
        file.buffer,
        `cv-documents/${userId}/${fileName}`,
        file.mimeType
      );

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (file.mimeType.startsWith('image/')) {
        thumbnailUrl = await this.generateThumbnail(file.buffer, userId, fileId);
      }

      const processingTime = Date.now() - startTime;

      const result: ProcessedFile = {
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

      logger.info('File processing completed', {
        fileId,
        processingTime: `${processingTime}ms`,
        method: processedResult.method,
        textLength: processedResult.text.length,
        confidence: processedResult.confidence,
        userId
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('File processing failed', {
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        processingTime: `${processingTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      if (error instanceof FileProcessingError) {
        throw error;
      }

      throw new FileProcessingError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process PDF file
   */
  private async processPDF(buffer: Buffer): Promise<{
    text: string;
    pages: number;
    method: 'pdf-extract';
  }> {
    try {
      const data = await pdfParse(buffer, {
        max: parseInt(process.env.PDF_MAX_PAGES || '20', 10)
      });

      if (!data.text || data.text.trim().length === 0) {
        throw new FileProcessingError('No text found in PDF. The PDF might be image-based or corrupted.');
      }

      return {
        text: data.text.trim(),
        pages: data.numpages,
        method: 'pdf-extract'
      };
    } catch (error) {
      logger.error('PDF processing failed', { error });
      throw new FileProcessingError('Failed to extract text from PDF');
    }
  }

  /**
   * Process DOCX file
   */
  private async processDOCX(buffer: Buffer): Promise<{
    text: string;
    method: 'docx-extract';
  }> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new FileProcessingError('No text found in DOCX file');
      }

      if (result.messages.length > 0) {
        logger.warn('DOCX processing warnings', { messages: result.messages });
      }

      return {
        text: result.value.trim(),
        method: 'docx-extract'
      };
    } catch (error) {
      logger.error('DOCX processing failed', { error });
      throw new FileProcessingError('Failed to extract text from DOCX file');
    }
  }

  /**
   * Process image using OCR
   */
  private async processImage(buffer: Buffer): Promise<{
    text: string;
    confidence: number;
    method: 'ocr';
  }> {
    try {
      // Optimize image for OCR
      const processedBuffer = await this.optimizeImageForOCR(buffer);

      const { data } = await Tesseract.recognize(processedBuffer, this.OCR_LANGUAGES, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug('OCR progress', { progress: `${Math.round(m.progress * 100)}%` });
          }
        },
        tessedit_pageseg_mode: parseInt(process.env.OCR_PSM_MODE || '6', 10),
        preserve_interword_spaces: '1'
      });

      if (!data.text || data.text.trim().length === 0) {
        throw new FileProcessingError('No text detected in image');
      }

      const confidence = data.confidence;
      
      if (confidence < this.OCR_CONFIDENCE_THRESHOLD) {
        logger.warn('Low OCR confidence', { 
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
    } catch (error) {
      logger.error('OCR processing failed', { error });
      throw new FileProcessingError('Failed to extract text from image using OCR');
    }
  }

  /**
   * Optimize image for better OCR results
   */
  private async optimizeImageForOCR(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(null, 2000, { // Increase height to max 2000px, maintain aspect ratio
          withoutEnlargement: true
        })
        .greyscale()
        .normalize()
        .sharpen()
        .png({ quality: 100 })
        .toBuffer();
    } catch (error) {
      logger.warn('Image optimization failed, using original', { error });
      return buffer;
    }
  }

  /**
   * Generate thumbnail for image files
   */
  private async generateThumbnail(buffer: Buffer, userId: string, fileId: string): Promise<string> {
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
    } catch (error) {
      logger.warn('Thumbnail generation failed', { error, userId, fileId });
      return '';
    }
  }

  /**
   * Upload file to Firebase Storage
   */
  private async uploadToStorage(buffer: Buffer, path: string, mimeType: string): Promise<string> {
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
    } catch (error) {
      logger.error('Storage upload failed', { error, path });
      throw new StorageError(`Failed to upload file to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert CV to different formats
   */
  async convertFile(
    originalText: string, 
    fromFormat: string, 
    toFormat: string, 
    userId: string,
    metadata?: any
  ): Promise<{
    buffer: Buffer;
    mimeType: string;
    downloadUrl: string;
  }> {
    try {
      const fileId = uuidv4();
      
      if (toFormat === 'pdf' && fromFormat === 'docx') {
        return await this.convertToPDF(originalText, userId, fileId, metadata);
      } else if (toFormat === 'docx' && fromFormat === 'pdf') {
        return await this.convertToDOCX(originalText, userId, fileId, metadata);
      } else {
        throw new FileProcessingError(`Conversion from ${fromFormat} to ${toFormat} not supported`);
      }
    } catch (error) {
      logger.error('File conversion failed', { 
        fromFormat, 
        toFormat, 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof FileProcessingError) {
        throw error;
      }

      throw new FileProcessingError('File conversion failed');
    }
  }

  /**
   * Convert text to PDF
   */
  private async convertToPDF(text: string, userId: string, fileId: string, metadata?: any): Promise<{
    buffer: Buffer;
    mimeType: string;
    downloadUrl: string;
  }> {
    // Note: This is a simplified implementation. In production, you might want to use
    // a more sophisticated PDF generation library like PDFKit or Puppeteer with HTML templates
    throw new FileProcessingError('PDF conversion feature coming soon. Use a dedicated PDF generation service.');
  }

  /**
   * Convert text to DOCX
   */
  private async convertToDOCX(text: string, userId: string, fileId: string, metadata?: any): Promise<{
    buffer: Buffer;
    mimeType: string;
    downloadUrl: string;
  }> {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: text.split('\n\n').map(paragraph => 
            new Paragraph({
              children: [new TextRun(paragraph)]
            })
          )
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      const path = `cv-documents/${userId}/converted/${fileId}_converted.docx`;
      const downloadUrl = await this.uploadToStorage(buffer, path, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      return {
        buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        downloadUrl
      };
    } catch (error) {
      throw new FileProcessingError('Failed to convert to DOCX format');
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const file = this.bucket.file(path);
      await file.delete();
      logger.info('File deleted from storage', { path });
    } catch (error) {
      logger.error('File deletion failed', { path, error });
      throw new StorageError('Failed to delete file from storage');
    }
  }

  /**
   * Utility functions
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}