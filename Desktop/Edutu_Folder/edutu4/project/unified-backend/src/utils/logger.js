/**
 * Centralized logging utility
 * Winston-based logger with multiple transports and formatting
 */

const winston = require('winston');
const config = require('../config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // Error log file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Enhanced logging methods with context support
const enhancedLogger = {
  error: (message, meta = {}) => {
    logger.error(message, { 
      ...meta, 
      timestamp: new Date().toISOString(),
      level: 'error'
    });
  },

  warn: (message, meta = {}) => {
    logger.warn(message, { 
      ...meta, 
      timestamp: new Date().toISOString(),
      level: 'warn'
    });
  },

  info: (message, meta = {}) => {
    logger.info(message, { 
      ...meta, 
      timestamp: new Date().toISOString(),
      level: 'info'
    });
  },

  http: (message, meta = {}) => {
    logger.http(message, { 
      ...meta, 
      timestamp: new Date().toISOString(),
      level: 'http'
    });
  },

  debug: (message, meta = {}) => {
    logger.debug(message, { 
      ...meta, 
      timestamp: new Date().toISOString(),
      level: 'debug'
    });
  },

  // Custom method for API request logging
  apiRequest: (method, url, statusCode, responseTime, meta = {}) => {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    logger.log(level, `${method} ${url} ${statusCode} - ${responseTime}ms`, {
      ...meta,
      method,
      url,
      statusCode,
      responseTime,
      type: 'api_request',
      timestamp: new Date().toISOString()
    });
  },

  // Custom method for chat interactions
  chatInteraction: (userId, message, response, meta = {}) => {
    logger.info('Chat interaction', {
      userId,
      messageLength: message?.length,
      responseLength: response?.length,
      ...meta,
      type: 'chat_interaction',
      timestamp: new Date().toISOString()
    });
  },

  // Custom method for AI service calls
  aiServiceCall: (provider, success, responseTime, meta = {}) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, `AI service call to ${provider} - ${success ? 'success' : 'failed'} (${responseTime}ms)`, {
      provider,
      success,
      responseTime,
      ...meta,
      type: 'ai_service_call',
      timestamp: new Date().toISOString()
    });
  },

  // Custom method for authentication events
  auth: (event, userId, success, meta = {}) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, `Auth ${event} for user ${userId} - ${success ? 'success' : 'failed'}`, {
      event,
      userId,
      success,
      ...meta,
      type: 'authentication',
      timestamp: new Date().toISOString()
    });
  },

  // Custom method for service health checks
  healthCheck: (service, status, responseTime, meta = {}) => {
    const level = status === 'healthy' ? 'info' : 'warn';
    logger.log(level, `Health check ${service} - ${status} (${responseTime}ms)`, {
      service,
      status,
      responseTime,
      ...meta,
      type: 'health_check',
      timestamp: new Date().toISOString()
    });
  },

  // Custom method for performance monitoring
  performance: (operation, duration, meta = {}) => {
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug';
    logger.log(level, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...meta,
      type: 'performance',
      timestamp: new Date().toISOString()
    });
  },

  // Custom method for security events
  security: (event, severity, meta = {}) => {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    logger.log(level, `Security event: ${event}`, {
      event,
      severity,
      ...meta,
      type: 'security',
      timestamp: new Date().toISOString()
    });
  }
};

// Add request ID middleware support
enhancedLogger.addRequestId = (req, res, next) => {
  req.id = req.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // Add to all subsequent log calls within this request
  const originalLog = logger.log;
  logger.log = function(level, message, meta = {}) {
    return originalLog.call(this, level, message, {
      ...meta,
      requestId: req.id
    });
  };
  
  next();
};

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Error handling for logger itself
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Export both the winston logger and enhanced logger
module.exports = enhancedLogger;