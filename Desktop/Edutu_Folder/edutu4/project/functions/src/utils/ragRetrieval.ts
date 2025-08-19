/**
 * Enhanced RAG Context Retrieval Utilities for Edutu AI Chat
 * Retrieves user profile, scholarships, chat history, and relevant context for AI responses
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age?: number;
  preferences?: {
    educationLevel?: string;
    careerInterests?: string[];
    learningStyle?: string;
    currentSkills?: string[];
    careerGoals?: string[];
    timeAvailability?: string;
    preferredLocations?: string[];
  };
  onboardingCompleted?: boolean;
  createdAt?: admin.firestore.Timestamp;
}

export interface UserGoal {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'active' | 'completed' | 'paused';
  progress?: number;
  targetDate?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

export interface Scholarship {
  id: string;
  title: string;
  summary?: string;
  description?: string;
  provider: string;
  category: string;
  deadline?: admin.firestore.Timestamp;
  amount?: string;
  requirements?: string;
  benefits?: string;
  eligibility?: string;
  tags?: string[];
  location?: string;
  createdAt: admin.firestore.Timestamp;
}

export interface ChatMessage {
  id: string;
  message: string;
  response: string;
  sessionId?: string;
  timestamp: admin.firestore.Timestamp;
  context?: any;
}

export interface RAGContext {
  userProfile: UserProfile | null;
  userGoals: UserGoal[];
  relevantScholarships: Scholarship[];
  chatHistory: ChatMessage[];
  contextSummary: string;
}

/**
 * Retrieve comprehensive user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.warn(`User profile not found for userId: ${userId}`);
      return null;
    }

    const userData = userDoc.data() as UserProfile;
    return {
      uid: userId,
      ...userData
    };
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to retrieve user profile');
  }
}

/**
 * Retrieve user's active goals
 */
export async function getUserGoals(userId: string): Promise<UserGoal[]> {
  try {
    const goalsSnapshot = await db
      .collection('goals')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    return goalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserGoal));
  } catch (error) {
    console.error('Error retrieving user goals:', error);
    return []; // Non-critical, return empty array
  }
}

/**
 * Retrieve relevant scholarships based on user profile and message content
 */
export async function getRelevantScholarships(
  userProfile: UserProfile | null, 
  messageContent: string,
  limit: number = 10
): Promise<Scholarship[]> {
  try {
    let query = db.collection('scholarships')
      .orderBy('createdAt', 'desc')
      .limit(limit * 2); // Get more to filter

    const scholarshipsSnapshot = await query.get();
    const allScholarships = scholarshipsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Scholarship));

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

    console.log(`Retrieved ${scoredScholarships.length} relevant scholarships for user ${userProfile?.uid}`);
    return scoredScholarships;
  } catch (error) {
    console.error('Error retrieving scholarships:', error);
    return []; // Non-critical, return empty array
  }
}

/**
 * Calculate scholarship relevance score based on user profile and message
 */
function calculateScholarshipRelevance(
  scholarship: Scholarship,
  userProfile: UserProfile | null,
  messageContent: string
): number {
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
  if (userProfile?.preferences) {
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
function extractKeywords(message: string): string[] {
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
function getEducationKeywords(educationLevel: string): string[] {
  const level = educationLevel.toLowerCase();
  
  if (level.includes('high school') || level.includes('secondary')) {
    return ['undergraduate', 'bachelor', 'first year', 'freshman'];
  } else if (level.includes('undergraduate') || level.includes('bachelor')) {
    return ['undergraduate', 'bachelor', 'graduate', 'masters'];
  } else if (level.includes('graduate') || level.includes('master')) {
    return ['graduate', 'masters', 'phd', 'doctorate', 'postgraduate'];
  } else if (level.includes('phd') || level.includes('doctorate')) {
    return ['phd', 'doctorate', 'postdoc', 'research'];
  }
  
  return [];
}

/**
 * Retrieve chat history for context
 */
export async function getChatHistory(
  userId: string, 
  sessionId?: string, 
  limit: number = 15
): Promise<ChatMessage[]> {
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
    
    return historySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatMessage));
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return []; // Non-critical, return empty array
  }
}

/**
 * Save chat message to history
 */
export async function saveChatMessage(
  userId: string,
  message: string,
  response: string,
  sessionId?: string,
  context?: any
): Promise<void> {
  try {
    await db.collection('chat_history').add({
      userId,
      message,
      response,
      sessionId: sessionId || generateSessionId(),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      context: context || {}
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    // Non-critical, don't throw
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Build comprehensive RAG context for AI prompt
 */
export async function buildRAGContext(
  userId: string, 
  messageContent: string, 
  sessionId?: string
): Promise<RAGContext> {
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
  } catch (error) {
    console.error('Error building RAG context:', error);
    throw new functions.https.HttpsError('internal', 'Failed to build context for AI response');
  }
}

/**
 * Generate a concise context summary for the AI prompt
 */
function generateContextSummary(
  userProfile: UserProfile | null,
  userGoals: UserGoal[],
  scholarships: Scholarship[],
  chatHistory: ChatMessage[]
): string {
  let summary = '';

  // User info
  if (userProfile) {
    summary += `User: ${userProfile.name}`;
    if (userProfile.age) summary += `, age ${userProfile.age}`;
    
    if (userProfile.preferences) {
      const prefs = userProfile.preferences;
      if (prefs.educationLevel) summary += `, ${prefs.educationLevel}`;
      if (prefs.careerInterests?.length) summary += `, interested in ${prefs.careerInterests.slice(0, 3).join(', ')}`;
      if (prefs.currentSkills?.length) summary += `, skills: ${prefs.currentSkills.slice(0, 3).join(', ')}`;
    }
    summary += '\n\n';
  }

  // Active goals
  if (userGoals.length > 0) {
    summary += `Current Goals:\n`;
    userGoals.slice(0, 3).forEach(goal => {
      summary += `- ${goal.title}`;
      if (goal.description) summary += `: ${goal.description}`;
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
      if (scholarship.category) summary += ` - ${scholarship.category}`;
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
export function getBasicContext(): string {
  return `You are Edutu, an AI opportunity coach for young African professionals aged 16-30. 
Your role is to help with scholarships, career guidance, skill development, and educational opportunities.
Focus on opportunities available in Africa or globally accessible to African youth.
Be encouraging, specific, and actionable in your responses.`;
}