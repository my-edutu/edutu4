// Enhanced Opportunity Detail with Activity Tracking Integration

import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Users, BookOpen, Star, ExternalLink } from 'lucide-react';
import { Opportunity } from '../types/common';
import { useActivityTracking, usePageTimeTracking } from '../hooks/useActivityTracking';
import { useAuth } from '../hooks/useAuth';

interface EnhancedOpportunityDetailProps {
  opportunity: Opportunity;
  onSave?: () => void;
  onApply?: () => void;
  onIgnore?: () => void;
}

export default function EnhancedOpportunityDetail({
  opportunity,
  onSave,
  onApply,
  onIgnore
}: EnhancedOpportunityDetailProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [viewStartTime, setViewStartTime] = useState<number>(Date.now());
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  // Activity tracking hooks
  const {
    trackOpportunityView,
    trackOpportunitySave,
    trackOpportunityIgnore,
    trackOpportunityApplication
  } = useActivityTracking();

  // Track page time
  usePageTimeTracking(`opportunity_detail_${opportunity.id}`);

  // Track initial view
  useEffect(() => {
    if (!hasTrackedView && user) {
      const timer = setTimeout(() => {
        // Track view after user has been on page for 3 seconds (indicating genuine interest)
        trackOpportunityView(
          opportunity.id,
          opportunity.title,
          opportunity.category,
          Date.now() - viewStartTime
        );
        setHasTrackedView(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [hasTrackedView, user, opportunity, trackOpportunityView, viewStartTime]);

  // Track when user leaves the page (view duration)
  useEffect(() => {
    return () => {
      if (hasTrackedView && user) {
        const viewDuration = Date.now() - viewStartTime;
        // Track final view duration when component unmounts
        trackOpportunityView(
          opportunity.id,
          opportunity.title,
          opportunity.category,
          viewDuration
        );
      }
    };
  }, [hasTrackedView, user, opportunity, trackOpportunityView, viewStartTime]);

  const handleSave = async () => {
    setIsSaved(true);
    
    // Track save action
    if (user) {
      await trackOpportunitySave(
        opportunity.id,
        opportunity.title,
        opportunity.category,
        'user_initiated' // Save reason
      );
    }
    
    onSave?.();
  };

  const handleApply = async () => {
    // Track application start
    if (user) {
      await trackOpportunityApplication(
        opportunity.id,
        opportunity.title,
        opportunity.category,
        'started'
      );
    }
    
    onApply?.();
    
    // In a real implementation, you might track completion later
    // when the user actually submits the application
  };

  const handleIgnore = async (reason?: string) => {
    // Track ignore action with reason
    if (user) {
      await trackOpportunityIgnore(
        opportunity.id,
        opportunity.title,
        opportunity.category,
        reason || 'not_interested'
      );
    }
    
    onIgnore?.();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'medium':
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'hard':
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{opportunity.title}</h1>
            <p className="text-primary-100 text-lg">{opportunity.organization}</p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(opportunity.difficulty)}`}>
              {opportunity.difficulty}
            </span>
            {opportunity.match > 0 && (
              <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                <Star className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">{opportunity.match}% Match</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-primary-100">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            <span>{opportunity.deadline}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            <span>{opportunity.location}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            <span>{opportunity.applicants} applicants</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleApply}
            className="flex-1 min-w-32 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Apply Now
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isSaved
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            {isSaved ? 'Saved ✓' : 'Save for Later'}
          </button>
          
          <button
            onClick={() => handleIgnore('not_relevant')}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition-colors"
          >
            Not Interested
          </button>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About This Opportunity</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {opportunity.description}
          </p>
        </div>

        {/* Requirements */}
        {opportunity.requirements.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Requirements
            </h2>
            <ul className="space-y-2">
              {opportunity.requirements.map((requirement, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span className="text-gray-600 dark:text-gray-300">{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefits */}
        {opportunity.benefits.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Benefits</h2>
            <ul className="space-y-2">
              {opportunity.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-accent-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span className="text-gray-600 dark:text-gray-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Application Process */}
        {opportunity.applicationProcess.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Application Process</h2>
            <ol className="space-y-2">
              {opportunity.applicationProcess.map((step, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Skills */}
        {opportunity.skills && opportunity.skills.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Relevant Skills</h2>
            <div className="flex flex-wrap gap-2">
              {opportunity.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Success Rate */}
        {opportunity.successRate !== 'N/A' && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Success Rate</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {opportunity.successRate} of applicants are typically accepted for this opportunity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}