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
        keywordDensity: {
            [keyword: string]: number;
        };
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
export declare class AIService {
    private anthropic?;
    private openai?;
    private provider;
    constructor();
    /**
     * Analyze and optimize CV content
     */
    optimizeCV(cvText: string, jobDescription?: string, industry?: string, targetRole?: string): Promise<CVOptimizationResult>;
    /**
     * Perform ATS compatibility analysis
     */
    analyzeATSCompatibility(cvText: string, jobDescription?: string): Promise<ATSAnalysisResult>;
    /**
     * Generate industry-specific CV suggestions
     */
    getIndustryTips(industry: string, role: string, experience: string): Promise<string[]>;
    /**
     * Call Anthropic Claude API
     */
    private callAnthropic;
    /**
     * Call OpenAI API
     */
    private callOpenAI;
    /**
     * Build optimization prompt
     */
    private buildOptimizationPrompt;
    /**
     * Build ATS analysis prompt
     */
    private buildATSPrompt;
    /**
     * Parse optimization response from AI
     */
    private parseOptimizationResponse;
    /**
     * Parse ATS response from AI
     */
    private parseATSResponse;
    /**
     * Mock responses for development/fallback
     */
    private getMockOptimizationResponse;
    private getMockATSResponse;
    private getMockIndustryTips;
    private getDefaultOptimizationResult;
    private getDefaultATSResult;
}
//# sourceMappingURL=aiService.d.ts.map