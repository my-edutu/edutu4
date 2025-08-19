/**
 * Admin API Routes
 * Administrative endpoints for managing embeddings, scheduler, and system operations
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const schedulerService = require('../services/scheduler');
const {
  processAllScholarshipEmbeddings,
  syncScholarshipEmbeddings,
  getEmbeddingServiceStats,
  performEmbeddingMaintenance,
} = require('../services/embeddingService');
const { getEmbeddingStats, batchUpdateScholarshipEmbeddings } = require('../config/supabase');
const { getAllScholarships } = require('../config/firebase');
const { generateEmbeddings } = require('../config/ai');
const logger = require('../utils/logger');

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * Get system overview
 * GET /api/admin/overview
 */
router.get('/overview', async (req, res) => {
  try {
    logger.info('Admin overview requested');

    const overview = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      
      // Services status
      services: {
        scheduler: schedulerService.getStatus(),
        embeddings: await getEmbeddingServiceStats(),
      },
      
      // Quick stats
      stats: {
        totalScholarships: 0,
        totalEmbeddings: 0,
        lastSync: null,
      }
    };

    // Get scholarship count
    const scholarships = await getAllScholarships(1);
    overview.stats.totalScholarships = scholarships.length;

    // Get embedding stats
    const embeddingStats = await getEmbeddingStats();
    overview.stats.totalEmbeddings = embeddingStats.scholarshipEmbeddings + embeddingStats.userEmbeddings;
    overview.stats.lastSync = embeddingStats.lastUpdated;

    res.json({
      success: true,
      overview
    });

  } catch (error) {
    logger.error('Error getting admin overview:', error);
    res.status(500).json({
      error: 'Failed to get system overview',
      message: error.message
    });
  }
});

/**
 * Manage scheduler tasks
 * POST /api/admin/scheduler/:action
 */
router.post('/scheduler/:action', [
  param('action').isIn(['start', 'stop', 'restart', 'status']).withMessage('Invalid action'),
  body('taskName').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { action } = req.params;
    const { taskName } = req.body;

    logger.info(`Admin scheduler action: ${action}`, { taskName });

    let result;

    switch (action) {
      case 'start':
        if (schedulerService.getStatus().isRunning) {
          return res.status(400).json({
            error: 'Scheduler is already running'
          });
        }
        schedulerService.start();
        result = { message: 'Scheduler started successfully' };
        break;

      case 'stop':
        if (!schedulerService.getStatus().isRunning) {
          return res.status(400).json({
            error: 'Scheduler is not running'
          });
        }
        schedulerService.stop();
        result = { message: 'Scheduler stopped successfully' };
        break;

      case 'restart':
        schedulerService.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
        schedulerService.start();
        result = { message: 'Scheduler restarted successfully' };
        break;

      case 'status':
        result = schedulerService.getStatus();
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    logger.error('Error in scheduler action:', error);
    res.status(500).json({
      error: 'Scheduler action failed',
      message: error.message
    });
  }
});

/**
 * Run scheduler task manually
 * POST /api/admin/scheduler/run-task
 */
router.post('/scheduler/run-task', [
  body('taskName').isIn(['embeddingSync', 'maintenance', 'dailyCleanup', 'statsCollection']).withMessage('Invalid task name'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { taskName } = req.body;

    logger.info(`Manually running scheduler task: ${taskName}`);

    const result = await schedulerService.runTaskNow(taskName);

    res.json({
      success: true,
      taskName,
      result
    });

  } catch (error) {
    logger.error('Error running manual task:', error);
    res.status(500).json({
      error: 'Failed to run task',
      message: error.message
    });
  }
});

/**
 * Embedding management
 * POST /api/admin/embeddings/:action
 */
router.post('/embeddings/:action', [
  param('action').isIn(['sync', 'rebuild', 'stats', 'maintenance']).withMessage('Invalid action'),
  body('force').optional().isBoolean(),
  body('batchSize').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { action } = req.params;
    const { force = false, batchSize = 50 } = req.body;

    logger.info(`Admin embedding action: ${action}`, { force, batchSize });

    let result;

    switch (action) {
      case 'sync':
        result = await syncScholarshipEmbeddings();
        break;

      case 'rebuild':
        result = await processAllScholarshipEmbeddings({ force, batchSize });
        break;

      case 'stats':
        result = await getEmbeddingServiceStats();
        break;

      case 'maintenance':
        result = await performEmbeddingMaintenance();
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    logger.error('Error in embedding action:', error);
    res.status(500).json({
      error: 'Embedding action failed',
      message: error.message
    });
  }
});

/**
 * Test AI services
 * POST /api/admin/test-ai
 */
router.post('/test-ai', [
  body('service').optional().isIn(['gemini', 'openai', 'cohere']),
  body('testData').optional().isString(),
], async (req, res) => {
  try {
    const { service, testData = 'Admin test query' } = req.body;

    logger.info('Admin AI service test requested', { service });

    const { getAIClients } = require('../config/ai');
    const aiClients = getAIClients();
    const testResults = {};

    // Test specific service or all services
    const servicesToTest = service ? [service] : ['gemini', 'openai', 'cohere'];

    for (const serviceName of servicesToTest) {
      try {
        const startTime = Date.now();
        
        if (serviceName === 'gemini' && aiClients.gemini) {
          const model = aiClients.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const result = await model.generateContent(testData);
          const response = await result.response;
          
          testResults.gemini = {
            status: 'success',
            latency: Date.now() - startTime,
            responseLength: response.text().length,
            sample: response.text().substring(0, 100) + '...'
          };
        } else if (serviceName === 'openai' && aiClients.openai) {
          const response = await aiClients.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: testData,
          });
          
          testResults.openai = {
            status: 'success',
            latency: Date.now() - startTime,
            embeddingLength: response.data[0].embedding.length,
            usage: response.usage
          };
        } else if (serviceName === 'cohere' && aiClients.cohere) {
          const response = await aiClients.cohere.embed({
            texts: [testData],
            model: 'embed-english-light-v3.0',
          });
          
          testResults.cohere = {
            status: 'success',
            latency: Date.now() - startTime,
            embeddingLength: response.embeddings[0].length,
          };
        } else {
          testResults[serviceName] = {
            status: 'unavailable',
            message: `${serviceName} client not initialized`
          };
        }
        
      } catch (error) {
        testResults[serviceName] = {
          status: 'error',
          message: error.message,
          latency: Date.now() - startTime
        };
      }
    }

    res.json({
      success: true,
      testData,
      results: testResults
    });

  } catch (error) {
    logger.error('Error testing AI services:', error);
    res.status(500).json({
      error: 'AI service test failed',
      message: error.message
    });
  }
});

/**
 * System logs
 * GET /api/admin/logs
 */
router.get('/logs', [
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('since').optional().isISO8601(),
], async (req, res) => {
  try {
    const { level = 'info', limit = 100, since } = req.query;

    logger.info('Admin logs requested', { level, limit, since });

    // This is a simplified version - in production you might want to use a proper log aggregation service
    const fs = require('fs');
    const path = require('path');
    
    const logFile = level === 'error' ? 'logs/error.log' : 'logs/combined.log';
    const logPath = path.join(__dirname, '../../', logFile);
    
    if (!fs.existsSync(logPath)) {
      return res.json({
        success: true,
        logs: [],
        message: 'Log file not found'
      });
    }

    // Read and parse log file (simplified implementation)
    const logContent = fs.readFileSync(logPath, 'utf8');
    const logLines = logContent.split('\n')
      .filter(line => line.trim())
      .slice(-parseInt(limit))
      .reverse();

    const logs = logLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { message: line, timestamp: new Date().toISOString(), level: 'unknown' };
      }
    });

    res.json({
      success: true,
      logs,
      total: logs.length,
      filters: { level, limit, since }
    });

  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({
      error: 'Failed to fetch logs',
      message: error.message
    });
  }
});

/**
 * Database operations
 * POST /api/admin/database/:action
 */
router.post('/database/:action', [
  param('action').isIn(['vacuum', 'analyze', 'reindex']).withMessage('Invalid database action'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { action } = req.params;

    logger.info(`Admin database action: ${action}`);

    // Database maintenance operations (Supabase/PostgreSQL)
    const { getSupabase } = require('../config/supabase');
    const supabase = getSupabase();

    let result;

    switch (action) {
      case 'vacuum':
        // Note: VACUUM requires special permissions in Supabase
        result = { message: 'VACUUM operation requires database admin privileges' };
        break;

      case 'analyze':
        // Update table statistics
        const { data, error } = await supabase.rpc('get_embedding_statistics');
        if (error) throw error;
        result = { message: 'Database analysis completed', stats: data };
        break;

      case 'reindex':
        result = { message: 'REINDEX operation requires database admin privileges' };
        break;

      default:
        return res.status(400).json({ error: 'Invalid database action' });
    }

    res.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    logger.error('Error in database action:', error);
    res.status(500).json({
      error: 'Database action failed',
      message: error.message
    });
  }
});

module.exports = router;