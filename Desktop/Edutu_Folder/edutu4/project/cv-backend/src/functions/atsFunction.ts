import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimiter';
import { atsRouter } from '../routes/ats';
import { errorHandler } from '../middleware/errorHandler';

const app = express();

// Basic middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.use('/api/ats', authMiddleware, aiRateLimit, atsRouter);
app.use(errorHandler);

export const atsFunction = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .https
  .onRequest(app);