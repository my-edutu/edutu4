# Edutu Integration Guide

This guide explains how to integrate the Opportunities Aggregator API with the main Edutu application.

## API Overview

The Opportunities Aggregator provides two sets of endpoints:

1. **Standard API** (`/api/opportunities`) - Full-featured with detailed parameters
2. **Edutu Integration API** (`/api/edutu`) - Simplified for easy integration

## Quick Integration (Recommended)

Use the simplified Edutu endpoints for easier integration:

### Base URL
```
http://localhost:3000/api/edutu
```

### Search Opportunities
```javascript
// GET /api/edutu/opportunities?q={query}&count={limit}
const searchOpportunities = async (query, count = 10) => {
  try {
    const response = await fetch(
      `http://localhost:3000/api/edutu/opportunities?q=${encodeURIComponent(query)}&count=${count}`
    );
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of opportunities
    } else {
      console.error('Search failed:', data.error);
      return [];
    }
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

// Usage examples
const scholarships = await searchOpportunities('scholarships', 20);
const internships = await searchOpportunities('internships in tech', 15);
```

### Get Available Categories
```javascript
// GET /api/edutu/categories
const getCategories = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/edutu/categories');
    const data = await response.json();
    return data.categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
};

// Returns: [{ id, name, description }, ...]
```

### Check Service Status
```javascript
// GET /api/edutu/status
const checkStatus = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/edutu/status');
    const data = await response.json();
    return data.status === 'online';
  } catch (error) {
    return false;
  }
};
```

## Response Format

### Opportunity Object
```javascript
{
  title: string,          // "Scholarship for Computer Science Students"
  summary: string,        // Brief description
  link: string,           // Direct URL to opportunity
  image: string,          // Image URL (may be empty)
  publishedDate: string,  // ISO date or empty
  source: string          // "Opportunity Desk" (cleaned domain name)
}
```

### API Response
```javascript
{
  success: true,
  data: [/* Array of Opportunity objects */],
  pagination: {
    page: 1,
    limit: 10,
    total: 10,
    hasNext: false
  },
  meta: {
    searchTerm: "scholarships",
    cached: true,           // Whether results came from cache
    timestamp: "2024-01-01T12:00:00.000Z"
  }
}
```

## React Integration Example

```jsx
import React, { useState, useEffect } from 'react';

const OpportunitySearch = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const searchOpportunities = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/edutu/opportunities?q=${encodeURIComponent(searchQuery)}&count=15`
      );
      const data = await response.json();
      
      if (data.success) {
        setOpportunities(data.data);
      } else {
        console.error('Search failed:', data.error);
        setOpportunities([]);
      }
    } catch (error) {
      console.error('API Error:', error);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      searchOpportunities(query);
    }
  };

  return (
    <div className="opportunity-search">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for opportunities..."
          className="search-input"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="results">
        {opportunities.map((opportunity, index) => (
          <div key={index} className="opportunity-card">
            <h3>{opportunity.title}</h3>
            <p>{opportunity.summary}</p>
            <a href={opportunity.link} target="_blank" rel="noopener noreferrer">
              View Opportunity
            </a>
            <small>Source: {opportunity.source}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OpportunitySearch;
```

## Advanced Integration

### Using Standard API
For more control, use the full API:

```javascript
// GET /api/opportunities?topic={query}&limit={limit}&page={page}&sites={sites}&refresh={refresh}
const advancedSearch = async (options) => {
  const {
    topic,
    limit = 10,
    page = 1,
    sites = '', // Comma-separated domain list
    refresh = false
  } = options;

  const params = new URLSearchParams({
    topic,
    limit: limit.toString(),
    page: page.toString(),
    ...(sites && { sites }),
    ...(refresh && { refresh: 'true' })
  });

  const response = await fetch(`http://localhost:3000/api/opportunities?${params}`);
  return response.json();
};

// Example: Search specific sites only
const scholarshipResults = await advancedSearch({
  topic: 'undergraduate scholarships',
  limit: 20,
  sites: 'opportunitydesk.org,scholars4dev.com'
});
```

### Error Handling
```javascript
const safeApiCall = async (apiFunction) => {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    console.error('API call failed:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      data: [] 
    };
  }
};

// Usage
const { success, data, error } = await safeApiCall(() => 
  searchOpportunities('internships')
);

if (success) {
  // Handle successful response
  console.log('Found opportunities:', data);
} else {
  // Handle error
  console.error('Search failed:', error);
}
```

### Caching in Frontend
```javascript
class OpportunityCache {
  constructor(ttl = 300000) { // 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp + this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

const opportunityCache = new OpportunityCache();

const cachedSearch = async (query, count = 10) => {
  const cacheKey = `${query}-${count}`;
  
  // Check cache first
  let results = opportunityCache.get(cacheKey);
  if (results) {
    console.log('Using cached results');
    return results;
  }
  
  // Fetch from API
  results = await searchOpportunities(query, count);
  
  // Cache results
  if (results.length > 0) {
    opportunityCache.set(cacheKey, results);
  }
  
  return results;
};
```

## Configuration

### Environment Variables for Integration
```env
# In your main Edutu app
OPPORTUNITIES_API_URL=http://localhost:3000
OPPORTUNITIES_API_TIMEOUT=10000
OPPORTUNITIES_CACHE_TTL=300000
```

### CORS Configuration
Ensure your Edutu domain is in the API's ALLOWED_ORIGINS:

```env
# In opportunities-aggregator/.env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://yourdomain.com
```

## Production Considerations

1. **URL Configuration**: Update API URL for production deployment
2. **Error Boundaries**: Wrap opportunity components in error boundaries
3. **Loading States**: Show loading indicators during API calls
4. **Retry Logic**: Implement retry for failed requests
5. **Rate Limiting**: Respect API rate limits (100 requests per 15 minutes)
6. **Fallback Content**: Show meaningful content when API is unavailable

## Testing Integration

```javascript
// Test script for integration
const testIntegration = async () => {
  console.log('Testing Edutu API integration...');
  
  // Test 1: Basic search
  const results = await searchOpportunities('scholarships', 5);
  console.log(`✅ Found ${results.length} opportunities`);
  
  // Test 2: Categories
  const categories = await getCategories();
  console.log(`✅ Found ${categories.length} categories`);
  
  // Test 3: Status check
  const isOnline = await checkStatus();
  console.log(`✅ API Status: ${isOnline ? 'Online' : 'Offline'}`);
  
  console.log('Integration test complete!');
};

testIntegration();
```

## Support

For integration issues:
1. Check API health: `GET /api/health`
2. Verify CORS configuration
3. Check browser console for errors
4. Review API logs in `logs/` directory
5. Test with provided test script: `node test-api.js`