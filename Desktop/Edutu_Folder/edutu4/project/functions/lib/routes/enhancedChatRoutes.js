"use strict";
/**
 * Enhanced Chat Routes with Full RAG Support
 * Replaces existing /api/chat endpoints with advanced RAG capabilities
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const ragChatService_1 = require("../services/ragChatService");
const vectorStore_1 = require("../services/vectorStore");
const enhancedEmbeddingService_1 = require("../services/enhancedEmbeddingService");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
// Rate limiting for chat endpoints
const chatRateLimit = (0, express_rate_limit_1.default)({
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
/**
 * POST /api/chat/message
 * Send a chat message with full RAG context
 */
router.post('/message', async (req, res) => {
    var _a;
    try {
        const { message, sessionId, conversationId, userContext } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
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
            const session = await ragChatService_1.ragChatService.startConversationSession(userId, message);
            currentSessionId = session.sessionId;
        }
        // Get conversation history for context
        const conversationHistory = await getConversationHistory(userId, currentSessionId, 10);
        // Generate RAG response
        const ragResponse = await ragChatService_1.ragChatService.generateRAGResponse(userId, message.trim(), currentSessionId, conversationHistory);
        // Update user context embeddings asynchronously
        enhancedEmbeddingService_1.enhancedEmbeddingService.updateUserContextEmbedding(userId).catch(error => {
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
    }
    catch (error) {
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
router.post('/session/start', async (req, res) => {
    var _a;
    try {
        const { initialMessage } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Start new session
        const session = await ragChatService_1.ragChatService.startConversationSession(userId, initialMessage);
        return res.json({
            success: true,
            sessionId: session.sessionId,
            welcomeMessage: session.welcomeMessage,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.post('/session/end', async (req, res) => {
    var _a;
    try {
        const { sessionId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
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
        const sessionSummary = await ragChatService_1.ragChatService.endConversationSession(sessionId);
        return res.json({
            success: true,
            sessionSummary: sessionSummary.summary,
            keyTopics: sessionSummary.keyTopics,
            recommendations: sessionSummary.recommendations,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.get('/history/:targetUserId', async (req, res) => {
    var _a;
    try {
        const { targetUserId } = req.params;
        const { limit = 50, offset = 0, sessionId } = req.query;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
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
        const messages = snapshot.docs.map(doc => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { timestamp: (_c = (_b = (_a = doc.data().timestamp) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString() }));
        });
        return res.json({
            success: true,
            messages,
            total: messages.length,
            hasMore: messages.length === Number(limit)
        });
    }
    catch (error) {
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
router.get('/suggestions/:targetUserId', async (req, res) => {
    var _a;
    try {
        const { targetUserId } = req.params;
        const { sessionId, limit = 5 } = req.query;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
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
        const suggestions = await ragChatService_1.ragChatService.getChatSuggestions(targetUserId, sessionId, Number(limit));
        return res.json({
            success: true,
            suggestions,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.get('/sessions/:targetUserId', async (req, res) => {
    var _a;
    try {
        const { targetUserId } = req.params;
        const { limit = 20, active = 'all' } = req.query;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
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
        let query = vectorStore_1.vectorStore.supabase
            .from('conversation_sessions')
            .select('*')
            .eq('user_id', targetUserId)
            .order('started_at', { ascending: false })
            .limit(Number(limit));
        if (active === 'true') {
            query = query.eq('is_active', true);
        }
        else if (active === 'false') {
            query = query.eq('is_active', false);
        }
        const { data, error } = await query;
        if (error) {
            throw error;
        }
        return res.json({
            success: true,
            sessions: data || [],
            total: (data === null || data === void 0 ? void 0 : data.length) || 0
        });
    }
    catch (error) {
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
router.get('/analytics/:targetUserId', async (req, res) => {
    var _a, _b;
    try {
        const { targetUserId } = req.params;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
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
            vectorStore_1.vectorStore.supabase
                .from('conversation_sessions')
                .select('message_count, key_topics, sentiment_trend, started_at')
                .eq('user_id', targetUserId),
            vectorStore_1.vectorStore.supabase
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
            lastActiveSession: ((_b = sessions[0]) === null || _b === void 0 ? void 0 : _b.started_at) || null
        };
        return res.json({
            success: true,
            analytics,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.post('/feedback', async (req, res) => {
    var _a;
    try {
        const { messageId, rating, feedback, sessionId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
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
    }
    catch (error) {
        console.error('Feedback submission error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to submit feedback'
        });
    }
});
// Helper Functions
async function getConversationHistory(userId, sessionId, limit) {
    try {
        const snapshot = await admin.firestore()
            .collection('chatMessages')
            .where('userId', '==', userId)
            .where('sessionId', '==', sessionId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs
            .map(doc => {
            var _a, _b;
            return ({
                role: doc.data().type === 'user' ? 'user' : 'assistant',
                content: doc.data().content,
                timestamp: (_b = (_a = doc.data().timestamp) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)
            });
        })
            .reverse(); // Return in chronological order
    }
    catch (error) {
        console.error('Error getting conversation history:', error);
        return [];
    }
}
function getTopIntents(messages) {
    const intentCounts = messages.reduce((acc, msg) => {
        if (msg.message_intent) {
            acc[msg.message_intent] = (acc[msg.message_intent] || 0) + 1;
        }
        return acc;
    }, {});
    return Object.entries(intentCounts)
        .map(([intent, count]) => ({ intent, count: count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}
function getTopTopics(sessions) {
    const topicCounts = sessions.reduce((acc, session) => {
        if (session.key_topics) {
            session.key_topics.forEach((topic) => {
                acc[topic] = (acc[topic] || 0) + 1;
            });
        }
        return acc;
    }, {});
    return Object.entries(topicCounts)
        .map(([topic, count]) => ({ topic, count: count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}
function getActivityByDay(messages) {
    const dayCounts = messages.reduce((acc, msg) => {
        if (msg.created_at) {
            const date = new Date(msg.created_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
    }, {});
    return Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count: count }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
exports.default = router;
//# sourceMappingURL=enhancedChatRoutes.js.map