import React, { useState } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Briefcase, 
  Heart, 
  Users, 
  Rocket,
  Target,
  Calendar,
  Flag,
  Zap,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoalCreation } from '../hooks/useGoalCreation';

interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: React.ReactNode;
  category: string;
  milestones: number;
  estimatedTime: string;
  skills: string[];
  color: string;
  monthlyRoadmap: any[];
}

interface GoalTemplatesProps {
  onBack: () => void;
  onTemplateSelect: (template: GoalTemplate) => void;
  onGoalCreated: (goalId: string) => void;
  user: { name: string; age: number; uid: string } | null;
}

const GoalTemplates: React.FC<GoalTemplatesProps> = ({
  onBack,
  onTemplateSelect,
  onGoalCreated,
  user
}) => {
  const { isDarkMode } = useDarkMode();
  const { createGoalFromTemplate, isCreating } = useGoalCreation();
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const templates: GoalTemplate[] = [
    {
      id: 'python-course',
      title: 'Complete Python Programming Course',
      description: 'Master Python from basics to advanced concepts with hands-on projects and real-world applications',
      duration: '12 weeks',
      difficulty: 'Beginner',
      icon: <BookOpen size={24} className="text-blue-600" />,
      category: 'Programming',
      milestones: 12,
      estimatedTime: '3-4 hours/week',
      skills: ['Python Basics', 'Data Structures', 'Web Development', 'APIs', 'Database Integration'],
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      monthlyRoadmap: [
        {
          id: 'month_1',
          month: 1,
          title: 'Python Fundamentals',
          description: 'Learn syntax, variables, and basic programming concepts',
          tasks: [
            { id: 'task_1_1', title: 'Install Python and IDE', completed: false },
            { id: 'task_1_2', title: 'Learn basic syntax', completed: false },
            { id: 'task_1_3', title: 'Practice with variables', completed: false }
          ]
        }
      ]
    },
    {
      id: 'scholarship-applications',
      title: 'Apply to 5 International Scholarships',
      description: 'Strategic approach to scholarship applications with timeline, essay writing, and interview preparation',
      duration: '16 weeks',
      difficulty: 'Intermediate',
      icon: <GraduationCap size={24} className="text-green-600" />,
      category: 'Education',
      milestones: 15,
      estimatedTime: '5-6 hours/week',
      skills: ['Research Skills', 'Essay Writing', 'Application Strategy', 'Interview Preparation', 'Personal Branding'],
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      monthlyRoadmap: [
        {
          id: 'month_1',
          month: 1,
          title: 'Research & Planning',
          description: 'Identify scholarships and create application timeline',
          tasks: [
            { id: 'task_1_1', title: 'Research 20+ scholarships', completed: false },
            { id: 'task_1_2', title: 'Create application timeline', completed: false }
          ]
        }
      ]
    },
    {
      id: 'portfolio-website',
      title: 'Build Professional Portfolio Website',
      description: 'Create a stunning portfolio website to showcase your skills, projects, and achievements to potential employers',
      duration: '8 weeks',
      difficulty: 'Intermediate',
      icon: <Briefcase size={24} className="text-purple-600" />,
      category: 'Career',
      milestones: 8,
      estimatedTime: '4-5 hours/week',
      skills: ['Web Design', 'HTML/CSS', 'JavaScript', 'Portfolio Strategy', 'Personal Branding'],
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      monthlyRoadmap: [
        {
          id: 'month_1',
          month: 1,
          title: 'Design & Planning',
          description: 'Plan portfolio structure and design',
          tasks: [
            { id: 'task_1_1', title: 'Research portfolio examples', completed: false },
            { id: 'task_1_2', title: 'Create wireframes', completed: false }
          ]
        }
      ]
    },
    {
      id: 'leadership-skills',
      title: 'Develop Leadership & Communication Skills',
      description: 'Build essential leadership qualities, public speaking, and team management skills for career advancement',
      duration: '10 weeks',
      difficulty: 'Beginner',
      icon: <Users size={24} className="text-orange-600" />,
      category: 'Personal Development',
      milestones: 10,
      estimatedTime: '3-4 hours/week',
      skills: ['Public Speaking', 'Team Management', 'Conflict Resolution', 'Emotional Intelligence', 'Communication'],
      color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      monthlyRoadmap: [
        {
          id: 'month_1',
          month: 1,
          title: 'Communication Fundamentals',
          description: 'Master basic communication and listening skills',
          tasks: [
            { id: 'task_1_1', title: 'Practice active listening', completed: false },
            { id: 'task_1_2', title: 'Join speaking group', completed: false }
          ]
        }
      ]
    },
    {
      id: 'startup-launch',
      title: 'Launch Your First Startup',
      description: 'Complete entrepreneurial journey from idea validation to product launch, marketing, and scaling',
      duration: '20 weeks',
      difficulty: 'Advanced',
      icon: <Rocket size={24} className="text-red-600" />,
      category: 'Entrepreneurship',
      milestones: 18,
      estimatedTime: '8-10 hours/week',
      skills: ['Business Planning', 'Market Research', 'Product Development', 'Marketing', 'Fundraising'],
      color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      monthlyRoadmap: [
        {
          id: 'month_1',
          month: 1,
          title: 'Idea Validation',
          description: 'Validate your business idea and market demand',
          tasks: [
            { id: 'task_1_1', title: 'Conduct market research', completed: false },
            { id: 'task_1_2', title: 'Survey potential customers', completed: false }
          ]
        }
      ]
    },
    {
      id: 'fitness-health',
      title: 'Complete Health & Fitness Transformation',
      description: 'Comprehensive wellness program covering physical fitness, nutrition, mental health, and sustainable habits',
      duration: '16 weeks',
      difficulty: 'Beginner',
      icon: <Heart size={24} className="text-pink-600" />,
      category: 'Health & Wellness',
      milestones: 12,
      estimatedTime: '5-6 hours/week',
      skills: ['Exercise Planning', 'Nutrition Knowledge', 'Mental Health', 'Habit Formation', 'Goal Setting'],
      color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
      monthlyRoadmap: [
        {
          id: 'month_1',
          month: 1,
          title: 'Foundation Building',
          description: 'Establish healthy habits and baseline fitness',
          tasks: [
            { id: 'task_1_1', title: 'Health assessment', completed: false },
            { id: 'task_1_2', title: 'Create workout plan', completed: false }
          ]
        }
      ]
    }
  ];

  const categories = ['All', 'Programming', 'Education', 'Career', 'Personal Development', 'Entrepreneurship', 'Health & Wellness'];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'Intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const handleTemplateSelect = async (template: GoalTemplate) => {
    if (!user) return;

    try {
      const goalId = await createGoalFromTemplate(template, {
        userId: user.uid,
        customizations: {
          targetDate: new Date(Date.now() + (template.duration.includes('week') ? 
            parseInt(template.duration) * 7 * 24 * 60 * 60 * 1000 :
            parseInt(template.duration) * 30 * 24 * 60 * 60 * 1000))
        }
      });

      if (goalId) {
        onGoalCreated(goalId);
      }
    } catch (error) {
      console.error('Failed to create goal from template:', error);
    }
  };

  const handlePreviewTemplate = (template: GoalTemplate) => {
    setSelectedTemplate(template);
  };

  if (selectedTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="secondary"
            onClick={() => setSelectedTemplate(null)}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Template Preview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Review and customize your selected template</p>
          </div>
        </div>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center shadow-sm">
              {selectedTemplate.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {selectedTemplate.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedTemplate.description}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{selectedTemplate.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flag size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{selectedTemplate.milestones} milestones</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{selectedTemplate.estimatedTime}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedTemplate.difficulty)}`}>
                  {selectedTemplate.difficulty}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Skills You'll Learn</h4>
            <div className="flex flex-wrap gap-2">
              {selectedTemplate.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">What You'll Achieve</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">Complete understanding of {selectedTemplate.category.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Target size={20} className="text-blue-600" />
                <span className="text-gray-700 dark:text-gray-300">Portfolio-ready projects and achievements</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <Star size={20} className="text-purple-600" />
                <span className="text-gray-700 dark:text-gray-300">Industry-relevant skills and certification</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => handleTemplateSelect(selectedTemplate)}
              className="flex-1"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Goal...
                </>
              ) : (
                <>
                  <Target size={16} className="mr-2" />
                  Create This Goal
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedTemplate(null)}
              className="px-6"
            >
              Back to Templates
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Goal Templates</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose from our expert-designed goal templates</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search templates by title, description, or skills..."
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4">
        {filteredTemplates.map((template, index) => (
          <Card
            key={template.id}
            className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.01] ${template.color} animate-slide-up group`}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handlePreviewTemplate(template)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {template.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-primary transition-colors">
                    {template.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                    {template.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm leading-relaxed">
                  {template.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{template.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flag size={12} />
                    <span>{template.milestones} milestones</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={12} />
                    <span>{template.estimatedTime}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.skills.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      {skill}
                    </span>
                  ))}
                  {template.skills.length > 3 && (
                    <span className="px-2 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      +{template.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No templates found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or category filter</p>
        </div>
      )}
    </div>
  );
};

export default GoalTemplates;