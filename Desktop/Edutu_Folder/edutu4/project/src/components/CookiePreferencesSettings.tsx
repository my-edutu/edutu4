import React, { useState, useEffect } from 'react';
import { CookieConsentState } from '../types/cookies';
import CookieUtils from '../utils/cookieUtils';

interface CookiePreferencesSettingsProps {
  onBack?: () => void;
  className?: string;
}

const CookiePreferencesSettings: React.FC<CookiePreferencesSettingsProps> = ({ 
  onBack, 
  className = '' 
}) => {
  const [preferences, setPreferences] = useState<CookieConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load current preferences on mount
  useEffect(() => {
    const { hasConsent, state } = CookieUtils.getConsentStatus();
    if (hasConsent && state) {
      setPreferences(state);
    }
  }, []);

  const cookieTypes = [
    {
      key: 'necessary' as keyof CookieConsentState,
      title: 'Essential Cookies',
      description: 'Required for basic site functionality, security, and user authentication. These cookies cannot be disabled as they are necessary for the website to work properly.',
      icon: '🔒',
      required: true,
      examples: ['Authentication tokens', 'Security settings', 'Session management'],
    },
    {
      key: 'analytics' as keyof CookieConsentState,
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website by collecting and reporting information anonymously. This data helps us improve user experience.',
      icon: '📊',
      required: false,
      examples: ['Google Analytics', 'User behavior tracking', 'Performance metrics'],
    },
    {
      key: 'marketing' as keyof CookieConsentState,
      title: 'Marketing Cookies',
      description: 'Used to track visitors across websites to display relevant and engaging advertisements tailored to your interests.',
      icon: '📢',
      required: false,
      examples: ['Ad targeting', 'Social media pixels', 'Conversion tracking'],
    },
    {
      key: 'preferences' as keyof CookieConsentState,
      title: 'Preference Cookies',
      description: 'Remember your settings and preferences to provide a personalized experience, such as language selection and display preferences.',
      icon: '⚙️',
      required: false,
      examples: ['Theme preferences', 'Language settings', 'Personalization'],
    },
  ];

  const handleTogglePreference = (key: keyof CookieConsentState) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies

    setPreferences(prev => {
      const newPreferences = {
        ...prev,
        [key]: !prev[key]
      };
      
      // Check if preferences have changed from saved state
      const { state } = CookieUtils.getConsentStatus();
      const changed = !state || JSON.stringify(newPreferences) !== JSON.stringify(state);
      setHasChanges(changed);
      
      return newPreferences;
    });
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem('cookie_consent', 'true');
      localStorage.setItem('cookie_consent_state', JSON.stringify(preferences));
      
      // Initialize services based on new preferences
      CookieUtils.initializeServices(preferences);
      
      setHasChanges(false);
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
      console.log('🍪 Cookie preferences updated successfully');
    } catch (error) {
      console.error('Failed to save cookie preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setPreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
    setHasChanges(true);
  };

  const handleAcceptAll = () => {
    setPreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
    setHasChanges(true);
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="btn-touch p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                         rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors no-tap-highlight"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Cookie Preferences
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Manage your cookie settings and privacy preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-green-800 dark:text-green-200 font-medium">
                Cookie preferences saved successfully!
              </span>
            </div>
          </div>
        )}

        {/* Cookie Types */}
        <div className="space-y-6">
          {cookieTypes.map((cookieType) => (
            <div
              key={cookieType.key}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl" role="img" aria-hidden="true">
                        {cookieType.icon}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {cookieType.title}
                          {cookieType.required && (
                            <span className="ml-3 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-full">
                              Required
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                      {cookieType.description}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Examples:
                      </p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {cookieType.examples.map((example, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full flex-shrink-0"></span>
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleTogglePreference(cookieType.key)}
                      disabled={cookieType.required}
                      className={`btn-touch relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
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
                        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 
                                  transition duration-200 ease-in-out
                                  ${(preferences[cookieType.key] || cookieType.required) ? 'translate-x-6' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleResetToDefaults}
                className="btn-touch px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                         rounded-xl border border-gray-200 dark:border-gray-600 
                         transition-all duration-200 ease-out
                         focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                         dark:focus:ring-offset-gray-800 no-tap-highlight"
              >
                Reset to Defaults
              </button>
              
              <button
                onClick={handleAcceptAll}
                className="btn-touch px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 
                         bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 
                         rounded-xl border border-primary-200 dark:border-primary-800 
                         transition-all duration-200 ease-out
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                         dark:focus:ring-offset-gray-800 no-tap-highlight"
              >
                Accept All
              </button>
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={!hasChanges || isSaving}
              className={`btn-touch px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md hover:shadow-lg 
                        transition-all duration-200 ease-out transform hover:scale-[1.02]
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                        dark:focus:ring-offset-gray-800 no-tap-highlight
                        ${hasChanges && !isSaving
                          ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600'
                          : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-75'
                        }`}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
          
          {hasChanges && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              You have unsaved changes
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookiePreferencesSettings;