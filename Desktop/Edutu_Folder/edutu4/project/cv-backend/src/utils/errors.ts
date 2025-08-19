/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, validationErrors?: any) {
    super(message, 400, validationErrors);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error class
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error class (duplicate resource)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * File processing error class
 */
export class FileProcessingError extends AppError {
  constructor(message: string, fileType?: string) {
    super(message, 422, { fileType });
    this.name = 'FileProcessingError';
  }
}

/**
 * AI service error class
 */
export class AIServiceError extends AppError {
  constructor(message: string = 'AI service error', provider?: string) {
    super(message, 503, { provider });
    this.name = 'AIServiceError';
  }
}

/**
 * Storage error class
 */
export class StorageError extends AppError {
  constructor(message: string = 'Storage operation failed') {
    super(message, 503);
    this.name = 'StorageError';
  }
}

/**
 * Error factory functions
 */
export const createValidationError = (field: string, message: string): ValidationError => {
  return new ValidationError(`Validation failed for ${field}`, { [field]: message });
};

export const createFileError = (operation: string, fileType?: string): FileProcessingError => {
  return new FileProcessingError(`File ${operation} failed`, fileType);
};

export const createAIError = (operation: string, provider: string): AIServiceError => {
  return new AIServiceError(`AI ${operation} failed`, provider);
};

/**
 * Error type guards
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

export const isValidationError = (error: Error): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isAuthError = (error: Error): error is AuthError => {
  return error instanceof AuthError;
};

export const isNotFoundError = (error: Error): error is NotFoundError => {
  return error instanceof NotFoundError;
};

export const isRateLimitError = (error: Error): error is RateLimitError => {
  return error instanceof RateLimitError;
};

/**
 * Error code constants
 */
export const ErrorCodes = {
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
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];