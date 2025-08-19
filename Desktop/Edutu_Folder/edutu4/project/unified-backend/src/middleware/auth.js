/**
 * Authentication Middleware
 * Unified authentication handling for Firebase tokens and API keys
 */

const logger = require('../utils/logger');
const { firebase } = require('../services');
const { AppError } = require('../utils/errors');

/**
 * Required authentication middleware
 * Blocks requests without valid authentication
 */
const required = async (req, res, next) => {
  try {
    const authResult = await authenticateRequest(req);
    
    if (!authResult.success) {
      return next(new AppError('Authentication required', 401, authResult.error));
    }

    // Add user info to request
    req.user = authResult.user;
    req.authenticated = true;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Optional authentication middleware
 * Allows requests through but adds user info if authenticated
 */
const optional = async (req, res, next) => {
  try {
    const authResult = await authenticateRequest(req);
    
    if (authResult.success) {
      req.user = authResult.user;
      req.authenticated = true;
    } else {
      req.authenticated = false;
    }
    
    next();
  } catch (error) {
    logger.warn('Optional authentication failed:', error);
    req.authenticated = false;
    next();
  }
};

/**
 * Authenticate request using multiple methods
 */
async function authenticateRequest(req) {
  // Try Firebase ID token first
  const firebaseResult = await authenticateFirebaseToken(req);
  if (firebaseResult.success) {
    return firebaseResult;
  }

  // Try API key authentication
  const apiKeyResult = await authenticateApiKey(req);
  if (apiKeyResult.success) {
    return apiKeyResult;
  }

  return { 
    success: false, 
    error: 'No valid authentication method found' 
  };
}

/**
 * Authenticate Firebase ID token
 */
async function authenticateFirebaseToken(req) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No Bearer token provided' };
    }

    const token = authHeader.substring(7);
    const verificationResult = await firebase.verifyAuthToken(token);
    
    if (!verificationResult.success) {
      return { success: false, error: verificationResult.error };
    }

    // Get full user profile
    const userProfile = await firebase.getUserProfile(verificationResult.uid);
    
    return {
      success: true,
      user: {
        uid: verificationResult.uid,
        email: verificationResult.email,
        name: verificationResult.name,
        profile: userProfile,
        authMethod: 'firebase'
      }
    };

  } catch (error) {
    logger.warn('Firebase token authentication failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Authenticate API key (for external integrations)
 */
async function authenticateApiKey(req) {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return { success: false, error: 'No API key provided' };
    }

    // For now, we'll use a simple API key validation
    // In production, store API keys in database with permissions
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (validApiKeys.includes(apiKey)) {
      return {
        success: true,
        user: {
          type: 'api_client',
          apiKey: apiKey.substring(0, 8) + '...',
          authMethod: 'api_key'
        }
      };
    }

    return { success: false, error: 'Invalid API key' };

  } catch (error) {
    logger.warn('API key authentication failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Role-based access control middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.authenticated) {
      return next(new AppError('Authentication required', 401));
    }

    const userRoles = req.user.profile?.roles || ['user'];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Rate limiting by user ID
 */
const rateLimitByUser = (windowMs, maxRequests) => {
  const userLimits = new Map();

  return (req, res, next) => {
    const userId = req.user?.uid || req.ip;
    const now = Date.now();
    
    // Clean up old entries
    for (const [key, data] of userLimits.entries()) {
      if (now - data.windowStart > windowMs) {
        userLimits.delete(key);
      }
    }

    // Check current user's rate limit
    const userLimit = userLimits.get(userId) || { 
      count: 0, 
      windowStart: now 
    };

    if (now - userLimit.windowStart > windowMs) {
      // Reset window
      userLimit.count = 1;
      userLimit.windowStart = now;
    } else {
      userLimit.count++;
    }

    userLimits.set(userId, userLimit);

    if (userLimit.count > maxRequests) {
      return next(new AppError('Rate limit exceeded for user', 429));
    }

    next();
  };
};

/**
 * Ownership verification middleware
 * Ensures user can only access their own resources
 */
const requireOwnership = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId || req.query.userId;
  
  if (!resourceUserId) {
    return next(); // Skip if no userId in request
  }

  if (!req.authenticated || req.user.uid !== resourceUserId) {
    return next(new AppError('Access denied - resource ownership required', 403));
  }

  next();
};

/**
 * Development/testing authentication bypass
 */
const developmentBypass = (req, res, next) => {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
    req.user = {
      uid: 'dev-user',
      email: 'dev@edutu.com',
      name: 'Development User',
      authMethod: 'development'
    };
    req.authenticated = true;
    
    logger.debug('Development authentication bypass active');
  }
  
  next();
};

/**
 * Log authentication events
 */
const logAuthentication = (req, res, next) => {
  if (req.authenticated && req.user) {
    logger.info('User authenticated', {
      userId: req.user.uid,
      method: req.user.authMethod,
      endpoint: req.path,
      ip: req.ip
    });
  }
  
  next();
};

module.exports = {
  required,
  optional,
  requireRole,
  rateLimitByUser,
  requireOwnership,
  developmentBypass,
  logAuthentication,
  // Utility functions
  authenticateRequest,
  authenticateFirebaseToken,
  authenticateApiKey
};