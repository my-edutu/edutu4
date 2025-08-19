/**
 * Example of how to integrate the cookie consent system
 * This shows how to use the components in different scenarios
 */

import React, { useState } from 'react';
import CompactCookieConsentBanner from '../components/CompactCookieConsentBanner';
import CookieConsentBanner from '../components/CookieConsentBanner';
import CookiePreferencesSettings from '../components/CookiePreferencesSettings';
import CookieSettingsButton from '../components/CookieSettingsButton';
import { useCookieConsent } from '../hooks/useCookieConsent';
import CookieUtils from '../utils/cookieUtils';

const CookieIntegrationExample: React.FC = () => {
  const [showFullBanner, setShowFullBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { consentGiven, consentState, resetConsent } = useCookieConsent();

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleResetConsent = () => {
    resetConsent();
    setShowFullBanner(false);
  };

  // Example of how to conditionally load analytics based on consent
  const handleLoadAnalytics = () => {
    if (CookieUtils.canUseAnalytics()) {
      console.log('✅ Analytics allowed - loading Google Analytics');
      // Load your analytics code here
    } else {
      console.log('❌ Analytics not allowed');
    }
  };

  const handleLoadMarketing = () => {
    if (CookieUtils.canUseMarketing()) {
      console.log('✅ Marketing allowed - loading pixels');
      // Load your marketing pixels here
    } else {
      console.log('❌ Marketing not allowed');
    }
  };

  if (showSettings) {
    return <CookiePreferencesSettings onBack={handleCloseSettings} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Cookie Consent Integration Example
          </h1>

          {/* Current Status */}
          <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Cookie Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Consent Given:</span>{' '}
                <span className={`font-semibold ${consentGiven ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {consentGiven ? 'Yes' : 'No'}
                </span>
              </div>
              {consentGiven && consentState && (
                <>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Analytics:</span>{' '}
                    <span className={`font-semibold ${consentState.analytics ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {consentState.analytics ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Marketing:</span>{' '}
                    <span className={`font-semibold ${consentState.marketing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {consentState.marketing ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Preferences:</span>{' '}
                    <span className={`font-semibold ${consentState.preferences ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {consentState.preferences ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleOpenSettings}
                  className="btn-touch p-4 text-left bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 
                           rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  <div className="text-primary-700 dark:text-primary-300 font-semibold mb-1">
                    Manage Cookie Preferences
                  </div>
                  <div className="text-primary-600 dark:text-primary-400 text-sm">
                    Open detailed cookie settings
                  </div>
                </button>

                <button
                  onClick={() => setShowFullBanner(!showFullBanner)}
                  className="btn-touch p-4 text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                           rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors
                           focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  <div className="text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Toggle Banner Type
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">
                    Switch between compact and full banner
                  </div>
                </button>

                <button
                  onClick={handleResetConsent}
                  className="btn-touch p-4 text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                           rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors
                           focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  <div className="text-red-700 dark:text-red-300 font-semibold mb-1">
                    Reset Cookie Consent
                  </div>
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    Clear consent and show banner again
                  </div>
                </button>

                <div className="space-y-2">
                  <button
                    onClick={handleLoadAnalytics}
                    className="btn-touch w-full p-3 text-sm text-left bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 
                             rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    <div className="text-blue-700 dark:text-blue-300 font-medium">
                      Test Analytics Loading
                    </div>
                  </button>
                  <button
                    onClick={handleLoadMarketing}
                    className="btn-touch w-full p-3 text-sm text-left bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 
                             rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    <div className="text-purple-700 dark:text-purple-300 font-medium">
                      Test Marketing Loading
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Usage Examples */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Usage in Your App
              </h2>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  1. Add to your main App component:
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-800 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`import CompactCookieConsentBanner from './components/CompactCookieConsentBanner';

// In your render method:
<CompactCookieConsentBanner />
<CookieSettingsButton onOpenSettings={() => setShowCookieSettings(true)} />`}
                </pre>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                  2. Check consent before loading services:
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-800 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`import CookieUtils from './utils/cookieUtils';

// Before initializing analytics
if (CookieUtils.canUseAnalytics()) {
  // Initialize Google Analytics
  gtag('config', 'GA_MEASUREMENT_ID');
}

// Before setting marketing cookies
if (CookieUtils.canUseMarketing()) {
  // Initialize Facebook Pixel, etc.
}`}
                </pre>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                  3. Add cookie settings to your privacy/settings page:
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-800 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`import CookiePreferencesSettings from './components/CookiePreferencesSettings';

// In your settings screen:
<CookiePreferencesSettings onBack={() => navigateBack()} />`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Banners */}
      {showFullBanner ? (
        <CookieConsentBanner />
      ) : (
        <CompactCookieConsentBanner />
      )}

      {/* Floating Settings Button */}
      <CookieSettingsButton onOpenSettings={handleOpenSettings} />
    </div>
  );
};

export default CookieIntegrationExample;