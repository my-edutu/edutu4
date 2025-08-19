#!/usr/bin/env node

/**
 * Simple local development server for testing CV backend
 */

const express = require('express');
const cors = require('cors');

// Initialize Express app (same as our Firebase function)
const app = express();

// Basic middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'edutu-cv-backend',
    mode: 'local-development'
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

    console.log('✅ CV upload mock response sent');
    res.json(mockResult);
  } catch (error) {
    console.error('❌ Upload error:', error);
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

    console.log('✅ CV optimization mock response sent');
    res.json(mockResult);
  } catch (error) {
    console.error('❌ Optimization error:', error);
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

    console.log('✅ ATS check mock response sent');
    res.json(mockResult);
  } catch (error) {
    console.error('❌ ATS check error:', error);
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

    console.log('✅ Get CVs mock response sent');
    res.json({
      success: true,
      data: {
        cvs: mockCVs,
        count: mockCVs.length
      }
    });
  } catch (error) {
    console.error('❌ Get CVs error:', error);
    res.status(500).json({ success: false, error: 'Failed to get CVs' });
  }
});

// CV Builder endpoints (mock)
app.get('/api/builder/templates', (req, res) => {
  const mockTemplates = [
    {
      id: 'modern-professional',
      name: 'Modern Professional',
      description: 'Clean, modern design perfect for corporate roles',
      category: 'professional'
    },
    {
      id: 'tech-minimal',
      name: 'Tech Minimal',
      description: 'Minimal design optimized for tech roles',
      category: 'technology'
    }
  ];

  console.log('✅ CV templates mock response sent');
  res.json({ success: true, data: { templates: mockTemplates } });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('🎉 ========================================');
  console.log('🎓   Edutu CV Backend - LOCAL MODE');  
  console.log('🎉 ========================================');
  console.log('');
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log(`   • Health Check: GET http://localhost:${PORT}/health`);
  console.log(`   • Upload CV: POST http://localhost:${PORT}/api/upload/cv`);
  console.log(`   • Optimize CV: POST http://localhost:${PORT}/api/optimize/cv`);
  console.log(`   • ATS Check: POST http://localhost:${PORT}/api/ats/check`);
  console.log(`   • Get CVs: GET http://localhost:${PORT}/api/cv`);
  console.log(`   • CV Templates: GET http://localhost:${PORT}/api/builder/templates`);
  console.log('');
  console.log('✨ Features:');
  console.log('   ✅ Smart Upload & Scan (Mock)');
  console.log('   ✅ AI-Powered Optimization (Mock)');
  console.log('   ✅ ATS Compatibility Check (Mock)');
  console.log('   ✅ Professional CV Builder (Mock)');
  console.log('');
  console.log('🔗 Frontend Integration:');
  console.log(`   const API_BASE_URL = 'http://localhost:${PORT}';`);
  console.log('');
  console.log('💡 Press Ctrl+C to stop the server');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 CV Backend shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 CV Backend shutting down gracefully...');
  process.exit(0);
});