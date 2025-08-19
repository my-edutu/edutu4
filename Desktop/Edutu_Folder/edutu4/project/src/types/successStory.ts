export interface SuccessStory {
  id: string;
  opportunity: {
    id: string;
    title: string;
    organization: string;
    category: string;
  };
  person: {
    name: string;
    age: number;
    location: string;
    background: string;
    previousRole?: string;
    currentRole: string;
    avatar: string;
  };
  story: {
    challenge: string;
    solution: string;
    outcome: string;
    timeline: string;
    keyLearnings: string[];
    advice: string[];
  };
  roadmap: {
    title: string;
    description: string;
    duration: string;
    steps: RoadmapStep[];
    skills: string[];
    tools: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  };
  metrics: {
    salaryIncrease?: string;
    timeToCompletion: string;
    successRate: string;
    applicabilityScore: number;
  };
  tags: string[];
  createdAt: string;
  featured: boolean;
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'learning' | 'practice' | 'project' | 'networking' | 'application';
  resources: string[];
  milestones: string[];
  optional: boolean;
}