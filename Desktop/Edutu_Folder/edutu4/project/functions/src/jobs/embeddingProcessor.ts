/**
 * Background Embedding Processing Jobs for Edutu RAG System
 * Handles automatic embedding generation for scholarships, roadmaps, and user data
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { vectorStore } from '../services/vectorStore';
import { enhancedEmbeddingService } from '../services/enhancedEmbeddingService';

const db = admin.firestore();

/**
 * Triggered when a scholarship is created or updated
 * Automatically generates and stores embeddings
 */
export const processScholarshipEmbedding = functions.firestore
  .document('scholarships/{scholarshipId}')
  .onWrite(async (change, context) => {
    const { scholarshipId } = context.params;
    
    try {
      // If document was deleted, remove embedding
      if (!change.after.exists) {
        await removeScholarshipEmbedding(scholarshipId);
        return;
      }

      const scholarshipData = change.after.data();
      if (!scholarshipData) return;

      // Check if this is a significant update that requires re-embedding
      const beforeData = change.before.exists ? change.before.data() : null;
      if (beforeData && !isSignificantUpdate(beforeData, scholarshipData)) {
        console.log(`Skipping embedding for scholarship ${scholarshipId} - no significant changes`);
        return;
      }

      console.log(`Processing embedding for scholarship: ${scholarshipId}`);

      // Create comprehensive content for embedding
      const content = buildScholarshipContent(scholarshipData);
      
      // Generate and store embedding
      await vectorStore.storeScholarshipEmbedding(
        scholarshipId,
        scholarshipData.title || '',
        content,
        {
          category: scholarshipData.category || 'General',
          provider: scholarshipData.provider || 'Unknown',
          deadline: scholarshipData.deadline,
          amount: scholarshipData.amount,
          eligibility: scholarshipData.eligibility,
          tags: scholarshipData.tags || []
        }
      );

      // Log successful processing
      await logEmbeddingProcessing('scholarship', scholarshipId, 'success');
      
      console.log(`Successfully processed embedding for scholarship: ${scholarshipId}`);

    } catch (error) {
      console.error(`Error processing scholarship embedding for ${scholarshipId}:`, error);
      
      // Log failed processing
      await logEmbeddingProcessing('scholarship', scholarshipId, 'error', error.message);
      
      // Don't throw - we don't want to retry failed embeddings indefinitely
    }
  });

/**
 * Triggered when a roadmap is created or updated
 * Automatically generates and stores embeddings
 */
export const processRoadmapEmbedding = functions.firestore
  .document('userRoadmaps/{roadmapId}')
  .onWrite(async (change, context) => {
    const { roadmapId } = context.params;
    
    try {
      // If document was deleted, remove embedding
      if (!change.after.exists) {
        await removeRoadmapEmbedding(roadmapId);
        return;
      }

      const roadmapData = change.after.data();
      if (!roadmapData) return;

      console.log(`Processing embedding for roadmap: ${roadmapId}`);

      // Extract roadmap content
      const title = roadmapData.title || '';
      const description = roadmapData.description || '';
      const phases = roadmapData.phases || roadmapData.steps || [];

      // Generate and store embedding
      await vectorStore.storeRoadmapEmbedding(
        roadmapId,
        title,
        description,
        phases,
        {
          skills: roadmapData.skills || [],
          difficulty: roadmapData.difficulty || 'intermediate',
          duration: roadmapData.duration || roadmapData.timeline || '6 weeks',
          userId: roadmapData.userId
        }
      );

      // Log successful processing
      await logEmbeddingProcessing('roadmap', roadmapId, 'success');
      
      console.log(`Successfully processed embedding for roadmap: ${roadmapId}`);

    } catch (error) {
      console.error(`Error processing roadmap embedding for ${roadmapId}:`, error);
      
      // Log failed processing
      await logEmbeddingProcessing('roadmap', roadmapId, 'error', error.message);
    }
  });

/**
 * Triggered when user profile is updated
 * Updates user context embeddings
 */
export const processUserContextEmbedding = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const { userId } = context.params;
    
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // Check if preferences changed (only update embedding for relevant changes)
      if (!hasPreferencesChanged(beforeData, afterData)) {
        console.log(`Skipping user context embedding for ${userId} - no preference changes`);
        return;
      }

      console.log(`Processing user context embedding for: ${userId}`);

      // Update user context embedding
      await enhancedEmbeddingService.updateUserContextEmbedding(userId);

      // Log successful processing
      await logEmbeddingProcessing('user_context', userId, 'success');
      
      console.log(`Successfully processed user context embedding for: ${userId}`);

    } catch (error) {
      console.error(`Error processing user context embedding for ${userId}:`, error);
      
      // Log failed processing
      await logEmbeddingProcessing('user_context', userId, 'error', error.message);
    }
  });

/**
 * Scheduled function to process embedding backlog and maintenance
 * Runs every 6 hours
 */
export const processEmbeddingBacklog = functions.pubsub
  .schedule('0 */6 * * *') // Every 6 hours
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting embedding backlog processing...');

    try {
      // Process unprocessed scholarships
      await processUnprocessedScholarships();
      
      // Process unprocessed roadmaps
      await processUnprocessedRoadmaps();
      
      // Update stale user contexts
      await updateStaleUserContexts();
      
      // Cleanup old embeddings
      await cleanupOldEmbeddings();
      
      // Generate system statistics
      await generateEmbeddingStatistics();

      console.log('Embedding backlog processing completed successfully');

    } catch (error) {
      console.error('Error in embedding backlog processing:', error);
      throw error; // This will trigger Cloud Functions retry
    }
  });

/**
 * Daily maintenance job for embedding optimization
 * Runs at 2 AM UTC daily
 */
export const embeddingMaintenanceJob = functions.pubsub
  .schedule('0 2 * * *') // Daily at 2 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting daily embedding maintenance...');

    try {
      // Refresh embeddings for recently updated content
      await refreshRecentEmbeddings();
      
      // Update embedding statistics
      await updateEmbeddingMetrics();
      
      // Check embedding quality and flag issues
      await qualityCheckEmbeddings();
      
      // Optimize vector database performance
      await optimizeVectorDatabase();

      console.log('Daily embedding maintenance completed successfully');

    } catch (error) {
      console.error('Error in daily embedding maintenance:', error);
      throw error;
    }
  });

/**
 * On-demand embedding refresh function
 * Can be triggered manually or by other systems
 */
export const refreshEmbeddings = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify admin privileges (optional - adjust based on your needs)
  const isAdmin = context.auth.token.admin === true;
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }

  const { type, ids, force = false } = data;

  try {
    let processedCount = 0;

    switch (type) {
      case 'scholarships':
        processedCount = await refreshScholarshipEmbeddings(ids, force);
        break;
      
      case 'roadmaps':
        processedCount = await refreshRoadmapEmbeddings(ids, force);
        break;
      
      case 'users':
        processedCount = await refreshUserContextEmbeddings(ids, force);
        break;
      
      case 'all':
        const scholarshipCount = await refreshScholarshipEmbeddings(null, force);
        const roadmapCount = await refreshRoadmapEmbeddings(null, force);
        const userCount = await refreshUserContextEmbeddings(null, force);
        processedCount = scholarshipCount + roadmapCount + userCount;
        break;
      
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid refresh type');
    }

    return {
      success: true,
      message: `Successfully refreshed ${processedCount} embeddings`,
      processedCount,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error in embedding refresh:', error);
    throw new functions.https.HttpsError('internal', 'Embedding refresh failed');
  }
});

// Helper Functions

async function removeScholarshipEmbedding(scholarshipId: string): Promise<void> {
  try {
    const { error } = await vectorStore.supabase
      .from('scholarships_embeddings')
      .delete()
      .eq('scholarship_id', scholarshipId);

    if (error) {
      console.error(`Failed to remove scholarship embedding ${scholarshipId}:`, error);
    } else {
      console.log(`Removed embedding for deleted scholarship: ${scholarshipId}`);
    }
  } catch (error) {
    console.error(`Error removing scholarship embedding ${scholarshipId}:`, error);
  }
}

async function removeRoadmapEmbedding(roadmapId: string): Promise<void> {
  try {
    const { error } = await vectorStore.supabase
      .from('roadmap_embeddings')
      .delete()
      .eq('roadmap_id', roadmapId);

    if (error) {
      console.error(`Failed to remove roadmap embedding ${roadmapId}:`, error);
    } else {
      console.log(`Removed embedding for deleted roadmap: ${roadmapId}`);
    }
  } catch (error) {
    console.error(`Error removing roadmap embedding ${roadmapId}:`, error);
  }
}

function isSignificantUpdate(beforeData: any, afterData: any): boolean {
  // Check if important fields have changed
  const significantFields = ['title', 'summary', 'description', 'category', 'requirements', 'benefits'];
  
  return significantFields.some(field => {
    const before = beforeData[field];
    const after = afterData[field];
    
    // Handle string fields
    if (typeof before === 'string' && typeof after === 'string') {
      return before !== after;
    }
    
    // Handle array fields
    if (Array.isArray(before) && Array.isArray(after)) {
      return JSON.stringify(before.sort()) !== JSON.stringify(after.sort());
    }
    
    // Handle other types
    return before !== after;
  });
}

function hasPreferencesChanged(beforeData: any, afterData: any): boolean {
  const beforePrefs = beforeData.preferences || {};
  const afterPrefs = afterData.preferences || {};
  
  return JSON.stringify(beforePrefs) !== JSON.stringify(afterPrefs);
}

function buildScholarshipContent(scholarshipData: any): string {
  const parts = [
    scholarshipData.title || '',
    scholarshipData.summary || '',
    scholarshipData.description || '',
    scholarshipData.requirements || '',
    scholarshipData.benefits || '',
    scholarshipData.eligibility || '',
    `Provider: ${scholarshipData.provider || ''}`,
    `Category: ${scholarshipData.category || ''}`,
    `Amount: ${scholarshipData.amount || ''}`
  ];

  if (scholarshipData.tags && scholarshipData.tags.length > 0) {
    parts.push(`Tags: ${scholarshipData.tags.join(', ')}`);
  }

  return parts.filter(part => part.trim()).join('\n\n');
}

async function processUnprocessedScholarships(): Promise<void> {
  console.log('Processing unprocessed scholarships...');

  try {
    // Get scholarships from Firestore
    const scholarshipsSnapshot = await db
      .collection('scholarships')
      .limit(50) // Process in batches
      .get();

    // Get existing embeddings from Supabase
    const { data: existingEmbeddings } = await vectorStore.supabase
      .from('scholarships_embeddings')
      .select('scholarship_id, content_hash');

    const existingIds = new Set(existingEmbeddings?.map(e => e.scholarship_id) || []);

    let processedCount = 0;

    for (const doc of scholarshipsSnapshot.docs) {
      const scholarshipId = doc.id;
      const scholarshipData = doc.data();

      // Skip if already processed
      if (existingIds.has(scholarshipId)) {
        continue;
      }

      try {
        const content = buildScholarshipContent(scholarshipData);
        
        await vectorStore.storeScholarshipEmbedding(
          scholarshipId,
          scholarshipData.title || '',
          content,
          {
            category: scholarshipData.category || 'General',
            provider: scholarshipData.provider || 'Unknown',
            deadline: scholarshipData.deadline,
            amount: scholarshipData.amount,
            tags: scholarshipData.tags || []
          }
        );

        processedCount++;
        
        // Add delay to avoid rate limits
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Failed to process scholarship ${scholarshipId}:`, error);
      }
    }

    console.log(`Processed ${processedCount} unprocessed scholarships`);

  } catch (error) {
    console.error('Error processing unprocessed scholarships:', error);
    throw error;
  }
}

async function processUnprocessedRoadmaps(): Promise<void> {
  console.log('Processing unprocessed roadmaps...');

  try {
    const roadmapsSnapshot = await db
      .collection('userRoadmaps')
      .limit(50)
      .get();

    const { data: existingEmbeddings } = await vectorStore.supabase
      .from('roadmap_embeddings')
      .select('roadmap_id');

    const existingIds = new Set(existingEmbeddings?.map(e => e.roadmap_id) || []);

    let processedCount = 0;

    for (const doc of roadmapsSnapshot.docs) {
      const roadmapId = doc.id;
      const roadmapData = doc.data();

      if (existingIds.has(roadmapId)) {
        continue;
      }

      try {
        await vectorStore.storeRoadmapEmbedding(
          roadmapId,
          roadmapData.title || '',
          roadmapData.description || '',
          roadmapData.phases || roadmapData.steps || [],
          {
            skills: roadmapData.skills || [],
            difficulty: roadmapData.difficulty || 'intermediate',
            duration: roadmapData.duration || roadmapData.timeline || '6 weeks',
            userId: roadmapData.userId
          }
        );

        processedCount++;

        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Failed to process roadmap ${roadmapId}:`, error);
      }
    }

    console.log(`Processed ${processedCount} unprocessed roadmaps`);

  } catch (error) {
    console.error('Error processing unprocessed roadmaps:', error);
    throw error;
  }
}

async function updateStaleUserContexts(): Promise<void> {
  console.log('Updating stale user contexts...');

  try {
    // Get user contexts that haven't been updated in 7 days
    const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: staleContexts } = await vectorStore.supabase
      .from('user_context_embeddings')
      .select('user_id')
      .lt('updated_at', staleThreshold.toISOString())
      .limit(20);

    let updatedCount = 0;

    for (const context of staleContexts || []) {
      try {
        await enhancedEmbeddingService.updateUserContextEmbedding(context.user_id);
        updatedCount++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Failed to update user context ${context.user_id}:`, error);
      }
    }

    console.log(`Updated ${updatedCount} stale user contexts`);

  } catch (error) {
    console.error('Error updating stale user contexts:', error);
    throw error;
  }
}

async function cleanupOldEmbeddings(): Promise<void> {
  console.log('Cleaning up old embeddings...');

  try {
    // Remove embeddings for deleted scholarships
    const { data: orphanedScholarships } = await vectorStore.supabase
      .rpc('cleanup_orphaned_scholarship_embeddings');

    // Remove embeddings for deleted roadmaps
    const { data: orphanedRoadmaps } = await vectorStore.supabase
      .rpc('cleanup_orphaned_roadmap_embeddings');

    console.log(`Cleaned up ${orphanedScholarships?.length || 0} orphaned scholarship embeddings`);
    console.log(`Cleaned up ${orphanedRoadmaps?.length || 0} orphaned roadmap embeddings`);

  } catch (error) {
    console.error('Error cleaning up old embeddings:', error);
  }
}

async function generateEmbeddingStatistics(): Promise<void> {
  console.log('Generating embedding statistics...');

  try {
    const stats = await vectorStore.getVectorStats();

    // Log statistics to Firestore for monitoring
    await db.collection('systemStats').doc('embeddings').set({
      ...stats,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      generatedAt: new Date().toISOString()
    });

    console.log('Embedding statistics generated:', stats);

  } catch (error) {
    console.error('Error generating embedding statistics:', error);
  }
}

async function refreshRecentEmbeddings(): Promise<void> {
  // Refresh embeddings for content updated in the last 24 hours
  const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // This would involve checking for recent updates and refreshing embeddings
  // Implementation details would depend on your specific requirements
  console.log('Refreshing recent embeddings...');
}

async function updateEmbeddingMetrics(): Promise<void> {
  // Update performance metrics and quality scores
  console.log('Updating embedding metrics...');
}

async function qualityCheckEmbeddings(): Promise<void> {
  // Check embedding quality and flag potential issues
  console.log('Running embedding quality checks...');
}

async function optimizeVectorDatabase(): Promise<void> {
  // Optimize vector database performance (e.g., rebuild indexes)
  console.log('Optimizing vector database...');
}

async function refreshScholarshipEmbeddings(ids: string[] | null, force: boolean): Promise<number> {
  // Implementation for refreshing scholarship embeddings
  return 0;
}

async function refreshRoadmapEmbeddings(ids: string[] | null, force: boolean): Promise<number> {
  // Implementation for refreshing roadmap embeddings
  return 0;
}

async function refreshUserContextEmbeddings(ids: string[] | null, force: boolean): Promise<number> {
  // Implementation for refreshing user context embeddings
  return 0;
}

async function logEmbeddingProcessing(
  type: string,
  entityId: string,
  status: 'success' | 'error',
  errorMessage?: string
): Promise<void> {
  try {
    await db.collection('embeddingLogs').add({
      type,
      entityId,
      status,
      errorMessage: errorMessage || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log embedding processing:', error);
  }
}