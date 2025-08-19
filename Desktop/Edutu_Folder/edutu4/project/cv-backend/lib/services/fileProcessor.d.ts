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
export declare class FileProcessor {
    private storage;
    private bucket;
    private readonly MAX_FILE_SIZE;
    private readonly SUPPORTED_TYPES;
    private readonly OCR_LANGUAGES;
    private readonly OCR_CONFIDENCE_THRESHOLD;
    /**
     * Validate uploaded file
     */
    validateFile(file: FileUpload): void;
    /**
     * Process uploaded file and extract text
     */
    processFile(file: FileUpload, userId: string): Promise<ProcessedFile>;
    /**
     * Process PDF file
     */
    private processPDF;
    /**
     * Process DOCX file
     */
    private processDOCX;
    /**
     * Process image using OCR
     */
    private processImage;
    /**
     * Optimize image for better OCR results
     */
    private optimizeImageForOCR;
    /**
     * Generate thumbnail for image files
     */
    private generateThumbnail;
    /**
     * Upload file to Firebase Storage
     */
    private uploadToStorage;
    /**
     * Convert CV to different formats
     */
    convertFile(originalText: string, fromFormat: string, toFormat: string, userId: string, metadata?: any): Promise<{
        buffer: Buffer;
        mimeType: string;
        downloadUrl: string;
    }>;
    /**
     * Convert text to PDF
     */
    private convertToPDF;
    /**
     * Convert text to DOCX
     */
    private convertToDOCX;
    /**
     * Delete file from storage
     */
    deleteFile(path: string): Promise<void>;
    /**
     * Utility functions
     */
    private sanitizeFileName;
    private countWords;
}
//# sourceMappingURL=fileProcessor.d.ts.map