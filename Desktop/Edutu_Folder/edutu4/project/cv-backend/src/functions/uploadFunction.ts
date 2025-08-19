import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from '../middleware/auth';
import { uploadRateLimit } from '../middleware/rateLimiter';
import { uploadRouter } from '../routes/upload';
import { errorHandler } from '../middleware/errorHandler';

const app = express();

// Basic middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/upload', authMiddleware, uploadRateLimit, uploadRouter);
app.use(errorHandler);

export const uploadFunction = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '2GB'
  })
  .https
  .onRequest(app);