// Supabase Configuration for Embeddings and Vector Storage

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase (add to your .env file)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client with error handling
let supabase: SupabaseClient | null = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: { 'x-application-name': 'edutu-ai-coach' },
      },
    });
  } else {
    console.warn('Supabase configuration missing - vector operations will be disabled');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

export { supabase };

// Utility functions for vector operations
export const vectorOperations = {
  // Calculate cosine similarity between two vectors
  cosineSimilarity: (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  },

  // Normalize vector to unit length
  normalizeVector: (vector: number[]): number[] => {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? vector : vector.map(val => val / magnitude);
  },

  // Create simple text embedding (basic TF-IDF style for keywords)
  // In production, you'd use a proper embedding model
  createTextEmbedding: (text: string, dimensions: number = 384): number[] => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Create a simple hash-based embedding
    const embedding = new Array(dimensions).fill(0);
    
    words.forEach((word, index) => {
      // Simple hash function to distribute words across embedding dimensions
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      const embeddingIndex = Math.abs(hash) % dimensions;
      embedding[embeddingIndex] += 1 / (index + 1); // Reduce weight for later words
    });

    return vectorOperations.normalizeVector(embedding);
  },

  // Combine multiple embeddings with weights
  combineEmbeddings: (embeddings: { vector: number[], weight: number }[]): number[] => {
    if (embeddings.length === 0) return [];
    
    const dimensions = embeddings[0].vector.length;
    const combined = new Array(dimensions).fill(0);
    let totalWeight = 0;

    embeddings.forEach(({ vector, weight }) => {
      totalWeight += weight;
      vector.forEach((val, index) => {
        combined[index] += val * weight;
      });
    });

    // Normalize by total weight
    return totalWeight > 0 
      ? combined.map(val => val / totalWeight)
      : combined;
  }
};

// Database schema information (for reference)
export const SUPABASE_TABLES = {
  OPPORTUNITY_EMBEDDINGS: 'opportunity_embeddings',
  USER_PREFERENCE_EMBEDDINGS: 'user_preference_embeddings', 
  RECOMMENDATION_SCORES: 'recommendation_scores',
  USER_ACTIVITY_LOGS: 'user_activity_logs',
  LEARNING_PATTERNS: 'learning_patterns',
  LEARNING_UPDATES: 'learning_updates'
} as const;