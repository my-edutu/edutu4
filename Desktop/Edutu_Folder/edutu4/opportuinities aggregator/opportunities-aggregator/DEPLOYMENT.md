# Edutu Opportunities Aggregator - Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Google Custom Search API key and Search Engine ID
- Environment variables configured

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Google API credentials
   ```

3. **Development**
   ```bash
   npm run dev
   ```

4. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

### Required
- `GOOGLE_SEARCH_API_KEY`: Your Google Custom Search API key
- `GOOGLE_SEARCH_CX`: Your Custom Search Engine ID

### Optional
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `CACHE_TIMEOUT_MS`: Cache TTL in milliseconds (default: 3600000 = 1 hour)
- `DEFAULT_PAGE_SIZE`: Default results per page (default: 10)
- `MAX_PAGE_SIZE`: Maximum results per page (default: 50)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX`: Max requests per window (default: 100)
- `ALLOWED_ORIGINS`: Comma-separated CORS origins
- `LOG_LEVEL`: Logging level (default: info)

## Google Custom Search Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Custom Search API
3. Create API credentials (API Key)
4. Set up a Custom Search Engine at [Google CSE](https://cse.google.com/)
5. Configure the search engine to search specific opportunity sites
6. Get your Search Engine ID (CX parameter)

## Production Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY logs ./logs
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 Process Manager

```bash
npm install -g pm2
pm2 start dist/index.js --name "opportunities-api"
pm2 startup
pm2 save
```

### Health Checks

- Health endpoint: `GET /api/health`
- Expected response: `{ "status": "healthy" }` (200 OK)
- Degraded if Google API not configured: `{ "status": "degraded" }`

## Performance Considerations

- **Caching**: Responses are cached for 1 hour by default
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Connection Pooling**: Automatically handled by Node.js
- **Memory Usage**: Approximately 50-100MB under normal load

## Monitoring

### Built-in Endpoints
- `/api/health` - Service health status
- `/api/metrics` - Performance metrics
- `/api/opportunities/cache/stats` - Cache statistics

### Recommended Monitoring
- Response time alerts (>5s)
- Error rate monitoring (>5%)
- Memory usage alerts (>500MB)
- Google API quota monitoring

## Security

- **CORS**: Configured for Edutu domains
- **Rate Limiting**: Applied to all API endpoints  
- **Input Validation**: All parameters validated
- **Helmet**: Security headers applied
- **No Authentication**: Public API (consider adding API keys for production)

## Scaling Considerations

- **Horizontal Scaling**: Stateless design supports load balancers
- **Cache Invalidation**: Consider Redis for shared cache across instances
- **Database**: Currently memory-based, consider persistent storage for larger scales
- **CDN**: Consider caching responses at CDN level

## Troubleshooting

### Common Issues

1. **"Google Search API not configured"**
   - Check GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX env vars
   - Verify API key has Custom Search API enabled
   - Check API quota and billing

2. **High memory usage**
   - Check cache size: `GET /api/opportunities/cache/stats`
   - Consider reducing CACHE_TIMEOUT_MS
   - Monitor for memory leaks

3. **Slow responses**
   - Check Google API response times
   - Verify cache is working (cached: true in responses)
   - Consider reducing search result limits

4. **CORS errors**
   - Add your domain to ALLOWED_ORIGINS
   - Check browser console for specific CORS errors

### Logs

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development mode

### Performance Tuning

```env
# Optimize for high traffic
CACHE_TIMEOUT_MS=7200000    # 2 hours
DEFAULT_PAGE_SIZE=5         # Reduce default
MAX_PAGE_SIZE=25           # Reduce maximum
RATE_LIMIT_MAX=200         # Increase if needed
```

```env
# Optimize for accuracy (frequent updates)
CACHE_TIMEOUT_MS=1800000   # 30 minutes
DEFAULT_PAGE_SIZE=15       # More results
MAX_PAGE_SIZE=50          # Keep maximum
```

## Integration with Edutu

See `INTEGRATION.md` for detailed integration instructions with the main Edutu application.