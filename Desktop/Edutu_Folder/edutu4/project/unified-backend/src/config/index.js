/**
 * Centralized configuration management
 * All environment variables and configuration settings in one place
 */

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // Security configuration
  security: {
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ],
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: process.env.FIREBASE_AUTH_URI,
    tokenUri: process.env.FIREBASE_TOKEN_URI,
    authProviderCertUrl: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    clientCertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  },

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY
  },

  // AI service configuration
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: process.env.GOOGLE_AI_MODEL || 'gemini-pro'
    },
    cohere: {
      apiKey: process.env.COHERE_API_KEY,
      model: process.env.COHERE_MODEL || 'command'
    }
  },

  // Cache configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  },

  // Feature flags
  features: {
    enableScheduler: process.env.ENABLE_SCHEDULER !== 'false',
    enableRAG: process.env.ENABLE_RAG !== 'false',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
    enableRealTimeChat: process.env.ENABLE_REALTIME_CHAT !== 'false'
  }
};

// Validation function
function validateConfig() {
  const requiredFields = [
    'firebase.projectId',
    'firebase.privateKey',
    'firebase.clientEmail'
  ];

  const missing = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  // Warn about missing optional but recommended fields
  const optional = [
    'ai.openai.apiKey',
    'supabase.url',
    'supabase.serviceKey'
  ];

  const missingOptional = optional.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    return !value;
  });

  if (missingOptional.length > 0) {
    console.warn(`⚠️ Missing optional configuration (some features may be limited): ${missingOptional.join(', ')}`);
  }
}

// Validate configuration on load
try {
  validateConfig();
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}

module.exports = config;