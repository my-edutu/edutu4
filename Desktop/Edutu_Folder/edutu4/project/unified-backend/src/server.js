/**
 * Edutu Unified Backend Server
 * Production-ready unified backend with chat, LLM integration, and opportunities management
 * 
 * Features:
 * - Unified API endpoints
 * - Real-time chat with RAG integration
 * - Opportunity recommendations
 * - User management and authentication
 * - Health monitoring and logging
 * - Rate limiting and security
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import core modules
const logger = require('./utils/logger');
const config = require('./config');
const { initializeServices } = require('./services');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Import routes
const healthRoutes = require('./routes/health');
const chatRoutes = require('./routes/chat');
const opportunityRoutes = require('./routes/opportunities');
const userRoutes = require('./routes/users');
const recommendationRoutes = require('./routes/recommendations');

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
      connectSrc: ["'self'", "https:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(morgan('combined', { 
  stream: { write: message => logger.info(message.trim()) } 
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check (before authentication)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/chat', authMiddleware.optional, chatRoutes);
app.use('/api/opportunities', authMiddleware.optional, opportunityRoutes);
app.use('/api/users', authMiddleware.required, userRoutes);
app.use('/api/recommendations', authMiddleware.optional, recommendationRoutes);

// Legacy endpoint support for backward compatibility
app.post('/simpleChat', authMiddleware.optional, (req, res, next) => {
  req.url = '/api/chat/message';
  chatRoutes(req, res, next);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Edutu Unified Backend',
    version: '2.0.0',
    status: 'running',
    environment: process.env.NODE_ENV,
    endpoints: {
      chat: '/api/chat',
      opportunities: '/api/opportunities',
      users: '/api/users',
      recommendations: '/api/recommendations',
      health: '/health'
    },
    features: [
      'Real-time chat with RAG integration',
      'AI-powered opportunity recommendations',
      'User profile management',
      'Health monitoring',
      'Rate limiting and security'
    ],
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      '/api/chat',
      '/api/opportunities',
      '/api/users',
      '/api/recommendations',
      '/health'
    ],
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close(() => {
    logger.info('Server closed, process terminated');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Initialize services and start server
async function startServer() {
  try {
    logger.info('🚀 Starting Edutu Unified Backend...');
    
    // Initialize external services
    await initializeServices();
    logger.info('✅ All services initialized successfully');
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🎯 Edutu Unified Backend running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🤖 API Documentation: http://localhost:${PORT}`);
    });

    // Setup graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

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