import React, { useState } from 'react';
import { ArrowLeft, Bell, BellOff, Smartphone, Mail, Calendar, Award, Target } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface NotificationsScreenProps {
  onBack: () => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const [notifications, setNotifications] = useState({
    pushNotifications: true,
    emailNotifications: true,
    opportunityAlerts: true,
    deadlineReminders: true,
    goalReminders: true,
    achievementCelebrations: true,
    weeklyDigest: false,
    marketingEmails: false
  });

  const { isDarkMode } = useDarkMode();

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const notificationSettings = [
    {
      id: 'pushNotifications',
      title: 'Push Notifications',
      description: 'Receive notifications on your device',
      icon: <Smartphone size={20} className="text-primary" />,
      enabled: notifications.pushNotifications
    },
    {
      id: 'emailNotifications',
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: <Mail size={20} className="text-blue-600" />,
      enabled: notifications.emailNotifications
    },
    {
      id: 'opportunityAlerts',
      title: 'Opportunity Alerts',
      description: 'Get notified about new matching opportunities',
      icon: <Award size={20} className="text-green-600" />,
      enabled: notifications.opportunityAlerts
    },
    {
      id: 'deadlineReminders',
      title: 'Deadline Reminders',
      description: 'Reminders for application deadlines',
      icon: <Calendar size={20} className="text-red-600" />,
      enabled: notifications.deadlineReminders
    },
    {
      id: 'goalReminders',
      title: 'Goal Reminders',
      description: 'Stay on track with your goals',
      icon: <Target size={20} className="text-purple-600" />,
      enabled: notifications.goalReminders
    },
    {
      id: 'achievementCelebrations',
      title: 'Achievement Celebrations',
      description: 'Celebrate your milestones and achievements',
      icon: <Award size={20} className="text-yellow-600" />,
      enabled: notifications.achievementCelebrations
    }
  ];

  const emailSettings = [
    {
      id: 'weeklyDigest',
      title: 'Weekly Digest',
      description: 'Summary of your progress and new opportunities',
      enabled: notifications.weeklyDigest
    },
    {
      id: 'marketingEmails',
      title: 'Marketing Emails',
      description: 'Updates about new features and tips',
      enabled: notifications.marketingEmails
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
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Notifications</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your notification preferences</p>
            </div>
            <Bell size={24} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Main Notification Settings */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Notification Types</h3>
          <div className="space-y-4">
            {notificationSettings.map((setting, index) => (
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
                  onClick={() => handleToggle(setting.id as keyof typeof notifications)}
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

        {/* Email Settings */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Email Preferences</h3>
          <div className="space-y-4">
            {emailSettings.map((setting, index) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all animate-slide-up"
                style={{ animationDelay: `${(notificationSettings.length + index) * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                    <Mail size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">{setting.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(setting.id as keyof typeof notifications)}
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

        {/* Quiet Hours */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quiet Hours</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Set times when you don't want to receive notifications
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                defaultValue="22:00"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                defaultValue="08:00"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>
        </Card>

        {/* Test Notification */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Test Notifications</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Send a test notification to make sure everything is working
            </p>
            <Button className="inline-flex items-center gap-2">
              <Bell size={16} />
              Send Test Notification
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsScreen;