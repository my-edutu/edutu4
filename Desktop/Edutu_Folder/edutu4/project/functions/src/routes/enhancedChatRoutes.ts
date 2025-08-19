/**
 * Enhanced Chat Routes with Full RAG Support
 * Replaces existing /api/chat endpoints with advanced RAG capabilities
 */

import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { ragChatService } from '../services/ragChatService';
import { vectorStore } from '../services/vectorStore';
import { enhancedEmbeddingService } from '../services/enhancedEmbeddingService';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for chat endpoints
const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 requests per windowMs
  message: {
    error: 'Too many chat requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limit to all chat routes
router.use(chatRateLimit);

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

/**
 * POST /api/chat/message
 * Send a chat message with full RAG context
 */
router.post('/message', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, sessionId, conversationId, userContext } = req.body;
    const userId = req.user?.uid;

    // Validation
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long. Please keep messages under 4000 characters.'
      });
    }

    // Use provided sessionId or create new one
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = await ragChatService.startConversationSession(userId, message);
      currentSessionId = session.sessionId;
    }

    // Get conversation history for context
    const conversationHistory = await getConversationHistory(userId, currentSessionId, 10);

    // Generate RAG response
    const ragResponse = await ragChatService.generateRAGResponse(
      userId,
      message.trim(),
      currentSessionId,
      conversationHistory
    );

    // Update user context embeddings asynchronously
    enhancedEmbeddingService.updateUserContextEmbedding(userId).catch(error => {
      console.warn('Failed to update user context embedding:', error);
    });

    // Return enhanced response
    return res.json({
      success: true,
      response: ragResponse.response,
      conversationId: currentSessionId,
      sessionId: currentSessionId,
      metadata: {
        confidence: ragResponse.confidence,
        contextUsed: ragResponse.contextUsed,
        model: ragResponse.metadata.model,
        provider: ragResponse.metadata.provider,
        responseTime: ragResponse.metadata.responseTime,
        totalTokens: ragResponse.metadata.totalTokens
      },
      followUpSuggestions: ragResponse.followUpSuggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat message error:', error);
    
    // Return fallback response
    return res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      response: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or feel free to ask about scholarships, career guidance, or learning roadmaps. I'm here to help! 🌟",
      fallback: true
    });
  }
});

/**
 * POST /api/chat/session/start
 * Start a new conversation session
 */
router.post('/session/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { initialMessage } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Start new session
    const session = await ragChatService.startConversationSession(userId, initialMessage);

    return res.json({
      success: true,
      sessionId: session.sessionId,
      welcomeMessage: session.welcomeMessage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session start error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start conversation session'
    });
  }
});

/**
 * POST /api/chat/session/end
 * End conversation session with summary
 */
router.post('/session/end', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // End session and get summary
    const sessionSummary = await ragChatService.endConversationSession(sessionId);

    return res.json({
      success: true,
      sessionSummary: sessionSummary.summary,
      keyTopics: sessionSummary.keyTopics,
      recommendations: sessionSummary.recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session end error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to end conversation session'
    });
  }
});

/**
 * GET /api/chat/history/:userId
 * Get chat history for a user
 */
router.get('/history/:targetUserId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const { limit = 50, offset = 0, sessionId } = req.query;
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Users can only access their own chat history
    if (currentUserId !== targetUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Build query
    let query = admin.firestore()
      .collection('chatMessages')
      .where('userId', '==', targetUserId)
      .orderBy('timestamp', 'desc')
      .limit(Number(limit));

    if (sessionId) {
      query = query.where('sessionId', '==', sessionId);
    }

    if (Number(offset) > 0) {
      // For pagination, you'd need to implement cursor-based pagination
      // This is a simplified version
    }

    const snapshot = await query.get();
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString()
    }));

    return res.json({
      success: true,
      messages,
      total: messages.length,
      hasMore: messages.length === Number(limit)
    });

  } catch (error) {
    console.error('Chat history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history'
    });
  }
});

/**
 * GET /api/chat/suggestions/:userId
 * Get contextual chat suggestions
 */
router.get('/suggestions/:targetUserId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const { sessionId, limit = 5 } = req.query;
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (currentUserId !== targetUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get contextual suggestions
    const suggestions = await ragChatService.getChatSuggestions(
      targetUserId,
      sessionId as string,
      Number(limit)
    );

    return res.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat suggestions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get chat suggestions'
    });
  }
});

/**
 * GET /api/chat/sessions/:userId
 * Get conversation sessions for a user
 */
router.get('/sessions/:targetUserId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const { limit = 20, active = 'all' } = req.query;
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (currentUserId !== targetUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Build Supabase query
    let query = vectorStore.supabase
      .from('conversation_sessions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('started_at', { ascending: false })
      .limit(Number(limit));

    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      sessions: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Sessions retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation sessions'
    });
  }
});

/**
 * GET /api/chat/analytics/:userId
 * Get chat analytics for a user
 */
router.get('/analytics/:targetUserId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (currentUserId !== targetUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get analytics from Supabase
    const [sessionsResult, messagesResult] = await Promise.all([
      vectorStore.supabase
        .from('conversation_sessions')
        .select('message_count, key_topics, sentiment_trend, started_at')
        .eq('user_id', targetUserId),
      
      vectorStore.supabase
        .from('chat_history_embeddings')
        .select('message_intent, sentiment_score, created_at')
        .eq('user_id', targetUserId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    ]);

    const sessions = sessionsResult.data || [];
    const messages = messagesResult.data || [];

    // Calculate analytics
    const analytics = {
      totalSessions: sessions.length,
      totalMessages: messages.length,
      averageMessagesPerSession: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.message_count || 0), 0) / sessions.length 
        : 0,
      averageSentiment: messages.length > 0
        ? messages.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / messages.length
        : 0,
      topIntents: getTopIntents(messages),
      topTopics: getTopTopics(sessions),
      activityByDay: getActivityByDay(messages),
      lastActiveSession: sessions[0]?.started_at || null
    };

    return res.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat analytics'
    });
  }
});

/**
 * POST /api/chat/feedback
 * Submit feedback for a chat response
 */
router.post('/feedback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId, rating, feedback, sessionId } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!messageId || typeof rating !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Message ID and rating are required'
      });
    }

    // Store feedback in Firestore
    await admin.firestore()
      .collection('chatFeedback')
      .add({
        messageId,
        sessionId,
        userId,
        rating,
        feedback: feedback || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    return res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

// Helper Functions

async function getConversationHistory(
  userId: string, 
  sessionId: string, 
  limit: number
): Promise<any[]> {
  try {
    const snapshot = await admin.firestore()
      .collection('chatMessages')
      .where('userId', '==', userId)
      .where('sessionId', '==', sessionId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs
      .map(doc => ({
        role: doc.data().type === 'user' ? 'user' : 'assistant',
        content: doc.data().content,
        timestamp: doc.data().timestamp?.toDate?.()
      }))
      .reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

function getTopIntents(messages: any[]): Array<{ intent: string; count: number }> {
  const intentCounts = messages.reduce((acc, msg) => {
    if (msg.message_intent) {
      acc[msg.message_intent] = (acc[msg.message_intent] || 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(intentCounts)
    .map(([intent, count]) => ({ intent, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getTopTopics(sessions: any[]): Array<{ topic: string; count: number }> {
  const topicCounts = sessions.reduce((acc, session) => {
    if (session.key_topics) {
      session.key_topics.forEach((topic: string) => {
        acc[topic] = (acc[topic] || 0) + 1;
      });
    }
    return acc;
  }, {});

  return Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getActivityByDay(messages: any[]): Array<{ date: string; count: number }> {
  const dayCounts = messages.reduce((acc, msg) => {
    if (msg.created_at) {
      const date = new Date(msg.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(dayCounts)
    .map(([date, count]) => ({ date, count: count as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default router;