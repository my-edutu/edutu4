import React from 'react';
import { Star, Calendar, MapPin, ChevronRight, Brain, Zap, ExternalLink } from 'lucide-react';
import Button from './Button';
import { useDarkMode } from '../../hooks/useDarkMode';
import { OpportunityData } from '../../hooks/useOpportunities';

interface OpportunityCardProps {
  opportunity: OpportunityData;
  onClick: (opportunity: OpportunityData) => void;
  className?: string;
  showProvider?: boolean;
  showSuccessRate?: boolean;
  compact?: boolean;
  style?: React.CSSProperties;
  onRoadmapClick?: (opportunity: OpportunityData) => void;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  onClick,
  className = '',
  showProvider = true,
  showSuccessRate = true,
  compact = false,
  style,
  onRoadmapClick
}) => {
  const { isDarkMode } = useDarkMode();

  const handleClick = () => {
    onClick(opportunity);
  };

  const handleRoadmapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRoadmapClick?.(opportunity);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (opportunity.link) {
      window.open(opportunity.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(opportunity);
    }
  };

  const formatDeadline = (deadline: string) => {
    try {
      const date = new Date(deadline);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Expired';
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays <= 7) return `${diffDays} days`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return deadline;
    }
  };

  const getDeadlineColor = (deadline: string) => {
    try {
      const date = new Date(deadline);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'text-red-500';
      if (diffDays <= 3) return 'text-orange-500';
      if (diffDays <= 7) return 'text-yellow-600';
      return 'text-gray-500 dark:text-gray-400';
    } catch {
      return 'text-gray-500 dark:text-gray-400';
    }
  };

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${opportunity.title} from ${opportunity.provider}. Match score: ${opportunity.match}%. Apply or get roadmap.`}
      style={style}
    >
      {/* AI Match Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
          <Brain className="w-3 h-3" />
          <span>{opportunity.match}% AI Match</span>
        </div>
      </div>

      {/* Opportunity Image/Icon */}
      <div className="relative h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
        {opportunity.imageUrl ? (
          <img 
            src={opportunity.imageUrl} 
            alt={opportunity.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {opportunity.provider?.[0] || opportunity.title[0]}
            </div>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
            {opportunity.title}
          </h3>
          {showProvider && (
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {opportunity.provider}
            </p>
          )}
        </div>

        {/* Category Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
            {opportunity.category}
          </span>
          {opportunity.tags && opportunity.tags.slice(0, 1).map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {tag}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {opportunity.summary.length > 120 
            ? `${opportunity.summary.substring(0, 120)}...` 
            : opportunity.summary}
        </p>

        {/* Meta Information */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 ${getDeadlineColor(opportunity.deadline)}`}>
              <Calendar className="w-3 h-3" />
              <span className="font-medium">{formatDeadline(opportunity.deadline)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>{opportunity.location || 'Global'}</span>
            </div>
          </div>
          {showSuccessRate && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Zap className="w-3 h-3" />
              <span className="font-medium">{opportunity.successRate}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleRoadmapClick}
            icon={<Brain className="w-3 h-3" />}
          >
            Get Roadmap
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleApplyClick}
            icon={<ExternalLink className="w-3 h-3" />}
          >
            Apply Now
          </Button>
        </div>
      </div>

      {/* Hover Effect Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </div>
  );
};

export default OpportunityCard;