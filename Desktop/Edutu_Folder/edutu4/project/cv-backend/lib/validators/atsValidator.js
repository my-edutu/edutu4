"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateATSSimulation = exports.validateATSOptimization = exports.validateATS = void 0;
const joi_1 = __importDefault(require("joi"));
const errorHandler_1 = require("../middleware/errorHandler");
const atsCheckSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    }),
    jobDescription: joi_1.default.string().optional().allow('').max(15000).messages({
        'string.base': 'Job description must be a string',
        'string.max': 'Job description must not exceed 15,000 characters'
    })
});
const atsOptimizeSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    }),
    analysisId: joi_1.default.string().required().messages({
        'string.base': 'Analysis ID must be a string',
        'string.empty': 'Analysis ID is required',
        'any.required': 'Analysis ID is required'
    }),
    selectedFixes: joi_1.default.array().items(joi_1.default.string()).optional().messages({
        'array.base': 'Selected fixes must be an array',
        'string.base': 'Each fix must be a string'
    })
});
const atsSimulateSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    }),
    jobDescription: joi_1.default.string().optional().allow('').max(15000).messages({
        'string.base': 'Job description must be a string',
        'string.max': 'Job description must not exceed 15,000 characters'
    }),
    atsSystem: joi_1.default.string().valid('generic', 'workday', 'taleo', 'greenhouse', 'lever', 'bamboohr').optional().default('generic').messages({
        'string.base': 'ATS system must be a string',
        'any.only': 'ATS system must be one of: generic, workday, taleo, greenhouse, lever, bamboohr'
    })
});
/**
 * Validate ATS check request
 */
const validateATS = (req, res, next) => {
    const { error } = atsCheckSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateATS = validateATS;
/**
 * Validate ATS optimization request
 */
const validateATSOptimization = (req, res, next) => {
    const { error } = atsOptimizeSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateATSOptimization = validateATSOptimization;
/**
 * Validate ATS simulation request
 */
const validateATSSimulation = (req, res, next) => {
    const { error } = atsSimulateSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateATSSimulation = validateATSSimulation;
//# sourceMappingURL=atsValidator.js.map