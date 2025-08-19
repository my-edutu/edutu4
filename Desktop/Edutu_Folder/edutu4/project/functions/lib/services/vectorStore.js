"use strict";
/**
 * Advanced Vector Store Operations for Edutu RAG System
 * Handles all vector database operations with intelligent retrieval strategies
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
exports.vectorStore = exports.VectorStore = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const admin = __importStar(require("firebase-admin"));
const enhancedEmbeddingService_1 = require("./enhancedEmbeddingService");
class VectorStore {
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        this.db = admin.firestore();
    }
    /**
     * Advanced context retrieval for RAG
     * Combines multiple context sources with intelligent ranking
     */
    async retrieveContext(params) {
        const { userId, sessionId, query, queryEmbedding, maxResults = 10, similarityThreshold = 0.7, includeHistory = true, timeWindow = 24 } = params;
        // Generate query embedding if not provided
        const embedding = queryEmbedding || (await enhancedEmbeddingService_1.enhancedEmbeddingService.generateEmbedding(query, 'openai', { userId, contentType: 'query' })).embedding;
        // Parallel retrieval of different context types
        const [scholarships, roadmaps, chatHistory, userContext] = await Promise.all([
            this.searchScholarships(embedding, userId, maxResults, similarityThreshold),
            this.searchRoadmaps(embedding, userId, maxResults, similarityThreshold),
            includeHistory ? this.searchChatHistory(userId, sessionId, embedding, maxResults, timeWindow) : [],
            this.getUserContext(userId)
        ]);
        // Calculate total tokens for context management
        const totalTokens = this.estimateTokenCount([
            ...scholarships.map(s => s.content),
            ...roadmaps.map(r => r.content),
            ...chatHistory.map(c => c.content)
        ]);
        return {
            scholarships,
            roadmaps,
            chatHistory,
            userContext,
            totalTokens
        };
    }
    /**
     * Hybrid search combining semantic similarity with contextual relevance
     */
    async hybridSearch(params) {
        const { query, queryEmbedding, userId, contentTypes = ['scholarships', 'roadmaps'], maxResults = 15, semanticWeight = 0.4, contextWeight = 0.4, recencyWeight = 0.2 } = params;
        const results = [];
        // Search across different content types
        for (const contentType of contentTypes) {
            let searchResults = [];
            switch (contentType) {
                case 'scholarships':
                    searchResults = await this.searchScholarshipsAdvanced(queryEmbedding, userId, maxResults, 0.6);
                    break;
                case 'roadmaps':
                    searchResults = await this.searchRoadmapsAdvanced(queryEmbedding, userId, maxResults, 0.6);
                    break;
                case 'knowledge':
                    searchResults = await this.searchKnowledgeEntities(queryEmbedding, maxResults, 0.6);
                    break;
            }
            // Calculate hybrid scores
            searchResults.forEach(result => {
                result.relevanceScore = this.calculateHybridScore(result, { semanticWeight, contextWeight, recencyWeight });
            });
            results.push(...searchResults);
        }
        // Sort by relevance score and return top results
        return results
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
            .slice(0, maxResults);
    }
    /**
     * Search scholarships with contextual ranking
     */
    async searchScholarships(queryEmbedding, userId, limit, threshold) {
        const { data, error } = await this.supabase.rpc('match_contextual_scholarships', {
            query_embedding: queryEmbedding,
            user_id_param: userId,
            match_threshold: threshold,
            match_count: limit,
            recency_boost: 0.1
        });
        if (error) {
            console.error('Scholarship search error:', error);
            return [];
        }
        return data.map((item) => ({
            id: item.scholarship_id,
            content: `${item.title}\n\n${item.summary}`,
            metadata: {
                title: item.title,
                category: item.category,
                provider: item.provider,
                type: 'scholarship'
            },
            similarity: item.similarity,
            relevanceScore: item.final_score
        }));
    }
    /**
     * Advanced scholarship search with user preferences
     */
    async searchScholarshipsAdvanced(queryEmbedding, userId, limit, threshold) {
        // Get user skills for matching
        const userSkills = await this.getUserSkills(userId);
        const { data, error } = await this.supabase.rpc('match_contextual_scholarships', {
            query_embedding: queryEmbedding,
            user_id_param: userId,
            match_threshold: threshold,
            match_count: limit,
            recency_boost: 0.15
        });
        if (error) {
            console.error('Advanced scholarship search error:', error);
            return [];
        }
        return data.map((item) => ({
            id: item.scholarship_id,
            content: this.formatScholarshipContent(item),
            metadata: {
                title: item.title,
                category: item.category,
                provider: item.provider,
                type: 'scholarship',
                contextScore: item.context_score
            },
            similarity: item.similarity,
            relevanceScore: item.final_score
        }));
    }
    /**
     * Search roadmaps with skill matching
     */
    async searchRoadmaps(queryEmbedding, userId, limit, threshold) {
        const userSkills = await this.getUserSkills(userId);
        const { data, error } = await this.supabase.rpc('match_relevant_roadmaps', {
            query_embedding: queryEmbedding,
            user_skills: userSkills,
            difficulty_preference: 'any',
            match_threshold: threshold,
            match_count: limit
        });
        if (error) {
            console.error('Roadmap search error:', error);
            return [];
        }
        return data.map((item) => ({
            id: item.roadmap_id,
            content: `${item.title}\n\n${item.description}`,
            metadata: {
                title: item.title,
                skills: item.skills_involved,
                difficulty: item.difficulty_level,
                duration: item.estimated_duration,
                type: 'roadmap'
            },
            similarity: item.similarity,
            relevanceScore: item.skill_match_score
        }));
    }
    /**
     * Advanced roadmap search with personalized matching
     */
    async searchRoadmapsAdvanced(queryEmbedding, userId, limit, threshold) {
        const [userSkills, userLevel] = await Promise.all([
            this.getUserSkills(userId),
            this.getUserSkillLevel(userId)
        ]);
        const difficultyPreference = this.mapSkillLevelToDifficulty(userLevel);
        const { data, error } = await this.supabase.rpc('match_relevant_roadmaps', {
            query_embedding: queryEmbedding,
            user_skills: userSkills,
            difficulty_preference: difficultyPreference,
            match_threshold: threshold,
            match_count: limit
        });
        if (error) {
            console.error('Advanced roadmap search error:', error);
            return [];
        }
        return data.map((item) => ({
            id: item.roadmap_id,
            content: this.formatRoadmapContent(item),
            metadata: {
                title: item.title,
                skills: item.skills_involved,
                difficulty: item.difficulty_level,
                duration: item.estimated_duration,
                type: 'roadmap',
                skillMatch: item.skill_match_score
            },
            similarity: item.similarity,
            relevanceScore: item.similarity * 0.7 + item.skill_match_score * 0.3
        }));
    }
    /**
     * Search chat history for context
     */
    async searchChatHistory(userId, sessionId, queryEmbedding, limit, timeWindowHours) {
        // Get recent conversation context
        const { data: contextData, error: contextError } = await this.supabase.rpc('get_conversation_context', {
            user_id_param: userId,
            session_id_param: sessionId,
            context_limit: limit,
            similarity_threshold: 0.75
        });
        if (contextError) {
            console.error('Chat history search error:', contextError);
            return [];
        }
        // If we have query embedding, also do semantic search
        let semanticResults = [];
        if (queryEmbedding.length > 0) {
            const timeThreshold = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
            const { data: semanticData, error: semanticError } = await this.supabase
                .from('chat_history_embeddings')
                .select('message_id, message_text, message_type, message_intent, created_at')
                .eq('user_id', userId)
                .gte('created_at', timeThreshold.toISOString())
                .order('created_at', { ascending: false })
                .limit(limit);
            if (!semanticError && semanticData) {
                // Calculate similarities (this would be more efficient with a proper vector search function)
                semanticResults = semanticData.map(item => (Object.assign(Object.assign({}, item), { similarity: 0.8 // Placeholder - would calculate actual similarity
                 })));
            }
        }
        // Combine and format results
        const allResults = [...contextData, ...semanticResults];
        const uniqueResults = this.deduplicateById(allResults, 'message_id');
        return uniqueResults.map((item) => ({
            id: item.message_id,
            content: item.message_text,
            metadata: {
                type: 'chat_history',
                messageType: item.message_type,
                intent: item.message_intent,
                timestamp: item.created_at
            },
            similarity: item.similarity || item.relevance_score || 0.8,
            relevanceScore: item.relevance_score || 0.8
        })).slice(0, limit);
    }
    /**
     * Search knowledge entities
     */
    async searchKnowledgeEntities(queryEmbedding, limit, threshold) {
        const { data, error } = await this.supabase
            .from('knowledge_entities')
            .select('*')
            .order('popularity_score', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('Knowledge entities search error:', error);
            return [];
        }
        // Calculate similarities and filter
        const results = data
            .map(item => ({
            id: item.entity_id,
            content: `${item.entity_name}: ${item.entity_description || ''}`,
            metadata: {
                name: item.entity_name,
                type: item.entity_type,
                popularity: item.popularity_score,
                relatedEntities: item.related_entities
            },
            similarity: 0.8, // Placeholder - would calculate actual similarity
            relevanceScore: item.popularity_score * 0.3 + 0.7 // Combine with similarity
        }))
            .filter(item => item.similarity >= threshold)
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        return results;
    }
    /**
     * Get comprehensive user context
     */
    async getUserContext(userId) {
        var _a;
        try {
            // Get user profile from Firestore
            const userDoc = await this.db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            // Get user context embeddings from Supabase
            const { data: contextData } = await this.supabase
                .from('user_context_embeddings')
                .select('*')
                .eq('user_id', userId)
                .single();
            // Get recent goals
            const recentGoals = await this.db
                .collection('goals')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .limit(5)
                .get();
            const goals = recentGoals.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            return {
                profile: (userData === null || userData === void 0 ? void 0 : userData.preferences) || {},
                demographics: {
                    age: userData === null || userData === void 0 ? void 0 : userData.age,
                    educationLevel: (_a = userData === null || userData === void 0 ? void 0 : userData.preferences) === null || _a === void 0 ? void 0 : _a.educationLevel
                },
                context: (contextData === null || contextData === void 0 ? void 0 : contextData.context_metadata) || {},
                learningStyle: (contextData === null || contextData === void 0 ? void 0 : contextData.learning_style) || 'mixed',
                careerStage: (contextData === null || contextData === void 0 ? void 0 : contextData.career_stage) || 'student',
                skillLevel: (contextData === null || contextData === void 0 ? void 0 : contextData.skill_level) || 'beginner',
                activeGoals: goals,
                lastActivity: contextData === null || contextData === void 0 ? void 0 : contextData.last_activity
            };
        }
        catch (error) {
            console.error(`Failed to get user context for ${userId}:`, error);
            return {};
        }
    }
    /**
     * Store chat message embedding
     */
    async storeChatMessage(userId, sessionId, messageId, messageText, messageType, messageIntent) {
        await enhancedEmbeddingService_1.enhancedEmbeddingService.processChatMessage(userId, sessionId, messageId, messageText, messageType, messageIntent);
    }
    /**
     * Create or update conversation session
     */
    async upsertConversationSession(sessionId, userId, sessionTitle) {
        const { error } = await this.supabase
            .from('conversation_sessions')
            .upsert({
            session_id: sessionId,
            user_id: userId,
            session_title: sessionTitle,
            is_active: true,
            started_at: new Date().toISOString()
        });
        if (error) {
            console.error('Failed to upsert conversation session:', error);
            throw error;
        }
    }
    /**
     * End conversation session with summary
     */
    async endConversationSession(sessionId, summary, keyTopics, sentimentTrend) {
        const { error } = await this.supabase
            .from('conversation_sessions')
            .update({
            is_active: false,
            ended_at: new Date().toISOString(),
            session_summary: summary,
            key_topics: keyTopics,
            sentiment_trend: sentimentTrend
        })
            .eq('session_id', sessionId);
        if (error) {
            console.error('Failed to end conversation session:', error);
            throw error;
        }
    }
    /**
     * Store scholarship embedding
     */
    async storeScholarshipEmbedding(scholarshipId, title, content, metadata) {
        const embeddingResult = await enhancedEmbeddingService_1.enhancedEmbeddingService.generateContextualEmbedding({
            content: `${title}\n\n${content}`,
            contentType: 'scholarship',
            metadata: Object.assign(Object.assign({}, metadata), { title })
        });
        await this.supabase
            .from('scholarships_embeddings')
            .upsert({
            scholarship_id: scholarshipId,
            title,
            summary: content,
            category: metadata.category || 'General',
            provider: metadata.provider || 'Unknown',
            embedding: embeddingResult.embedding,
            content_hash: embeddingResult.contextHash,
            embedding_model: embeddingResult.model,
            metadata: embeddingResult.metadata,
            last_updated: new Date().toISOString()
        });
    }
    /**
     * Store roadmap embedding
     */
    async storeRoadmapEmbedding(roadmapId, title, description, phases, metadata) {
        const phaseContent = phases
            .map(phase => { var _a; return `${phase.phase}: ${((_a = phase.tasks) === null || _a === void 0 ? void 0 : _a.join(', ')) || ''}`; })
            .join('\n');
        const fullContent = `${title}\n\n${description}\n\nPhases:\n${phaseContent}`;
        const embeddingResult = await enhancedEmbeddingService_1.enhancedEmbeddingService.generateContextualEmbedding({
            content: fullContent,
            contentType: 'roadmap',
            metadata: Object.assign(Object.assign({}, metadata), { title, description })
        });
        await this.supabase
            .from('roadmap_embeddings')
            .upsert({
            roadmap_id: roadmapId,
            title,
            description,
            phase_content: phaseContent,
            skills_involved: metadata.skills || [],
            difficulty_level: metadata.difficulty || 'intermediate',
            estimated_duration: metadata.duration || '6 weeks',
            embedding: embeddingResult.embedding,
            content_hash: embeddingResult.contextHash,
            embedding_model: embeddingResult.model,
            last_updated: new Date().toISOString()
        });
    }
    // Helper methods
    calculateHybridScore(result, weights) {
        var _a, _b;
        const semantic = result.similarity || 0;
        const context = ((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.contextScore) || 0;
        const recency = this.calculateRecencyScore((_b = result.metadata) === null || _b === void 0 ? void 0 : _b.timestamp);
        return (semantic * weights.semanticWeight +
            context * weights.contextWeight +
            recency * weights.recencyWeight);
    }
    calculateRecencyScore(timestamp) {
        if (!timestamp)
            return 0;
        const age = Date.now() - new Date(timestamp).getTime();
        const ageInHours = age / (1000 * 60 * 60);
        // Exponential decay: newer content gets higher scores
        return Math.exp(-ageInHours / 24); // Half-life of 24 hours
    }
    async getUserSkills(userId) {
        var _a;
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            return ((_a = userData === null || userData === void 0 ? void 0 : userData.preferences) === null || _a === void 0 ? void 0 : _a.currentSkills) || [];
        }
        catch (error) {
            console.error(`Failed to get user skills for ${userId}:`, error);
            return [];
        }
    }
    async getUserSkillLevel(userId) {
        try {
            const { data } = await this.supabase
                .from('user_context_embeddings')
                .select('skill_level')
                .eq('user_id', userId)
                .single();
            return (data === null || data === void 0 ? void 0 : data.skill_level) || 'beginner';
        }
        catch (error) {
            return 'beginner';
        }
    }
    mapSkillLevelToDifficulty(skillLevel) {
        switch (skillLevel) {
            case 'beginner': return 'easy';
            case 'intermediate': return 'medium';
            case 'advanced': return 'hard';
            default: return 'any';
        }
    }
    formatScholarshipContent(item) {
        return `${item.title}

Provider: ${item.provider}
Category: ${item.category}

${item.summary}

This scholarship has a ${item.context_score > 0.8 ? 'high' : 'moderate'} relevance match to your profile.`;
    }
    formatRoadmapContent(item) {
        var _a;
        return `${item.title}

Duration: ${item.estimated_duration}
Difficulty: ${item.difficulty_level}
Skills: ${(_a = item.skills_involved) === null || _a === void 0 ? void 0 : _a.join(', ')}

${item.description}

This roadmap has a ${item.skill_match_score > 0.7 ? 'strong' : 'moderate'} skill match for your current level.`;
    }
    deduplicateById(items, idField) {
        const seen = new Set();
        return items.filter(item => {
            const id = item[idField];
            if (seen.has(id))
                return false;
            seen.add(id);
            return true;
        });
    }
    estimateTokenCount(texts) {
        // Rough estimation: ~4 characters per token
        return texts.reduce((total, text) => total + Math.ceil(text.length / 4), 0);
    }
    /**
     * Get vector database statistics
     */
    async getVectorStats() {
        const { data, error } = await this.supabase
            .from('rag_performance_stats')
            .select('*');
        if (error) {
            console.error('Failed to get vector stats:', error);
            return {};
        }
        return data.reduce((acc, row) => {
            acc[row.table_name] = {
                totalRecords: row.total_records,
                uniqueUsers: row.unique_users,
                avgAge: row.avg_age_days
            };
            return acc;
        }, {});
    }
}
exports.VectorStore = VectorStore;
exports.vectorStore = new VectorStore();
//# sourceMappingURL=vectorStore.js.map