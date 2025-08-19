"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.isRateLimitError = exports.isNotFoundError = exports.isAuthError = exports.isValidationError = exports.isOperationalError = exports.createAIError = exports.createFileError = exports.createValidationError = exports.StorageError = exports.AIServiceError = exports.FileProcessingError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthError = exports.ValidationError = exports.AppError = void 0;
/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Validation error class
 */
class ValidationError extends AppError {
    constructor(message, validationErrors) {
        super(message, 400, validationErrors);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error class
 */
class AuthError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
/**
 * Authorization error class
 */
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not found error class
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Conflict error class (duplicate resource)
 */
class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Rate limit error class
 */
class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter) {
        super(message, 429, { retryAfter });
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
/**
 * File processing error class
 */
class FileProcessingError extends AppError {
    constructor(message, fileType) {
        super(message, 422, { fileType });
        this.name = 'FileProcessingError';
    }
}
exports.FileProcessingError = FileProcessingError;
/**
 * AI service error class
 */
class AIServiceError extends AppError {
    constructor(message = 'AI service error', provider) {
        super(message, 503, { provider });
        this.name = 'AIServiceError';
    }
}
exports.AIServiceError = AIServiceError;
/**
 * Storage error class
 */
class StorageError extends AppError {
    constructor(message = 'Storage operation failed') {
        super(message, 503);
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
/**
 * Error factory functions
 */
const createValidationError = (field, message) => {
    return new ValidationError(`Validation failed for ${field}`, { [field]: message });
};
exports.createValidationError = createValidationError;
const createFileError = (operation, fileType) => {
    return new FileProcessingError(`File ${operation} failed`, fileType);
};
exports.createFileError = createFileError;
const createAIError = (operation, provider) => {
    return new AIServiceError(`AI ${operation} failed`, provider);
};
exports.createAIError = createAIError;
/**
 * Error type guards
 */
const isOperationalError = (error) => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};
exports.isOperationalError = isOperationalError;
const isValidationError = (error) => {
    return error instanceof ValidationError;
};
exports.isValidationError = isValidationError;
const isAuthError = (error) => {
    return error instanceof AuthError;
};
exports.isAuthError = isAuthError;
const isNotFoundError = (error) => {
    return error instanceof NotFoundError;
};
exports.isNotFoundError = isNotFoundError;
const isRateLimitError = (error) => {
    return error instanceof RateLimitError;
};
exports.isRateLimitError = isRateLimitError;
/**
 * Error code constants
 */
exports.ErrorCodes = {
    // Authentication & Authorization
    AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
    AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
    AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
    // Validation
    VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
    VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
    VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
    // File Processing
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    FILE_UNSUPPORTED_TYPE: 'FILE_UNSUPPORTED_TYPE',
    FILE_CORRUPTED: 'FILE_CORRUPTED',
    FILE_PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',
    // OCR
    OCR_FAILED: 'OCR_FAILED',
    OCR_LOW_CONFIDENCE: 'OCR_LOW_CONFIDENCE',
    OCR_NO_TEXT_FOUND: 'OCR_NO_TEXT_FOUND',
    // AI Services
    AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
    AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
    AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
    // Storage
    STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
    STORAGE_DOWNLOAD_FAILED: 'STORAGE_DOWNLOAD_FAILED',
    STORAGE_DELETE_FAILED: 'STORAGE_DELETE_FAILED',
    // Rate Limiting
    RATE_LIMIT_GENERAL: 'RATE_LIMIT_GENERAL',
    RATE_LIMIT_UPLOAD: 'RATE_LIMIT_UPLOAD',
    RATE_LIMIT_AI: 'RATE_LIMIT_AI',
    // Database
    DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
    DB_QUERY_FAILED: 'DB_QUERY_FAILED',
    DB_DUPLICATE_KEY: 'DB_DUPLICATE_KEY'
};
//# sourceMappingURL=errors.js.map