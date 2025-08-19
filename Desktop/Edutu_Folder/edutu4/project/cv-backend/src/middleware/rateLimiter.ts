import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import * as admin from 'firebase-admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// Configuration
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '50', 10);
const MAX_UPLOADS = parseInt(process.env.RATE_LIMIT_MAX_UPLOADS || '10', 10);

// Create rate limiters using memory-based approach for simplicity
const generalRateLimiter = new RateLimiterMemory({
  keyPrefix: 'general_rl',
  points: MAX_REQUESTS,
  duration: Math.floor(WINDOW_MS / 1000), // Convert to seconds
  blockDuration: 60, // Block for 1 minute after limit exceeded
});

const uploadRateLimiter = new RateLimiterMemory({
  keyPrefix: 'upload_rl',
  points: MAX_UPLOADS,
  duration: Math.floor(WINDOW_MS / 1000),
  blockDuration: 300, // Block for 5 minutes for uploads
});

const aiRateLimiter = new RateLimiterMemory({
  keyPrefix: 'ai_rl',
  points: 20, // More restrictive for AI operations
  duration: Math.floor(WINDOW_MS / 1000),
  blockDuration: 600, // Block for 10 minutes
});

/**
 * Get user identifier for rate limiting
 */
const getUserKey = (req: Request): string => {
  // Use authenticated user ID if available
  if (req.user?.uid) {
    return `user:${req.user.uid}`;
  }

  // Fallback to IP address for unauthenticated requests
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  return `ip:${ip}`;
};

/**
 * General rate limiting middleware
 */
export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = getUserKey(req);
    
    await generalRateLimiter.consume(key);
    
    // Add rate limit info to response headers
    const resRateLimiter = await generalRateLimiter.get(key);
    if (resRateLimiter) {
      res.set({
        'X-RateLimit-Limit': MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': resRateLimiter.remainingPoints?.toString() || '0',
        'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
      });
    }

    next();
  } catch (rateLimiterRes) {
    logger.warn('Rate limit exceeded', {
      key: getUserKey(req),
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent')
    });

    const secs = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', secs.toString());
    
    const error = new AppError(
      `Too many requests. Try again in ${secs} seconds.`,
      429,
      {
        retryAfter: secs,
        limit: MAX_REQUESTS,
        windowMs: WINDOW_MS
      }
    );
    
    next(error);
  }
};

/**
 * Upload-specific rate limiting middleware
 */
export const uploadRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = getUserKey(req);
    
    await uploadRateLimiter.consume(key);
    
    const resRateLimiter = await uploadRateLimiter.get(key);
    if (resRateLimiter) {
      res.set({
        'X-Upload-RateLimit-Limit': MAX_UPLOADS.toString(),
        'X-Upload-RateLimit-Remaining': resRateLimiter.remainingPoints?.toString() || '0',
        'X-Upload-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
      });
    }

    next();
  } catch (rateLimiterRes) {
    logger.warn('Upload rate limit exceeded', {
      key: getUserKey(req),
      endpoint: req.originalUrl
    });

    const secs = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', secs.toString());
    
    const error = new AppError(
      `Too many file uploads. Try again in ${Math.ceil(secs / 60)} minutes.`,
      429,
      {
        retryAfter: secs,
        limit: MAX_UPLOADS,
        windowMs: WINDOW_MS,
        type: 'upload_limit'
      }
    );
    
    next(error);
  }
};

/**
 * AI operations rate limiting middleware
 */
export const aiRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = getUserKey(req);
    
    await aiRateLimiter.consume(key);
    
    next();
  } catch (rateLimiterRes) {
    logger.warn('AI rate limit exceeded', {
      key: getUserKey(req),
      endpoint: req.originalUrl
    });

    const secs = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', secs.toString());
    
    const error = new AppError(
      `AI service rate limit exceeded. Try again in ${Math.ceil(secs / 60)} minutes.`,
      429,
      {
        retryAfter: secs,
        limit: 20,
        windowMs: WINDOW_MS,
        type: 'ai_limit'
      }
    );
    
    next(error);
  }
};

/**
 * Reset rate limits for a user (admin function)
 */
export const resetUserRateLimit = async (userId: string): Promise<void> => {
  const key = `user:${userId}`;
  
  try {
    await Promise.all([
      generalRateLimiter.delete(key),
      uploadRateLimiter.delete(key),
      aiRateLimiter.delete(key)
    ]);
    
    logger.info('Rate limits reset for user', { userId });
  } catch (error) {
    logger.error('Failed to reset rate limits', { userId, error });
    throw error;
  }
};