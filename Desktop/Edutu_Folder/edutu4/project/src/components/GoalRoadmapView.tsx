import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle, 
  Circle, 
  Calendar, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Flag, 
  ChevronDown, 
  ChevronRight,
  Play,
  Pause,
  MoreHorizontal,
  Star,
  Award,
  Zap,
  Users,
  BookOpen,
  Settings
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoals } from '../hooks/useGoals';
import { UserGoal, WeeklyTask, MonthlyRoadmap } from '../types/goals';

interface GoalRoadmapViewProps {
  goalId: string;
  onBack: () => void;
  user: { name: string; age: number; uid: string } | null;
}

const GoalRoadmapView: React.FC<GoalRoadmapViewProps> = ({
  goalId,
  onBack,
  user
}) => {
  const { isDarkMode } = useDarkMode();
  const { goals, updateTaskCompletion, updateGoalProgress } = useGoals();
  const [currentGoal, setCurrentGoal] = useState<UserGoal | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [filterCompleted, setFilterCompleted] = useState(false);

  useEffect(() => {
    const goal = goals.find(g => g.id === goalId);
    setCurrentGoal(goal || null);
    
    // Auto-expand first month and first week
    if (goal?.monthlyRoadmap && goal.monthlyRoadmap.length > 0) {
      setExpandedMonths(new Set([goal.monthlyRoadmap[0].id]));
      if (goal.monthlyRoadmap[0].weeks && goal.monthlyRoadmap[0].weeks.length > 0) {
        setExpandedWeeks(new Set([goal.monthlyRoadmap[0].weeks[0].id]));
      }
    }
  }, [goals, goalId]);

  if (!currentGoal) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Goal not found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The goal you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={onBack}>Back to Goals</Button>
        </div>
      </div>
    );
  }

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!currentGoal) return;
    
    const success = await updateTaskCompletion(currentGoal.id, taskId, completed);
    if (success) {
      // Update local state optimistically
      setCurrentGoal(prev => {
        if (!prev) return null;
        
        const updatedMonthlyRoadmap = prev.monthlyRoadmap?.map(month => ({
          ...month,
          weeks: month.weeks?.map(week => ({
            ...week,
            tasks: week.tasks.map(task => 
              task.id === taskId ? { ...task, completed } : task
            )
          })) || []
        })) || [];
        
        // Calculate new progress
        const allTasks = updatedMonthlyRoadmap.flatMap(month => 
          month.weeks?.flatMap(week => week.tasks) || []
        );
        const completedTasks = allTasks.filter(task => task.completed);
        const newProgress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
        
        return {
          ...prev,
          monthlyRoadmap: updatedMonthlyRoadmap,
          progress: newProgress
        };
      });
    }
  };

  const toggleMonthExpansion = (monthId: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthId)) {
        newSet.delete(monthId);
      } else {
        newSet.add(monthId);
      }
      return newSet;
    });
  };

  const toggleWeekExpansion = (weekId: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekId)) {
        newSet.delete(weekId);
      } else {
        newSet.add(weekId);
      }
      return newSet;
    });
  };

  const getTasksStats = () => {
    if (!currentGoal?.monthlyRoadmap) return { total: 0, completed: 0 };
    
    const allTasks = currentGoal.monthlyRoadmap.flatMap(month => 
      month.weeks?.flatMap(week => week.tasks) || []
    );
    
    return {
      total: allTasks.length,
      completed: allTasks.filter(task => task.completed).length
    };
  };

  const taskStats = getTasksStats();
  const progressPercentage = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  const renderTaskItem = (task: WeeklyTask, weekId: string) => {
    if (filterCompleted && task.completed) return null;
    
    return (
      <div
        key={task.id}
        className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
          task.completed 
            ? 'bg-green-50 dark:bg-green-900/20 opacity-75' 
            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
      >
        <button
          onClick={() => handleTaskToggle(task.id, !task.completed)}
          className={`mt-1 rounded-full transition-all ${
            task.completed
              ? 'text-green-600 hover:text-green-700'
              : 'text-gray-400 hover:text-primary'
          }`}
        >
          {task.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
        </button>
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium transition-all ${
            task.completed 
              ? 'text-gray-500 dark:text-gray-400 line-through' 
              : 'text-gray-800 dark:text-white'
          }`}>
            {task.title}
          </h4>
          
          {task.description && (
            <p className={`text-sm mt-1 ${
              task.completed 
                ? 'text-gray-400 dark:text-gray-500' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className={`flex items-center gap-1 ${
              task.completed ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              <Clock size={12} />
              <span>{task.estimatedHours}h</span>
            </div>
            
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.priority === 'high' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : task.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {task.priority}
            </span>
            
            {task.completed && (
              <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                ✓ Completed
              </span>
            )}
          </div>
        </div>
        
        <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <MoreHorizontal size={16} />
        </button>
      </div>
    );
  };

  const renderWeekView = (week: any, monthId: string) => {
    const isExpanded = expandedWeeks.has(week.id);
    const weekTasks = week.tasks || [];
    const completedTasks = weekTasks.filter((task: WeeklyTask) => task.completed).length;
    const weekProgress = weekTasks.length > 0 ? Math.round((completedTasks / weekTasks.length) * 100) : 0;
    
    return (
      <div key={week.id} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleWeekExpansion(week.id)}
          className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <div className="text-left">
                <h4 className="font-medium text-gray-800 dark:text-white">{week.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{week.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-primary">{weekProgress}%</div>
                <div className="text-xs text-gray-500">{completedTasks}/{weekTasks.length} tasks</div>
              </div>
              
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-primary to-accent transition-transform origin-bottom"
                  style={{ transform: `scaleY(${weekProgress / 100})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    W{week.weekNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-white dark:bg-gray-800">
            <div className="space-y-3">
              {weekTasks.map((task: WeeklyTask) => renderTaskItem(task, week.id))}
              
              {weekTasks.length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <BookOpen size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tasks defined for this week yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMonthView = (month: MonthlyRoadmap) => {
    const isExpanded = expandedMonths.has(month.id);
    const allWeekTasks = month.weeks?.flatMap(week => week.tasks) || [];
    const completedWeekTasks = allWeekTasks.filter(task => task.completed).length;
    const monthProgress = allWeekTasks.length > 0 ? Math.round((completedWeekTasks / allWeekTasks.length) * 100) : 0;
    
    return (
      <Card key={month.id} className="overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <button
          onClick={() => toggleMonthExpansion(month.id)}
          className="w-full p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                {month.month}
              </div>
              
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                  {month.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {month.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Flag size={14} />
                    <span>{month.weeks?.length || 0} weeks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle size={14} />
                    <span>{completedWeekTasks}/{allWeekTasks.length} tasks</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{monthProgress}%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Progress</div>
              </div>
              
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-primary to-accent transition-all duration-500"
                  style={{ 
                    transform: `scaleY(${monthProgress / 100})`,
                    transformOrigin: 'bottom'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </button>
        
        {isExpanded && (
          <div className="px-6 pb-6">
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 dark:text-white mb-2">Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {month.focusAreas.map((area, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 dark:text-white">Weekly Breakdown</h4>
              {month.weeks?.map(week => renderWeekView(week, month.id)) || (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Calendar size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No weekly breakdown available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="secondary"
              onClick={onBack}
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {currentGoal.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentGoal.category} • {currentGoal.estimatedDuration}
              </p>
            </div>
            <Button variant="secondary" className="p-2">
              <Settings size={20} />
            </Button>
          </div>
          
          {/* Progress Overview */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-primary" />
                <span className="font-semibold text-gray-800 dark:text-white">Overall Progress</span>
              </div>
              <div className="text-2xl font-bold text-primary">{progressPercentage}%</div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{taskStats.completed} of {taskStats.total} tasks completed</span>
              <span>{currentGoal.monthlyRoadmap?.length || 0} months planned</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'timeline' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('timeline')}
              className="px-4 py-2"
            >
              Timeline View
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('list')}
              className="px-4 py-2"
            >
              List View
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setFilterCompleted(!filterCompleted)}
              className={`px-4 py-2 ${filterCompleted ? 'bg-green-100 text-green-700' : ''}`}
            >
              {filterCompleted ? 'Show All' : 'Hide Completed'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {viewMode === 'timeline' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Target size={20} className="text-primary" />
              Monthly Roadmap
            </h2>
            
            {currentGoal.monthlyRoadmap && currentGoal.monthlyRoadmap.length > 0 ? (
              <div className="space-y-4">
                {currentGoal.monthlyRoadmap.map(month => renderMonthView(month))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  No roadmap available
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This goal doesn't have a detailed monthly roadmap yet.
                </p>
              </div>
            )}
          </div>
        )}
        
        {viewMode === 'list' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              All Tasks
            </h2>
            
            <div className="space-y-4">
              {currentGoal.monthlyRoadmap?.map(month => 
                month.weeks?.map(week => 
                  week.tasks.map(task => (
                    <Card key={task.id} className="p-4 dark:bg-gray-800 dark:border-gray-700">
                      {renderTaskItem(task, week.id)}
                    </Card>
                  ))
                ) || []
              ).flat() || (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    No tasks available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This goal doesn't have any tasks defined yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalRoadmapView;