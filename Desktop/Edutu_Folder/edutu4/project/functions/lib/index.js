"use strict";
/**
 * Firebase Functions for Edutu AI Backend
 * Production deployment with scheduled tasks and API endpoints
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedGoalTemplates = exports.simpleChatWork = exports.simpleChat = exports.healthCheck = exports.verifyDataIntegrity = exports.dataCleanup = exports.autoModeration = exports.stallDetection = exports.monthlyAnalytics = exports.weeklyReminders = exports.dailyGoalAnalytics = exports.embeddingRefreshCron = exports.rssScraperCron = exports.signupWithTurnstile = exports.verifyTurnstile = exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
// Import API routes
const roadmaps_1 = require("./routes/roadmaps");
const recommendations_1 = require("./routes/recommendations");
const chat_1 = require("./routes/chat");
const health_1 = require("./routes/health");
const activity_1 = require("./routes/activity");
const goals_1 = require("./routes/goals");
const admin_1 = require("./routes/admin");
// Import Turnstile routes
const turnstile_1 = require("./routes/turnstile");
Object.defineProperty(exports, "verifyTurnstile", { enumerable: true, get: function () { return turnstile_1.verifyTurnstile; } });
Object.defineProperty(exports, "signupWithTurnstile", { enumerable: true, get: function () { return turnstile_1.signupWithTurnstile; } });
// Import scheduled functions
const rssScraper_1 = require("./scheduled/rssScraper");
const embeddingRefresh_1 = require("./scheduled/embeddingRefresh");
const verifyFirestore_1 = require("./utils/verifyFirestore");
const goalsScheduled_1 = require("./scheduled/goalsScheduled");
// Import simple AI chat for immediate functionality
const simpleAiChat_1 = require("./simpleAiChat");
const simpleChatMinimal_1 = require("./simpleChatMinimal");
// Import seed functions
const seedGoalTemplates_1 = require("./utils/seedGoalTemplates");
// Create Express app for API
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
// CORS configuration
const corsOptions = {
    origin: [
        'https://edutu-ai.web.app',
        'https://edutu-ai.firebaseapp.com',
        /^https:\/\/.*\.edutu\.ai$/,
        ...(process.env.NODE_ENV !== 'production' ? [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5174'
        ] : [])
    ],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// API routes
app.use('/api/roadmaps', (0, roadmaps_1.createRoadmapRouter)());
app.use('/api/recommendations', (0, recommendations_1.createRecommendationRouter)());
app.use('/api/chat', (0, chat_1.createChatRouter)());
app.use('/api/activity', (0, activity_1.createActivityRouter)());
app.use('/api/goals', (0, goals_1.createGoalsRouter)());
app.use('/api/admin', (0, admin_1.createAdminRouter)());
app.use('/health', (0, health_1.createHealthRouter)());
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Edutu AI Backend',
        version: '1.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'production',
        endpoints: {
            roadmaps: '/api/roadmaps',
            recommendations: '/api/recommendations',
            chat: '/api/chat',
            activity: '/api/activity',
            goals: '/api/goals',
            admin: '/api/admin',
            health: '/health'
        },
        timestamp: new Date().toISOString()
    });
});
// Error handling
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        timestamp: new Date().toISOString()
    });
});
// Export the main API function
exports.api = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
    maxInstances: 10
})
    .https
    .onRequest(app);
// Scheduled Functions
// RSS Scraper - runs every 6 hours
exports.rssScraperCron = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
})
    .pubsub
    .schedule('0 */6 * * *') // Every 6 hours
    .timeZone('UTC')
    .onRun(rssScraper_1.rssScraperScheduled);
// Embedding Refresh - runs daily at 2 AM UTC
exports.embeddingRefreshCron = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
})
    .pubsub
    .schedule('0 2 * * *') // Daily at 2 AM UTC
    .timeZone('UTC')
    .onRun(embeddingRefresh_1.embeddingRefreshScheduled);
// Goals System Scheduled Functions
// Daily Analytics - runs daily at 1 AM UTC
exports.dailyGoalAnalytics = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
})
    .pubsub
    .schedule('0 1 * * *') // Daily at 1 AM UTC
    .timeZone('UTC')
    .onRun(goalsScheduled_1.dailyAnalyticsGeneration);
// Weekly Goal Reminders - runs every Monday at 9 AM UTC
exports.weeklyReminders = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
})
    .pubsub
    .schedule('0 9 * * 1') // Every Monday at 9 AM UTC
    .timeZone('UTC')
    .onRun(goalsScheduled_1.weeklyGoalReminders);
// Monthly Analytics - runs on 1st of each month at 3 AM UTC
exports.monthlyAnalytics = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
})
    .pubsub
    .schedule('0 3 1 * *') // 1st of every month at 3 AM UTC
    .timeZone('UTC')
    .onRun(goalsScheduled_1.monthlyGoalAnalytics);
// Progress Stall Detection - runs daily at 6 PM UTC
exports.stallDetection = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
})
    .pubsub
    .schedule('0 18 * * *') // Daily at 6 PM UTC
    .timeZone('UTC')
    .onRun(goalsScheduled_1.progressStallDetection);
// Auto-Moderation - runs every 4 hours
exports.autoModeration = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
})
    .pubsub
    .schedule('0 */4 * * *') // Every 4 hours
    .timeZone('UTC')
    .onRun(goalsScheduled_1.autoModerationCheck);
// Data Cleanup - runs every Sunday at 4 AM UTC
exports.dataCleanup = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
})
    .pubsub
    .schedule('0 4 * * 0') // Every Sunday at 4 AM UTC
    .timeZone('UTC')
    .onRun(goalsScheduled_1.weeklyDataCleanup);
// Utility Functions
// Manual verification trigger
exports.verifyDataIntegrity = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
})
    .https
    .onCall(verifyFirestore_1.verifyFirestoreData);
// Health check function
exports.healthCheck = functions
    .region('us-central1')
    .https
    .onRequest((req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// Simple AI Chat - Direct endpoint for immediate functionality
exports.simpleChat = simpleAiChat_1.simpleAiChat;
// Minimal AI Chat - Works without external API dependencies
exports.simpleChatWork = simpleChatMinimal_1.simpleChatMinimal;
// Utility Functions for Goals System
// Seed goal templates - One-time setup function
exports.seedGoalTemplates = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
})
    .https
    .onRequest(seedGoalTemplates_1.seedTemplatesFunction);
//# sourceMappingURL=index.js.map