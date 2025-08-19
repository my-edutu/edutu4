/**
 * Firebase Functions for Edutu AI Backend
 * Production deployment with scheduled tasks and API endpoints
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import API routes
import { createRoadmapRouter } from './routes/roadmaps';
import { createRecommendationRouter } from './routes/recommendations';
import { createChatRouter } from './routes/chat';
import { createHealthRouter } from './routes/health';
import { createActivityRouter } from './routes/activity';
import { createGoalsRouter } from './routes/goals';
import { createAdminRouter } from './routes/admin';

// Import Turnstile routes
import { verifyTurnstile, signupWithTurnstile } from './routes/turnstile';

// Import scheduled functions
import { rssScraperScheduled } from './scheduled/rssScraper';
import { embeddingRefreshScheduled } from './scheduled/embeddingRefresh';
import { verifyFirestoreData } from './utils/verifyFirestore';
import {
  dailyAnalyticsGeneration,
  weeklyGoalReminders,
  monthlyGoalAnalytics,
  progressStallDetection,
  autoModerationCheck,
  weeklyDataCleanup
} from './scheduled/goalsScheduled';

// Import simple AI chat for immediate functionality
import { simpleAiChat } from './simpleAiChat';
import { simpleChatMinimal } from './simpleChatMinimal';

// Import seed functions
import { seedTemplatesFunction } from './utils/seedGoalTemplates';

// Create Express app for API
const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

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

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/roadmaps', createRoadmapRouter());
app.use('/api/recommendations', createRecommendationRouter());
app.use('/api/chat', createChatRouter());
app.use('/api/activity', createActivityRouter());
app.use('/api/goals', createGoalsRouter());
app.use('/api/admin', createAdminRouter());
app.use('/health', createHealthRouter());

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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Export the main API function
export const api = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
    maxInstances: 10
  })
  .https
  .onRequest(app);

// Export Turnstile functions
export { verifyTurnstile, signupWithTurnstile };

// Scheduled Functions

// RSS Scraper - runs every 6 hours
export const rssScraperCron = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .pubsub
  .schedule('0 */6 * * *') // Every 6 hours
  .timeZone('UTC')
  .onRun(rssScraperScheduled);

// Embedding Refresh - runs daily at 2 AM UTC
export const embeddingRefreshCron = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .pubsub
  .schedule('0 2 * * *') // Daily at 2 AM UTC
  .timeZone('UTC')
  .onRun(embeddingRefreshScheduled);

// Goals System Scheduled Functions

// Daily Analytics - runs daily at 1 AM UTC
export const dailyGoalAnalytics = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .pubsub
  .schedule('0 1 * * *') // Daily at 1 AM UTC
  .timeZone('UTC')
  .onRun(dailyAnalyticsGeneration);

// Weekly Goal Reminders - runs every Monday at 9 AM UTC
export const weeklyReminders = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .pubsub
  .schedule('0 9 * * 1') // Every Monday at 9 AM UTC
  .timeZone('UTC')
  .onRun(weeklyGoalReminders);

// Monthly Analytics - runs on 1st of each month at 3 AM UTC
export const monthlyAnalytics = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .pubsub
  .schedule('0 3 1 * *') // 1st of every month at 3 AM UTC
  .timeZone('UTC')
  .onRun(monthlyGoalAnalytics);

// Progress Stall Detection - runs daily at 6 PM UTC
export const stallDetection = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .pubsub
  .schedule('0 18 * * *') // Daily at 6 PM UTC
  .timeZone('UTC')
  .onRun(progressStallDetection);

// Auto-Moderation - runs every 4 hours
export const autoModeration = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .pubsub
  .schedule('0 */4 * * *') // Every 4 hours
  .timeZone('UTC')
  .onRun(autoModerationCheck);

// Data Cleanup - runs every Sunday at 4 AM UTC
export const dataCleanup = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .pubsub
  .schedule('0 4 * * 0') // Every Sunday at 4 AM UTC
  .timeZone('UTC')
  .onRun(weeklyDataCleanup);

// Utility Functions

// Manual verification trigger
export const verifyDataIntegrity = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https
  .onCall(verifyFirestoreData);

// Health check function
export const healthCheck = functions
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
export const simpleChat = simpleAiChat;

// Minimal AI Chat - Works without external API dependencies
export const simpleChatWork = simpleChatMinimal;

// Utility Functions for Goals System

// Seed goal templates - One-time setup function
export const seedGoalTemplates = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .https
  .onRequest(seedTemplatesFunction);