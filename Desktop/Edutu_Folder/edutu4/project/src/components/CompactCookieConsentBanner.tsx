import React, { useState } from 'react';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { CookieConsentState } from '../types/cookies';

const CompactCookieConsentBanner: React.FC = () => {
  const {
    showBanner,
    acceptAllCookies,
    declineOptionalCookies,
    updateCookiePreferences,
  } = useCookieConsent();

  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookieConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  if (!showBanner) return null;

  const handleSavePreferences = () => {
    updateCookiePreferences(preferences);
    setShowSettings(false);
  };

  const cookieTypes = [
    {
      key: 'necessary' as keyof CookieConsentState,
      title: 'Essential',
      description: 'Required for basic functionality',
      required: true,
    },
    {
      key: 'analytics' as keyof CookieConsentState,
      title: 'Analytics',
      description: 'Help improve our service',
      required: false,
    },
    {
      key: 'marketing' as keyof CookieConsentState,
      title: 'Marketing',
      description: 'Personalized advertisements',
      required: false,
    },
    {
      key: 'preferences' as keyof CookieConsentState,
      title: 'Preferences',
      description: 'Remember your settings',
      required: false,
    },
  ];

  return (
    <>
      {/* Compact Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
                   border-t border-gray-200 dark:border-gray-700 shadow-2xl animate-slide-up
                   safe-area-padding"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="px-4 py-3 pb-safe-bottom">
          {/* Compact Content */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg">🍪</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                  We use cookies to enhance your experience
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  Essential for functionality, optional for analytics
                </p>
              </div>
            </div>

            {/* Compact Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSettings(true)}
                className="btn-touch px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 
                         hover:text-gray-800 dark:hover:text-gray-200 
                         rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                         transition-all duration-200 ease-out
                         focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                         dark:focus:ring-offset-gray-900 no-tap-highlight"
                aria-label="Cookie settings"
              >
                Settings
              </button>
              
              <button
                onClick={declineOptionalCookies}
                className="btn-touch px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 
                         bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                         rounded-lg border border-gray-200 dark:border-gray-600 
                         transition-all duration-200 ease-out
                         focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                         dark:focus:ring-offset-gray-900 no-tap-highlight"
                aria-label="Decline optional cookies"
              >
                Decline
              </button>

              <button
                onClick={acceptAllCookies}
                className="btn-touch px-4 py-2 text-xs font-semibold text-white 
                         bg-gradient-to-r from-primary-600 to-primary-500 
                         hover:from-primary-700 hover:to-primary-600 
                         rounded-lg shadow-sm hover:shadow-md 
                         transition-all duration-200 ease-out transform hover:scale-[1.02]
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                         dark:focus:ring-offset-gray-900 no-tap-highlight
                         active:scale-95"
                aria-label="Accept all cookies"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal - Mobile Optimized */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          role="dialog"
          aria-labelledby="cookie-settings-title"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:w-full max-h-[85vh] overflow-hidden animate-slide-up sm:animate-scale-in">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-center justify-between">
                <h2
                  id="cookie-settings-title"
                  className="text-lg font-bold text-gray-900 dark:text-white"
                >
                  Cookie Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-touch p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 
                           rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors no-tap-highlight"
                  aria-label="Close cookie settings"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 max-h-[50vh] overflow-y-auto">
              <div className="space-y-4">
                {cookieTypes.map((cookieType) => (
                  <div
                    key={cookieType.key}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {cookieType.title}
                        </h3>
                        {cookieType.required && (
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                        {cookieType.description}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => {
                          if (!cookieType.required) {
                            setPreferences(prev => ({
                              ...prev,
                              [cookieType.key]: !prev[cookieType.key]
                            }));
                          }
                        }}
                        disabled={cookieType.required}
                        className={`btn-touch relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                                  dark:focus:ring-offset-gray-800 no-tap-highlight
                                  ${(preferences[cookieType.key] || cookieType.required) 
                                    ? 'bg-primary-600' 
                                    : 'bg-gray-300 dark:bg-gray-600'
                                  }
                                  ${cookieType.required ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-80'}`}
                        role="switch"
                        aria-checked={preferences[cookieType.key] || cookieType.required}
                        aria-labelledby={`${cookieType.key}-label`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                                    transition duration-200 ease-in-out
                                    ${(preferences[cookieType.key] || cookieType.required) ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-touch flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
                           bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                           rounded-xl border border-gray-200 dark:border-gray-600 
                           transition-all duration-200 ease-out
                           focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-800 no-tap-highlight"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="btn-touch flex-1 px-4 py-2.5 text-sm font-semibold text-white 
                           bg-gradient-to-r from-primary-600 to-primary-500 
                           hover:from-primary-700 hover:to-primary-600 
                           rounded-xl shadow-md hover:shadow-lg 
                           transition-all duration-200 ease-out transform hover:scale-[1.02]
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-800 no-tap-highlight"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompactCookieConsentBanner;