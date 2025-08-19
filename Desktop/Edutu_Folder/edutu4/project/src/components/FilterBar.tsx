import React from 'react';
import { SlidersHorizontal, X, Filter } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

interface FilterBarProps {
  categories: string[];
  locations: string[];
  selectedCategory: string;
  selectedLocation: string;
  onCategoryChange: (category: string) => void;
  onLocationChange: (location: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  locations,
  selectedCategory,
  selectedLocation,
  onCategoryChange,
  onLocationChange,
  showFilters,
  onToggleFilters
}) => {
  const { isDarkMode } = useDarkMode();

  const activeFiltersCount = [
    selectedCategory !== 'All' ? 1 : 0,
    selectedLocation !== 'All' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const clearAllFilters = () => {
    onCategoryChange('All');
    onLocationChange('All');
  };

  return (
    <div className="space-y-4">
      {/* Filter Toggle & Active Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Toggle Button */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
            showFilters
              ? 'bg-primary text-white border-primary shadow-md'
              : isDarkMode
              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="font-medium">Filters</span>
          {activeFiltersCount > 0 && (
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              showFilters 
                ? 'bg-white/20 text-white' 
                : 'bg-primary text-white'
            }`}>
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Quick Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.slice(0, 6).map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-md transform scale-105'
                  : isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Clear All Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategory !== 'All' && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm border border-blue-200 dark:border-blue-700">
              <Filter className="w-3 h-3" />
              <span>Category: {selectedCategory}</span>
              <button
                onClick={() => onCategoryChange('All')}
                className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {selectedLocation !== 'All' && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full text-sm border border-green-200 dark:border-green-700">
              <Filter className="w-3 h-3" />
              <span>Location: {selectedLocation}</span>
              <button
                onClick={() => onLocationChange('All')}
                className="hover:bg-green-100 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detailed Filters Panel */}
      {showFilters && (
        <div className={`p-6 rounded-xl border transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } shadow-lg`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                Category
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => onCategoryChange(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-white shadow-md'
                        : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category}</span>
                      {selectedCategory === category && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                Location
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {locations.map(location => (
                  <button
                    key={location}
                    onClick={() => onLocationChange(location)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedLocation === location
                        ? 'bg-primary text-white shadow-md'
                        : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{location}</span>
                      {selectedLocation === location && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={clearAllFilters}
              className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
              } transition-colors`}
            >
              Clear all filters
            </button>
            <button
              onClick={onToggleFilters}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;