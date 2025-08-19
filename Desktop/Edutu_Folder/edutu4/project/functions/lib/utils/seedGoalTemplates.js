"use strict";
/**
 * Seed Goal Templates
 * Pre-defined goal templates for the Edutu Goals System
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
exports.seedTemplatesFunction = exports.GOAL_TEMPLATES = void 0;
exports.seedGoalTemplates = seedGoalTemplates;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.GOAL_TEMPLATES = [
    {
        title: "Master Data Science Fundamentals",
        description: "Build a solid foundation in data science including statistics, programming, and machine learning basics.",
        category: "education",
        difficulty: "intermediate",
        estimatedDuration: 12, // 12 weeks
        tags: ["data-science", "python", "statistics", "machine-learning"],
        isPublic: true,
        featured: true,
        createdBy: "system",
        version: 1,
        metadata: {
            usageCount: 0,
            averageRating: 0,
            totalRatings: 0
        },
        roadmap: [
            {
                id: "milestone_1",
                title: "Python Programming Basics",
                description: "Learn Python fundamentals for data science",
                order: 1,
                estimatedDuration: 14,
                prerequisites: [],
                isCompleted: false,
                points: 15,
                resources: [
                    {
                        id: "resource_1_1",
                        type: "course",
                        title: "Python for Everybody Specialization",
                        url: "https://www.coursera.org/specializations/python",
                        description: "Learn Python programming from basics to advanced",
                        isFree: false,
                        duration: 120
                    },
                    {
                        id: "resource_1_2",
                        type: "website",
                        title: "Python.org Tutorial",
                        url: "https://docs.python.org/3/tutorial/",
                        description: "Official Python tutorial",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_1_1",
                        title: "Install Python and IDE",
                        description: "Set up Python development environment",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_1_2",
                        title: "Learn basic syntax and data types",
                        description: "Variables, strings, numbers, lists, dictionaries",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_1_3",
                        title: "Control structures and functions",
                        description: "If statements, loops, and function definitions",
                        isCompleted: false,
                        order: 3
                    },
                    {
                        id: "subtask_1_4",
                        title: "File handling and modules",
                        description: "Working with files and importing modules",
                        isCompleted: false,
                        order: 4
                    }
                ]
            },
            {
                id: "milestone_2",
                title: "Statistics and Probability",
                description: "Understanding statistical concepts essential for data science",
                order: 2,
                estimatedDuration: 21,
                prerequisites: ["milestone_1"],
                isCompleted: false,
                points: 20,
                resources: [
                    {
                        id: "resource_2_1",
                        type: "book",
                        title: "Think Stats",
                        url: "https://greenteapress.com/thinkstats/",
                        description: "Statistics concepts explained with Python examples",
                        isFree: true
                    },
                    {
                        id: "resource_2_2",
                        type: "course",
                        title: "Khan Academy Statistics",
                        url: "https://www.khanacademy.org/math/statistics-probability",
                        description: "Comprehensive statistics course",
                        isFree: true,
                        duration: 180
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_2_1",
                        title: "Descriptive statistics",
                        description: "Mean, median, mode, standard deviation",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_2_2",
                        title: "Probability distributions",
                        description: "Normal, binomial, and other distributions",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_2_3",
                        title: "Hypothesis testing",
                        description: "T-tests, chi-square tests, p-values",
                        isCompleted: false,
                        order: 3
                    },
                    {
                        id: "subtask_2_4",
                        title: "Correlation and regression",
                        description: "Understanding relationships between variables",
                        isCompleted: false,
                        order: 4
                    }
                ]
            },
            {
                id: "milestone_3",
                title: "Data Manipulation with Pandas",
                description: "Master data manipulation and analysis using Pandas library",
                order: 3,
                estimatedDuration: 14,
                prerequisites: ["milestone_1"],
                isCompleted: false,
                points: 18,
                resources: [
                    {
                        id: "resource_3_1",
                        type: "course",
                        title: "Pandas Tutorial Series",
                        url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/",
                        description: "Official Pandas tutorials",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_3_1",
                        title: "DataFrames and Series",
                        description: "Understanding Pandas data structures",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_3_2",
                        title: "Data cleaning and preprocessing",
                        description: "Handling missing data, duplicates, and outliers",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_3_3",
                        title: "Data aggregation and grouping",
                        description: "GroupBy operations and pivot tables",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_4",
                title: "Data Visualization",
                description: "Create compelling visualizations to communicate insights",
                order: 4,
                estimatedDuration: 10,
                prerequisites: ["milestone_3"],
                isCompleted: false,
                points: 15,
                resources: [
                    {
                        id: "resource_4_1",
                        type: "website",
                        title: "Matplotlib Documentation",
                        url: "https://matplotlib.org/stable/tutorials/index.html",
                        description: "Comprehensive plotting library tutorials",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_4_1",
                        title: "Basic plots with Matplotlib",
                        description: "Line plots, scatter plots, histograms",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_4_2",
                        title: "Advanced visualizations with Seaborn",
                        description: "Statistical plotting library",
                        isCompleted: false,
                        order: 2
                    }
                ]
            },
            {
                id: "milestone_5",
                title: "Machine Learning Basics",
                description: "Introduction to machine learning algorithms and concepts",
                order: 5,
                estimatedDuration: 21,
                prerequisites: ["milestone_2", "milestone_3"],
                isCompleted: false,
                points: 25,
                resources: [
                    {
                        id: "resource_5_1",
                        type: "course",
                        title: "Scikit-learn Tutorial",
                        url: "https://scikit-learn.org/stable/tutorial/index.html",
                        description: "Machine learning library documentation",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_5_1",
                        title: "Supervised learning algorithms",
                        description: "Linear regression, classification algorithms",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_5_2",
                        title: "Model evaluation and validation",
                        description: "Cross-validation, metrics, overfitting",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_5_3",
                        title: "Unsupervised learning",
                        description: "Clustering and dimensionality reduction",
                        isCompleted: false,
                        order: 3
                    }
                ]
            }
        ]
    },
    {
        title: "Build a Professional Portfolio Website",
        description: "Create a stunning portfolio website to showcase your skills and projects to potential employers.",
        category: "career",
        difficulty: "beginner",
        estimatedDuration: 8,
        tags: ["web-development", "portfolio", "html", "css", "javascript"],
        isPublic: true,
        featured: true,
        createdBy: "system",
        version: 1,
        metadata: {
            usageCount: 0,
            averageRating: 0,
            totalRatings: 0
        },
        roadmap: [
            {
                id: "milestone_1",
                title: "Plan Your Portfolio",
                description: "Define goals, target audience, and content strategy",
                order: 1,
                estimatedDuration: 3,
                prerequisites: [],
                isCompleted: false,
                points: 10,
                resources: [
                    {
                        id: "resource_1_1",
                        type: "article",
                        title: "How to Build a Great Portfolio",
                        url: "https://www.freecodecamp.org/news/15-web-developer-portfolios-to-inspire-you-137fb1743cae/",
                        description: "Examples and best practices for developer portfolios",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_1_1",
                        title: "Define your unique value proposition",
                        description: "What makes you different from other developers?",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_1_2",
                        title: "Choose your best projects",
                        description: "Select 3-5 projects that showcase different skills",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_1_3",
                        title: "Write compelling project descriptions",
                        description: "Focus on problems solved and technologies used",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_2",
                title: "Design and Wireframe",
                description: "Create the visual design and structure of your portfolio",
                order: 2,
                estimatedDuration: 5,
                prerequisites: ["milestone_1"],
                isCompleted: false,
                points: 12,
                resources: [
                    {
                        id: "resource_2_1",
                        type: "tool",
                        title: "Figma",
                        url: "https://www.figma.com/",
                        description: "Free design and prototyping tool",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_2_1",
                        title: "Create wireframes",
                        description: "Sketch the layout and structure",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_2_2",
                        title: "Choose color scheme and typography",
                        description: "Select colors and fonts that reflect your brand",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_2_3",
                        title: "Design responsive layouts",
                        description: "Ensure it works on mobile and desktop",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_3",
                title: "Develop the Website",
                description: "Build the portfolio using HTML, CSS, and JavaScript",
                order: 3,
                estimatedDuration: 14,
                prerequisites: ["milestone_2"],
                isCompleted: false,
                points: 20,
                resources: [
                    {
                        id: "resource_3_1",
                        type: "course",
                        title: "HTML, CSS, and JavaScript for Web Developers",
                        url: "https://www.coursera.org/learn/html-css-javascript-for-web-developers",
                        description: "Complete web development course",
                        isFree: false
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_3_1",
                        title: "Set up development environment",
                        description: "Install code editor and local server",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_3_2",
                        title: "Build HTML structure",
                        description: "Create semantic HTML markup",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_3_3",
                        title: "Style with CSS",
                        description: "Implement responsive design and animations",
                        isCompleted: false,
                        order: 3
                    },
                    {
                        id: "subtask_3_4",
                        title: "Add JavaScript interactions",
                        description: "Form handling, smooth scrolling, animations",
                        isCompleted: false,
                        order: 4
                    }
                ]
            },
            {
                id: "milestone_4",
                title: "Deploy and Optimize",
                description: "Launch your portfolio and optimize for performance",
                order: 4,
                estimatedDuration: 4,
                prerequisites: ["milestone_3"],
                isCompleted: false,
                points: 15,
                resources: [
                    {
                        id: "resource_4_1",
                        type: "website",
                        title: "Netlify",
                        url: "https://www.netlify.com/",
                        description: "Free hosting for static websites",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_4_1",
                        title: "Choose hosting platform",
                        description: "Deploy to Netlify, Vercel, or GitHub Pages",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_4_2",
                        title: "Optimize for SEO",
                        description: "Add meta tags, alt text, and structured data",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_4_3",
                        title: "Test across devices and browsers",
                        description: "Ensure compatibility and responsiveness",
                        isCompleted: false,
                        order: 3
                    }
                ]
            }
        ]
    },
    {
        title: "Learn Spanish Conversational Skills",
        description: "Develop practical Spanish conversation skills for travel, work, or personal enrichment.",
        category: "personal",
        difficulty: "beginner",
        estimatedDuration: 16,
        tags: ["language-learning", "spanish", "conversation", "communication"],
        isPublic: true,
        featured: false,
        createdBy: "system",
        version: 1,
        metadata: {
            usageCount: 0,
            averageRating: 0,
            totalRatings: 0
        },
        roadmap: [
            {
                id: "milestone_1",
                title: "Basic Vocabulary and Phrases",
                description: "Learn essential words and common expressions",
                order: 1,
                estimatedDuration: 14,
                prerequisites: [],
                isCompleted: false,
                points: 15,
                resources: [
                    {
                        id: "resource_1_1",
                        type: "course",
                        title: "Duolingo Spanish Course",
                        url: "https://www.duolingo.com/course/es/en/Learn-Spanish",
                        description: "Free interactive Spanish lessons",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_1_1",
                        title: "Learn 100 most common words",
                        description: "Master basic vocabulary for daily conversations",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_1_2",
                        title: "Basic greetings and introductions",
                        description: "How to introduce yourself and greet others",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_1_3",
                        title: "Numbers, days, and time",
                        description: "Essential vocabulary for scheduling and planning",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_2",
                title: "Grammar Fundamentals",
                description: "Understand basic Spanish grammar rules",
                order: 2,
                estimatedDuration: 21,
                prerequisites: ["milestone_1"],
                isCompleted: false,
                points: 18,
                resources: [
                    {
                        id: "resource_2_1",
                        type: "website",
                        title: "SpanishDict Grammar Guide",
                        url: "https://www.spanishdict.com/guide",
                        description: "Comprehensive Spanish grammar reference",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_2_1",
                        title: "Present tense verb conjugations",
                        description: "Regular and irregular verbs in present tense",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_2_2",
                        title: "Noun gender and articles",
                        description: "Understanding masculine/feminine and el/la",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_2_3",
                        title: "Basic sentence structure",
                        description: "Subject-verb-object and question formation",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_3",
                title: "Conversation Practice",
                description: "Apply your knowledge in real conversations",
                order: 3,
                estimatedDuration: 28,
                prerequisites: ["milestone_2"],
                isCompleted: false,
                points: 25,
                resources: [
                    {
                        id: "resource_3_1",
                        type: "website",
                        title: "HelloTalk",
                        url: "https://www.hellotalk.com/",
                        description: "Language exchange with native speakers",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_3_1",
                        title: "Practice with language exchange partners",
                        description: "30 minutes of conversation practice per week",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_3_2",
                        title: "Role-play common scenarios",
                        description: "Restaurant orders, shopping, asking for directions",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_3_3",
                        title: "Watch Spanish content with subtitles",
                        description: "Movies, TV shows, or YouTube videos",
                        isCompleted: false,
                        order: 3
                    }
                ]
            }
        ]
    },
    {
        title: "Start a Side Business",
        description: "Launch a profitable side business while maintaining your current job, focusing on validation and sustainable growth.",
        category: "business",
        difficulty: "intermediate",
        estimatedDuration: 20,
        tags: ["entrepreneurship", "business", "side-hustle", "revenue"],
        isPublic: true,
        featured: true,
        createdBy: "system",
        version: 1,
        metadata: {
            usageCount: 0,
            averageRating: 0,
            totalRatings: 0
        },
        roadmap: [
            {
                id: "milestone_1",
                title: "Idea Validation and Market Research",
                description: "Validate your business idea and understand your target market",
                order: 1,
                estimatedDuration: 14,
                prerequisites: [],
                isCompleted: false,
                points: 20,
                resources: [
                    {
                        id: "resource_1_1",
                        type: "book",
                        title: "The Mom Test",
                        url: "http://momtestbook.com/",
                        description: "How to talk to customers and learn if your business is a good idea",
                        isFree: false
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_1_1",
                        title: "Identify your skills and interests",
                        description: "List what you're good at and passionate about",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_1_2",
                        title: "Research market demand",
                        description: "Use Google Trends, surveys, and competitor analysis",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_1_3",
                        title: "Conduct customer interviews",
                        description: "Talk to 10 potential customers about their problems",
                        isCompleted: false,
                        order: 3
                    },
                    {
                        id: "subtask_1_4",
                        title: "Define your value proposition",
                        description: "Clearly articulate how you solve customer problems",
                        isCompleted: false,
                        order: 4
                    }
                ]
            },
            {
                id: "milestone_2",
                title: "Business Planning and Setup",
                description: "Create a lean business plan and handle legal requirements",
                order: 2,
                estimatedDuration: 10,
                prerequisites: ["milestone_1"],
                isCompleted: false,
                points: 15,
                resources: [
                    {
                        id: "resource_2_1",
                        type: "website",
                        title: "SCORE Business Templates",
                        url: "https://www.score.org/resource/business-plan-template-startup",
                        description: "Free business plan templates and mentoring",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_2_1",
                        title: "Write a lean business plan",
                        description: "One-page business model canvas",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_2_2",
                        title: "Choose business structure",
                        description: "LLC, Corporation, or Sole Proprietorship",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_2_3",
                        title: "Set up business banking and accounting",
                        description: "Separate business and personal finances",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_3",
                title: "Build Minimum Viable Product (MVP)",
                description: "Create the simplest version of your product or service",
                order: 3,
                estimatedDuration: 21,
                prerequisites: ["milestone_2"],
                isCompleted: false,
                points: 25,
                resources: [
                    {
                        id: "resource_3_1",
                        type: "book",
                        title: "The Lean Startup",
                        url: "http://theleanstartup.com/",
                        description: "Build-measure-learn methodology for startups",
                        isFree: false
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_3_1",
                        title: "Define MVP features",
                        description: "List only essential features for first version",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_3_2",
                        title: "Build or create your MVP",
                        description: "Use no-code tools or manual processes",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_3_3",
                        title: "Test with early customers",
                        description: "Get feedback from 5-10 test customers",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_4",
                title: "Launch and Market",
                description: "Launch your business and acquire your first customers",
                order: 4,
                estimatedDuration: 28,
                prerequisites: ["milestone_3"],
                isCompleted: false,
                points: 30,
                resources: [
                    {
                        id: "resource_4_1",
                        type: "course",
                        title: "Digital Marketing Fundamentals",
                        url: "https://www.google.com/skillshop/course/29",
                        description: "Free Google digital marketing course",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_4_1",
                        title: "Create marketing materials",
                        description: "Website, social media profiles, business cards",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_4_2",
                        title: "Launch marketing campaigns",
                        description: "Social media, email, or paid advertising",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_4_3",
                        title: "Acquire first 10 paying customers",
                        description: "Focus on customer acquisition and retention",
                        isCompleted: false,
                        order: 3
                    },
                    {
                        id: "subtask_4_4",
                        title: "Analyze and optimize",
                        description: "Track metrics and improve based on data",
                        isCompleted: false,
                        order: 4
                    }
                ]
            }
        ]
    },
    {
        title: "Complete Marathon Training Program",
        description: "Train systematically to complete your first marathon (26.2 miles) in 16 weeks with proper conditioning and injury prevention.",
        category: "health",
        difficulty: "advanced",
        estimatedDuration: 16,
        tags: ["running", "marathon", "fitness", "endurance", "health"],
        isPublic: true,
        featured: false,
        createdBy: "system",
        version: 1,
        metadata: {
            usageCount: 0,
            averageRating: 0,
            totalRatings: 0
        },
        roadmap: [
            {
                id: "milestone_1",
                title: "Base Building Phase",
                description: "Build aerobic base and running consistency",
                order: 1,
                estimatedDuration: 28,
                prerequisites: [],
                isCompleted: false,
                points: 20,
                resources: [
                    {
                        id: "resource_1_1",
                        type: "article",
                        title: "Beginner's Guide to Marathon Training",
                        url: "https://www.runnersworld.com/training/a20806029/first-marathon-training-guide/",
                        description: "Comprehensive marathon training guide",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_1_1",
                        title: "Establish running routine (3-4 days/week)",
                        description: "Build consistency with easy runs",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_1_2",
                        title: "Complete weekly long runs (6-10 miles)",
                        description: "Gradually increase distance each week",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_1_3",
                        title: "Focus on proper running form",
                        description: "Work on cadence, posture, and breathing",
                        isCompleted: false,
                        order: 3
                    },
                    {
                        id: "subtask_1_4",
                        title: "Log 100+ total miles",
                        description: "Track weekly mileage and progress",
                        isCompleted: false,
                        order: 4
                    }
                ]
            },
            {
                id: "milestone_2",
                title: "Build-Up Phase",
                description: "Increase mileage and add structured workouts",
                order: 2,
                estimatedDuration: 21,
                prerequisites: ["milestone_1"],
                isCompleted: false,
                points: 25,
                resources: [
                    {
                        id: "resource_2_1",
                        type: "website",
                        title: "Hal Higdon Marathon Training",
                        url: "https://www.halhigdon.com/training-programs/marathon-training/",
                        description: "Proven marathon training programs",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_2_1",
                        title: "Increase to 4-5 runs per week",
                        description: "Add tempo runs and easy recovery runs",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_2_2",
                        title: "Complete long runs up to 16 miles",
                        description: "Practice race pace and fueling strategies",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_2_3",
                        title: "Include cross-training",
                        description: "Swimming, cycling, or strength training 1-2x/week",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_3",
                title: "Peak Training Phase",
                description: "Reach maximum training volume with longest runs",
                order: 3,
                estimatedDuration: 21,
                prerequisites: ["milestone_2"],
                isCompleted: false,
                points: 30,
                resources: [
                    {
                        id: "resource_3_1",
                        type: "article",
                        title: "Marathon Nutrition and Hydration",
                        url: "https://www.runnersworld.com/nutrition-weight-loss/a20845135/fueling-strategies/",
                        description: "How to fuel properly during training and racing",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_3_1",
                        title: "Complete 20-mile long runs",
                        description: "Practice race-day conditions and pacing",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_3_2",
                        title: "Test race-day nutrition",
                        description: "Practice fueling during long runs",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_3_3",
                        title: "Peak weekly mileage (40-50 miles)",
                        description: "Maintain highest training volume safely",
                        isCompleted: false,
                        order: 3
                    }
                ]
            },
            {
                id: "milestone_4",
                title: "Taper and Race Day",
                description: "Reduce training volume and execute race strategy",
                order: 4,
                estimatedDuration: 14,
                prerequisites: ["milestone_3"],
                isCompleted: false,
                points: 35,
                resources: [
                    {
                        id: "resource_4_1",
                        type: "article",
                        title: "Marathon Race Day Strategy",
                        url: "https://www.runnersworld.com/races-places/a20845306/race-day-strategies/",
                        description: "How to execute your marathon race plan",
                        isFree: true
                    }
                ],
                subtasks: [
                    {
                        id: "subtask_4_1",
                        title: "Reduce training volume by 25-40%",
                        description: "Allow body to recover while maintaining fitness",
                        isCompleted: false,
                        order: 1
                    },
                    {
                        id: "subtask_4_2",
                        title: "Finalize race day strategy",
                        description: "Pacing, nutrition, gear, and contingency plans",
                        isCompleted: false,
                        order: 2
                    },
                    {
                        id: "subtask_4_3",
                        title: "Complete the marathon",
                        description: "Execute your training and cross the finish line!",
                        isCompleted: false,
                        order: 3
                    }
                ]
            }
        ]
    }
];
/**
 * Seed the database with goal templates
 */
async function seedGoalTemplates() {
    try {
        console.log('Starting to seed goal templates...');
        const batch = db.batch();
        for (const template of exports.GOAL_TEMPLATES) {
            const templateId = `template_${template.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
            const goalTemplate = Object.assign(Object.assign({}, template), { id: templateId, createdAt: new Date(), updatedAt: new Date() });
            const templateRef = db.collection('goalTemplates').doc(templateId);
            batch.set(templateRef, goalTemplate);
        }
        await batch.commit();
        console.log(`Successfully seeded ${exports.GOAL_TEMPLATES.length} goal templates`);
    }
    catch (error) {
        console.error('Error seeding goal templates:', error);
        throw error;
    }
}
/**
 * Cloud Function to manually trigger seeding
 */
const seedTemplatesFunction = async (req, res) => {
    try {
        // Only allow authenticated admin users
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Uncomment to add admin verification
        // const token = authHeader.split('Bearer ')[1];
        // const decodedToken = await admin.auth().verifyIdToken(token);
        // const userRecord = await admin.auth().getUser(decodedToken.uid);
        // if (!userRecord.customClaims?.admin) {
        //   return res.status(403).json({ error: 'Admin privileges required' });
        // }
        await seedGoalTemplates();
        res.json({
            success: true,
            message: `Successfully seeded ${exports.GOAL_TEMPLATES.length} goal templates`,
            templates: exports.GOAL_TEMPLATES.map(t => ({ title: t.title, category: t.category }))
        });
    }
    catch (error) {
        console.error('Error in seed function:', error);
        res.status(500).json({
            error: 'Failed to seed templates',
            message: error.message
        });
    }
};
exports.seedTemplatesFunction = seedTemplatesFunction;
//# sourceMappingURL=seedGoalTemplates.js.map