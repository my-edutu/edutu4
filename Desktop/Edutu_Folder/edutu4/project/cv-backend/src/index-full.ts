/**
 * Edutu CV Management Backend
 * Enterprise-grade serverless architecture using Firebase Cloud Functions
 * 
 * @author Edutu Team
 * @version 1.0.0
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

// Import route handlers
import { uploadRouter } from './routes/upload';
import { optimizationRouter } from './routes/optimization';
import { atsRouter } from './routes/ats';
import { builderRouter } from './routes/builder';
import { cvRouter } from './routes/cv';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

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
app.use('/api/upload', authMiddleware, uploadRouter);
app.use('/api/optimize', authMiddleware, optimizationRouter);
app.use('/api/ats', authMiddleware, atsRouter);
app.use('/api/builder', authMiddleware, builderRouter);
app.use('/api/cv', authMiddleware, cvRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Export the main Cloud Function
export const cv = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '2GB',
    maxInstances: 100
  })
  .https
  .onRequest(app);

// Export individual functions for granular deployment
export { uploadFunction } from './functions/uploadFunction';
export { optimizeFunction } from './functions/optimizeFunction';
export { atsFunction } from './functions/atsFunction';
export { builderFunction } from './functions/builderFunction';