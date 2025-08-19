/**
 * Enterprise-grade logging utility
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  requestId?: string;
  userId?: string;
  function?: string;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.logLevel = LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      this.writeLog('ERROR', message, data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      this.writeLog('WARN', message, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      this.writeLog('INFO', message, data);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.writeLog('DEBUG', message, data);
    }
  }

  /**
   * Write log entry
   */
  private writeLog(level: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      function: this.getFunctionName()
    };

    // Add data if provided
    if (data !== undefined) {
      // Clean sensitive information
      entry.data = this.sanitizeData(data);
    }

    // Add request ID if available from data
    if (data?.requestId) {
      entry.requestId = data.requestId;
    }

    // Add user ID if available from data
    if (data?.user?.uid || data?.uid) {
      entry.userId = data.user?.uid || data.uid;
    }

    // Add stack trace for errors
    if (level === 'ERROR' && data?.error?.stack) {
      entry.stack = data.error.stack;
    }

    if (this.isDevelopment) {
      this.consoleLog(level, entry);
    } else {
      this.structuredLog(entry);
    }
  }

  /**
   * Console logging for development
   */
  private consoleLog(level: string, entry: LogEntry): void {
    const color = this.getColorCode(level);
    const reset = '\x1b[0m';
    
    console.log(
      `${color}[${entry.timestamp}] ${level}: ${entry.message}${reset}`,
      entry.data ? entry.data : ''
    );

    if (entry.stack) {
      console.log(`${color}Stack:${reset}`, entry.stack);
    }
  }

  /**
   * Structured logging for production (Cloud Functions)
   */
  private structuredLog(entry: LogEntry): void {
    // Use console methods that Cloud Functions recognizes
    switch (entry.level) {
      case 'ERROR':
        console.error(JSON.stringify(entry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(entry));
        break;
      case 'DEBUG':
        console.debug(JSON.stringify(entry));
        break;
      default:
        console.log(JSON.stringify(entry));
    }
  }

  /**
   * Get color code for console output
   */
  private getColorCode(level: string): string {
    const colors: { [key: string]: string } = {
      ERROR: '\x1b[31m',   // Red
      WARN: '\x1b[33m',    // Yellow
      INFO: '\x1b[36m',    // Cyan
      DEBUG: '\x1b[90m'    // Gray
    };
    return colors[level] || '\x1b[0m';
  }

  /**
   * Get calling function name
   */
  private getFunctionName(): string {
    try {
      const stack = new Error().stack;
      if (!stack) return 'unknown';

      const lines = stack.split('\n');
      // Find the first line that's not from this logger
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line && !line.includes('Logger.') && !line.includes('logger.')) {
          const match = line.match(/at\s+(.+?)\s+\(/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Redact sensitive fields
        if (this.isSensitiveField(lowerKey)) {
          sanitized[key] = '[REDACTED]';
        } else if (lowerKey.includes('token') && typeof value === 'string' && value.length > 20) {
          // Partially redact long tokens
          sanitized[key] = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Check if field contains sensitive information
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'passwd',
      'secret',
      'key',
      'token',
      'auth',
      'credential',
      'apikey',
      'api_key',
      'private_key',
      'privatekey',
      'access_token',
      'refresh_token',
      'id_token',
      'session',
      'cookie',
      'authorization',
      'x-api-key',
      'x-auth-token'
    ];

    return sensitiveFields.some(field => fieldName.includes(field));
  }

  /**
   * Create a child logger with context
   */
  child(context: { requestId?: string; userId?: string; function?: string }): Logger {
    const childLogger = Object.create(this);
    childLogger.context = context;
    return childLogger;
  }

  /**
   * Performance monitoring
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, data?: any): void {
    this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...data
    });
  }

  /**
   * Log memory usage
   */
  memory(operation?: string): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      const usage = process.memoryUsage();
      this.debug('Memory usage', {
        operation,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();