import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Bell, Shield, HelpCircle, Info, LogOut, Settings, Moon, Sun, ShieldCheck, Cookie } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { adminService } from '../services/adminService';
import CookieUtils from '../utils/cookieUtils';
import { Screen } from '../App';

interface SettingsMenuProps {
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  user?: { name: string; age: number; uid: string } | null;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onBack, onNavigate, onLogout, user }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { resetConsent } = useCookieConsent();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.uid) {
        setIsCheckingAdmin(false);
        return;
      }

      try {
        const hasAccess = await adminService.checkAdminAccess(user.uid);
        setIsAdmin(hasAccess);
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminAccess();
  }, [user?.uid]);

  const settingsOptions = [
    {
      id: 'profile-edit' as Screen,
      title: 'Profile Settings',
      description: 'Update your personal information and preferences',
      icon: <User size={20} className="text-primary" />,
      color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
    },
    {
      id: 'notifications' as Screen,
      title: 'Notifications',
      description: 'Manage your notification preferences',
      icon: <Bell size={20} className="text-yellow-600" />,
      color: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
    },
    {
      id: 'privacy' as Screen,
      title: 'Privacy & Security',
      description: 'Control your privacy settings and account security',
      icon: <Shield size={20} className="text-green-600" />,
      color: 'hover:bg-green-50 dark:hover:bg-green-900/20'
    },
    {
      id: 'help' as Screen,
      title: 'Help & Support',
      description: 'Get help and contact support',
      icon: <HelpCircle size={20} className="text-purple-600" />,
      color: 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
    }
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const handleNavigate = (screen: Screen) => {
    scrollToTop();
    onNavigate(screen);
  };

  const handleLogout = () => {
    scrollToTop();
    onLogout();
  };

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
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
            </div>
            <Settings size={24} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Dark Mode Toggle */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                {isDarkMode ? (
                  <Moon size={20} className="text-blue-600" />
                ) : (
                  <Sun size={20} className="text-yellow-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">Dark Mode</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDarkMode ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </Card>

        {/* Cookie Consent Status */}
        <Card
          className="cursor-pointer transition-all transform hover:scale-[1.02] hover:bg-orange-50 dark:hover:bg-orange-900/20 dark:bg-gray-800 dark:border-gray-700 animate-slide-up border-orange-200 dark:border-orange-800"
          style={{ animationDelay: '50ms' }}
          onClick={() => handleNavigate('privacy' as Screen)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
              <Cookie size={20} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 dark:text-orange-400 mb-1">Cookie Preferences</h3>
              <p className="text-sm text-orange-600 dark:text-orange-500">
                {CookieUtils.hasValidConsent() ? 'Manage your cookie settings' : 'Set cookie preferences'}
              </p>
            </div>
            <div className="text-orange-400 dark:text-orange-500">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Admin Panel Access */}
        {isAdmin && !isCheckingAdmin && (
          <Card
            className="cursor-pointer transition-all transform hover:scale-[1.02] hover:bg-purple-50 dark:hover:bg-purple-900/20 dark:bg-gray-800 dark:border-gray-700 animate-slide-up border-purple-200 dark:border-purple-800"
            style={{ animationDelay: '50ms' }}
            onClick={() => handleNavigate('admin-dashboard' as Screen)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-800 dark:text-purple-400 mb-1">Admin Dashboard</h3>
                <p className="text-sm text-purple-600 dark:text-purple-500">System management and moderation tools</p>
              </div>
              <div className="text-purple-400 dark:text-purple-500">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>
        )}

        {/* Settings Options */}
        {settingsOptions.map((option, index) => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all transform hover:scale-[1.02] ${option.color} dark:bg-gray-800 dark:border-gray-700 animate-slide-up`}
            style={{ animationDelay: `${(index + 2) * 100 + (isAdmin ? 50 : 0)}ms` }}
            onClick={() => handleNavigate(option.id)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                {option.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{option.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
              </div>
              <div className="text-gray-400 dark:text-gray-500">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Card>
        ))}

        {/* Sign Out */}
        <Card 
          className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border-red-200 dark:border-red-800 dark:bg-gray-800 animate-slide-up" 
          style={{ animationDelay: `${700 + (isAdmin ? 50 : 0)}ms` }}
          onClick={handleLogout}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
              <LogOut size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-400 mb-1">Sign Out</h3>
              <p className="text-sm text-red-600 dark:text-red-500">Log out of your account</p>
            </div>
          </div>
        </Card>

        {/* App Info */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm space-y-1 pt-8">
          <p>Edutu v1.0</p>
          <p>Empowering African youth since 2024</p>
          <p className="text-xs">Made with ❤️ for ambitious dreamers</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;