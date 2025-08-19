import { CookieConsentState } from '../types/cookies';

/**
 * Utility functions for managing cookies and consent
 */

export class CookieUtils {
  private static readonly CONSENT_KEY = 'cookie_consent';
  private static readonly CONSENT_STATE_KEY = 'cookie_consent_state';
  
  /**
   * Get current cookie consent status
   */
  static getConsentStatus(): { hasConsent: boolean; state: CookieConsentState | null } {
    try {
      const hasConsent = localStorage.getItem(this.CONSENT_KEY) === 'true';
      const stateStr = localStorage.getItem(this.CONSENT_STATE_KEY);
      const state = stateStr ? JSON.parse(stateStr) as CookieConsentState : null;
      
      return { hasConsent, state };
    } catch (error) {
      console.warn('Failed to read cookie consent from localStorage:', error);
      return { hasConsent: false, state: null };
    }
  }

  /**
   * Check if a specific cookie type is allowed
   */
  static isCookieTypeAllowed(cookieType: keyof CookieConsentState): boolean {
    const { hasConsent, state } = this.getConsentStatus();
    
    if (!hasConsent || !state) {
      return false;
    }

    return state[cookieType] || false;
  }

  /**
   * Check if analytics cookies are allowed
   */
  static canUseAnalytics(): boolean {
    return this.isCookieTypeAllowed('analytics');
  }

  /**
   * Check if marketing cookies are allowed
   */
  static canUseMarketing(): boolean {
    return this.isCookieTypeAllowed('marketing');
  }

  /**
   * Check if preference cookies are allowed
   */
  static canUsePreferences(): boolean {
    return this.isCookieTypeAllowed('preferences');
  }

  /**
   * Set a cookie with respect to consent
   * Default expiration is 365 days for consent cookies
   */
  static setCookie(name: string, value: string, days: number = 365, cookieType: keyof CookieConsentState = 'necessary'): boolean {
    // Always allow necessary cookies
    if (cookieType === 'necessary' || this.isCookieTypeAllowed(cookieType)) {
      try {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
        return true;
      } catch (error) {
        console.warn('Failed to set cookie:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Get a cookie value
   */
  static getCookie(name: string): string | null {
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
          return c.substring(nameEQ.length, c.length);
        }
      }
    } catch (error) {
      console.warn('Failed to read cookie:', error);
    }
    
    return null;
  }

  /**
   * Delete a cookie
   */
  static deleteCookie(name: string): void {
    try {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    } catch (error) {
      console.warn('Failed to delete cookie:', error);
    }
  }

  /**
   * Initialize third-party services based on consent
   */
  static initializeServices(consentState: CookieConsentState): void {
    console.log('🍪 Initializing services with consent state:', consentState);

    // Initialize analytics if consent given
    if (consentState.analytics) {
      // Initialize Google Analytics
      this.initializeGoogleAnalytics();
      
      // Initialize Firebase Analytics
      this.initializeFirebaseAnalytics();
    } else {
      // Disable analytics if consent withdrawn
      this.disableAnalytics();
    }

    // Initialize marketing tools if consent given
    if (consentState.marketing) {
      // Initialize marketing pixels, ad tracking, etc.
      this.initializeMarketingTools();
    } else {
      // Disable marketing tools if consent withdrawn
      this.disableMarketingTools();
    }

    // Initialize preference-based features if consent given
    if (consentState.preferences) {
      // Initialize user preference storage
      this.initializePreferenceStorage();
    }
  }

  /**
   * Initialize Google Analytics (placeholder)
   */
  private static initializeGoogleAnalytics(): void {
    // Replace with your actual GA implementation
    console.log('📊 Google Analytics initialized');
    
    // Example implementation:
    // gtag('config', 'GA_MEASUREMENT_ID');
  }

  /**
   * Initialize Firebase Analytics (placeholder)
   */
  private static initializeFirebaseAnalytics(): void {
    // Replace with your actual Firebase Analytics implementation
    console.log('🔥 Firebase Analytics initialized');
    
    // Example implementation:
    // import { getAnalytics } from 'firebase/analytics';
    // const analytics = getAnalytics(app);
  }

  /**
   * Initialize marketing tools (placeholder)
   */
  private static initializeMarketingTools(): void {
    console.log('📈 Marketing tools initialized');
    
    // Example: Initialize Facebook Pixel, Google Ads, etc.
  }

  /**
   * Initialize preference storage (placeholder)
   */
  private static initializePreferenceStorage(): void {
    console.log('⚙️ Preference storage initialized');
    
    // Example: Enable enhanced localStorage, user settings sync, etc.
  }

  /**
   * Disable analytics services
   */
  private static disableAnalytics(): void {
    console.log('❌ Analytics services disabled');
    
    // Example: Stop GA tracking, disable Firebase Analytics
    // gtag('config', 'GA_MEASUREMENT_ID', { 'anonymize_ip': true, 'storage': 'none' });
  }

  /**
   * Disable marketing tools
   */
  private static disableMarketingTools(): void {
    console.log('❌ Marketing tools disabled');
    
    // Example: Remove marketing pixels, disable ad tracking
  }

  /**
   * Check if consent cookie exists and is valid
   */
  static hasValidConsent(): boolean {
    const { hasConsent, state } = this.getConsentStatus();
    return hasConsent && state !== null;
  }

  /**
   * Get consent expiry date (365 days from now)
   */
  static getConsentExpiryDate(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1); // 365 days
    return expiry;
  }

  /**
   * Clear all cookies and reset consent
   */
  static clearAllCookiesAndConsent(): void {
    try {
      // Clear consent data
      localStorage.removeItem(this.CONSENT_KEY);
      localStorage.removeItem(this.CONSENT_STATE_KEY);
      
      // Clear all cookies (except necessary ones)
      const cookies = document.cookie.split(";");
      
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // Don't delete necessary cookies (you can customize this list)
        const necessaryCookies = ['session', 'auth', 'csrf'];
        if (!necessaryCookies.some(necessary => name.includes(necessary))) {
          this.deleteCookie(name);
        }
      }
      
      console.log('🍪 All cookies and consent data cleared');
    } catch (error) {
      console.warn('Failed to clear cookies and consent:', error);
    }
  }
}

export default CookieUtils;