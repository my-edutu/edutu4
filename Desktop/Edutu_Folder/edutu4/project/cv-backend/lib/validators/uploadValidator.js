"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileConstraints = exports.validateUpload = void 0;
const joi_1 = __importDefault(require("joi"));
const errorHandler_1 = require("../middleware/errorHandler");
const convertSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    }),
    toFormat: joi_1.default.string().valid('pdf', 'docx').required().messages({
        'string.base': 'Format must be a string',
        'any.only': 'Format must be either "pdf" or "docx"',
        'any.required': 'Target format is required'
    })
});
const deleteSchema = joi_1.default.object({
    cvId: joi_1.default.string().required().messages({
        'string.base': 'CV ID must be a string',
        'string.empty': 'CV ID is required',
        'any.required': 'CV ID is required'
    })
});
/**
 * Validate upload requests
 */
const validateUpload = (req, res, next) => {
    const { error } = convertSchema.validate(req.body);
    if (error) {
        const validationError = (0, errorHandler_1.formatValidationError)(error);
        return next(validationError);
    }
    next();
};
exports.validateUpload = validateUpload;
/**
 * Validate file constraints
 */
const validateFileConstraints = (req, res, next) => {
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
exports.validateFileConstraints = validateFileConstraints;
//# sourceMappingURL=uploadValidator.js.map