import { Request, Response, NextFunction } from 'express';
/**
 * Request logging middleware
 */
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Performance monitoring middleware
 */
export declare const performanceLogger: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Security event logger
 */
export declare const securityLogger: {
    logFailedAuth: (req: Request, reason: string) => void;
    logSuspiciousActivity: (req: Request, activity: string, details?: any) => void;
    logRateLimitExceeded: (req: Request, limitType: string) => void;
};
//# sourceMappingURL=logger.d.ts.map