import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Star, Calendar, MapPin, Loader2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { fetchOpportunitiesFromAPI, searchOpportunitiesWithAPI, getOpportunityCategories } from '../services/apiService';
import { fetchScholarshipsPage, getScholarshipProviders, searchScholarships } from '../services/scholarshipService';
import { subscribeToPaginatedOpportunities, getPaginatedOpportunities, getOpportunityCategories as getFirestoreCategories } from '../services/opportunitiesService';
import { useOpportunities, OpportunityData } from '../hooks/useOpportunities';
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
  onGetRoadmap?: (opportunity: Opportunity) => void;
}

const AllOpportunities: React.FC<AllOpportunitiesProps> = ({ onBack, onSelectOpportunity, onGetRoadmap }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useAPI, setUseAPI] = useState(false); // Prioritize live Firestore data
  const [lastDocument, setLastDocument] = useState<any>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  
  const { isDarkMode } = useDarkMode();
  const PAGE_SIZE = 20;

  // Load a specific page with real-time updates
  const loadPage = async (pageNumber: number) => {
    setLoading(true);
    
    // Clean up previous subscription
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    
    try {
      // First check if we should use Firestore scholarships collection (live data)
      if (!useAPI) {
        // Use scholarships collection directly for live data
        const { fetchScholarshipsPage } = await import('../services/scholarshipService');
        
        const result = await fetchScholarshipsPage(PAGE_SIZE, pageNumber === 1 ? null : lastDocument, {
          category: selectedCategory === 'All' ? undefined : selectedCategory
        });
        
        setOpportunities(result.scholarships);
        setCurrentPage(pageNumber);
        setTotalCount(result.total);
        setTotalPages(Math.ceil(result.total / PAGE_SIZE));
        setHasMore(result.hasMore);
        setLastDocument(result.lastDoc);
        setLoading(false);
        
      } else {
        // Fallback to API-server
        const response = await fetchOpportunitiesFromAPI(
          pageNumber, 
          PAGE_SIZE, 
          {
            category: selectedCategory === 'All' ? undefined : selectedCategory
          }
        );
        
        setOpportunities(response.opportunities);
        setCurrentPage(pageNumber);
        setTotalCount(response.total);
        setTotalPages(Math.ceil(response.total / PAGE_SIZE));
        setHasMore(response.hasMore);
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Error loading page:', error);
      if (!useAPI) {
        console.warn('Firestore failed, trying API fallback');
        setUseAPI(true);
        await loadPage(pageNumber); // Retry with API
        return;
      }
      setLoading(false);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      if (searchTerm.trim()) {
        await handleSearch();
      } else {
        await loadPage(currentPage);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setCurrentPage(1);
      loadPage(1);
      return;
    }

    setIsSearching(true);
    
    try {
      // Use scholarships collection for search (live data)
      if (!useAPI) {
        const results = await searchScholarships(searchTerm, 100);
        setOpportunities(results);
        setTotalCount(results.length);
        setTotalPages(Math.ceil(results.length / PAGE_SIZE));
        setCurrentPage(1);
      } else {
        // Fallback to API search
        const response = await searchOpportunitiesWithAPI(searchTerm, 1, 100);
        setOpportunities(response.opportunities);
        setTotalCount(response.total);
        setTotalPages(Math.ceil(response.total / PAGE_SIZE));
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (!useAPI) {
        console.warn('Firestore search failed, trying API fallback');
        setUseAPI(true);
        const response = await searchOpportunitiesWithAPI(searchTerm, 1, 100);
        setOpportunities(response.opportunities);
        setTotalCount(response.total);
        setTotalPages(Math.ceil(response.total / PAGE_SIZE));
        setCurrentPage(1);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (!useAPI) {
          // Use Firestore scholarships collection categories (live data)
          const { getScholarshipProviders } = await import('../services/scholarshipService');
          const providers = await getScholarshipProviders();
          // For now, use providers as categories since scholarships might not have specific categories
          const derivedCategories = ['Scholarships', 'Fellowships', 'Grants', 'Competitions'];
          setCategories(['All', ...derivedCategories]);
        } else {
          // Fallback to API categories
          const apiCategories = await getOpportunityCategories();
          setCategories(['All', ...apiCategories]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories(['All', 'Scholarships', 'Leadership', 'Tech', 'Entrepreneurship', 'Global Programs']);
      }
    };
    
    loadCategories();
  }, [useAPI]);

  // Load initial page and handle category changes
  useEffect(() => {
    setCurrentPage(1);
    loadPage(1);
  }, [selectedCategory]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  // Handle search functionality with debounce
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setCurrentPage(1);
      loadPage(1);
      return;
    }

    const searchTimeout = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  // Pagination navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      if (searchTerm.trim()) {
        // For search results, slice the current results
        setCurrentPage(page);
      } else {
        // For regular pagination, load the page
        loadPage(page);
      }
      scrollToTop();
    }
  };

  const filteredOpportunities = searchTerm.trim() ? 
    opportunities.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : 
    opportunities;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);
    
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxPagesToShow - 1);
    
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
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
              size="md"
              icon={ArrowLeft}
              aria-label="Go back to dashboard"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary mb-1 truncate">
                All Opportunities
              </h1>
              <p className="text-xs sm:text-sm text-secondary line-clamp-2">
                {searchTerm.trim() 
                  ? (
                    <>
                      <span className="font-medium">{totalCount}</span> search results for{' '}
                      <span className="font-semibold text-primary">"{searchTerm}"</span>
                    </>
                  ) 
                  : (
                    <>
                      <span className="font-medium">{totalCount}</span> opportunities available{' '}
                      <span className="hidden sm:inline">•</span>{' '}
                      <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
                    </>
                  )
                }
                {!useAPI && (
                  <span className="inline-flex items-center px-1.5 py-0.5 ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                    Fallback Mode
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="md"
              icon={RotateCcw}
              aria-label={isRefreshing ? 'Refreshing opportunities...' : 'Refresh opportunities'}
            />
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
                className="w-full pl-10 pr-12 py-3 sm:py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-2xl background-bg text-primary placeholder-secondary text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                aria-label="Search opportunities"
                autoComplete="off"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="text-secondary animate-spin" size={16} />
                  <span className="sr-only">Searching...</span>
                </div>
              )}
            </div>
          </div>

          {/* Filter */}
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

      {/* Opportunities List */}
      <main className="safe-area-x px-3 sm:px-4 py-4 sm:py-6" role="main">
        {loading ? (
          <div className="space-y-3 sm:space-y-4" role="status" aria-label="Loading opportunities">
            {Array.from({ length: 6 }).map((_, index) => (
              <OpportunityCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <EmptyState
            icon={<Search className="h-10 w-10 sm:h-12 sm:w-12" />}
            title={searchTerm.trim() ? 'No search results' : 'No opportunities found'}
            message={searchTerm.trim() 
              ? 'Try adjusting your search terms or filters'
              : 'Check back later for new opportunities'
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4" role="list" aria-label="Available opportunities">
            {filteredOpportunities.map((opportunity, index) => (
              <Card
                key={opportunity.id}
                className="card-elevated p-3 sm:p-4 lg:p-5 hover:shadow-lg transition-all duration-200 cursor-pointer group animate-fade-in-up btn-touch"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onSelectOpportunity(opportunity)}
                role="listitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectOpportunity(opportunity);
                  }
                }}
                aria-label={`View details for ${opportunity.title} from ${opportunity.organization || opportunity.provider}`}
              >
                <div className="flex gap-3 sm:gap-4">
                  {/* Organization Avatar or Image */}
                  <div className="flex-shrink-0">
                    {opportunity.image || opportunity.imageUrl ? (
                      <img 
                        src={opportunity.image || opportunity.imageUrl} 
                        alt={opportunity.title}
                        className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-sm sm:text-base lg:text-lg shadow-md group-hover:scale-105 transition-transform ${opportunity.image || opportunity.imageUrl ? 'hidden' : ''}`}>
                      {opportunity.organization?.[0] || opportunity.provider?.[0] || opportunity.title[0]}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-primary text-sm sm:text-base lg:text-lg mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {opportunity.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-secondary mb-1 truncate">
                          {opportunity.organization || opportunity.provider}
                        </p>
                      </div>
                      
                      {/* Match Score */}
                      <div className="flex items-center gap-1 flex-shrink-0 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                        <Star className="text-yellow-500" size={12} aria-hidden="true" />
                        <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                          {opportunity.match}%
                        </span>
                        <span className="sr-only">match score</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-secondary line-clamp-2 mb-3 leading-relaxed">
                      {opportunity.description}
                    </p>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {/* Meta Information */}
                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-secondary">
                        <div className="flex items-center gap-1" title={`Deadline: ${opportunity.deadline}`}>
                          <Calendar size={12} aria-hidden="true" />
                          <span className="truncate max-w-24 sm:max-w-none">{opportunity.deadline}</span>
                        </div>
                        <div className="flex items-center gap-1" title={`Location: ${opportunity.location}`}>
                          <MapPin size={12} aria-hidden="true" />
                          <span className="truncate max-w-20 sm:max-w-none">{opportunity.location}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {onGetRoadmap && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGetRoadmap(opportunity);
                            }}
                          >
                            Get Roadmap
                          </Button>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(opportunity.difficulty)}`}>
                          {opportunity.difficulty}
                        </span>
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Enhanced Pagination */}
        {!loading && totalPages > 1 && (
          <nav className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700" role="navigation" aria-label="Opportunities pagination">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Previous Button */}
              <Button
                variant="secondary"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                size="md"
                icon={ChevronLeft}
                aria-label="Go to previous page"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              
              {/* Page Numbers - Responsive */}
              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                {/* Mobile: Show current page info */}
                <div className="sm:hidden bg-surface px-3 py-2 rounded-lg text-sm text-secondary">
                  Page {currentPage} of {totalPages}
                </div>
                
                {/* Desktop: Show page buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  {getPageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "primary" : "secondary"}
                      onClick={() => goToPage(page)}
                      size="sm"
                      aria-label={page === currentPage ? `Current page, page ${page}` : `Go to page ${page}`}
                      aria-current={page === currentPage ? 'page' : undefined}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Next Button */}
              <Button
                variant="secondary"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                size="md"
                icon={ChevronRight}
                aria-label="Go to next page"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
              </Button>
            </div>
            
            {/* Mobile: Additional pagination info */}
            <div className="sm:hidden mt-3 text-center text-xs text-secondary">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} opportunities
            </div>
          </nav>
        )}
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