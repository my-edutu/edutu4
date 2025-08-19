export interface CookieConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface CookieConsentSettings {
  showBanner: boolean;
  consentGiven: boolean;
  consentState: CookieConsentState;
}

export type CookieType = 'necessary' | 'analytics' | 'marketing' | 'preferences';

export interface CookieTypeConfig {
  key: CookieType;
  title: string;
  description: string;
  required: boolean;
}

export interface CookieConsentActions {
  acceptAllCookies: () => void;
  declineOptionalCookies: () => void;
  updateCookiePreferences: (state: CookieConsentState) => void;
  resetConsent: () => void;
  setShowBanner: (show: boolean) => void;
}