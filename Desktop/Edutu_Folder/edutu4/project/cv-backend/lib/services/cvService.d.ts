export interface CV {
    id?: string;
    userId: string;
    originalName: string;
    fileId: string;
    extractedText: string;
    fileMetadata: {
        size: number;
        mimeType: string;
        downloadUrl: string;
        thumbnailUrl?: string;
        processingMetadata: any;
    };
    confidence?: number;
    isProcessed: boolean;
    isScanned?: boolean;
    uploadedAt: Date;
    updatedAt?: Date;
    convertedFiles?: {
        [format: string]: any;
    };
    optimizations?: any[];
    atsAnalyses?: any[];
    tags?: string[];
    status: 'processing' | 'completed' | 'failed';
}
export interface CVOptimization {
    optimizationId: string;
    cvId: string;
    userId: string;
    overallScore: number;
    suggestions: any[];
    keywordAnalysis: any;
    structuralAnalysis: any;
    industryTips: string[];
    jobDescription?: string;
    industry?: string;
    targetRole?: string;
    createdAt: Date;
    appliedAt?: Date;
    isApplied?: boolean;
}
export interface ATSAnalysis {
    analysisId: string;
    cvId: string;
    userId: string;
    atsScore: number;
    formatScore: number;
    keywordScore: number;
    structureScore: number;
    readabilityScore: number;
    issues: any[];
    recommendations: string[];
    atsReadinessLevel: string;
    jobDescription?: string;
    createdAt: Date;
}
export declare class CVService {
    private db;
    private storage;
    /**
     * Create a new CV record
     */
    createCV(cvData: Partial<CV>): Promise<CV>;
    /**
     * Get CV by ID for a specific user
     */
    getCVById(cvId: string, userId: string): Promise<CV | null>;
    /**
     * Get all CVs for a user
     */
    getUserCVs(userId: string, limit?: number): Promise<CV[]>;
    /**
     * Update CV
     */
    updateCV(cvId: string, userId: string, updates: Partial<CV>): Promise<CV>;
    /**
     * Delete CV
     */
    deleteCV(cvId: string, userId: string): Promise<boolean>;
    /**
     * Save optimization results
     */
    saveOptimization(cvId: string, userId: string, optimization: Partial<CVOptimization>): Promise<CVOptimization>;
    /**
     * Get optimization history
     */
    getOptimizationHistory(cvId: string, userId: string): Promise<CVOptimization[]>;
    /**
     * Get optimization by ID
     */
    getOptimizationById(optimizationId: string, userId: string): Promise<CVOptimization | null>;
    /**
     * Save ATS analysis
     */
    saveATSAnalysis(cvId: string, userId: string, analysis: Partial<ATSAnalysis>): Promise<ATSAnalysis>;
    /**
     * Get ATS analysis history
     */
    getATSAnalysisHistory(cvId: string, userId: string): Promise<ATSAnalysis[]>;
    /**
     * Get ATS analysis by ID
     */
    getATSAnalysisById(analysisId: string, userId: string): Promise<ATSAnalysis | null>;
    /**
     * Apply optimizations to CV
     */
    applyOptimizations(cvId: string, userId: string, optimizationId: string, selectedSuggestions: string[]): Promise<any>;
    /**
     * Generate ATS optimized CV
     */
    generateATSOptimizedCV(cvId: string, analysisId: string, userId: string, selectedFixes?: string[]): Promise<any>;
    /**
     * Compare CV versions
     */
    compareVersions(cvId: string, optimizationId: string, userId: string): Promise<any>;
    /**
     * Generate optimized download
     */
    generateOptimizedDownload(cvId: string, optimizationId: string, userId: string, format: string): Promise<any>;
    /**
     * Get optimization analytics
     */
    getOptimizationAnalytics(userId: string): Promise<any>;
    /**
     * Get ATS analytics
     */
    getATSAnalytics(userId: string): Promise<any>;
    /**
     * Save ATS simulation
     */
    saveATSSimulation(cvId: string, userId: string, simulation: any): Promise<any>;
    /**
     * Delete associated data when CV is deleted
     */
    private deleteAssociatedData;
    /**
     * Helper methods
     */
    private calculateImprovementTrend;
    private getMostCommonIssues;
    private calculateScoreDistribution;
    private getCommonATSIssues;
    private calculateATSTrend;
}
//# sourceMappingURL=cvService.d.ts.map