import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { formatValidationError } from '../middleware/errorHandler';

const convertSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  }),
  toFormat: Joi.string().valid('pdf', 'docx').required().messages({
    'string.base': 'Format must be a string',
    'any.only': 'Format must be either "pdf" or "docx"',
    'any.required': 'Target format is required'
  })
});

const deleteSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  })
});

/**
 * Validate upload requests
 */
export const validateUpload = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = convertSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};

/**
 * Validate file constraints
 */
export const validateFileConstraints = (req: Request, res: Response, next: NextFunction): void => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10) * 1024 * 1024;
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  
  if (contentLength > maxSize) {
    return next(new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`));
  }
  
  const contentType = req.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return next(new Error('Content-Type must be multipart/form-data for file uploads'));
  }
  
  next();
};