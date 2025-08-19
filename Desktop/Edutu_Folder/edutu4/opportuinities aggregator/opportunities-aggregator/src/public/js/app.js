/**
 * Main Application Logic for Edutu Opportunities Aggregator UI
 */

class OpportunitiesApp {
    constructor() {
        this.currentPage = 1;
        this.currentQuery = '';
        this.currentLimit = 10;
        this.isLoading = false;
        this.searchHistory = Storage.get('searchHistory', []);
        this.lastSearchTime = null;
        
        // Initialize app when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Edutu Opportunities Aggregator...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Check for URL parameters to auto-search
        this.checkURLParams();
        
        console.log('Application initialized successfully!');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Search form submission
        const searchForm = DOM.get('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        // Real-time search input (debounced)
        const searchInput = DOM.get('search-topic');
        if (searchInput) {
            const debouncedSearch = debounce(() => {
                const value = searchInput.value.trim();
                if (value.length > 2 && value !== this.currentQuery) {
                    // Auto-search after user stops typing for 1 second
                    // this.performSearch();
                }
            }, 1000);
            
            searchInput.addEventListener('input', debouncedSearch);
            
            // Enter key should trigger immediate search
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }

        // Results limit change
        const resultsLimit = DOM.get('results-limit');
        if (resultsLimit) {
            resultsLimit.addEventListener('change', () => {
                this.currentLimit = parseInt(resultsLimit.value) || 10;
                if (this.currentQuery) {
                    this.performSearch(1); // Reset to first page with new limit
                }
            });
        }

        // Force refresh checkbox
        const forceRefresh = DOM.get('force-refresh');
        if (forceRefresh) {
            forceRefresh.addEventListener('change', () => {
                if (forceRefresh.checked && this.currentQuery) {
                    this.performSearch();
                }
            });
        }

        // Error alert close button
        const errorAlert = DOM.get('error-alert');
        if (errorAlert) {
            errorAlert.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-close')) {
                    UIState.hideError();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = DOM.get('search-topic');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            // Save search history
            Storage.set('searchHistory', this.searchHistory);
        });
    }

    /**
     * Load initial dashboard data
     */
    async loadInitialData() {
        try {
            console.log('Loading initial dashboard data...');
            
            // Test API connection first
            const connectionTest = await api.testConnection();
            
            if (connectionTest.success) {
                UIState.updateStatus(connectionTest.status, 
                    `${connectionTest.status} (${connectionTest.responseTime}ms)`);
                
                // Load dashboard stats
                const dashboardData = await api.getDashboardData();
                this.updateDashboardStats(dashboardData);
                
                // Show stats section
                DOM.show('stats-section');
                
            } else {
                UIState.updateStatus('unhealthy', 'Offline');
                console.error('API connection failed:', connectionTest.error);
                UIState.showError(`API connection failed: ${connectionTest.error}`);
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            UIState.updateStatus('unhealthy', 'Error');
            UIState.showError(`Failed to load dashboard data: ${error.message}`);
        }
    }

    /**
     * Update dashboard statistics
     */
    updateDashboardStats(data) {
        try {
            // Health data
            if (data.health && data.health.services) {
                const cache = data.health.services.enhancedCache || {};
                DOM.setText('cache-entries', Format.number(cache.entries || 0));
                DOM.setText('cache-hit-rate', Format.percentage(cache.hitRate || 0));
                
                // Update footer info
                DOM.setText('footer-uptime', Format.duration(data.health.uptime || 0));
                DOM.setText('footer-version', data.health.version || '2.0.0');
                DOM.setText('footer-api-status', data.health.status || 'Unknown');
            }

            // Metrics data
            if (data.metrics && data.metrics.data) {
                const metrics = data.metrics.data;
                DOM.setText('avg-response-time', Format.milliseconds(metrics.avgResponseTime || 0));
                DOM.setText('total-requests', Format.number(metrics.totalRequests || 0));
            }

            // Log any errors
            if (data.errors && data.errors.length > 0) {
                console.warn('Dashboard data errors:', data.errors);
            }
            
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    /**
     * Check URL parameters for auto-search
     */
    checkURLParams() {
        const params = URLParams.getAll();
        
        if (params.topic) {
            const searchInput = DOM.get('search-topic');
            if (searchInput) {
                searchInput.value = params.topic;
            }
            
            if (params.limit) {
                const limitSelect = DOM.get('results-limit');
                if (limitSelect) {
                    limitSelect.value = params.limit;
                    this.currentLimit = parseInt(params.limit) || 10;
                }
            }
            
            // Auto-perform search
            setTimeout(() => this.performSearch(), 500);
        }
    }

    /**
     * Perform search with current form values
     */
    async performSearch(page = 1) {
        if (this.isLoading) {
            console.log('Search already in progress, ignoring...');
            return;
        }

        const searchInput = DOM.get('search-topic');
        const resultsLimit = DOM.get('results-limit');
        const forceRefresh = DOM.get('force-refresh');

        if (!searchInput) {
            UIState.showError('Search form not found');
            return;
        }

        const topic = searchInput.value.trim();
        
        if (!topic) {
            UIState.showError('Please enter a search topic');
            searchInput.focus();
            return;
        }

        // Update current search state
        this.currentQuery = topic;
        this.currentPage = page;
        this.currentLimit = parseInt(resultsLimit?.value || '10');
        this.isLoading = true;

        // Update URL parameters
        URLParams.set('topic', topic);
        URLParams.set('limit', this.currentLimit.toString());
        
        if (page > 1) {
            URLParams.set('page', page.toString());
        } else {
            URLParams.remove('page');
        }

        // Show loading state
        UIState.showLoading();

        try {
            console.log(`Searching for "${topic}" (page ${page}, limit ${this.currentLimit})`);
            
            const searchParams = {
                topic: topic,
                limit: this.currentLimit,
                page: page,
                refresh: forceRefresh?.checked || false
            };

            const startTime = Date.now();
            const response = await api.searchOpportunities(searchParams);
            const searchTime = Date.now() - startTime;
            
            console.log(`Search completed in ${searchTime}ms`);
            
            if (response.success && response.data) {
                this.displayResults(response.data, topic, searchTime);
                this.addToSearchHistory(topic);
                
                // Reset force refresh
                if (forceRefresh) {
                    forceRefresh.checked = false;
                }
                
            } else {
                throw new Error(response.error || 'Search failed - no data received');
            }
            
        } catch (error) {
            console.error('Search failed:', error);
            UIState.showError(`Search failed: ${error.message}`);
        } finally {
            this.isLoading = false;
            this.lastSearchTime = Date.now();
        }
    }

    /**
     * Display search results
     */
    displayResults(data, query, searchTime) {
        const container = DOM.get('results-container');
        const countElement = DOM.get('results-count');
        
        if (!container) {
            console.error('Results container not found');
            return;
        }

        const opportunities = data.opportunities || [];
        const metadata = data.metadata || {};
        
        // Update results count
        if (countElement) {
            countElement.textContent = Format.number(opportunities.length);
        }

        // Clear previous results
        container.innerHTML = '';

        if (opportunities.length === 0) {
            this.displayEmptyState(container, query);
            UIState.showResults();
            return;
        }

        // Display results
        opportunities.forEach((opportunity, index) => {
            const resultCard = this.createOpportunityCard(opportunity, index);
            container.appendChild(resultCard);
        });

        // Generate pagination if needed
        this.generatePagination(metadata);

        // Display search metadata
        this.displaySearchMetadata(metadata, searchTime);

        // Show results section
        UIState.showResults();

        // Scroll to results
        setTimeout(() => {
            const resultsSection = DOM.get('results-section');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }

    /**
     * Create opportunity card HTML element
     */
    createOpportunityCard(opportunity, index) {
        const card = document.createElement('div');
        card.className = 'card mb-3 opportunity-card';
        card.style.animationDelay = `${index * 0.1}s`;

        const title = opportunity.title || 'Untitled Opportunity';
        const snippet = opportunity.snippet || 'No description available';
        const url = opportunity.link || '#';
        const domain = Format.domain(url);

        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title mb-0">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="opportunity-title">
                            ${this.escapeHtml(title)}
                            <i class="fas fa-external-link-alt ms-1" style="font-size: 0.75em;"></i>
                        </a>
                    </h5>
                    ${domain ? `<span class="source-badge">${this.escapeHtml(domain)}</span>` : ''}
                </div>
                
                <p class="opportunity-snippet text-truncate-3">
                    ${this.escapeHtml(snippet)}
                </p>
                
                <div class="opportunity-meta d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        <i class="fas fa-link me-1"></i>
                        ${this.escapeHtml(domain || 'Unknown source')}
                    </small>
                    <small class="text-muted">
                        Result #${index + 1 + (this.currentPage - 1) * this.currentLimit}
                    </small>
                </div>
            </div>
        `;

        // Add click tracking
        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'A') {
                const link = card.querySelector('a.opportunity-title');
                if (link) {
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                }
            }
        });

        return card;
    }

    /**
     * Display empty state when no results found
     */
    displayEmptyState(container, query) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>No opportunities found</h4>
                <p class="text-muted">
                    No results found for "<strong>${this.escapeHtml(query)}</strong>". 
                    Try different keywords or check your spelling.
                </p>
                <div class="mt-3">
                    <small class="text-muted">
                        Suggestions:
                        <div class="quick-suggestions mt-2">
                            <span class="suggestion-tag" onclick="document.getElementById('search-topic').value='scholarship'; app.performSearch()">scholarship</span>
                            <span class="suggestion-tag" onclick="document.getElementById('search-topic').value='internship'; app.performSearch()">internship</span>
                            <span class="suggestion-tag" onclick="document.getElementById('search-topic').value='fellowship'; app.performSearch()">fellowship</span>
                            <span class="suggestion-tag" onclick="document.getElementById('search-topic').value='grants'; app.performSearch()">grants</span>
                            <span class="suggestion-tag" onclick="document.getElementById('search-topic').value='jobs'; app.performSearch()">jobs</span>
                        </div>
                    </small>
                </div>
            </div>
        `;
    }

    /**
     * Generate pagination controls
     */
    generatePagination(metadata) {
        const container = DOM.get('pagination-container');
        if (!container) return;

        const currentPage = metadata.currentPage || this.currentPage;
        const totalPages = Math.ceil((metadata.totalResults || 0) / this.currentLimit);

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        const pagination = container.querySelector('.pagination');
        if (!pagination) return;

        pagination.innerHTML = '';

        // Previous button
        const prevItem = document.createElement('li');
        prevItem.className = `page-item ${currentPage <= 1 ? 'disabled' : ''}`;
        prevItem.innerHTML = `
            <a class="page-link" href="#" ${currentPage > 1 ? `onclick="app.performSearch(${currentPage - 1})"` : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </a>
        `;
        pagination.appendChild(prevItem);

        // Page numbers (show max 5 pages)
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageItem.innerHTML = `
                <a class="page-link" href="#" onclick="app.performSearch(${i})">${i}</a>
            `;
            pagination.appendChild(pageItem);
        }

        // Next button
        const nextItem = document.createElement('li');
        nextItem.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
        nextItem.innerHTML = `
            <a class="page-link" href="#" ${currentPage < totalPages ? `onclick="app.performSearch(${currentPage + 1})"` : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </a>
        `;
        pagination.appendChild(nextItem);

        container.style.display = 'block';
    }

    /**
     * Display search metadata
     */
    displaySearchMetadata(metadata, searchTime) {
        console.log('Search metadata:', {
            ...metadata,
            searchTime: `${searchTime}ms`,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Add search to history
     */
    addToSearchHistory(query) {
        // Remove if exists
        this.searchHistory = this.searchHistory.filter(item => item.query !== query);
        
        // Add to beginning
        this.searchHistory.unshift({
            query: query,
            timestamp: Date.now()
        });
        
        // Keep only last 10 searches
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        // Save to localStorage
        Storage.set('searchHistory', this.searchHistory);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        try {
            const dashboardData = await api.getDashboardData();
            this.updateDashboardStats(dashboardData);
            console.log('Dashboard data refreshed');
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
        }
    }
}

// Initialize the application
const app = new OpportunitiesApp();

// Make app globally available for debugging and inline event handlers
if (typeof window !== 'undefined') {
    window.app = app;
}

// Auto-refresh dashboard data every 30 seconds
setInterval(() => {
    if (!app.isLoading) {
        app.refreshDashboard();
    }
}, 30000);

console.log('🚀 Edutu Opportunities Aggregator UI loaded successfully!');