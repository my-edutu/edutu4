import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        emailVerified?: boolean;
        name?: string;
      };
    }
  }
}

/**
 * Authentication middleware for Firebase ID tokens
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Authorization header is required', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header must start with Bearer', 401);
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      throw new AppError('ID token is required', 401);
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get additional user info from Firebase Auth
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      name: userRecord.displayName || undefined
    };

    // Log authentication success
    logger.debug('User authenticated successfully', {
      uid: req.user.uid,
      email: req.user.email,
      endpoint: req.originalUrl
    });

    next();
  } catch (error) {
    logger.error('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent')
    });

    if (error instanceof AppError) {
      return next(error);
    }

    // Handle Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return next(new AppError('Token has expired. Please login again.', 401));
      }
      if (error.message.includes('invalid')) {
        return next(new AppError('Invalid authentication token', 401));
      }
    }

    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Optional authentication middleware (allows unauthenticated requests)
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (idToken) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userRecord = await admin.auth().getUser(decodedToken.uid);

      req.user = {
        uid: decodedToken.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        name: userRecord.displayName || undefined
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on auth errors
    logger.warn('Optional authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: req.originalUrl
    });
    next();
  }
};

/**
 * Admin-only middleware (requires elevated permissions)
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user has admin custom claims
    const userRecord = await admin.auth().getUser(req.user.uid);
    const customClaims = userRecord.customClaims;

    if (!customClaims?.admin) {
      throw new AppError('Admin privileges required', 403);
    }

    logger.info('Admin access granted', {
      uid: req.user.uid,
      email: req.user.email,
      endpoint: req.originalUrl
    });

    next();
  } catch (error) {
    logger.error('Admin authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      uid: req.user?.uid,
      endpoint: req.originalUrl
    });

    if (error instanceof AppError) {
      return next(error);
    }

    next(new AppError('Admin authentication failed', 403));
  }
};