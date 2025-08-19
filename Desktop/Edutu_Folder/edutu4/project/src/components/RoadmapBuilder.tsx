import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Calendar, 
  Target, 
  Clock, 
  Flag, 
  Trash2, 
  Edit3, 
  Eye, 
  Share2, 
  Download, 
  GripVertical,
  AlertCircle,
  CheckCircle,
  Circle,
  Palette,
  Info,
  Copy,
  Settings
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'completed';
  startDate: string;
  endDate: string;
  dependencies: string[];
  color: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  date: string;
  color: string;
}

interface RoadmapData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  tasks: Task[];
  milestones: Milestone[];
  categories: string[];
}

interface RoadmapBuilderProps {
  onBack: () => void;
  onSave?: (roadmapData: RoadmapData) => void;
}

const RoadmapBuilder: React.FC<RoadmapBuilderProps> = ({ onBack, onSave }) => {
  const { isDarkMode } = useDarkMode();
  const [currentView, setCurrentView] = useState<'builder' | 'preview'>('builder');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  
  const [roadmapData, setRoadmapData] = useState<RoadmapData>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    tasks: [],
    milestones: [],
    categories: ['Planning', 'Development', 'Testing', 'Launch']
  });

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    category: 'Planning',
    priority: 'medium',
    status: 'not-started',
    startDate: '',
    endDate: '',
    dependencies: [],
    color: '#3B82F6'
  });

  const [newMilestone, setNewMilestone] = useState<Partial<Milestone>>({
    title: '',
    description: '',
    date: '',
    color: '#10B981'
  });

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ];

  const priorityColors = {
    low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
  };

  const statusIcons = {
    'not-started': <Circle size={16} className="text-gray-400" />,
    'in-progress': <Clock size={16} className="text-blue-500" />,
    'completed': <CheckCircle size={16} className="text-green-500" />
  };

  const handleAddTask = () => {
    if (!newTask.title || !newTask.startDate || !newTask.endDate) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || '',
      category: newTask.category || 'Planning',
      priority: newTask.priority || 'medium',
      status: newTask.status || 'not-started',
      startDate: newTask.startDate,
      endDate: newTask.endDate,
      dependencies: newTask.dependencies || [],
      color: newTask.color || '#3B82F6'
    };

    setRoadmapData(prev => ({
      ...prev,
      tasks: [...prev.tasks, task]
    }));

    setNewTask({
      title: '',
      description: '',
      category: 'Planning',
      priority: 'medium',
      status: 'not-started',
      startDate: '',
      endDate: '',
      dependencies: [],
      color: '#3B82F6'
    });
    setShowTaskForm(false);
  };

  const handleAddMilestone = () => {
    if (!newMilestone.title || !newMilestone.date) return;

    const milestone: Milestone = {
      id: Date.now().toString(),
      title: newMilestone.title,
      description: newMilestone.description || '',
      date: newMilestone.date,
      color: newMilestone.color || '#10B981'
    };

    setRoadmapData(prev => ({
      ...prev,
      milestones: [...prev.milestones, milestone]
    }));

    setNewMilestone({
      title: '',
      description: '',
      date: '',
      color: '#10B981'
    });
    setShowMilestoneForm(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setRoadmapData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId)
    }));
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setRoadmapData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(milestone => milestone.id !== milestoneId)
    }));
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedTask) return;

    const draggedIndex = roadmapData.tasks.findIndex(task => task.id === draggedTask);
    if (draggedIndex === -1) return;

    const newTasks = [...roadmapData.tasks];
    const [draggedTaskObj] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTaskObj);

    setRoadmapData(prev => ({
      ...prev,
      tasks: newTasks
    }));
    setDraggedTask(null);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(roadmapData);
    }
    // Show success message
    alert('Roadmap saved successfully!');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(roadmapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${roadmapData.title || 'roadmap'}.json`;
    link.click();
  };

  const calculateProgress = () => {
    if (roadmapData.tasks.length === 0) return 0;
    const completedTasks = roadmapData.tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / roadmapData.tasks.length) * 100);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const renderTaskForm = () => (
    <Card className="dark:bg-gray-800 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          {editingTask ? 'Edit Task' : 'Add New Task'}
        </h3>
        <button
          onClick={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter task title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            value={newTask.category}
            onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {roadmapData.categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={newTask.status}
            onChange={(e) => setNewTask({ ...newTask, status: e.target.value as 'not-started' | 'in-progress' | 'completed' })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            value={newTask.startDate}
            onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date *
          </label>
          <input
            type="date"
            value={newTask.endDate}
            onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={newTask.description}
          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          rows={3}
          placeholder="Task description (optional)"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color
        </label>
        <div className="flex gap-2">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setNewTask({ ...newTask, color })}
              className={`w-8 h-8 rounded-full border-2 ${newTask.color === color ? 'border-gray-800 dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          onClick={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          variant="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddTask}
          className="flex-1"
          disabled={!newTask.title || !newTask.startDate || !newTask.endDate}
        >
          {editingTask ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </Card>
  );

  const renderMilestoneForm = () => (
    <Card className="dark:bg-gray-800 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add New Milestone</h3>
        <button
          onClick={() => setShowMilestoneForm(false)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Milestone Title *
          </label>
          <input
            type="text"
            value={newMilestone.title}
            onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter milestone title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date *
          </label>
          <input
            type="date"
            value={newMilestone.date}
            onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={newMilestone.description}
          onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          rows={3}
          placeholder="Milestone description (optional)"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color
        </label>
        <div className="flex gap-2">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setNewMilestone({ ...newMilestone, color })}
              className={`w-8 h-8 rounded-full border-2 ${newMilestone.color === color ? 'border-gray-800 dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          onClick={() => setShowMilestoneForm(false)}
          variant="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddMilestone}
          className="flex-1"
          disabled={!newMilestone.title || !newMilestone.date}
        >
          Add Milestone
        </Button>
      </div>
    </Card>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      {/* Roadmap Header */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {roadmapData.title || 'Untitled Roadmap'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {roadmapData.description || 'No description provided'}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Start: {roadmapData.startDate || 'Not set'}</span>
            <span>•</span>
            <span>End: {roadmapData.endDate || 'Not set'}</span>
          </div>
        </div>
      </Card>

      {/* Progress Overview */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Progress Overview</h3>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{calculateProgress()}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-500"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">{roadmapData.tasks.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {roadmapData.tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">{roadmapData.milestones.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Milestones</div>
          </div>
        </div>
      </Card>

      {/* Timeline View */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Timeline</h3>
        <div className="space-y-4">
          {roadmapData.tasks
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .map((task, index) => (
              <div key={task.id} className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: task.color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800 dark:text-white">{task.title}</h4>
                    <div className="flex items-center gap-2">
                      {statusIcons[task.status]}
                      <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {task.startDate} - {task.endDate} • {task.category}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Milestones */}
      {roadmapData.milestones.length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Milestones</h3>
          <div className="space-y-3">
            {roadmapData.milestones
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(milestone => (
                <div key={milestone.id} className="flex items-center gap-4">
                  <Flag size={16} style={{ color: milestone.color }} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-white">{milestone.title}</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {milestone.date} • {milestone.description}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );

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
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Roadmap Builder</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create your custom success roadmap</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentView(currentView === 'builder' ? 'preview' : 'builder')}
                className="inline-flex items-center gap-2"
              >
                <Eye size={16} />
                {currentView === 'builder' ? 'Preview' : 'Edit'}
              </Button>
              <Button
                onClick={handleSave}
                className="inline-flex items-center gap-2"
                disabled={!roadmapData.title}
              >
                <Save size={16} />
                Save
              </Button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('builder')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentView === 'builder'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Builder
            </button>
            <button
              onClick={() => setCurrentView('preview')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentView === 'preview'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {currentView === 'preview' ? renderPreview() : (
          <>
            {/* Basic Information */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Roadmap Title *
                  </label>
                  <input
                    type="text"
                    value={roadmapData.title}
                    onChange={(e) => setRoadmapData({ ...roadmapData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your roadmap title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={roadmapData.startDate}
                    onChange={(e) => setRoadmapData({ ...roadmapData, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={roadmapData.endDate}
                    onChange={(e) => setRoadmapData({ ...roadmapData, endDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={roadmapData.description}
                    onChange={(e) => setRoadmapData({ ...roadmapData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Describe your roadmap objectives and goals"
                  />
                </div>
              </div>
            </Card>

            {/* Task Form */}
            {showTaskForm && renderTaskForm()}

            {/* Milestone Form */}
            {showMilestoneForm && renderMilestoneForm()}

            {/* Tasks Section */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Tasks</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowMilestoneForm(true)}
                    variant="secondary"
                    className="inline-flex items-center gap-2"
                  >
                    <Flag size={16} />
                    Add Milestone
                  </Button>
                  <Button
                    onClick={() => setShowTaskForm(true)}
                    className="inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Task
                  </Button>
                </div>
              </div>

              {roadmapData.tasks.length === 0 ? (
                <div className="text-center py-12">
                  <Target size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No tasks yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Start building your roadmap by adding your first task
                  </p>
                  <Button
                    onClick={() => setShowTaskForm(true)}
                    className="inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Your First Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {roadmapData.tasks.map((task, index) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all cursor-move"
                    >
                      <GripVertical size={16} className="text-gray-400" />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: task.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-800 dark:text-white">{task.title}</h4>
                          <div className="flex items-center gap-2">
                            {statusIcons[task.status]}
                            <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {task.startDate} - {task.endDate} • {task.category}
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setNewTask(task);
                            setEditingTask(task.id);
                            setShowTaskForm(true);
                          }}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Milestones Section */}
            {roadmapData.milestones.length > 0 && (
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Milestones</h2>
                <div className="space-y-3">
                  {roadmapData.milestones.map(milestone => (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl"
                    >
                      <Flag size={16} style={{ color: milestone.color }} />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 dark:text-white">{milestone.title}</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {milestone.date} • {milestone.description}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Actions */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-2"
                  disabled={!roadmapData.title}
                >
                  <Save size={16} />
                  Save
                </Button>
                <Button
                  onClick={handleExport}
                  variant="secondary"
                  className="inline-flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Export
                </Button>
                <Button
                  onClick={() => navigator.share?.({ title: roadmapData.title, text: roadmapData.description })}
                  variant="secondary"
                  className="inline-flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  Share
                </Button>
                <Button
                  onClick={() => setCurrentView('preview')}
                  variant="secondary"
                  className="inline-flex items-center justify-center gap-2"
                >
                  <Eye size={16} />
                  Preview
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default RoadmapBuilder;