import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
/**
 * Global error handling middleware
 */
export declare const errorHandler: (error: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
/**
 * Handle async errors in route handlers
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Handle 404 errors for undefined routes
 */
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validation error formatter
 */
export declare const formatValidationError: (error: any) => AppError;
//# sourceMappingURL=errorHandler.d.ts.map