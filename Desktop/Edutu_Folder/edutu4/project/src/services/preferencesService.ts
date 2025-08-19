import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../config/firebase";
import { UserPreferences, UserProfile } from "../types/user";

export const preferencesService = {
  // Save user preferences to Firestore
  async saveUserPreferences(uid: string, preferences: UserPreferences): Promise<void> {
    if (!uid) throw new Error('User ID is required');

    const userRef = doc(db, 'users', uid);
    
    // First, get the existing user data
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User document not found');
    }

    const userData = userSnap.data();
    
    // Update the user document with preferences and onboarding completion
    const updatedData = {
      ...userData,
      preferences: {
        ...preferences,
        completedAt: serverTimestamp(),
        version: '1.0'
      },
      onboardingCompleted: true,
      onboardingCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await updateDoc(userRef, updatedData);
  },

  // Get user preferences from Firestore
  async getUserPreferences(uid: string): Promise<UserPreferences | null> {
    if (!uid) return null;
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.preferences || null;
    }
    
    return null;
  },

  // Get complete user profile including preferences
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        ...userData,
        onboardingCompleted: userData.onboardingCompleted || false,
        onboardingSteps: userData.onboardingSteps || []
      } as UserProfile;
    }
    
    return null;
  },

  // Update specific preference fields
  async updatePreferences(uid: string, updates: Partial<UserPreferences>): Promise<void> {
    if (!uid) throw new Error('User ID is required');

    const userRef = doc(db, 'users', uid);
    
    const updateData = {
      [`preferences`]: {
        ...updates,
        updatedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };

    await updateDoc(userRef, updateData);
  },

  // Mark onboarding as completed
  async completeOnboarding(uid: string): Promise<void> {
    if (!uid) throw new Error('User ID is required');

    const userRef = doc(db, 'users', uid);
    
    await updateDoc(userRef, {
      onboardingCompleted: true,
      onboardingCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  // Generate insights from user preferences (useful for RAG)
  generateUserInsights(preferences: UserPreferences): string[] {
    const insights: string[] = [];

    // Career insights
    if (preferences.careerInterests?.length > 0) {
      insights.push(`Interested in ${preferences.careerInterests.join(', ')} careers`);
    }

    // Learning insights
    if (preferences.learningStyle) {
      insights.push(`Prefers ${preferences.learningStyle.replace('_', ' ')} learning style`);
    }

    if (preferences.timeAvailability) {
      insights.push(`Available for ${preferences.timeAvailability.replace('_', ' ')} per week`);
    }

    // Goal insights
    if (preferences.primaryGoals?.length > 0) {
      insights.push(`Primary goals: ${preferences.primaryGoals.join(', ')}`);
    }

    if (preferences.timelineGoal) {
      insights.push(`Target timeline: ${preferences.timelineGoal.replace('_', ' ')}`);
    }

    // Experience insights
    if (preferences.hasWorkExperience) {
      insights.push(`Has ${preferences.workExperienceType || 'work'} experience`);
    } else {
      insights.push('No prior work experience');
    }

    // Skills insights
    if (preferences.currentSkills?.length > 0) {
      insights.push(`Current skills: ${preferences.currentSkills.join(', ')}`);
    }

    // Location insights
    if (preferences.location) {
      insights.push(`Located in ${preferences.location}`);
    }

    if (preferences.willingToRelocate) {
      insights.push('Open to relocation');
    }

    // Work preference insights
    if (preferences.preferredWorkMode) {
      insights.push(`Prefers ${preferences.preferredWorkMode.replace('_', ' ')} work`);
    }

    // Challenge insights
    if (preferences.biggestChallenges?.length > 0) {
      insights.push(`Main challenges: ${preferences.biggestChallenges.join(', ')}`);
    }

    // Communication insights
    if (preferences.communicationStyle) {
      insights.push(`${preferences.communicationStyle} communication style`);
    }

    if (preferences.wantsMentorship) {
      insights.push('Interested in mentorship');
    }

    return insights;
  },

  // Generate RAG training data from user preferences
  generateRAGTrainingData(uid: string, preferences: UserPreferences): {
    userId: string;
    context: string;
    insights: string[];
    tags: string[];
    timestamp: Date;
  } {
    const insights = this.generateUserInsights(preferences);
    
    // Generate context summary
    const context = `User is a ${preferences.educationLevel} student/graduate interested in ${preferences.careerInterests?.join(', ')} careers. They prefer ${preferences.learningStyle} learning and have ${preferences.timeAvailability} available per week. Primary goals include ${preferences.primaryGoals?.join(', ')} with a timeline of ${preferences.timelineGoal}. Located in ${preferences.location}.`;

    // Generate tags for categorization
    const tags = [
      ...preferences.careerInterests || [],
      ...preferences.preferredIndustries || [],
      ...preferences.currentSkills || [],
      ...preferences.primaryGoals || [],
      preferences.educationLevel || '',
      preferences.learningStyle || '',
      preferences.timelineGoal || '',
      preferences.preferredWorkMode || ''
    ].filter(Boolean);

    return {
      userId: uid,
      context,
      insights,
      tags,
      timestamp: new Date()
    };
  }
};