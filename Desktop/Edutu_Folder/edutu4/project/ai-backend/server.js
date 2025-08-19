/**
 * Edutu AI Backend Server
 * Production-ready AI backend for personalized opportunity coaching
 * 
 * Features:
 * - Personalized roadmap generation
 * - AI-powered opportunity recommendations
 * - RAG-based chat assistant
 * - Vector similarity search
 * - Real-time updates
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import services and routes
const logger = require('./src/utils/logger');
const { initializeFirebase } = require('./src/config/firebase');
const { initializeSupabase } = require('./src/config/supabase');
const { initializeAI } = require('./src/config/ai');
const schedulerService = require('./src/services/scheduler');
const { logRequest } = require('./src/middleware/auth');

// Import routes
const roadmapRoutes = require('./src/routes/roadmaps');
const recommendationRoutes = require('./src/routes/recommendations');
const chatRoutes = require('./src/routes/chat');
const healthRoutes = require('./src/routes/health');
const adminRoutes = require('./src/routes/admin');
const activityRoutes = require('./src/routes/activity');
const webhookRoutes = require('./src/routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : (process.env.NODE_ENV === 'production' 
    ? ['https://your-edutu-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174']);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(logRequest); // Custom request logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (before rate limiting)
app.use('/health', healthRoutes);

// API routes
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Edutu AI Backend',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV,
    endpoints: {
      roadmaps: '/api/roadmaps',
      recommendations: '/api/recommendations',
      chat: '/api/chat',
      activity: '/api/activity',
      webhooks: '/api/webhooks',
      admin: '/api/admin',
      health: '/health'
    },
    documentation: 'https://github.com/your-repo/edutu-ai-backend',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(status).json({
    error: message,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      '/api/roadmaps',
      '/api/recommendations', 
      '/api/chat',
      '/api/admin',
      '/health'
    ],
    timestamp: new Date().toISOString()
  });
});

// Initialize services and start server
async function startServer() {
  try {
    logger.info('🚀 Starting Edutu AI Backend...');
    
    // Initialize external services
    await initializeFirebase();
    logger.info('✅ Firebase initialized');
    
    await initializeSupabase();
    logger.info('✅ Supabase initialized');
    
    await initializeAI();
    logger.info('✅ AI services initialized');
    
    // Start scheduler if enabled
    if (process.env.ENABLE_SCHEDULER !== 'false') {
      schedulerService.start();
      logger.info('✅ Scheduler service started');
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🎯 Edutu AI Backend running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🤖 API Documentation: http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      // Stop scheduler
      if (schedulerService.getStatus().isRunning) {
        schedulerService.stop();
        logger.info('Scheduler service stopped');
      }
      
      // Close server
      server.close(() => {
        logger.info('Server closed, process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;