import { Router, Request, Response } from 'express';
import { OpportunitiesController } from '../controllers/opportunitiesController';
import { validateQuery } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();
const opportunitiesController = new OpportunitiesController();

// Simplified opportunities endpoint for Edutu integration
router.get('/opportunities', 
  validateQuery([
    {
      field: 'q',
      required: true,
      type: 'string',
      min: 2,
      max: 100
    },
    {
      field: 'count',
      type: 'number',
      min: 1,
      max: 50
    }
  ]),
  async (req: Request, res: Response) => {
    try {
      // Transform Edutu-style parameters to internal format by modifying req.query directly
      const originalQuery = req.query;
      req.query = {
        topic: originalQuery.q,
        limit: originalQuery.count || '10',
        page: '1',
        refresh: originalQuery.refresh
      };

      await opportunitiesController.getOpportunities(req, res);
      
      // Restore original query
      req.query = originalQuery;
    } catch (error) {
      logger.error('Edutu integration endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Simple health check for Edutu
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get available opportunity categories
router.get('/categories', (req: Request, res: Response) => {
  res.json({
    success: true,
    categories: [
      {
        id: 'scholarships',
        name: 'Scholarships',
        description: 'Academic funding opportunities'
      },
      {
        id: 'internships',
        name: 'Internships',
        description: 'Professional experience opportunities'
      },
      {
        id: 'fellowships',
        name: 'Fellowships',
        description: 'Research and professional development programs'
      },
      {
        id: 'grants',
        name: 'Grants',
        description: 'Funding for projects and research'
      },
      {
        id: 'competitions',
        name: 'Competitions',
        description: 'Academic and professional competitions'
      },
      {
        id: 'study-abroad',
        name: 'Study Abroad',
        description: 'International education opportunities'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;