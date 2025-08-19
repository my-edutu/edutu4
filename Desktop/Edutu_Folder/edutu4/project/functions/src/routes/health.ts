/**
 * Health Check Routes - Firebase Functions Version
 */

import { Router } from 'express';
import * as admin from 'firebase-admin';

export function createHealthRouter(): Router {
  const router = Router();

  /**
   * Basic health check
   * GET /health
   */
  router.get('/', async (req, res) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Test Firebase connection
      let firebaseStatus = 'connected';
      try {
        await admin.firestore().collection('health').limit(1).get();
      } catch (error) {
        firebaseStatus = 'error';
        console.error('Firebase health check failed:', error);
      }

      res.status(200).json({
        status: 'healthy',
        timestamp,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        services: {
          firebase: firebaseStatus,
        },
        uptime: process.uptime()
      });

    } catch (error: any) {
      console.error('Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  /**
   * Detailed health check
   * GET /health/detailed
   */
  router.get('/detailed', async (req, res) => {
    try {
      const timestamp = new Date().toISOString();
      const checks: any = {};

      // Firebase Firestore check
      checks.firestore = await checkFirestore();

      // Memory usage check
      checks.memory = {
        used: process.memoryUsage(),
        status: 'ok'
      };

      const allHealthy = Object.values(checks).every((check: any) => check.status === 'ok');

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        checks,
        uptime: process.uptime()
      });

    } catch (error: any) {
      console.error('Detailed health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  return router;
}

/**
 * Check Firestore connectivity and basic operations
 */
async function checkFirestore(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Try to read from scholarships collection
    const snapshot = await admin.firestore()
      .collection('scholarships')
      .limit(1)
      .get();

    const responseTime = Date.now() - startTime;

    return {
      status: 'ok',
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('Firestore health check failed:', error);
    
    return {
      status: 'error',
      responseTime,
      error: error.message
    };
  }
}