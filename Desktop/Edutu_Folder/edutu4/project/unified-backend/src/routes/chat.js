/**
 * Chat API Routes
 * Unified chat endpoint with RAG integration and multiple AI provider support
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const logger = require('../utils/logger');
const { ai, firebase, cache } = require('../services');
const { AppError } = require('../utils/errors');

const router = express.Router();

// Chat-specific rate limiting (more restrictive)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    error: 'Too many chat messages. Please wait a moment before sending another message.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Send chat message and get AI response
 * POST /api/chat/message
 */
router.post('/message', chatLimiter, [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('sessionId').optional().isString().trim(),
  body('userId').optional().isString().trim(),
  body('userContext').optional().isObject(),
  body('ragContext').optional().isObject()
], async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { message, sessionId, userId, userContext, ragContext } = req.body;
    const requestId = req.id || Date.now().toString();

    logger.info(`Processing chat message for session ${sessionId}`, {
      requestId,
      messageLength: message.length,
      hasRAG: !!ragContext
    });

    // Build comprehensive context for AI
    const enhancedContext = await buildEnhancedContext(
      message, 
      userId, 
      userContext, 
      ragContext
    );

    // Generate AI response with multiple provider fallback
    const aiResponse = await ai.generateChatResponse(
      message,
      enhancedContext,
      {
        sessionId,
        userId,
        requestId
      }
    );

    // Save chat interaction to Firebase
    if (userId && sessionId) {
      try {
        await firebase.saveChatMessage(userId, {
          message,
          response: aiResponse.content,
          sessionId,
          context: enhancedContext,
          timestamp: new Date().toISOString(),
          requestId
        });
      } catch (saveError) {
        logger.warn('Failed to save chat message:', saveError);
        // Don't fail the request if saving fails
      }
    }

    // Response with enhanced metadata
    res.json({
      success: true,
      response: aiResponse.content,
      messageId: requestId,
      conversationId: sessionId,
      context: {
        sources: enhancedContext.sources || [],
        relevantOpportunities: enhancedContext.opportunities?.length || 0,
        userProfileUsed: !!enhancedContext.userProfile,
        aiProvider: aiResponse.provider || 'fallback'
      },
      suggestions: aiResponse.suggestions || [],
      buttons: aiResponse.buttons || [],
      timestamp: new Date().toISOString()
    });

    logger.info(`Chat response generated successfully`, {
      requestId,
      responseLength: aiResponse.content.length,
      provider: aiResponse.provider
    });

  } catch (error) {
    logger.error('Chat message processing failed:', error);
    next(error);
  }
});

/**
 * Get chat history for a user/session
 * GET /api/chat/history
 */
router.get('/history', [
  query('userId').optional().isString().trim(),
  query('sessionId').optional().isString().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { userId, sessionId, limit = 50 } = req.query;

    if (!userId && !sessionId) {
      return next(new AppError('Either userId or sessionId is required', 400));
    }

    // Try to get from cache first
    const cacheKey = `chat_history:${userId || 'anon'}:${sessionId || 'all'}:${limit}`;
    let chatHistory = await cache.get(cacheKey);

    if (!chatHistory) {
      chatHistory = await firebase.getChatHistory(userId, sessionId, parseInt(limit));
      
      // Cache for 5 minutes
      await cache.set(cacheKey, chatHistory, 300);
    }

    res.json({
      success: true,
      history: chatHistory,
      total: chatHistory.length,
      filters: { userId, sessionId, limit }
    });

  } catch (error) {
    logger.error('Failed to fetch chat history:', error);
    next(error);
  }
});

/**
 * Start a new chat session
 * POST /api/chat/session/start
 */
router.post('/session/start', [
  body('userId').optional().isString().trim(),
  body('topic').optional().isString().trim().isLength({ max: 100 }),
  body('context').optional().isObject()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { userId, topic, context } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    logger.info(`Starting new chat session ${sessionId}`, { userId, topic });

    // Get user context for personalized welcome
    const userProfile = userId ? await firebase.getUserProfile(userId) : null;
    const welcomeContext = await buildWelcomeContext(userProfile, context);

    // Generate personalized welcome message
    const welcomeMessage = await ai.generateWelcomeMessage(welcomeContext);

    // Save session start
    if (userId) {
      await firebase.saveChatMessage(userId, {
        message: 'Session started',
        response: welcomeMessage.content,
        sessionId,
        type: 'system_welcome',
        context: welcomeContext,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      sessionId,
      welcomeMessage: welcomeMessage.content,
      suggestions: welcomeMessage.suggestions || [],
      context: {
        userProfile: !!userProfile,
        topic: topic || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to start chat session:', error);
    next(error);
  }
});

/**
 * End a chat session
 * POST /api/chat/session/end
 */
router.post('/session/end', [
  body('sessionId').isString().trim().notEmpty().withMessage('Session ID is required'),
  body('userId').optional().isString().trim(),
  body('feedback').optional().isObject()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { sessionId, userId, feedback } = req.body;

    logger.info(`Ending chat session ${sessionId}`, { userId, hasFeedback: !!feedback });

    // Save session end marker
    if (userId) {
      await firebase.saveChatMessage(userId, {
        message: 'Session ended',
        response: 'Thank you for using Edutu Chat! Feel free to start a new session anytime.',
        sessionId,
        type: 'system_goodbye',
        feedback,
        timestamp: new Date().toISOString()
      });
    }

    // Clear session cache
    const cachePattern = `chat_history:${userId || '*'}:${sessionId}:*`;
    await cache.deletePattern(cachePattern);

    res.json({
      success: true,
      message: 'Chat session ended successfully',
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to end chat session:', error);
    next(error);
  }
});

/**
 * Get chat suggestions based on context
 * GET /api/chat/suggestions
 */
router.get('/suggestions', [
  query('userId').optional().isString().trim(),
  query('context').optional().isString().trim()
], async (req, res, next) => {
  try {
    const { userId, context } = req.query;

    // Try to get from cache first
    const cacheKey = `chat_suggestions:${userId || 'anon'}:${context || 'general'}`;
    let suggestions = await cache.get(cacheKey);

    if (!suggestions) {
      const userProfile = userId ? await firebase.getUserProfile(userId) : null;
      suggestions = await ai.generateSuggestions(userProfile, context);
      
      // Cache for 10 minutes
      await cache.set(cacheKey, suggestions, 600);
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 4), // Limit to 4 suggestions
      context: {
        hasUserProfile: !!userId,
        contextType: context || 'general'
      }
    });

  } catch (error) {
    logger.error('Failed to generate suggestions:', error);
    next(error);
  }
});

/**
 * Build enhanced context for AI processing
 */
async function buildEnhancedContext(message, userId, userContext, ragContext) {
  const context = {
    message,
    timestamp: new Date().toISOString(),
    sources: []
  };

  try {
    // Add user profile if available
    if (userId) {
      const userProfile = await firebase.getUserProfile(userId);
      if (userProfile) {
        context.userProfile = userProfile;
        context.sources.push('user_profile');
      }
    }

    // Add RAG context from frontend
    if (ragContext) {
      Object.assign(context, ragContext);
      if (ragContext.scholarships?.length > 0) {
        context.sources.push('scholarships_rag');
      }
    }

    // Get relevant opportunities from Firebase/Supabase
    const opportunities = await firebase.getRelevantOpportunities(message, userId, 5);
    if (opportunities?.length > 0) {
      context.opportunities = opportunities;
      context.sources.push('opportunity_matching');
    }

    // Add recent chat history for context continuity
    if (userId) {
      const recentChats = await firebase.getChatHistory(userId, null, 5);
      if (recentChats?.length > 0) {
        context.recentChats = recentChats;
        context.sources.push('chat_history');
      }
    }

    // Add user context from frontend
    if (userContext) {
      context.userContext = userContext;
      context.sources.push('user_context');
    }

  } catch (error) {
    logger.warn('Failed to build enhanced context:', error);
    // Don't fail the request, just log the warning
  }

  return context;
}

/**
 * Build welcome context for new sessions
 */
async function buildWelcomeContext(userProfile, additionalContext) {
  const context = {
    type: 'welcome',
    timestamp: new Date().toISOString()
  };

  if (userProfile) {
    context.userProfile = userProfile;
    
    // Get recent opportunities for personalized welcome
    try {
      const recommendations = await firebase.getUserRecommendations(userProfile.uid, 3);
      if (recommendations?.length > 0) {
        context.recommendations = recommendations;
      }
    } catch (error) {
      logger.warn('Failed to get recommendations for welcome:', error);
    }
  }

  if (additionalContext) {
    Object.assign(context, additionalContext);
  }

  return context;
}

module.exports = router;