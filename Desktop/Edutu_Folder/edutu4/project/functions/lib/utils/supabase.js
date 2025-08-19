"use strict";
/**
 * Supabase Vector Database Utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeScholarshipEmbedding = storeScholarshipEmbedding;
exports.storeUserPreferencesEmbedding = storeUserPreferencesEmbedding;
exports.getUserRecommendations = getUserRecommendations;
exports.findSimilarScholarships = findSimilarScholarships;
exports.updateUserRecommendations = updateUserRecommendations;
exports.getEmbeddingStats = getEmbeddingStats;
exports.refreshAllEmbeddings = refreshAllEmbeddings;
const supabase_js_1 = require("@supabase/supabase-js");
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Warning: Supabase credentials not configured. Vector operations will fail.');
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
/**
 * Store scholarship embedding in Supabase vector database
 */
async function storeScholarshipEmbedding(scholarshipId, embedding, metadata) {
    try {
        const { error } = await supabase
            .from('scholarship_embeddings')
            .upsert({
            scholarship_id: scholarshipId,
            embedding,
            title: metadata.title,
            summary: metadata.summary,
            provider: metadata.provider,
            category: metadata.category,
            amount: metadata.amount,
            deadline: metadata.deadline,
            tags: metadata.tags || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        if (error) {
            console.error('Error storing scholarship embedding:', error);
            throw new Error(`Failed to store embedding: ${error.message}`);
        }
        console.log(`✅ Stored embedding for scholarship: ${scholarshipId}`);
    }
    catch (error) {
        console.error('Supabase scholarship embedding error:', error);
        throw error;
    }
}
/**
 * Store user preferences embedding in Supabase
 */
async function storeUserPreferencesEmbedding(userId, embedding, userProfile) {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { error } = await supabase
            .from('user_embeddings')
            .upsert({
            user_id: userId,
            embedding,
            education_level: (_a = userProfile.preferences) === null || _a === void 0 ? void 0 : _a.educationLevel,
            career_interests: ((_b = userProfile.preferences) === null || _b === void 0 ? void 0 : _b.careerInterests) || [],
            learning_style: (_c = userProfile.preferences) === null || _c === void 0 ? void 0 : _c.learningStyle,
            time_availability: (_d = userProfile.preferences) === null || _d === void 0 ? void 0 : _d.timeAvailability,
            goals: (_e = userProfile.preferences) === null || _e === void 0 ? void 0 : _e.currentGoals,
            skills: ((_f = userProfile.preferences) === null || _f === void 0 ? void 0 : _f.skillsToImprove) || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        if (error) {
            console.error('Error storing user embedding:', error);
            throw new Error(`Failed to store user embedding: ${error.message}`);
        }
        console.log(`✅ Stored user embedding: ${userId}`);
    }
    catch (error) {
        console.error('Supabase user embedding error:', error);
        throw error;
    }
}
/**
 * Get personalized recommendations using vector similarity
 */
async function getUserRecommendations(userId, limit = 5) {
    try {
        // First get user embedding
        const { data: userEmbedding, error: userError } = await supabase
            .from('user_embeddings')
            .select('embedding')
            .eq('user_id', userId)
            .single();
        if (userError || !userEmbedding) {
            console.warn(`No user embedding found for ${userId}`);
            return [];
        }
        // Find similar scholarships using vector similarity
        const { data: recommendations, error: recError } = await supabase.rpc('match_scholarships', {
            query_embedding: userEmbedding.embedding,
            match_threshold: 0.5,
            match_count: limit
        });
        if (recError) {
            console.error('Error fetching recommendations:', recError);
            throw new Error(`Failed to fetch recommendations: ${recError.message}`);
        }
        return recommendations || [];
    }
    catch (error) {
        console.error('Get recommendations error:', error);
        return []; // Return empty array instead of throwing
    }
}
/**
 * Find scholarships similar to a given scholarship
 */
async function findSimilarScholarships(scholarshipId, limit = 3) {
    try {
        // Get the scholarship's embedding
        const { data: scholarshipEmbedding, error: embError } = await supabase
            .from('scholarship_embeddings')
            .select('embedding')
            .eq('scholarship_id', scholarshipId)
            .single();
        if (embError || !scholarshipEmbedding) {
            console.warn(`No embedding found for scholarship ${scholarshipId}`);
            return [];
        }
        // Find similar scholarships
        const { data: similar, error: simError } = await supabase.rpc('match_scholarships', {
            query_embedding: scholarshipEmbedding.embedding,
            match_threshold: 0.6,
            match_count: limit + 1 // +1 to exclude the source scholarship
        });
        if (simError) {
            console.error('Error finding similar scholarships:', simError);
            throw new Error(`Failed to find similar scholarships: ${simError.message}`);
        }
        // Filter out the source scholarship
        const filtered = (similar || []).filter((s) => s.scholarship_id !== scholarshipId);
        return filtered.slice(0, limit);
    }
    catch (error) {
        console.error('Find similar scholarships error:', error);
        return [];
    }
}
/**
 * Update user recommendations after embedding changes
 */
async function updateUserRecommendations(userId) {
    try {
        // Get fresh recommendations
        const recommendations = await getUserRecommendations(userId, 10);
        if (recommendations.length === 0) {
            console.warn(`No recommendations generated for user ${userId}`);
            return;
        }
        // Store in cache table for quick access
        const { error } = await supabase
            .from('user_recommendations')
            .upsert({
            user_id: userId,
            recommendations: recommendations,
            generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        if (error) {
            console.error('Error caching recommendations:', error);
            throw new Error(`Failed to cache recommendations: ${error.message}`);
        }
        console.log(`✅ Updated recommendations for user: ${userId}`);
    }
    catch (error) {
        console.error('Update user recommendations error:', error);
        throw error;
    }
}
/**
 * Get embedding system statistics
 */
async function getEmbeddingStats() {
    try {
        const [scholarshipCount, userCount, recommendationCount] = await Promise.all([
            supabase.from('scholarship_embeddings').select('scholarship_id', { count: 'exact', head: true }),
            supabase.from('user_embeddings').select('user_id', { count: 'exact', head: true }),
            supabase.from('user_recommendations').select('user_id', { count: 'exact', head: true })
        ]);
        return {
            totalScholarshipEmbeddings: scholarshipCount.count || 0,
            totalUserEmbeddings: userCount.count || 0,
            totalCachedRecommendations: recommendationCount.count || 0,
            lastUpdated: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error getting embedding stats:', error);
        return {
            totalScholarshipEmbeddings: 0,
            totalUserEmbeddings: 0,
            totalCachedRecommendations: 0,
            lastUpdated: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Refresh all embeddings (used by scheduled function)
 */
async function refreshAllEmbeddings() {
    // This is a placeholder - the actual implementation would be in the scheduled function
    // that processes scholarships and users in batches
    return { processed: 0, errors: 0 };
}
//# sourceMappingURL=supabase.js.map