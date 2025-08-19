/**
 * Enterprise-grade logging utility
 */
export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
declare class Logger {
    private logLevel;
    private isDevelopment;
    constructor();
    /**
     * Log an error message
     */
    error(message: string, data?: any): void;
    /**
     * Log a warning message
     */
    warn(message: string, data?: any): void;
    /**
     * Log an info message
     */
    info(message: string, data?: any): void;
    /**
     * Log a debug message
     */
    debug(message: string, data?: any): void;
    /**
     * Write log entry
     */
    private writeLog;
    /**
     * Console logging for development
     */
    private consoleLog;
    /**
     * Structured logging for production (Cloud Functions)
     */
    private structuredLog;
    /**
     * Get color code for console output
     */
    private getColorCode;
    /**
     * Get calling function name
     */
    private getFunctionName;
    /**
     * Sanitize data to remove sensitive information
     */
    private sanitizeData;
    /**
     * Check if field contains sensitive information
     */
    private isSensitiveField;
    /**
     * Create a child logger with context
     */
    child(context: {
        requestId?: string;
        userId?: string;
        function?: string;
    }): Logger;
    /**
     * Performance monitoring
     */
    time(label: string): void;
    timeEnd(label: string): void;
    /**
     * Log performance metrics
     */
    performance(operation: string, duration: number, data?: any): void;
    /**
     * Log memory usage
     */
    memory(operation?: string): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map