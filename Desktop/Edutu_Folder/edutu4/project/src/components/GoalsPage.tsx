import React, { useState, useEffect } from 'react';
import { ArrowLeft, Target, Plus, Calendar, TrendingUp, CheckCircle2, Clock, Star, Trophy, Zap } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoals } from '../hooks/useGoals';
import { UserGoal, GoalStats } from '../types/goals';
import GoalProgressTracker from './GoalProgressTracker';

interface GoalsPageProps {
  onBack: () => void;
  onAddGoal: () => void;
  onGoalClick: (goalId: string) => void;
}

const GoalsPage: React.FC<GoalsPageProps> = ({ onBack, onAddGoal, onGoalClick }) => {
  const { isDarkMode } = useDarkMode();
  const { goals, loading, error, updateTaskCompletion } = useGoals();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'deadline'>('recent');

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true;
    if (filter === 'active') return goal.status === 'active';
    if (filter === 'completed') return goal.status === 'completed';
    return true;
  }).sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'progress') {
      return b.progress - a.progress;
    }
    if (sortBy === 'deadline' && a.targetDate && b.targetDate) {
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    }
    return 0;
  });

  const goalStats = {
    totalGoals: goals.length,
    activeGoals: goals.filter(g => g.status === 'active').length,
    completedGoals: goals.filter(g => g.status === 'completed').length,
    averageProgress: goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'skill': return '💻';
      case 'education': return '🎓';
      case 'career': return '💼';
      case 'personal': return '🌟';
      case 'roadmap': return '🗺️';
      default: return '🎯';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No deadline';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  };

  const getCompletedMilestones = (goal: UserGoal) => {
    if (!goal.milestones || goal.milestones.length === 0) return { completed: 0, total: 0 };
    const completed = goal.milestones.filter(m => m.completed).length;
    return { completed, total: goal.milestones.length };
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Empty state for new users
  if (goals.length === 0) {
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
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Your Goals</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Start your journey to success</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <Target size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Set Your First Goal?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Goals help you track your progress and stay motivated. Start by adding your first learning objective and create a roadmap to achieve it.
            </p>
            <Button 
              onClick={onAddGoal}
              className="inline-flex items-center gap-2 px-6 py-3 text-lg"
            >
              <Plus size={20} />
              Add Your First Goal
            </Button>
            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              💡 Tip: Start with a specific, achievable goal to build momentum
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Your Goals</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track and manage your learning objectives</p>
            </div>
            <Button 
              onClick={onAddGoal}
              className="inline-flex items-center gap-2 px-4 py-2"
            >
              <Plus size={16} />
              Add Goal
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <div className="text-lg font-bold text-primary">{goalStats?.activeGoals || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Active Goals</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <div className="text-lg font-bold text-green-600">
                {goalStats?.averageProgress || 0}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Avg Progress</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
              <div className="text-lg font-bold text-yellow-600">
                {goalStats?.currentStreak || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Day Streak</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Goals List */}
        <div className="space-y-4">
          {goals.map((goal, index) => {
            const milestones = getCompletedMilestones(goal);
            return (
              <Card
                key={goal.id}
                className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] dark:bg-gray-800 dark:border-gray-700 animate-slide-up group"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onGoalClick(goal.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{getCategoryIcon(goal.category)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 group-hover:text-primary transition-colors">
                          {goal.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(goal.targetDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {goal.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(goal.priority)}`}>
                          {goal.priority}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                        <span className="text-sm font-bold text-primary">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Goal Details */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className="font-semibold text-gray-800 dark:text-white">
                          {milestones.completed}/{milestones.total}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Milestones</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className={`font-semibold ${getDifficultyColor(goal.difficulty)}`}>
                          {goal.difficulty}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Level</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className="font-semibold text-gray-800 dark:text-white">
                          {goal.category}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Category</div>
                      </div>
                    </div>

                    {/* Achievement Badge */}
                    {goal.progress >= 75 && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                        <Star size={16} />
                        <span>Almost there! Keep going!</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Motivational Section */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border-primary/20 dark:border-primary/30 dark:bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy size={32} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Keep Up the Great Work!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              You're making excellent progress on your goals. Every step forward brings you closer to your dreams.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 size={16} />
                <span>{goalStats?.completedGoals || 0} goals completed</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Zap size={16} />
                <span>{goalStats?.currentStreak || 0} day streak</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Add New Goal CTA */}
        <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary transition-all cursor-pointer" onClick={onAddGoal}>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Add New Goal</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Set a new learning objective and create a roadmap to achieve it
            </p>
            <Button className="inline-flex items-center gap-2">
              <Target size={16} />
              Create Goal
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GoalsPage;