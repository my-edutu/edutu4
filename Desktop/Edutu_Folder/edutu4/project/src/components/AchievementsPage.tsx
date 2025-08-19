import React, { useState } from 'react';
import { ArrowLeft, Trophy, Star, CheckCircle2, Award, Calendar, TrendingUp, Target, Zap, Siren as Fire, Medal } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface AchievementsPageProps {
  onBack: () => void;
}

const AchievementsPage: React.FC<AchievementsPageProps> = ({ onBack }) => {
  const { isDarkMode } = useDarkMode();

  const achievements = [
    { 
      id: '1',
      title: "Set up Python development environment", 
      icon: <CheckCircle2 size={16} />, 
      date: "Today",
      time: "2:30 PM",
      type: "task_completed",
      category: "Programming",
      points: 10
    },
    { 
      id: '2',
      title: "Complete Python basics tutorial", 
      icon: <CheckCircle2 size={16} />, 
      date: "Today",
      time: "11:45 AM",
      type: "task_completed",
      category: "Programming",
      points: 15
    },
    { 
      id: '3',
      title: "Profile Complete", 
      icon: <Award size={16} />, 
      date: "Yesterday",
      time: "6:20 PM",
      type: "milestone",
      category: "Profile",
      points: 25
    },
    { 
      id: '4',
      title: "First Goal Created", 
      icon: <Target size={16} />, 
      date: "Yesterday",
      time: "3:15 PM",
      type: "milestone",
      category: "Goals",
      points: 20
    },
    { 
      id: '5',
      title: "Joined Python Community", 
      icon: <CheckCircle2 size={16} />, 
      date: "2 days ago",
      time: "4:30 PM",
      type: "task_completed",
      category: "Community",
      points: 10
    },
    { 
      id: '6',
      title: "First Week Streak", 
      icon: <Fire size={16} />, 
      date: "2 days ago",
      time: "12:00 PM",
      type: "streak",
      category: "Consistency",
      points: 50
    },
    { 
      id: '7',
      title: "CV Uploaded", 
      icon: <CheckCircle2 size={16} />, 
      date: "3 days ago",
      time: "9:45 AM",
      type: "task_completed",
      category: "Career",
      points: 15
    },
    { 
      id: '8',
      title: "Welcome to Edutu", 
      icon: <Star size={16} />, 
      date: "1 week ago",
      time: "2:00 PM",
      type: "milestone",
      category: "Onboarding",
      points: 30
    },
    { 
      id: '9',
      title: "First Opportunity Explored", 
      icon: <CheckCircle2 size={16} />, 
      date: "1 week ago",
      time: "3:30 PM",
      type: "task_completed",
      category: "Opportunities",
      points: 20
    },
    { 
      id: '10',
      title: "Account Created", 
      icon: <Award size={16} />, 
      date: "1 week ago",
      time: "1:45 PM",
      type: "milestone",
      category: "Onboarding",
      points: 10
    }
  ];

  const streakData = {
    current: 7,
    longest: 7,
    total: 15
  };

  const totalPoints = achievements.reduce((sum, achievement) => sum + achievement.points, 0);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'streak': return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'task_completed': return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      default: return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    }
  };

  const getAchievementIconColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'text-yellow-600 dark:text-yellow-400';
      case 'streak': return 'text-red-600 dark:text-red-400';
      case 'task_completed': return 'text-green-600 dark:text-green-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'Programming': return '💻';
      case 'Profile': return '👤';
      case 'Goals': return '🎯';
      case 'Community': return '👥';
      case 'Consistency': return '🔥';
      case 'Career': return '💼';
      case 'Onboarding': return '🚀';
      case 'Opportunities': return '✨';
      default: return '🏆';
    }
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Your Achievements</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress and celebrate milestones</p>
            </div>
            <Trophy size={24} className="text-yellow-500" />
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
              <div className="text-lg font-bold text-yellow-600">{achievements.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <div className="text-lg font-bold text-blue-600">{totalPoints}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Points</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl">
              <div className="text-lg font-bold text-red-600">{streakData.current}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Day Streak</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <div className="text-lg font-bold text-green-600">{streakData.longest}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Best Streak</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Streak Section */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                <Fire size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Current Streak</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Keep the momentum going!</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{streakData.current}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">days</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-lg font-bold text-gray-800 dark:text-white">{streakData.current}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Current</div>
            </div>
            <div className="p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-lg font-bold text-gray-800 dark:text-white">{streakData.longest}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Longest</div>
            </div>
            <div className="p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-lg font-bold text-gray-800 dark:text-white">{streakData.total}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Days</div>
            </div>
          </div>
        </Card>

        {/* Achievements List */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Achievements</h3>
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all animate-slide-up ${getAchievementColor(achievement.type)}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center ${getAchievementIconColor(achievement.type)}`}>
                    {achievement.icon}
                  </div>
                  <div className="text-2xl">{getCategoryEmoji(achievement.category)}</div>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-1">{achievement.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {achievement.date}
                    </span>
                    <span>{achievement.time}</span>
                    <span className="px-2 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full text-xs">
                      {achievement.category}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">+{achievement.points}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">points</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Points Summary */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border-primary/20 dark:border-primary/30 dark:bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Medal size={32} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Total Points Earned</h3>
            <div className="text-3xl font-bold text-primary mb-2">{totalPoints}</div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You're doing amazing! Keep completing tasks and reaching milestones to earn more points.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp size={16} />
                <span>Growing daily</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Zap size={16} />
                <span>On fire!</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AchievementsPage;