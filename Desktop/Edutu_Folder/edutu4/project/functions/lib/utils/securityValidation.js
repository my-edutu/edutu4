"use strict";
/**
 * Enhanced Security Validation for Edutu Chat System
 * Comprehensive input sanitization, rate limiting, and validation
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
exports.validateUserId = validateUserId;
exports.validateChatMessage = validateChatMessage;
exports.validateSessionId = validateSessionId;
exports.checkRateLimit = checkRateLimit;
exports.logSecurityEvent = logSecurityEvent;
exports.isUserBlocked = isUserBlocked;
exports.blockUser = blockUser;
exports.validateChatRequest = validateChatRequest;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const db = admin.firestore();
/**
 * Validate and sanitize user ID
 */
function validateUserId(userId) {
    if (!userId || typeof userId !== 'string') {
        return { isValid: false, error: 'User ID is required and must be a string' };
    }
    // Firebase UID validation
    const firebaseUidRegex = /^[a-zA-Z0-9]{28}$/;
    if (!firebaseUidRegex.test(userId)) {
        return { isValid: false, error: 'Invalid user ID format' };
    }
    return { isValid: true, sanitizedInput: userId };
}
/**
 * Validate and sanitize chat message
 */
function validateChatMessage(message) {
    if (!message || typeof message !== 'string') {
        return { isValid: false, error: 'Message is required and must be a string' };
    }
    // Length validation
    if (message.length < 1) {
        return { isValid: false, error: 'Message cannot be empty' };
    }
    if (message.length > 2000) {
        return { isValid: false, error: 'Message too long (max 2000 characters)' };
    }
    // Basic XSS prevention
    const sanitizedMessage = sanitizeInput(message);
    // Check for potential abuse patterns
    if (isSpamMessage(sanitizedMessage)) {
        return { isValid: false, error: 'Message appears to be spam' };
    }
    // Check for harmful content
    if (containsHarmfulContent(sanitizedMessage)) {
        return { isValid: false, error: 'Message contains inappropriate content' };
    }
    return { isValid: true, sanitizedInput: sanitizedMessage };
}
/**
 * Validate session ID
 */
function validateSessionId(sessionId) {
    if (!sessionId) {
        return { isValid: true }; // Optional field
    }
    if (typeof sessionId !== 'string') {
        return { isValid: false, error: 'Session ID must be a string' };
    }
    // Session ID format validation
    const sessionIdRegex = /^chat_\d+_[a-zA-Z0-9]{7}$/;
    if (!sessionIdRegex.test(sessionId)) {
        return { isValid: false, error: 'Invalid session ID format' };
    }
    return { isValid: true, sanitizedInput: sessionId };
}
/**
 * Enhanced rate limiting with sliding window
 */
async function checkRateLimit(userId, action, windowMs = 60000, maxRequests = 20) {
    try {
        const now = Date.now();
        const windowStart = now - windowMs;
        const rateLimitKey = `rate_limit_${action}_${userId}`;
        const rateLimitDoc = await db.collection('rate_limits').doc(rateLimitKey).get();
        let attempts = [];
        if (rateLimitDoc.exists) {
            const data = rateLimitDoc.data();
            attempts = ((data === null || data === void 0 ? void 0 : data.attempts) || []).filter((timestamp) => timestamp > windowStart);
        }
        // Add current attempt
        attempts.push(now);
        // Check if limit exceeded
        const isBlocked = attempts.length > maxRequests;
        // Update rate limit document
        await db.collection('rate_limits').doc(rateLimitKey).set({
            attempts: attempts.slice(-maxRequests), // Keep only recent attempts
            lastUpdated: now,
            isBlocked
        }, { merge: true });
        return {
            attempts: attempts.length,
            resetTime: windowStart + windowMs,
            isBlocked
        };
    }
    catch (error) {
        console.error('Error checking rate limit:', error);
        // Fail open - allow request if rate limiting fails
        return {
            attempts: 0,
            resetTime: Date.now() + windowMs,
            isBlocked: false
        };
    }
}
/**
 * Advanced input sanitization
 */
function sanitizeInput(input) {
    // Remove potential XSS vectors
    let sanitized = input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/&lt;script/gi, '&amp;lt;script') // Encode script attempts
        .replace(/&lt;\/script/gi, '&amp;lt;/script');
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return sanitized;
}
/**
 * Detect spam patterns
 */
function isSpamMessage(message) {
    const lowerMessage = message.toLowerCase();
    // Check for repeated characters
    if (/(.)\1{10,}/.test(message)) {
        return true;
    }
    // Check for repeated words
    const words = lowerMessage.split(/\s+/);
    const wordCounts = words.reduce((counts, word) => {
        counts[word] = (counts[word] || 0) + 1;
        return counts;
    }, {});
    // If any word appears more than 5 times, likely spam
    if (Object.values(wordCounts).some(count => count > 5)) {
        return true;
    }
    // Check for common spam patterns
    const spamPatterns = [
        /click here/gi,
        /free money/gi,
        /urgent.{0,10}reply/gi,
        /guaranteed.{0,10}income/gi,
        /work from home/gi,
        /make.{0,10}\$\d+/gi
    ];
    return spamPatterns.some(pattern => pattern.test(lowerMessage));
}
/**
 * Check for harmful content
 */
function containsHarmfulContent(message) {
    const lowerMessage = message.toLowerCase();
    // Hate speech and discriminatory language
    const hateSpeechPatterns = [
        /\b(hate|kill|murder|destroy)\s+(all|every)?\s*\w+/gi,
        /\b(terrorist|bomb|attack|violence)\b/gi
    ];
    // Personal information patterns
    const personalInfoPatterns = [
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email (strict check)
    ];
    // Check all patterns
    const allPatterns = [...hateSpeechPatterns, ...personalInfoPatterns];
    return allPatterns.some(pattern => pattern.test(lowerMessage));
}
/**
 * Log security events
 */
async function logSecurityEvent(userId, eventType, details) {
    try {
        await db.collection('security_logs').add({
            userId,
            eventType,
            details,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            severity: getSeverityLevel(eventType),
            userAgent: details.userAgent || 'unknown',
            ipAddress: details.ipAddress || 'unknown'
        });
    }
    catch (error) {
        console.error('Error logging security event:', error);
        // Don't throw - logging failures shouldn't break the main flow
    }
}
/**
 * Get severity level for security events
 */
function getSeverityLevel(eventType) {
    switch (eventType) {
        case 'harmful_content':
            return 'high';
        case 'spam_detected':
            return 'medium';
        case 'rate_limit_exceeded':
            return 'medium';
        case 'invalid_input':
            return 'low';
        default:
            return 'low';
    }
}
/**
 * Check if user is temporarily blocked
 */
async function isUserBlocked(userId) {
    var _a;
    try {
        const blockDoc = await db.collection('user_blocks').doc(userId).get();
        if (!blockDoc.exists) {
            return { blocked: false };
        }
        const data = blockDoc.data();
        const blockedUntil = (_a = data === null || data === void 0 ? void 0 : data.blockedUntil) === null || _a === void 0 ? void 0 : _a.toDate();
        if (blockedUntil && blockedUntil > new Date()) {
            return {
                blocked: true,
                reason: (data === null || data === void 0 ? void 0 : data.reason) || 'Security violation',
                until: blockedUntil
            };
        }
        // Block expired, clean up
        await db.collection('user_blocks').doc(userId).delete();
        return { blocked: false };
    }
    catch (error) {
        console.error('Error checking user block status:', error);
        return { blocked: false }; // Fail open
    }
}
/**
 * Temporarily block user for security violations
 */
async function blockUser(userId, reason, durationMinutes = 60) {
    try {
        const blockedUntil = new Date(Date.now() + (durationMinutes * 60 * 1000));
        await db.collection('user_blocks').doc(userId).set({
            reason,
            blockedUntil: admin.firestore.Timestamp.fromDate(blockedUntil),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await logSecurityEvent(userId, 'rate_limit_exceeded', {
            reason,
            duration: durationMinutes,
            blockedUntil: blockedUntil.toISOString()
        });
    }
    catch (error) {
        console.error('Error blocking user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to apply security block');
    }
}
/**
 * Comprehensive validation middleware
 */
async function validateChatRequest(req) {
    var _a, _b, _c;
    const errors = [];
    const { userId, message, sessionId } = req.body;
    // Validate user ID
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.isValid) {
        errors.push(userIdValidation.error);
    }
    // Check if user is blocked
    if (userIdValidation.isValid) {
        const blockStatus = await isUserBlocked(userId);
        if (blockStatus.blocked) {
            errors.push(`User temporarily blocked: ${blockStatus.reason}. Try again after ${(_a = blockStatus.until) === null || _a === void 0 ? void 0 : _a.toLocaleString()}`);
        }
    }
    // Validate message
    const messageValidation = validateChatMessage(message);
    if (!messageValidation.isValid) {
        errors.push(messageValidation.error);
        // Log security events for specific validation failures
        if ((_b = messageValidation.error) === null || _b === void 0 ? void 0 : _b.includes('spam')) {
            await logSecurityEvent(userId, 'spam_detected', { message, error: messageValidation.error });
        }
        else if ((_c = messageValidation.error) === null || _c === void 0 ? void 0 : _c.includes('inappropriate')) {
            await logSecurityEvent(userId, 'harmful_content', { message, error: messageValidation.error });
        }
    }
    // Validate session ID
    const sessionIdValidation = validateSessionId(sessionId);
    if (!sessionIdValidation.isValid) {
        errors.push(sessionIdValidation.error);
    }
    // Check rate limits
    if (errors.length === 0) {
        const rateLimitInfo = await checkRateLimit(userId, 'chat', 60000, 15); // 15 messages per minute
        if (rateLimitInfo.isBlocked) {
            errors.push('Rate limit exceeded. Please wait before sending another message.');
            await logSecurityEvent(userId, 'rate_limit_exceeded', {
                attempts: rateLimitInfo.attempts,
                resetTime: new Date(rateLimitInfo.resetTime).toISOString()
            });
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? {
            userId: userIdValidation.sanitizedInput,
            message: messageValidation.sanitizedInput,
            sessionId: sessionIdValidation.sanitizedInput
        } : undefined
    };
}
//# sourceMappingURL=securityValidation.js.map