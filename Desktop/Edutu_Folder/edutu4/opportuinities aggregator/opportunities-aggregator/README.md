# Edutu Opportunities Aggregator

A lightweight, production-ready Node.js/TypeScript backend service that aggregates educational and career opportunities using Google Custom Search API.

## 🚀 Features

- **Google Custom Search Integration**: Searches top opportunity sites (OpportunityDesk, YouthOpportunitiesHub, AfterSchoolAfrica, etc.)
- **Smart Data Cleaning**: Extracts meta images, descriptions, and publication dates
- **In-Memory Caching**: 1-hour cache to reduce API calls and improve performance
- **Automated Refresh**: Cron jobs refresh popular topics every 6 hours
- **Production Ready**: Comprehensive logging, error handling, and security headers
- **TypeScript**: Fully typed for better development experience
- **RESTful API**: Clean, documented endpoints with proper error responses

## 📋 Requirements

- Node.js 18+ 
- Google Custom Search API Key
- Google Custom Search Engine ID

## 🛠 Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd opportunities-aggregator
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required: Google Custom Search API credentials
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_CX=your_custom_search_engine_id_here

# Optional: Server configuration
PORT=3000
NODE_ENV=production
CACHE_TIMEOUT_MS=3600000
```

### 3. Google Custom Search Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Custom Search API**
3. Create API credentials and copy the API key
4. Create a Custom Search Engine at [Google Custom Search](https://cse.google.com/)
5. Copy the Search Engine ID (CX)

### 4. Run the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### GET `/api/opportunities`
Search for educational and career opportunities.

**Query Parameters:**
- `topic` (required): Search topic (e.g., "scholarships", "internships")
- `limit` (optional): Results per page (default: 10, max: 50)
- `page` (optional): Page number (default: 1)
- `sites` (optional): Comma-separated list of specific sites to search
- `refresh` (optional): Set to "true" to bypass cache

**Example:**
```bash
curl "http://localhost:3000/api/opportunities?topic=scholarships&limit=20&page=1"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "title": "International Scholarship Program 2024",
      "summary": "Full funding available for undergraduate students...",
      "link": "https://opportunitydesk.org/scholarship-program",
      "image": "https://example.com/image.jpg",
      "publishedDate": "2024-01-15",
      "source": "Opportunity Desk"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "hasNext": false
  },
  "meta": {
    "searchTerm": "scholarships",
    "cached": false,
    "timestamp": "2024-01-20T10:30:00.000Z"
  }
}
```

#### GET `/api/opportunities/cache/stats`
Get cache statistics.

#### DELETE `/api/opportunities/cache`
Clear the cache.

#### GET `/api/health`
Get service health status.

## 🏗 Architecture

```
src/
├── index.ts                 # Main server setup
├── config.ts               # Environment configuration
├── controllers/
│   └── opportunitiesController.ts  # Business logic
├── services/
│   ├── googleSearch.ts     # Google Custom Search API
│   ├── cacheService.ts     # In-memory caching
│   └── cronService.ts      # Background job scheduler
├── routes/
│   └── opportunities.ts    # API routes
└── utils/
    ├── cleanData.ts        # Data cleaning utilities
    └── logger.ts          # Winston logger setup
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API key | - | Yes |
| `GOOGLE_SEARCH_CX` | Custom Search Engine ID | - | Yes |
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment | development | No |
| `CACHE_TIMEOUT_MS` | Cache TTL in milliseconds | 3600000 | No |
| `DEFAULT_PAGE_SIZE` | Default results per page | 10 | No |
| `MAX_PAGE_SIZE` | Maximum results per page | 50 | No |
| `LOG_LEVEL` | Logging level | info | No |

### Opportunity Sites

The service searches these sites by default:
- opportunitydesk.org
- youthopportunitieshub.org
- afterschoolafrica.com
- scholarship-positions.com
- scholars4dev.com
- ophs.org
- worldscholarshipforum.com
- studyportals.com
- opportunitiesforafricans.com

## 🔄 Background Jobs

### Popular Topics Refresh (Every 6 hours)
Automatically refreshes cache for popular topics:
- scholarships
- internships
- fellowships
- grants
- study abroad
- research opportunities

### Cache Cleanup (Daily)
Removes expired cache entries to maintain optimal memory usage.

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Cache Statistics
```bash
curl http://localhost:3000/api/opportunities/cache/stats
```

## 🚀 Production Deployment

### Using PM2
```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name "opportunities-aggregator"
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## 🛡 Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin requests
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitizes query parameters
- **Error Handling**: Secure error responses

## 📝 Development

### Scripts
- `npm run dev`: Development with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm run lint`: Run ESLint
- `npm run typecheck`: TypeScript type checking

### Code Quality
- TypeScript for type safety
- ESLint for code quality
- Winston for structured logging
- Comprehensive error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Review environment configuration
3. Verify Google Custom Search API setup
4. Check rate limits and quotas

---

Built with ❤️ for Edutu - Empowering education through AI