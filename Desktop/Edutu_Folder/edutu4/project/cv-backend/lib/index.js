"use strict";
/**
 * Simplified CV Management Backend for Development
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
exports.cv = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
// Initialize Express app
const app = (0, express_1.default)();
// Basic middleware
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json({ limit: '50mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'edutu-cv-backend'
    });
});
// Simple CV upload endpoint (mock)
app.post('/api/upload/cv', async (req, res) => {
    try {
        // Mock response for development
        const mockResult = {
            success: true,
            data: {
                cv: {
                    id: `cv_${Date.now()}`,
                    originalName: 'test-cv.pdf',
                    extractedText: 'John Doe\nSoftware Engineer\nExperience: 5 years in web development...',
                    confidence: 95.5,
                    isProcessed: true,
                    uploadedAt: new Date()
                },
                extractionSummary: {
                    wordCount: 425,
                    characterCount: 2834,
                    confidence: 95.5,
                    method: 'pdf-extract',
                    processingTime: 1250
                }
            }
        };
        console.log('CV upload mock response sent');
        res.json(mockResult);
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
});
// Simple CV optimization endpoint (mock)
app.post('/api/optimize/cv', async (req, res) => {
    try {
        const { cvId, jobDescription, industry } = req.body;
        // Mock AI optimization response
        const mockResult = {
            success: true,
            data: {
                optimization: {
                    optimizationId: `opt_${Date.now()}`,
                    overallScore: 82,
                    suggestions: [
                        {
                            category: 'content',
                            severity: 'high',
                            title: 'Add quantified achievements',
                            description: 'Your CV lacks specific metrics that demonstrate your impact.',
                            suggestion: 'Replace generic descriptions with specific numbers and percentages.',
                            example: 'Instead of "Managed team" use "Managed team of 8 developers, increased productivity by 25%"'
                        },
                        {
                            category: 'keywords',
                            severity: 'medium',
                            title: 'Include more technical keywords',
                            description: 'Add relevant technical terms for better ATS compatibility.',
                            suggestion: 'Include keywords like "React", "TypeScript", "Node.js" based on the job description.'
                        }
                    ],
                    keywordAnalysis: {
                        currentKeywords: ['javascript', 'react', 'node.js'],
                        missingKeywords: ['typescript', 'aws', 'docker'],
                        keywordDensity: { 'javascript': 0.05, 'react': 0.03 }
                    },
                    createdAt: new Date()
                }
            }
        };
        console.log('CV optimization mock response sent');
        res.json(mockResult);
    }
    catch (error) {
        console.error('Optimization error:', error);
        res.status(500).json({ success: false, error: 'Optimization failed' });
    }
});
// Simple ATS check endpoint (mock)
app.post('/api/ats/check', async (req, res) => {
    try {
        const { cvId, jobDescription } = req.body;
        // Mock ATS analysis response
        const mockResult = {
            success: true,
            data: {
                analysis: {
                    analysisId: `ats_${Date.now()}`,
                    atsScore: 78,
                    readinessLevel: 'good',
                    scoreBreakdown: {
                        format: 85,
                        keywords: 72,
                        structure: 80,
                        readability: 75
                    },
                    issues: [
                        {
                            type: 'keyword',
                            severity: 'medium',
                            issue: 'Low keyword density for target role',
                            fix: 'Include more role-specific keywords naturally in your content',
                            impact: 'May reduce visibility in ATS searches'
                        }
                    ],
                    recommendations: [
                        'Use standard section headings like "Work Experience" and "Education"',
                        'Include keywords from the job description naturally in your content'
                    ],
                    createdAt: new Date()
                }
            }
        };
        console.log('ATS check mock response sent');
        res.json(mockResult);
    }
    catch (error) {
        console.error('ATS check error:', error);
        res.status(500).json({ success: false, error: 'ATS check failed' });
    }
});
// Get user CVs (mock)
app.get('/api/cv', async (req, res) => {
    try {
        // Mock CVs response
        const mockCVs = [
            {
                id: 'cv_1',
                originalName: 'Resume_2024.pdf',
                uploadedAt: new Date(Date.now() - 86400000), // 1 day ago
                isProcessed: true,
                extractedText: 'John Doe Software Engineer...'
            },
            {
                id: 'cv_2',
                originalName: 'CV_Updated.docx',
                uploadedAt: new Date(Date.now() - 172800000), // 2 days ago
                isProcessed: true,
                extractedText: 'Jane Smith Product Manager...'
            }
        ];
        res.json({
            success: true,
            data: {
                cvs: mockCVs,
                count: mockCVs.length
            }
        });
    }
    catch (error) {
        console.error('Get CVs error:', error);
        res.status(500).json({ success: false, error: 'Failed to get CVs' });
    }
});
// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});
// Export the main Cloud Function
exports.cv = functions
    .region('us-central1')
    .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
})
    .https
    .onRequest(app);
//# sourceMappingURL=index.js.map