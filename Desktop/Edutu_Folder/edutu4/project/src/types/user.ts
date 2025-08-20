import type { FirebaseTimestamp } from './common';

export interface UserPreferences {
  // Educational Background
  educationLevel: 'high_school' | 'undergraduate' | 'graduate' | 'other';
  fieldOfStudy: string;
  currentInstitution?: string;
  
  // Career Interests
  careerInterests: string[]; // Array of career fields
  preferredIndustries: string[]; // Tech, Healthcare, Finance, etc.
  
  // Skills & Experience
  currentSkills: string[]; // Programming, Design, Marketing, etc.
  skillLevels: { [skill: string]: 'beginner' | 'intermediate' | 'advanced' };
  hasWorkExperience: boolean;
  workExperienceType?: 'internship' | 'part_time' | 'full_time' | 'freelance';
  
  // Learning Preferences
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
  preferredLearningPace: 'slow' | 'moderate' | 'fast';
  timeAvailability: 'less_than_5h' | '5_to_10h' | '10_to_20h' | 'more_than_20h'; // per week
  
  // Goals & Motivations
  primaryGoals: string[]; // Get a job, Learn new skills, Career change, etc.
  motivationFactors: string[]; // Money, Passion, Flexibility, etc.
  timelineGoal: '3_months' | '6_months' | '1_year' | '2_plus_years';
  
  // Personal Context
  location: string;
  willingToRelocate: boolean;
  preferredWorkMode: 'remote' | 'hybrid' | 'in_person' | 'flexible';
  
  // Challenges & Concerns
  biggestChallenges: string[]; // Lack of experience, Time constraints, etc.
  concerns: string[]; // Job market, Competition, etc.
  
  // Communication & Mentorship
  communicationStyle: 'direct' | 'collaborative' | 'independent' | 'supportive';
  wantsMentorship: boolean;
  networkingComfort: 'very_comfortable' | 'somewhat_comfortable' | 'uncomfortable';
  
  // Preferences metadata
  completedAt: FirebaseTimestamp; // Firebase timestamp
  version: string; // For tracking preference schema changes
  skipped?: boolean; // Whether onboarding was skipped
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface ExtendedUserProfile {
  name: string;
  email: string;
  age: number;
  uid: string;
  preferences?: UserPreferences;
  onboardingCompleted: boolean;
  onboardingSteps: OnboardingStep[];
}