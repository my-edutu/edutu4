import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { formatValidationError } from '../middleware/errorHandler';

const atsCheckSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  }),
  jobDescription: Joi.string().optional().allow('').max(15000).messages({
    'string.base': 'Job description must be a string',
    'string.max': 'Job description must not exceed 15,000 characters'
  })
});

const atsOptimizeSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  }),
  analysisId: Joi.string().required().messages({
    'string.base': 'Analysis ID must be a string',
    'string.empty': 'Analysis ID is required',
    'any.required': 'Analysis ID is required'
  }),
  selectedFixes: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Selected fixes must be an array',
    'string.base': 'Each fix must be a string'
  })
});

const atsSimulateSchema = Joi.object({
  cvId: Joi.string().required().messages({
    'string.base': 'CV ID must be a string',
    'string.empty': 'CV ID is required',
    'any.required': 'CV ID is required'
  }),
  jobDescription: Joi.string().optional().allow('').max(15000).messages({
    'string.base': 'Job description must be a string',
    'string.max': 'Job description must not exceed 15,000 characters'
  }),
  atsSystem: Joi.string().valid('generic', 'workday', 'taleo', 'greenhouse', 'lever', 'bamboohr').optional().default('generic').messages({
    'string.base': 'ATS system must be a string',
    'any.only': 'ATS system must be one of: generic, workday, taleo, greenhouse, lever, bamboohr'
  })
});

/**
 * Validate ATS check request
 */
export const validateATS = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = atsCheckSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};

/**
 * Validate ATS optimization request
 */
export const validateATSOptimization = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = atsOptimizeSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};

/**
 * Validate ATS simulation request
 */
export const validateATSSimulation = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = atsSimulateSchema.validate(req.body);
  
  if (error) {
    const validationError = formatValidationError(error);
    return next(validationError);
  }
  
  next();
};