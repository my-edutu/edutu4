import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';

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
  convertedFiles?: { [format: string]: any };
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

export class CVService {
  private db = admin.firestore();
  private storage = admin.storage();

  /**
   * Create a new CV record
   */
  async createCV(cvData: Partial<CV>): Promise<CV> {
    try {
      const cv: CV = {
        ...cvData,
        status: 'completed',
        uploadedAt: cvData.uploadedAt || new Date(),
        tags: cvData.tags || []
      } as CV;

      const docRef = await this.db.collection('cvs').add(cv);
      
      logger.info('CV created successfully', {
        cvId: docRef.id,
        userId: cv.userId,
        originalName: cv.originalName
      });

      return {
        id: docRef.id,
        ...cv
      };
    } catch (error) {
      logger.error('Failed to create CV', {
        userId: cvData.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Failed to create CV record');
    }
  }

  /**
   * Get CV by ID for a specific user
   */
  async getCVById(cvId: string, userId: string): Promise<CV | null> {
    try {
      const doc = await this.db.collection('cvs').doc(cvId).get();
      
      if (!doc.exists) {
        return null;
      }

      const cv = doc.data() as CV;
      
      // Verify ownership
      if (cv.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      return {
        id: doc.id,
        ...cv
      };
    } catch (error) {
      logger.error('Failed to get CV', { cvId, userId, error });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve CV');
    }
  }

  /**
   * Get all CVs for a user
   */
  async getUserCVs(userId: string, limit: number = 50): Promise<CV[]> {
    try {
      const snapshot = await this.db
        .collection('cvs')
        .where('userId', '==', userId)
        .orderBy('uploadedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CV));
    } catch (error) {
      logger.error('Failed to get user CVs', { userId, error });
      throw new AppError('Failed to retrieve CVs');
    }
  }

  /**
   * Update CV
   */
  async updateCV(cvId: string, userId: string, updates: Partial<CV>): Promise<CV> {
    try {
      const cvRef = this.db.collection('cvs').doc(cvId);
      const doc = await cvRef.get();

      if (!doc.exists) {
        throw new NotFoundError('CV');
      }

      const cv = doc.data() as CV;
      if (cv.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date()
      };

      await cvRef.update(updatedData);
      
      const updatedDoc = await cvRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as CV;
    } catch (error) {
      logger.error('Failed to update CV', { cvId, userId, error });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update CV');
    }
  }

  /**
   * Delete CV
   */
  async deleteCV(cvId: string, userId: string): Promise<boolean> {
    try {
      const cvRef = this.db.collection('cvs').doc(cvId);
      const doc = await cvRef.get();

      if (!doc.exists) {
        return false;
      }

      const cv = doc.data() as CV;
      if (cv.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      // Delete associated files from storage
      try {
        const bucket = this.storage.bucket();
        const filePath = `cv-documents/${userId}/${cv.fileId}`;
        await bucket.file(filePath).delete();
        
        if (cv.fileMetadata.thumbnailUrl) {
          const thumbnailPath = `cv-documents/${userId}/thumbnails/${cv.fileId}_thumb.jpg`;
          await bucket.file(thumbnailPath).delete();
        }
      } catch (storageError) {
        logger.warn('Failed to delete files from storage', { cvId, error: storageError });
      }

      // Delete CV document
      await cvRef.delete();

      // Delete associated optimizations and analyses
      await this.deleteAssociatedData(cvId, userId);

      logger.info('CV deleted successfully', { cvId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete CV', { cvId, userId, error });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete CV');
    }
  }

  /**
   * Save optimization results
   */
  async saveOptimization(cvId: string, userId: string, optimization: Partial<CVOptimization>): Promise<CVOptimization> {
    try {
      const optimizationData: CVOptimization = {
        ...optimization,
        cvId,
        userId,
        createdAt: new Date(),
        isApplied: false
      } as CVOptimization;

      const docRef = await this.db.collection('optimizations').add(optimizationData);
      
      logger.info('Optimization saved successfully', {
        optimizationId: docRef.id,
        cvId,
        userId
      });

      return {
        id: docRef.id,
        ...optimizationData
      } as CVOptimization;
    } catch (error) {
      logger.error('Failed to save optimization', { cvId, userId, error });
      throw new AppError('Failed to save optimization results');
    }
  }

  /**
   * Get optimization history
   */
  async getOptimizationHistory(cvId: string, userId: string): Promise<CVOptimization[]> {
    try {
      const snapshot = await this.db
        .collection('optimizations')
        .where('cvId', '==', cvId)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CVOptimization));
    } catch (error) {
      logger.error('Failed to get optimization history', { cvId, userId, error });
      throw new AppError('Failed to retrieve optimization history');
    }
  }

  /**
   * Get optimization by ID
   */
  async getOptimizationById(optimizationId: string, userId: string): Promise<CVOptimization | null> {
    try {
      const doc = await this.db.collection('optimizations').doc(optimizationId).get();
      
      if (!doc.exists) {
        return null;
      }

      const optimization = doc.data() as CVOptimization;
      
      if (optimization.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      return {
        id: doc.id,
        ...optimization
      };
    } catch (error) {
      logger.error('Failed to get optimization', { optimizationId, userId, error });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      return null;
    }
  }

  /**
   * Save ATS analysis
   */
  async saveATSAnalysis(cvId: string, userId: string, analysis: Partial<ATSAnalysis>): Promise<ATSAnalysis> {
    try {
      const analysisData: ATSAnalysis = {
        ...analysis,
        cvId,
        userId,
        createdAt: new Date()
      } as ATSAnalysis;

      const docRef = await this.db.collection('ats_analyses').add(analysisData);
      
      logger.info('ATS analysis saved successfully', {
        analysisId: docRef.id,
        cvId,
        userId
      });

      return {
        id: docRef.id,
        ...analysisData
      } as ATSAnalysis;
    } catch (error) {
      logger.error('Failed to save ATS analysis', { cvId, userId, error });
      throw new AppError('Failed to save ATS analysis results');
    }
  }

  /**
   * Get ATS analysis history
   */
  async getATSAnalysisHistory(cvId: string, userId: string): Promise<ATSAnalysis[]> {
    try {
      const snapshot = await this.db
        .collection('ats_analyses')
        .where('cvId', '==', cvId)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ATSAnalysis));
    } catch (error) {
      logger.error('Failed to get ATS analysis history', { cvId, userId, error });
      throw new AppError('Failed to retrieve ATS analysis history');
    }
  }

  /**
   * Get ATS analysis by ID
   */
  async getATSAnalysisById(analysisId: string, userId: string): Promise<ATSAnalysis | null> {
    try {
      const doc = await this.db.collection('ats_analyses').doc(analysisId).get();
      
      if (!doc.exists) {
        return null;
      }

      const analysis = doc.data() as ATSAnalysis;
      
      if (analysis.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      return {
        id: doc.id,
        ...analysis
      };
    } catch (error) {
      logger.error('Failed to get ATS analysis', { analysisId, userId, error });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      return null;
    }
  }

  /**
   * Apply optimizations to CV
   */
  async applyOptimizations(
    cvId: string, 
    userId: string, 
    optimizationId: string, 
    selectedSuggestions: string[]
  ): Promise<any> {
    try {
      // This is a simplified implementation
      // In a full production system, you would implement sophisticated text processing
      const optimization = await this.getOptimizationById(optimizationId, userId);
      if (!optimization) {
        throw new NotFoundError('Optimization');
      }

      const appliedOptimization = {
        optimizationId,
        appliedSuggestions: selectedSuggestions,
        appliedAt: new Date(),
        status: 'applied'
      };

      // Update optimization record
      await this.db.collection('optimizations').doc(optimizationId).update({
        isApplied: true,
        appliedAt: new Date()
      });

      return appliedOptimization;
    } catch (error) {
      logger.error('Failed to apply optimizations', { cvId, userId, optimizationId, error });
      throw new AppError('Failed to apply optimizations');
    }
  }

  /**
   * Generate ATS optimized CV
   */
  async generateATSOptimizedCV(
    cvId: string, 
    analysisId: string, 
    userId: string, 
    selectedFixes?: string[]
  ): Promise<any> {
    try {
      const cv = await this.getCVById(cvId, userId);
      const analysis = await this.getATSAnalysisById(analysisId, userId);

      if (!cv || !analysis) {
        throw new NotFoundError('CV or ATS analysis');
      }

      // Create optimized version
      const optimizedCV = {
        ...cv,
        id: undefined, // Create new record
        originalName: `${cv.originalName}_ATS_Optimized`,
        isATSOptimized: true,
        parentCVId: cvId,
        atsImprovements: selectedFixes || analysis.issues.map(i => i.fix),
        createdAt: new Date()
      };

      const newCV = await this.createCV(optimizedCV);
      return newCV;
    } catch (error) {
      logger.error('Failed to generate ATS optimized CV', { cvId, analysisId, userId, error });
      throw new AppError('Failed to generate ATS optimized CV');
    }
  }

  /**
   * Compare CV versions
   */
  async compareVersions(cvId: string, optimizationId: string, userId: string): Promise<any> {
    try {
      const cv = await this.getCVById(cvId, userId);
      const optimization = await this.getOptimizationById(optimizationId, userId);

      if (!cv || !optimization) {
        throw new NotFoundError('CV or optimization');
      }

      return {
        original: {
          text: cv.extractedText,
          wordCount: cv.extractedText.split(/\s+/).length,
          score: 'baseline'
        },
        optimized: {
          score: optimization.overallScore,
          improvements: optimization.suggestions.length,
          keywordImprovements: optimization.keywordAnalysis.missingKeywords.length
        },
        comparison: {
          scoreImprovement: optimization.overallScore - 70, // Assuming baseline of 70
          suggestionsApplied: optimization.isApplied ? optimization.suggestions.length : 0
        }
      };
    } catch (error) {
      logger.error('Failed to compare CV versions', { cvId, optimizationId, userId, error });
      throw new AppError('Failed to compare CV versions');
    }
  }

  /**
   * Generate optimized download
   */
  async generateOptimizedDownload(
    cvId: string, 
    optimizationId: string, 
    userId: string, 
    format: string
  ): Promise<any> {
    try {
      // This would typically generate a new file with applied optimizations
      const fileName = `optimized_cv_${Date.now()}.${format}`;
      const downloadUrl = `https://storage.googleapis.com/your-bucket/optimized/${userId}/${fileName}`;
      
      return {
        downloadUrl,
        fileName,
        format,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      logger.error('Failed to generate optimized download', { cvId, optimizationId, userId, format, error });
      throw new AppError('Failed to generate optimized download');
    }
  }

  /**
   * Get optimization analytics
   */
  async getOptimizationAnalytics(userId: string): Promise<any> {
    try {
      const [optimizations, atsAnalyses] = await Promise.all([
        this.db.collection('optimizations').where('userId', '==', userId).get(),
        this.db.collection('ats_analyses').where('userId', '==', userId).get()
      ]);

      const optimizationData = optimizations.docs.map(doc => doc.data());
      const atsData = atsAnalyses.docs.map(doc => doc.data());

      return {
        totalOptimizations: optimizations.size,
        totalATSAnalyses: atsAnalyses.size,
        averageOptimizationScore: optimizationData.reduce((sum: number, opt: any) => sum + (opt.overallScore || 0), 0) / optimizationData.length || 0,
        averageATSScore: atsData.reduce((sum: number, ats: any) => sum + (ats.atsScore || 0), 0) / atsData.length || 0,
        improvementTrend: this.calculateImprovementTrend(optimizationData, atsData),
        mostCommonIssues: this.getMostCommonIssues(optimizationData, atsData)
      };
    } catch (error) {
      logger.error('Failed to get optimization analytics', { userId, error });
      throw new AppError('Failed to retrieve optimization analytics');
    }
  }

  /**
   * Get ATS analytics
   */
  async getATSAnalytics(userId: string): Promise<any> {
    try {
      const snapshot = await this.db
        .collection('ats_analyses')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const analyses = snapshot.docs.map(doc => doc.data());

      return {
        totalAnalyses: analyses.length,
        averageScore: analyses.reduce((sum: number, analysis: any) => sum + analysis.atsScore, 0) / analyses.length || 0,
        scoreDistribution: this.calculateScoreDistribution(analyses),
        commonIssues: this.getCommonATSIssues(analyses),
        trend: this.calculateATSTrend(analyses)
      };
    } catch (error) {
      logger.error('Failed to get ATS analytics', { userId, error });
      throw new AppError('Failed to retrieve ATS analytics');
    }
  }

  /**
   * Save ATS simulation
   */
  async saveATSSimulation(cvId: string, userId: string, simulation: any): Promise<any> {
    try {
      const simulationData = {
        ...simulation,
        cvId,
        userId,
        createdAt: new Date()
      };

      const docRef = await this.db.collection('ats_simulations').add(simulationData);
      
      return {
        id: docRef.id,
        ...simulationData
      };
    } catch (error) {
      logger.error('Failed to save ATS simulation', { cvId, userId, error });
      throw new AppError('Failed to save ATS simulation');
    }
  }

  /**
   * Delete associated data when CV is deleted
   */
  private async deleteAssociatedData(cvId: string, userId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      // Delete optimizations
      const optimizations = await this.db
        .collection('optimizations')
        .where('cvId', '==', cvId)
        .where('userId', '==', userId)
        .get();

      optimizations.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete ATS analyses
      const atsAnalyses = await this.db
        .collection('ats_analyses')
        .where('cvId', '==', cvId)
        .where('userId', '==', userId)
        .get();

      atsAnalyses.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      logger.warn('Failed to delete associated data', { cvId, userId, error });
    }
  }

  /**
   * Helper methods
   */
  private calculateImprovementTrend(optimizations: any[], atsAnalyses: any[]): string {
    // Simplified trend calculation
    if (optimizations.length < 2) return 'insufficient_data';
    
    const recent = optimizations.slice(0, Math.ceil(optimizations.length / 2));
    const older = optimizations.slice(Math.ceil(optimizations.length / 2));
    
    const recentAvg = recent.reduce((sum: number, opt: any) => sum + (opt.overallScore || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum: number, opt: any) => sum + (opt.overallScore || 0), 0) / older.length;
    
    return recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
  }

  private getMostCommonIssues(optimizations: any[], atsAnalyses: any[]): string[] {
    const issues: string[] = [];
    
    optimizations.forEach(opt => {
      if (opt.suggestions) {
        opt.suggestions.forEach((suggestion: any) => {
          issues.push(suggestion.category);
        });
      }
    });

    atsAnalyses.forEach(ats => {
      if (ats.issues) {
        ats.issues.forEach((issue: any) => {
          issues.push(issue.type);
        });
      }
    });

    const frequency: { [key: string]: number } = {};
    issues.forEach(issue => {
      frequency[issue] = (frequency[issue] || 0) + 1;
    });

    return Object.keys(frequency)
      .sort((a, b) => frequency[b] - frequency[a])
      .slice(0, 5);
  }

  private calculateScoreDistribution(analyses: any[]): any {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    analyses.forEach(analysis => {
      const score = analysis.atsScore;
      if (score >= 85) distribution.excellent++;
      else if (score >= 70) distribution.good++;
      else if (score >= 50) distribution.fair++;
      else distribution.poor++;
    });

    return distribution;
  }

  private getCommonATSIssues(analyses: any[]): string[] {
    const issues: string[] = [];
    
    analyses.forEach(analysis => {
      if (analysis.issues) {
        analysis.issues.forEach((issue: any) => {
          issues.push(issue.issue);
        });
      }
    });

    const frequency: { [key: string]: number } = {};
    issues.forEach(issue => {
      frequency[issue] = (frequency[issue] || 0) + 1;
    });

    return Object.keys(frequency)
      .sort((a, b) => frequency[b] - frequency[a])
      .slice(0, 10);
  }

  private calculateATSTrend(analyses: any[]): any {
    if (analyses.length < 2) return { trend: 'insufficient_data' };
    
    const scores = analyses.map(a => a.atsScore);
    const recentAvg = scores.slice(0, Math.ceil(scores.length / 2))
      .reduce((sum, score) => sum + score, 0) / Math.ceil(scores.length / 2);
    const olderAvg = scores.slice(Math.ceil(scores.length / 2))
      .reduce((sum, score) => sum + score, 0) / Math.floor(scores.length / 2);
    
    return {
      trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
      change: Math.round((recentAvg - olderAvg) * 10) / 10
    };
  }
}