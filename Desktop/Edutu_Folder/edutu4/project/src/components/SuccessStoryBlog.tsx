import React, { useState } from 'react';
import { ArrowLeft, Clock, MapPin, TrendingUp, Star, CheckCircle, Target, BookOpen, Users, Award } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoalCreation } from '../hooks/useGoalCreation';
import { SuccessStory } from '../types/successStory';

interface SuccessStoryBlogProps {
  story: SuccessStory;
  onBack: () => void;
  onGetRoadmap: (story: SuccessStory) => void;
  onNavigate?: (screen: string) => void;
}

const SuccessStoryBlog: React.FC<SuccessStoryBlogProps> = ({ story, onBack, onGetRoadmap, onNavigate }) => {
  const { isDarkMode } = useDarkMode();
  const { 
    isCreating: isAddingGoal, 
    isSuccess: goalAdded, 
    error: goalError,
    createGoalFromSuccessStory,
    resetState 
  } = useGoalCreation();
  
  // Debug: Log component props on mount
  React.useEffect(() => {
  }, []);

  const handleAddAsGoal = async () => {
    
    if (isAddingGoal || goalAdded) {
      return;
    }
    
    try {
      const goalId = await createGoalFromSuccessStory(story);
      
      if (goalId) {
        
        // Optional: Navigate to dashboard to show the new goal
        if (onNavigate) {
          setTimeout(() => {
            onNavigate('dashboard');
          }, 2000);
        }
      }
    } catch (error) {
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'learning': return <BookOpen size={16} className="text-blue-500" />;
      case 'practice': return <Target size={16} className="text-orange-500" />;
      case 'project': return <Award size={16} className="text-purple-500" />;
      case 'networking': return <Users size={16} className="text-green-500" />;
      case 'application': return <CheckCircle size={16} className="text-red-500" />;
      default: return <BookOpen size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Opportunity
            </button>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(story.roadmap.difficulty)}`}>
                {story.roadmap.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                Success Rate: {story.metrics.successRate}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{story.person.avatar}</div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              How {story.person.name} Landed a {story.opportunity.title} Role
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
              From {story.person.previousRole || 'student'} to {story.person.currentRole} in {story.metrics.timeToCompletion}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                {story.person.location}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={16} />
                {story.metrics.timeToCompletion}
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp size={16} />
                {story.metrics.salaryIncrease}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-primary mb-1">{story.metrics.successRate}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-green-600 mb-1">{story.metrics.timeToCompletion}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Time to Success</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600 mb-1">{story.metrics.applicabilityScore}/100</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Applicability</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600 mb-1">{story.roadmap.steps.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Steps</div>
            </div>
          </div>
        </Card>

        {/* Story Content */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Main Story */}
          <div className="md:col-span-2">
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">The Challenge</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {story.story.challenge}
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">The Solution</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {story.story.solution}
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">The Outcome</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {story.story.outcome}
              </p>
            </Card>

            {/* Key Learnings */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Key Learnings</h3>
              <ul className="space-y-3">
                {story.story.keyLearnings.map((learning, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Star size={16} className="text-yellow-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{learning}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Advice */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{story.person.name}'s Advice</h3>
              <ul className="space-y-3">
                {story.story.advice.map((advice, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{advice}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            {/* Person Info */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{story.person.avatar}</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{story.person.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Age {story.person.age}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Background:</span>
                  <p className="text-gray-600 dark:text-gray-400">{story.person.background}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Previous:</span>
                  <p className="text-gray-600 dark:text-gray-400">{story.person.previousRole}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Current:</span>
                  <p className="text-gray-600 dark:text-gray-400">{story.person.currentRole}</p>
                </div>
              </div>
            </Card>

            {/* Skills Gained */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Skills Gained</h3>
              <div className="flex flex-wrap gap-2">
                {story.roadmap.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Card>

            {/* Tools Used */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Tools Used</h3>
              <div className="flex flex-wrap gap-2">
                {story.roadmap.tools.map((tool, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium dark:bg-gray-700 dark:text-gray-300"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Roadmap Preview */}
        <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Roadmap That Made It Possible</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{story.roadmap.duration}</span>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">{story.roadmap.description}</p>

          <div className="grid gap-4 mb-6">
            {story.roadmap.steps.slice(0, 3).map((step, index) => (
              <div key={step.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(step.type)}
                    <h4 className="font-semibold text-gray-900 dark:text-white">{step.title}</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({step.duration})</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
            
            {story.roadmap.steps.length > 3 && (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">
                  + {story.roadmap.steps.length - 3} more detailed steps...
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* CTA Section */}
        <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Follow {story.person.name}'s Path?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get the exact same roadmap that helped {story.person.name} land their dream role at {story.opportunity.organization}. 
              This step-by-step guide has a {story.metrics.successRate} success rate.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleAddAsGoal}
                disabled={isAddingGoal || goalAdded}
                className={`flex items-center justify-center gap-2 transition-all ${
                  goalAdded 
                    ? 'bg-green-600 hover:bg-green-600 text-white' 
                    : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90'
                } ${isAddingGoal ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isAddingGoal ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding Goal...
                  </>
                ) : goalAdded ? (
                  <>
                    <CheckCircle size={20} />
                    Goal Added Successfully!
                  </>
                ) : (
                  <>
                    <Target size={20} />
                    Add as Goal to Track Progress
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onGetRoadmap(story)}
                className="flex items-center justify-center gap-2"
              >
                <BookOpen size={20} />
                View Roadmap Details
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                Back to Opportunity
              </Button>
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              💡 Tip: This roadmap can be customized based on your current skills and timeline
            </div>
            
            {/* Debug Information */}
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-xs text-gray-700">
              Debug: Unified Goal Creation | 
              isCreating = {isAddingGoal.toString()} | 
              isSuccess = {goalAdded.toString()} | 
              hasError = {!!goalError}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuccessStoryBlog;