"use strict";
/**
 * Enterprise-grade logging utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        var _a, _b;
        const level = ((_a = process.env.LOG_LEVEL) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || 'INFO';
        this.logLevel = (_b = LogLevel[level]) !== null && _b !== void 0 ? _b : LogLevel.INFO;
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }
    /**
     * Log an error message
     */
    error(message, data) {
        if (this.logLevel >= LogLevel.ERROR) {
            this.writeLog('ERROR', message, data);
        }
    }
    /**
     * Log a warning message
     */
    warn(message, data) {
        if (this.logLevel >= LogLevel.WARN) {
            this.writeLog('WARN', message, data);
        }
    }
    /**
     * Log an info message
     */
    info(message, data) {
        if (this.logLevel >= LogLevel.INFO) {
            this.writeLog('INFO', message, data);
        }
    }
    /**
     * Log a debug message
     */
    debug(message, data) {
        if (this.logLevel >= LogLevel.DEBUG) {
            this.writeLog('DEBUG', message, data);
        }
    }
    /**
     * Write log entry
     */
    writeLog(level, message, data) {
        var _a, _b, _c;
        const entry = {
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
        if (data === null || data === void 0 ? void 0 : data.requestId) {
            entry.requestId = data.requestId;
        }
        // Add user ID if available from data
        if (((_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.uid) || (data === null || data === void 0 ? void 0 : data.uid)) {
            entry.userId = ((_b = data.user) === null || _b === void 0 ? void 0 : _b.uid) || data.uid;
        }
        // Add stack trace for errors
        if (level === 'ERROR' && ((_c = data === null || data === void 0 ? void 0 : data.error) === null || _c === void 0 ? void 0 : _c.stack)) {
            entry.stack = data.error.stack;
        }
        if (this.isDevelopment) {
            this.consoleLog(level, entry);
        }
        else {
            this.structuredLog(entry);
        }
    }
    /**
     * Console logging for development
     */
    consoleLog(level, entry) {
        const color = this.getColorCode(level);
        const reset = '\x1b[0m';
        console.log(`${color}[${entry.timestamp}] ${level}: ${entry.message}${reset}`, entry.data ? entry.data : '');
        if (entry.stack) {
            console.log(`${color}Stack:${reset}`, entry.stack);
        }
    }
    /**
     * Structured logging for production (Cloud Functions)
     */
    structuredLog(entry) {
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
    getColorCode(level) {
        const colors = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m', // Yellow
            INFO: '\x1b[36m', // Cyan
            DEBUG: '\x1b[90m' // Gray
        };
        return colors[level] || '\x1b[0m';
    }
    /**
     * Get calling function name
     */
    getFunctionName() {
        try {
            const stack = new Error().stack;
            if (!stack)
                return 'unknown';
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
        }
        catch (_a) {
            return 'unknown';
        }
    }
    /**
     * Sanitize data to remove sensitive information
     */
    sanitizeData(data) {
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
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                const lowerKey = key.toLowerCase();
                // Redact sensitive fields
                if (this.isSensitiveField(lowerKey)) {
                    sanitized[key] = '[REDACTED]';
                }
                else if (lowerKey.includes('token') && typeof value === 'string' && value.length > 20) {
                    // Partially redact long tokens
                    sanitized[key] = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
                }
                else {
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
    isSensitiveField(fieldName) {
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
    child(context) {
        const childLogger = Object.create(this);
        childLogger.context = context;
        return childLogger;
    }
    /**
     * Performance monitoring
     */
    time(label) {
        if (this.isDevelopment) {
            console.time(label);
        }
    }
    timeEnd(label) {
        if (this.isDevelopment) {
            console.timeEnd(label);
        }
    }
    /**
     * Log performance metrics
     */
    performance(operation, duration, data) {
        this.info(`Performance: ${operation}`, Object.assign({ duration: `${duration}ms` }, data));
    }
    /**
     * Log memory usage
     */
    memory(operation) {
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
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map