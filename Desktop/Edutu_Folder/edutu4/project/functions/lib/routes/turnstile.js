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
exports.signupWithTurnstile = exports.verifyTurnstile = void 0;
exports.verifyTurnstileToken = verifyTurnstileToken;
exports.requireTurnstileVerification = requireTurnstileVerification;
const v1_1 = require("firebase-functions/v1");
const functions = __importStar(require("firebase-functions"));
/**
 * Verify Cloudflare Turnstile token on server side
 */
async function verifyTurnstileToken(token, remoteIp) {
    var _a, _b;
    const secretKey = (_b = (_a = functions.config()) === null || _a === void 0 ? void 0 : _a.turnstile) === null || _b === void 0 ? void 0 : _b.secret_key;
    if (!secretKey) {
        v1_1.logger.error('Turnstile secret key not configured');
        return {
            success: false,
            message: 'Server configuration error'
        };
    }
    if (!token) {
        v1_1.logger.warn('Turnstile token missing');
        return {
            success: false,
            message: 'CAPTCHA token is required'
        };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);
        if (remoteIp) {
            formData.append('remoteip', remoteIp);
        }
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });
        if (!response.ok) {
            v1_1.logger.error(`Turnstile API error: ${response.status} ${response.statusText}`);
            return {
                success: false,
                message: 'CAPTCHA verification service error'
            };
        }
        const result = await response.json();
        if (result.success) {
            v1_1.logger.info('Turnstile verification successful', {
                hostname: result.hostname,
                action: result.action,
                challenge_ts: result.challenge_ts
            });
            return {
                success: true,
                message: 'CAPTCHA verification successful',
                action: result.action
            };
        }
        else {
            v1_1.logger.warn('Turnstile verification failed', {
                errorCodes: result['error-codes'],
                hostname: result.hostname
            });
            // Map common error codes to user-friendly messages
            const errorCodes = result['error-codes'] || [];
            let message = 'CAPTCHA verification failed';
            if (errorCodes.includes('timeout-or-duplicate')) {
                message = 'CAPTCHA token has expired or already been used. Please try again.';
            }
            else if (errorCodes.includes('invalid-input-response')) {
                message = 'Invalid CAPTCHA response. Please try again.';
            }
            else if (errorCodes.includes('bad-request')) {
                message = 'Invalid CAPTCHA request. Please refresh the page and try again.';
            }
            return {
                success: false,
                message
            };
        }
    }
    catch (error) {
        v1_1.logger.error('Turnstile verification error:', error);
        return {
            success: false,
            message: 'CAPTCHA verification failed due to network error'
        };
    }
}
/**
 * HTTP Cloud Function to verify Turnstile token
 * This can be called from frontend during signup
 */
exports.verifyTurnstile = functions
    .region('us-central1')
    .https
    .onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { token, email, userAgent } = req.body;
        const clientIp = req.get('CF-Connecting-IP') ||
            req.get('X-Forwarded-For') ||
            req.connection.remoteAddress;
        // Basic request validation
        if (!token || typeof token !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Invalid CAPTCHA token'
            });
            return;
        }
        // Rate limiting (basic implementation)
        const rateLimitKey = clientIp || 'unknown';
        // In production, implement proper rate limiting with Redis or similar
        v1_1.logger.info('Turnstile verification request', {
            email: email ? `${email.substring(0, 3)}***` : 'none',
            clientIp: clientIp ? `${clientIp.substring(0, 7)}***` : 'none',
            userAgent: userAgent ? userAgent.substring(0, 50) : 'none'
        });
        const result = await verifyTurnstileToken(token, clientIp);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        v1_1.logger.error('Turnstile verification handler error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
/**
 * Middleware function to verify Turnstile token in other Cloud Functions
 * Use this in your signup function to validate CAPTCHA before creating user
 */
async function requireTurnstileVerification(token, remoteIp) {
    const result = await verifyTurnstileToken(token, remoteIp);
    if (!result.success) {
        const error = new Error(result.message);
        error.code = 'turnstile-verification-failed';
        throw error;
    }
    v1_1.logger.info('Turnstile verification passed for signup');
}
/**
 * Enhanced signup function with Turnstile verification
 * This replaces or enhances your existing signup logic
 */
exports.signupWithTurnstile = functions
    .region('us-central1')
    .https
    .onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { turnstileToken, email, name, age, userAgent } = req.body;
        const clientIp = req.get('CF-Connecting-IP') ||
            req.get('X-Forwarded-For') ||
            req.connection.remoteAddress;
        // Validate required fields
        if (!turnstileToken || !email || !name || !age) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
            return;
        }
        // First, verify Turnstile token
        try {
            await requireTurnstileVerification(turnstileToken, clientIp);
        }
        catch (error) {
            v1_1.logger.warn('Turnstile verification failed for signup', {
                email: `${email.substring(0, 3)}***`,
                error: error.message
            });
            res.status(400).json({
                success: false,
                message: error.message || 'CAPTCHA verification failed',
                code: 'turnstile-verification-failed'
            });
            return;
        }
        // If Turnstile verification passes, proceed with user creation
        // Note: The actual Firebase Auth user creation should still be done on the client side
        // This function validates the CAPTCHA and can store additional user data
        v1_1.logger.info('Signup request with valid Turnstile token', {
            email: `${email.substring(0, 3)}***`,
            name: name.substring(0, 3) + '***'
        });
        res.status(200).json({
            success: true,
            message: 'CAPTCHA verified successfully, proceed with signup',
            verified: true
        });
    }
    catch (error) {
        v1_1.logger.error('Signup with Turnstile handler error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
//# sourceMappingURL=turnstile.js.map