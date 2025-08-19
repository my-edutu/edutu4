/**
 * Supabase Vector Database Configuration
 * Handles embeddings storage and similarity search for AI recommendations
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

let supabase = null;

/**
 * Initialize Supabase client
 */
async function initializeSupabase() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and service role key are required');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test connection and create tables if needed
    await setupVectorTables();
    
    logger.info('Supabase initialized successfully');
    return supabase;
  } catch (error) {
    logger.error('Failed to initialize Supabase:', error);
    throw error;
  }
}

/**
 * Setup vector database tables
 */
async function setupVectorTables() {
  try {
    // Enable pgvector extension (if not already enabled)
    const { error: extensionError } = await supabase.rpc('create_extension_if_not_exists', {
      extension_name: 'vector'
    });
    
    if (extensionError && !extensionError.message.includes('already exists')) {
      logger.warn('pgvector extension setup:', extensionError.message);
    }
    
    // Create scholarships_embeddings table
    const { error: scholarshipsTableError } = await supabase.rpc('create_scholarships_embeddings_table');
    if (scholarshipsTableError && !scholarshipsTableError.message.includes('already exists')) {
      logger.warn('Scholarships embeddings table setup:', scholarshipsTableError.message);
    }
    
    // Create user_preferences_embeddings table
    const { error: usersTableError } = await supabase.rpc('create_user_preferences_embeddings_table');
    if (usersTableError && !usersTableError.message.includes('already exists')) {
      logger.warn('User preferences embeddings table setup:', usersTableError.message);
    }
    
    logger.info('Vector database tables setup completed');
  } catch (error) {
    logger.error('Error setting up vector tables:', error);
    // Don't throw error - tables might already exist
  }
}

/**
 * Store scholarship embedding
 */
async function storeScholarshipEmbedding(scholarshipId, embedding, metadata) {
  try {
    const { data, error } = await supabase
      .from('scholarships_embeddings')
      .upsert({
        scholarship_id: scholarshipId,
        embedding: embedding,
        title: metadata.title,
        summary: metadata.summary,
        category: metadata.category,
        provider: metadata.provider,
        location: metadata.location,
        deadline: metadata.deadline,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      throw error;
    }
    
    logger.debug(`Stored embedding for scholarship ${scholarshipId}`);
    return data;
  } catch (error) {
    logger.error(`Error storing scholarship embedding ${scholarshipId}:`, error);
    throw error;
  }
}

/**
 * Store user preferences embedding
 */
async function storeUserPreferencesEmbedding(userId, embedding, preferences) {
  try {
    const { data, error } = await supabase
      .from('user_preferences_embeddings')
      .upsert({
        user_id: userId,
        embedding: embedding,
        education_level: preferences.educationLevel,
        career_interests: preferences.careerInterests,
        learning_style: preferences.learningStyle,
        time_availability: preferences.timeAvailability,
        preferred_locations: preferences.preferredLocations,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      throw error;
    }
    
    logger.debug(`Stored user preferences embedding for user ${userId}`);
    return data;
  } catch (error) {
    logger.error(`Error storing user preferences embedding ${userId}:`, error);
    throw error;
  }
}

/**
 * Find similar scholarships using vector similarity
 */
async function findSimilarScholarships(queryEmbedding, limit = 10, threshold = 0.7) {
  try {
    const { data, error } = await supabase.rpc('match_scholarships', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });
    
    if (error) {
      throw error;
    }
    
    logger.debug(`Found ${data?.length || 0} similar scholarships`);
    return data || [];
  } catch (error) {
    logger.error('Error finding similar scholarships:', error);
    throw error;
  }
}

/**
 * Get user recommendations based on preferences
 */
async function getUserRecommendations(userId, limit = 3) {
  try {
    // Get user's preference embedding
    const { data: userEmbedding, error: userError } = await supabase
      .from('user_preferences_embeddings')
      .select('embedding')
      .eq('user_id', userId)
      .single();
    
    if (userError) {
      throw userError;
    }
    
    if (!userEmbedding) {
      logger.warn(`No preference embedding found for user ${userId}`);
      return [];
    }
    
    // Find similar scholarships
    const recommendations = await findSimilarScholarships(
      userEmbedding.embedding,
      limit,
      0.6 // Lower threshold for recommendations
    );
    
    logger.info(`Generated ${recommendations.length} recommendations for user ${userId}`);
    return recommendations;
  } catch (error) {
    logger.error(`Error getting recommendations for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Batch update scholarship embeddings
 */
async function batchUpdateScholarshipEmbeddings(scholarships, embeddings) {
  try {
    const batchData = scholarships.map((scholarship, index) => ({
      scholarship_id: scholarship.id,
      embedding: embeddings[index],
      title: scholarship.title,
      summary: scholarship.summary,
      category: scholarship.category,
      provider: scholarship.provider,
      location: scholarship.location,
      deadline: scholarship.deadline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Insert in batches of 100 (Supabase limit)
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < batchData.length; i += batchSize) {
      const batch = batchData.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('scholarships_embeddings')
        .upsert(batch);
      
      if (error) {
        throw error;
      }
      
      results.push(...(data || []));
      logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(batchData.length / batchSize)}`);
    }
    
    logger.info(`Batch updated ${batchData.length} scholarship embeddings`);
    return results;
  } catch (error) {
    logger.error('Error batch updating scholarship embeddings:', error);
    throw error;
  }
}

/**
 * Delete scholarship embedding
 */
async function deleteScholarshipEmbedding(scholarshipId) {
  try {
    const { error } = await supabase
      .from('scholarships_embeddings')
      .delete()
      .eq('scholarship_id', scholarshipId);
    
    if (error) {
      throw error;
    }
    
    logger.debug(`Deleted embedding for scholarship ${scholarshipId}`);
  } catch (error) {
    logger.error(`Error deleting scholarship embedding ${scholarshipId}:`, error);
    throw error;
  }
}

/**
 * Get embedding statistics
 */
async function getEmbeddingStats() {
  try {
    const { data: scholarshipCount, error: scholarshipError } = await supabase
      .from('scholarships_embeddings')
      .select('count', { count: 'exact' });
    
    const { data: userCount, error: userError } = await supabase
      .from('user_preferences_embeddings')
      .select('count', { count: 'exact' });
    
    if (scholarshipError || userError) {
      throw scholarshipError || userError;
    }
    
    return {
      scholarshipEmbeddings: scholarshipCount?.[0]?.count || 0,
      userEmbeddings: userCount?.[0]?.count || 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting embedding stats:', error);
    throw error;
  }
}

/**
 * Get Supabase client instance
 */
function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initializeSupabase() first.');
  }
  return supabase;
}

module.exports = {
  initializeSupabase,
  getSupabase,
  storeScholarshipEmbedding,
  storeUserPreferencesEmbedding,
  findSimilarScholarships,
  getUserRecommendations,
  batchUpdateScholarshipEmbeddings,
  deleteScholarshipEmbedding,
  getEmbeddingStats,
};