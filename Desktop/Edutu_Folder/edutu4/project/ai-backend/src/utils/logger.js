/**
 * Winston Logger Configuration
 * Provides structured logging for the AI backend
 */

const winston = require('winston');

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'edutu-ai-backend' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let metaString = '';
        if (Object.keys(meta).length > 0) {
          metaString = ` ${JSON.stringify(meta)}`;
        }
        return `${timestamp} [${service}] ${level}: ${message}${metaString}`;
      })
    )
  }));
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper functions for structured logging
const logError = (message, error, context = {}) => {
  logger.error(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...context
  });
};

const logInfo = (message, context = {}) => {
  logger.info(message, context);
};

const logDebug = (message, context = {}) => {
  logger.debug(message, context);
};

const logWarn = (message, context = {}) => {
  logger.warn(message, context);
};

// Export logger and helper functions
module.exports = {
  error: (...args) => logger.error(...args),
  warn: (...args) => logger.warn(...args), 
  info: (...args) => logger.info(...args),
  debug: (...args) => logger.debug(...args),
  logError,
  logInfo,
  logDebug,
  logWarn,
};