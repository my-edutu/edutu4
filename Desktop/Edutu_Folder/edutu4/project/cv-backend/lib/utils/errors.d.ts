/**
 * Custom application error class
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly details?: any;
    constructor(message: string, statusCode?: number, details?: any);
}
/**
 * Validation error class
 */
export declare class ValidationError extends AppError {
    constructor(message: string, validationErrors?: any);
}
/**
 * Authentication error class
 */
export declare class AuthError extends AppError {
    constructor(message?: string);
}
/**
 * Authorization error class
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Not found error class
 */
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
/**
 * Conflict error class (duplicate resource)
 */
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
/**
 * Rate limit error class
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string, retryAfter?: number);
}
/**
 * File processing error class
 */
export declare class FileProcessingError extends AppError {
    constructor(message: string, fileType?: string);
}
/**
 * AI service error class
 */
export declare class AIServiceError extends AppError {
    constructor(message?: string, provider?: string);
}
/**
 * Storage error class
 */
export declare class StorageError extends AppError {
    constructor(message?: string);
}
/**
 * Error factory functions
 */
export declare const createValidationError: (field: string, message: string) => ValidationError;
export declare const createFileError: (operation: string, fileType?: string) => FileProcessingError;
export declare const createAIError: (operation: string, provider: string) => AIServiceError;
/**
 * Error type guards
 */
export declare const isOperationalError: (error: Error) => boolean;
export declare const isValidationError: (error: Error) => error is ValidationError;
export declare const isAuthError: (error: Error) => error is AuthError;
export declare const isNotFoundError: (error: Error) => error is NotFoundError;
export declare const isRateLimitError: (error: Error) => error is RateLimitError;
/**
 * Error code constants
 */
export declare const ErrorCodes: {
    readonly AUTH_TOKEN_MISSING: "AUTH_TOKEN_MISSING";
    readonly AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID";
    readonly AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED";
    readonly AUTH_INSUFFICIENT_PERMISSIONS: "AUTH_INSUFFICIENT_PERMISSIONS";
    readonly VALIDATION_REQUIRED_FIELD: "VALIDATION_REQUIRED_FIELD";
    readonly VALIDATION_INVALID_FORMAT: "VALIDATION_INVALID_FORMAT";
    readonly VALIDATION_OUT_OF_RANGE: "VALIDATION_OUT_OF_RANGE";
    readonly FILE_TOO_LARGE: "FILE_TOO_LARGE";
    readonly FILE_UNSUPPORTED_TYPE: "FILE_UNSUPPORTED_TYPE";
    readonly FILE_CORRUPTED: "FILE_CORRUPTED";
    readonly FILE_PROCESSING_FAILED: "FILE_PROCESSING_FAILED";
    readonly OCR_FAILED: "OCR_FAILED";
    readonly OCR_LOW_CONFIDENCE: "OCR_LOW_CONFIDENCE";
    readonly OCR_NO_TEXT_FOUND: "OCR_NO_TEXT_FOUND";
    readonly AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE";
    readonly AI_QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED";
    readonly AI_INVALID_RESPONSE: "AI_INVALID_RESPONSE";
    readonly STORAGE_UPLOAD_FAILED: "STORAGE_UPLOAD_FAILED";
    readonly STORAGE_DOWNLOAD_FAILED: "STORAGE_DOWNLOAD_FAILED";
    readonly STORAGE_DELETE_FAILED: "STORAGE_DELETE_FAILED";
    readonly RATE_LIMIT_GENERAL: "RATE_LIMIT_GENERAL";
    readonly RATE_LIMIT_UPLOAD: "RATE_LIMIT_UPLOAD";
    readonly RATE_LIMIT_AI: "RATE_LIMIT_AI";
    readonly DB_CONNECTION_FAILED: "DB_CONNECTION_FAILED";
    readonly DB_QUERY_FAILED: "DB_QUERY_FAILED";
    readonly DB_DUPLICATE_KEY: "DB_DUPLICATE_KEY";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
//# sourceMappingURL=errors.d.ts.map