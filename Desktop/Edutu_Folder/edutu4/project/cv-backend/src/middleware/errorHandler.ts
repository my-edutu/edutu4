import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Handle custom AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else {
    // Handle known error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
      details = error.message;
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
    } else if (error.name === 'MongoError' && (error as any).code === 11000) {
      statusCode = 409;
      message = 'Duplicate resource';
    } else if (error.message.includes('ENOENT')) {
      statusCode = 404;
      message = 'File not found';
    } else if (error.message.includes('EACCES')) {
      statusCode = 403;
      message = 'Permission denied';
    } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
      statusCode = 503;
      message = 'Service temporarily unavailable';
    }
  }

  // Log the error
  const logData = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      user: req.user ? { uid: req.user.uid, email: req.user.email } : undefined
    },
    response: {
      statusCode,
      message
    }
  };

  if (statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error', logData);
  }

  // Send error response
  const response: any = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  };

  // Include details in non-production environments or for client errors
  if (details && (process.env.NODE_ENV !== 'production' || statusCode < 500)) {
    response.error.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  // Include request ID if available
  if (req.headers['x-request-id']) {
    response.error.requestId = req.headers['x-request-id'];
  }

  res.status(statusCode).json(response);
};

/**
 * Handle async errors in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    {
      method: req.method,
      url: req.originalUrl,
      availableRoutes: [
        '/api/upload',
        '/api/optimize',
        '/api/ats',
        '/api/builder',
        '/api/cv'
      ]
    }
  );
  next(error);
};

/**
 * Validation error formatter
 */
export const formatValidationError = (error: any): AppError => {
  const errors: any = {};
  
  if (error.details) {
    error.details.forEach((detail: any) => {
      const path = detail.path.join('.');
      errors[path] = detail.message;
    });
  }

  return new AppError(
    'Validation failed',
    400,
    {
      validationErrors: errors,
      errorCount: Object.keys(errors).length
    }
  );
};