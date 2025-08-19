"use strict";
/**
 * Chat API Routes - Firebase Functions Version
 * Handles AI-powered chat assistant with RAG context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatRouter = createChatRouter;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../utils/auth");
const aiService_1 = require("../services/aiService");
const ragRetrieval_1 = require("../utils/ragRetrieval");
const securityValidation_1 = require("../utils/securityValidation");
function createChatRouter() {
    const router = (0, express_1.Router)();
    /**
     * Send chat message and get AI response
     * POST /api/chat/message
     */
    router.post('/message', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.body)('userId').isString().notEmpty().withMessage('User ID is required'),
        (0, express_validator_1.body)('message').isString().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
        (0, express_validator_1.body)('sessionId').optional().isString(),
    ], async (req, res) => {
        try {
            // Enhanced security validation
            const validation = await (0, securityValidation_1.validateChatRequest)(req);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: validation.errors
                });
            }
            const { userId, message, sessionId } = validation.sanitizedData;
            console.log(`Processing chat message for user ${userId}`);
            // Build comprehensive RAG context
            const ragContext = await (0, ragRetrieval_1.buildRAGContext)(userId, message, sessionId);
            // Generate AI response with enhanced context
            const aiResponse = await (0, aiService_1.generateChatResponse)(message, ragContext);
            // Save conversation with context metadata
            await (0, ragRetrieval_1.saveChatMessage)(userId, message, aiResponse, sessionId || generateSessionId(), {
                hasProfile: !!ragContext.userProfile,
                hasGoals: ragContext.userGoals.length > 0,
                hasScholarships: ragContext.relevantScholarships.length > 0,
                hasChatHistory: ragContext.chatHistory.length > 0,
            });
            res.json({
                success: true,
                response: aiResponse,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error processing chat message:', error);
            // Log the error for monitoring
            await (0, securityValidation_1.logSecurityEvent)(req.body.userId || 'unknown', 'invalid_input', {
                error: error.message,
                stack: error.stack,
                endpoint: '/api/chat/message'
            });
            res.status(500).json({
                error: 'Failed to process chat message',
                message: 'An unexpected error occurred. Please try again.'
            });
        }
    });
    /**
     * Get chat history for a user session
     * GET /api/chat/history/:userId
     */
    router.get('/history/:userId', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.param)('userId').isString().notEmpty().withMessage('User ID is required'),
        (0, express_validator_1.query)('sessionId').optional().isString(),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { userId } = req.params;
            const { sessionId, limit = '20' } = req.query;
            console.log(`Fetching chat history for user ${userId}`);
            const history = await (0, ragRetrieval_1.getChatHistory)(userId, sessionId, parseInt(limit));
            res.json({
                success: true,
                history,
                total: history.length,
                sessionId: sessionId || null
            });
        }
        catch (error) {
            console.error('Error fetching chat history:', error);
            res.status(500).json({
                error: 'Failed to fetch chat history',
                message: error.message
            });
        }
    });
    /**
     * Start a new chat session
     * POST /api/chat/session/new
     */
    router.post('/session/new', auth_1.verifyFirebaseToken, [
        (0, express_validator_1.body)('userId').isString().notEmpty().withMessage('User ID is required'),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { userId } = req.body;
            const sessionId = generateSessionId();
            console.log(`Starting new chat session ${sessionId} for user ${userId}`);
            res.json({
                success: true,
                sessionId,
                message: 'New chat session created',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error creating chat session:', error);
            res.status(500).json({
                error: 'Failed to create chat session',
                message: error.message
            });
        }
    });
    return router;
}
/**
 * Analyze message intent for enhanced context loading
 */
function analyzeMessageIntent(message) {
    const lowerMessage = message.toLowerCase();
    const scholarshipKeywords = ['scholarship', 'funding', 'grant', 'financial aid', 'tuition'];
    const needsScholarships = scholarshipKeywords.some(keyword => lowerMessage.includes(keyword));
    let category = 'general';
    if (lowerMessage.includes('roadmap') || lowerMessage.includes('plan')) {
        category = 'roadmap';
    }
    else if (needsScholarships) {
        category = 'funding';
    }
    else if (lowerMessage.includes('recommend')) {
        category = 'recommendations';
    }
    else if (lowerMessage.includes('career') || lowerMessage.includes('job')) {
        category = 'career';
    }
    // Determine urgency
    let urgency = 'low';
    if (lowerMessage.includes('urgent') || lowerMessage.includes('deadline') ||
        lowerMessage.includes('soon') || lowerMessage.includes('immediately')) {
        urgency = 'high';
    }
    else if (lowerMessage.includes('need') || lowerMessage.includes('help') ||
        lowerMessage.includes('important')) {
        urgency = 'medium';
    }
    return { needsScholarships, category, urgency };
}
/**
 * Generate unique session ID
 */
function generateSessionId() {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
//# sourceMappingURL=chat.js.map