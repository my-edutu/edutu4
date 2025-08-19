import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                email?: string;
                emailVerified?: boolean;
                name?: string;
            };
        }
    }
}
/**
 * Authentication middleware for Firebase ID tokens
 */
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication middleware (allows unauthenticated requests)
 */
export declare const optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Admin-only middleware (requires elevated permissions)
 */
export declare const adminMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map