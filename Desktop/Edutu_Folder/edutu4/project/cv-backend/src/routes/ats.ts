import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { CVService } from '../services/cvService';
import { aiRateLimit } from '../middleware/rateLimiter';
import { validateATS } from '../validators/atsValidator';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export const atsRouter = Router();
const aiService = new AIService();
const cvService = new CVService();

/**
 * Run ATS compatibility check
 * POST /api/ats/check
 */
atsRouter.post('/check',
  aiRateLimit,
  validateATS,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, jobDescription } = req.body;

    if (!cvId) {
      throw new AppError('CV ID is required', 400);
    }

    logger.info('ATS compatibility check requested', {
      userId,
      cvId,
      hasJobDescription: !!jobDescription
    });

    try {
      // Get the CV
      const cv = await cvService.getCVById(cvId, userId);
      if (!cv) {
        throw new AppError('CV not found', 404);
      }

      // Run ATS analysis
      const atsAnalysis = await aiService.analyzeATSCompatibility(
        cv.extractedText,
        jobDescription
      );

      // Save ATS analysis results
      const savedAnalysis = await cvService.saveATSAnalysis(cvId, userId, {
        analysisId: `ats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...atsAnalysis,
        jobDescription,
        createdAt: new Date()
      });

      logger.info('ATS compatibility check completed', {
        userId,
        cvId,
        atsScore: atsAnalysis.atsScore,
        readinessLevel: atsAnalysis.atsReadinessLevel,
        issueCount: atsAnalysis.issues.length,
        analysisId: savedAnalysis.analysisId
      });

      res.json({
        success: true,
        data: {
          analysis: savedAnalysis,
          summary: {
            atsScore: atsAnalysis.atsScore,
            readinessLevel: atsAnalysis.atsReadinessLevel,
            scoreBreakdown: {
              format: atsAnalysis.formatScore,
              keywords: atsAnalysis.keywordScore,
              structure: atsAnalysis.structureScore,
              readability: atsAnalysis.readabilityScore
            },
            issuesSummary: {
              total: atsAnalysis.issues.length,
              high: atsAnalysis.issues.filter(i => i.severity === 'high').length,
              medium: atsAnalysis.issues.filter(i => i.severity === 'medium').length,
              low: atsAnalysis.issues.filter(i => i.severity === 'low').length
            },
            recommendation: generateATSRecommendation(atsAnalysis.atsScore)
          }
        }
      });

    } catch (error) {
      logger.error('ATS compatibility check failed', {
        userId,
        cvId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('ATS compatibility check failed', 500);
    }
  })
);

/**
 * Get ATS analysis history for a CV
 * GET /api/ats/cv/:cvId/history
 */
atsRouter.get('/cv/:cvId/history',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId } = req.params;

    logger.info('ATS analysis history requested', { userId, cvId });

    try {
      const history = await cvService.getATSAnalysisHistory(cvId, userId);
      
      res.json({
        success: true,
        data: {
          cvId,
          analyses: history,
          count: history.length,
          trends: calculateATSTrends(history)
        }
      });

    } catch (error) {
      logger.error('Failed to fetch ATS analysis history', {
        userId,
        cvId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to fetch ATS analysis history', 500);
    }
  })
);

/**
 * Get specific ATS analysis result
 * GET /api/ats/:analysisId
 */
atsRouter.get('/:analysisId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { analysisId } = req.params;

    logger.info('ATS analysis details requested', { userId, analysisId });

    try {
      const analysis = await cvService.getATSAnalysisById(analysisId, userId);
      
      if (!analysis) {
        throw new AppError('ATS analysis not found', 404);
      }

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      logger.error('Failed to fetch ATS analysis details', {
        userId,
        analysisId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to fetch ATS analysis details', 500);
    }
  })
);

/**
 * Generate ATS-optimized version
 * POST /api/ats/optimize
 */
atsRouter.post('/optimize',
  aiRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, analysisId, selectedFixes } = req.body;

    if (!cvId || !analysisId) {
      throw new AppError('CV ID and analysis ID are required', 400);
    }

    logger.info('ATS optimization requested', {
      userId,
      cvId,
      analysisId,
      selectedFixesCount: selectedFixes?.length || 0
    });

    try {
      const optimizedCV = await cvService.generateATSOptimizedCV(
        cvId,
        analysisId,
        userId,
        selectedFixes
      );

      logger.info('ATS optimization completed', {
        userId,
        cvId,
        analysisId,
        optimizedCVId: optimizedCV.id
      });

      res.json({
        success: true,
        data: {
          optimizedCV,
          improvements: optimizedCV.atsImprovements,
          message: 'ATS-optimized version has been created'
        }
      });

    } catch (error) {
      logger.error('ATS optimization failed', {
        userId,
        cvId,
        analysisId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('ATS optimization failed', 500);
    }
  })
);

/**
 * Get ATS best practices guide
 * GET /api/ats/best-practices
 */
atsRouter.get('/best-practices',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { industry, role } = req.query;

    logger.info('ATS best practices requested', {
      userId,
      industry: industry as string,
      role: role as string
    });

    try {
      const bestPractices = getATSBestPractices(industry as string, role as string);

      res.json({
        success: true,
        data: {
          generalPractices: bestPractices.general,
          industrySpecific: bestPractices.industrySpecific,
          roleSpecific: bestPractices.roleSpecific,
          commonMistakes: bestPractices.commonMistakes,
          formatTips: bestPractices.formatTips,
          keywordTips: bestPractices.keywordTips,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to fetch ATS best practices', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to fetch ATS best practices', 500);
    }
  })
);

/**
 * Run ATS simulation test
 * POST /api/ats/simulate
 */
atsRouter.post('/simulate',
  aiRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;
    const { cvId, jobDescription, atsSystem = 'generic' } = req.body;

    if (!cvId) {
      throw new AppError('CV ID is required', 400);
    }

    logger.info('ATS simulation requested', {
      userId,
      cvId,
      atsSystem,
      hasJobDescription: !!jobDescription
    });

    try {
      const cv = await cvService.getCVById(cvId, userId);
      if (!cv) {
        throw new AppError('CV not found', 404);
      }

      const simulation = await runATSSimulation(
        cv.extractedText,
        jobDescription,
        atsSystem
      );

      const savedSimulation = await cvService.saveATSSimulation(cvId, userId, {
        simulationId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...simulation,
        atsSystem,
        jobDescription,
        createdAt: new Date()
      });

      logger.info('ATS simulation completed', {
        userId,
        cvId,
        atsSystem,
        matchScore: simulation.matchScore,
        simulationId: savedSimulation.simulationId
      });

      res.json({
        success: true,
        data: savedSimulation
      });

    } catch (error) {
      logger.error('ATS simulation failed', {
        userId,
        cvId,
        atsSystem,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('ATS simulation failed', 500);
    }
  })
);

/**
 * Get ATS analytics for user
 * GET /api/ats/analytics
 */
atsRouter.get('/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.uid;

    logger.info('ATS analytics requested', { userId });

    try {
      const analytics = await cvService.getATSAnalytics(userId);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Failed to fetch ATS analytics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to fetch ATS analytics', 500);
    }
  })
);

/**
 * Helper functions
 */
function generateATSRecommendation(atsScore: number): string {
  if (atsScore >= 85) {
    return 'Excellent! Your CV is highly ATS-compatible and should pass most automated screenings.';
  } else if (atsScore >= 70) {
    return 'Good ATS compatibility. Address the highlighted issues to improve your score further.';
  } else if (atsScore >= 50) {
    return 'Fair ATS compatibility. Several improvements needed to ensure your CV passes automated screenings.';
  } else {
    return 'Poor ATS compatibility. Significant changes are needed to avoid being filtered out by ATS systems.';
  }
}

function calculateATSTrends(history: any[]): any {
  if (history.length < 2) {
    return { trend: 'insufficient_data', change: 0 };
  }

  const latest = history[0];
  const previous = history[1];
  const change = latest.atsScore - previous.atsScore;

  return {
    trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
    change: Math.round(change * 10) / 10,
    latestScore: latest.atsScore,
    previousScore: previous.atsScore,
    analysisCount: history.length
  };
}

function getATSBestPractices(industry?: string, role?: string): any {
  return {
    general: [
      'Use standard section headings (Work Experience, Education, Skills)',
      'Save as PDF or Word document (.docx)',
      'Use simple, clean formatting without graphics or tables',
      'Include keywords from the job description naturally',
      'Use bullet points for easy scanning',
      'Ensure consistent date formatting (MM/YYYY)',
      'Place contact information at the top',
      'Use standard fonts like Arial, Helvetica, or Times New Roman'
    ],
    industrySpecific: industry ? getIndustrySpecificTips(industry) : [],
    roleSpecific: role ? getRoleSpecificTips(role) : [],
    commonMistakes: [
      'Using headers and footers',
      'Including images or graphics',
      'Using complex tables or columns',
      'Unusual fonts or formatting',
      'Missing or inconsistent contact information',
      'No relevant keywords',
      'Poor section organization'
    ],
    formatTips: [
      'Use 10-12 point font size',
      'Maintain 1-inch margins',
      'Use white background with black text',
      'Left-align all content',
      'Use consistent spacing between sections'
    ],
    keywordTips: [
      'Mirror language from the job description',
      'Include both acronyms and full terms (e.g., "AI" and "Artificial Intelligence")',
      'Use industry-standard terminology',
      'Include relevant technical skills',
      'Add soft skills mentioned in job postings'
    ]
  };
}

function getIndustrySpecificTips(industry: string): string[] {
  const tips: { [key: string]: string[] } = {
    'technology': [
      'Include programming languages and frameworks',
      'Mention cloud platforms and databases',
      'Add relevant certifications',
      'Use technical keywords naturally'
    ],
    'healthcare': [
      'Include medical certifications and licenses',
      'Mention EMR systems experience',
      'Add patient care keywords',
      'Include compliance knowledge'
    ],
    'finance': [
      'Include financial software experience',
      'Mention regulatory knowledge',
      'Add analytical skills keywords',
      'Include risk management terms'
    ]
  };

  return tips[industry.toLowerCase()] || [];
}

function getRoleSpecificTips(role: string): string[] {
  const tips: { [key: string]: string[] } = {
    'manager': [
      'Include leadership and team management keywords',
      'Mention budget management experience',
      'Add project management skills',
      'Include performance improvement metrics'
    ],
    'analyst': [
      'Include data analysis tools and software',
      'Mention statistical analysis skills',
      'Add reporting and visualization experience',
      'Include problem-solving keywords'
    ],
    'developer': [
      'List programming languages and frameworks',
      'Include development methodologies',
      'Mention version control systems',
      'Add testing and debugging experience'
    ]
  };

  return tips[role.toLowerCase()] || [];
}

async function runATSSimulation(
  cvText: string,
  jobDescription?: string,
  atsSystem: string = 'generic'
): Promise<any> {
  // This would typically integrate with actual ATS simulation services
  // For now, we'll provide a mock simulation based on common ATS patterns
  
  const keywords = jobDescription ? extractKeywords(jobDescription) : [];
  const cvKeywords = extractKeywords(cvText);
  
  const matchedKeywords = keywords.filter(keyword => 
    cvKeywords.some(cvKeyword => 
      cvKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(cvKeyword.toLowerCase())
    )
  );

  const matchScore = keywords.length > 0 ? 
    Math.round((matchedKeywords.length / keywords.length) * 100) : 75;

  return {
    matchScore,
    matchedKeywords,
    missingKeywords: keywords.filter(k => !matchedKeywords.includes(k)),
    parsabilityScore: calculateParsabilityScore(cvText),
    structureScore: calculateStructureScore(cvText),
    formatScore: calculateFormatScore(cvText),
    recommendations: [
      'Include more role-specific keywords',
      'Improve section organization',
      'Simplify formatting for better parsing'
    ]
  };
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production, use more sophisticated NLP
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
    
  const frequency: { [key: string]: number } = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.keys(frequency)
    .filter(word => frequency[word] >= 2)
    .slice(0, 20);
}

function calculateParsabilityScore(text: string): number {
  let score = 100;
  
  // Deduct points for potential parsing issues
  if (text.includes('\t')) score -= 10; // Tables
  if (text.match(/[^\w\s\n.,!?;:()\[\]{}'"@#$%^&*+=<>\/\\|-]/)) score -= 5; // Special characters
  if (text.split('\n').length < 5) score -= 15; // Too few sections
  
  return Math.max(0, score);
}

function calculateStructureScore(text: string): number {
  const sections = ['experience', 'education', 'skills', 'summary', 'contact'];
  let foundSections = 0;
  
  sections.forEach(section => {
    if (text.toLowerCase().includes(section)) {
      foundSections++;
    }
  });
  
  return Math.round((foundSections / sections.length) * 100);
}

function calculateFormatScore(text: string): number {
  let score = 100;
  
  // Simple format checks
  const lines = text.split('\n');
  const emptyLines = lines.filter(line => line.trim() === '').length;
  const totalLines = lines.length;
  
  // Too many empty lines might indicate formatting issues
  if (emptyLines / totalLines > 0.3) score -= 20;
  
  return Math.max(0, score);
}