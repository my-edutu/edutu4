// Configuration for Continuous Learning System

// Environment validation and configuration
const validateEnvironment = () => {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_AUTH_DOMAIN'
  ];

  const missing = required.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Initialize environment validation
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error);
}

// Learning system configuration
export const LEARNING_CONFIG = {
  // Feature toggles
  ENABLED: import.meta.env.VITE_LEARNING_PIPELINE_ENABLED !== 'false',
  
  // Supabase configuration
  SUPABASE_ENABLED: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
  
  // AI service configuration
  AI_SERVICES: {
    OPENAI_ENABLED: !!import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_ENABLED: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
    GEMINI_ENABLED: !!import.meta.env.VITE_GEMINI_API_KEY,
  },
  
  // Pipeline settings
  PIPELINE: {
    SCHEDULE: import.meta.env.VITE_LEARNING_PIPELINE_SCHEDULE || 'daily',
    BATCH_SIZE: parseInt(import.meta.env.VITE_BATCH_SIZE || '100'),
    MAX_USERS_PER_BATCH: parseInt(import.meta.env.VITE_MAX_USERS_PER_BATCH || '1000'),
    ACTIVITY_BUFFER_SIZE: 50,
    ACTIVITY_FLUSH_INTERVAL: 30000, // 30 seconds
  },
  
  // Recommendation engine settings
  RECOMMENDATIONS: {
    CACHE_DURATION: 1000 * 60 * 60 * 2, // 2 hours
    EMBEDDING_DIMENSIONS: 384,
    MIN_INTERACTIONS_FOR_PERSONALIZATION: 5,
    RECOMMENDATION_LIMIT: 20,
    SIMILARITY_THRESHOLD: 0.1,
  },
  
  // Chat personalization settings
  CHAT: {
    PERSONALIZATION_CACHE_DURATION: 1000 * 60 * 60 * 2, // 2 hours
    MIN_INTERACTIONS_FOR_ADAPTATION: 3,
    RESPONSE_QUALITY_THRESHOLD: 4.0, // Out of 5
    MAX_CONVERSATION_HISTORY: 50,
  },
  
  // Roadmap refinement settings
  ROADMAP: {
    MIN_USERS_FOR_PATTERN_ANALYSIS: 10,
    BOTTLENECK_DELAY_THRESHOLD: 0.3, // 30% delay rate
    BOTTLENECK_SKIP_THRESHOLD: 0.2, // 20% skip rate
    PATTERN_CONFIDENCE_THRESHOLD: 0.5,
  },
  
  // Performance and monitoring
  PERFORMANCE: {
    ANALYTICS_ENABLED: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
    MONITORING_ENABLED: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
    LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
    MAX_METRICS_HISTORY: 90, // days
  },
  
  // Development and debugging
  DEV: {
    MODE: import.meta.env.VITE_DEV_MODE === 'true',
    DEBUG_RECOMMENDATIONS: import.meta.env.VITE_DEBUG_RECOMMENDATIONS === 'true',
    DEBUG_EMBEDDINGS: import.meta.env.VITE_DEBUG_EMBEDDINGS === 'true',
    MOCK_AI_RESPONSES: import.meta.env.VITE_MOCK_AI_RESPONSES === 'true',
  }
} as const;

// Runtime configuration checks
export const validateLearningConfig = () => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if Supabase is configured for embeddings
  if (LEARNING_CONFIG.ENABLED && !LEARNING_CONFIG.SUPABASE_ENABLED) {
    warnings.push('Supabase not configured - vector operations will be disabled');
  }

  // Check if AI services are configured
  if (!Object.values(LEARNING_CONFIG.AI_SERVICES).some(enabled => enabled)) {
    warnings.push('No AI services configured - using rule-based responses only');
  }

  // Log warnings and errors
  warnings.forEach(warning => console.warn(`[Learning Config Warning]: ${warning}`));
  errors.forEach(error => console.error(`[Learning Config Error]: ${error}`));

  if (errors.length > 0) {
    throw new Error(`Learning system configuration errors: ${errors.join(', ')}`);
  }

  return { warnings, errors };
};

// Database table schemas for Supabase (for reference)
export const SUPABASE_SCHEMAS = {
  OPPORTUNITY_EMBEDDINGS: `
    CREATE TABLE IF NOT EXISTS opportunity_embeddings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      opportunity_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      embedding VECTOR(384),
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS opportunity_embeddings_category_idx ON opportunity_embeddings(category);
    CREATE INDEX IF NOT EXISTS opportunity_embeddings_embedding_idx ON opportunity_embeddings USING ivfflat(embedding vector_cosine_ops);
  `,
  
  USER_PREFERENCE_EMBEDDINGS: `
    CREATE TABLE IF NOT EXISTS user_preference_embeddings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT UNIQUE NOT NULL,
      preferences_vector VECTOR(384),
      interaction_vector VECTOR(384),
      success_vector VECTOR(384),
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS user_preference_embeddings_user_id_idx ON user_preference_embeddings(user_id);
  `,
  
  CHAT_PERSONALIZATION: `
    CREATE TABLE IF NOT EXISTS chat_personalization (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT UNIQUE NOT NULL,
      preferred_topics TEXT[],
      communication_style TEXT CHECK (communication_style IN ('detailed', 'concise', 'mixed')),
      engagement_level TEXT CHECK (engagement_level IN ('high', 'medium', 'low')),
      successful_response_patterns JSONB,
      recent_interests TEXT[],
      learning_goals TEXT[],
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS chat_personalization_user_id_idx ON chat_personalization(user_id);
  `,
  
  LEARNING_PATTERNS: `
    CREATE TABLE IF NOT EXISTS learning_patterns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      pattern_type TEXT NOT NULL,
      pattern_name TEXT NOT NULL,
      confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
      pattern_data JSONB,
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS learning_patterns_user_id_idx ON learning_patterns(user_id);
    CREATE INDEX IF NOT EXISTS learning_patterns_type_idx ON learning_patterns(pattern_type);
  `
} as const;

// Export configuration validation results
export const CONFIG_STATUS = (() => {
  try {
    return validateLearningConfig();
  } catch (error) {
    console.error('Learning configuration validation failed:', error);
    return { warnings: [], errors: [error instanceof Error ? error.message : String(error)] };
  }
})();