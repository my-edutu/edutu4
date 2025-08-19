import { SuccessStory } from '../types/successStory';

export const successStories: SuccessStory[] = [
  {
    id: 'tech-intern-success',
    opportunity: {
      id: 'mtn-internship',
      title: 'Software Developer Internship',
      organization: 'MTN Ghana',
      category: 'Technology'
    },
    person: {
      name: 'Kwame Asante',
      age: 23,
      location: 'Accra, Ghana',
      background: 'Computer Science student at University of Ghana',
      previousRole: 'Part-time tutor',
      currentRole: 'Junior Software Developer at MTN Ghana',
      avatar: '👨🏾‍💻'
    },
    story: {
      challenge: "I was a final-year computer science student with good grades but no real-world experience. I was worried about competing with candidates who had internships and practical skills.",
      solution: "I discovered this MTN internship opportunity on Edutu and followed a structured roadmap that included building portfolio projects, learning industry tools, and practicing technical interviews.",
      outcome: "Not only did I get the internship, but I was offered a full-time position before graduation. My salary increased from ₵0 to ₵4,500/month, and I gained valuable experience in mobile app development.",
      timeline: "3 months preparation + 6 months internship",
      keyLearnings: [
        "Portfolio projects matter more than just academic grades",
        "Understanding business requirements is as important as coding",
        "Networking and mentorship accelerate career growth",
        "Continuous learning is essential in tech"
      ],
      advice: [
        "Start building projects early, even simple ones",
        "Don't wait until you feel 'ready' - apply and learn on the job",
        "Connect with professionals in your field on LinkedIn",
        "Focus on solving real problems, not just learning syntax"
      ]
    },
    roadmap: {
      title: "MTN Software Developer Internship Roadmap",
      description: "A comprehensive 3-month preparation plan to land a software developer internship at MTN Ghana or similar tech companies.",
      duration: "3 months",
      difficulty: 'Intermediate',
      skills: [
        'JavaScript/TypeScript',
        'React/React Native',
        'Node.js',
        'Database Management',
        'Git/GitHub',
        'Agile Development',
        'Problem Solving',
        'Communication'
      ],
      tools: [
        'VS Code',
        'Git',
        'Postman',
        'Firebase',
        'MongoDB',
        'React Native',
        'Figma'
      ],
      steps: [
        {
          id: 'foundation',
          title: 'Strengthen Programming Fundamentals',
          description: 'Master JavaScript and web development basics',
          duration: '3 weeks',
          type: 'learning',
          resources: [
            'Complete JavaScript course on FreeCodeCamp',
            'Build 3 basic web applications',
            'Practice data structures and algorithms'
          ],
          milestones: [
            'Complete 50 JavaScript challenges',
            'Build a todo app with local storage',
            'Understand DOM manipulation'
          ],
          optional: false
        },
        {
          id: 'react-mastery',
          title: 'Learn React and Modern Development',
          description: 'Build modern web applications with React',
          duration: '4 weeks',
          type: 'learning',
          resources: [
            'React official documentation',
            'Build a weather app with API integration',
            'Learn React hooks and state management'
          ],
          milestones: [
            'Build 3 React applications',
            'Understand component lifecycle',
            'Deploy apps to Netlify/Vercel'
          ],
          optional: false
        },
        {
          id: 'portfolio',
          title: 'Build Impressive Portfolio Projects',
          description: 'Create 2-3 projects that demonstrate your skills',
          duration: '3 weeks',
          type: 'project',
          resources: [
            'E-commerce website with payment integration',
            'Mobile app clone (WhatsApp/Instagram)',
            'API project with database'
          ],
          milestones: [
            'Complete portfolio website',
            'Deploy 3 live projects',
            'Write detailed project documentation'
          ],
          optional: false
        },
        {
          id: 'mobile-dev',
          title: 'Learn Mobile Development',
          description: 'Gain experience with React Native for mobile apps',
          duration: '2 weeks',
          type: 'learning',
          resources: [
            'React Native fundamentals',
            'Build a simple mobile app',
            'Understand mobile UI/UX principles'
          ],
          milestones: [
            'Build and deploy a mobile app',
            'Understand native device features',
            'Test on real devices'
          ],
          optional: false
        },
        {
          id: 'interview-prep',
          title: 'Technical Interview Preparation',
          description: 'Prepare for coding interviews and technical discussions',
          duration: '2 weeks',
          type: 'practice',
          resources: [
            'Practice coding challenges on HackerRank',
            'Mock interviews with peers',
            'Study MTN\'s technology stack'
          ],
          milestones: [
            'Solve 30 coding problems',
            'Complete 3 mock interviews',
            'Prepare STAR method responses'
          ],
          optional: false
        },
        {
          id: 'application',
          title: 'Application and Follow-up',
          description: 'Submit strong application and network effectively',
          duration: '1 week',
          type: 'application',
          resources: [
            'Craft compelling cover letter',
            'Optimize LinkedIn profile',
            'Connect with MTN employees'
          ],
          milestones: [
            'Submit application',
            'Get 3 LinkedIn connections at MTN',
            'Schedule informational interviews'
          ],
          optional: false
        }
      ]
    },
    metrics: {
      salaryIncrease: '₵4,500/month (from ₵0)',
      timeToCompletion: '3 months',
      successRate: '78%',
      applicabilityScore: 95
    },
    tags: ['Technology', 'Internship', 'Software Development', 'MTN', 'React', 'Mobile Development'],
    createdAt: '2024-01-15',
    featured: true
  },
  {
    id: 'digital-marketing-success',
    opportunity: {
      id: 'unilever-marketing',
      title: 'Digital Marketing Associate',
      organization: 'Unilever Ghana',
      category: 'Marketing'
    },
    person: {
      name: 'Ama Serwaa',
      age: 25,
      location: 'Kumasi, Ghana',
      background: 'Business Administration graduate with passion for digital marketing',
      previousRole: 'Sales representative at local retail store',
      currentRole: 'Digital Marketing Associate at Unilever Ghana',
      avatar: '👩🏾‍💼'
    },
    story: {
      challenge: "I had a business degree but no specific marketing experience. The digital marketing field seemed overwhelming with so many tools and strategies to learn.",
      solution: "I followed Edutu's digital marketing roadmap, earned Google certifications, built a personal brand on LinkedIn, and created sample campaigns for real businesses.",
      outcome: "I landed my dream job at Unilever Ghana with a 200% salary increase. I now manage social media campaigns reaching millions of customers across West Africa.",
      timeline: "4 months preparation + immediate hiring",
      keyLearnings: [
        "Certifications from Google and Facebook carry significant weight",
        "Personal branding on social media is crucial for marketers",
        "Understanding local market dynamics gives you an edge",
        "Data analysis skills are essential in modern marketing"
      ],
      advice: [
        "Start by managing social media for friends' businesses",
        "Get certified in Google Ads and Facebook Blueprint",
        "Build your own personal brand as proof of your skills",
        "Study successful African brands and their strategies"
      ]
    },
    roadmap: {
      title: "Unilever Digital Marketing Associate Roadmap",
      description: "A 4-month intensive program to master digital marketing and land a role at top FMCG companies in Ghana.",
      duration: "4 months",
      difficulty: 'Beginner',
      skills: [
        'Social Media Marketing',
        'Google Ads',
        'Facebook Advertising',
        'Content Creation',
        'Analytics & Reporting',
        'Email Marketing',
        'SEO Basics',
        'Brand Management'
      ],
      tools: [
        'Google Analytics',
        'Google Ads',
        'Facebook Business Manager',
        'Hootsuite',
        'Canva',
        'Mailchimp',
        'Semrush',
        'HubSpot'
      ],
      steps: [
        {
          id: 'fundamentals',
          title: 'Digital Marketing Fundamentals',
          description: 'Understand the core concepts and channels of digital marketing',
          duration: '3 weeks',
          type: 'learning',
          resources: [
            'Google Digital Marketing Course',
            'HubSpot Content Marketing Certification',
            'Read "Digital Marketing for Dummies"'
          ],
          milestones: [
            'Complete Google Digital Marketing certificate',
            'Understand customer journey mapping',
            'Know all major digital marketing channels'
          ],
          optional: false
        },
        {
          id: 'social-media',
          title: 'Social Media Marketing Mastery',
          description: 'Learn to create engaging content and manage social media campaigns',
          duration: '4 weeks',
          type: 'learning',
          resources: [
            'Facebook Blueprint certification',
            'Create content calendar for 3 brands',
            'Study successful Ghanaian brand campaigns'
          ],
          milestones: [
            'Get Facebook certified',
            'Grow personal LinkedIn following by 500+',
            'Create viral content (1000+ engagements)'
          ],
          optional: false
        },
        {
          id: 'advertising',
          title: 'Paid Advertising Campaigns',
          description: 'Master Google Ads and Facebook advertising platforms',
          duration: '3 weeks',
          type: 'practice',
          resources: [
            'Google Ads certification',
            'Run actual ad campaigns (small budget)',
            'Analyze competitor advertising strategies'
          ],
          milestones: [
            'Google Ads certification achieved',
            'Successfully run 3 ad campaigns',
            'Achieve 3% CTR on campaigns'
          ],
          optional: false
        },
        {
          id: 'analytics',
          title: 'Marketing Analytics and Reporting',
          description: 'Learn to measure, analyze and report marketing performance',
          duration: '2 weeks',
          type: 'learning',
          resources: [
            'Google Analytics certification',
            'Create marketing dashboard in Excel',
            'Learn marketing attribution models'
          ],
          milestones: [
            'Google Analytics certified',
            'Build automated reporting dashboard',
            'Present campaign results to stakeholders'
          ],
          optional: false
        },
        {
          id: 'portfolio',
          title: 'Build Marketing Portfolio',
          description: 'Create case studies and demonstrate your marketing skills',
          duration: '2 weeks',
          type: 'project',
          resources: [
            'Document 3 marketing case studies',
            'Create personal brand website',
            'Develop marketing strategy for local business'
          ],
          milestones: [
            'Professional portfolio website live',
            '3 detailed case studies completed',
            'LinkedIn thought leadership content published'
          ],
          optional: false
        },
        {
          id: 'industry-knowledge',
          title: 'FMCG Industry Deep Dive',
          description: 'Understand the Fast-Moving Consumer Goods industry in Ghana',
          duration: '1 week',
          type: 'learning',
          resources: [
            'Study Unilever Ghana marketing campaigns',
            'Analyze competitor strategies (P&G, Nestle)',
            'Understand local consumer behavior'
          ],
          milestones: [
            'Complete industry analysis report',
            'Identify 5 market opportunities',
            'Network with 3 industry professionals'
          ],
          optional: false
        }
      ]
    },
    metrics: {
      salaryIncrease: '₵3,200/month (from ₵1,000)',
      timeToCompletion: '4 months',
      successRate: '65%',
      applicabilityScore: 88
    },
    tags: ['Marketing', 'Digital Marketing', 'Unilever', 'Social Media', 'FMCG', 'Analytics'],
    createdAt: '2024-02-20',
    featured: true
  }
];

export const getSuccessStoryByOpportunity = (opportunityId: string): SuccessStory | null => {
  return successStories.find(story => story.opportunity.id === opportunityId) || null;
};

export const getSuccessStoryById = (storyId: string): SuccessStory | null => {
  return successStories.find(story => story.id === storyId) || null;
};