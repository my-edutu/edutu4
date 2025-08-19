/**
 * Authentication Middleware
 * Handles Firebase Auth token verification and user context
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Verify Firebase ID token middleware
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authorization header missing',
        message: 'Please include Authorization header with Bearer token'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Authorization header must start with "Bearer "'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Token missing',
        message: 'No token provided in authorization header'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      firebase: decodedToken
    };

    logger.debug(`User authenticated: ${decodedToken.uid}`);
    next();

  } catch (error) {
    logger.warn('Token verification failed:', {
      error: error.message,
      code: error.code
    });

    let statusCode = 401;
    let message = 'Invalid or expired token';

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      message = 'Token has expired, please refresh';
    } else if (error.code === 'auth/id-token-revoked') {
      message = 'Token has been revoked, please sign in again';
    } else if (error.code === 'auth/invalid-id-token') {
      message = 'Invalid token format';
    } else if (error.code === 'auth/user-disabled') {
      message = 'User account has been disabled';
    }

    res.status(statusCode).json({
      error: 'Authentication failed',
      message,
      code: error.code || 'auth/unknown-error'
    });
  }
}

/**
 * Optional authentication - adds user context if token is present
 * but doesn't fail if token is missing
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user context
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      req.user = null;
      return next();
    }

    // Try to verify token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      firebase: decodedToken
    };

    logger.debug(`Optional auth successful for user: ${decodedToken.uid}`);
    next();

  } catch (error) {
    // Log warning but don't fail the request
    logger.warn('Optional auth failed, continuing without user context:', error.message);
    req.user = null;
    next();
  }
}

/**
 * Check if authenticated user matches the requested userId
 */
function requireOwnership(req, res, next) {
  try {
    const requestedUserId = req.params.userId || req.body.userId;
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'This operation requires authentication'
      });
    }

    if (!requestedUserId) {
      return res.status(400).json({
        error: 'User ID missing',
        message: 'User ID is required for this operation'
      });
    }

    if (req.user.uid !== requestedUserId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own data'
      });
    }

    next();

  } catch (error) {
    logger.error('Ownership check failed:', error);
    res.status(500).json({
      error: 'Authorization check failed',
      message: error.message
    });
  }
}

/**
 * Admin role check middleware
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Admin access requires authentication'
      });
    }

    // Check if user has admin custom claims
    const userRecord = await admin.auth().getUser(req.user.uid);
    const customClaims = userRecord.customClaims || {};

    if (!customClaims.admin) {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'This operation requires admin privileges'
      });
    }

    logger.info(`Admin operation authorized for user: ${req.user.uid}`);
    next();

  } catch (error) {
    logger.error('Admin check failed:', error);
    res.status(500).json({
      error: 'Authorization check failed',
      message: error.message
    });
  }
}

/**
 * Rate limiting by user ID
 */
const userRateLimits = new Map();

function rateLimitByUser(windowMs = 60000, maxRequests = 30) {
  return (req, res, next) => {
    try {
      const userId = req.user?.uid || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (userRateLimits.has(userId)) {
        const requests = userRateLimits.get(userId);
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        userRateLimits.set(userId, validRequests);
      } else {
        userRateLimits.set(userId, []);
      }

      const userRequests = userRateLimits.get(userId);

      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
          retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
        });
      }

      // Add current request
      userRequests.push(now);
      userRateLimits.set(userId, userRequests);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - userRequests.length,
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });

      next();

    } catch (error) {
      logger.error('Rate limiting failed:', error);
      next(); // Continue on rate limiting errors
    }
  };
}

/**
 * Request logging middleware
 */
function logRequest(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.uid || 'anonymous',
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
}

// Clean up rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  for (const [userId, requests] of userRateLimits.entries()) {
    const validRequests = requests.filter(timestamp => timestamp > fiveMinutesAgo);
    if (validRequests.length === 0) {
      userRateLimits.delete(userId);
    } else {
      userRateLimits.set(userId, validRequests);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  verifyFirebaseToken,
  optionalAuth,
  requireOwnership,
  requireAdmin,
  rateLimitByUser,
  logRequest,
};