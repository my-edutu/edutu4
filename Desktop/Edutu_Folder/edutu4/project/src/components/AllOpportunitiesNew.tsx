import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Star, Calendar, MapPin, Loader2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useOpportunities, OpportunityData } from '../hooks/useOpportunities';
import { LoadingSpinner, OpportunityCardSkeleton, EmptyState, ErrorState } from './ui/LoadingStates';
import ErrorBoundary from './ui/ErrorBoundary';
import OpportunityList from './ui/OpportunityList';

interface AllOpportunitiesProps {
  onBack: () => void;
  onSelectOpportunity: (opportunity: OpportunityData) => void;
}

const AllOpportunities: React.FC<AllOpportunitiesProps> = ({ onBack, onSelectOpportunity }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { isDarkMode } = useDarkMode();
  
  // Use the new opportunities hook
  const {
    opportunities,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    totalCount
  } = useOpportunities({
    pageSize: 20,
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    realTime: true
  });

  // Filter opportunities by search term (client-side for simplicity)
  const filteredOpportunities = searchTerm.trim() 
    ? opportunities.filter(opp => 
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.provider.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : opportunities;

  const categories = ['All', 'Scholarships', 'Leadership', 'Tech', 'Entrepreneurship', 'Global Programs', 'Research'];

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': case 'beginner': 
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'medium': case 'intermediate': 
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'hard': case 'advanced': 
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: 
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const handleLoadMore = async () => {
    await loadMore();
  };

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <div className={`min-h-screen surface-bg animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="background-bg sticky top-0 z-10 shadow-sm" role="banner">
        <div className="safe-area-x px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="btn-touch p-2 sm:p-3 flex-shrink-0"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary mb-1 truncate">
                All Opportunities
              </h1>
              <p className="text-xs sm:text-sm text-secondary line-clamp-2">
                {searchTerm.trim() 
                  ? (
                    <>
                      <span className="font-medium">{filteredOpportunities.length}</span> search results for{' '}
                      <span className="font-semibold text-primary">"{searchTerm}"</span>
                    </>
                  ) 
                  : (
                    <>
                      <span className="font-medium">{totalCount}</span> opportunities available{' '}
                      <span className="hidden sm:inline">• Real-time updates</span>
                    </>
                  )
                }
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
              className="btn-touch p-2 sm:p-3 flex-shrink-0"
              aria-label={loading ? 'Refreshing opportunities...' : 'Refresh opportunities'}
            >
              <RotateCcw size={16} className={`sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3 sm:mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={18} />
              <input
                type="search"
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-2xl background-bg text-primary placeholder-secondary text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                aria-label="Search opportunities"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-secondary flex-shrink-0" />
            <div className="relative flex-1">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl background-bg text-primary text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none bg-no-repeat bg-right"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
                aria-label="Filter opportunities by category"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'All' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="safe-area-x px-3 sm:px-4 py-4 sm:py-6" role="main">
        <OpportunityList
          opportunities={filteredOpportunities}
          loading={loading}
          error={error}
          onOpportunityClick={onSelectOpportunity}
          onLoadMore={handleLoadMore}
          hasMore={hasMore && !searchTerm.trim()}
          searchTerm={searchTerm}
          showLoadMore={true}
          compact={false}
        />
      </main>
    </div>
  );
};

// Wrap with ErrorBoundary for production resilience
const AllOpportunitiesWithErrorBoundary: React.FC<AllOpportunitiesProps> = (props) => (
  <ErrorBoundary>
    <AllOpportunities {...props} />
  </ErrorBoundary>
);

export default AllOpportunitiesWithErrorBoundary;