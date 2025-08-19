import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { appConfig } from './config';
import { logger } from './utils/logger';
import opportunitiesRoutes from './routes/opportunities';
import edutuRoutes from './routes/edutu';
import cronService from './services/cronService';
import { EnhancedCacheService } from './services/cache/EnhancedCacheService';
import { DataSourceManager } from './services/DataSourceManager';
import metricsService from './services/metricsService';
import { metricsMiddleware } from './middleware/metrics';

// Initialize enhanced services
const enhancedCache = new EnhancedCacheService();
const dataSourceManager = new DataSourceManager();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration optimized for Edutu integration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow if origin is in allowed list or matches localhost pattern for development
    if (allowedOrigins.includes(origin) || 
        (process.env.NODE_ENV === 'development' && origin.includes('localhost'))) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-API-Key',
    'X-Edutu-Client-Version',
    'Accept',
    'Cache-Control'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions as any));

// Rate limiting
const limiter = rateLimit({
  windowMs: appConfig.rateLimitWindowMs,
  max: appConfig.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for web UI
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Add metrics middleware
app.use(metricsMiddleware);

// Request logging and response time middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Add response time header before response is sent
  const originalSend = res.send;
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', `${responseTime}ms`);
    return originalSend.call(this, data);
  };
  
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });
  
  next();
});

app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/edutu', edutuRoutes); // Simplified endpoints for Edutu integration

app.get('/api/health', async (req, res) => {
  try {
    const cacheStats = enhancedCache.getStats();
    const cronStatus = cronService.getJobStatus();
    const dataSourceHealth = await dataSourceManager.getHealthStatus();
    const dataSourceStats = dataSourceManager.getDataSourceStats();
    
    const healthStatus = dataSourceHealth.healthy ? 'healthy' : 'degraded';
    
    res.json({
      success: true,
      status: healthStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        dataSources: dataSourceHealth.sources,
        enhancedCache: {
          entries: cacheStats.totalEntries,
          hitRate: cacheStats.hitRate,
          size: cacheStats.totalSize,
          status: 'active'
        },
        cronJobs: {
          status: 'active',
          jobs: cronStatus
        }
      },
      dataSourceStats: Object.fromEntries(dataSourceStats)
    });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api', (req, res) => {
  const dataSourceStats = dataSourceManager.getDataSourceStats();
  const availableSources = Array.from(dataSourceStats.keys());
  
  res.json({
    success: true,
    message: 'Edutu Enhanced Opportunities Aggregator API',
    version: '2.0.0',
    documentation: '/api/docs',
    features: {
      multiSourceAggregation: true,
      enhancedCaching: true,
      intelligentDeduplication: true,
      flexibleFiltering: true,
      realTimeHealthMonitoring: true
    },
    endpoints: {
      opportunities: '/api/opportunities',
      health: '/api/health',
      cache: '/api/opportunities/cache',
      metrics: '/api/metrics',
      docs: '/api/docs',
      edutu: {
        opportunities: '/api/edutu/opportunities',
        status: '/api/edutu/status',
        categories: '/api/edutu/categories'
      },
      enhanced: {
        similar: '/api/opportunities/similar',
        healthDetail: '/api/opportunities/health',
        sourceStats: '/api/opportunities/sources'
      }
    },
    dataSources: availableSources,
    timestamp: new Date().toISOString()
  });  
});

app.get('/api/metrics', (req, res) => {
  const metrics = metricsService.getMetrics();
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString()
  });
});

app.delete('/api/metrics', (req, res) => {
  metricsService.reset();
  res.json({
    success: true,
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Edutu Opportunities Aggregator API',
    version: '1.0.0',
    description: 'API for aggregating educational and career opportunities',
    endpoints: [
      {
        path: '/api/opportunities',
        method: 'GET',
        description: 'Search for opportunities',
        parameters: {
          topic: 'string (required) - Search topic',
          limit: 'number (optional) - Results per page (default: 10, max: 50)',
          page: 'number (optional) - Page number (default: 1)',
          sites: 'string (optional) - Comma-separated list of sites to search',
          refresh: 'boolean (optional) - Force refresh cache'
        },
        example: '/api/opportunities?topic=scholarships&limit=20&page=1'
      },
      {
        path: '/api/opportunities/cache/stats',
        method: 'GET',
        description: 'Get cache statistics'
      },
      {
        path: '/api/opportunities/cache',
        method: 'DELETE',
        description: 'Clear the cache'
      },
      {
        path: '/api/health',
        method: 'GET',
        description: 'Get service health status'
      },
      {
        path: '/api/metrics',
        method: 'GET',
        description: 'Get service performance metrics'
      },
      {
        path: '/api/metrics',
        method: 'DELETE',
        description: 'Reset service metrics'
      },
      {
        path: '/api/edutu/opportunities',
        method: 'GET',
        description: 'Simplified opportunities search for Edutu integration',
        parameters: {
          q: 'string (required) - Search query',
          count: 'number (optional) - Number of results (default: 10, max: 50)',
          refresh: 'boolean (optional) - Force refresh cache'
        },
        example: '/api/edutu/opportunities?q=scholarships&count=20'
      },
      {
        path: '/api/edutu/status',
        method: 'GET',
        description: 'Simple status check for Edutu integration'
      },
      {
        path: '/api/edutu/categories',
        method: 'GET',
        description: 'Get available opportunity categories'
      }
    ]
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(appConfig.port, () => {
  logger.info(`🚀 Edutu Opportunities Aggregator started`, {
    port: appConfig.port,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    cacheTimeout: appConfig.cacheTimeoutMs
  });

  cronService.start();
});

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    cronService.stop();
    enhancedCache.destroy();
    
    // Additional cleanup for enhanced services
    try {
      // Any additional cleanup for data source manager
      logger.info('Enhanced services cleanup completed');
    } catch (error) {
      logger.error('Error during enhanced services cleanup', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

export default app;