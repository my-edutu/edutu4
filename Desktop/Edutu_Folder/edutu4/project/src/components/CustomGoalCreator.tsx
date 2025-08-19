import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Target, 
  Plus, 
  GraduationCap, 
  Briefcase, 
  Heart, 
  Star, 
  Trophy, 
  Sparkles,
  Calendar,
  Brain,
  CheckCircle,
  Zap
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoalCreation } from '../hooks/useGoalCreation';

interface CustomGoalCreatorProps {
  onBack: () => void;
  onGoalCreated: (goalId: string) => void;
  user: { name: string; age: number; uid: string } | null;
}

interface CustomGoalData {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  targetDate: string;
  estimatedTime: string;
  skills: string[];
  motivations: string[];
}

const CustomGoalCreator: React.FC<CustomGoalCreatorProps> = ({
  onBack,
  onGoalCreated,
  user
}) => {
  const { isDarkMode } = useDarkMode();
  const { createCustomGoal, isCreating } = useGoalCreation();
  const [step, setStep] = useState<'details' | 'customization' | 'preview'>('details');
  const [goalData, setGoalData] = useState<CustomGoalData>({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    difficulty: 'medium',
    targetDate: '',
    estimatedTime: '',
    skills: [],
    motivations: []
  });
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const categories = [
    { id: 'education', label: 'Education & Learning', icon: <GraduationCap size={20} /> },
    { id: 'career', label: 'Career Development', icon: <Briefcase size={20} /> },
    { id: 'health', label: 'Health & Wellness', icon: <Heart size={20} /> },
    { id: 'personal', label: 'Personal Growth', icon: <Star size={20} /> },
    { id: 'skill', label: 'Skill Development', icon: <Zap size={20} /> },
    { id: 'creative', label: 'Creative Projects', icon: <Sparkles size={20} /> }
  ];

  const skillSuggestions = {
    education: ['Research Skills', 'Academic Writing', 'Critical Thinking', 'Study Techniques'],
    career: ['Leadership', 'Project Management', 'Communication', 'Networking'],
    health: ['Exercise Planning', 'Nutrition', 'Mental Health', 'Habit Formation'],
    personal: ['Time Management', 'Goal Setting', 'Self-Reflection', 'Mindfulness'],
    skill: ['Programming', 'Design', 'Languages', 'Technical Skills'],
    creative: ['Writing', 'Art', 'Music', 'Photography']
  };

  const motivationSuggestions = [
    'Career advancement',
    'Personal fulfillment',
    'Financial improvement',
    'Health and wellness',
    'Learning and growth',
    'Making an impact',
    'Building confidence',
    'Expanding network'
  ];

  const handleAddSkill = (skill: string) => {
    if (!goalData.skills.includes(skill)) {
      setGoalData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setGoalData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleAddMotivation = (motivation: string) => {
    if (!goalData.motivations.includes(motivation)) {
      setGoalData(prev => ({
        ...prev,
        motivations: [...prev.motivations, motivation]
      }));
    }
  };

  const handleRemoveMotivation = (motivation: string) => {
    setGoalData(prev => ({
      ...prev,
      motivations: prev.motivations.filter(m => m !== motivation)
    }));
  };

  const generateAIRoadmap = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation with realistic delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a realistic roadmap based on the goal data
    const roadmap = {
      id: `custom_${Date.now()}`,
      title: goalData.title,
      description: goalData.description,
      category: goalData.category,
      difficulty: goalData.difficulty,
      priority: goalData.priority,
      targetDate: new Date(goalData.targetDate),
      estimatedTime: goalData.estimatedTime,
      skills: goalData.skills,
      monthlyRoadmap: generateMonthlyPlan(goalData),
      aiGenerated: true,
      createdAt: new Date()
    };
    
    setGeneratedRoadmap(roadmap);
    setIsGenerating(false);
    setStep('preview');
  };

  const generateMonthlyPlan = (data: CustomGoalData) => {
    const targetDate = new Date(data.targetDate);
    const currentDate = new Date();
    const monthsDiff = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const months = Math.min(Math.max(monthsDiff, 1), 6); // Between 1 and 6 months
    
    const monthlyPlan = [];
    
    for (let i = 0; i < months; i++) {
      const month = {
        id: `month_${i + 1}`,
        month: i + 1,
        title: getMonthTitle(i, data.category),
        description: getMonthDescription(i, data.title, data.category),
        tasks: generateMonthlyTasks(i, data),
        focusAreas: data.skills.slice(i * 2, (i + 1) * 2),
        targetProgress: Math.round(((i + 1) / months) * 100)
      };
      monthlyPlan.push(month);
    }
    
    return monthlyPlan;
  };

  const getMonthTitle = (index: number, category: string) => {
    const titles = {
      0: 'Foundation & Setup',
      1: 'Core Development',
      2: 'Skill Building',
      3: 'Advanced Practice',
      4: 'Mastery & Refinement',
      5: 'Goal Achievement'
    };
    return titles[index] || 'Continued Progress';
  };

  const getMonthDescription = (index: number, title: string, category: string) => {
    const descriptions = {
      0: `Establish foundation and initial steps for ${title}`,
      1: `Build core skills and knowledge in ${category}`,
      2: `Develop practical skills through hands-on practice`,
      3: `Apply advanced techniques and tackle challenges`,
      4: `Refine expertise and prepare for completion`,
      5: `Achieve final objectives and plan next steps`
    };
    return descriptions[index] || `Continue making progress toward ${title}`;
  };

  const generateMonthlyTasks = (monthIndex: number, data: CustomGoalData) => {
    const baseTasks = [
      {
        id: `task_${monthIndex}_1`,
        title: `Research ${data.category} best practices`,
        description: 'Study current trends and methodologies',
        completed: false,
        priority: 'high' as const
      },
      {
        id: `task_${monthIndex}_2`,
        title: `Practice core ${data.category} skills`,
        description: 'Apply learning through practical exercises',
        completed: false,
        priority: 'medium' as const
      },
      {
        id: `task_${monthIndex}_3`,
        title: 'Track progress and adjust approach',
        description: 'Review achievements and refine strategy',
        completed: false,
        priority: 'medium' as const
      }
    ];
    
    return baseTasks;
  };

  const handleCreateGoal = async () => {
    if (!user || !generatedRoadmap) return;

    try {
      const goalId = await createCustomGoal({
        ...generatedRoadmap,
        userId: user.uid
      });

      if (goalId) {
        onGoalCreated(goalId);
      }
    } catch (error) {
      console.error('Failed to create custom goal:', error);
    }
  };

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Plus size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Create Custom Goal
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Tell us about your goal and we'll create a personalized roadmap with AI assistance.
        </p>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Goal Title *
            </label>
            <input
              type="text"
              value={goalData.title}
              onChange={(e) => setGoalData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="e.g., Learn Spanish fluently, Build a mobile app, Get promoted to manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={goalData.description}
              onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              placeholder="Describe what you want to achieve and why it's important to you..."
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Category *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setGoalData(prev => ({ ...prev, category: category.id }))}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    goalData.category === category.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {category.icon}
                  <span className="text-sm font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Priority Level
              </label>
              <div className="space-y-2">
                {['low', 'medium', 'high'].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setGoalData(prev => ({ ...prev, priority: priority as any }))}
                    className={`w-full py-2 px-3 rounded-xl border transition-all capitalize text-sm ${
                      goalData.priority === priority
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Difficulty Level
              </label>
              <div className="space-y-2">
                {['easy', 'medium', 'hard'].map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => setGoalData(prev => ({ ...prev, difficulty: difficulty as any }))}
                    className={`w-full py-2 px-3 rounded-xl border transition-all capitalize text-sm ${
                      goalData.difficulty === difficulty
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Completion Date
              </label>
              <input
                type="date"
                value={goalData.targetDate}
                onChange={(e) => setGoalData(prev => ({ ...prev, targetDate: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Commitment (per week)
              </label>
              <select
                value={goalData.estimatedTime}
                onChange={(e) => setGoalData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Select time commitment</option>
                <option value="1-2 hours/week">1-2 hours/week</option>
                <option value="3-5 hours/week">3-5 hours/week</option>
                <option value="6-10 hours/week">6-10 hours/week</option>
                <option value="10+ hours/week">10+ hours/week</option>
              </select>
            </div>
          </div>

          <Button
            onClick={() => setStep('customization')}
            disabled={!goalData.title || !goalData.description || !goalData.category}
            className="w-full"
          >
            Continue to Customization
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderCustomizationStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => setStep('details')}
          className="p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Customize Your Goal</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Add skills and motivations to personalize your roadmap</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Skills to Develop</h3>
          
          {goalData.category && skillSuggestions[goalData.category] && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Suggested skills for {goalData.category}:</p>
              <div className="flex flex-wrap gap-2">
                {skillSuggestions[goalData.category].map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleAddSkill(skill)}
                    disabled={goalData.skills.includes(skill)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      goalData.skills.includes(skill)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary/10'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected skills:</p>
            <div className="flex flex-wrap gap-2">
              {goalData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-full text-sm"
                >
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:bg-white/20 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Motivations</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">What motivates you to achieve this goal?</p>
            <div className="flex flex-wrap gap-2">
              {motivationSuggestions.map((motivation) => (
                <button
                  key={motivation}
                  onClick={() => handleAddMotivation(motivation)}
                  disabled={goalData.motivations.includes(motivation)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    goalData.motivations.includes(motivation)
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-accent/10'
                  }`}
                >
                  {motivation}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your motivations:</p>
            <div className="flex flex-wrap gap-2">
              {goalData.motivations.map((motivation) => (
                <span
                  key={motivation}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-white rounded-full text-sm"
                >
                  {motivation}
                  <button
                    onClick={() => handleRemoveMotivation(motivation)}
                    className="hover:bg-white/20 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Button
        onClick={generateAIRoadmap}
        disabled={isGenerating || goalData.skills.length === 0}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Generating AI Roadmap...
          </>
        ) : (
          <>
            <Brain size={16} className="mr-2" />
            Generate AI Roadmap
          </>
        )}
      </Button>
    </div>
  );

  const renderPreviewStep = () => {
    if (!generatedRoadmap) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="secondary"
            onClick={() => setStep('customization')}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">AI-Generated Roadmap</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Review your personalized goal roadmap</p>
          </div>
        </div>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Target size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {generatedRoadmap.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {generatedRoadmap.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="text-lg font-bold text-blue-600">{generatedRoadmap.monthlyRoadmap?.length || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Months</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="text-lg font-bold text-green-600">{generatedRoadmap.skills?.length || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Skills</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="text-lg font-bold text-purple-600 capitalize">{generatedRoadmap.difficulty}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Difficulty</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <div className="text-lg font-bold text-orange-600">{generatedRoadmap.estimatedTime}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Per Week</div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Monthly Roadmap Preview</h4>
            <div className="space-y-3">
              {generatedRoadmap.monthlyRoadmap?.slice(0, 2).map((month, index) => (
                <div key={month.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {month.month}
                    </div>
                    <h5 className="font-medium text-gray-800 dark:text-white">{month.title}</h5>
                    <div className="ml-auto text-sm font-medium text-primary">{month.targetProgress}%</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{month.description}</p>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {month.tasks?.length || 0} tasks • Focus: {month.focusAreas?.join(', ')}
                  </div>
                </div>
              ))}
              {(generatedRoadmap.monthlyRoadmap?.length || 0) > 2 && (
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                  + {(generatedRoadmap.monthlyRoadmap?.length || 0) - 2} more months with detailed plans
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 p-4 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-primary" />
              <h4 className="font-semibold text-gray-800 dark:text-white">AI-Powered Features</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle size={12} className="text-green-500" />
                <span>Smart progress tracking</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle size={12} className="text-green-500" />
                <span>Adaptive scheduling</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle size={12} className="text-green-500" />
                <span>Personalized reminders</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle size={12} className="text-green-500" />
                <span>Community support</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleCreateGoal}
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
                  <Trophy size={16} className="mr-2" />
                  Create This Goal
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep('customization')}
              className="px-6"
            >
              Edit Details
            </Button>
          </div>
        </Card>
      </div>
    );
  };

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
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Custom Goal Creator</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Step {step === 'details' ? '1' : step === 'customization' ? '2' : '3'} of 3
          </p>
        </div>
      </div>

      {step === 'details' && renderDetailsStep()}
      {step === 'customization' && renderCustomizationStep()}
      {step === 'preview' && renderPreviewStep()}
    </div>
  );
};

export default CustomGoalCreator;