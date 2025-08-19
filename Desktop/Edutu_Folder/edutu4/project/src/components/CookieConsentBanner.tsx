import React, { useState } from 'react';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { CookieConsentState } from '../types/cookies';

const CookieConsentBanner: React.FC = () => {
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
      title: 'Necessary Cookies',
      description: 'Required for basic site functionality and security. These cannot be disabled.',
      required: true,
    },
    {
      key: 'analytics' as keyof CookieConsentState,
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      required: false,
    },
    {
      key: 'marketing' as keyof CookieConsentState,
      title: 'Marketing Cookies',
      description: 'Used to track visitors across websites to display relevant and engaging advertisements.',
      required: false,
    },
    {
      key: 'preferences' as keyof CookieConsentState,
      title: 'Preference Cookies',
      description: 'Remember your settings and preferences to provide a personalized experience.',
      required: false,
    },
  ];

  return (
    <>
      {/* Main Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 shadow-2xl animate-slide-up"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="safe-area-padding">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  id="cookie-banner-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
                >
                  🍪 We use cookies to enhance your experience
                </h3>
                <p
                  id="cookie-banner-description"
                  className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                >
                  We use cookies to provide essential functionality, analyze usage, and personalize content. 
                  You can manage your preferences at any time.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:ml-6">
                {/* Mobile: Stack buttons, Desktop: Inline */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 order-2 sm:order-1">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="btn-touch px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
                             bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                             rounded-xl border border-gray-200 dark:border-gray-600 
                             transition-all duration-200 ease-out
                             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                             dark:focus:ring-offset-gray-900 no-tap-highlight"
                    aria-label="Customize cookie preferences"
                  >
                    Customize
                  </button>
                  
                  <button
                    onClick={declineOptionalCookies}
                    className="btn-touch px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
                             bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                             rounded-xl border border-gray-200 dark:border-gray-600 
                             transition-all duration-200 ease-out
                             focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                             dark:focus:ring-offset-gray-900 no-tap-highlight"
                    aria-label="Decline optional cookies"
                  >
                    Decline Optional
                  </button>
                </div>

                <button
                  onClick={acceptAllCookies}
                  className="btn-touch px-6 py-2.5 text-sm font-semibold text-white 
                           bg-gradient-to-r from-primary-600 to-primary-500 
                           hover:from-primary-700 hover:to-primary-600 
                           rounded-xl shadow-md hover:shadow-lg 
                           transition-all duration-200 ease-out transform hover:scale-[1.02]
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-900 no-tap-highlight order-1 sm:order-2"
                  aria-label="Accept all cookies"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-labelledby="cookie-settings-title"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2
                  id="cookie-settings-title"
                  className="text-xl font-bold text-gray-900 dark:text-white"
                >
                  Cookie Preferences
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-touch p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 
                           rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors no-tap-highlight"
                  aria-label="Close cookie settings"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                Manage your cookie preferences. Some cookies are essential for our website to function properly.
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {cookieTypes.map((cookieType) => (
                  <div
                    key={cookieType.key}
                    className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        {cookieType.title}
                        {cookieType.required && (
                          <span className="ml-2 text-xs font-medium text-primary-600 dark:text-primary-400">
                            Required
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
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
                        className={`btn-touch relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
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
                        aria-describedby={`${cookieType.key}-description`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                                    transition duration-200 ease-in-out
                                    ${(preferences[cookieType.key] || cookieType.required) ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-touch px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
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
                  className="btn-touch px-6 py-2.5 text-sm font-semibold text-white 
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

export default CookieConsentBanner;