"use strict";
/**
 * Edutu CV Management Backend
 * Enterprise-grade serverless architecture using Firebase Cloud Functions
 *
 * @author Edutu Team
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.builderFunction = exports.atsFunction = exports.optimizeFunction = exports.uploadFunction = exports.cv = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./middleware/logger");
// Import route handlers
const upload_1 = require("./routes/upload");
const optimization_1 = require("./routes/optimization");
const ats_1 = require("./routes/ats");
const builder_1 = require("./routes/builder");
const cv_1 = require("./routes/cv");
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
// Initialize Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
// CORS configuration
const corsOptions = {
    origin: ((_a = process.env.CORS_ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || [
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use((0, cors_1.default)(corsOptions));
// Basic middleware
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use(logger_1.requestLogger);
// Rate limiting
app.use(rateLimiter_1.rateLimiter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'edutu-cv-backend'
    });
});
// API Routes (all require authentication)
app.use('/api/upload', auth_1.authMiddleware, upload_1.uploadRouter);
app.use('/api/optimize', auth_1.authMiddleware, optimization_1.optimizationRouter);
app.use('/api/ats', auth_1.authMiddleware, ats_1.atsRouter);
app.use('/api/builder', auth_1.authMiddleware, builder_1.builderRouter);
app.use('/api/cv', auth_1.authMiddleware, cv_1.cvRouter);
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Export the main Cloud Function
exports.cv = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '2GB',
    maxInstances: 100
})
    .https
    .onRequest(app);
// Export individual functions for granular deployment
var uploadFunction_1 = require("./functions/uploadFunction");
Object.defineProperty(exports, "uploadFunction", { enumerable: true, get: function () { return uploadFunction_1.uploadFunction; } });
var optimizeFunction_1 = require("./functions/optimizeFunction");
Object.defineProperty(exports, "optimizeFunction", { enumerable: true, get: function () { return optimizeFunction_1.optimizeFunction; } });
var atsFunction_1 = require("./functions/atsFunction");
Object.defineProperty(exports, "atsFunction", { enumerable: true, get: function () { return atsFunction_1.atsFunction; } });
var builderFunction_1 = require("./functions/builderFunction");
Object.defineProperty(exports, "builderFunction", { enumerable: true, get: function () { return builderFunction_1.builderFunction; } });
//# sourceMappingURL=index-full.js.map