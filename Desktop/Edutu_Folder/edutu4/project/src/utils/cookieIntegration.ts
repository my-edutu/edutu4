/**
 * Cookie Integration Examples for Edutu AI Opportunity Coach
 * 
 * This file demonstrates how to properly integrate the cookie consent system
 * with various services used in the application.
 */

import CookieUtils from './cookieUtils';
import { CookieConsentState } from '../types/cookies';

/**
 * Example: Firebase Analytics Integration
 * Only track analytics if user has consented
 */
export const trackUserAction = (action: string, data?: any) => {
  if (CookieUtils.canUseAnalytics()) {
    // Initialize Firebase Analytics if not already done
    import('./firebaseAnalytics').then(({ analytics, logEvent }) => {
      if (analytics) {
        logEvent(analytics, action, data);
      }
    });
  } else {
    console.log('Analytics disabled by user preference');
  }
};

/**
 * Example: User Preferences Storage
 * Only store non-essential preferences if user has consented
 */
export const saveUserPreference = (key: string, value: any) => {
  if (CookieUtils.canUsePreferences()) {
    localStorage.setItem(`user_pref_${key}`, JSON.stringify(value));
    return true;
  } else {
    // Only store essential preferences (like accessibility settings)
    const essentialPrefs = ['theme', 'language', 'accessibility'];
    if (essentialPrefs.includes(key)) {
      localStorage.setItem(`essential_${key}`, JSON.stringify(value));
      return true;
    }
    return false;
  }
};

/**
 * Example: Marketing Pixel Integration
 * Only fire marketing pixels if user has consented
 */
export const trackConversion = (eventName: string, value?: number) => {
  if (CookieUtils.canUseMarketing()) {
    // Example: Facebook Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, { value });
    }
    
    // Example: Google Ads Conversion
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL',
        value: value,
        currency: 'USD'
      });
    }
  } else {
    console.log('Marketing tracking disabled by user preference');
  }
};

/**
 * Example: Session Storage with Consent
 * Store session data only if consent given
 */
export const storeSessionData = (key: string, data: any) => {
  if (CookieUtils.canUsePreferences() || CookieUtils.isCookieTypeAllowed('necessary')) {
    sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  }
  return false;
};

/**
 * Example: Third-party Service Initialization
 * Initialize services based on consent
 */
export const initializeThirdPartyServices = () => {
  const { hasConsent, state } = CookieUtils.getConsentStatus();
  
  if (!hasConsent || !state) {
    console.log('No consent given, skipping third-party services');
    return;
  }

  // Analytics Services
  if (state.analytics) {
    initializeGoogleAnalytics();
    initializeFirebaseAnalytics();
    initializeHotjar(); // Example heatmap service
  }

  // Marketing Services
  if (state.marketing) {
    initializeFacebookPixel();
    initializeGoogleAds();
    initializeLinkedInInsight();
  }

  // Preference Services
  if (state.preferences) {
    initializePersonalizationEngine();
    initializeABTesting();
  }
};

/**
 * Example: Google Analytics Initialization
 */
const initializeGoogleAnalytics = () => {
  if (typeof window.gtag === 'undefined') {
    // Load GA script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      anonymize_ip: false, // Since user consented
      cookie_expires: CookieUtils.getConsentExpiryDate().getTime()
    });
  }
};

/**
 * Example: Firebase Analytics Initialization
 */
const initializeFirebaseAnalytics = () => {
  import('../firebase/config').then(({ analytics }) => {
    if (analytics) {
      // Firebase analytics is now active
      console.log('Firebase Analytics initialized with consent');
    }
  });
};

/**
 * Example: Hotjar Initialization
 */
const initializeHotjar = () => {
  window._hjSettings = { hjid: 'HOTJAR_ID', hjsv: 6 };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://static.hotjar.com/c/hotjar-HOTJAR_ID.js?sv=6';
  document.head.appendChild(script);
};

/**
 * Example: Facebook Pixel Initialization
 */
const initializeFacebookPixel = () => {
  window.fbq = window.fbq || function() {
    (window.fbq.q = window.fbq.q || []).push(arguments);
  };
  window._fbq = window.fbq;
  window.fbq.push = window.fbq;
  window.fbq.loaded = true;
  window.fbq.version = '2.0';
  window.fbq.queue = [];

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  window.fbq('init', 'FACEBOOK_PIXEL_ID');
  window.fbq('track', 'PageView');
};

/**
 * Example: Google Ads Initialization
 */
const initializeGoogleAds = () => {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=AW-CONVERSION_ID';
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', 'AW-CONVERSION_ID');
};

/**
 * Example: LinkedIn Insight Tag
 */
const initializeLinkedInInsight = () => {
  window._linkedin_partner_id = 'LINKEDIN_PARTNER_ID';
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(window._linkedin_partner_id);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.appendChild(script);
};

/**
 * Example: Personalization Engine
 */
const initializePersonalizationEngine = () => {
  // Initialize personalization based on user preferences
  console.log('Personalization engine initialized');
};

/**
 * Example: A/B Testing
 */
const initializeABTesting = () => {
  // Initialize A/B testing framework
  console.log('A/B testing initialized');
};

/**
 * Example: Clean up when consent is withdrawn
 */
export const cleanupOnConsentWithdrawal = () => {
  // Clear analytics cookies
  CookieUtils.deleteCookie('_ga');
  CookieUtils.deleteCookie('_ga_*');
  CookieUtils.deleteCookie('_gid');
  
  // Clear marketing cookies
  CookieUtils.deleteCookie('_fbp');
  CookieUtils.deleteCookie('_fbc');
  
  // Clear preference data
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('user_pref_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  console.log('Cleaned up cookies and data after consent withdrawal');
};

/**
 * Window type extensions for third-party services
 */
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    _fbq: any;
    _hjSettings: { hjid: string; hjsv: number };
    _linkedin_partner_id: string;
    _linkedin_data_partner_ids: string[];
  }
}

/**
 * Example usage in components:
 * 
 * ```typescript
 * import { trackUserAction, saveUserPreference } from '../utils/cookieIntegration';
 * 
 * const handleGoalCreation = () => {
 *   // Track goal creation if analytics allowed
 *   trackUserAction('goal_created', { goalType: 'career' });
 *   
 *   // Save user preference if allowed
 *   saveUserPreference('lastGoalType', 'career');
 * };
 * ```
 */