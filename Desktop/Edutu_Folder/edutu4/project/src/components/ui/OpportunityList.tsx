import React from 'react';
import { Loader2, Search } from 'lucide-react';
import OpportunityCard from './OpportunityCard';
import { OpportunityCardSkeleton, EmptyState } from './LoadingStates';
import { OpportunityData } from '../../hooks/useOpportunities';
import Button from './Button';

interface OpportunityListProps {
  opportunities: OpportunityData[];
  loading: boolean;
  error?: string | null;
  onOpportunityClick: (opportunity: OpportunityData) => void;
  onRoadmapClick?: (opportunity: OpportunityData) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchTerm?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  compact?: boolean;
  showLoadMore?: boolean;
  className?: string;
}

const OpportunityList: React.FC<OpportunityListProps> = ({
  opportunities,
  loading,
  error,
  onOpportunityClick,
  onRoadmapClick,
  onLoadMore,
  hasMore = false,
  searchTerm = '',
  emptyTitle,
  emptyMessage,
  compact = false,
  showLoadMore = true,
  className = ''
}) => {
  const getEmptyStateProps = () => {
    if (searchTerm.trim()) {
      return {
        title: emptyTitle || 'No search results',
        message: emptyMessage || 'Try adjusting your search terms or filters'
      };
    }
    return {
      title: emptyTitle || 'No opportunities found',
      message: emptyMessage || 'Check back later for new opportunities'
    };
  };

  if (loading && opportunities.length === 0) {
    return (
      <div className={`space-y-3 sm:space-y-4 ${className}`} role="status" aria-label="Loading opportunities">
        {Array.from({ length: compact ? 3 : 6 }).map((_, index) => (
          <OpportunityCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (error && opportunities.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-primary mb-2">Connection Error</h3>
        <p className="text-secondary mb-4">{error}</p>
        <Button variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (opportunities.length === 0) {
    const { title, message } = getEmptyStateProps();
    return (
      <div className={className}>
        <EmptyState
          icon={<Search className="h-10 w-10 sm:h-12 sm:w-12" />}
          title={title}
          message={message}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Opportunities Grid */}
      <div className="space-y-3 sm:space-y-4" role="list" aria-label="Available opportunities">
        {opportunities.map((opportunity, index) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            onClick={onOpportunityClick}
            onRoadmapClick={onRoadmapClick}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
            compact={compact}
          />
        ))}
      </div>

      {/* Load More Button */}
      {showLoadMore && !loading && hasMore && onLoadMore && !searchTerm.trim() && (
        <div className="mt-8 text-center">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            disabled={loading}
            className="btn-touch px-6 py-3"
          >
            Load More Opportunities
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {loading && opportunities.length > 0 && (
        <div className="mt-6 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-primary mr-2" />
          <span className="text-sm text-secondary">Loading more opportunities...</span>
        </div>
      )}

      {/* Error while loading more */}
      {error && opportunities.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="text-red-500">⚠️</div>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">Loading Error</h4>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityList;