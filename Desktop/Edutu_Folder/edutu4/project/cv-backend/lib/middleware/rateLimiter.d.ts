import { Request, Response, NextFunction } from 'express';
/**
 * General rate limiting middleware
 */
export declare const rateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload-specific rate limiting middleware
 */
export declare const uploadRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * AI operations rate limiting middleware
 */
export declare const aiRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reset rate limits for a user (admin function)
 */
export declare const resetUserRateLimit: (userId: string) => Promise<void>;
//# sourceMappingURL=rateLimiter.d.ts.map