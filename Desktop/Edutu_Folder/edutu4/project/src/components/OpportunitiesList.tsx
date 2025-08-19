import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, Grid, List, ArrowLeft, Sparkles, TrendingUp } from 'lucide-react';
import OpportunityCard from './ui/OpportunityCard';
import FilterBar from './FilterBar';
import Button from './ui/Button';
import { useDarkMode } from '../hooks/useDarkMode';
import { OpportunityData } from '../hooks/useOpportunities';

interface OpportunitiesListProps {
  opportunities: OpportunityData[];
  loading?: boolean;
  error?: string | null;
  onOpportunityClick: (opportunity: OpportunityData) => void;
  onRoadmapClick?: (opportunity: OpportunityData) => void;
  onBack?: () => void;
  title?: string;
  showHeader?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'match' | 'deadline' | 'recent' | 'alphabetical';

const OpportunitiesList: React.FC<OpportunitiesListProps> = ({
  opportunities,
  loading = false,
  error = null,
  onOpportunityClick,
  onRoadmapClick,
  onBack,
  title = 'Opportunities',
  showHeader = true
}) => {
  const { isDarkMode } = useDarkMode();
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique categories and locations
  const categories = useMemo(() => {
    const cats = ['All', ...Array.from(new Set(opportunities.map(opp => opp.category).filter(Boolean)))];
    return cats;
  }, [opportunities]);

  const locations = useMemo(() => {
    const locs = ['All', ...Array.from(new Set(opportunities.map(opp => opp.location).filter(Boolean)))];
    return locs;
  }, [opportunities]);

  // Filter and sort opportunities
  const filteredAndSortedOpportunities = useMemo(() => {
    let filtered = opportunities.filter(opp => {
      const matchesSearch = !searchTerm || 
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.provider?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || opp.category === selectedCategory;
      const matchesLocation = selectedLocation === 'All' || opp.location === selectedLocation;
      
      return matchesSearch && matchesCategory && matchesLocation;
    });

    // Sort opportunities
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'match':
          return (b.match || 0) - (a.match || 0);
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'recent':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [opportunities, searchTerm, selectedCategory, selectedLocation, sortBy]);

  // Shimmer loading placeholders
  const renderShimmerCards = () => (
    <div className={viewMode === 'grid' 
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
      : 'space-y-4'
    }>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse"
        >
          <div className="h-32 bg-gray-200 dark:bg-gray-700" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && opportunities.length === 0) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {showHeader && (
            <div className="flex items-center gap-4 mb-6">
              {onBack && (
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
            </div>
          )}
          {renderShimmerCards()}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Something went wrong
            </h2>
            <p className={`text-gray-600 dark:text-gray-400 mb-6`}>
              {error}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        {showHeader && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </h1>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  {filteredAndSortedOpportunities.length} opportunities found
                </p>
              </div>
            </div>
            
            {/* View Mode & Sort Controls */}
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
              >
                <option value="match">Best Match</option>
                <option value="deadline">Deadline</option>
                <option value="recent">Recent</option>
                <option value="alphabetical">A-Z</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
            />
          </div>

          {/* Filter Bar */}
          <FilterBar
            categories={categories}
            locations={locations}
            selectedCategory={selectedCategory}
            selectedLocation={selectedLocation}
            onCategoryChange={setSelectedCategory}
            onLocationChange={setSelectedLocation}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* AI Insights Banner */}
        {!loading && filteredAndSortedOpportunities.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  AI-Powered Matching
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  These opportunities are ranked by AI based on your profile and preferences
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {Math.round(filteredAndSortedOpportunities.reduce((acc, opp) => acc + (opp.match || 0), 0) / filteredAndSortedOpportunities.length)}% avg match
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Grid/List */}
        {filteredAndSortedOpportunities.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              No opportunities found
            </h2>
            <p className={`text-gray-600 dark:text-gray-400 mb-6`}>
              Try adjusting your search terms or filters
            </p>
            <Button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedLocation('All');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredAndSortedOpportunities.map((opportunity, index) => (
              <div
                key={opportunity.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <OpportunityCard
                  opportunity={opportunity}
                  onClick={onOpportunityClick}
                  onRoadmapClick={onRoadmapClick}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        )}

        {loading && opportunities.length > 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading more opportunities...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunitiesList;