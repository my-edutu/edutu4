"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGenerateDownload = exports.validateIndustryTips = exports.validateApplyOptimization = exports.validateOptimization = void 0;
const joi_1 = __importDefault(require("joi"));
const errorHandler_1 = require("../middleware/errorHandler");
const optimizationSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    }),
    jobDescription: joi_1.default.string().optional().allow('').max(10000).messages({
        'string.base': 'Job description must be a string',
        'string.max': 'Job description must not exceed 10,000 characters'
    }),
    industry: joi_1.default.string().optional().allow('').max(100).messages({
        'string.base': 'Industry must be a string',
        'string.max': 'Industry must not exceed 100 characters'
    }),
    targetRole: joi_1.default.string().optional().allow('').max(200).messages({
        'string.base': 'Target role must be a string',
        'string.max': 'Target role must not exceed 200 characters'
    })
});
const applyOptimizationSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    }),
    optimizationId: joi_1.default.string().required().messages({
        'string.base': 'Optimization ID must be a string',
        'string.empty': 'Optimization ID is required',
        'any.required': 'Optimization ID is required'
    }),
    selectedSuggestions: joi_1.default.array().items(joi_1.default.string()).optional().messages({
        'array.base': 'Selected suggestions must be an array',
        'string.base': 'Each suggestion must be a string'
    })
});
const industryTipsSchema = joi_1.default.object({
    industry: joi_1.default.string().required().min(2).max(100).messages({
        'string.base': 'Industry must be a string',
        'string.empty': 'Industry is required',
        'string.min': 'Industry must be at least 2 characters',
        'string.max': 'Industry must not exceed 100 characters',
        'any.required': 'Industry is required'
    }),
    role: joi_1.default.string().required().min(2).max(200).messages({
        'string.base': 'Role must be a string',
        'string.empty': 'Role is required',
        'string.min': 'Role must be at least 2 characters',
        'string.max': 'Role must not exceed 200 characters',
        'any.required': 'Role is required'
    }),
    experienceLevel: joi_1.default.string().valid('entry-level', 'mid-level', 'senior', 'executive').optional().messages({
        'string.base': 'Experience level must be a string',
        'any.only': 'Experience level must be one of: entry-level, mid-level, senior, executive'
    })
});
const generateDownloadSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    }),
    optimizationId: joi_1.default.string().required().messages({
        'string.base': 'Optimization ID must be a string',
        'string.empty': 'Optimization ID is required',
        'any.required': 'Optimization ID is required'
    }),
    format: joi_1.default.string().valid('pdf', 'docx').optional().default('pdf').messages({
        'string.base': 'Format must be a string',
        'any.only': 'Format must be either "pdf" or "docx"'
    })
});
/**
 * Validate optimization request
 */
const validateOptimization = (req, res, next) => {
    const { error } = optimizationSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateOptimization = validateOptimization;
/**
 * Validate apply optimization request
 */
const validateApplyOptimization = (req, res, next) => {
    const { error } = applyOptimizationSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateApplyOptimization = validateApplyOptimization;
/**
 * Validate industry tips request
 */
const validateIndustryTips = (req, res, next) => {
    const { error } = industryTipsSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateIndustryTips = validateIndustryTips;
/**
 * Validate generate download request
 */
const validateGenerateDownload = (req, res, next) => {
    const { error } = generateDownloadSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateGenerateDownload = validateGenerateDownload;
//# sourceMappingURL=optimizationValidator.js.map