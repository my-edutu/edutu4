/**
 * Authentication Middleware for Firebase Functions
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Verify Firebase ID token
 */
export async function verifyFirebaseToken(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal authentication error'
    });
  }
}

/**
 * Require user to own the resource (userId in params or body matches token uid)
 */
export function requireOwnership(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const requestUserId = req.params.userId || req.body.userId;
    const tokenUserId = req.user.uid;

    if (!requestUserId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'User ID required in request'
      });
      return;
    }

    if (requestUserId !== tokenUserId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: user ID mismatch'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({
      error: 'Authorization error',
      message: 'Internal authorization error'
    });
  }
}

/**
 * Rate limiting by user ID
 */
export function rateLimitByUser(windowMs: number, maxRequests: number) {
  const userRequestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.uid;
      const now = Date.now();
      const userLimit = userRequestCounts.get(userId);

      if (!userLimit || now > userLimit.resetTime) {
        // Reset or initialize user limit
        userRequestCounts.set(userId, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
        return;
      }

      if (userLimit.count >= maxRequests) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded for user',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        });
        return;
      }

      userLimit.count++;
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      res.status(500).json({
        error: 'Rate limiting error',
        message: 'Internal rate limiting error'
      });
    }
  };
}