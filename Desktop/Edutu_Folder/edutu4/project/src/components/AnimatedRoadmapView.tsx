import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Calendar, Clock, Target, TrendingUp, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { useDarkMode } from '../hooks/useDarkMode';

interface RoadmapTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  type: 'research' | 'preparation' | 'writing' | 'networking' | 'review' | 'action' | 'followup';
  estimatedTime?: string;
  completedAt?: Date;
}

interface RoadmapMonth {
  month: string;
  title: string;
  description: string;
  tasks: RoadmapTask[];
  color: string;
  progress?: number;
  isActive?: boolean;
}

interface AnimatedRoadmapViewProps {
  goal: {
    id: string;
    title: string;
    description: string;
    progress: number;
    targetDate?: Date;
    monthlyRoadmap?: RoadmapMonth[];
  };
  onTaskToggle: (taskId: string, completed: boolean) => Promise<void>;
  onBack?: () => void;
  autoPlay?: boolean;
}

const AnimatedRoadmapView: React.FC<AnimatedRoadmapViewProps> = ({
  goal,
  onTaskToggle,
  onBack,
  autoPlay = false
}) => {
  const { isDarkMode } = useDarkMode();
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [animationSpeed, setAnimationSpeed] = useState(3000); // 3 seconds per month
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('timeline');

  const roadmap = goal.monthlyRoadmap || [];

  // Auto-advance through months
  useEffect(() => {
    if (!isPlaying || roadmap.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMonthIndex(prev => (prev + 1) % roadmap.length);
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, animationSpeed, roadmap.length]);

  // Calculate progress for each month
  const calculateMonthProgress = (month: RoadmapMonth) => {
    if (!month.tasks || month.tasks.length === 0) return 0;
    const completedTasks = month.tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / month.tasks.length) * 100);
  };

  // Enhanced roadmap with calculated progress
  const enhancedRoadmap = roadmap.map((month, index) => ({
    ...month,
    progress: calculateMonthProgress(month),
    isActive: index === currentMonthIndex
  }));

  const currentMonth = enhancedRoadmap[currentMonthIndex];

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'research': return '🔍';
      case 'preparation': return '📋';
      case 'writing': return '✍️';
      case 'networking': return '🤝';
      case 'review': return '👀';
      case 'action': return '🚀';
      case 'followup': return '📞';
      default: return '📝';
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'research': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'preparation': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'writing': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'networking': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'review': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'action': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'followup': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const nextMonth = () => {
    setCurrentMonthIndex(prev => Math.min(prev + 1, roadmap.length - 1));
  };

  const prevMonth = () => {
    setCurrentMonthIndex(prev => Math.max(prev - 1, 0));
  };

  if (!roadmap || roadmap.length === 0) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card className="text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Roadmap Available
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This goal doesn't have a roadmap yet. Create one to track your progress!
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button
                  variant="secondary"
                  onClick={onBack}
                  icon={ChevronLeft}
                  size="md"
                >
                  Back
                </Button>
              )}
              
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {goal.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Roadmap Progress: {goal.progress}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Cards
                </button>
              </div>

              {/* Playback Controls */}
              <Button
                variant="outline"
                onClick={() => setIsPlaying(!isPlaying)}
                icon={isPlaying ? Pause : Play}
                size="sm"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {viewMode === 'timeline' ? (
          /* Timeline View */
          <div className="space-y-6">
            {/* Progress Overview */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Roadmap Timeline
                </h2>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {currentMonthIndex + 1} of {roadmap.length} months
                </div>
              </div>
              
              {/* Timeline Progress Bar */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-between">
                  {enhancedRoadmap.map((month, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <button
                        onClick={() => setCurrentMonthIndex(index)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all ${
                          month.isActive
                            ? 'border-blue-500 bg-blue-500 text-white scale-110'
                            : month.progress === 100
                            ? 'border-green-500 bg-green-500 text-white'
                            : month.progress > 0
                            ? 'border-yellow-500 bg-yellow-500 text-white'
                            : 'border-gray-300 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                        style={{
                          background: month.isActive ? month.color : undefined
                        }}
                      >
                        {index + 1}
                      </button>
                      <div className="mt-2 text-xs text-center max-w-20">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {month.month}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {month.progress}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={prevMonth}
                  disabled={currentMonthIndex === 0}
                  icon={ChevronLeft}
                  size="sm"
                >
                  Previous
                </Button>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {currentMonth?.month}
                </div>
                
                <Button
                  variant="outline"
                  onClick={nextMonth}
                  disabled={currentMonthIndex === roadmap.length - 1}
                  icon={ChevronRight}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </Card>

            {/* Current Month Details */}
            {currentMonth && (
              <Card 
                className="animate-fade-in"
                style={{ 
                  borderLeft: `4px solid ${currentMonth.color}`,
                  background: `linear-gradient(135deg, ${currentMonth.color}10, transparent)`
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {currentMonth.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {currentMonth.description}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: currentMonth.color }}>
                      {currentMonth.progress}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Complete
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  {currentMonth.tasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                        task.completed
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      }`}
                      style={{ 
                        animationDelay: `${taskIndex * 100}ms`,
                        animation: 'fadeInUp 0.5s ease-out forwards'
                      }}
                    >
                      <button
                        onClick={() => onTaskToggle(task.id, !task.completed)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {task.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${
                            task.completed 
                              ? 'text-green-700 dark:text-green-400 line-through' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {task.title}
                          </h4>
                          
                          <span className={`text-xs px-2 py-1 rounded-full ${getTaskTypeColor(task.type)}`}>
                            {getTaskTypeIcon(task.type)} {task.type}
                          </span>
                        </div>
                        
                        {task.description && (
                          <p className={`text-sm ${
                            task.completed 
                              ? 'text-green-600 dark:text-green-500' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {task.description}
                          </p>
                        )}
                        
                        {task.completedAt && (
                          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                            Completed on {task.completedAt.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          /* Cards View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enhancedRoadmap.map((month, index) => (
              <Card
                key={index}
                className={`transition-all duration-300 hover:scale-105 cursor-pointer ${
                  month.isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => setCurrentMonthIndex(index)}
                style={{ 
                  borderLeft: `4px solid ${month.color}`,
                  background: month.isActive 
                    ? `linear-gradient(135deg, ${month.color}20, transparent)`
                    : undefined
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {month.month}
                  </h3>
                  <div 
                    className="text-lg font-bold"
                    style={{ color: month.color }}
                  >
                    {month.progress}%
                  </div>
                </div>
                
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {month.title}
                </h4>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {month.description}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${month.progress}%`,
                      backgroundColor: month.color
                    }}
                  />
                </div>

                {/* Task Summary */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{month.tasks.filter(t => t.completed).length} / {month.tasks.length} tasks</span>
                  <span>{month.tasks.length} total</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedRoadmapView;