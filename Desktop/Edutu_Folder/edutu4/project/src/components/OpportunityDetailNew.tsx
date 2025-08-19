import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Star, Bell, ExternalLink, Target, BookOpen, Loader2, TrendingUp, Filter, CheckCircle, Award, Globe, DollarSign } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoals } from '../hooks/useGoals';
import { useAuth } from '../hooks/useAuth';
import { useOpportunityDetails, OpportunityData } from '../hooks/useOpportunities';
import { generateRoadmap } from '../services/apiService';

interface OpportunityDetailProps {
  opportunityId: string;
  onBack: () => void;
  onAddToGoals: (opportunity: OpportunityData) => void;
  onViewSuccessStory?: (opportunity: OpportunityData) => void;
  onGetRoadmap?: (opportunity: OpportunityData) => void;
}

const OpportunityDetail: React.FC<OpportunityDetailProps> = ({ 
  opportunityId, 
  onBack, 
  onAddToGoals,
  onViewSuccessStory,
  onGetRoadmap 
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [roadmapGenerated, setRoadmapGenerated] = useState(false);
  
  const { isDarkMode } = useDarkMode();
  const { createGoal } = useGoals();
  const { user } = useAuth();
  
  // Use the new hook for real-time opportunity details
  const { opportunity, loading, error } = useOpportunityDetails(opportunityId);

  const handleAddToGoals = async () => {
    if (!opportunity) return;
    
    try {
      await createGoal({
        title: `Apply for ${opportunity.title}`,
        description: `Complete application for ${opportunity.title} opportunity from ${opportunity.provider}`,
        targetDate: opportunity.deadline,
        category: 'Opportunity Application',
        priority: 'high' as const,
        milestones: [
          { title: 'Review requirements', completed: false },
          { title: 'Prepare application materials', completed: false },
          { title: 'Submit application', completed: false },
          { title: 'Follow up on application', completed: false }
        ]
      });
      onAddToGoals(opportunity);
    } catch (error) {
      console.error('Error adding opportunity to goals:', error);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!opportunity) return;
    
    setIsGeneratingRoadmap(true);
    try {
      // Generate roadmap using the API service
      const roadmap = await generateRoadmap({
        opportunityTitle: opportunity.title,
        provider: opportunity.provider,
        category: opportunity.category,
        deadline: opportunity.deadline,
        requirements: opportunity.requirements,
        benefits: opportunity.benefits
      });
      
      setRoadmapGenerated(true);
      if (onGetRoadmap) {
        onGetRoadmap(opportunity);
      }
    } catch (error) {
      console.error('Error generating roadmap:', error);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const getDifficultyColor = (successRate: string) => {
    const rate = parseFloat(successRate.replace('%', ''));
    if (rate >= 70) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (rate >= 40) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  if (loading) {
    return (
      <div className={`min-h-screen surface-bg ${isDarkMode ? 'dark' : ''}`}>
        <div className="safe-area-x px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="ml-3 text-lg text-secondary">Loading opportunity details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className={`min-h-screen surface-bg ${isDarkMode ? 'dark' : ''}`}>
        <div className="safe-area-x px-4 py-6">
          <Button variant="secondary" onClick={onBack} className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-primary mb-2">Opportunity Not Found</h2>
            <p className="text-secondary mb-4">{error || 'This opportunity could not be loaded.'}</p>
            <Button onClick={onBack} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen surface-bg animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="background-bg sticky top-0 z-10 shadow-sm">
        <div className="safe-area-x px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="secondary"
              onClick={onBack}
              className="btn-touch p-3 flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-primary truncate">
                Opportunity Details
              </h1>
              <p className="text-sm text-secondary">
                Real-time information
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="safe-area-x px-4 py-6 space-y-6">
        {/* Hero Section */}
        <Card className="card-elevated p-6">
          <div className="flex gap-4 mb-6">
            {/* Opportunity Image */}
            <div className="flex-shrink-0">
              {opportunity.imageUrl ? (
                <img 
                  src={opportunity.imageUrl} 
                  alt={opportunity.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${opportunity.imageUrl ? 'hidden' : ''}`}>
                {opportunity.provider?.[0] || opportunity.title[0]}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-primary mb-2 line-clamp-2">
                {opportunity.title}
              </h2>
              <p className="text-lg font-medium text-secondary mb-3">
                {opportunity.provider}
              </p>
              
              {/* Key Metrics */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                  <Star className="text-yellow-500" size={16} />
                  <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                    {opportunity.match}% match
                  </span>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(opportunity.successRate)}`}>
                  <TrendingUp size={14} />
                  {opportunity.successRate} success rate
                </div>
                <div className="flex items-center gap-1 text-sm text-secondary">
                  <Calendar size={14} />
                  Due: {opportunity.deadline}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={handleAddToGoals} 
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-600"
            >
              <Target size={16} />
              Add to Goals
            </Button>
            <Button 
              onClick={handleGenerateRoadmap}
              disabled={isGeneratingRoadmap}
              variant="secondary" 
              className="flex items-center justify-center gap-2"
            >
              {isGeneratingRoadmap ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : roadmapGenerated ? (
                <>
                  <CheckCircle size={16} />
                  Roadmap Ready
                </>
              ) : (
                <>
                  <BookOpen size={16} />
                  Generate Roadmap
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Summary */}
        <Card className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <BookOpen size={20} />
            Summary
          </h3>
          <p className="text-secondary leading-relaxed">
            {opportunity.summary || 'No summary available for this opportunity.'}
          </p>
        </Card>

        {/* Requirements */}
        {opportunity.requirements.length > 0 && (
          <Card className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              Requirements
            </h3>
            <ul className="space-y-3">
              {opportunity.requirements.map((requirement, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-secondary">{requirement}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Eligibility */}
        {opportunity.eligibility.length > 0 && (
          <Card className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Users size={20} />
              Eligibility
            </h3>
            <ul className="space-y-3">
              {opportunity.eligibility.map((criterion, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-secondary">{criterion}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Benefits */}
        {opportunity.benefits.length > 0 && (
          <Card className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Award size={20} />
              Benefits
            </h3>
            <ul className="space-y-3">
              {opportunity.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-secondary">{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Application Process */}
        {opportunity.applicationProcess.length > 0 && (
          <Card className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Target size={20} />
              Application Process
            </h3>
            <ol className="space-y-4">
              {opportunity.applicationProcess.map((step, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-secondary pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meta Information */}
          <Card className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Filter className="text-secondary flex-shrink-0" size={16} />
                <span className="text-sm text-secondary">Category:</span>
                <span className="text-sm font-medium text-primary">{opportunity.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="text-secondary flex-shrink-0" size={16} />
                <span className="text-sm text-secondary">Location:</span>
                <span className="text-sm font-medium text-primary">{opportunity.location || 'Global'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="text-secondary flex-shrink-0" size={16} />
                <span className="text-sm text-secondary">Deadline:</span>
                <span className="text-sm font-medium text-primary">{opportunity.deadline}</span>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="text-secondary flex-shrink-0" size={16} />
                <span className="text-sm text-secondary">Success Rate:</span>
                <span className="text-sm font-medium text-primary">{opportunity.successRate}</span>
              </div>
            </div>
          </Card>

          {/* Tags */}
          {opportunity.tags && opportunity.tags.length > 0 && (
            <Card className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {opportunity.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <Card className="card-elevated p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {opportunity.link && (
              <Button
                onClick={() => window.open(opportunity.link, '_blank')}
                className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-600"
              >
                <ExternalLink size={16} />
                Apply Now
              </Button>
            )}
            
            <Button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              variant="secondary"
              className="flex items-center justify-center gap-2"
            >
              <Bell size={16} />
              {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
            </Button>
            
            {onViewSuccessStory && (
              <Button
                onClick={() => onViewSuccessStory(opportunity)}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Star size={16} />
                Success Stories
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default OpportunityDetail;