import React, { useState, useEffect } from 'react';
import { Trophy, Star, CheckCircle, Target, Calendar, Zap, X } from 'lucide-react';
import Button from './ui/Button';
import { useDarkMode } from '../hooks/useDarkMode';

interface AchievementPopupProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    type: 'task' | 'week' | 'month' | 'goal' | 'streak';
    title: string;
    description: string;
    progress?: number;
    streak?: number;
    goalTitle?: string;
  };
}

const AchievementPopup: React.FC<AchievementPopupProps> = ({ 
  isOpen, 
  onClose, 
  achievement 
}) => {
  const { isDarkMode } = useDarkMode();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getAchievementIcon = () => {
    switch (achievement.type) {
      case 'task':
        return <CheckCircle size={48} className="text-green-500" />;
      case 'week':
        return <Calendar size={48} className="text-blue-500" />;
      case 'month':
        return <Trophy size={48} className="text-yellow-500" />;
      case 'goal':
        return <Target size={48} className="text-purple-500" />;
      case 'streak':
        return <Zap size={48} className="text-orange-500" />;
      default:
        return <Star size={48} className="text-primary" />;
    }
  };

  const getAchievementColor = () => {
    switch (achievement.type) {
      case 'task':
        return 'from-green-400 to-green-600';
      case 'week':
        return 'from-blue-400 to-blue-600';
      case 'month':
        return 'from-yellow-400 to-yellow-600';
      case 'goal':
        return 'from-purple-400 to-purple-600';
      case 'streak':
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-primary to-blue-600';
    }
  };

  const getEmoji = () => {
    switch (achievement.type) {
      case 'task':
        return '✅';
      case 'week':
        return '📅';
      case 'month':
        return '🏆';
      case 'goal':
        return '🎯';
      case 'streak':
        return '🔥';
      default:
        return '⭐';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-2xl p-8 text-center animate-scale-in`}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} transition-colors`}
        >
          <X size={20} />
        </button>

        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                {['🎉', '✨', '🎊', '⭐', '🏆'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        {/* Achievement Content */}
        <div className="relative z-10">
          {/* Large Emoji */}
          <div className="text-6xl mb-4 animate-bounce-subtle">
            {getEmoji()}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full bg-gradient-to-r ${getAchievementColor()} bg-opacity-20`}>
              {getAchievementIcon()}
            </div>
          </div>

          {/* Title */}
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {achievement.title}
          </h2>

          {/* Description */}
          <p className={`mb-6 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {achievement.description}
          </p>

          {/* Progress or Streak Info */}
          {achievement.progress !== undefined && (
            <div className="mb-6">
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1`}>
                {achievement.progress}%
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Progress on {achievement.goalTitle}
              </div>
            </div>
          )}

          {achievement.streak !== undefined && (
            <div className="mb-6">
              <div className={`text-3xl font-bold text-orange-500 mb-1`}>
                {achievement.streak} Days
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Current Streak
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={onClose}
            className={`w-full bg-gradient-to-r ${getAchievementColor()} text-white hover:shadow-lg transition-all`}
          >
            <Star size={16} className="mr-2" />
            Keep Going!
          </Button>

          {/* Achievement Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              "Success is the sum of small efforts repeated day in and day out." 🌟
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementPopup;