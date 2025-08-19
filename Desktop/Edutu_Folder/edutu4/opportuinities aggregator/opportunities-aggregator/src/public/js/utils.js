/**
 * Utility Functions for Edutu Opportunities Aggregator UI
 */

/**
 * DOM Utilities
 */
const DOM = {
    /**
     * Get element by ID with error checking
     */
    get(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * Set element text content safely
     */
    setText(id, text) {
        const element = this.get(id);
        if (element) {
            element.textContent = text || '-';
        }
    },

    /**
     * Set element HTML safely
     */
    setHTML(id, html) {
        const element = this.get(id);
        if (element) {
            element.innerHTML = html || '';
        }
    },

    /**
     * Show element
     */
    show(id) {
        const element = this.get(id);
        if (element) {
            element.style.display = '';
        }
    },

    /**
     * Hide element
     */
    hide(id) {
        const element = this.get(id);
        if (element) {
            element.style.display = 'none';
        }
    },

    /**
     * Toggle element visibility
     */
    toggle(id, show = null) {
        const element = this.get(id);
        if (element) {
            if (show === null) {
                element.style.display = element.style.display === 'none' ? '' : 'none';
            } else {
                element.style.display = show ? '' : 'none';
            }
        }
    },

    /**
     * Add CSS class
     */
    addClass(id, className) {
        const element = this.get(id);
        if (element) {
            element.classList.add(className);
        }
    },

    /**
     * Remove CSS class
     */
    removeClass(id, className) {
        const element = this.get(id);
        if (element) {
            element.classList.remove(className);
        }
    },

    /**
     * Toggle CSS class
     */
    toggleClass(id, className) {
        const element = this.get(id);
        if (element) {
            element.classList.toggle(className);
        }
    }
};

/**
 * Format Utilities
 */
const Format = {
    /**
     * Format number with commas
     */
    number(num) {
        if (num === null || num === undefined || isNaN(num)) {
            return '-';
        }
        return Number(num).toLocaleString();
    },

    /**
     * Format percentage
     */
    percentage(num, decimals = 1) {
        if (num === null || num === undefined || isNaN(num)) {
            return '-';
        }
        return `${Number(num).toFixed(decimals)}%`;
    },

    /**
     * Format file size
     */
    bytes(bytes, decimals = 2) {
        if (bytes === null || bytes === undefined || isNaN(bytes)) {
            return '-';
        }
        
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Format duration from seconds
     */
    duration(seconds) {
        if (seconds === null || seconds === undefined || isNaN(seconds)) {
            return '-';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },

    /**
     * Format milliseconds to readable time
     */
    milliseconds(ms) {
        if (ms === null || ms === undefined || isNaN(ms)) {
            return '-';
        }

        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        } else {
            return this.duration(ms / 1000);
        }
    },

    /**
     * Format date to readable string
     */
    date(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (error) {
            return dateString;
        }
    },

    /**
     * Format relative time (time ago)
     */
    timeAgo(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);

            const intervals = {
                year: 31536000,
                month: 2592000,
                week: 604800,
                day: 86400,
                hour: 3600,
                minute: 60
            };

            for (const [unit, seconds] of Object.entries(intervals)) {
                const interval = Math.floor(diffInSeconds / seconds);
                if (interval >= 1) {
                    return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
                }
            }

            return 'Just now';
        } catch (error) {
            return dateString;
        }
    },

    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    },

    /**
     * Extract domain from URL
     */
    domain(url) {
        if (!url) return '';
        
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (error) {
            return url;
        }
    }
};

/**
 * UI State Management
 */
const UIState = {
    /**
     * Show loading state
     */
    showLoading() {
        DOM.show('loading-indicator');
        DOM.hide('results-section');
        DOM.hide('error-alert');
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        DOM.hide('loading-indicator');
    },

    /**
     * Show error message
     */
    showError(message) {
        DOM.setText('error-message', message);
        DOM.show('error-alert');
        DOM.addClass('error-alert', 'show');
        this.hideLoading();
    },

    /**
     * Hide error message
     */
    hideError() {
        DOM.hide('error-alert');
        DOM.removeClass('error-alert', 'show');
    },

    /**
     * Show results section
     */
    showResults() {
        DOM.show('results-section');
        this.hideLoading();
        this.hideError();
    },

    /**
     * Update service status indicator
     */
    updateStatus(status, text) {
        const element = DOM.get('service-status');
        if (element) {
            // Remove existing status classes
            element.classList.remove('bg-success', 'bg-warning', 'bg-danger', 'bg-secondary');
            
            // Add appropriate class based on status
            switch (status) {
                case 'healthy':
                    element.classList.add('bg-success');
                    break;
                case 'degraded':
                    element.classList.add('bg-warning');
                    break;
                case 'unhealthy':
                    element.classList.add('bg-danger');
                    break;
                default:
                    element.classList.add('bg-secondary');
            }
            
            element.textContent = text || status || 'Unknown';
        }
    }
};

/**
 * Local Storage Utilities
 */
const Storage = {
    /**
     * Set item in localStorage with error handling
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    },

    /**
     * Get item from localStorage with error handling
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return defaultValue;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
            return false;
        }
    },

    /**
     * Clear all items from localStorage
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
            return false;
        }
    }
};

/**
 * Debounce utility for search input
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Simple event emitter for component communication
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for '${event}':`, error);
                }
            });
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

/**
 * URL parameter utilities
 */
const URLParams = {
    /**
     * Get URL parameter value
     */
    get(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    /**
     * Set URL parameter
     */
    set(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.replaceState({}, '', url);
    },

    /**
     * Remove URL parameter
     */
    remove(param) {
        const url = new URL(window.location);
        url.searchParams.delete(param);
        window.history.replaceState({}, '', url);
    },

    /**
     * Get all parameters as object
     */
    getAll() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        return params;
    }
};

// Global event emitter instance
const eventBus = new EventEmitter();

// Export utilities to global scope
if (typeof window !== 'undefined') {
    window.DOM = DOM;
    window.Format = Format;
    window.UIState = UIState;
    window.Storage = Storage;
    window.debounce = debounce;
    window.EventEmitter = EventEmitter;
    window.eventBus = eventBus;
    window.URLParams = URLParams;
}

// Console greeting
console.log('%c🎓 Edutu Opportunities Aggregator', 'color: #0d6efd; font-size: 16px; font-weight: bold;');
console.log('Utilities loaded successfully!');