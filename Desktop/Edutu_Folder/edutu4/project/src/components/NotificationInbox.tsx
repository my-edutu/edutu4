import React, { useState } from 'react';
import { X, Bell, MessageCircle, Award, Calendar, Target, Users, CheckCircle, Trash2, MailSearch as MarkEmailRead, Filter } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface Notification {
  id: string;
  type: 'message' | 'achievement' | 'reminder' | 'opportunity' | 'community';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  avatar?: string;
  actionUrl?: string;
}

interface NotificationInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationInbox: React.FC<NotificationInboxProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'achievement',
      title: 'Goal Milestone Reached! 🎉',
      message: 'You completed "Set up Python development environment" - keep up the great work!',
      timestamp: '2 minutes ago',
      read: false,
      avatar: '🎯'
    },
    {
      id: '2',
      type: 'opportunity',
      title: 'New Scholarship Match',
      message: 'Mastercard Foundation Scholars Program - 95% match for your profile',
      timestamp: '1 hour ago',
      read: false,
      avatar: '🎓'
    },
    {
      id: '3',
      type: 'message',
      title: 'Message from Amara O.',
      message: 'Thanks for connecting! I\'d love to share my Google interview experience with you.',
      timestamp: '3 hours ago',
      read: true,
      avatar: '👩🏾‍💻'
    },
    {
      id: '4',
      type: 'reminder',
      title: 'Deadline Reminder',
      message: 'Rhodes Scholarship application deadline is in 5 days',
      timestamp: '6 hours ago',
      read: false,
      avatar: '⏰'
    },
    {
      id: '5',
      type: 'community',
      title: 'New Community Roadmap',
      message: 'Kwame A. shared "Building a $1M E-commerce Business" roadmap',
      timestamp: '1 day ago',
      read: true,
      avatar: '👨🏿‍💼'
    },
    {
      id: '6',
      type: 'achievement',
      title: 'Weekly Goal Summary',
      message: 'You completed 3 out of 5 tasks this week. Great progress!',
      timestamp: '2 days ago',
      read: true,
      avatar: '📊'
    }
  ]);

  const { isDarkMode } = useDarkMode();

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || (filter === 'unread' && !notification.read)
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle size={16} className="text-blue-600" />;
      case 'achievement': return <Award size={16} className="text-yellow-600" />;
      case 'reminder': return <Calendar size={16} className="text-red-600" />;
      case 'opportunity': return <Target size={16} className="text-green-600" />;
      case 'community': return <Users size={16} className="text-purple-600" />;
      default: return <Bell size={16} className="text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 dark:bg-black/40" 
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className={`relative w-full max-w-md h-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl animate-slide-in-right`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell size={24} className="text-primary" />
              <div>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={onClose}
              className="p-2"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : `${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-primary text-white'
                  : `${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={markAllAsRead}
                className="text-sm px-3 py-1"
              >
                <MarkEmailRead size={14} className="mr-1" />
                Mark all as read
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <Bell size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'unread' 
                  ? 'You\'re all caught up!' 
                  : 'We\'ll notify you when something important happens'
                }
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer animate-slide-up group ${
                    notification.read
                      ? `${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`
                      : `${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar/Icon */}
                    <div className="flex-shrink-0">
                      {notification.avatar ? (
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-lg">
                          {notification.avatar}
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-100'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'} line-clamp-1`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2 mt-2"></div>
                        )}
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2 mb-2`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.timestamp}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Mark as read"
                            >
                              <CheckCircle size={14} className="text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationInbox;