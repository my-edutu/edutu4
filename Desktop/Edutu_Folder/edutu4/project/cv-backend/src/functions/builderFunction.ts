import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from '../middleware/auth';
import { builderRouter } from '../routes/builder';
import { errorHandler } from '../middleware/errorHandler';

const app = express();

// Basic middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.use('/api/builder', authMiddleware, builderRouter);
app.use(errorHandler);

export const builderFunction = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB'
  })
  .https
  .onRequest(app);