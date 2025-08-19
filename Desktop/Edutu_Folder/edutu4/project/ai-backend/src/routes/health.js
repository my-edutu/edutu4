/**
 * Health Check Routes
 * Provides system health monitoring and status endpoints
 */

const express = require('express');
const { getFirestore } = require('../config/firebase');
const { getSupabase, getEmbeddingStats } = require('../config/supabase');
const { getAIClients } = require('../config/ai');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Basic health check
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Detailed health check with dependency status
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  try {
    const checks = {};
    let overallStatus = 'healthy';

    // Check Firebase connection
    try {
      const db = getFirestore();
      await db.collection('scholarships').limit(1).get();
      checks.firebase = {
        status: 'healthy',
        message: 'Connected to Firestore',
      };
    } catch (error) {
      checks.firebase = {
        status: 'unhealthy',
        message: error.message,
      };
      overallStatus = 'degraded';
    }

    // Check Supabase connection
    try {
      const supabase = getSupabase();
      const stats = await getEmbeddingStats();
      checks.supabase = {
        status: 'healthy',
        message: 'Connected to Supabase vector database',
        stats,
      };
    } catch (error) {
      checks.supabase = {
        status: 'unhealthy',
        message: error.message,
      };
      overallStatus = 'degraded';
    }

    // Check AI services
    const aiClients = getAIClients();
    checks.ai = {
      status: 'healthy',
      services: {
        gemini: aiClients.gemini ? 'available' : 'unavailable',
        openai: aiClients.openai ? 'available' : 'unavailable',
        cohere: aiClients.cohere ? 'available' : 'unavailable',
      },
    };

    if (!aiClients.gemini && !aiClients.openai && !aiClients.cohere) {
      checks.ai.status = 'unhealthy';
      overallStatus = 'unhealthy';
    }

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks,
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * AI services health check
 * GET /health/ai
 */
router.get('/ai', async (req, res) => {
  try {
    const aiClients = getAIClients();
    const checks = {};
    
    // Test Gemini
    if (aiClients.gemini) {
      try {
        const model = aiClients.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Health check test');
        const response = await result.response;
        checks.gemini = {
          status: 'healthy',
          message: 'Gemini API responding',
          responseLength: response.text().length,
        };
      } catch (error) {
        checks.gemini = {
          status: 'unhealthy',
          message: error.message,
        };
      }
    } else {
      checks.gemini = {
        status: 'unavailable',
        message: 'Gemini client not initialized',
      };
    }

    // Test OpenAI
    if (aiClients.openai) {
      try {
        const response = await aiClients.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: 'health check',
        });
        checks.openai = {
          status: 'healthy',
          message: 'OpenAI API responding',
          embeddingLength: response.data[0].embedding.length,
        };
      } catch (error) {
        checks.openai = {
          status: 'unhealthy',
          message: error.message,
        };
      }
    } else {
      checks.openai = {
        status: 'unavailable',
        message: 'OpenAI client not initialized',
      };
    }

    // Test Cohere
    if (aiClients.cohere) {
      try {
        const response = await aiClients.cohere.embed({
          texts: ['health check'],
          model: 'embed-english-light-v3.0',
        });
        checks.cohere = {
          status: 'healthy',
          message: 'Cohere API responding',
          embeddingLength: response.embeddings[0].length,
        };
      } catch (error) {
        checks.cohere = {
          status: 'unhealthy',
          message: error.message,
        };
      }
    } else {
      checks.cohere = {
        status: 'unavailable',
        message: 'Cohere client not initialized',
      };
    }

    const healthyServices = Object.values(checks).filter(c => c.status === 'healthy').length;
    const overallStatus = healthyServices > 0 ? 'healthy' : 'unhealthy';

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: checks,
      summary: `${healthyServices}/${Object.keys(checks).length} AI services healthy`,
    });

  } catch (error) {
    logger.error('AI health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Database health check
 * GET /health/database
 */
router.get('/database', async (req, res) => {
  try {
    const checks = {};
    let overallStatus = 'healthy';

    // Test Firestore
    try {
      const db = getFirestore();
      const start = Date.now();
      const snapshot = await db.collection('scholarships').limit(1).get();
      const latency = Date.now() - start;
      
      checks.firestore = {
        status: 'healthy',
        message: 'Firestore connection successful',
        latency: `${latency}ms`,
        documentsFound: snapshot.size,
      };
    } catch (error) {
      checks.firestore = {
        status: 'unhealthy',
        message: error.message,
      };
      overallStatus = 'unhealthy';
    }

    // Test Supabase
    try {
      const start = Date.now();
      const stats = await getEmbeddingStats();
      const latency = Date.now() - start;
      
      checks.supabase = {
        status: 'healthy',
        message: 'Supabase connection successful',
        latency: `${latency}ms`,
        stats,
      };
    } catch (error) {
      checks.supabase = {
        status: 'unhealthy',
        message: error.message,
      };
      overallStatus = 'unhealthy';
    }

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      databases: checks,
    });

  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * System metrics endpoint
 * GET /health/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development',
      
      // Custom metrics
      custom: {
        totalEmbeddings: 0,
        totalUsers: 0,
        totalRoadmaps: 0,
        totalChatMessages: 0,
      }
    };

    // Get database metrics
    try {
      const embeddingStats = await getEmbeddingStats();
      metrics.custom.totalEmbeddings = embeddingStats.scholarshipEmbeddings + embeddingStats.userEmbeddings;

      const db = getFirestore();
      
      // Count users (limit for performance)
      const usersSnapshot = await db.collection('users').select().limit(1000).get();
      metrics.custom.totalUsers = usersSnapshot.size;
      
      // Count roadmaps (limit for performance)  
      const roadmapsSnapshot = await db.collection('userRoadmaps').select().limit(1000).get();
      metrics.custom.totalRoadmaps = roadmapsSnapshot.size;
      
      // Count chat messages (limit for performance)
      const chatSnapshot = await db.collection('chatHistory').select().limit(1000).get();
      metrics.custom.totalChatMessages = chatSnapshot.size;
      
    } catch (error) {
      logger.warn('Could not fetch database metrics:', error);
    }

    res.json(metrics);

  } catch (error) {
    logger.error('Metrics collection failed:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness probe - for Kubernetes deployments
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all required services are available
    const requiredChecks = [];

    // Firebase is required
    requiredChecks.push(
      getFirestore().collection('scholarships').limit(1).get()
    );

    // At least one AI service is required
    const aiClients = getAIClients();
    if (!aiClients.gemini && !aiClients.openai && !aiClients.cohere) {
      throw new Error('No AI services available');
    }

    await Promise.all(requiredChecks);

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to accept requests',
    });

  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Liveness probe - for Kubernetes deployments
 * GET /health/live
 */
router.get('/live', (req, res) => {
  // Simple liveness check - just verify the process is running
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;