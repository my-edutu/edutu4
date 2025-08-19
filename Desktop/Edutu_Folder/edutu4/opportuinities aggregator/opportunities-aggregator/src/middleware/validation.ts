import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export function validateQuery(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    
    for (const rule of rules) {
      const value = req.query[rule.field];
      
      // Check if required field is missing
      if (rule.required && (!value || value === '')) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }
      
      // Skip validation if field is not provided and not required
      if (!value) continue;
      
      // Type validation
      if (rule.type) {
        const stringValue = String(value);
        
        switch (rule.type) {
          case 'number':
            const numValue = Number(stringValue);
            if (isNaN(numValue)) {
              errors.push(`Field '${rule.field}' must be a valid number`);
              continue;
            }
            
            if (rule.min !== undefined && numValue < rule.min) {
              errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
            }
            
            if (rule.max !== undefined && numValue > rule.max) {
              errors.push(`Field '${rule.field}' must be at most ${rule.max}`);
            }
            break;
            
          case 'string':
            if (rule.min !== undefined && stringValue.length < rule.min) {
              errors.push(`Field '${rule.field}' must be at least ${rule.min} characters long`);
            }
            
            if (rule.max !== undefined && stringValue.length > rule.max) {
              errors.push(`Field '${rule.field}' must be at most ${rule.max} characters long`);
            }
            
            if (rule.pattern && !rule.pattern.test(stringValue)) {
              errors.push(`Field '${rule.field}' has invalid format`);
            }
            break;
            
          case 'boolean':
            if (!['true', 'false', '1', '0'].includes(stringValue.toLowerCase())) {
              errors.push(`Field '${rule.field}' must be a boolean value (true/false)`);
            }
            break;
        }
      }
      
      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (typeof result === 'string') {
          errors.push(result);
        } else if (result === false) {
          errors.push(`Field '${rule.field}' failed custom validation`);
        }
      }
    }
    
    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        path: req.path,
        query: req.query,
        errors,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    next();
  };
}

// Predefined validation rules for common use cases
export const opportunitiesValidationRules: ValidationRule[] = [
  {
    field: 'topic',
    required: true,
    type: 'string',
    min: 2,
    max: 100,
    custom: (value: string) => {
      // Check for potentially malicious content
      const maliciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
      const stringValue = String(value);
      
      if (maliciousPatterns.some(pattern => pattern.test(stringValue))) {
        return 'Topic contains invalid characters';
      }
      
      return true;
    }
  },
  {
    field: 'limit',
    type: 'number',
    min: 1,
    max: 50
  },
  {
    field: 'page',
    type: 'number',
    min: 1,
    max: 100
  },
  {
    field: 'refresh',
    type: 'boolean'
  },
  {
    field: 'sites',
    type: 'string',
    max: 500,
    custom: (value: string) => {
      const sites = String(value).split(',');
      if (sites.length > 10) {
        return 'Too many sites specified (maximum 10)';
      }
      
      // Basic domain validation
      const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      for (const site of sites) {
        const trimmedSite = site.trim();
        if (trimmedSite && !domainPattern.test(trimmedSite)) {
          return `Invalid domain format: ${trimmedSite}`;
        }
      }
      
      return true;
    }
  }
];