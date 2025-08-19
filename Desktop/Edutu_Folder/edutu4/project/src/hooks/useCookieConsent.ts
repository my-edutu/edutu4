import { useState, useEffect } from 'react';
import { CookieConsentState } from '../types/cookies';
import CookieUtils from '../utils/cookieUtils';

export const useCookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentState, setConsentState] = useState<CookieConsentState>({
    necessary: true, // Always true - required for basic functionality
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { hasConsent, state } = CookieUtils.getConsentStatus();
      
      if (hasConsent && state) {
        setConsentGiven(hasConsent);
        setConsentState(state);
        setShowBanner(false);
        // Initialize services with saved state
        CookieUtils.initializeServices(state);
      } else {
        // Show banner if no consent has been given
        setShowBanner(true);
      }
    }
  }, []);

  const acceptAllCookies = () => {
    const newState: CookieConsentState = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    
    setConsentState(newState);
    setConsentGiven(true);
    setShowBanner(false);
    
    localStorage.setItem('cookie_consent', 'true');
    localStorage.setItem('cookie_consent_state', JSON.stringify(newState));
    
    // Initialize analytics and other services here
    initializeServices(newState);
  };

  const declineOptionalCookies = () => {
    const newState: CookieConsentState = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    
    setConsentState(newState);
    setConsentGiven(true);
    setShowBanner(false);
    
    localStorage.setItem('cookie_consent', 'true');
    localStorage.setItem('cookie_consent_state', JSON.stringify(newState));
    
    // Initialize only necessary services
    initializeServices(newState);
  };

  const updateCookiePreferences = (newState: CookieConsentState) => {
    const finalState = { ...newState, necessary: true }; // Ensure necessary cookies are always enabled
    
    setConsentState(finalState);
    setConsentGiven(true);
    setShowBanner(false);
    
    localStorage.setItem('cookie_consent', 'true');
    localStorage.setItem('cookie_consent_state', JSON.stringify(finalState));
    
    initializeServices(finalState);
  };

  const resetConsent = () => {
    localStorage.removeItem('cookie_consent');
    localStorage.removeItem('cookie_consent_state');
    setConsentGiven(false);
    setShowBanner(true);
    setConsentState({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  const initializeServices = (state: CookieConsentState) => {
    // Use the centralized cookie utils for service initialization
    CookieUtils.initializeServices(state);
  };

  return {
    showBanner,
    consentGiven,
    consentState,
    acceptAllCookies,
    declineOptionalCookies,
    updateCookiePreferences,
    resetConsent,
    setShowBanner,
  };
};