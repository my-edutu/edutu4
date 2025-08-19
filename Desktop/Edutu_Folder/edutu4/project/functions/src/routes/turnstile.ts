import { Request, Response } from 'express';
import { logger } from 'firebase-functions/v1';
import * as functions from 'firebase-functions';

interface TurnstileVerificationRequest {
  token: string;
  email?: string;
  userAgent?: string;
  ip?: string;
}

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

interface VerificationResult {
  success: boolean;
  message: string;
  score?: number;
  action?: string;
}

/**
 * Verify Cloudflare Turnstile token on server side
 */
export async function verifyTurnstileToken(
  token: string, 
  remoteIp?: string
): Promise<VerificationResult> {
  const secretKey = functions.config()?.turnstile?.secret_key;
  
  if (!secretKey) {
    logger.error('Turnstile secret key not configured');
    return {
      success: false,
      message: 'Server configuration error'
    };
  }

  if (!token) {
    logger.warn('Turnstile token missing');
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
      logger.error(`Turnstile API error: ${response.status} ${response.statusText}`);
      return {
        success: false,
        message: 'CAPTCHA verification service error'
      };
    }

    const result: TurnstileResponse = await response.json();

    if (result.success) {
      logger.info('Turnstile verification successful', {
        hostname: result.hostname,
        action: result.action,
        challenge_ts: result.challenge_ts
      });

      return {
        success: true,
        message: 'CAPTCHA verification successful',
        action: result.action
      };
    } else {
      logger.warn('Turnstile verification failed', {
        errorCodes: result['error-codes'],
        hostname: result.hostname
      });

      // Map common error codes to user-friendly messages
      const errorCodes = result['error-codes'] || [];
      let message = 'CAPTCHA verification failed';

      if (errorCodes.includes('timeout-or-duplicate')) {
        message = 'CAPTCHA token has expired or already been used. Please try again.';
      } else if (errorCodes.includes('invalid-input-response')) {
        message = 'Invalid CAPTCHA response. Please try again.';
      } else if (errorCodes.includes('bad-request')) {
        message = 'Invalid CAPTCHA request. Please refresh the page and try again.';
      }

      return {
        success: false,
        message
      };
    }
  } catch (error) {
    logger.error('Turnstile verification error:', error);
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
export const verifyTurnstile = functions
  .region('us-central1')
  .https
  .onRequest(async (req: Request, res: Response) => {
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
      const { token, email, userAgent }: TurnstileVerificationRequest = req.body;
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

      logger.info('Turnstile verification request', {
        email: email ? `${email.substring(0, 3)}***` : 'none',
        clientIp: clientIp ? `${clientIp.substring(0, 7)}***` : 'none',
        userAgent: userAgent ? userAgent.substring(0, 50) : 'none'
      });

      const result = await verifyTurnstileToken(token, clientIp);
      
      res.status(result.success ? 200 : 400).json(result);
      
    } catch (error) {
      logger.error('Turnstile verification handler error:', error);
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
export async function requireTurnstileVerification(
  token: string, 
  remoteIp?: string
): Promise<void> {
  const result = await verifyTurnstileToken(token, remoteIp);
  
  if (!result.success) {
    const error = new Error(result.message);
    (error as any).code = 'turnstile-verification-failed';
    throw error;
  }
  
  logger.info('Turnstile verification passed for signup');
}

/**
 * Enhanced signup function with Turnstile verification
 * This replaces or enhances your existing signup logic
 */
export const signupWithTurnstile = functions
  .region('us-central1')
  .https
  .onRequest(async (req: Request, res: Response) => {
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
      const { 
        turnstileToken, 
        email, 
        name, 
        age,
        userAgent 
      } = req.body;

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
      } catch (error: any) {
        logger.warn('Turnstile verification failed for signup', {
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
      
      logger.info('Signup request with valid Turnstile token', {
        email: `${email.substring(0, 3)}***`,
        name: name.substring(0, 3) + '***'
      });

      res.status(200).json({
        success: true,
        message: 'CAPTCHA verified successfully, proceed with signup',
        verified: true
      });

    } catch (error) {
      logger.error('Signup with Turnstile handler error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });