import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Eye, EyeOff, Lock, Globe, Users, Database, Trash2, Cookie, Settings } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { CookieConsentState } from '../types/cookies';
import CookieUtils from '../utils/cookieUtils';

interface PrivacyScreenProps {
  onBack: () => void;
}

const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack }) => {
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    dataSharing: false,
    analyticsTracking: true,
    personalizedAds: false,
    activityStatus: true,
    searchVisibility: true
  });
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  const { isDarkMode } = useDarkMode();
  const { consentState, updateCookiePreferences, resetConsent } = useCookieConsent();
  const [cookiePreferences, setCookiePreferences] = useState<CookieConsentState>(consentState);

  useEffect(() => {
    setCookiePreferences(consentState);
  }, [consentState]);

  const handleToggle = (key: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleVisibilityChange = (value: string) => {
    setPrivacySettings(prev => ({
      ...prev,
      profileVisibility: value
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const privacyOptions = [
    {
      id: 'dataSharing',
      title: 'Data Sharing',
      description: 'Share anonymized data to improve our services',
      icon: <Database size={20} className="text-blue-600" />,
      enabled: privacySettings.dataSharing
    },
    {
      id: 'analyticsTracking',
      title: 'Analytics Tracking',
      description: 'Help us understand how you use the app',
      icon: <Globe size={20} className="text-green-600" />,
      enabled: privacySettings.analyticsTracking
    },
    {
      id: 'personalizedAds',
      title: 'Personalized Ads',
      description: 'Show ads based on your interests',
      icon: <Eye size={20} className="text-purple-600" />,
      enabled: privacySettings.personalizedAds
    },
    {
      id: 'activityStatus',
      title: 'Activity Status',
      description: 'Show when you were last active',
      icon: <Users size={20} className="text-yellow-600" />,
      enabled: privacySettings.activityStatus
    },
    {
      id: 'searchVisibility',
      title: 'Search Visibility',
      description: 'Allow others to find you in search',
      icon: <Eye size={20} className="text-red-600" />,
      enabled: privacySettings.searchVisibility
    }
  ];

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Privacy & Security</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Control your privacy settings</p>
            </div>
            <Shield size={24} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Visibility */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Profile Visibility</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose who can see your profile information
          </p>
          <div className="space-y-3">
            {['public', 'friends', 'private'].map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all"
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option}
                  checked={privacySettings.profileVisibility === option}
                  onChange={(e) => handleVisibilityChange(e.target.value)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-white capitalize">{option}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {option === 'public' && 'Anyone can see your profile'}
                    {option === 'friends' && 'Only your connections can see your profile'}
                    {option === 'private' && 'Only you can see your profile'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Privacy Controls</h3>
          <div className="space-y-4">
            {privacyOptions.map((setting, index) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                    {setting.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">{setting.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(setting.id as keyof typeof privacySettings)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    setting.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      setting.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Security */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Security</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <Lock size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 dark:text-white">Change Password</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <Shield size={20} className="text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 dark:text-white">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Cookie Consent Management */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Cookie Preferences</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage how we use cookies to enhance your experience. Changes take effect immediately.
          </p>
          
          {/* Current Consent Status */}
          <div className="mb-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Cookie size={16} className="text-primary" />
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                Consent Status: {CookieUtils.hasValidConsent() ? 'Active' : 'Not Set'}
              </span>
            </div>
            {CookieUtils.hasValidConsent() && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Expires: {CookieUtils.getConsentExpiryDate().toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {/* Cookie Type Controls */}
            {[
              {
                key: 'necessary' as keyof CookieConsentState,
                title: 'Essential Cookies',
                description: 'Required for basic functionality - always enabled',
                icon: <Shield size={20} className="text-green-600" />,
                required: true
              },
              {
                key: 'analytics' as keyof CookieConsentState,
                title: 'Analytics Cookies',
                description: 'Help us understand how you use our services',
                icon: <Globe size={20} className="text-blue-600" />,
                required: false
              },
              {
                key: 'marketing' as keyof CookieConsentState,
                title: 'Marketing Cookies',
                description: 'Used for personalized advertisements',
                icon: <Eye size={20} className="text-purple-600" />,
                required: false
              },
              {
                key: 'preferences' as keyof CookieConsentState,
                title: 'Preference Cookies',
                description: 'Remember your settings and preferences',
                icon: <Settings size={20} className="text-yellow-600" />,
                required: false
              }
            ].map((cookieType) => (
              <div
                key={cookieType.key}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                    {cookieType.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-800 dark:text-white">{cookieType.title}</h4>
                      {cookieType.required && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{cookieType.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!cookieType.required) {
                      const newPreferences = {
                        ...cookiePreferences,
                        [cookieType.key]: !cookiePreferences[cookieType.key]
                      };
                      setCookiePreferences(newPreferences);
                      updateCookiePreferences(newPreferences);
                    }
                  }}
                  disabled={cookieType.required}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    (cookiePreferences[cookieType.key] || cookieType.required) ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                  } ${cookieType.required ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      (cookiePreferences[cookieType.key] || cookieType.required) ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}

            {/* Reset Consent */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  resetConsent();
                  // Reset to default state
                  setCookiePreferences({
                    necessary: true,
                    analytics: false,
                    marketing: false,
                    preferences: false
                  });
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all text-left"
              >
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
                  <Cookie size={20} className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-orange-800 dark:text-orange-400">Reset Cookie Consent</h4>
                  <p className="text-sm text-orange-600 dark:text-orange-500">Clear all cookie preferences and show banner again</p>
                </div>
              </button>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Data Management</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                <Database size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 dark:text-white">Download My Data</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get a copy of your data</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-left">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-red-800 dark:text-red-400">Delete Account</h4>
                <p className="text-sm text-red-600 dark:text-red-500">Permanently delete your account</p>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyScreen;