import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Target, 
  CheckCircle, 
  Circle,
  Star,
  TrendingUp,
  ArrowLeft,
  Filter,
  View,
  Calendar as CalendarIcon
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import AchievementPopup from './AchievementPopup';
import { useDarkMode } from '../hooks/useDarkMode';
import { MonthlyRoadmap, WeeklyRoadmap, WeeklyTask } from '../types/goals';

interface MonthlyWeeklyRoadmapProps {
  onBack: () => void;
  goalTitle: string;
  monthlyRoadmap: MonthlyRoadmap[];
  onTaskComplete?: (taskId: string, completed: boolean) => void;
  onNavigate?: (screen: string) => void;
}

const MonthlyWeeklyRoadmap: React.FC<MonthlyWeeklyRoadmapProps> = ({ 
  onBack, 
  goalTitle, 
  monthlyRoadmap, 
  onTaskComplete,
  onNavigate 
}) => {
  const { isDarkMode } = useDarkMode();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([monthlyRoadmap[0]?.id]));
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [achievementPopup, setAchievementPopup] = useState<{
    isOpen: boolean;
    achievement: any;
  }>({ isOpen: false, achievement: null });

  const toggleMonth = (monthId: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthId)) {
      newExpanded.delete(monthId);
    } else {
      newExpanded.add(monthId);
    }
    setExpandedMonths(newExpanded);
  };

  const toggleWeek = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
  };

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    if (onTaskComplete) {
      onTaskComplete(taskId, completed);
      
      // Check for achievements after task completion
      if (completed) {
        checkForAchievements(taskId);
      }
    }
  };

  const checkForAchievements = (completedTaskId: string) => {
    // Find which month and week this task belongs to
    let taskWeek: any = null;
    let taskMonth: any = null;
    
    for (const month of monthlyRoadmap) {
      for (const week of month.weeks || []) {
        const task = week.tasks?.find(t => t.id === completedTaskId);
        if (task) {
          taskWeek = week;
          taskMonth = month;
          break;
        }
      }
      // Also check month-level tasks
      const monthTask = month.tasks?.find(t => t.id === completedTaskId);
      if (monthTask) {
        taskMonth = month;
        break;
      }
    }

    // Calculate current progress
    const overallProgress = calculateOverallProgress();
    
    // Check if week is completed
    if (taskWeek) {
      const weekTasks = taskWeek.tasks || [];
      const completedWeekTasks = weekTasks.filter(t => t.completed || t.id === completedTaskId).length;
      
      if (completedWeekTasks === weekTasks.length && weekTasks.length > 0) {
        // Week completed!
        setAchievementPopup({
          isOpen: true,
          achievement: {
            type: 'week',
            title: '🎉 Week Completed!',
            description: `Awesome! You've completed all tasks for "${taskWeek.title}". Keep up the momentum!`,
            progress: overallProgress,
            goalTitle: goalTitle
          }
        });
        return;
      }
    }

    // Check if month is completed
    if (taskMonth) {
      const allMonthTasks = taskMonth.weeks?.reduce((tasks: any[], week: any) => {
        return tasks.concat(week.tasks || []);
      }, []) || [];
      
      // Add month-level tasks if any
      if (taskMonth.tasks) {
        allMonthTasks.push(...taskMonth.tasks);
      }
      
      const completedMonthTasks = allMonthTasks.filter(t => t.completed || t.id === completedTaskId).length;
      
      if (completedMonthTasks === allMonthTasks.length && allMonthTasks.length > 0) {
        // Month completed!
        setAchievementPopup({
          isOpen: true,
          achievement: {
            type: 'month',
            title: '🏆 Month Completed!',
            description: `Incredible! You've completed all tasks for "${taskMonth.title}". You're making excellent progress!`,
            progress: overallProgress,
            goalTitle: goalTitle
          }
        });
        return;
      }
    }

    // Check if entire goal is completed
    if (overallProgress >= 100) {
      setAchievementPopup({
        isOpen: true,
        achievement: {
          type: 'goal',
          title: '🎯 Goal Achieved!',
          description: `Congratulations! You've completed your entire goal: "${goalTitle}". This is a major accomplishment!`,
          progress: 100,
          goalTitle: goalTitle
        }
      });
      return;
    }

    // Show regular task completion for significant milestones
    if (overallProgress % 25 === 0 && overallProgress > 0) {
      setAchievementPopup({
        isOpen: true,
        achievement: {
          type: 'task',
          title: `🌟 ${overallProgress}% Complete!`,
          description: `Great progress! You're ${overallProgress}% through your goal. Every task brings you closer to success.`,
          progress: overallProgress,
          goalTitle: goalTitle
        }
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'from-green-500 to-green-600';
    if (progress >= 60) return 'from-blue-500 to-blue-600';
    if (progress >= 40) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const calculateOverallProgress = () => {
    const totalTasks = monthlyRoadmap.reduce((total, month) => 
      total + month.weeks.reduce((weekTotal, week) => weekTotal + week.tasks.length, 0), 0
    );
    const completedTasks = monthlyRoadmap.reduce((total, month) => 
      total + month.weeks.reduce((weekTotal, week) => 
        weekTotal + week.tasks.filter(task => task.completed).length, 0
      ), 0
    );
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const filterTasks = (tasks: WeeklyTask[]) => {
    if (filterPriority === 'all') return tasks;
    return tasks.filter(task => task.priority === filterPriority);
  };

  const overallProgress = calculateOverallProgress();

  // Handle empty or invalid roadmap data
  if (!monthlyRoadmap || monthlyRoadmap.length === 0) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
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
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Goal Roadmap</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{goalTitle}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex items-center justify-center min-h-[400px]">
          <Card className="text-center p-8 max-w-md mx-auto dark:bg-gray-800 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Roadmap Data</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This goal doesn't have a monthly roadmap structure yet. You can still track your overall progress.
            </p>
            <Button onClick={onBack} variant="primary">
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
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
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Monthly & Weekly Roadmap</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{goalTitle}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800 dark:text-white">{overallProgress}% Complete</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Overall Progress</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className={`bg-gradient-to-r ${getProgressColor(overallProgress)} h-3 rounded-full transition-all duration-500 relative overflow-hidden`}
                style={{ width: `${overallProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className={`text-sm border rounded-lg px-2 py-1 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All Tasks</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <View size={16} className="text-gray-500" />
              <Button
                variant={viewMode === 'timeline' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="px-3 py-1"
              >
                Timeline
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="px-3 py-1"
              >
                Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Monthly Roadmap */}
        {monthlyRoadmap.map((month, monthIndex) => (
          <Card key={month.id} className="overflow-hidden animate-slide-up dark:bg-gray-800 dark:border-gray-700" style={{ animationDelay: `${monthIndex * 100}ms` }}>
            {/* Month Header */}
            <button
              onClick={() => toggleMonth(month.id)}
              className="w-full flex items-center justify-between p-2 -m-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold">
                  {month.month}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{month.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{month.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">{month.targetProgress}%</div>
                  <div className="text-xs text-gray-500">Target Progress</div>
                </div>
                {expandedMonths.has(month.id) ? (
                  <ChevronDown size={20} className="text-gray-400" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
              </div>
            </button>

            {/* Month Content */}
            {expandedMonths.has(month.id) && (
              <div className="mt-4 space-y-4 animate-slide-up">
                {/* Focus Areas */}
                <div className="flex flex-wrap gap-2">
                  {month.focusAreas.map((area, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                    >
                      {area}
                    </span>
                  ))}
                </div>

                {/* Weekly Breakdown */}
                <div className="space-y-3">
                  {month.weeks.map((week, weekIndex) => (
                    <div
                      key={week.id}
                      className={`border rounded-2xl p-4 ${
                        isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => toggleWeek(week.id)}
                        className="w-full flex items-center justify-between mb-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            getPriorityColor(week.priority)
                          }`}>
                            W{week.weekNumber}
                          </div>
                          <div className="text-left">
                            <h4 className="font-medium text-gray-800 dark:text-white">{week.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {week.startDate.toLocaleDateString()} - {week.endDate.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {week.tasks.filter(t => t.completed).length}/{week.tasks.length} tasks
                          </span>
                          {expandedWeeks.has(week.id) ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Week Progress Bar */}
                      <div className="mb-3">
                        <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${week.tasks.length > 0 ? (week.tasks.filter(t => t.completed).length / week.tasks.length) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Week Tasks */}
                      {expandedWeeks.has(week.id) && (
                        <div className="space-y-2 animate-slide-up">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{week.description}</p>
                          {filterTasks(week.tasks).map((task, taskIndex) => (
                            <div
                              key={task.id}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                                isDarkMode 
                                  ? 'hover:bg-gray-600 bg-gray-800' 
                                  : 'hover:bg-white bg-gray-100'
                              }`}
                              onClick={() => handleTaskToggle(task.id, !task.completed)}
                            >
                              {task.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${
                                  task.completed 
                                    ? 'line-through text-gray-500' 
                                    : isDarkMode ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock size={12} />
                                    {task.estimatedHours}h
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}

        {/* Summary Statistics */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={24} className="text-primary" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Roadmap Statistics</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-2xl font-bold text-primary mb-1">
                {monthlyRoadmap.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Months Planned</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-2xl font-bold text-accent mb-1">
                {monthlyRoadmap.reduce((total, month) => total + month.weeks.length, 0)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Weeks Total</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {monthlyRoadmap.reduce((total, month) => 
                  total + month.weeks.reduce((weekTotal, week) => weekTotal + week.tasks.length, 0), 0
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {monthlyRoadmap.reduce((total, month) => 
                  total + month.weeks.reduce((weekTotal, week) => 
                    weekTotal + week.tasks.reduce((taskTotal, task) => taskTotal + task.estimatedHours, 0), 0
                  ), 0
                )}h
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Estimated Hours</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Achievement Popup */}
      <AchievementPopup
        isOpen={achievementPopup.isOpen}
        onClose={() => setAchievementPopup({ isOpen: false, achievement: null })}
        achievement={achievementPopup.achievement}
      />
    </div>
  );
};

export default MonthlyWeeklyRoadmap;