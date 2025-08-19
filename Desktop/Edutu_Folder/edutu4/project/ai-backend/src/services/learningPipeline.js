/**
 * Learning Pipeline Service
 * Implements the self-improving learning loop for continuous AI enhancement
 */

const logger = require('../utils/logger');
const {
  getUserActivityHistory,
  getUserProfile,
  updateUserPreferences,
  getFirestore,
} = require('../config/firebase');
const {
  generateEmbeddings,
} = require('../config/ai');
const {
  storeUserPreferencesEmbedding,
  getUserRecommendations,
  findSimilarScholarships,
} = require('../config/supabase');

/**
 * Process user activity for learning improvements
 */
async function processUserActivity(userId, activityType, details) {
  try {
    logger.debug(`Processing activity for learning loop: ${activityType} for user ${userId}`);

    switch (activityType) {
      case 'opportunity_clicked':
      case 'opportunity_saved':
        await updateOpportunityEngagement(userId, details, activityType);
        break;
        
      case 'opportunity_ignored':
        await updateOpportunityPreferences(userId, details, 'negative');
        break;
        
      case 'roadmap_task_completed':
        await updateTaskCompletionPatterns(userId, details);
        break;
        
      case 'roadmap_task_delayed':
        await updateTaskDifficultyAssessment(userId, details);
        break;
        
      case 'chat_response_rated':
        await updateChatResponseQuality(userId, details);
        break;
        
      case 'search_performed':
        await updateSearchPatterns(userId, details);
        break;
        
      case 'feedback_provided':
        await processFeedbackForLearning(userId, details);
        break;
        
      default:
        logger.debug(`No specific learning handler for activity type: ${activityType}`);
    }

  } catch (error) {
    logger.error('Error in learning pipeline:', error);
    // Don't throw - learning failures shouldn't break the main flow
  }
}

/**
 * Update opportunity engagement patterns
 */
async function updateOpportunityEngagement(userId, details, activityType) {
  try {
    const { opportunityId, opportunityTitle, opportunityCategory } = details;
    
    // Get current user preferences
    const userProfile = await getUserProfile(userId);
    const preferences = userProfile.preferences || {};
    
    // Update engagement patterns
    const engagementPatterns = preferences.engagementPatterns || {};
    
    // Track category preferences
    const categoryEngagement = engagementPatterns.categories || {};
    if (opportunityCategory) {
      categoryEngagement[opportunityCategory] = (categoryEngagement[opportunityCategory] || 0) + 1;
    }
    
    // Track interaction types
    const interactionTypes = engagementPatterns.interactions || {};
    interactionTypes[activityType] = (interactionTypes[activityType] || 0) + 1;
    
    // Track specific opportunities
    const opportunityEngagement = engagementPatterns.opportunities || {};
    opportunityEngagement[opportunityId] = {
      title: opportunityTitle,
      category: opportunityCategory,
      interactions: (opportunityEngagement[opportunityId]?.interactions || 0) + 1,
      lastInteraction: new Date().toISOString(),
      type: activityType
    };
    
    // Update user preferences
    await updateUserPreferences(userId, {
      ...preferences,
      engagementPatterns: {
        categories: categoryEngagement,
        interactions: interactionTypes,
        opportunities: opportunityEngagement,
        lastUpdated: new Date().toISOString()
      }
    });
    
    // Trigger embedding update for improved recommendations
    await updateUserEmbeddingsFromEngagement(userId, preferences);
    
    logger.debug(`Updated engagement patterns for user ${userId}`);
    
  } catch (error) {
    logger.error('Error updating opportunity engagement:', error);
  }
}

/**
 * Update opportunity preferences based on negative feedback
 */
async function updateOpportunityPreferences(userId, details, sentiment) {
  try {
    const { opportunityId, opportunityTitle, opportunityCategory, ignoreReason } = details;
    
    const userProfile = await getUserProfile(userId);
    const preferences = userProfile.preferences || {};
    
    // Track negative preferences to avoid similar recommendations
    const negativePreferences = preferences.negativePreferences || {};
    
    if (sentiment === 'negative') {
      // Track ignored categories
      const ignoredCategories = negativePreferences.categories || {};
      if (opportunityCategory) {
        ignoredCategories[opportunityCategory] = (ignoredCategories[opportunityCategory] || 0) + 1;
      }
      
      // Track ignore reasons
      const ignoreReasons = negativePreferences.reasons || {};
      if (ignoreReason) {
        ignoreReasons[ignoreReason] = (ignoreReasons[ignoreReason] || 0) + 1;
      }
      
      // Track specific ignored opportunities
      const ignoredOpportunities = negativePreferences.opportunities || {};
      ignoredOpportunities[opportunityId] = {
        title: opportunityTitle,
        category: opportunityCategory,
        reason: ignoreReason,
        timestamp: new Date().toISOString()
      };
      
      await updateUserPreferences(userId, {
        ...preferences,
        negativePreferences: {
          categories: ignoredCategories,
          reasons: ignoreReasons,
          opportunities: ignoredOpportunities,
          lastUpdated: new Date().toISOString()
        }
      });
    }
    
    logger.debug(`Updated negative preferences for user ${userId}`);
    
  } catch (error) {
    logger.error('Error updating opportunity preferences:', error);
  }
}

/**
 * Update task completion patterns for better roadmap generation
 */
async function updateTaskCompletionPatterns(userId, details) {
  try {
    const { taskId, taskTitle, completionTime, difficultyRating } = details;
    
    const userProfile = await getUserProfile(userId);
    const preferences = userProfile.preferences || {};
    
    // Track completion patterns
    const completionPatterns = preferences.completionPatterns || {};
    
    // Average completion times by task type
    const taskTypes = completionPatterns.taskTypes || {};
    const taskCategory = extractTaskCategory(taskTitle);
    
    if (taskCategory && completionTime) {
      const existing = taskTypes[taskCategory] || { totalTime: 0, count: 0, avgTime: 0 };
      const newTotal = existing.totalTime + completionTime;
      const newCount = existing.count + 1;
      
      taskTypes[taskCategory] = {
        totalTime: newTotal,
        count: newCount,
        avgTime: Math.round(newTotal / newCount),
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Track difficulty ratings
    if (difficultyRating) {
      const difficultyPatterns = completionPatterns.difficulty || {};
      difficultyPatterns[taskCategory || 'general'] = {
        avgDifficulty: difficultyRating,
        lastRating: new Date().toISOString()
      };
    }
    
    await updateUserPreferences(userId, {
      ...preferences,
      completionPatterns: {
        taskTypes,
        difficulty: completionPatterns.difficulty || {},
        lastUpdated: new Date().toISOString()
      }
    });
    
    logger.debug(`Updated completion patterns for user ${userId}`);
    
  } catch (error) {
    logger.error('Error updating task completion patterns:', error);
  }
}

/**
 * Update task difficulty assessment for roadmap optimization
 */
async function updateTaskDifficultyAssessment(userId, details) {
  try {
    const { taskId, taskTitle, delayReason } = details;
    
    const userProfile = await getUserProfile(userId);
    const preferences = userProfile.preferences || {};
    
    // Track difficulty indicators
    const difficultyAssessment = preferences.difficultyAssessment || {};
    const taskCategory = extractTaskCategory(taskTitle);
    
    // Count delays by category and reason
    const delayPatterns = difficultyAssessment.delays || {};
    if (taskCategory) {
      const categoryDelays = delayPatterns[taskCategory] || { count: 0, reasons: {} };
      categoryDelays.count += 1;
      
      if (delayReason) {
        categoryDelays.reasons[delayReason] = (categoryDelays.reasons[delayReason] || 0) + 1;
      }
      
      delayPatterns[taskCategory] = categoryDelays;
    }
    
    await updateUserPreferences(userId, {
      ...preferences,
      difficultyAssessment: {
        delays: delayPatterns,
        lastUpdated: new Date().toISOString()
      }
    });
    
    logger.debug(`Updated difficulty assessment for user ${userId}`);
    
  } catch (error) {
    logger.error('Error updating task difficulty assessment:', error);
  }
}

/**
 * Update chat response quality for better AI responses
 */
async function updateChatResponseQuality(userId, details) {
  try {
    const { responseId, responseRating, responseHelpfulness } = details;
    
    const db = getFirestore();
    
    // Store chat quality feedback for AI model improvement
    await db.collection('chatQualityFeedback').add({
      userId,
      responseId,
      rating: responseRating,
      helpfulness: responseHelpfulness,
      timestamp: new Date(),
      processed: false
    });
    
    logger.debug(`Stored chat quality feedback for user ${userId}`);
    
  } catch (error) {
    logger.error('Error updating chat response quality:', error);
  }
}

/**
 * Update search patterns for better content discovery
 */
async function updateSearchPatterns(userId, details) {
  try {
    const { searchQuery, searchResults } = details;
    
    const userProfile = await getUserProfile(userId);
    const preferences = userProfile.preferences || {};
    
    // Track search patterns
    const searchPatterns = preferences.searchPatterns || {};
    const queries = searchPatterns.queries || {};
    
    // Extract keywords from search query
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    keywords.forEach(keyword => {
      queries[keyword] = {
        count: (queries[keyword]?.count || 0) + 1,
        lastSearched: new Date().toISOString(),
        avgResults: searchResults
      };
    });
    
    await updateUserPreferences(userId, {
      ...preferences,
      searchPatterns: {
        queries,
        lastUpdated: new Date().toISOString()
      }
    });
    
    logger.debug(`Updated search patterns for user ${userId}`);
    
  } catch (error) {
    logger.error('Error updating search patterns:', error);
  }
}

/**
 * Process feedback for general learning improvements
 */
async function processFeedbackForLearning(userId, details) {
  try {
    const { rating, comment, suggestions, type } = details;
    
    const db = getFirestore();
    
    // Store general feedback for system improvement
    await db.collection('systemFeedback').add({
      userId,
      rating,
      comment,
      suggestions,
      type,
      timestamp: new Date(),
      processed: false
    });
    
    logger.debug(`Processed feedback for learning from user ${userId}`);
    
  } catch (error) {
    logger.error('Error processing feedback for learning:', error);
  }
}

/**
 * Update user embeddings based on engagement patterns
 */
async function updateUserEmbeddingsFromEngagement(userId, preferences) {
  try {
    // Create enhanced text representation based on engagement
    const engagementPatterns = preferences.engagementPatterns || {};
    const categories = engagementPatterns.categories || {};
    
    // Weight categories by engagement level
    const weightedInterests = Object.entries(categories)
      .sort(([,a], [,b]) => b - a) // Sort by engagement count
      .slice(0, 5) // Top 5 categories
      .map(([category, count]) => `${category} (${count} interactions)`)
      .join(' ');
    
    // Combine with existing preferences
    const existingText = [
      preferences.educationLevel,
      preferences.careerInterests?.join(' '),
      preferences.learningStyle,
      preferences.timeAvailability,
      preferences.currentSkills?.join(' '),
      preferences.careerGoals?.join(' '),
      preferences.preferredLocations?.join(' ')
    ].filter(Boolean).join(' ');
    
    const enhancedText = `${existingText} ${weightedInterests}`.trim();
    
    if (enhancedText) {
      // Generate new embedding
      const embedding = await generateEmbeddings(enhancedText);
      
      // Store updated embedding
      await storeUserPreferencesEmbedding(userId, embedding, preferences);
      
      logger.debug(`Updated user embedding with engagement data for user ${userId}`);
    }
    
  } catch (error) {
    logger.error('Error updating user embeddings from engagement:', error);
  }
}

/**
 * Run daily learning loop optimization
 */
async function runDailyLearningLoop() {
  try {
    logger.info('Starting daily learning loop optimization');
    
    const db = getFirestore();
    
    // Process unprocessed feedback
    await processPendingFeedback();
    
    // Update recommendation models based on engagement
    await updateRecommendationModels();
    
    // Optimize chat responses based on ratings
    await optimizeChatResponses();
    
    // Generate insights for system improvement
    await generateLearningInsights();
    
    logger.info('Daily learning loop optimization completed');
    
  } catch (error) {
    logger.error('Error in daily learning loop:', error);
  }
}

/**
 * Process pending feedback for model improvement
 */
async function processPendingFeedback() {
  try {
    const db = getFirestore();
    
    // Get unprocessed recommendation feedback
    const feedbackSnapshot = await db.collection('recommendationFeedback')
      .where('processed', '==', false)
      .limit(100)
      .get();
    
    const batch = db.batch();
    
    for (const doc of feedbackSnapshot.docs) {
      const feedback = doc.data();
      
      // Process feedback for learning
      await processRecommendationFeedback(feedback);
      
      // Mark as processed
      batch.update(doc.ref, { processed: true, processedAt: new Date() });
    }
    
    await batch.commit();
    
    logger.info(`Processed ${feedbackSnapshot.docs.length} feedback items`);
    
  } catch (error) {
    logger.error('Error processing pending feedback:', error);
  }
}

/**
 * Update recommendation models based on engagement data
 */
async function updateRecommendationModels() {
  try {
    // This would implement more sophisticated ML model updates
    // For now, we'll update similarity thresholds based on feedback
    
    const db = getFirestore();
    
    // Analyze feedback patterns
    const feedbackSnapshot = await db.collection('recommendationFeedback')
      .where('processedAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .get();
    
    let helpfulCount = 0;
    let totalCount = 0;
    
    feedbackSnapshot.docs.forEach(doc => {
      const feedback = doc.data();
      totalCount++;
      if (feedback.feedback === 'helpful') {
        helpfulCount++;
      }
    });
    
    const helpfulRatio = totalCount > 0 ? helpfulCount / totalCount : 0.7;
    
    // Store updated model parameters
    await db.collection('systemConfig').doc('recommendations').set({
      similarityThreshold: Math.max(0.6, helpfulRatio * 0.9),
      helpfulRatio,
      lastUpdated: new Date(),
      sampleSize: totalCount
    }, { merge: true });
    
    logger.info(`Updated recommendation model parameters: threshold=${Math.max(0.6, helpfulRatio * 0.9)}, ratio=${helpfulRatio}`);
    
  } catch (error) {
    logger.error('Error updating recommendation models:', error);
  }
}

/**
 * Optimize chat responses based on ratings
 */
async function optimizeChatResponses() {
  try {
    const db = getFirestore();
    
    // Get recent chat quality feedback
    const qualitySnapshot = await db.collection('chatQualityFeedback')
      .where('processed', '==', false)
      .limit(50)
      .get();
    
    // Analyze patterns in highly-rated vs poorly-rated responses
    const highRated = [];
    const lowRated = [];
    
    qualitySnapshot.docs.forEach(doc => {
      const feedback = doc.data();
      if (feedback.rating >= 4) {
        highRated.push(feedback);
      } else if (feedback.rating <= 2) {
        lowRated.push(feedback);
      }
    });
    
    // Store optimization insights
    await db.collection('systemConfig').doc('chatOptimization').set({
      highRatedCount: highRated.length,
      lowRatedCount: lowRated.length,
      avgRating: qualitySnapshot.docs.reduce((sum, doc) => sum + doc.data().rating, 0) / qualitySnapshot.docs.length,
      lastOptimized: new Date()
    }, { merge: true });
    
    // Mark feedback as processed
    const batch = db.batch();
    qualitySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { processed: true, processedAt: new Date() });
    });
    await batch.commit();
    
    logger.info(`Optimized chat responses based on ${qualitySnapshot.docs.length} feedback items`);
    
  } catch (error) {
    logger.error('Error optimizing chat responses:', error);
  }
}

/**
 * Generate learning insights for system improvement
 */
async function generateLearningInsights() {
  try {
    const db = getFirestore();
    
    // Generate daily insights report
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    
    // Get activity counts
    const activitySnapshot = await db.collection('userActivity')
      .where('timestamp', '>=', yesterday)
      .get();
    
    const activityCounts = {};
    activitySnapshot.docs.forEach(doc => {
      const activity = doc.data();
      activityCounts[activity.activityType] = (activityCounts[activity.activityType] || 0) + 1;
    });
    
    // Generate insights
    const insights = {
      date: now.toISOString().split('T')[0],
      totalActivities: activitySnapshot.docs.length,
      activityBreakdown: activityCounts,
      topActivities: Object.entries(activityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      generatedAt: new Date()
    };
    
    // Store insights
    await db.collection('learningInsights').add(insights);
    
    logger.info(`Generated learning insights: ${insights.totalActivities} activities processed`);
    
  } catch (error) {
    logger.error('Error generating learning insights:', error);
  }
}

/**
 * Helper function to extract task category from title
 */
function extractTaskCategory(taskTitle) {
  if (!taskTitle) return 'general';
  
  const title = taskTitle.toLowerCase();
  
  if (title.includes('research') || title.includes('study')) return 'research';
  if (title.includes('write') || title.includes('essay') || title.includes('statement')) return 'writing';
  if (title.includes('apply') || title.includes('application') || title.includes('submit')) return 'application';
  if (title.includes('document') || title.includes('prepare')) return 'preparation';
  if (title.includes('review') || title.includes('check')) return 'review';
  
  return 'general';
}

/**
 * Helper function to process recommendation feedback
 */
async function processRecommendationFeedback(feedback) {
  try {
    // This would update ML models based on feedback
    // For now, we'll just log the pattern
    logger.debug(`Processing recommendation feedback: ${feedback.feedback} for ${feedback.recommendationId}`);
  } catch (error) {
    logger.error('Error processing recommendation feedback:', error);
  }
}

module.exports = {
  processUserActivity,
  runDailyLearningLoop,
  updateUserEmbeddingsFromEngagement,
  processPendingFeedback,
  updateRecommendationModels,
  optimizeChatResponses,
  generateLearningInsights,
};