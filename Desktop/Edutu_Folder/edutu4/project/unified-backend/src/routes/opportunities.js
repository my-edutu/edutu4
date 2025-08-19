/**
 * Opportunities API Routes
 * Unified opportunity management with search, filtering, and recommendations
 */

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const logger = require('../utils/logger');
const { firebase, cache } = require('../services');
const { AppError } = require('../utils/errors');

const router = express.Router();

// Rate limiting for search endpoints
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    error: 'Too many search requests. Please wait a moment before searching again.',
    retryAfter: '1 minute'
  }
});

/**
 * Get opportunities with pagination and filtering
 * GET /api/opportunities
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isString().trim(),
  query('search').optional().isString().trim().isLength({ min: 1, max: 200 }),
  query('location').optional().isString().trim(),
  query('sortBy').optional().isIn(['createdAt', 'deadline', 'title', 'relevance']).withMessage('Invalid sort option')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const {
      page = 1,
      limit = 20,
      category,
      search,
      location,
      sortBy = 'createdAt'
    } = req.query;

    const cacheKey = `opportunities:${page}:${limit}:${category || 'all'}:${search || ''}:${location || ''}:${sortBy}`;
    
    // Try cache first
    let result = await cache.get(cacheKey);

    if (!result) {
      logger.debug('Fetching opportunities from database', {
        page, limit, category, search, location, sortBy
      });

      let opportunities;
      let total = 0;

      if (search) {
        // Search with text matching
        opportunities = await firebase.searchOpportunities(search, parseInt(limit) * 2);
        total = opportunities.length;
        
        // Apply additional filters
        if (category && category !== 'All') {
          opportunities = opportunities.filter(opp => 
            opp.category?.toLowerCase() === category.toLowerCase()
          );
        }

        if (location) {
          opportunities = opportunities.filter(opp => 
            opp.location?.toLowerCase().includes(location.toLowerCase()) ||
            opp.eligibility?.toLowerCase().includes(location.toLowerCase())
          );
        }

        // Sort results
        opportunities = sortOpportunities(opportunities, sortBy);
        
        // Paginate
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        opportunities = opportunities.slice(startIndex, startIndex + parseInt(limit));

      } else {
        // Get general opportunities
        opportunities = await firebase.getGeneralOpportunities(parseInt(limit) * parseInt(page));
        
        // Apply filters
        if (category && category !== 'All') {
          opportunities = opportunities.filter(opp => 
            opp.category?.toLowerCase() === category.toLowerCase()
          );
        }

        if (location) {
          opportunities = opportunities.filter(opp => 
            opp.location?.toLowerCase().includes(location.toLowerCase())
          );
        }

        // Sort and paginate
        opportunities = sortOpportunities(opportunities, sortBy);
        total = opportunities.length;
        
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        opportunities = opportunities.slice(startIndex, startIndex + parseInt(limit));
      }

      result = {
        success: true,
        opportunities: opportunities.map(opp => formatOpportunity(opp)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: parseInt(page) * parseInt(limit) < total
        },
        filters: {
          category: category || null,
          search: search || null,
          location: location || null,
          sortBy
        }
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, result, 300);
    }

    res.json(result);
    
    logger.info('Opportunities fetched successfully', {
      count: result.opportunities.length,
      page,
      filters: result.filters
    });

  } catch (error) {
    logger.error('Failed to fetch opportunities:', error);
    next(error);
  }
});

/**
 * Get single opportunity by ID
 * GET /api/opportunities/:id
 */
router.get('/:id', [
  param('id').isString().trim().notEmpty().withMessage('Opportunity ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { id } = req.params;
    const cacheKey = `opportunity:${id}`;

    // Try cache first
    let opportunity = await cache.get(cacheKey);

    if (!opportunity) {
      // Fetch from database
      const doc = await firebase.db.collection('scholarships').doc(id).get();
      
      if (!doc.exists) {
        return next(new AppError('Opportunity not found', 404));
      }

      opportunity = {
        id: doc.id,
        ...doc.data()
      };

      // Cache for 10 minutes
      await cache.set(cacheKey, opportunity, 600);
    }

    // Get related opportunities
    const relatedOpportunities = await getRelatedOpportunities(opportunity, 3);

    res.json({
      success: true,
      opportunity: formatOpportunity(opportunity),
      related: relatedOpportunities.map(opp => formatOpportunity(opp))
    });

    logger.debug('Single opportunity fetched', { id });

  } catch (error) {
    logger.error('Failed to fetch opportunity:', error);
    next(error);
  }
});

/**
 * Search opportunities with advanced text matching
 * GET /api/opportunities/search
 */
router.get('/advanced/search', searchLimiter, [
  query('q').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Search query must be 1-200 characters'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('filters').optional().isJSON().withMessage('Filters must be valid JSON')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { q: searchQuery, limit = 20 } = req.query;
    let filters = {};
    
    if (req.query.filters) {
      try {
        filters = JSON.parse(req.query.filters);
      } catch (error) {
        return next(new AppError('Invalid filters JSON', 400));
      }
    }

    const cacheKey = `search:${Buffer.from(searchQuery).toString('base64')}:${limit}:${JSON.stringify(filters)}`;
    
    // Try cache first
    let result = await cache.get(cacheKey);

    if (!result) {
      logger.debug('Performing advanced opportunity search', { 
        query: searchQuery, 
        limit, 
        filters 
      });

      // Enhanced search with Firebase
      let opportunities = await firebase.searchOpportunities(searchQuery, parseInt(limit) * 2);

      // Apply additional filters
      if (filters.category) {
        opportunities = opportunities.filter(opp => 
          opp.category?.toLowerCase().includes(filters.category.toLowerCase())
        );
      }

      if (filters.deadline) {
        const now = new Date();
        opportunities = opportunities.filter(opp => {
          if (!opp.deadline) return true;
          const deadline = new Date(opp.deadline);
          return deadline > now;
        });
      }

      if (filters.amount) {
        opportunities = opportunities.filter(opp => {
          if (!opp.amount) return true;
          return opp.amount.toLowerCase().includes('full') || 
                 opp.amount.toLowerCase().includes('partial');
        });
      }

      // Score and sort by relevance
      opportunities = scoreSearchResults(opportunities, searchQuery);
      opportunities = opportunities.slice(0, parseInt(limit));

      result = {
        success: true,
        query: searchQuery,
        opportunities: opportunities.map(opp => formatOpportunity(opp)),
        total: opportunities.length,
        filters: filters,
        searchTips: generateSearchTips(searchQuery, opportunities.length)
      };

      // Cache for 10 minutes
      await cache.set(cacheKey, result, 600);
    }

    res.json(result);

    logger.info('Advanced search completed', {
      query: searchQuery,
      results: result.opportunities.length,
      filters
    });

  } catch (error) {
    logger.error('Advanced search failed:', error);
    next(error);
  }
});

/**
 * Get opportunity categories
 * GET /api/opportunities/categories
 */
router.get('/meta/categories', async (req, res, next) => {
  try {
    const cacheKey = 'opportunity_categories';
    
    // Try cache first
    let categories = await cache.get(cacheKey);

    if (!categories) {
      categories = await firebase.getOpportunityCategories();
      
      // Cache for 1 hour
      await cache.set(cacheKey, categories, 3600);
    }

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    logger.error('Failed to fetch categories:', error);
    next(error);
  }
});

/**
 * Get trending opportunities
 * GET /api/opportunities/trending
 */
router.get('/meta/trending', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const cacheKey = `trending_opportunities:${limit}`;

    // Try cache first
    let result = await cache.get(cacheKey);

    if (!result) {
      // Get recent opportunities with good engagement
      const opportunities = await firebase.getGeneralOpportunities(50);
      
      // Simple trending algorithm (in production, use actual engagement metrics)
      const trending = opportunities
        .filter(opp => {
          const createdAt = new Date(opp.createdAt || opp.deadline);
          const now = new Date();
          const daysDiff = (now - createdAt) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30; // Recent opportunities
        })
        .slice(0, parseInt(limit));

      result = {
        success: true,
        trending: trending.map(opp => formatOpportunity(opp))
      };

      // Cache for 30 minutes
      await cache.set(cacheKey, result, 1800);
    }

    res.json(result);

  } catch (error) {
    logger.error('Failed to fetch trending opportunities:', error);
    next(error);
  }
});

/**
 * Helper functions
 */

function formatOpportunity(opportunity) {
  return {
    id: opportunity.id,
    title: opportunity.title,
    provider: opportunity.provider,
    category: opportunity.category,
    description: opportunity.description,
    summary: opportunity.summary,
    amount: opportunity.amount,
    deadline: opportunity.deadline,
    location: opportunity.location,
    eligibility: opportunity.eligibility,
    requirements: opportunity.requirements,
    applicationUrl: opportunity.applicationUrl,
    tags: opportunity.tags || [],
    status: opportunity.status,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    // Add computed fields
    isExpired: opportunity.deadline ? new Date(opportunity.deadline) < new Date() : false,
    daysUntilDeadline: opportunity.deadline ? 
      Math.ceil((new Date(opportunity.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
  };
}

function sortOpportunities(opportunities, sortBy) {
  switch (sortBy) {
    case 'deadline':
      return opportunities.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    case 'title':
      return opportunities.sort((a, b) => 
        (a.title || '').localeCompare(b.title || '')
      );
    case 'relevance':
      return opportunities.sort((a, b) => 
        (b.relevanceScore || 0) - (a.relevanceScore || 0)
      );
    case 'createdAt':
    default:
      return opportunities.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
  }
}

function scoreSearchResults(opportunities, searchQuery) {
  const queryWords = searchQuery.toLowerCase().split(' ').filter(word => word.length > 2);
  
  return opportunities.map(opp => {
    let score = 0;
    const searchText = [
      opp.title || '',
      opp.description || '',
      opp.summary || '',
      opp.category || '',
      opp.provider || '',
      ...(opp.tags || [])
    ].join(' ').toLowerCase();

    queryWords.forEach(word => {
      // Title matches get highest score
      if ((opp.title || '').toLowerCase().includes(word)) {
        score += 10;
      }
      // Provider matches
      else if ((opp.provider || '').toLowerCase().includes(word)) {
        score += 5;
      }
      // Category matches
      else if ((opp.category || '').toLowerCase().includes(word)) {
        score += 3;
      }
      // General content matches
      else if (searchText.includes(word)) {
        score += 1;
      }
    });

    return { ...opp, relevanceScore: score };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

async function getRelatedOpportunities(opportunity, limit = 3) {
  try {
    // Find opportunities with similar categories or tags
    const relatedQuery = firebase.db.collection('scholarships')
      .where('status', '==', 'active')
      .where('category', '==', opportunity.category)
      .limit(limit + 1); // +1 to exclude the current opportunity

    const snapshot = await relatedQuery.get();
    const related = [];

    snapshot.forEach(doc => {
      if (doc.id !== opportunity.id) {
        related.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });

    return related.slice(0, limit);
  } catch (error) {
    logger.warn('Failed to fetch related opportunities:', error);
    return [];
  }
}

function generateSearchTips(query, resultCount) {
  const tips = [];

  if (resultCount === 0) {
    tips.push('Try using broader search terms');
    tips.push('Check spelling and try synonyms');
    tips.push('Remove filters to see more results');
  } else if (resultCount < 5) {
    tips.push('Try broader search terms for more results');
    tips.push('Use category filters to narrow down');
  }

  return tips;
}

module.exports = router;