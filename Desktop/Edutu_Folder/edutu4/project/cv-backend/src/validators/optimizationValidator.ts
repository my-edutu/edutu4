import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { formatValidationError } from '../middleware/errorHandler';

const optimizationSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  }),
  jobDescription: Joi.string().optional().allow('').max(10000).messages({
    'string.base': 'Job description must be a string',
    'string.max': 'Job description must not exceed 10,000 characters'
  }),
  industry: Joi.string().optional().allow('').max(100).messages({
    'string.base': 'Industry must be a string',
    'string.max': 'Industry must not exceed 100 characters'
  }),
  targetRole: Joi.string().optional().allow('').max(200).messages({
    'string.base': 'Target role must be a string',
    'string.max': 'Target role must not exceed 200 characters'
  })
});

const applyOptimizationSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  }),
  optimizationId: Joi.string().required().messages({
    'string.base': 'Optimization ID must be a string',
    'string.empty': 'Optimization ID is required',
    'any.required': 'Optimization ID is required'
  }),
  selectedSuggestions: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Selected suggestions must be an array',
    'string.base': 'Each suggestion must be a string'
  })
});

const industryTipsSchema = Joi.object({
  industry: Joi.string().required().min(2).max(100).messages({
    'string.base': 'Industry must be a string',
    'string.empty': 'Industry is required',
    'string.min': 'Industry must be at least 2 characters',
    'string.max': 'Industry must not exceed 100 characters',
    'any.required': 'Industry is required'
  }),
  role: Joi.string().required().min(2).max(200).messages({
    'string.base': 'Role must be a string',
    'string.empty': 'Role is required',
    'string.min': 'Role must be at least 2 characters',
    'string.max': 'Role must not exceed 200 characters',
    'any.required': 'Role is required'
  }),
  experienceLevel: Joi.string().valid('entry-level', 'mid-level', 'senior', 'executive').optional().messages({
    'string.base': 'Experience level must be a string',
    'any.only': 'Experience level must be one of: entry-level, mid-level, senior, executive'
  })
});

const generateDownloadSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  }),
  optimizationId: Joi.string().required().messages({
    'string.base': 'Optimization ID must be a string',
    'string.empty': 'Optimization ID is required',
    'any.required': 'Optimization ID is required'
  }),
  format: Joi.string().valid('pdf', 'docx').optional().default('pdf').messages({
    'string.base': 'Format must be a string',
    'any.only': 'Format must be either "pdf" or "docx"'
  })
});

/**
 * Validate optimization request
 */
export const validateOptimization = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = optimizationSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};

/**
 * Validate apply optimization request
 */
export const validateApplyOptimization = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = applyOptimizationSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};

/**
 * Validate industry tips request
 */
export const validateIndustryTips = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = industryTipsSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};

/**
 * Validate generate download request
 */
export const validateGenerateDownload = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = generateDownloadSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};