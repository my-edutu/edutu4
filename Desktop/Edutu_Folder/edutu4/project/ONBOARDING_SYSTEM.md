# User Onboarding & RAG Training System

## Overview

The onboarding system captures detailed user preferences immediately after authentication to personalize the Edutu experience and train a RAG (Retrieval-Augmented Generation) system for better recommendations.

## 🏗️ **System Architecture**

### **Flow Structure**
```
Authentication → Onboarding (if needed) → Main App
     ↓              ↓                      ↓
AuthScreen → OnboardingScreen → Dashboard
     ↓              ↓                      ↓
  Firebase     Firestore + RAG       Personalized
    Auth       Data Generation         Experience
```

### **Components Overview**

1. **`AuthFlow.tsx`** - Main orchestrator component
2. **`OnboardingScreen.tsx`** - 7-step preference collection
3. **`preferencesService.ts`** - Data persistence & RAG data generation
4. **User Types** - Comprehensive preference schema

## 📊 **Data Collection Structure**

### **7-Step Onboarding Process**

#### **Step 1: Education Background**
- Education level (High School → Graduate)
- Field of study
- Current institution

#### **Step 2: Career Interests**
- Career fields (Technology, Healthcare, Finance, etc.)
- Specific industries (Software Dev, Marketing, etc.)

#### **Step 3: Skills & Experience**
- Current skills with proficiency levels
- Work experience type (Internship, Part-time, etc.)

#### **Step 4: Learning Preferences**
- Learning style (Visual, Auditory, Kinesthetic, Reading/Writing)
- Time availability per week
- Preferred learning pace

#### **Step 5: Goals & Timeline**
- Primary goals (Get job, Learn skills, Career change)
- Motivation factors (Salary, Passion, Flexibility)
- Target timeline (3 months → 2+ years)

#### **Step 6: Personal Context**
- Location & relocation willingness
- Preferred work mode (Remote, Hybrid, In-person)
- Biggest challenges & concerns

#### **Step 7: Communication Style**
- Communication preferences
- Mentorship interest
- Networking comfort level

## 🔄 **RAG Training Data Generation**

### **Automatic Data Processing**
When users complete onboarding, the system automatically generates:

#### **1. User Context Summary**
```typescript
const context = `User is a ${educationLevel} student interested in ${careerInterests} careers. 
They prefer ${learningStyle} learning and have ${timeAvailability} available per week. 
Primary goals include ${primaryGoals} with a timeline of ${timelineGoal}. 
Located in ${location}.`;
```

#### **2. Actionable Insights**
```typescript
const insights = [
  "Interested in Technology, Healthcare careers",
  "Prefers visual learning style", 
  "Available for 10-20 hours per week",
  "Primary goals: Get a job, Learn new skills",
  "Target timeline: 6 months",
  "Has internship experience",
  "Current skills: Programming, Communication",
  "Located in Accra, Ghana",
  "Open to relocation",
  "Prefers remote work",
  "Main challenges: Lack of experience, Time constraints",
  "Collaborative communication style",
  "Interested in mentorship"
];
```

#### **3. Categorization Tags**
```typescript
const tags = [
  "Technology", "Programming", "Remote", "6_months", 
  "visual_learner", "mentorship", "Ghana", "internship_experience"
];
```

## 💾 **Data Persistence**

### **Firestore Schema**

#### **User Document Structure**
```typescript
// Collection: 'users' | Document: {uid}
{
  // Basic user data
  uid: string,
  name: string,
  email: string,
  age: number,
  createdAt: timestamp,
  
  // Onboarding status
  onboardingCompleted: boolean,
  onboardingCompletedAt: timestamp,
  
  // Detailed preferences
  preferences: {
    // Education
    educationLevel: 'undergraduate',
    fieldOfStudy: 'Computer Science',
    currentInstitution: 'University of Ghana',
    
    // Career
    careerInterests: ['Technology', 'Business'],
    preferredIndustries: ['Software Development', 'Digital Marketing'],
    
    // Skills
    currentSkills: ['Programming', 'Communication'],
    skillLevels: { 'Programming': 'intermediate' },
    hasWorkExperience: true,
    workExperienceType: 'internship',
    
    // Learning
    learningStyle: 'visual',
    preferredLearningPace: 'moderate',
    timeAvailability: '10_to_20h',
    
    // Goals
    primaryGoals: ['Get a job', 'Learn new skills'],
    motivationFactors: ['Better salary', 'Personal passion'],
    timelineGoal: '6_months',
    
    // Context
    location: 'Accra, Ghana',
    willingToRelocate: true,
    preferredWorkMode: 'remote',
    biggestChallenges: ['Lack of experience'],
    
    // Communication
    communicationStyle: 'collaborative',
    wantsMentorship: true,
    networkingComfort: 'somewhat_comfortable',
    
    // Metadata
    completedAt: timestamp,
    version: '1.0'
  }
}
```

## 🎯 **RAG Integration Points**

### **1. Opportunity Recommendations**
Use preferences to filter and rank opportunities:
```typescript
// Example RAG query enhancement
const userContext = `User interested in ${careerInterests} with ${skillLevels} skills, 
available ${timeAvailability} per week, targeting ${timelineGoal} timeline`;

// Enhanced opportunity matching
const relevantOpportunities = await ragSystem.query(
  `Find opportunities matching: ${userContext}`,
  { tags: userTags, location: userLocation }
);
```

### **2. Learning Path Personalization**
```typescript
// Personalized roadmap generation
const learningStyle = user.preferences.learningStyle;
const timeAvailable = user.preferences.timeAvailability;
const currentSkills = user.preferences.currentSkills;

const personalizedPath = await ragSystem.generatePath({
  goal: selectedCareerPath,
  currentSkills,
  learningStyle,
  timeConstraints: timeAvailable,
  userContext: generatedContext
});
```

### **3. Mentorship Matching**
```typescript
// Match users with compatible mentors
const mentorshipPrefs = {
  communicationStyle: user.preferences.communicationStyle,
  careerInterests: user.preferences.careerInterests,
  location: user.preferences.location,
  networkingComfort: user.preferences.networkingComfort
};

const compatibleMentors = await ragSystem.findMentors(mentorshipPrefs);
```

## 🔧 **Implementation Details**

### **Key Services**

#### **1. preferencesService.ts**
- `saveUserPreferences()` - Persist to Firestore
- `getUserPreferences()` - Retrieve user data
- `generateUserInsights()` - Create RAG insights
- `generateRAGTrainingData()` - Format for training

#### **2. AuthFlow.tsx**
- Orchestrates auth → onboarding → app flow
- Handles preference saving
- Generates RAG training data
- Manages state transitions

#### **3. OnboardingScreen.tsx**
- 7-step preference collection UI
- Form validation & progress tracking
- Mobile-responsive design
- Dark mode support

## 🚀 **Future RAG Integration**

### **Training Pipeline Integration**
```typescript
// Example integration point in AuthFlow.tsx
const handleOnboardingComplete = async (preferences: UserPreferences) => {
  // Save to Firestore
  await preferencesService.saveUserPreferences(userInfo.uid, preferences);
  
  // Generate RAG training data
  const ragData = preferencesService.generateRAGTrainingData(userInfo.uid, preferences);
  
  // Send to your RAG training pipeline
  await sendToRAGPipeline(ragData);  // ← Your implementation
  
  // Update vector embeddings
  await updateUserEmbeddings(userInfo.uid, ragData); // ← Your implementation
  
  // Complete onboarding
  onComplete(userInfo);
};
```

### **Real-time Personalization**
```typescript
// Example: Dynamic content generation
const generatePersonalizedContent = async (userId: string, query: string) => {
  const userPreferences = await preferencesService.getUserPreferences(userId);
  const context = preferencesService.generateUserInsights(userPreferences);
  
  return await ragSystem.query(query, {
    userContext: context,
    preferences: userPreferences
  });
};
```

## 📈 **Analytics & Insights**

### **Preference Analytics**
The system collects rich data for analytics:

- **Popular career paths** by age group
- **Learning style distribution** 
- **Timeline preferences** vs actual completion
- **Challenge identification** for product improvement
- **Geographic patterns** in career interests
- **Skills gap analysis** across user base

### **RAG Performance Metrics**
Track RAG effectiveness:
- **Recommendation relevance** scores
- **User engagement** with suggested content
- **Goal completion rates** by preference profile
- **Learning path effectiveness** by learning style

## 🔐 **Privacy & Security**

### **Data Protection**
- All preference data stored securely in Firestore
- User consent collected during onboarding
- GDPR-compliant data handling
- Option to update/delete preferences
- Anonymized data for RAG training

### **Security Rules**
```javascript
// Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🧪 **Testing the System**

### **Manual Testing Steps**
1. **Sign up** with new email → Verify onboarding appears
2. **Complete onboarding** → Check Firestore for preferences
3. **Sign in existing user** → Verify skips onboarding
4. **Test each step** → Verify validation works
5. **Check RAG data** → Verify insights generation

### **Data Verification**
```typescript
// Check in browser console after onboarding
const userData = await preferencesService.getUserPreferences(currentUser.uid);
console.log('User Preferences:', userData);

const ragData = preferencesService.generateRAGTrainingData(currentUser.uid, userData);
console.log('RAG Training Data:', ragData);
```

## 📝 **Next Steps for RAG Integration**

1. **Set up RAG infrastructure** (Vector DB, Embeddings)
2. **Create training pipeline** to process onboarding data
3. **Implement recommendation engine** using preferences
4. **Build personalization features** in existing components
5. **Add preference update functionality** in settings
6. **Implement analytics dashboard** for preference insights

The onboarding system is now complete and ready to collect rich user preference data for training your RAG system. All user choices are automatically saved and structured for easy integration with your AI pipeline!