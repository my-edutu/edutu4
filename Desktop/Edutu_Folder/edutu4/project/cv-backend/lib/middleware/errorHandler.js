"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatValidationError = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Global error handling middleware
 */
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = undefined;
    // Handle custom AppError instances
    if (error instanceof errors_1.AppError) {
        statusCode = error.statusCode;
        message = error.message;
        details = error.details;
    }
    else {
        // Handle known error types
        if (error.name === 'ValidationError') {
            statusCode = 400;
            message = 'Validation Error';
            details = error.message;
        }
        else if (error.name === 'CastError') {
            statusCode = 400;
            message = 'Invalid ID format';
        }
        else if (error.name === 'MongoError' && error.code === 11000) {
            statusCode = 409;
            message = 'Duplicate resource';
        }
        else if (error.message.includes('ENOENT')) {
            statusCode = 404;
            message = 'File not found';
        }
        else if (error.message.includes('EACCES')) {
            statusCode = 403;
            message = 'Permission denied';
        }
        else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
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
        logger_1.logger.error('Server error', logData);
    }
    else if (statusCode >= 400) {
        logger_1.logger.warn('Client error', logData);
    }
    // Send error response
    const response = {
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
exports.errorHandler = errorHandler;
/**
 * Handle async errors in route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Handle 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
    const error = new errors_1.AppError(`Route ${req.originalUrl} not found`, 404, {
        method: req.method,
        url: req.originalUrl,
        availableRoutes: [
            '/api/upload',
            '/api/optimize',
            '/api/ats',
            '/api/builder',
            '/api/cv'
        ]
    });
    next(error);
};
exports.notFoundHandler = notFoundHandler;
/**
 * Validation error formatter
 */
const formatValidationError = (error) => {
    const errors = {};
    if (error.details) {
        error.details.forEach((detail) => {
            const path = detail.path.join('.');
            errors[path] = detail.message;
        });
    }
    return new errors_1.AppError('Validation failed', 400, {
        validationErrors: errors,
        errorCount: Object.keys(errors).length
    });
};
exports.formatValidationError = formatValidationError;
//# sourceMappingURL=errorHandler.js.map