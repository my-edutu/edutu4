/**
 * Embedding Refresh Scheduled Function
 * Runs daily to refresh embeddings and improve recommendations
 */

import * as admin from 'firebase-admin';
import { generateEmbeddings } from '../services/aiService';
import { 
  refreshAllEmbeddings, 
  updateUserRecommendations,
  getEmbeddingStats,
  storeScholarshipEmbedding,
  storeUserPreferencesEmbedding
} from '../utils/supabase';

export async function embeddingRefreshScheduled(context: any): Promise<void> {
  console.log('🔄 Embedding refresh scheduled task started');
  
  const startTime = Date.now();
  let processedScholarships = 0;
  let processedUsers = 0;
  let errors = 0;

  try {
    const db = admin.firestore();

    // Step 1: Refresh scholarship embeddings for new items
    console.log('📚 Refreshing scholarship embeddings...');
    
    const scholarshipsSnapshot = await db.collection('scholarships')
      .where('updatedAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .limit(100) // Process up to 100 new/updated scholarships
      .get();

    console.log(`Found ${scholarshipsSnapshot.size} scholarships to process`);

    for (const scholarshipDoc of scholarshipsSnapshot.docs) {
      try {
        const scholarshipData = scholarshipDoc.data();
        const scholarship = { id: scholarshipDoc.id, ...scholarshipData };
        
        // Generate embedding text
        const embeddingText = `${scholarshipData.title || ''} ${scholarshipData.summary || ''} ${scholarshipData.requirements || ''} ${scholarshipData.benefits || ''}`;
        
        // Generate embedding
        const embedding = await generateEmbeddings(embeddingText);
        
        // Store in Supabase vector database
        await storeScholarshipEmbedding(scholarshipDoc.id, embedding, scholarship);
        
        processedScholarships++;
        console.log(`✅ Updated embedding for scholarship: ${scholarshipData.title || scholarshipDoc.id}`);
        
        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing scholarship ${scholarshipDoc.id}:`, error);
        errors++;
      }
    }

    // Step 2: Refresh user preference embeddings and recommendations
    console.log('👥 Refreshing user embeddings and recommendations...');
    
    const usersSnapshot = await db.collection('users')
      .where('onboardingCompleted', '==', true)
      .limit(50) // Process up to 50 users per run
      .get();

    console.log(`Found ${usersSnapshot.size} users to process`);

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const user = { id: userDoc.id, ...userData };
        
        if (!userData.preferences) {
          console.log(`⚠️ Skipping user ${userDoc.id} - no preferences`);
          continue;
        }

        // Generate user preferences text for embedding
        const prefs = userData.preferences;
        const preferencesText = `
          Education Level: ${prefs.educationLevel || 'Not specified'}
          Career Interests: ${prefs.careerInterests?.join(', ') || 'Not specified'}
          Learning Style: ${prefs.learningStyle || 'Not specified'}
          Time Availability: ${prefs.timeAvailability || 'Not specified'}
          Goals: ${prefs.currentGoals || 'Not specified'}
          Skills: ${prefs.skillsToImprove?.join(', ') || 'Not specified'}
          Field of Study: ${prefs.fieldOfStudy || 'Not specified'}
          Career Stage: ${prefs.careerStage || 'Not specified'}
          Budget Range: ${prefs.budgetRange || 'Not specified'}
        `.trim();

        // Generate embedding
        const embedding = await generateEmbeddings(preferencesText);
        
        // Store user preferences embedding
        await storeUserPreferencesEmbedding(userDoc.id, embedding, user);
        
        // Update user recommendations based on new embeddings
        await updateUserRecommendations(userDoc.id);
        
        processedUsers++;
        console.log(`✅ Updated embeddings and recommendations for user: ${userDoc.id}`);
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Error processing user ${userDoc.id}:`, error);
        errors++;
      }
    }

    // Step 3: Clean up old embeddings (optional)
    console.log('🧹 Cleaning up old embeddings...');
    await cleanupOldEmbeddings();

    // Step 4: Generate system statistics
    const stats = await getEmbeddingStats();
    console.log('📊 Embedding system stats:', stats);

    // Log the refresh results
    await logEmbeddingRefreshResults(db, {
      timestamp: new Date(),
      processedScholarships,
      processedUsers,
      errors,
      duration: Date.now() - startTime,
      systemStats: stats
    });

    console.log(`✅ Embedding refresh completed: ${processedScholarships} scholarships, ${processedUsers} users, ${errors} errors`);

  } catch (error) {
    console.error('❌ Embedding refresh failed:', error);
    
    // Log the error
    try {
      const db = admin.firestore();
      await db.collection('embeddingLogs').add({
        timestamp: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        processedScholarships,
        processedUsers,
        errors,
        duration: Date.now() - startTime
      });
    } catch (logError) {
      console.error('Failed to log embedding refresh error:', logError);
    }
  }
}

/**
 * Clean up embeddings older than 30 days that are no longer referenced
 */
async function cleanupOldEmbeddings(): Promise<void> {
  try {
    // This would typically involve cleaning up old embeddings in Supabase
    // Implementation depends on your Supabase schema and cleanup requirements
    console.log('🧹 Cleanup completed (placeholder implementation)');
  } catch (error) {
    console.error('Error during embedding cleanup:', error);
  }
}

/**
 * Log embedding refresh results to Firestore
 */
async function logEmbeddingRefreshResults(db: admin.firestore.Firestore, results: any): Promise<void> {
  try {
    await db.collection('embeddingLogs').add({
      ...results,
      status: 'success'
    });
  } catch (error) {
    console.error('Failed to log embedding refresh results:', error);
  }
}