"use strict";
/**
 * Enhanced Embedding Service for Edutu RAG System
 * Supports multi-provider embeddings with intelligent fallback and caching
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedEmbeddingService = exports.EnhancedEmbeddingService = void 0;
const openai_1 = require("openai");
const cohere_ai_1 = require("cohere-ai");
const generative_ai_1 = require("@google/generative-ai");
const supabase_js_1 = require("@supabase/supabase-js");
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
class EnhancedEmbeddingService {
    constructor() {
        // Embedding providers configuration
        this.providers = {
            openai: {
                model: 'text-embedding-3-small',
                dimensions: 1536,
                maxTokens: 8191,
                costPer1kTokens: 0.00002
            },
            cohere: {
                model: 'embed-english-light-v3.0',
                dimensions: 1024,
                maxTokens: 512,
                costPer1kTokens: 0.0001
            },
            gemini: {
                model: 'embedding-001',
                dimensions: 768,
                maxTokens: 2048,
                costPer1kTokens: 0.0000125
            }
        };
        // Cache for frequent embeddings
        this.embeddingCache = new Map();
        this.cacheMaxSize = 1000;
        // Initialize AI providers
        this.openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.cohere = new cohere_ai_1.CohereClient({
            token: process.env.COHERE_API_KEY || ''
        });
        this.gemini = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        // Initialize Supabase
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        this.db = admin.firestore();
    }
    /**
     * Generate embeddings with intelligent provider selection and fallback
     */
    async generateEmbedding(text, preferredProvider = 'openai', options = {}) {
        const { useCache = true, userId, contentType } = options;
        // Check cache first
        if (useCache) {
            const cacheKey = this.getCacheKey(text, preferredProvider);
            const cached = this.embeddingCache.get(cacheKey);
            if (cached) {
                console.log(`Cache hit for ${contentType || 'content'} embedding`);
                return cached;
            }
        }
        // Clean and prepare text
        const cleanText = this.preprocessText(text);
        if (!cleanText.trim()) {
            throw new Error('Text is empty after preprocessing');
        }
        // Try providers in order with intelligent fallback
        const providers = this.getProviderOrder(preferredProvider, cleanText.length);
        for (const provider of providers) {
            try {
                const result = await this.generateWithProvider(cleanText, provider);
                // Cache successful result
                if (useCache) {
                    this.cacheEmbedding(cleanText, preferredProvider, result);
                }
                // Log usage for analytics
                await this.logEmbeddingUsage(provider, result, userId, contentType);
                return result;
            }
            catch (error) {
                console.warn(`Embedding failed with ${provider}:`, error);
                continue;
            }
        }
        throw new Error('All embedding providers failed');
    }
    /**
     * Generate embeddings in batches for efficiency
     */
    async generateBatchEmbeddings(batch, preferredProvider = 'openai') {
        const results = [];
        const batchSize = this.getBatchSize(preferredProvider);
        // Process in smaller chunks to avoid rate limits
        for (let i = 0; i < batch.texts.length; i += batchSize) {
            const chunk = batch.texts.slice(i, i + batchSize);
            const chunkMetadata = batch.metadata.slice(i, i + batchSize);
            try {
                const chunkResults = await Promise.all(chunk.map((text, index) => {
                    var _a;
                    return this.generateEmbedding(text, preferredProvider, {
                        useCache: true,
                        contentType: (_a = chunkMetadata[index]) === null || _a === void 0 ? void 0 : _a.contentType
                    });
                }));
                results.push(...chunkResults);
                // Rate limiting delay
                if (i + batchSize < batch.texts.length) {
                    await this.delay(this.getRateLimitDelay(preferredProvider));
                }
            }
            catch (error) {
                console.error(`Batch embedding failed for chunk ${i}-${i + batchSize}:`, error);
                throw error;
            }
        }
        return results;
    }
    /**
     * Generate contextual embeddings with enhanced metadata
     */
    async generateContextualEmbedding(context) {
        // Enhanced text preparation based on content type
        const enhancedText = this.enhanceTextForContext(context);
        // Generate embedding
        const embedding = await this.generateEmbedding(enhancedText, this.getOptimalProvider(context.contentType), {
            useCache: true,
            userId: context.userId,
            contentType: context.contentType
        });
        // Generate content hash for change detection
        const contextHash = this.generateContentHash(enhancedText);
        return Object.assign(Object.assign({}, embedding), { contextHash, metadata: Object.assign(Object.assign({}, context.metadata), { originalLength: context.content.length, enhancedLength: enhancedText.length, contentType: context.contentType, processingTimestamp: new Date().toISOString() }) });
    }
    /**
     * Store embeddings in Supabase with proper metadata
     */
    async storeEmbedding(tableName, data) {
        const { error } = await this.supabase
            .from(tableName)
            .upsert(Object.assign(Object.assign({}, data), { embedding_model: data.metadata.model || 'text-embedding-3-small', last_updated: new Date().toISOString() }));
        if (error) {
            throw new Error(`Failed to store embedding: ${error.message}`);
        }
    }
    /**
     * Batch store embeddings for efficiency
     */
    async storeBatchEmbeddings(tableName, embeddings) {
        const batchSize = 100; // Supabase batch limit
        for (let i = 0; i < embeddings.length; i += batchSize) {
            const batch = embeddings.slice(i, i + batchSize).map(item => (Object.assign(Object.assign({}, item), { embedding_model: item.metadata.model || 'text-embedding-3-small', last_updated: new Date().toISOString() })));
            const { error } = await this.supabase
                .from(tableName)
                .upsert(batch);
            if (error) {
                throw new Error(`Failed to store batch embeddings: ${error.message}`);
            }
        }
    }
    /**
     * Update user context embeddings
     */
    async updateUserContextEmbedding(userId) {
        var _a, _b;
        try {
            // Fetch user data from Firestore
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                throw new Error(`User ${userId} not found`);
            }
            const userData = userDoc.data();
            // Build comprehensive user context
            const profileContext = this.buildUserProfileContext(userData);
            const activityContext = await this.buildUserActivityContext(userId);
            const goalContext = await this.buildUserGoalContext(userId);
            // Generate embeddings for each context type
            const [profileEmbedding, activityEmbedding, goalEmbedding] = await Promise.all([
                this.generateEmbedding(profileContext, 'openai', {
                    userId,
                    contentType: 'user_profile'
                }),
                activityContext ? this.generateEmbedding(activityContext, 'openai', {
                    userId,
                    contentType: 'user_activity'
                }) : null,
                goalContext ? this.generateEmbedding(goalContext, 'openai', {
                    userId,
                    contentType: 'user_goals'
                }) : null
            ]);
            // Store in Supabase
            await this.supabase
                .from('user_context_embeddings')
                .upsert({
                user_id: userId,
                profile_embedding: profileEmbedding.embedding,
                activity_embedding: (activityEmbedding === null || activityEmbedding === void 0 ? void 0 : activityEmbedding.embedding) || null,
                goal_embedding: (goalEmbedding === null || goalEmbedding === void 0 ? void 0 : goalEmbedding.embedding) || null,
                learning_style: ((_a = userData.preferences) === null || _a === void 0 ? void 0 : _a.learningStyle) || 'mixed',
                career_stage: this.determineCareerStage(userData),
                skill_level: this.determineSkillLevel(userData),
                context_metadata: {
                    profileTokens: ((_b = profileEmbedding.usage) === null || _b === void 0 ? void 0 : _b.totalTokens) || 0,
                    lastUpdated: new Date().toISOString(),
                    dataVersion: '2.0'
                },
                last_activity: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            console.log(`Updated context embeddings for user ${userId}`);
        }
        catch (error) {
            console.error(`Failed to update user context embedding for ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Process chat message and store embedding
     */
    async processChatMessage(userId, sessionId, messageId, messageText, messageType, messageIntent) {
        try {
            // Generate embedding for the message
            const embedding = await this.generateEmbedding(messageText, 'openai', {
                userId,
                contentType: 'chat'
            });
            // Extract entities and analyze sentiment
            const entities = await this.extractEntities(messageText);
            const sentiment = await this.analyzeSentiment(messageText);
            // Store in Supabase
            await this.supabase
                .from('chat_history_embeddings')
                .insert({
                user_id: userId,
                session_id: sessionId,
                message_id: messageId,
                message_text: messageText,
                message_type: messageType,
                embedding: embedding.embedding,
                message_intent: messageIntent,
                context_entities: entities,
                sentiment_score: sentiment,
                created_at: new Date().toISOString()
            });
            // Update session message count
            await this.updateSessionMetrics(sessionId);
        }
        catch (error) {
            console.error(`Failed to process chat message ${messageId}:`, error);
            throw error;
        }
    }
    // Private helper methods
    async generateWithProvider(text, provider) {
        switch (provider) {
            case 'openai':
                return await this.generateOpenAIEmbedding(text);
            case 'cohere':
                return await this.generateCohereEmbedding(text);
            case 'gemini':
                return await this.generateGeminiEmbedding(text);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    async generateOpenAIEmbedding(text) {
        const response = await this.openai.embeddings.create({
            model: this.providers.openai.model,
            input: text,
            dimensions: this.providers.openai.dimensions
        });
        return {
            embedding: response.data[0].embedding,
            model: this.providers.openai.model,
            dimensions: this.providers.openai.dimensions,
            provider: 'openai',
            usage: {
                promptTokens: response.usage.prompt_tokens,
                totalTokens: response.usage.total_tokens
            }
        };
    }
    async generateCohereEmbedding(text) {
        const response = await this.cohere.embed({
            texts: [text],
            model: this.providers.cohere.model,
            inputType: 'search_document'
        });
        return {
            embedding: response.embeddings[0],
            model: this.providers.cohere.model,
            dimensions: this.providers.cohere.dimensions,
            provider: 'cohere',
            usage: {
                promptTokens: 0, // Cohere doesn't provide token usage
                totalTokens: 0
            }
        };
    }
    async generateGeminiEmbedding(text) {
        const model = this.gemini.getGenerativeModel({
            model: 'embedding-001'
        });
        const result = await model.embedContent(text);
        return {
            embedding: result.embedding.values,
            model: this.providers.gemini.model,
            dimensions: this.providers.gemini.dimensions,
            provider: 'gemini',
            usage: {
                promptTokens: 0, // Gemini doesn't provide detailed usage
                totalTokens: 0
            }
        };
    }
    preprocessText(text) {
        return text
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s\-.,!?;:()"']/g, '') // Remove special chars
            .trim()
            .substring(0, 8000); // Limit length
    }
    enhanceTextForContext(context) {
        var _a;
        const { content, contentType, metadata } = context;
        switch (contentType) {
            case 'scholarship':
                return `Scholarship: ${metadata.title || ''}\n${content}\nProvider: ${metadata.provider || ''}\nCategory: ${metadata.category || ''}`;
            case 'roadmap':
                return `Learning Roadmap: ${metadata.title || ''}\n${content}\nSkills: ${((_a = metadata.skills) === null || _a === void 0 ? void 0 : _a.join(', ')) || ''}\nDifficulty: ${metadata.difficulty || ''}`;
            case 'chat':
                return `Chat message: ${content}`;
            case 'user_profile':
                return `User profile: ${content}`;
            default:
                return content;
        }
    }
    buildUserProfileContext(userData) {
        var _a, _b, _c, _d;
        const preferences = userData.preferences || {};
        return `
      Education Level: ${preferences.educationLevel || 'Not specified'}
      Career Interests: ${((_a = preferences.careerInterests) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'Not specified'}
      Learning Style: ${preferences.learningStyle || 'Not specified'}
      Current Skills: ${((_b = preferences.currentSkills) === null || _b === void 0 ? void 0 : _b.join(', ')) || 'Not specified'}
      Career Goals: ${((_c = preferences.careerGoals) === null || _c === void 0 ? void 0 : _c.join(', ')) || 'Not specified'}
      Time Availability: ${preferences.timeAvailability || 'Not specified'}
      Location Preferences: ${((_d = preferences.preferredLocations) === null || _d === void 0 ? void 0 : _d.join(', ')) || 'Not specified'}
      Age: ${userData.age || 'Not specified'}
    `.trim();
    }
    async buildUserActivityContext(userId) {
        try {
            const recentActivity = await this.db
                .collection('userActivity')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            if (recentActivity.empty)
                return null;
            const activities = recentActivity.docs.map(doc => {
                const data = doc.data();
                return `${data.action}: ${data.details || data.target}`;
            });
            return `Recent activity: ${activities.join('; ')}`;
        }
        catch (error) {
            console.warn(`Failed to build activity context for ${userId}:`, error);
            return null;
        }
    }
    async buildUserGoalContext(userId) {
        try {
            const goals = await this.db
                .collection('goals')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .get();
            if (goals.empty)
                return null;
            const goalTexts = goals.docs.map(doc => {
                const data = doc.data();
                return `${data.title}: ${data.description || ''}`;
            });
            return `Current goals: ${goalTexts.join('; ')}`;
        }
        catch (error) {
            console.warn(`Failed to build goal context for ${userId}:`, error);
            return null;
        }
    }
    getCacheKey(text, provider) {
        return crypto
            .createHash('md5')
            .update(`${provider}:${text}`)
            .digest('hex');
    }
    cacheEmbedding(text, provider, result) {
        if (this.embeddingCache.size >= this.cacheMaxSize) {
            // Remove oldest entry
            const firstKey = this.embeddingCache.keys().next().value;
            this.embeddingCache.delete(firstKey);
        }
        const cacheKey = this.getCacheKey(text, provider);
        this.embeddingCache.set(cacheKey, result);
    }
    generateContentHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    getProviderOrder(preferred, textLength) {
        // Optimize provider selection based on text length and cost
        if (textLength > 4000) {
            return ['openai', 'gemini', 'cohere'];
        }
        else if (textLength > 1000) {
            return [preferred, 'openai', 'cohere', 'gemini'].filter((v, i, a) => a.indexOf(v) === i);
        }
        else {
            return ['cohere', 'openai', 'gemini'];
        }
    }
    getOptimalProvider(contentType) {
        switch (contentType) {
            case 'scholarship':
            case 'roadmap':
                return 'openai'; // Best for long-form content
            case 'chat':
                return 'cohere'; // Fast and cheap for short messages
            case 'user_profile':
                return 'openai'; // Best for complex structured data
            default:
                return 'openai';
        }
    }
    getBatchSize(provider) {
        switch (provider) {
            case 'openai': return 20;
            case 'cohere': return 50;
            case 'gemini': return 10;
            default: return 10;
        }
    }
    getRateLimitDelay(provider) {
        switch (provider) {
            case 'openai': return 100; // 10 RPS limit
            case 'cohere': return 50; // 20 RPS limit
            case 'gemini': return 200; // 5 RPS limit
            default: return 100;
        }
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    determineCareerStage(userData) {
        var _a;
        const age = userData.age || 0;
        const education = ((_a = userData.preferences) === null || _a === void 0 ? void 0 : _a.educationLevel) || '';
        if (age < 20 || education.includes('high school'))
            return 'student';
        if (age < 25 || education.includes('undergraduate'))
            return 'early_career';
        if (age < 30)
            return 'mid_career';
        return 'experienced';
    }
    determineSkillLevel(userData) {
        var _a;
        const skills = ((_a = userData.preferences) === null || _a === void 0 ? void 0 : _a.currentSkills) || [];
        if (skills.length === 0)
            return 'beginner';
        if (skills.length < 3)
            return 'intermediate';
        return 'advanced';
    }
    async extractEntities(text) {
        // Simple entity extraction - can be enhanced with NLP libraries
        const entities = [];
        // Look for scholarship-related terms
        const scholarshipTerms = ['scholarship', 'grant', 'fellowship', 'funding', 'financial aid'];
        const careerTerms = ['career', 'job', 'internship', 'work', 'profession'];
        const skillTerms = ['skill', 'learn', 'study', 'course', 'training'];
        const lowerText = text.toLowerCase();
        if (scholarshipTerms.some(term => lowerText.includes(term))) {
            entities.push('scholarship');
        }
        if (careerTerms.some(term => lowerText.includes(term))) {
            entities.push('career');
        }
        if (skillTerms.some(term => lowerText.includes(term))) {
            entities.push('skills');
        }
        return entities;
    }
    async analyzeSentiment(text) {
        // Simple sentiment analysis - can be enhanced with ML models
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'helpful', 'thank'];
        const negativeWords = ['bad', 'terrible', 'awful', 'confused', 'frustrated', 'difficult'];
        const words = text.toLowerCase().split(/\s+/);
        let score = 0;
        words.forEach(word => {
            if (positiveWords.includes(word))
                score += 0.1;
            if (negativeWords.includes(word))
                score -= 0.1;
        });
        return Math.max(-1, Math.min(1, score));
    }
    async updateSessionMetrics(sessionId) {
        const { error } = await this.supabase
            .from('conversation_sessions')
            .update({
            message_count: 'message_count + 1',
            updated_at: new Date().toISOString()
        })
            .eq('session_id', sessionId);
        if (error) {
            console.warn(`Failed to update session metrics: ${error.message}`);
        }
    }
    async logEmbeddingUsage(provider, result, userId, contentType) {
        var _a, _b;
        try {
            await this.db.collection('embeddingLogs').add({
                provider,
                model: result.model,
                dimensions: result.dimensions,
                userId: userId || null,
                contentType: contentType || null,
                tokens: ((_a = result.usage) === null || _a === void 0 ? void 0 : _a.totalTokens) || 0,
                cost: this.calculateCost(provider, ((_b = result.usage) === null || _b === void 0 ? void 0 : _b.totalTokens) || 0),
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        catch (error) {
            console.warn('Failed to log embedding usage:', error);
        }
    }
    calculateCost(provider, tokens) {
        const config = this.providers[provider];
        return (tokens / 1000) * config.costPer1kTokens;
    }
}
exports.EnhancedEmbeddingService = EnhancedEmbeddingService;
exports.enhancedEmbeddingService = new EnhancedEmbeddingService();
//# sourceMappingURL=enhancedEmbeddingService.js.map