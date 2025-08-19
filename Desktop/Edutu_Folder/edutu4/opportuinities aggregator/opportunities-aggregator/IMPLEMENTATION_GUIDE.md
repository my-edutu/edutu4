# Enhanced Opportunities Aggregator - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the enhanced opportunities aggregator architecture. The system has been redesigned to support multiple data sources, advanced caching, intelligent deduplication, and comprehensive filtering capabilities.

## Architecture Summary

### Core Components

1. **Data Source Abstraction Layer** (`DataSourceBase`)
   - Abstract base class for all data sources
   - Built-in rate limiting, retry logic, and error handling
   - Standardized metrics and health monitoring

2. **Multi-Source Manager** (`DataSourceManager`) 
   - Coordinates searches across multiple data sources
   - Handles parallel/sequential search strategies
   - Intelligent deduplication and result merging

3. **Enhanced Caching System** (`EnhancedCacheService`)
   - Smart cache key generation
   - Multiple eviction policies (LRU, LFU, TTL, Hybrid)
   - Similar search detection and fuzzy matching
   - Memory and entry count limits

4. **Flexible Data Models** (`types/opportunities.ts`)
   - Comprehensive opportunity data structures
   - Support for different opportunity types (jobs, scholarships, etc.)
   - Extensible metadata and filtering capabilities

5. **Database Schema** (`database/schema.sql`)
   - PostgreSQL schema optimized for opportunity data
   - Full-text search capabilities
   - Performance indexes and triggers
   - Audit trails and analytics

## Quick Start Implementation

### Phase 1: Basic Setup (15 minutes)

1. **Install Dependencies**
   ```bash
   cd opportunities-aggregator
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Google Custom Search credentials
   ```

3. **Test Basic Functionality**
   ```bash
   # Start in enhanced mode
   npm run dev:enhanced
   
   # Or start in legacy mode for backward compatibility
   npm run dev:legacy
   ```

4. **Verify Installation**
   ```bash
   # Check health status
   npm run health
   
   # Or manually:
   curl http://localhost:3000/api/health
   ```

### Phase 2: Enhanced Features Setup (30 minutes)

1. **Configure Data Sources**
   - The system automatically initializes Google Search
   - Additional sources can be added in `DataSourceManager.ts`
   - Each source extends `DataSourceBase` class

2. **Test Enhanced Endpoints**
   ```bash
   # Test multi-parameter search
   curl "http://localhost:3000/api/opportunities?query=software&type=job,internship&limit=5"
   
   # Test similar search
   curl "http://localhost:3000/api/opportunities/similar?query=engineering&threshold=0.7"
   
   # Check enhanced cache stats
   curl "http://localhost:3000/api/opportunities/cache/stats"
   ```

3. **Monitor Performance**
   ```bash
   # View metrics
   curl "http://localhost:3000/api/metrics"
   
   # Check data source statistics
   curl "http://localhost:3000/api/opportunities/config"
   ```

### Phase 3: Database Integration (Optional - 60 minutes)

1. **Setup PostgreSQL Database**
   ```sql
   -- Run the schema file
   psql -U your_user -d your_database -f src/database/schema.sql
   ```

2. **Configure Database Connection**
   ```typescript
   // Add to config.ts
   export const dbConfig = {
     host: process.env.DB_HOST || 'localhost',
     port: parseInt(process.env.DB_PORT || '5432'),
     database: process.env.DB_NAME || 'opportunities',
     username: process.env.DB_USER || 'postgres',
     password: process.env.DB_PASSWORD || ''
   };
   ```

3. **Implement Database Service** (Future Enhancement)
   ```typescript
   // Create DatabaseService.ts for persistent storage
   // Integrate with existing caching layer
   ```

## Detailed Implementation Steps

### Adding New Data Sources

1. **Create Data Source Class**
   ```typescript
   // Example: LinkedInDataSource.ts
   export class LinkedInDataSource extends DataSourceBase {
     constructor(apiKey: string) {
       super({
         name: 'LinkedIn Jobs',
         apiKey,
         baseUrl: 'https://api.linkedin.com/v2',
         rateLimit: { requestsPerMinute: 100 },
         timeout: 10000,
         retries: 3,
         enabled: !!apiKey,
         priority: 2
       });
     }
   
     async searchOpportunities(params: OpportunitySearchParams): Promise<EnhancedOpportunity[]> {
       // Implement LinkedIn API integration
     }
   
     validateConfig(): boolean {
       return !!this.config.apiKey;
     }
   
     async getHealthStatus(): Promise<{ healthy: boolean; message?: string }> {
       // Implement health check
     }
   }
   ```

2. **Register in Data Source Manager**
   ```typescript
   // In DataSourceManager.ts initializeDataSources()
   if (process.env.LINKEDIN_API_KEY) {
     const linkedInSource = new LinkedInDataSource(process.env.LINKEDIN_API_KEY);
     this.dataSources.set('linkedin', linkedInSource);
   }
   ```

### Customizing Search Parameters

1. **Extend Search Parameters Interface**
   ```typescript
   // In types/opportunities.ts
   export interface OpportunitySearchParams {
     // ... existing parameters
     industry?: string[];
     companySize?: string[];
     salaryRange?: { min: number; max: number; currency: string };
     benefits?: string[];
   }
   ```

2. **Update Controller Parameter Parsing**
   ```typescript
   // In OpportunitiesController.ts
   private parseSearchParameters(query: OpportunitiesQuery): OpportunitySearchParams {
     // Add new parameter parsing logic
   }
   ```

### Advanced Caching Strategies

1. **Configure Cache Policies**
   ```typescript
   // Initialize with custom config
   const cache = new EnhancedCacheService({
     maxEntries: 5000,
     maxSize: 200 * 1024 * 1024, // 200MB
     evictionPolicy: 'hybrid',
     defaultTtl: 30 * 60 * 1000 // 30 minutes
   });
   ```

2. **Implement Smart Invalidation**
   ```typescript
   // After data source updates
   await cache.invalidateRelated({
     type: [OpportunityType.JOB],
     location: { country: 'USA' }
   });
   ```

## Configuration Options

### Environment Variables

```bash
# Core Configuration
PORT=3000
NODE_ENV=development
ENHANCED_MODE=true

# Google Custom Search
GOOGLE_SEARCH_API_KEY=your_api_key
GOOGLE_SEARCH_CX=your_search_engine_id

# Caching
CACHE_TIMEOUT_MS=3600000
CACHE_MAX_ENTRIES=1000
CACHE_MAX_SIZE=104857600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database (Optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=opportunities
DB_USER=postgres
DB_PASSWORD=your_password

# Additional Data Sources
LINKEDIN_API_KEY=your_linkedin_key
INDEED_API_KEY=your_indeed_key
GITHUB_TOKEN=your_github_token
```

### Runtime Configuration

```typescript
// Toggle between legacy and enhanced modes
POST /api/opportunities/mode
{
  "legacy": false
}

// Update cache configuration
const cache = new EnhancedCacheService({
  evictionPolicy: 'lru',
  maxEntries: 2000
});
```

## API Usage Examples

### Basic Search (Legacy Compatible)
```bash
GET /api/opportunities?topic=scholarships&limit=10&page=1
```

### Enhanced Multi-Type Search
```bash
GET /api/opportunities?query=software engineering&type=job,internship&location={"country":"USA","remote":true}&sortBy=deadline&limit=20
```

### Advanced Filtering
```bash
GET /api/opportunities?query=AI research&type=fellowship,grant&tags=phd,international&dateRange={"deadlineAfter":"2024-01-01"}&sortBy=compensation&sortOrder=desc
```

### Similar Search
```bash
GET /api/opportunities/similar?query=machine learning&threshold=0.8
```

### Health and Monitoring
```bash
GET /api/health                    # Overall health
GET /api/opportunities/health      # Detailed data source health
GET /api/opportunities/config      # Current configuration
GET /api/metrics                   # Performance metrics
```

## Performance Optimization

### 1. Caching Strategy
- Use appropriate TTL values for different opportunity types
- Implement cache warming for popular searches
- Monitor hit rates and adjust policies accordingly

### 2. Data Source Optimization
- Configure appropriate rate limits for each source
- Use parallel searches when possible
- Implement circuit breakers for failing sources

### 3. Database Optimization (When Implemented)
- Use prepared statements for frequent queries
- Implement proper indexing strategy
- Consider read replicas for high-load scenarios

### 4. Memory Management
- Monitor cache size and implement proper eviction
- Use streaming for large result sets
- Implement pagination for all endpoints

## Monitoring and Observability

### Health Checks
The system provides multiple levels of health monitoring:

1. **Basic Health** - `/api/health`
   - Overall system status
   - Basic service availability

2. **Detailed Health** - `/api/opportunities/health`
   - Data source status
   - Performance metrics
   - Error rates

3. **Metrics** - `/api/metrics`
   - Request/response times
   - Cache performance
   - Data source statistics

### Logging
All operations are logged with structured data:
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Data source health events

### Alerting (Future Enhancement)
Consider implementing:
- Data source failure alerts
- High error rate notifications
- Performance degradation warnings
- Cache efficiency monitoring

## Troubleshooting

### Common Issues

1. **Google Search API Errors**
   - Verify API key and search engine ID
   - Check quota limits
   - Review rate limiting settings

2. **Cache Performance Issues**
   - Monitor hit rates via `/api/opportunities/cache/stats`
   - Adjust TTL values based on content freshness
   - Consider increasing cache size limits

3. **High Memory Usage**
   - Check cache size via metrics
   - Implement more aggressive eviction policies
   - Monitor for memory leaks in data processing

4. **Slow Response Times**
   - Enable parallel data source searches
   - Implement appropriate timeouts
   - Consider database optimization (when applicable)

### Debug Mode
Enable debug logging:
```bash
DEBUG=* npm run dev:enhanced
```

### Performance Profiling
Use built-in metrics:
```bash
curl http://localhost:3000/api/metrics | jq '.data.performance'
```

## Future Enhancements

### Planned Features
1. **Additional Data Sources**
   - LinkedIn Jobs API
   - Indeed API integration
   - University career portals
   - Government job boards

2. **AI/ML Enhancements**
   - Opportunity relevance scoring
   - Automatic tagging and categorization
   - Duplicate detection improvements
   - Personalized recommendations

3. **Database Integration**
   - Persistent opportunity storage
   - Historical data analysis
   - Advanced search capabilities
   - User activity tracking

4. **Real-time Features**
   - WebSocket notifications
   - Live opportunity updates
   - Real-time availability tracking

5. **Analytics Dashboard**
   - Search analytics
   - Source performance metrics
   - User behavior insights
   - Trending opportunities

This implementation guide provides a solid foundation for deploying and extending the enhanced opportunities aggregator. The modular architecture allows for incremental improvements and easy integration of new features.