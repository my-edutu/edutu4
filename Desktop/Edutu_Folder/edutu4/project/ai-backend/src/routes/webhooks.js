/**
 * Webhooks API Routes
 * Handles incoming data from external services like the RSS scraper
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  generateEmbeddings,
} = require('../config/ai');
const {
  storeScholarshipEmbedding,
  batchUpdateScholarshipEmbeddings,
} = require('../config/supabase');
const {
  getAllScholarships,
  getFirestore,
} = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Webhook for RSS scraper - generates embeddings for new scholarships
 * POST /api/webhooks/scholarships/new
 */
router.post('/scholarships/new', [
  body('scholarshipIds').isArray().withMessage('Scholarship IDs must be an array'),
  body('source').optional().isString().withMessage('Source must be a string'),
], async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors.array()
      });
    }

    const { scholarshipIds, source = 'rss-scraper' } = req.body;

    logger.info(`Processing ${scholarshipIds.length} new scholarships from ${source}`);

    const db = getFirestore();
    let processed = 0;
    let errors = 0;

    // Process scholarships in batches to avoid overwhelming the AI service
    const batchSize = 5;
    for (let i = 0; i < scholarshipIds.length; i += batchSize) {
      const batch = scholarshipIds.slice(i, i + batchSize);
      
      try {
        // Get scholarship documents
        const scholarshipPromises = batch.map(id => 
          db.collection('scholarships').doc(id).get()
        );
        
        const scholarshipDocs = await Promise.all(scholarshipPromises);
        const validScholarships = [];
        
        for (const doc of scholarshipDocs) {
          if (doc.exists) {
            validScholarships.push({
              id: doc.id,
              ...doc.data()
            });
          }
        }

        if (validScholarships.length === 0) {
          continue;
        }

        // Generate embeddings
        const texts = validScholarships.map(s => 
          `${s.title} ${s.summary} ${s.category} ${s.provider} ${s.location} ${s.requirements} ${s.benefits}`
        );
        
        logger.debug(`Generating embeddings for batch of ${texts.length} scholarships`);
        const embeddings = await generateEmbeddings(texts);
        
        // Store embeddings in vector database
        for (let j = 0; j < validScholarships.length; j++) {
          const scholarship = validScholarships[j];
          const embedding = embeddings[j] || embeddings; // Handle single vs array response
          
          try {
            await storeScholarshipEmbedding(scholarship.id, embedding, {
              title: scholarship.title,
              summary: scholarship.summary,
              category: scholarship.category,
              provider: scholarship.provider,
              location: scholarship.location,
              deadline: scholarship.deadline
            });
            
            processed++;
            logger.debug(`Generated embedding for scholarship: ${scholarship.title}`);
            
          } catch (embeddingError) {
            errors++;
            logger.error(`Failed to store embedding for scholarship ${scholarship.id}:`, embeddingError);
          }
        }
        
        // Add delay between batches to respect API limits
        if (i + batchSize < scholarshipIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (batchError) {
        logger.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, batchError);
        errors += batch.length;
      }
    }

    logger.info(`Webhook processing completed: ${processed} embeddings generated, ${errors} errors`);

    res.json({
      success: true,
      processed,
      errors,
      message: `Generated embeddings for ${processed} scholarships`
    });

  } catch (error) {
    logger.error('Error in scholarship webhook:', error);
    res.status(500).json({
      error: 'Failed to process scholarships',
      message: error.message
    });
  }
});

/**
 * Webhook for RSS scraper - bulk update all scholarship embeddings
 * POST /api/webhooks/scholarships/refresh-all
 */
router.post('/scholarships/refresh-all', async (req, res) => {
  try {
    logger.info('Starting bulk embedding refresh via webhook');

    // Get all scholarships
    const scholarships = await getAllScholarships();
    
    if (scholarships.length === 0) {
      return res.json({
        success: true,
        processed: 0,
        message: 'No scholarships found to process'
      });
    }

    // Generate embeddings for all scholarships
    const texts = scholarships.map(s => 
      `${s.title} ${s.summary} ${s.category} ${s.provider} ${s.location} ${s.requirements} ${s.benefits}`
    );
    
    logger.info(`Generating embeddings for ${texts.length} scholarships`);
    const embeddings = await generateEmbeddings(texts);
    
    // Store in vector database
    await batchUpdateScholarshipEmbeddings(scholarships, embeddings);

    logger.info(`Bulk embedding refresh completed: ${scholarships.length} scholarships processed`);

    res.json({
      success: true,
      processed: scholarships.length,
      message: `Refreshed embeddings for ${scholarships.length} scholarships`
    });

  } catch (error) {
    logger.error('Error in bulk refresh webhook:', error);
    res.status(500).json({
      error: 'Failed to refresh embeddings',
      message: error.message
    });
  }
});

/**
 * Webhook for external integrations
 * POST /api/webhooks/integration/:source
 */
router.post('/integration/:source', [
  body('action').isString().notEmpty().withMessage('Action is required'),
  body('data').isObject().withMessage('Data must be an object'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { source } = req.params;
    const { action, data } = req.body;

    logger.info(`Received webhook from ${source}: ${action}`);

    switch (action) {
      case 'scholarship_created':
        await handleScholarshipCreated(data);
        break;
      case 'scholarship_updated':
        await handleScholarshipUpdated(data);
        break;
      case 'scholarship_deleted':
        await handleScholarshipDeleted(data);
        break;
      case 'user_activity':
        await handleUserActivity(data);
        break;
      default:
        logger.warn(`Unknown webhook action: ${action} from ${source}`);
        return res.status(400).json({
          error: 'Unknown action',
          action
        });
    }

    res.json({
      success: true,
      message: `Processed ${action} from ${source}`
    });

  } catch (error) {
    logger.error('Error in integration webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

/**
 * Health check for webhook endpoints
 * GET /api/webhooks/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'webhooks',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/webhooks/scholarships/new',
      '/api/webhooks/scholarships/refresh-all',
      '/api/webhooks/integration/:source'
    ]
  });
});

/**
 * Helper function to handle scholarship creation
 */
async function handleScholarshipCreated(data) {
  try {
    const { scholarshipId, scholarship } = data;
    
    if (!scholarshipId || !scholarship) {
      throw new Error('Invalid scholarship data provided');
    }

    // Generate embedding for the new scholarship
    const text = `${scholarship.title} ${scholarship.summary} ${scholarship.category} ${scholarship.provider} ${scholarship.location}`;
    const embedding = await generateEmbeddings(text);
    
    // Store in vector database
    await storeScholarshipEmbedding(scholarshipId, embedding, {
      title: scholarship.title,
      summary: scholarship.summary,
      category: scholarship.category,
      provider: scholarship.provider,
      location: scholarship.location,
      deadline: scholarship.deadline
    });
    
    logger.info(`Generated embedding for new scholarship: ${scholarship.title}`);
    
  } catch (error) {
    logger.error('Error handling scholarship creation:', error);
    throw error;
  }
}

/**
 * Helper function to handle scholarship updates
 */
async function handleScholarshipUpdated(data) {
  try {
    const { scholarshipId, scholarship } = data;
    
    if (!scholarshipId || !scholarship) {
      throw new Error('Invalid scholarship update data provided');
    }

    // Regenerate embedding with updated content
    const text = `${scholarship.title} ${scholarship.summary} ${scholarship.category} ${scholarship.provider} ${scholarship.location}`;
    const embedding = await generateEmbeddings(text);
    
    // Update in vector database
    await storeScholarshipEmbedding(scholarshipId, embedding, {
      title: scholarship.title,
      summary: scholarship.summary,
      category: scholarship.category,
      provider: scholarship.provider,
      location: scholarship.location,
      deadline: scholarship.deadline
    });
    
    logger.info(`Updated embedding for scholarship: ${scholarship.title}`);
    
  } catch (error) {
    logger.error('Error handling scholarship update:', error);
    throw error;
  }
}

/**
 * Helper function to handle scholarship deletion
 */
async function handleScholarshipDeleted(data) {
  try {
    const { scholarshipId } = data;
    
    if (!scholarshipId) {
      throw new Error('Scholarship ID is required for deletion');
    }

    // Remove from vector database
    const { deleteScholarshipEmbedding } = require('../config/supabase');
    await deleteScholarshipEmbedding(scholarshipId);
    
    logger.info(`Removed embedding for deleted scholarship: ${scholarshipId}`);
    
  } catch (error) {
    logger.error('Error handling scholarship deletion:', error);
    throw error;
  }
}

/**
 * Helper function to handle user activity events
 */
async function handleUserActivity(data) {
  try {
    const { userId, activityType, details } = data;
    
    if (!userId || !activityType || !details) {
      throw new Error('Invalid user activity data provided');
    }

    // Process through learning pipeline
    const { processUserActivity } = require('../services/learningPipeline');
    await processUserActivity(userId, activityType, details);
    
    logger.debug(`Processed user activity: ${activityType} for user ${userId}`);
    
  } catch (error) {
    logger.error('Error handling user activity:', error);
    throw error;
  }
}

module.exports = router;