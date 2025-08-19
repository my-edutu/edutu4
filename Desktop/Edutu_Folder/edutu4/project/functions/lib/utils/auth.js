"use strict";
/**
 * Authentication Middleware for Firebase Functions
 */
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
exports.verifyFirebaseToken = verifyFirebaseToken;
exports.requireOwnership = requireOwnership;
exports.rateLimitByUser = rateLimitByUser;
const admin = __importStar(require("firebase-admin"));
/**
 * Verify Firebase ID token
 */
async function verifyFirebaseToken(req, res, next) {
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
        }
        catch (tokenError) {
            console.error('Token verification failed:', tokenError);
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }
    }
    catch (error) {
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
function requireOwnership(req, res, next) {
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
    }
    catch (error) {
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
function rateLimitByUser(windowMs, maxRequests) {
    const userRequestCounts = new Map();
    return (req, res, next) => {
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
        }
        catch (error) {
            console.error('Rate limiting error:', error);
            res.status(500).json({
                error: 'Rate limiting error',
                message: 'Internal rate limiting error'
            });
        }
    };
}
//# sourceMappingURL=auth.js.map