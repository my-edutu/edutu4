"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const admin = __importStar(require("firebase-admin"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Authentication middleware for Firebase ID tokens
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AppError('Authorization header is required', 401);
        }
        if (!authHeader.startsWith('Bearer ')) {
            throw new errors_1.AppError('Authorization header must start with Bearer', 401);
        }
        const idToken = authHeader.split('Bearer ')[1];
        if (!idToken) {
            throw new errors_1.AppError('ID token is required', 401);
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
        logger_1.logger.debug('User authenticated successfully', {
            uid: req.user.uid,
            email: req.user.email,
            endpoint: req.originalUrl
        });
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: req.originalUrl,
            userAgent: req.get('User-Agent')
        });
        if (error instanceof errors_1.AppError) {
            return next(error);
        }
        // Handle Firebase Auth errors
        if (error instanceof Error) {
            if (error.message.includes('expired')) {
                return next(new errors_1.AppError('Token has expired. Please login again.', 401));
            }
            if (error.message.includes('invalid')) {
                return next(new errors_1.AppError('Invalid authentication token', 401));
            }
        }
        next(new errors_1.AppError('Authentication failed', 401));
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Optional authentication middleware (allows unauthenticated requests)
 */
const optionalAuthMiddleware = async (req, res, next) => {
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
    }
    catch (error) {
        // For optional auth, we don't fail on auth errors
        logger_1.logger.warn('Optional authentication failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: req.originalUrl
        });
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
/**
 * Admin-only middleware (requires elevated permissions)
 */
const adminMiddleware = async (req, res, next) => {
    var _a;
    try {
        if (!req.user) {
            throw new errors_1.AppError('Authentication required', 401);
        }
        // Check if user has admin custom claims
        const userRecord = await admin.auth().getUser(req.user.uid);
        const customClaims = userRecord.customClaims;
        if (!(customClaims === null || customClaims === void 0 ? void 0 : customClaims.admin)) {
            throw new errors_1.AppError('Admin privileges required', 403);
        }
        logger_1.logger.info('Admin access granted', {
            uid: req.user.uid,
            email: req.user.email,
            endpoint: req.originalUrl
        });
        next();
    }
    catch (error) {
        logger_1.logger.error('Admin authentication failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            uid: (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid,
            endpoint: req.originalUrl
        });
        if (error instanceof errors_1.AppError) {
            return next(error);
        }
        next(new errors_1.AppError('Admin authentication failed', 403));
    }
};
exports.adminMiddleware = adminMiddleware;
//# sourceMappingURL=auth.js.map