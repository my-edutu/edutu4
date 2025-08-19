"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builderRouter = void 0;
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
exports.builderRouter = (0, express_1.Router)();
/**
 * Get available CV templates
 * GET /api/builder/templates
 */
exports.builderRouter.get('/templates', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    logger_1.logger.info('CV templates requested', { userId });
    // Mock templates - in production, these would come from a database
    const templates = [
        {
            id: 'modern-professional',
            name: 'Modern Professional',
            description: 'Clean, modern design perfect for corporate roles',
            category: 'professional',
            preview: 'https://example.com/previews/modern-professional.png',
            features: ['ATS-friendly', 'Clean layout', 'Professional colors'],
            sections: ['header', 'summary', 'experience', 'skills', 'education']
        },
        {
            id: 'creative-designer',
            name: 'Creative Designer',
            description: 'Stylish template for creative professionals',
            category: 'creative',
            preview: 'https://example.com/previews/creative-designer.png',
            features: ['Visual appeal', 'Color accents', 'Portfolio section'],
            sections: ['header', 'portfolio', 'experience', 'skills', 'education']
        },
        {
            id: 'tech-minimal',
            name: 'Tech Minimal',
            description: 'Minimal design optimized for tech roles',
            category: 'technology',
            preview: 'https://example.com/previews/tech-minimal.png',
            features: ['Code-friendly', 'Minimal design', 'Technical skills focus'],
            sections: ['header', 'summary', 'technical-skills', 'experience', 'projects']
        }
    ];
    res.json({
        success: true,
        data: {
            templates,
            categories: ['professional', 'creative', 'technology'],
            totalCount: templates.length
        }
    });
}));
/**
 * Start CV building process
 * POST /api/builder/start
 */
exports.builderRouter.post('/start', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { templateId, personalInfo } = req.body;
    if (!templateId) {
        throw new errors_1.AppError('Template ID is required', 400);
    }
    logger_1.logger.info('CV building started', { userId, templateId });
    // Create new CV builder session
    const buildSession = {
        id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        templateId,
        personalInfo: personalInfo || {},
        sections: {},
        status: 'in_progress',
        createdAt: new Date(),
        lastModified: new Date()
    };
    // In production, save to Firestore
    // await db.collection('cv_build_sessions').add(buildSession);
    res.json({
        success: true,
        data: {
            buildSession,
            nextStep: 'personal_info',
            availableSections: ['summary', 'experience', 'skills', 'education', 'projects']
        }
    });
}));
/**
 * Update CV section
 * PUT /api/builder/:sessionId/section/:sectionName
 */
exports.builderRouter.put('/:sessionId/section/:sectionName', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { sessionId, sectionName } = req.params;
    const sectionData = req.body;
    logger_1.logger.info('CV section update', { userId, sessionId, sectionName });
    // Mock update - in production, update Firestore document
    const updatedSession = {
        id: sessionId,
        userId,
        sections: {
            [sectionName]: Object.assign(Object.assign({}, sectionData), { lastModified: new Date() })
        },
        lastModified: new Date()
    };
    res.json({
        success: true,
        data: {
            session: updatedSession,
            message: `${sectionName} section updated successfully`
        }
    });
}));
/**
 * Get AI suggestions for section
 * POST /api/builder/suggestions/:sectionName
 */
exports.builderRouter.post('/suggestions/:sectionName', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { sectionName } = req.params;
    const { currentContent, jobDescription, industry } = req.body;
    logger_1.logger.info('AI suggestions requested', { userId, sectionName });
    // Mock AI suggestions - in production, integrate with AI service
    const suggestions = {
        summary: [
            'Start with a strong professional title',
            'Include 2-3 key achievements with metrics',
            'Mention relevant years of experience',
            'Add 1-2 technical skills that match the job description'
        ],
        experience: [
            'Use action verbs to start each bullet point',
            'Quantify achievements with specific numbers or percentages',
            'Focus on impact and results, not just responsibilities',
            'Tailor experience to match job requirements'
        ],
        skills: [
            'Separate technical and soft skills',
            'List skills in order of relevance to the job',
            'Include proficiency levels where appropriate',
            'Add industry-specific tools and technologies'
        ]
    };
    res.json({
        success: true,
        data: {
            suggestions: suggestions[sectionName] || [],
            sectionName,
            improveCurrentContent: currentContent ? [
                'Make your descriptions more specific',
                'Add quantifiable results',
                'Use stronger action words'
            ] : []
        }
    });
}));
/**
 * Generate CV preview
 * POST /api/builder/:sessionId/preview
 */
exports.builderRouter.post('/:sessionId/preview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { sessionId } = req.params;
    const { format = 'html' } = req.body;
    logger_1.logger.info('CV preview requested', { userId, sessionId, format });
    // Mock preview generation
    const previewData = {
        sessionId,
        format,
        previewUrl: `https://storage.googleapis.com/your-bucket/previews/${userId}/${sessionId}.${format}`,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    res.json({
        success: true,
        data: previewData
    });
}));
/**
 * Generate final CV
 * POST /api/builder/:sessionId/generate
 */
exports.builderRouter.post('/:sessionId/generate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { sessionId } = req.params;
    const { format = 'pdf', fileName } = req.body;
    logger_1.logger.info('CV generation requested', { userId, sessionId, format });
    // Mock CV generation - in production, use PDF/DOCX generation library
    const generatedCV = {
        id: `cv_${Date.now()}`,
        sessionId,
        userId,
        fileName: fileName || `CV_${Date.now()}.${format}`,
        format,
        downloadUrl: `https://storage.googleapis.com/your-bucket/generated/${userId}/${sessionId}.${format}`,
        fileSize: 245760, // bytes
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
    res.json({
        success: true,
        data: {
            cv: generatedCV,
            message: 'CV generated successfully'
        }
    });
}));
/**
 * Get build session
 * GET /api/builder/:sessionId
 */
exports.builderRouter.get('/:sessionId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { sessionId } = req.params;
    logger_1.logger.info('Build session requested', { userId, sessionId });
    // Mock session retrieval
    const session = {
        id: sessionId,
        userId,
        templateId: 'modern-professional',
        sections: {
            personalInfo: { name: 'John Doe', email: 'john@example.com' },
            summary: { text: 'Experienced software developer...' }
        },
        status: 'in_progress',
        createdAt: new Date(),
        lastModified: new Date()
    };
    res.json({
        success: true,
        data: session
    });
}));
/**
 * Delete build session
 * DELETE /api/builder/:sessionId
 */
exports.builderRouter.delete('/:sessionId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.uid;
    const { sessionId } = req.params;
    logger_1.logger.info('Build session deletion requested', { userId, sessionId });
    // Mock deletion - in production, delete from Firestore
    res.json({
        success: true,
        message: 'Build session deleted successfully'
    });
}));
//# sourceMappingURL=builder.js.map