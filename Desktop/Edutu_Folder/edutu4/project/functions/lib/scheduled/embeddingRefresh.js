"use strict";
/**
 * Embedding Refresh Scheduled Function
 * Runs daily to refresh embeddings and improve recommendations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingRefreshScheduled = embeddingRefreshScheduled;
const admin = __importStar(require("firebase-admin"));
const aiService_1 = require("../services/aiService");
const supabase_1 = require("../utils/supabase");
async function embeddingRefreshScheduled(context) {
    var _a, _b;
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
                const scholarship = Object.assign({ id: scholarshipDoc.id }, scholarshipData);
                // Generate embedding text
                const embeddingText = `${scholarshipData.title || ''} ${scholarshipData.summary || ''} ${scholarshipData.requirements || ''} ${scholarshipData.benefits || ''}`;
                // Generate embedding
                const embedding = await (0, aiService_1.generateEmbeddings)(embeddingText);
                // Store in Supabase vector database
                await (0, supabase_1.storeScholarshipEmbedding)(scholarshipDoc.id, embedding, scholarship);
                processedScholarships++;
                console.log(`✅ Updated embedding for scholarship: ${scholarshipData.title || scholarshipDoc.id}`);
                // Add small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
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
                const user = Object.assign({ id: userDoc.id }, userData);
                if (!userData.preferences) {
                    console.log(`⚠️ Skipping user ${userDoc.id} - no preferences`);
                    continue;
                }
                // Generate user preferences text for embedding
                const prefs = userData.preferences;
                const preferencesText = `
          Education Level: ${prefs.educationLevel || 'Not specified'}
          Career Interests: ${((_a = prefs.careerInterests) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'Not specified'}
          Learning Style: ${prefs.learningStyle || 'Not specified'}
          Time Availability: ${prefs.timeAvailability || 'Not specified'}
          Goals: ${prefs.currentGoals || 'Not specified'}
          Skills: ${((_b = prefs.skillsToImprove) === null || _b === void 0 ? void 0 : _b.join(', ')) || 'Not specified'}
          Field of Study: ${prefs.fieldOfStudy || 'Not specified'}
          Career Stage: ${prefs.careerStage || 'Not specified'}
          Budget Range: ${prefs.budgetRange || 'Not specified'}
        `.trim();
                // Generate embedding
                const embedding = await (0, aiService_1.generateEmbeddings)(preferencesText);
                // Store user preferences embedding
                await (0, supabase_1.storeUserPreferencesEmbedding)(userDoc.id, embedding, user);
                // Update user recommendations based on new embeddings
                await (0, supabase_1.updateUserRecommendations)(userDoc.id);
                processedUsers++;
                console.log(`✅ Updated embeddings and recommendations for user: ${userDoc.id}`);
                // Add delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            catch (error) {
                console.error(`❌ Error processing user ${userDoc.id}:`, error);
                errors++;
            }
        }
        // Step 3: Clean up old embeddings (optional)
        console.log('🧹 Cleaning up old embeddings...');
        await cleanupOldEmbeddings();
        // Step 4: Generate system statistics
        const stats = await (0, supabase_1.getEmbeddingStats)();
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
    }
    catch (error) {
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
        }
        catch (logError) {
            console.error('Failed to log embedding refresh error:', logError);
        }
    }
}
/**
 * Clean up embeddings older than 30 days that are no longer referenced
 */
async function cleanupOldEmbeddings() {
    try {
        // This would typically involve cleaning up old embeddings in Supabase
        // Implementation depends on your Supabase schema and cleanup requirements
        console.log('🧹 Cleanup completed (placeholder implementation)');
    }
    catch (error) {
        console.error('Error during embedding cleanup:', error);
    }
}
/**
 * Log embedding refresh results to Firestore
 */
async function logEmbeddingRefreshResults(db, results) {
    try {
        await db.collection('embeddingLogs').add(Object.assign(Object.assign({}, results), { status: 'success' }));
    }
    catch (error) {
        console.error('Failed to log embedding refresh results:', error);
    }
}
//# sourceMappingURL=embeddingRefresh.js.map