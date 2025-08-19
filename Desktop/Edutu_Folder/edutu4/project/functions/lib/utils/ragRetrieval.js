"use strict";
/**
 * Enhanced RAG Context Retrieval Utilities for Edutu AI Chat
 * Retrieves user profile, scholarships, chat history, and relevant context for AI responses
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
exports.getUserProfile = getUserProfile;
exports.getUserGoals = getUserGoals;
exports.getRelevantScholarships = getRelevantScholarships;
exports.getChatHistory = getChatHistory;
exports.saveChatMessage = saveChatMessage;
exports.buildRAGContext = buildRAGContext;
exports.getBasicContext = getBasicContext;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const db = admin.firestore();
/**
 * Retrieve comprehensive user profile
 */
async function getUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.warn(`User profile not found for userId: ${userId}`);
            return null;
        }
        const userData = userDoc.data();
        return Object.assign({ uid: userId }, userData);
    }
    catch (error) {
        console.error('Error retrieving user profile:', error);
        throw new functions.https.HttpsError('internal', 'Failed to retrieve user profile');
    }
}
/**
 * Retrieve user's active goals
 */
async function getUserGoals(userId) {
    try {
        const goalsSnapshot = await db
            .collection('goals')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        return goalsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        console.error('Error retrieving user goals:', error);
        return []; // Non-critical, return empty array
    }
}
/**
 * Retrieve relevant scholarships based on user profile and message content
 */
async function getRelevantScholarships(userProfile, messageContent, limit = 10) {
    try {
        let query = db.collection('scholarships')
            .orderBy('createdAt', 'desc')
            .limit(limit * 2); // Get more to filter
        const scholarshipsSnapshot = await query.get();
        const allScholarships = scholarshipsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Score and filter scholarships based on relevance
        const scoredScholarships = allScholarships
            .map(scholarship => ({
            scholarship,
            score: calculateScholarshipRelevance(scholarship, userProfile, messageContent)
        }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.scholarship);
        console.log(`Retrieved ${scoredScholarships.length} relevant scholarships for user ${userProfile === null || userProfile === void 0 ? void 0 : userProfile.uid}`);
        return scoredScholarships;
    }
    catch (error) {
        console.error('Error retrieving scholarships:', error);
        return []; // Non-critical, return empty array
    }
}
/**
 * Calculate scholarship relevance score based on user profile and message
 */
function calculateScholarshipRelevance(scholarship, userProfile, messageContent) {
    let score = 1; // Base score
    const messageLower = messageContent.toLowerCase();
    const scholarshipText = [
        scholarship.title,
        scholarship.summary,
        scholarship.description,
        scholarship.category,
        ...(scholarship.tags || [])
    ].join(' ').toLowerCase();
    // Keyword matching from message
    const messageKeywords = extractKeywords(messageLower);
    for (const keyword of messageKeywords) {
        if (scholarshipText.includes(keyword)) {
            score += 2;
        }
    }
    // User profile matching
    if (userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) {
        const prefs = userProfile.preferences;
        // Career interests matching
        if (prefs.careerInterests) {
            for (const interest of prefs.careerInterests) {
                if (scholarshipText.includes(interest.toLowerCase())) {
                    score += 3;
                }
            }
        }
        // Education level matching
        if (prefs.educationLevel) {
            const educationKeywords = getEducationKeywords(prefs.educationLevel);
            for (const keyword of educationKeywords) {
                if (scholarshipText.includes(keyword)) {
                    score += 2;
                }
            }
        }
        // Skills matching
        if (prefs.currentSkills) {
            for (const skill of prefs.currentSkills) {
                if (scholarshipText.includes(skill.toLowerCase())) {
                    score += 2;
                }
            }
        }
    }
    // Category boost for common requests
    if (messageLower.includes('scholarship') && scholarship.category.toLowerCase().includes('scholarship')) {
        score += 1;
    }
    if (messageLower.includes('tech') && scholarship.category.toLowerCase().includes('tech')) {
        score += 1;
    }
    if (messageLower.includes('leadership') && scholarship.category.toLowerCase().includes('leadership')) {
        score += 1;
    }
    // Recency bonus (newer scholarships get slight boost)
    const daysSinceCreated = (Date.now() - scholarship.createdAt.toMillis()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 30) {
        score += 0.5;
    }
    return score;
}
/**
 * Extract keywords from message for scholarship matching
 */
function extractKeywords(message) {
    // Common keywords that indicate scholarship interests
    const scholarshipKeywords = [
        'computer science', 'cs', 'programming', 'software', 'tech', 'technology',
        'engineering', 'medicine', 'healthcare', 'business', 'finance', 'marketing',
        'art', 'design', 'education', 'teaching', 'research', 'science',
        'leadership', 'entrepreneurship', 'startup', 'innovation',
        'africa', 'global', 'international', 'study abroad',
        'undergraduate', 'graduate', 'masters', 'phd', 'doctorate',
        'scholarship', 'grant', 'funding', 'fellowship', 'internship'
    ];
    return scholarshipKeywords.filter(keyword => message.includes(keyword));
}
/**
 * Get education-level related keywords
 */
function getEducationKeywords(educationLevel) {
    const level = educationLevel.toLowerCase();
    if (level.includes('high school') || level.includes('secondary')) {
        return ['undergraduate', 'bachelor', 'first year', 'freshman'];
    }
    else if (level.includes('undergraduate') || level.includes('bachelor')) {
        return ['undergraduate', 'bachelor', 'graduate', 'masters'];
    }
    else if (level.includes('graduate') || level.includes('master')) {
        return ['graduate', 'masters', 'phd', 'doctorate', 'postgraduate'];
    }
    else if (level.includes('phd') || level.includes('doctorate')) {
        return ['phd', 'doctorate', 'postdoc', 'research'];
    }
    return [];
}
/**
 * Retrieve chat history for context
 */
async function getChatHistory(userId, sessionId, limit = 15) {
    try {
        let query = db
            .collection('chat_history')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(limit);
        if (sessionId) {
            query = query.where('sessionId', '==', sessionId);
        }
        const historySnapshot = await query.get();
        return historySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        console.error('Error retrieving chat history:', error);
        return []; // Non-critical, return empty array
    }
}
/**
 * Save chat message to history
 */
async function saveChatMessage(userId, message, response, sessionId, context) {
    try {
        await db.collection('chat_history').add({
            userId,
            message,
            response,
            sessionId: sessionId || generateSessionId(),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            context: context || {}
        });
    }
    catch (error) {
        console.error('Error saving chat message:', error);
        // Non-critical, don't throw
    }
}
/**
 * Generate unique session ID
 */
function generateSessionId() {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
/**
 * Build comprehensive RAG context for AI prompt
 */
async function buildRAGContext(userId, messageContent, sessionId) {
    try {
        // Retrieve all context in parallel for performance
        const [userProfile, userGoals, chatHistory] = await Promise.all([
            getUserProfile(userId),
            getUserGoals(userId),
            getChatHistory(userId, sessionId, 15)
        ]);
        // Get relevant scholarships based on user profile and message
        const relevantScholarships = await getRelevantScholarships(userProfile, messageContent, 10);
        // Build context summary
        const contextSummary = generateContextSummary(userProfile, userGoals, relevantScholarships, chatHistory);
        return {
            userProfile,
            userGoals,
            relevantScholarships,
            chatHistory,
            contextSummary
        };
    }
    catch (error) {
        console.error('Error building RAG context:', error);
        throw new functions.https.HttpsError('internal', 'Failed to build context for AI response');
    }
}
/**
 * Generate a concise context summary for the AI prompt
 */
function generateContextSummary(userProfile, userGoals, scholarships, chatHistory) {
    var _a, _b;
    let summary = '';
    // User info
    if (userProfile) {
        summary += `User: ${userProfile.name}`;
        if (userProfile.age)
            summary += `, age ${userProfile.age}`;
        if (userProfile.preferences) {
            const prefs = userProfile.preferences;
            if (prefs.educationLevel)
                summary += `, ${prefs.educationLevel}`;
            if ((_a = prefs.careerInterests) === null || _a === void 0 ? void 0 : _a.length)
                summary += `, interested in ${prefs.careerInterests.slice(0, 3).join(', ')}`;
            if ((_b = prefs.currentSkills) === null || _b === void 0 ? void 0 : _b.length)
                summary += `, skills: ${prefs.currentSkills.slice(0, 3).join(', ')}`;
        }
        summary += '\n\n';
    }
    // Active goals
    if (userGoals.length > 0) {
        summary += `Current Goals:\n`;
        userGoals.slice(0, 3).forEach(goal => {
            summary += `- ${goal.title}`;
            if (goal.description)
                summary += `: ${goal.description}`;
            summary += '\n';
        });
        summary += '\n';
    }
    // Recent chat context
    if (chatHistory.length > 0) {
        summary += `Recent Conversation Context:\n`;
        chatHistory.slice(-3).forEach(chat => {
            summary += `User: ${chat.message.substring(0, 100)}...\n`;
            summary += `AI: ${chat.response.substring(0, 100)}...\n`;
        });
        summary += '\n';
    }
    // Relevant scholarships
    if (scholarships.length > 0) {
        summary += `Relevant Opportunities:\n`;
        scholarships.slice(0, 5).forEach(scholarship => {
            summary += `- ${scholarship.title} (${scholarship.provider})`;
            if (scholarship.category)
                summary += ` - ${scholarship.category}`;
            if (scholarship.deadline) {
                const deadline = scholarship.deadline.toDate();
                summary += ` - Deadline: ${deadline.toLocaleDateString()}`;
            }
            summary += '\n';
        });
    }
    return summary.trim();
}
/**
 * Get basic context for users without full profiles
 */
function getBasicContext() {
    return `You are Edutu, an AI opportunity coach for young African professionals aged 16-30. 
Your role is to help with scholarships, career guidance, skill development, and educational opportunities.
Focus on opportunities available in Africa or globally accessible to African youth.
Be encouraging, specific, and actionable in your responses.`;
}
//# sourceMappingURL=ragRetrieval.js.map