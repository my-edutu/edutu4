import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { logger } from '../utils/logger';
import { AIServiceError } from '../utils/errors';

export interface OptimizationSuggestion {
  category: 'content' | 'structure' | 'keywords' | 'formatting' | 'industry-specific';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestion: string;
  example?: string;
  section?: string;
}

export interface CVOptimizationResult {
  overallScore: number;
  suggestions: OptimizationSuggestion[];
  keywordAnalysis: {
    currentKeywords: string[];
    missingKeywords: string[];
    keywordDensity: { [keyword: string]: number };
  };
  structuralAnalysis: {
    sectionsFound: string[];
    missingSections: string[];
    sectionOrder: string[];
    lengthAnalysis: {
      wordCount: number;
      recommendedRange: string;
      isOptimal: boolean;
    };
  };
  industryTips: string[];
  optimizedVersion?: string;
}

export interface ATSAnalysisResult {
  atsScore: number;
  formatScore: number;
  keywordScore: number;
  structureScore: number;
  readabilityScore: number;
  issues: Array<{
    type: 'format' | 'keyword' | 'structure' | 'readability';
    severity: 'low' | 'medium' | 'high';
    issue: string;
    fix: string;
    impact: string;
  }>;
  recommendations: string[];
  atsReadinessLevel: 'poor' | 'fair' | 'good' | 'excellent';
}

export class AIService {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private provider: 'anthropic' | 'openai';

  constructor() {
    this.provider = (process.env.AI_SERVICE_PROVIDER as 'anthropic' | 'openai') || 'anthropic';
    
    if (this.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    } else if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      logger.warn('No AI service configured, using mock responses');
    }
  }

  /**
   * Analyze and optimize CV content
   */
  async optimizeCV(
    cvText: string, 
    jobDescription?: string, 
    industry?: string,
    targetRole?: string
  ): Promise<CVOptimizationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting CV optimization', {
        textLength: cvText.length,
        hasJobDescription: !!jobDescription,
        industry,
        targetRole
      });

      const prompt = this.buildOptimizationPrompt(cvText, jobDescription, industry, targetRole);
      
      let response: string;
      if (this.anthropic) {
        response = await this.callAnthropic(prompt);
      } else if (this.openai) {
        response = await this.callOpenAI(prompt);
      } else {
        response = this.getMockOptimizationResponse();
      }

      const result = this.parseOptimizationResponse(response, cvText);
      
      logger.info('CV optimization completed', {
        duration: Date.now() - startTime,
        overallScore: result.overallScore,
        suggestionCount: result.suggestions.length,
        provider: this.provider
      });

      return result;
    } catch (error) {
      logger.error('CV optimization failed', {
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AIServiceError('Failed to optimize CV', this.provider);
    }
  }

  /**
   * Perform ATS compatibility analysis
   */
  async analyzeATSCompatibility(cvText: string, jobDescription?: string): Promise<ATSAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting ATS analysis', {
        textLength: cvText.length,
        hasJobDescription: !!jobDescription
      });

      const prompt = this.buildATSPrompt(cvText, jobDescription);
      
      let response: string;
      if (this.anthropic) {
        response = await this.callAnthropic(prompt);
      } else if (this.openai) {
        response = await this.callOpenAI(prompt);
      } else {
        response = this.getMockATSResponse();
      }

      const result = this.parseATSResponse(response);
      
      logger.info('ATS analysis completed', {
        duration: Date.now() - startTime,
        atsScore: result.atsScore,
        readinessLevel: result.atsReadinessLevel,
        issueCount: result.issues.length
      });

      return result;
    } catch (error) {
      logger.error('ATS analysis failed', {
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AIServiceError('Failed to analyze ATS compatibility', this.provider);
    }
  }

  /**
   * Generate industry-specific CV suggestions
   */
  async getIndustryTips(industry: string, role: string, experience: string): Promise<string[]> {
    try {
      const prompt = `Provide 5-7 specific, actionable tips for optimizing a CV for a ${role} role in the ${industry} industry. 
      Experience level: ${experience}. Focus on industry-specific keywords, skills, and formatting preferences.
      Return as a JSON array of strings.`;

      let response: string;
      if (this.anthropic) {
        response = await this.callAnthropic(prompt);
      } else if (this.openai) {
        response = await this.callOpenAI(prompt);
      } else {
        return this.getMockIndustryTips(industry, role);
      }

      try {
        return JSON.parse(response);
      } catch {
        // Fallback if response isn't valid JSON
        return response.split('\n').filter(line => line.trim().length > 0);
      }
    } catch (error) {
      logger.error('Industry tips generation failed', { industry, role, error });
      return this.getMockIndustryTips(industry, role);
    }
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new AIServiceError('Anthropic client not initialized');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      } else {
        throw new AIServiceError('Unexpected response format from Anthropic');
      }
    } catch (error) {
      logger.error('Anthropic API call failed', { error });
      throw new AIServiceError('Failed to call Anthropic API', 'anthropic');
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new AIServiceError('OpenAI client not initialized');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert CV optimization consultant with 20+ years of experience in recruitment and career counseling.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('OpenAI API call failed', { error });
      throw new AIServiceError('Failed to call OpenAI API', 'openai');
    }
  }

  /**
   * Build optimization prompt
   */
  private buildOptimizationPrompt(
    cvText: string, 
    jobDescription?: string, 
    industry?: string,
    targetRole?: string
  ): string {
    return `
As an expert CV optimization consultant, analyze the following CV and provide comprehensive optimization recommendations.

CV Content:
${cvText}

${jobDescription ? `Target Job Description:\n${jobDescription}\n` : ''}
${industry ? `Target Industry: ${industry}\n` : ''}
${targetRole ? `Target Role: ${targetRole}\n` : ''}

Please provide a detailed analysis in the following JSON format:
{
  "overallScore": <number 0-100>,
  "suggestions": [
    {
      "category": "<content|structure|keywords|formatting|industry-specific>",
      "severity": "<low|medium|high|critical>",
      "title": "<brief title>",
      "description": "<detailed description>",
      "suggestion": "<specific actionable suggestion>",
      "example": "<optional example>",
      "section": "<CV section affected>"
    }
  ],
  "keywordAnalysis": {
    "currentKeywords": ["keyword1", "keyword2"],
    "missingKeywords": ["missing1", "missing2"],
    "keywordDensity": {"keyword": 0.05}
  },
  "structuralAnalysis": {
    "sectionsFound": ["section1", "section2"],
    "missingSections": ["missing1", "missing2"],
    "sectionOrder": ["recommended", "order"],
    "lengthAnalysis": {
      "wordCount": <number>,
      "recommendedRange": "400-600 words",
      "isOptimal": <boolean>
    }
  },
  "industryTips": ["tip1", "tip2", "tip3"]
}

Focus on:
1. Content quality and relevance
2. Structure and formatting for readability
3. Keyword optimization for ATS systems
4. Industry-specific best practices
5. Achievement quantification
6. Professional presentation

Be specific, actionable, and prioritize high-impact improvements.
`;
  }

  /**
   * Build ATS analysis prompt
   */
  private buildATSPrompt(cvText: string, jobDescription?: string): string {
    return `
As an ATS (Applicant Tracking System) expert, analyze the following CV for ATS compatibility and provide a detailed assessment.

CV Content:
${cvText}

${jobDescription ? `Job Description for Reference:\n${jobDescription}\n` : ''}

Analyze the CV against these ATS criteria:
1. Format compatibility (simple formatting, no graphics/tables)
2. Keyword optimization and density
3. Structure and section organization
4. Readability and parsing accuracy

Provide analysis in this JSON format:
{
  "atsScore": <overall score 0-100>,
  "formatScore": <format score 0-100>,
  "keywordScore": <keyword score 0-100>,
  "structureScore": <structure score 0-100>,
  "readabilityScore": <readability score 0-100>,
  "issues": [
    {
      "type": "<format|keyword|structure|readability>",
      "severity": "<low|medium|high>",
      "issue": "<description of issue>",
      "fix": "<how to fix it>",
      "impact": "<impact on ATS parsing>"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "atsReadinessLevel": "<poor|fair|good|excellent>"
}

Consider:
- Use of standard section headings
- Keyword frequency and placement  
- File format compatibility
- Font and formatting simplicity
- Contact information placement
- Date formatting consistency
- Bullet point usage
- White space and layout
`;
  }

  /**
   * Parse optimization response from AI
   */
  private parseOptimizationResponse(response: string, originalText: string): CVOptimizationResult {
    try {
      const parsed = JSON.parse(response);
      
      // Validate and set defaults
      return {
        overallScore: Math.max(0, Math.min(100, parsed.overallScore || 70)),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        keywordAnalysis: {
          currentKeywords: parsed.keywordAnalysis?.currentKeywords || [],
          missingKeywords: parsed.keywordAnalysis?.missingKeywords || [],
          keywordDensity: parsed.keywordAnalysis?.keywordDensity || {}
        },
        structuralAnalysis: {
          sectionsFound: parsed.structuralAnalysis?.sectionsFound || [],
          missingSections: parsed.structuralAnalysis?.missingSections || [],
          sectionOrder: parsed.structuralAnalysis?.sectionOrder || [],
          lengthAnalysis: {
            wordCount: originalText.split(/\s+/).length,
            recommendedRange: parsed.structuralAnalysis?.lengthAnalysis?.recommendedRange || '400-600 words',
            isOptimal: parsed.structuralAnalysis?.lengthAnalysis?.isOptimal || false
          }
        },
        industryTips: Array.isArray(parsed.industryTips) ? parsed.industryTips : []
      };
    } catch (error) {
      logger.warn('Failed to parse AI optimization response, using defaults', { error });
      return this.getDefaultOptimizationResult(originalText);
    }
  }

  /**
   * Parse ATS response from AI
   */
  private parseATSResponse(response: string): ATSAnalysisResult {
    try {
      const parsed = JSON.parse(response);
      
      return {
        atsScore: Math.max(0, Math.min(100, parsed.atsScore || 60)),
        formatScore: Math.max(0, Math.min(100, parsed.formatScore || 70)),
        keywordScore: Math.max(0, Math.min(100, parsed.keywordScore || 50)),
        structureScore: Math.max(0, Math.min(100, parsed.structureScore || 80)),
        readabilityScore: Math.max(0, Math.min(100, parsed.readabilityScore || 75)),
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        atsReadinessLevel: ['poor', 'fair', 'good', 'excellent'].includes(parsed.atsReadinessLevel) 
          ? parsed.atsReadinessLevel 
          : 'fair'
      };
    } catch (error) {
      logger.warn('Failed to parse AI ATS response, using defaults', { error });
      return this.getDefaultATSResult();
    }
  }

  /**
   * Mock responses for development/fallback
   */
  private getMockOptimizationResponse(): string {
    return JSON.stringify({
      overallScore: 75,
      suggestions: [
        {
          category: 'content',
          severity: 'high',
          title: 'Add quantified achievements',
          description: 'Your CV lacks specific, measurable achievements that demonstrate your impact.',
          suggestion: 'Replace generic job descriptions with specific achievements using numbers, percentages, or dollar amounts.',
          example: 'Instead of "Managed social media" use "Increased social media engagement by 45% over 6 months"',
          section: 'Work Experience'
        }
      ],
      keywordAnalysis: {
        currentKeywords: ['management', 'leadership', 'analysis'],
        missingKeywords: ['strategy', 'optimization', 'innovation'],
        keywordDensity: { 'management': 0.03, 'leadership': 0.02 }
      },
      structuralAnalysis: {
        sectionsFound: ['Contact', 'Experience', 'Education'],
        missingSections: ['Skills', 'Summary'],
        sectionOrder: ['Summary', 'Contact', 'Experience', 'Skills', 'Education'],
        lengthAnalysis: {
          wordCount: 450,
          recommendedRange: '400-600 words',
          isOptimal: true
        }
      },
      industryTips: ['Focus on ROI and business impact', 'Include relevant certifications']
    });
  }

  private getMockATSResponse(): string {
    return JSON.stringify({
      atsScore: 72,
      formatScore: 80,
      keywordScore: 65,
      structureScore: 75,
      readabilityScore: 70,
      issues: [
        {
          type: 'keyword',
          severity: 'medium',
          issue: 'Low keyword density for target role',
          fix: 'Include more role-specific keywords naturally throughout the CV',
          impact: 'May reduce visibility in ATS searches'
        }
      ],
      recommendations: [
        'Use standard section headings like "Work Experience" and "Education"',
        'Include keywords from the job description naturally in your content'
      ],
      atsReadinessLevel: 'good'
    });
  }

  private getMockIndustryTips(industry: string, role: string): string[] {
    return [
      `Highlight ${industry}-specific technologies and tools`,
      `Emphasize measurable results relevant to ${role} positions`,
      'Include industry certifications and continuous learning',
      'Use action verbs that resonate with hiring managers',
      'Tailor your professional summary to the target role'
    ];
  }

  private getDefaultOptimizationResult(originalText: string): CVOptimizationResult {
    return {
      overallScore: 70,
      suggestions: [],
      keywordAnalysis: {
        currentKeywords: [],
        missingKeywords: [],
        keywordDensity: {}
      },
      structuralAnalysis: {
        sectionsFound: [],
        missingSections: [],
        sectionOrder: [],
        lengthAnalysis: {
          wordCount: originalText.split(/\s+/).length,
          recommendedRange: '400-600 words',
          isOptimal: false
        }
      },
      industryTips: []
    };
  }

  private getDefaultATSResult(): ATSAnalysisResult {
    return {
      atsScore: 60,
      formatScore: 70,
      keywordScore: 50,
      structureScore: 70,
      readabilityScore: 60,
      issues: [],
      recommendations: [],
      atsReadinessLevel: 'fair'
    };
  }
}