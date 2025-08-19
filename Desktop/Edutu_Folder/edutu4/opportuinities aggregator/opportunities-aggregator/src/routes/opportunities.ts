import { Router } from 'express';
import { OpportunitiesController } from '../controllers/opportunitiesController';
import { logger } from '../utils/logger';
import { validateQuery, opportunitiesValidationRules } from '../middleware/validation';

const router = Router();

// Initialize controller in enhanced mode (set to false for legacy compatibility)
const ENHANCED_MODE = process.env.ENHANCED_MODE !== 'false';
const opportunitiesController = new OpportunitiesController(!ENHANCED_MODE);

logger.info('Opportunities routes initialized', { 
  legacyMode: !ENHANCED_MODE,
  enhancedFeatures: ENHANCED_MODE 
});

router.get('/', validateQuery(opportunitiesValidationRules), async (req, res) => {
  await opportunitiesController.getOpportunities(req, res);
});

router.get('/cache/stats', async (req, res) => {
  await opportunitiesController.getCacheStats(req, res);
});

router.delete('/cache', async (req, res) => {
  await opportunitiesController.clearCache(req, res);
});

// Enhanced endpoints (only available in enhanced mode)
if (ENHANCED_MODE) {
  // Detailed health status with data source information
  router.get('/health', async (req, res) => {
    await opportunitiesController.getHealthStatus(req, res);
  });
  
  // Find similar opportunities in cache
  router.get('/similar', validateQuery([
    {
      field: 'query',
      required: false,
      type: 'string',
      min: 1,
      max: 200
    },
    {
      field: 'threshold',
      required: false,
      type: 'number',
      min: 0.1,
      max: 1.0
    }
  ]), async (req, res) => {
    await opportunitiesController.searchSimilar(req, res);
  });
  
  // Get configuration and statistics
  router.get('/config', (req, res) => {
    try {
      const config = opportunitiesController.getConfig();
      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get configuration', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Toggle legacy mode (for testing)
  router.post('/mode', (req, res) => {
    try {
      const { legacy } = req.body;
      if (typeof legacy !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'legacy parameter must be a boolean',
          timestamp: new Date().toISOString()
        });
      }
      
      opportunitiesController.setLegacyMode(legacy);
      
      res.json({
        success: true,
        message: `Mode switched to ${legacy ? 'legacy' : 'enhanced'}`,
        legacyMode: legacy,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to switch mode', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to switch mode',
        timestamp: new Date().toISOString()
      });
    }
  });
  
} else {
  // Legacy health endpoint
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      mode: 'legacy'
    });
  });
}

// Add middleware to log route usage
router.use((req, res, next) => {
  logger.debug('Opportunities route accessed', {
    path: req.path,
    method: req.method,
    query: req.query,
    enhanced: ENHANCED_MODE
  });
  next();
});

export default router;