import { Request, Response, NextFunction } from 'express';
import metricsService from '../services/metricsService';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  
  // Override res.end to capture response time and status
  const originalEnd = res.end;
  res.end = function(this: Response, chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    metricsService.recordRequest(endpoint, duration, isError);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  } as any;
  
  next();
}