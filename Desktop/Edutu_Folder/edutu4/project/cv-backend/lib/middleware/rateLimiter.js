"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetUserRateLimit = exports.aiRateLimit = exports.uploadRateLimit = exports.rateLimiter = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
// Configuration
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '50', 10);
const MAX_UPLOADS = parseInt(process.env.RATE_LIMIT_MAX_UPLOADS || '10', 10);
// Create rate limiters using memory-based approach for simplicity
const generalRateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    keyPrefix: 'general_rl',
    points: MAX_REQUESTS,
    duration: Math.floor(WINDOW_MS / 1000), // Convert to seconds
    blockDuration: 60, // Block for 1 minute after limit exceeded
});
const uploadRateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    keyPrefix: 'upload_rl',
    points: MAX_UPLOADS,
    duration: Math.floor(WINDOW_MS / 1000),
    blockDuration: 300, // Block for 5 minutes for uploads
});
const aiRateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    keyPrefix: 'ai_rl',
    points: 20, // More restrictive for AI operations
    duration: Math.floor(WINDOW_MS / 1000),
    blockDuration: 600, // Block for 10 minutes
});
/**
 * Get user identifier for rate limiting
 */
const getUserKey = (req) => {
    var _a;
    // Use authenticated user ID if available
    if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) {
        return `user:${req.user.uid}`;
    }
    // Fallback to IP address for unauthenticated requests
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
    return `ip:${ip}`;
};
/**
 * General rate limiting middleware
 */
const rateLimiter = async (req, res, next) => {
    var _a;
    try {
        const key = getUserKey(req);
        await generalRateLimiter.consume(key);
        // Add rate limit info to response headers
        const resRateLimiter = await generalRateLimiter.get(key);
        if (resRateLimiter) {
            res.set({
                'X-RateLimit-Limit': MAX_REQUESTS.toString(),
                'X-RateLimit-Remaining': ((_a = resRateLimiter.remainingPoints) === null || _a === void 0 ? void 0 : _a.toString()) || '0',
                'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
            });
        }
        next();
    }
    catch (rateLimiterRes) {
        logger_1.logger.warn('Rate limit exceeded', {
            key: getUserKey(req),
            endpoint: req.originalUrl,
            userAgent: req.get('User-Agent')
        });
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', secs.toString());
        const error = new errors_1.AppError(`Too many requests. Try again in ${secs} seconds.`, 429, {
            retryAfter: secs,
            limit: MAX_REQUESTS,
            windowMs: WINDOW_MS
        });
        next(error);
    }
};
exports.rateLimiter = rateLimiter;
/**
 * Upload-specific rate limiting middleware
 */
const uploadRateLimit = async (req, res, next) => {
    var _a;
    try {
        const key = getUserKey(req);
        await uploadRateLimiter.consume(key);
        const resRateLimiter = await uploadRateLimiter.get(key);
        if (resRateLimiter) {
            res.set({
                'X-Upload-RateLimit-Limit': MAX_UPLOADS.toString(),
                'X-Upload-RateLimit-Remaining': ((_a = resRateLimiter.remainingPoints) === null || _a === void 0 ? void 0 : _a.toString()) || '0',
                'X-Upload-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
            });
        }
        next();
    }
    catch (rateLimiterRes) {
        logger_1.logger.warn('Upload rate limit exceeded', {
            key: getUserKey(req),
            endpoint: req.originalUrl
        });
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', secs.toString());
        const error = new errors_1.AppError(`Too many file uploads. Try again in ${Math.ceil(secs / 60)} minutes.`, 429, {
            retryAfter: secs,
            limit: MAX_UPLOADS,
            windowMs: WINDOW_MS,
            type: 'upload_limit'
        });
        next(error);
    }
};
exports.uploadRateLimit = uploadRateLimit;
/**
 * AI operations rate limiting middleware
 */
const aiRateLimit = async (req, res, next) => {
    try {
        const key = getUserKey(req);
        await aiRateLimiter.consume(key);
        next();
    }
    catch (rateLimiterRes) {
        logger_1.logger.warn('AI rate limit exceeded', {
            key: getUserKey(req),
            endpoint: req.originalUrl
        });
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', secs.toString());
        const error = new errors_1.AppError(`AI service rate limit exceeded. Try again in ${Math.ceil(secs / 60)} minutes.`, 429, {
            retryAfter: secs,
            limit: 20,
            windowMs: WINDOW_MS,
            type: 'ai_limit'
        });
        next(error);
    }
};
exports.aiRateLimit = aiRateLimit;
/**
 * Reset rate limits for a user (admin function)
 */
const resetUserRateLimit = async (userId) => {
    const key = `user:${userId}`;
    try {
        await Promise.all([
            generalRateLimiter.delete(key),
            uploadRateLimiter.delete(key),
            aiRateLimiter.delete(key)
        ]);
        logger_1.logger.info('Rate limits reset for user', { userId });
    }
    catch (error) {
        logger_1.logger.error('Failed to reset rate limits', { userId, error });
        throw error;
    }
};
exports.resetUserRateLimit = resetUserRateLimit;
//# sourceMappingURL=rateLimiter.js.map