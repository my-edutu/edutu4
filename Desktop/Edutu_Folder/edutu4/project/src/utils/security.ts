// Security utilities and validation

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}


// Validate environment variables
export const validateEnvironment = (): void => {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    const isDevelopment = import.meta.env.DEV;
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    
    if (isDevelopment) {
      console.warn('⚠️', errorMessage, '- Running in development mode with mock Firebase services');
      return; // Don't throw in development
    } else {
      throw new SecurityError(errorMessage);
    }
  }
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    throw new SecurityError('Input must be a string');
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic XSS characters
    .substring(0, 1000); // Limit length
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Validate user age
export const isValidAge = (age: number): boolean => {
  return age >= 16 && age <= 30 && Number.isInteger(age);
};

// Validate user ID (Firebase UID format)
export const isValidUID = (uid: string): boolean => {
  return typeof uid === 'string' && uid.length > 0 && uid.length <= 128;
};

// Rate limiting for authentication attempts
class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private maxAttempts = 5;
  private windowMs = 15 * 60 * 1000; // 15 minutes

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if within limits
    if (record.count >= this.maxAttempts) {
      return false;
    }

    // Increment attempts
    record.count++;
    record.lastAttempt = now;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || record.count < this.maxAttempts) {
      return 0;
    }
    
    const remaining = this.windowMs - (Date.now() - record.lastAttempt);
    return Math.max(0, remaining);
  }
}

export const authRateLimiter = new RateLimiter();

// Content Security Policy headers (for production)
export const getCSPHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com",
      "frame-src https://*.firebaseapp.com"
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

// Secure local storage wrapper
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      const sanitizedKey = sanitizeInput(key);
      const sanitizedValue = sanitizeInput(value);
      localStorage.setItem(`edutu_${sanitizedKey}`, sanitizedValue);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  getItem: (key: string): string | null => {
    try {
      const sanitizedKey = sanitizeInput(key);
      return localStorage.getItem(`edutu_${sanitizedKey}`);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      const sanitizedKey = sanitizeInput(key);
      localStorage.removeItem(`edutu_${sanitizedKey}`);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }
};

// Log security events (in production, send to monitoring service)
export const logSecurityEvent = (event: string, details: Record<string, unknown>): void => {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // In development, log to console
  if (import.meta.env.DEV) {
    console.warn('Security Event:', securityEvent);
  }

  // In production, send to monitoring service
  // sendToSecurityMonitoring(securityEvent);
};