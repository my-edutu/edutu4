import React from 'react';
import { CheckCircle, Circle, TrendingUp, Calendar, Target, Trophy, Award } from 'lucide-react';
import { UserGoal } from '../types/goals';
import Card from './ui/Card';
import Button from './ui/Button';

interface GoalProgressTrackerProps {
  goal: UserGoal;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onViewRoadmap: (goalId: string) => void;
  compact?: boolean;
}

const GoalProgressTracker: React.FC<GoalProgressTrackerProps> = ({
  goal,
  onTaskToggle,
  onViewRoadmap,
  compact = false
}) => {
  const getTasksStats = () => {
    if (!goal.monthlyRoadmap) return { total: 0, completed: 0 };
    
    const allTasks = goal.monthlyRoadmap.flatMap(month => 
      month.weeks?.flatMap(week => week.tasks) || []
    );
    
    return {
      total: allTasks.length,
      completed: allTasks.filter(task => task.completed).length
    };
  };

  const taskStats = getTasksStats();
  const progressPercentage = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : goal.progress;

  const getNextTasks = (limit = 3) => {
    if (!goal.monthlyRoadmap) return [];
    
    const allTasks = goal.monthlyRoadmap.flatMap(month => 
      month.weeks?.flatMap(week => 
        week.tasks.map(task => ({ ...task, monthTitle: month.title, weekTitle: week.title }))
      ) || []
    );
    
    return allTasks.filter(task => !task.completed).slice(0, limit);
  };

  const nextTasks = getNextTasks();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    if (goal.status === 'completed') return <Trophy className="text-yellow-500" size={20} />;
    if (progressPercentage >= 75) return <Award className="text-green-500" size={20} />;
    if (progressPercentage >= 50) return <TrendingUp className="text-blue-500" size={20} />;
    return <Target className="text-gray-500" size={20} />;
  };

  if (compact) {
    return (
      <Card className="p-4 hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 dark:text-white truncate">{goal.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{goal.category}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{progressPercentage}%</div>
            <div className="text-xs text-gray-500">{taskStats.completed}/{taskStats.total} tasks</div>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {nextTasks.length > 0 ? `${nextTasks.length} tasks pending` : 'All tasks completed!'}
          </div>
          <Button
            variant="outline"
            onClick={() => onViewRoadmap(goal.id)}
            className="text-xs px-3 py-1"
          >
            View Roadmap
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{goal.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">{goal.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="capitalize">{goal.category}</span>
              <span>•</span>
              <span className="capitalize">{goal.difficulty} difficulty</span>
              <span>•</span>
              <span className="capitalize">{goal.priority} priority</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-primary mb-1">{progressPercentage}%</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {taskStats.completed} of {taskStats.total} tasks completed
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="text-lg font-bold text-blue-600">{goal.monthlyRoadmap?.length || 0}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Months</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="text-lg font-bold text-green-600">{taskStats.completed}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="text-lg font-bold text-purple-600">{goal.streakDays}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Streak Days</div>
        </div>
      </div>
      
      {/* Next Tasks */}
      {nextTasks.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Circle size={16} className="text-primary" />
            Next Tasks
          </h4>
          <div className="space-y-2">
            {nextTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <button
                  onClick={() => onTaskToggle(task.id, true)}
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <Circle size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-800 dark:text-white truncate">{task.title}</h5>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{task.monthTitle}</span>
                    <span>•</span>
                    <span>{task.weekTitle}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => onViewRoadmap(goal.id)}
          className="flex-1"
        >
          <Target size={16} className="mr-2" />
          View Full Roadmap
        </Button>
        
        {goal.targetDate && (
          <Button variant="outline" className="px-4">
            <Calendar size={16} className="mr-2" />
            {new Date(goal.targetDate).toLocaleDateString()}
          </Button>
        )}
      </div>
      
      {/* Achievement Badge */}
      {progressPercentage === 100 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <Trophy size={24} className="text-yellow-500" />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white">Goal Completed!</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Congratulations on achieving your goal. Time to set a new challenge!
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GoalProgressTracker;