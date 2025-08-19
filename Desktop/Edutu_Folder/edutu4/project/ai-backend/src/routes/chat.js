/**
 * Chat API Routes
 * Handles AI-powered chat assistant with RAG context
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyFirebaseToken, requireOwnership, rateLimitByUser } = require('../middleware/auth');
const { 
  generateChatResponse,
} = require('../config/ai');
const {
  getAllScholarships,
  getUserProfile,
  getUserRoadmaps,
  saveChatMessage,
  getChatHistory,
} = require('../config/firebase');
const {
  getUserRecommendations,
  findSimilarScholarships,
} = require('../config/supabase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Send chat message and get AI response
 * POST /api/chat/message
 */
router.post('/message', verifyFirebaseToken, requireOwnership, rateLimitByUser(60000, 20), [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('sessionId').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, message, sessionId } = req.body;

    logger.info(`Processing chat message for user ${userId}`);

    // Get user profile and context
    const context = await buildChatContext(userId, message);
    const userProfile = await getUserProfile(userId);

    // Generate AI response
    const aiResponse = await generateChatResponse(message, context, userProfile);

    // Save chat interaction
    const chatRecord = await saveChatMessage(userId, message, aiResponse, {
      sessionId,
      contextSources: context.sources,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Chat response generated for user ${userId}`);

    res.json({
      success: true,
      response: aiResponse,
      messageId: chatRecord.id,
      context: {
        sources: context.sources,
        relevantOpportunities: context.opportunities?.length || 0,
        activeRoadmaps: context.roadmaps?.length || 0,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing chat message:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message
    });
  }
});

/**
 * Get chat history for a user
 * GET /api/chat/history/:userId
 */
router.get('/history/:userId', [
  param('userId').isString().notEmpty().withMessage('User ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sessionId').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const { sessionId } = req.query;

    logger.debug(`Fetching chat history for user ${userId}`);

    let chatHistory = await getChatHistory(userId, limit);

    // Filter by session if provided
    if (sessionId) {
      chatHistory = chatHistory.filter(chat => 
        chat.context?.sessionId === sessionId
      );
    }

    res.json({
      success: true,
      history: chatHistory,
      total: chatHistory.length,
      filters: { limit, sessionId }
    });

  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      message: error.message
    });
  }
});

/**
 * Start a new chat session
 * POST /api/chat/session/start
 */
router.post('/session/start', [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('topic').optional().isString().isLength({ max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, topic } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    logger.info(`Starting new chat session ${sessionId} for user ${userId}`);

    // Get user context for session initialization
    const userProfile = await getUserProfile(userId);
    const recommendations = await getUserRecommendations(userId, 3);

    // Create welcome message based on user context
    const welcomeContext = {
      opportunities: recommendations,
      sources: ['user_profile', 'recommendations'],
    };

    const welcomeMessage = `Hello! I'm your Edutu AI assistant. I can help you with finding opportunities, planning your applications, and achieving your career goals. Based on your profile, I see you're interested in ${userProfile.preferences?.careerInterests?.join(', ') || 'various opportunities'}. How can I assist you today?`;

    // Save welcome message
    await saveChatMessage(userId, 'Session started', welcomeMessage, {
      sessionId,
      type: 'system_welcome',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      sessionId,
      welcomeMessage,
      context: {
        recommendations: recommendations.slice(0, 3),
        userInterests: userProfile.preferences?.careerInterests || [],
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error starting chat session:', error);
    res.status(500).json({
      error: 'Failed to start chat session',
      message: error.message
    });
  }
});

/**
 * End a chat session
 * POST /api/chat/session/end
 */
router.post('/session/end', [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('feedback').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, sessionId, feedback } = req.body;

    logger.info(`Ending chat session ${sessionId} for user ${userId}`);

    // Save session end marker
    await saveChatMessage(userId, 'Session ended', 'Thank you for using Edutu AI! Feel free to start a new session anytime.', {
      sessionId,
      type: 'system_goodbye',
      feedback,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Chat session ended successfully',
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error ending chat session:', error);
    res.status(500).json({
      error: 'Failed to end chat session',
      message: error.message
    });
  }
});

/**
 * Get chat suggestions based on user context
 * GET /api/chat/suggestions/:userId
 */
router.get('/suggestions/:userId', [
  param('userId').isString().notEmpty().withMessage('User ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;

    logger.debug(`Generating chat suggestions for user ${userId}`);

    const userProfile = await getUserProfile(userId);
    const roadmaps = await getUserRoadmaps(userId);
    const recommendations = await getUserRecommendations(userId, 3);

    // Generate contextual suggestions
    const suggestions = [];

    // Roadmap-based suggestions
    if (roadmaps.length > 0) {
      const activeRoadmaps = roadmaps.filter(r => r.status === 'active');
      if (activeRoadmaps.length > 0) {
        suggestions.push("How can I improve my application for my current roadmaps?");
        suggestions.push("What are the next steps in my active roadmaps?");
      }
    }

    // Recommendation-based suggestions
    if (recommendations.length > 0) {
      suggestions.push("Tell me more about these recommended opportunities");
      suggestions.push("Which of these opportunities best match my goals?");
    }

    // Profile-based suggestions
    if (userProfile.preferences?.careerInterests) {
      suggestions.push(`Find scholarships related to ${userProfile.preferences.careerInterests[0]}`);
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        "What scholarships are available for my field?",
        "How do I write a strong personal statement?",
        "What are some tips for scholarship applications?",
        "Help me create a study plan"
      );
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 4), // Limit to 4 suggestions
      context: {
        hasActiveRoadmaps: roadmaps.some(r => r.status === 'active'),
        hasRecommendations: recommendations.length > 0,
        primaryInterest: userProfile.preferences?.careerInterests?.[0] || null,
      }
    });

  } catch (error) {
    logger.error('Error generating chat suggestions:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error.message
    });
  }
});

/**
 * Helper function to build RAG context for chat
 */
async function buildChatContext(userId, message) {
  try {
    const context = {
      opportunities: [],
      roadmaps: [],
      chatHistory: [],
      sources: [],
    };

    // Get recent chat history for context
    const recentChats = await getChatHistory(userId, 5);
    context.chatHistory = recentChats;
    if (recentChats.length > 0) {
      context.sources.push('chat_history');
    }

    // Get user's active roadmaps
    const roadmaps = await getUserRoadmaps(userId);
    const activeRoadmaps = roadmaps.filter(r => r.status === 'active');
    context.roadmaps = activeRoadmaps;
    if (activeRoadmaps.length > 0) {
      context.sources.push('user_roadmaps');
    }

    // Get relevant opportunities based on message content
    try {
      const { generateEmbeddings } = require('../config/ai');
      const messageEmbedding = await generateEmbeddings(message);
      const relevantOpportunities = await findSimilarScholarships(messageEmbedding, 3, 0.6);
      
      if (relevantOpportunities.length > 0) {
        context.opportunities = relevantOpportunities;
        context.sources.push('relevant_opportunities');
      }
    } catch (embeddingError) {
      logger.warn('Could not find relevant opportunities for context:', embeddingError);
      
      // Fallback to user recommendations
      const recommendations = await getUserRecommendations(userId, 3);
      if (recommendations.length > 0) {
        context.opportunities = recommendations;
        context.sources.push('user_recommendations');
      }
    }

    logger.debug(`Built chat context with sources: ${context.sources.join(', ')}`);
    return context;

  } catch (error) {
    logger.error('Error building chat context:', error);
    return {
      opportunities: [],
      roadmaps: [],
      chatHistory: [],
      sources: ['error_fallback'],
    };
  }
}

module.exports = router;