/**
 * Embedding Service
 * Handles automatic embedding generation and updates for opportunities and users
 */

const { generateEmbeddings } = require('../config/ai');
const { getAllScholarships } = require('../config/firebase');
const { 
  batchUpdateScholarshipEmbeddings,
  storeScholarshipEmbedding,
  storeUserPreferencesEmbedding,
  deleteScholarshipEmbedding,
  getEmbeddingStats,
} = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Process a single scholarship for embedding
 */
async function processScholarshipEmbedding(scholarship) {
  try {
    // Create text representation for embedding
    const scholarshipText = [
      scholarship.title,
      scholarship.summary,
      scholarship.description,
      scholarship.category,
      scholarship.provider,
      scholarship.location,
      scholarship.requirements,
      scholarship.benefits
    ].filter(Boolean).join(' ');

    if (!scholarshipText.trim()) {
      logger.warn(`No content to embed for scholarship ${scholarship.id}`);
      return null;
    }

    // Generate embedding
    const embedding = await generateEmbeddings(scholarshipText);

    // Store in vector database
    await storeScholarshipEmbedding(scholarship.id, embedding, {
      title: scholarship.title,
      summary: scholarship.summary || scholarship.description?.substring(0, 500),
      category: scholarship.category,
      provider: scholarship.provider,
      location: scholarship.location,
      deadline: scholarship.deadline,
    });

    logger.debug(`Processed embedding for scholarship: ${scholarship.title}`);
    return { scholarshipId: scholarship.id, success: true };

  } catch (error) {
    logger.error(`Error processing embedding for scholarship ${scholarship.id}:`, error);
    return { scholarshipId: scholarship.id, success: false, error: error.message };
  }
}

/**
 * Process all scholarships for embeddings
 */
async function processAllScholarshipEmbeddings(options = {}) {
  try {
    const { force = false, batchSize = 50 } = options;

    logger.info('Starting batch scholarship embedding processing');

    // Get all scholarships
    const scholarships = await getAllScholarships();
    logger.info(`Found ${scholarships.length} scholarships to process`);

    if (scholarships.length === 0) {
      return { processed: 0, errors: 0, message: 'No scholarships found' };
    }

    const results = {
      processed: 0,
      errors: 0,
      details: []
    };

    // Process in batches for better performance
    for (let i = 0; i < scholarships.length; i += batchSize) {
      const batch = scholarships.slice(i, i + batchSize);
      
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scholarships.length / batchSize)}`);

      // Generate embeddings for entire batch
      const texts = batch.map(s => [
        s.title,
        s.summary,
        s.description,
        s.category,
        s.provider,
        s.location,
        s.requirements,
        s.benefits
      ].filter(Boolean).join(' '));

      try {
        const embeddings = await generateEmbeddings(texts);
        
        // Store embeddings using batch update
        await batchUpdateScholarshipEmbeddings(batch, embeddings);
        
        results.processed += batch.length;
        results.details.push({
          batchIndex: Math.floor(i / batchSize) + 1,
          processed: batch.length,
          success: true
        });

        logger.info(`Successfully processed batch of ${batch.length} scholarships`);

      } catch (batchError) {
        logger.error(`Error processing batch starting at index ${i}:`, batchError);
        
        // Fallback to individual processing for failed batch
        for (const scholarship of batch) {
          const result = await processScholarshipEmbedding(scholarship);
          if (result?.success) {
            results.processed++;
          } else {
            results.errors++;
          }
        }

        results.details.push({
          batchIndex: Math.floor(i / batchSize) + 1,
          processed: batch.length,
          success: false,
          error: batchError.message
        });
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < scholarships.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`Completed scholarship embedding processing: ${results.processed} processed, ${results.errors} errors`);
    return results;

  } catch (error) {
    logger.error('Error in batch scholarship embedding processing:', error);
    throw error;
  }
}

/**
 * Process user preferences for embedding
 */
async function processUserPreferencesEmbedding(userId, userProfile) {
  try {
    const preferences = userProfile.preferences || {};
    
    // Create text representation of user preferences
    const userText = [
      preferences.educationLevel,
      preferences.careerInterests?.join(' '),
      preferences.learningStyle,
      preferences.timeAvailability,
      preferences.currentSkills?.join(' '),
      preferences.careerGoals?.join(' '),
      preferences.preferredLocations?.join(' '),
      preferences.industries?.join(' '),
      preferences.workExperience,
      preferences.personalityTraits?.join(' ')
    ].filter(Boolean).join(' ');
    
    if (!userText.trim()) {
      throw new Error('No user preferences found to generate embedding');
    }
    
    // Generate embedding
    const embedding = await generateEmbeddings(userText);
    
    // Store in vector database
    await storeUserPreferencesEmbedding(userId, embedding, preferences);
    
    logger.info(`Processed user preferences embedding for user ${userId}`);
    return { userId, success: true };

  } catch (error) {
    logger.error(`Error processing user preferences embedding for ${userId}:`, error);
    return { userId, success: false, error: error.message };
  }
}

/**
 * Update embeddings for changed scholarships
 */
async function updateChangedScholarshipEmbeddings(changedScholarships) {
  try {
    logger.info(`Updating embeddings for ${changedScholarships.length} changed scholarships`);

    const results = {
      updated: 0,
      errors: 0,
      details: []
    };

    for (const scholarship of changedScholarships) {
      const result = await processScholarshipEmbedding(scholarship);
      if (result?.success) {
        results.updated++;
      } else {
        results.errors++;
      }
      results.details.push(result);

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info(`Updated ${results.updated} scholarship embeddings, ${results.errors} errors`);
    return results;

  } catch (error) {
    logger.error('Error updating changed scholarship embeddings:', error);
    throw error;
  }
}

/**
 * Remove embeddings for deleted scholarships
 */
async function removeDeletedScholarshipEmbeddings(deletedScholarshipIds) {
  try {
    logger.info(`Removing embeddings for ${deletedScholarshipIds.length} deleted scholarships`);

    const results = {
      removed: 0,
      errors: 0,
      details: []
    };

    for (const scholarshipId of deletedScholarshipIds) {
      try {
        await deleteScholarshipEmbedding(scholarshipId);
        results.removed++;
        results.details.push({ scholarshipId, success: true });
      } catch (error) {
        logger.error(`Error removing embedding for scholarship ${scholarshipId}:`, error);
        results.errors++;
        results.details.push({ scholarshipId, success: false, error: error.message });
      }
    }

    logger.info(`Removed ${results.removed} scholarship embeddings, ${results.errors} errors`);
    return results;

  } catch (error) {
    logger.error('Error removing deleted scholarship embeddings:', error);
    throw error;
  }
}

/**
 * Monitor and sync scholarship embeddings
 */
async function syncScholarshipEmbeddings() {
  try {
    logger.info('Starting scholarship embeddings sync');

    // Get current scholarships from Firebase
    const currentScholarships = await getAllScholarships();
    const currentScholarshipIds = new Set(currentScholarships.map(s => s.id));

    // Get current embeddings from Supabase
    const { getSupabase } = require('../config/supabase');
    const supabase = getSupabase();
    
    const { data: existingEmbeddings, error } = await supabase
      .from('scholarships_embeddings')
      .select('scholarship_id, updated_at');

    if (error) {
      throw error;
    }

    const existingEmbeddingIds = new Set(existingEmbeddings.map(e => e.scholarship_id));

    // Find scholarships that need new embeddings
    const newScholarships = currentScholarships.filter(s => !existingEmbeddingIds.has(s.id));

    // Find scholarships that were deleted
    const deletedScholarshipIds = Array.from(existingEmbeddingIds)
      .filter(id => !currentScholarshipIds.has(id));

    const syncResults = {
      newEmbeddings: 0,
      removedEmbeddings: 0,
      errors: 0
    };

    // Process new embeddings
    if (newScholarships.length > 0) {
      logger.info(`Processing ${newScholarships.length} new scholarships for embeddings`);
      const newResults = await processAllScholarshipEmbeddings({ 
        scholarships: newScholarships 
      });
      syncResults.newEmbeddings = newResults.processed;
      syncResults.errors += newResults.errors;
    }

    // Remove deleted embeddings
    if (deletedScholarshipIds.length > 0) {
      const removeResults = await removeDeletedScholarshipEmbeddings(deletedScholarshipIds);
      syncResults.removedEmbeddings = removeResults.removed;
      syncResults.errors += removeResults.errors;
    }

    logger.info('Scholarship embeddings sync completed', syncResults);
    return syncResults;

  } catch (error) {
    logger.error('Error in scholarship embeddings sync:', error);
    throw error;
  }
}

/**
 * Get embedding service statistics
 */
async function getEmbeddingServiceStats() {
  try {
    const stats = await getEmbeddingStats();
    
    // Add processing queue info if available
    const serviceStats = {
      ...stats,
      service: {
        lastSync: new Date().toISOString(),
        status: 'operational',
        version: '1.0.0'
      }
    };

    return serviceStats;

  } catch (error) {
    logger.error('Error getting embedding service stats:', error);
    throw error;
  }
}

/**
 * Scheduled embedding maintenance
 */
async function performEmbeddingMaintenance() {
  try {
    logger.info('Starting embedding maintenance task');

    const maintenanceResults = {
      sync: null,
      stats: null,
      errors: []
    };

    try {
      // Perform sync
      maintenanceResults.sync = await syncScholarshipEmbeddings();
    } catch (error) {
      logger.error('Error in sync during maintenance:', error);
      maintenanceResults.errors.push({ task: 'sync', error: error.message });
    }

    try {
      // Get updated stats
      maintenanceResults.stats = await getEmbeddingServiceStats();
    } catch (error) {
      logger.error('Error getting stats during maintenance:', error);
      maintenanceResults.errors.push({ task: 'stats', error: error.message });
    }

    logger.info('Embedding maintenance completed', {
      hasErrors: maintenanceResults.errors.length > 0,
      errorCount: maintenanceResults.errors.length
    });

    return maintenanceResults;

  } catch (error) {
    logger.error('Error in embedding maintenance:', error);
    throw error;
  }
}

module.exports = {
  processScholarshipEmbedding,
  processAllScholarshipEmbeddings,
  processUserPreferencesEmbedding,
  updateChangedScholarshipEmbeddings,
  removeDeletedScholarshipEmbeddings,
  syncScholarshipEmbeddings,
  getEmbeddingServiceStats,
  performEmbeddingMaintenance,
};