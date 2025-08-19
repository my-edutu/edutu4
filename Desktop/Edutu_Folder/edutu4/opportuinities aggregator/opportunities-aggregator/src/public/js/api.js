/**
 * API Integration Layer for Edutu Opportunities Aggregator
 * Handles all communication with the backend API
 */

class OpportunitiesAPI {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.endpoints = {
            opportunities: '/api/opportunities',
            health: '/api/health',
            metrics: '/api/metrics',
            cache: '/api/opportunities/cache/stats',
            config: '/api/opportunities/config'
        };
        this.requestId = 0;
    }

    /**
     * Generate unique request ID for tracking
     */
    getRequestId() {
        return ++this.requestId;
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async fetchWithErrorHandling(url, options = {}) {
        const requestId = this.getRequestId();
        console.log(`[API-${requestId}] Making request to: ${url}`);
        
        const startTime = Date.now();
        
        try {
            const defaultHeaders = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            const config = {
                ...options,
                headers: { ...defaultHeaders, ...options.headers }
            };

            const response = await fetch(url, config);
            const responseTime = Date.now() - startTime;
            
            console.log(`[API-${requestId}] Response received in ${responseTime}ms - Status: ${response.status}`);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // If can't parse error as JSON, use status text
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log(`[API-${requestId}] Success:`, data.success ? 'true' : 'false');
            
            return data;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.error(`[API-${requestId}] Error after ${responseTime}ms:`, error.message);
            throw error;
        }
    }

    /**
     * Search for opportunities
     */
    async searchOpportunities(params = {}) {
        const {
            topic = '',
            limit = 10,
            page = 1,
            sites = '',
            refresh = false
        } = params;

        if (!topic.trim()) {
            throw new Error('Search topic is required');
        }

        const queryParams = new URLSearchParams({
            topic: topic.trim(),
            limit: Math.min(Math.max(parseInt(limit) || 10, 1), 50).toString(),
            page: Math.max(parseInt(page) || 1, 1).toString()
        });

        if (sites && sites.trim()) {
            queryParams.append('sites', sites.trim());
        }

        if (refresh) {
            queryParams.append('refresh', 'true');
        }

        const url = `${this.baseURL}${this.endpoints.opportunities}?${queryParams}`;
        return await this.fetchWithErrorHandling(url);
    }

    /**
     * Get service health status
     */
    async getHealthStatus() {
        const url = `${this.baseURL}${this.endpoints.health}`;
        return await this.fetchWithErrorHandling(url);
    }

    /**
     * Get performance metrics
     */
    async getMetrics() {
        const url = `${this.baseURL}${this.endpoints.metrics}`;
        return await this.fetchWithErrorHandling(url);
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        const url = `${this.baseURL}${this.endpoints.cache}`;
        return await this.fetchWithErrorHandling(url);
    }

    /**
     * Get service configuration
     */
    async getConfig() {
        const url = `${this.baseURL}${this.endpoints.config}`;
        return await this.fetchWithErrorHandling(url);
    }

    /**
     * Clear cache
     */
    async clearCache() {
        const url = `${this.baseURL}${this.endpoints.cache}`;
        return await this.fetchWithErrorHandling(url, {
            method: 'DELETE'
        });
    }

    /**
     * Reset metrics
     */
    async resetMetrics() {
        const url = `${this.baseURL}${this.endpoints.metrics}`;
        return await this.fetchWithErrorHandling(url, {
            method: 'DELETE'
        });
    }

    /**
     * Get basic API info
     */
    async getApiInfo() {
        const url = `${this.baseURL}/api`;
        return await this.fetchWithErrorHandling(url);
    }

    /**
     * Batch request for dashboard data
     */
    async getDashboardData() {
        console.log('[API] Loading dashboard data...');
        
        try {
            // Run requests in parallel for better performance
            const [health, metrics, cache] = await Promise.allSettled([
                this.getHealthStatus(),
                this.getMetrics(),
                this.getCacheStats()
            ]);

            const result = {
                health: null,
                metrics: null,
                cache: null,
                errors: []
            };

            // Process health data
            if (health.status === 'fulfilled') {
                result.health = health.value;
            } else {
                console.warn('[API] Health check failed:', health.reason.message);
                result.errors.push(`Health: ${health.reason.message}`);
            }

            // Process metrics data
            if (metrics.status === 'fulfilled') {
                result.metrics = metrics.value;
            } else {
                console.warn('[API] Metrics failed:', metrics.reason.message);
                result.errors.push(`Metrics: ${metrics.reason.message}`);
            }

            // Process cache data
            if (cache.status === 'fulfilled') {
                result.cache = cache.value;
            } else {
                console.warn('[API] Cache stats failed:', cache.reason.message);
                result.errors.push(`Cache: ${cache.reason.message}`);
            }

            return result;
        } catch (error) {
            console.error('[API] Dashboard data load failed:', error);
            throw new Error(`Failed to load dashboard data: ${error.message}`);
        }
    }

    /**
     * Test API connectivity
     */
    async testConnection() {
        try {
            const start = Date.now();
            const response = await this.getHealthStatus();
            const responseTime = Date.now() - start;
            
            return {
                success: true,
                responseTime,
                status: response.status || 'unknown',
                version: response.version || 'unknown'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                responseTime: null
            };
        }
    }
}

// Create global API instance
const api = new OpportunitiesAPI();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.OpportunitiesAPI = OpportunitiesAPI;
    window.api = api;
}

// Status constants for easy reference
const API_STATUS = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy'
};

// Export constants
if (typeof window !== 'undefined') {
    window.API_STATUS = API_STATUS;
}