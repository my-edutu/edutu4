"use strict";
/**
 * Recommendations API Routes - Firebase Functions Version
 * Handles AI-powered opportunity recommendations using vector embeddings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRecommendationRouter = createRecommendationRouter;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../utils/auth");
const aiService_1 = require("../services/aiService");
const supabase_1 = require("../utils/supabase");
const firebase_1 = require("../utils/firebase");
function createRecommendationRouter() {
    const router = (0, express_1.Router)();
    /**
     * Get personalized recommendations for a user
     * GET /api/recommendations/user/:userId
     */
    router.get('/user/:userId', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.param)('userId').isString().notEmpty().withMessage('User ID is required'),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
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
            const limit = parseInt(req.query.limit) || 3;
            console.log(`Getting recommendations for user ${userId}`);
            // Get recommendations from vector database
            const recommendations = await (0, supabase_1.getUserRecommendations)(userId, limit);
            if (recommendations.length === 0) {
                // Fallback: Generate recommendations if none exist
                await generateUserRecommendations(userId);
                const fallbackRecommendations = await (0, supabase_1.getUserRecommendations)(userId, limit);
                return res.json({
                    success: true,
                    recommendations: fallbackRecommendations,
                    message: 'Generated fresh recommendations',
                    fresh: true
                });
            }
            res.json({
                success: true,
                recommendations,
                total: recommendations.length
            });
        }
        catch (error) {
            console.error('Error getting recommendations:', error);
            res.status(500).json({
                error: 'Failed to get recommendations',
                message: error.message
            });
        }
    });
    /**
     * Generate fresh recommendations for a user
     * POST /api/recommendations/user/:userId/refresh
     */
    router.post('/user/:userId/refresh', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.param)('userId').isString().notEmpty().withMessage('User ID is required'),
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
            console.log(`Refreshing recommendations for user ${userId}`);
            await generateUserRecommendations(userId);
            const recommendations = await (0, supabase_1.getUserRecommendations)(userId, 5);
            res.json({
                success: true,
                recommendations,
                message: 'Recommendations refreshed successfully',
                refreshedAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error refreshing recommendations:', error);
            res.status(500).json({
                error: 'Failed to refresh recommendations',
                message: error.message
            });
        }
    });
    /**
     * Find similar scholarships to a given scholarship
     * GET /api/recommendations/similar/:scholarshipId
     */
    router.get('/similar/:scholarshipId', [
        (0, express_validator_1.param)('scholarshipId').isString().notEmpty().withMessage('Scholarship ID is required'),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10'),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { scholarshipId } = req.params;
            const limit = parseInt(req.query.limit) || 3;
            console.log(`Finding similar scholarships to ${scholarshipId}`);
            const similarScholarships = await (0, supabase_1.findSimilarScholarships)(scholarshipId, limit);
            res.json({
                success: true,
                similar: similarScholarships,
                total: similarScholarships.length,
                sourceId: scholarshipId
            });
        }
        catch (error) {
            console.error('Error finding similar scholarships:', error);
            res.status(500).json({
                error: 'Failed to find similar scholarships',
                message: error.message
            });
        }
    });
    /**
     * Get recommendation system statistics
     * GET /api/recommendations/stats
     */
    router.get('/stats', async (req, res) => {
        try {
            console.log('Getting embedding statistics');
            const stats = await (0, supabase_1.getEmbeddingStats)();
            res.json({
                success: true,
                stats
            });
        }
        catch (error) {
            console.error('Error getting recommendation stats:', error);
            res.status(500).json({
                error: 'Failed to get recommendation stats',
                message: error.message
            });
        }
    });
    return router;
}
/**
 * Helper function to generate recommendations for a user
 */
async function generateUserRecommendations(userId) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        // Get user profile
        const userProfile = await (0, firebase_1.getUserProfile)(userId);
        if (!userProfile) {
            throw new Error(`User profile not found for ${userId}`);
        }
        // Generate embedding for user preferences
        const preferencesText = `
      Education Level: ${((_a = userProfile.preferences) === null || _a === void 0 ? void 0 : _a.educationLevel) || 'Not specified'}
      Career Interests: ${((_c = (_b = userProfile.preferences) === null || _b === void 0 ? void 0 : _b.careerInterests) === null || _c === void 0 ? void 0 : _c.join(', ')) || 'Not specified'}
      Learning Style: ${((_d = userProfile.preferences) === null || _d === void 0 ? void 0 : _d.learningStyle) || 'Not specified'}
      Time Availability: ${((_e = userProfile.preferences) === null || _e === void 0 ? void 0 : _e.timeAvailability) || 'Not specified'}
      Goals: ${((_f = userProfile.preferences) === null || _f === void 0 ? void 0 : _f.currentGoals) || 'Not specified'}
      Skills: ${((_h = (_g = userProfile.preferences) === null || _g === void 0 ? void 0 : _g.skillsToImprove) === null || _h === void 0 ? void 0 : _h.join(', ')) || 'Not specified'}
    `.trim();
        const embedding = await (0, aiService_1.generateEmbeddings)(preferencesText);
        // Store in Supabase vector database
        await (0, supabase_1.storeUserPreferencesEmbedding)(userId, embedding, userProfile);
        console.log(`Generated and stored recommendations for user ${userId}`);
    }
    catch (error) {
        console.error(`Error generating recommendations for user ${userId}:`, error);
        throw error;
    }
}
//# sourceMappingURL=recommendations.js.map