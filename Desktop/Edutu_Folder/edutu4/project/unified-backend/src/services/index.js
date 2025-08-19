/**
 * Service initialization and management
 * Centralized service management for all external integrations
 */

const logger = require('../utils/logger');
const config = require('../config');

// Import service modules
const firebaseService = require('./firebaseService');
const supabaseService = require('./supabaseService');
const aiService = require('./aiService');
const cachingService = require('./cachingService');

// Service status tracking
const serviceStatus = {
  firebase: false,
  supabase: false,
  ai: false,
  cache: false
};

/**
 * Initialize all services in the correct order
 */
async function initializeServices() {
  logger.info('🔧 Initializing external services...');

  try {
    // Initialize Firebase (required)
    await firebaseService.initialize();
    serviceStatus.firebase = true;
    logger.info('✅ Firebase service initialized');

    // Initialize Supabase (optional)
    try {
      await supabaseService.initialize();
      serviceStatus.supabase = true;
      logger.info('✅ Supabase service initialized');
    } catch (error) {
      logger.warn('⚠️ Supabase initialization failed:', error.message);
    }

    // Initialize AI services (optional)
    try {
      await aiService.initialize();
      serviceStatus.ai = true;
      logger.info('✅ AI services initialized');
    } catch (error) {
      logger.warn('⚠️ AI services initialization failed:', error.message);
    }

    // Initialize caching service
    await cachingService.initialize();
    serviceStatus.cache = true;
    logger.info('✅ Caching service initialized');

    logger.info('🎉 Service initialization completed');
    
    // Log service status summary
    const activeServices = Object.entries(serviceStatus)
      .filter(([, status]) => status)
      .map(([name]) => name);
    
    logger.info(`📊 Active services: ${activeServices.join(', ')}`);

    return serviceStatus;

  } catch (error) {
    logger.error('❌ Service initialization failed:', error);
    throw error;
  }
}

/**
 * Get current service status
 */
function getServiceStatus() {
  return { ...serviceStatus };
}

/**
 * Health check for all services
 */
async function checkServiceHealth() {
  const health = {};

  // Check Firebase
  try {
    health.firebase = await firebaseService.healthCheck();
  } catch (error) {
    health.firebase = { status: 'unhealthy', error: error.message };
  }

  // Check Supabase
  if (serviceStatus.supabase) {
    try {
      health.supabase = await supabaseService.healthCheck();
    } catch (error) {
      health.supabase = { status: 'unhealthy', error: error.message };
    }
  } else {
    health.supabase = { status: 'disabled', message: 'Service not initialized' };
  }

  // Check AI services
  if (serviceStatus.ai) {
    try {
      health.ai = await aiService.healthCheck();
    } catch (error) {
      health.ai = { status: 'unhealthy', error: error.message };
    }
  } else {
    health.ai = { status: 'disabled', message: 'Service not initialized' };
  }

  // Check cache
  try {
    health.cache = await cachingService.healthCheck();
  } catch (error) {
    health.cache = { status: 'unhealthy', error: error.message };
  }

  return health;
}

/**
 * Graceful shutdown of all services
 */
async function shutdownServices() {
  logger.info('🛑 Shutting down services...');

  const shutdownPromises = [];

  if (serviceStatus.firebase) {
    shutdownPromises.push(
      firebaseService.shutdown().catch(error => 
        logger.error('Firebase shutdown error:', error)
      )
    );
  }

  if (serviceStatus.supabase) {
    shutdownPromises.push(
      supabaseService.shutdown().catch(error => 
        logger.error('Supabase shutdown error:', error)
      )
    );
  }

  if (serviceStatus.ai) {
    shutdownPromises.push(
      aiService.shutdown().catch(error => 
        logger.error('AI services shutdown error:', error)
      )
    );
  }

  if (serviceStatus.cache) {
    shutdownPromises.push(
      cachingService.shutdown().catch(error => 
        logger.error('Cache shutdown error:', error)
      )
    );
  }

  await Promise.allSettled(shutdownPromises);
  logger.info('✅ All services shutdown completed');
}

module.exports = {
  initializeServices,
  getServiceStatus,
  checkServiceHealth,
  shutdownServices,
  // Export individual service instances
  firebase: firebaseService,
  supabase: supabaseService,
  ai: aiService,
  cache: cachingService
};