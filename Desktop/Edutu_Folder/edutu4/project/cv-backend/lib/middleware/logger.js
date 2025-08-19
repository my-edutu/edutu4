"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.performanceLogger = exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    // Generate unique request ID
    const requestId = (0, uuid_1.v4)();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    // Capture start time
    const startTime = Date.now();
    // Log request
    logger_1.logger.info('Incoming request', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        ip: req.ip,
        user: req.user ? { uid: req.user.uid, email: req.user.email } : undefined
    });
    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function (body) {
        const duration = Date.now() - startTime;
        logger_1.logger.info('Outgoing response', {
            requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentType: res.get('Content-Type'),
            user: req.user ? { uid: req.user.uid } : undefined
        });
        return originalJson.call(this, body);
    };
    // Handle response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (res.statusCode >= 400) {
            logger_1.logger.warn('Request completed with error', {
                requestId,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                duration: `${duration}ms`
            });
        }
    });
    next();
};
exports.requestLogger = requestLogger;
/**
 * Performance monitoring middleware
 */
const performanceLogger = (req, res, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        // Log performance metrics for slow requests (>1000ms)
        if (duration > 1000) {
            logger_1.logger.warn('Slow request detected', {
                requestId: req.headers['x-request-id'],
                method: req.method,
                url: req.originalUrl,
                duration: `${duration}ms`,
                statusCode: res.statusCode,
                memoryUsage: {
                    heapUsedDelta: endMemory.heapUsed - startMemory.heapUsed,
                    heapTotalDelta: endMemory.heapTotal - startMemory.heapTotal,
                    externalDelta: endMemory.external - startMemory.external
                }
            });
        }
    });
    next();
};
exports.performanceLogger = performanceLogger;
/**
 * Security event logger
 */
exports.securityLogger = {
    logFailedAuth: (req, reason) => {
        logger_1.logger.warn('Authentication failed', {
            requestId: req.headers['x-request-id'],
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            reason,
            timestamp: new Date().toISOString()
        });
    },
    logSuspiciousActivity: (req, activity, details) => {
        logger_1.logger.warn('Suspicious activity detected', {
            requestId: req.headers['x-request-id'],
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            activity,
            details,
            user: req.user ? { uid: req.user.uid, email: req.user.email } : undefined,
            timestamp: new Date().toISOString()
        });
    },
    logRateLimitExceeded: (req, limitType) => {
        logger_1.logger.warn('Rate limit exceeded', {
            requestId: req.headers['x-request-id'],
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            limitType,
            user: req.user ? { uid: req.user.uid } : undefined,
            timestamp: new Date().toISOString()
        });
    }
};
//# sourceMappingURL=logger.js.map