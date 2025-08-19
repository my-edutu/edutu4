/**
 * Turnstile Service - Frontend integration with Cloudflare Turnstile
 */

interface TurnstileVerificationResponse {
  success: boolean;
  message: string;
  verified?: boolean;
  score?: number;
  action?: string;
  code?: string;
}

interface SignupWithTurnstileRequest {
  turnstileToken: string;
  email: string;
  name: string;
  age: number;
  userAgent?: string;
}

export class TurnstileService {
  private static readonly FUNCTIONS_BASE_URL = import.meta.env.PROD
    ? 'https://us-central1-edutu-3.cloudfunctions.net'
    : 'http://localhost:5001/edutu-3/us-central1';
  
  private static readonly DEMO_MODE = import.meta.env.VITE_TURNSTILE_DEMO_MODE === 'true';

  /**
   * Verify a Turnstile token with the backend
   */
  static async verifyToken(
    token: string, 
    email?: string
  ): Promise<TurnstileVerificationResponse> {
    // Demo mode: simulate successful verification
    if (this.DEMO_MODE) {
      return this.simulateVerification(token, email);
    }

    try {
      const response = await fetch(`${this.FUNCTIONS_BASE_URL}/verifyTurnstile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          userAgent: navigator.userAgent
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TurnstileVerificationResponse = await response.json();
      return result;

    } catch (error) {
      console.error('Turnstile verification error:', error);
      return {
        success: false,
        message: 'Network error during CAPTCHA verification. Please try again.',
      };
    }
  }

  /**
   * Pre-validate signup with Turnstile before Firebase Auth
   * This ensures CAPTCHA is verified before user creation
   */
  static async preValidateSignup(
    signupData: SignupWithTurnstileRequest
  ): Promise<TurnstileVerificationResponse> {
    // Demo mode: simulate successful validation
    if (this.DEMO_MODE) {
      return this.simulateSignupValidation(signupData);
    }

    try {
      const response = await fetch(`${this.FUNCTIONS_BASE_URL}/signupWithTurnstile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...signupData,
          userAgent: navigator.userAgent
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TurnstileVerificationResponse = await response.json();
      return result;

    } catch (error) {
      console.error('Turnstile signup pre-validation error:', error);
      return {
        success: false,
        message: 'Network error during signup validation. Please try again.',
      };
    }
  }

  /**
   * Get the site key for Turnstile
   * In production, this should come from environment variables
   */
  static getSiteKey(): string {
    // Replace with your actual Turnstile site key
    return import.meta.env.VITE_TURNSTILE_SITE_KEY || 'your-turnstile-site-key-here';
  }

  /**
   * Check if Turnstile is enabled
   */
  static isEnabled(): boolean {
    const siteKey = this.getSiteKey();
    return siteKey !== 'your-turnstile-site-key-here' && !!siteKey;
  }

  /**
   * Check if demo mode is active
   */
  static isDemoMode(): boolean {
    return this.DEMO_MODE;
  }

  /**
   * Helper method to validate Turnstile token format
   */
  static isValidToken(token: string): boolean {
    return !!(token && typeof token === 'string' && token.length > 0);
  }

  /**
   * Handle Turnstile error codes and provide user-friendly messages
   */
  static getErrorMessage(errorCode?: string): string {
    switch (errorCode) {
      case 'turnstile-verification-failed':
        return 'CAPTCHA verification failed. Please try again.';
      case 'timeout-or-duplicate':
        return 'CAPTCHA has expired or was already used. Please refresh and try again.';
      case 'invalid-input-response':
        return 'Invalid CAPTCHA response. Please refresh the page and try again.';
      case 'bad-request':
        return 'Invalid request. Please refresh the page and try again.';
      case 'missing-input-secret':
        return 'Server configuration error. Please contact support.';
      case 'invalid-input-secret':
        return 'Server configuration error. Please contact support.';
      case 'missing-input-response':
        return 'Please complete the CAPTCHA challenge.';
      default:
        return 'CAPTCHA verification failed. Please try again.';
    }
  }

  /**
   * Demo mode: simulate successful token verification
   */
  private static async simulateVerification(
    token: string, 
    email?: string
  ): Promise<TurnstileVerificationResponse> {
    console.log('🔧 Demo mode: Simulating Turnstile verification', { token: token.substring(0, 20) + '...', email });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Simulate successful verification for demo tokens
    if (token.startsWith('demo_token_')) {
      return {
        success: true,
        message: 'Demo verification successful',
        verified: true,
        score: 0.9,
        action: 'demo-verification'
      };
    }
    
    // Simulate occasional failure for realistic testing
    if (Math.random() < 0.1) {
      return {
        success: false,
        message: 'Demo verification failed (simulated)',
        code: 'demo-failure'
      };
    }
    
    return {
      success: true,
      message: 'Demo verification successful',
      verified: true,
      score: 0.85,
      action: 'demo-verification'
    };
  }

  /**
   * Demo mode: simulate successful signup validation
   */
  private static async simulateSignupValidation(
    signupData: SignupWithTurnstileRequest
  ): Promise<TurnstileVerificationResponse> {
    console.log('🔧 Demo mode: Simulating signup validation', { 
      email: signupData.email, 
      name: signupData.name,
      token: signupData.turnstileToken.substring(0, 20) + '...'
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    // Simulate successful validation
    return {
      success: true,
      message: 'Demo signup validation successful',
      verified: true,
      score: 0.9,
      action: 'demo-signup-validation'
    };
  }
}

/**
 * Hook for using Turnstile in React components
 */
export const useTurnstile = () => {
  const isEnabled = TurnstileService.isEnabled();
  const isDemoMode = TurnstileService.isDemoMode();
  const siteKey = TurnstileService.getSiteKey();

  const verifyToken = async (token: string, email?: string) => {
    if (!isEnabled && !isDemoMode) {
      return { success: true, message: 'CAPTCHA disabled in development' };
    }

    if (!TurnstileService.isValidToken(token)) {
      return { success: false, message: 'Please complete the CAPTCHA challenge' };
    }

    return await TurnstileService.verifyToken(token, email);
  };

  const preValidateSignup = async (signupData: SignupWithTurnstileRequest) => {
    if (!isEnabled && !isDemoMode) {
      return { success: true, message: 'CAPTCHA disabled in development' };
    }

    return await TurnstileService.preValidateSignup(signupData);
  };

  return {
    isEnabled,
    isDemoMode,
    siteKey,
    verifyToken,
    preValidateSignup,
    getErrorMessage: TurnstileService.getErrorMessage,
    isValidToken: TurnstileService.isValidToken
  };
};

export default TurnstileService;