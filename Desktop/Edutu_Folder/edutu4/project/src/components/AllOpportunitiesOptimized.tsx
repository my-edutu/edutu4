/**
 * Optimized AllOpportunities Component
 * Features: Enhanced responsive design, optimized API calls, better error handling, and improved UX
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Star, 
  Calendar, 
  MapPin, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Grid,
  List,
  SlidersHorizontal,
  X
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { optimizedApi } from '../services/optimizedApiService';
import { optimizedFirestore } from '../services/optimizedFirestoreService';
import { LoadingSpinner, OpportunityCardSkeleton, EmptyState, ErrorState } from './ui/LoadingStates';
import ErrorBoundary from './ui/ErrorBoundary';

interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: string;
  deadline: string;
  location: string;
  description: string;
  requirements: string[];
  benefits: string[];
  applicationProcess: string[];
  image: string;
  imageUrl?: string;
  match: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  applicants: string;
  successRate: string;
  link?: string;
  provider?: string;
  tags?: string[];
}

interface AllOpportunitiesProps {
  onBack: () => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
}

type ViewMode = 'grid' | 'list';

const AllOpportunitiesOptimized: React.FC<AllOpportunitiesProps> = ({ 
  onBack, 
  onSelectOpportunity 
}) => {
  const { isDarkMode } = useDarkMode();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  
  // Data state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [locations, setLocations] = useState<string[]>(['All']);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [retryCount, setRetryCount] = useState(0);
  
  const ITEMS_PER_PAGE = 20;

  // Debounce search term to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load opportunities with optimized API calls
  const loadOpportunities = useCallback(async (page: number = 1, resetData: boolean = true) => {
    try {
      if (resetData) {
        setLoading(true);
        setError(null);
      } else {
        setIsSearching(true);
      }

      const filters = {
        ...(selectedCategory !== 'All' && { category: selectedCategory }),
        ...(selectedLocation !== 'All' && { location: selectedLocation }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      };

      // Use optimized API with caching
      const response = await optimizedApi.fetchOpportunities(page, ITEMS_PER_PAGE, filters);
      
      if (resetData) {
        setOpportunities(response.opportunities);
      } else {
        setOpportunities(prev => [...prev, ...response.opportunities]);
      }
      
      setCurrentPage(page);
      setTotalCount(response.total);
      setTotalPages(Math.ceil(response.total / ITEMS_PER_PAGE));
      setHasMore(response.hasMore);
      setRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      console.error('Error loading opportunities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load opportunities');
      
      // Fallback to Firestore if API fails
      if (retryCount < 2) {
        try {
          const fallbackData = await optimizedFirestore.searchOpportunities({
            category: selectedCategory !== 'All' ? selectedCategory : undefined,
            location: selectedLocation !== 'All' ? selectedLocation : undefined,
            keywords: debouncedSearchTerm || undefined,
            page,
            limit: ITEMS_PER_PAGE
          });
          
          if (resetData) {
            setOpportunities(fallbackData.opportunities);
          } else {
            setOpportunities(prev => [...prev, ...fallbackData.opportunities]);
          }
          
          setHasMore(fallbackData.hasMore);
          setTotalCount(fallbackData.total);
          setError(null);
        } catch (fallbackError) {
          setError('Unable to load opportunities. Please check your connection.');
        }
      }
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [selectedCategory, selectedLocation, debouncedSearchTerm, retryCount]);

  // Load categories and locations
  const loadFilters = useCallback(async () => {
    try {
      // In a real implementation, these would come from API
      const mockCategories = [
        'All', 'Technology', 'Engineering', 'Business', 'Medicine', 
        'Arts', 'Science', 'Education', 'Leadership'
      ];
      
      const mockLocations = [
        'All', 'Global', 'USA', 'UK', 'Canada', 'Australia', 
        'Germany', 'Netherlands', 'Africa', 'Online'
      ];
      
      setCategories(mockCategories);
      setLocations(mockLocations);
    } catch (error) {
      // Use default filters if loading fails
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadFilters();
    loadOpportunities(1, true);
  }, [loadOpportunities, loadFilters]);

  // Handle search and filter changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return; // Wait for debounce
    
    setCurrentPage(1);
    loadOpportunities(1, true);
  }, [debouncedSearchTerm, selectedCategory, selectedLocation]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    loadOpportunities(newPage, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages, loadOpportunities]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadOpportunities(currentPage, true);
  }, [currentPage, loadOpportunities]);

  // Memoized filtered opportunities for client-side filtering
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => 
      (selectedCategory === 'All' || opp.category === selectedCategory) &&
      (selectedLocation === 'All' || opp.location === selectedLocation) &&
      (!debouncedSearchTerm || 
       opp.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
       opp.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
       opp.organization.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    );
  }, [opportunities, selectedCategory, selectedLocation, debouncedSearchTerm]);

  // Render opportunity card with responsive design
  const renderOpportunityCard = useCallback((opportunity: Opportunity) => (
    <Card
      key={opportunity.id}
      className={`h-full transition-all duration-200 hover:scale-105 cursor-pointer ${
        viewMode === 'list' ? 'flex flex-row p-4' : 'flex flex-col p-6'
      }`}
      onClick={() => onSelectOpportunity(opportunity)}
    >
      {/* Opportunity Image */}
      <div className={`${
        viewMode === 'list' ? 'w-24 h-24 flex-shrink-0 mr-4' : 'w-full h-32 mb-4'
      } rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900`}>
        {opportunity.imageUrl || opportunity.image ? (
          <img
            src={opportunity.imageUrl || opportunity.image}
            alt={opportunity.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Star className="w-8 h-8 text-primary opacity-50" />
          </div>
        )}
      </div>

      {/* Opportunity Content */}
      <div className={`${viewMode === 'list' ? 'flex-1' : 'flex-1 flex flex-col'}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} ${
            viewMode === 'list' ? 'text-lg' : 'text-xl'
          } line-clamp-2`}>
            {opportunity.title}
          </h3>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            opportunity.difficulty === 'Easy' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : opportunity.difficulty === 'Medium'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {opportunity.difficulty}
          </div>
        </div>

        {/* Organization and Category */}
        <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {opportunity.organization} • {opportunity.category}
        </p>

        {/* Description */}
        <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${
          viewMode === 'list' ? 'line-clamp-2' : 'line-clamp-3'
        } flex-1`}>
          {opportunity.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(opportunity.deadline).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{opportunity.location}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>{opportunity.match}% match</span>
          </div>
        </div>
      </div>
    </Card>
  ), [viewMode, isDarkMode, onSelectOpportunity]);

  if (loading && opportunities.length === 0) {
    return (
      <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-48 h-8 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          
          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <OpportunityCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && opportunities.length === 0) {
    return (
      <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to Load Opportunities"
            description={error}
            onRetry={handleRetry}
            actionLabel="Try Again"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              All Opportunities
            </h1>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
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
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

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
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {(selectedCategory !== 'All' || selectedLocation !== 'All') && (
                <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                  {[selectedCategory !== 'All' ? 1 : 0, selectedLocation !== 'All' ? 1 : 0].reduce((a, b) => a + b)}
                </span>
              )}
            </Button>

            {/* Active Filters */}
            <div className="flex flex-wrap gap-2">
              {selectedCategory !== 'All' && (
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                  Category: {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="hover:bg-primary/20 rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {selectedLocation !== 'All' && (
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                  Location: {selectedLocation}
                  <button
                    onClick={() => setSelectedLocation('All')}
                    className="hover:bg-primary/20 rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-w-48">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full p-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-48">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className={`w-full p-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                >
                  {locations.map(location => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className={`mb-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing {filteredOpportunities.length} of {totalCount} opportunities
          {debouncedSearchTerm && ` for "${debouncedSearchTerm}"`}
        </div>

        {/* Opportunities Grid/List */}
        {filteredOpportunities.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            description="Try adjusting your filters or search terms"
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setSelectedLocation('All');
            }}
          />
        ) : (
          <>
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {filteredOpportunities.map(renderOpportunityCard)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isSearching}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, currentPage - 2) + i;
                    if (page > totalPages) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-primary text-white'
                            : isDarkMode
                            ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isSearching}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Loading Overlay */}
        {isSearching && (
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <LoadingSpinner size="lg" />
              <p className="mt-2 text-center">Loading opportunities...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllOpportunitiesOptimized;