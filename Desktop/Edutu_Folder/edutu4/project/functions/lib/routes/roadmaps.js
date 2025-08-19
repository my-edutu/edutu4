"use strict";
/**
 * Roadmaps API Routes - Firebase Functions Version
 * Handles personalized roadmap generation and management
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
exports.createRoadmapRouter = createRoadmapRouter;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../utils/auth");
const aiService_1 = require("../services/aiService");
const firebase_1 = require("../utils/firebase");
function createRoadmapRouter() {
    const router = (0, express_1.Router)();
    /**
     * Generate personalized roadmap for an opportunity
     * POST /api/roadmaps/generate
     */
    router.post('/generate', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
        (0, express_validator_1.body)('userId').isString().notEmpty().withMessage('User ID is required'),
        (0, express_validator_1.body)('opportunityId').isString().notEmpty().withMessage('Opportunity ID is required'),
        (0, express_validator_1.body)('options').optional().isObject(),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { userId, opportunityId, options = {} } = req.body;
            console.log(`Generating roadmap for user ${userId}, opportunity ${opportunityId}`);
            // Get user profile
            const userProfile = await (0, firebase_1.getUserProfile)(userId);
            // Get opportunity details
            const scholarships = await (0, firebase_1.getAllScholarships)();
            const opportunity = scholarships.find((s) => s.id === opportunityId);
            if (!opportunity) {
                return res.status(404).json({
                    error: 'Opportunity not found',
                    opportunityId
                });
            }
            // Generate AI roadmap
            const roadmapData = await (0, aiService_1.generateRoadmap)(opportunity, userProfile, options);
            // Save to Firestore
            const savedRoadmap = await (0, firebase_1.saveUserRoadmap)(userId, roadmapData);
            console.log(`Roadmap generated and saved for user ${userId}`);
            res.json({
                success: true,
                roadmap: savedRoadmap,
                message: 'Personalized roadmap generated successfully'
            });
        }
        catch (error) {
            console.error('Error generating roadmap:', error);
            res.status(500).json({
                error: 'Failed to generate roadmap',
                message: error.message
            });
        }
    });
    /**
     * Get user's roadmaps
     * GET /api/roadmaps/user/:userId
     */
    router.get('/user/:userId', auth_1.verifyFirebaseToken, auth_1.requireOwnership, [
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
            const { status, limit = '50' } = req.query;
            console.log(`Fetching roadmaps for user ${userId}`);
            const roadmaps = await (0, firebase_1.getUserRoadmaps)(userId);
            // Filter by status if provided
            let filteredRoadmaps = roadmaps;
            if (status) {
                filteredRoadmaps = roadmaps.filter((r) => r.status === status);
            }
            // Apply limit
            filteredRoadmaps = filteredRoadmaps.slice(0, parseInt(limit));
            res.json({
                success: true,
                roadmaps: filteredRoadmaps,
                total: filteredRoadmaps.length,
                filters: { status, limit }
            });
        }
        catch (error) {
            console.error('Error fetching user roadmaps:', error);
            res.status(500).json({
                error: 'Failed to fetch roadmaps',
                message: error.message
            });
        }
    });
    /**
     * Update roadmap milestone progress
     * PUT /api/roadmaps/:roadmapId/milestones/:milestoneId
     */
    router.put('/:roadmapId/milestones/:milestoneId', [
        (0, express_validator_1.param)('roadmapId').isString().notEmpty().withMessage('Roadmap ID is required'),
        (0, express_validator_1.param)('milestoneId').isString().notEmpty().withMessage('Milestone ID is required'),
        (0, express_validator_1.body)('isCompleted').isBoolean().withMessage('Completion status must be boolean'),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { roadmapId, milestoneId } = req.params;
            const { isCompleted } = req.body;
            console.log(`Updating milestone ${milestoneId} in roadmap ${roadmapId}: ${isCompleted ? 'completed' : 'incomplete'}`);
            const result = await (0, firebase_1.updateRoadmapProgress)(roadmapId, milestoneId, isCompleted);
            res.json({
                success: true,
                progress: result.progress,
                milestones: result.milestones,
                message: `Milestone ${isCompleted ? 'completed' : 'marked incomplete'}`
            });
        }
        catch (error) {
            console.error('Error updating roadmap progress:', error);
            res.status(500).json({
                error: 'Failed to update roadmap progress',
                message: error.message
            });
        }
    });
    /**
     * Get roadmap by ID
     * GET /api/roadmaps/:roadmapId
     */
    router.get('/:roadmapId', [
        (0, express_validator_1.param)('roadmapId').isString().notEmpty().withMessage('Roadmap ID is required'),
    ], async (req, res) => {
        var _a, _b;
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { roadmapId } = req.params;
            console.log(`Fetching roadmap ${roadmapId}`);
            // Get roadmap from Firestore
            const db = admin.firestore();
            const roadmapDoc = await db.collection('userRoadmaps').doc(roadmapId).get();
            if (!roadmapDoc.exists) {
                return res.status(404).json({
                    error: 'Roadmap not found',
                    roadmapId
                });
            }
            const data = roadmapDoc.data();
            const roadmap = Object.assign(Object.assign({ id: roadmapDoc.id }, data), { createdAt: (_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() });
            res.json({
                success: true,
                roadmap
            });
        }
        catch (error) {
            console.error('Error fetching roadmap:', error);
            res.status(500).json({
                error: 'Failed to fetch roadmap',
                message: error.message
            });
        }
    });
    /**
     * Delete roadmap
     * DELETE /api/roadmaps/:roadmapId
     */
    router.delete('/:roadmapId', [
        (0, express_validator_1.param)('roadmapId').isString().notEmpty().withMessage('Roadmap ID is required'),
    ], async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            const { roadmapId } = req.params;
            console.log(`Deleting roadmap ${roadmapId}`);
            const db = admin.firestore();
            await db.collection('userRoadmaps').doc(roadmapId).delete();
            res.json({
                success: true,
                message: 'Roadmap deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting roadmap:', error);
            res.status(500).json({
                error: 'Failed to delete roadmap',
                message: error.message
            });
        }
    });
    return router;
}
//# sourceMappingURL=roadmaps.js.map