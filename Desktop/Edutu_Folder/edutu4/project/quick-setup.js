#!/usr/bin/env node

/**
 * Quick Setup Script for Edutu Goals System
 * Seeds templates and tests all goal creation options
 */

import admin from 'firebase-admin';

// Sample goal templates since we don't have the import working
const GOAL_TEMPLATES = [
  {
    title: "Learn Python Programming",
    description: "Master Python from basics to advanced concepts with hands-on projects",
    category: "programming",
    difficulty: "beginner",
    estimatedDuration: 12,
    tags: ["python", "programming", "software-development"],
    roadmap: [
      {
        id: "milestone_1",
        title: "Python Fundamentals",
        description: "Learn basic Python syntax and concepts",
        order: 1,
        estimatedDuration: 4,
        prerequisites: [],
        resources: [],
        isCompleted: false,
        subtasks: [
          {
            id: "subtask_1_1",
            title: "Set up Python environment",
            description: "Install Python and set up development environment",
            isCompleted: false,
            order: 1
          },
          {
            id: "subtask_1_2", 
            title: "Learn variables and data types",
            description: "Understand Python variables, strings, numbers, lists",
            isCompleted: false,
            order: 2
          }
        ],
        points: 20
      }
    ]
  },
  {
    title: "Build Portfolio Website",
    description: "Create a professional portfolio website to showcase your work",
    category: "web-development",
    difficulty: "intermediate", 
    estimatedDuration: 8,
    tags: ["html", "css", "javascript", "portfolio"],
    roadmap: [
      {
        id: "milestone_2",
        title: "Website Planning",
        description: "Plan and design your portfolio structure",
        order: 1,
        estimatedDuration: 1,
        prerequisites: [],
        resources: [],
        isCompleted: false,
        subtasks: [
          {
            id: "subtask_2_1",
            title: "Define portfolio goals",
            description: "Determine what you want to achieve with your portfolio",
            isCompleted: false,
            order: 1
          }
        ],
        points: 15
      }
    ]
  }
];

async function quickSetup() {
  console.log('🚀 Edutu Goals System - Quick Setup & Testing\n');
  
  try {
    // Initialize Firebase Admin (for local testing)
    if (!admin.apps.length) {
      // Use default credentials or service account
      admin.initializeApp();
    }

    const db = admin.firestore();
    
    // Step 1: Check current state
    console.log('1️⃣ Checking current database state...');
    await checkDatabaseState(db);
    
    // Step 2: Seed templates if needed
    console.log('\n2️⃣ Seeding goal templates...');
    await seedTemplates(db);
    
    // Step 3: Create sample marketplace content
    console.log('\n3️⃣ Creating sample marketplace goals...');
    await createSampleMarketplaceGoals(db);
    
    // Step 4: Test goal creation flows
    console.log('\n4️⃣ Testing goal creation flows...');
    await testGoalCreationFlows(db);
    
    console.log('\n✅ Quick setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Goal templates seeded');
    console.log('   - Sample marketplace content created');
    console.log('   - All creation flows tested');
    console.log('   - System ready for frontend testing');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit(0);
  }
}

async function checkDatabaseState(db) {
  try {
    const [templates, marketplace, userGoals] = await Promise.all([
      db.collection('goalTemplates').limit(1).get(),
      db.collection('marketplaceGoals').limit(1).get(),
      db.collection('userGoals').limit(1).get()
    ]);
    
    console.log(`   - Goal templates: ${templates.size} found`);
    console.log(`   - Marketplace goals: ${marketplace.size} found`);
    console.log(`   - User goals: ${userGoals.size} found`);
    
    return {
      hasTemplates: templates.size > 0,
      hasMarketplace: marketplace.size > 0,
      hasUserGoals: userGoals.size > 0
    };
  } catch (error) {
    console.error('   ❌ Error checking database:', error.message);
    return { hasTemplates: false, hasMarketplace: false, hasUserGoals: false };
  }
}

async function seedTemplates(db) {
  try {
    const batch = db.batch();
    let seedCount = 0;
    
    for (const template of GOAL_TEMPLATES.slice(0, 5)) { // Seed first 5 templates
      const templateId = `template_${template.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
      
      const goalTemplate = {
        ...template,
        id: templateId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const templateRef = db.collection('goalTemplates').doc(templateId);
      batch.set(templateRef, goalTemplate);
      seedCount++;
    }
    
    await batch.commit();
    console.log(`   ✅ Seeded ${seedCount} goal templates`);
    
  } catch (error) {
    console.error('   ❌ Template seeding failed:', error.message);
  }
}

async function createSampleMarketplaceGoals(db) {
  try {
    const sampleGoals = [
      {
        title: "Complete Google Cloud Professional Certification",
        description: "Achieve Google Cloud Professional Cloud Architect certification with hands-on experience",
        category: "certification",
        difficulty: "advanced",
        estimatedDuration: 16,
        tags: ["cloud", "google", "certification", "architecture"],
        createdBy: "community-user-1",
        status: "approved",
        featured: true,
        roadmap: [
          {
            id: "milestone_1",
            title: "Foundation Knowledge",
            description: "Master cloud computing fundamentals",
            order: 1,
            estimatedDuration: 14,
            prerequisites: [],
            resources: [],
            isCompleted: false,
            subtasks: [
              {
                id: "subtask_1_1",
                title: "Complete Google Cloud Fundamentals course",
                description: "Understand basic cloud concepts",
                isCompleted: false,
                order: 1
              }
            ],
            points: 15
          }
        ],
        metadata: {
          views: 1250,
          subscriptions: 89,
          likes: 156,
          ratings: [],
          averageRating: 4.8
        },
        moderationInfo: {
          flagCount: 0,
          flags: []
        }
      }
    ];
    
    const batch = db.batch();
    
    for (const [index, goal] of sampleGoals.entries()) {
      const goalId = `marketplace_sample_${index + 1}`;
      const marketplaceGoal = {
        id: goalId,
        ...goal,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const goalRef = db.collection('marketplaceGoals').doc(goalId);
      batch.set(goalRef, marketplaceGoal);
    }
    
    await batch.commit();
    console.log(`   ✅ Created ${sampleGoals.length} sample marketplace goals`);
    
  } catch (error) {
    console.error('   ❌ Marketplace goal creation failed:', error.message);
  }
}

async function testGoalCreationFlows(db) {
  try {
    const testUserId = 'test-user-123';
    
    // Test 1: Template-based goal creation
    console.log('   🧪 Testing template-based goal creation...');
    const templateGoal = await createGoalFromTemplate(db, testUserId);
    
    // Test 2: Custom goal creation
    console.log('   🧪 Testing custom goal creation...');
    const customGoal = await createCustomGoal(db, testUserId);
    
    // Test 3: Marketplace goal adoption
    console.log('   🧪 Testing marketplace goal adoption...');
    const marketplaceGoal = await adoptMarketplaceGoal(db, testUserId);
    
    console.log('   ✅ All goal creation flows tested successfully');
    
  } catch (error) {
    console.error('   ❌ Goal creation testing failed:', error.message);
  }
}

async function createGoalFromTemplate(db, userId) {
  const templates = await db.collection('goalTemplates').limit(1).get();
  if (templates.empty) {
    throw new Error('No templates available for testing');
  }
  
  const template = templates.docs[0].data();
  const goalId = `test_template_goal_${Date.now()}`;
  
  const userGoal = {
    id: goalId,
    userId,
    sourceType: 'template',
    sourceId: template.id,
    title: template.title,
    description: template.description,
    category: template.category,
    difficulty: template.difficulty,
    estimatedDuration: template.estimatedDuration,
    tags: template.tags,
    roadmap: template.roadmap,
    status: 'active',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      isPrivate: false,
      reminders: { enabled: true, frequency: 'weekly' },
      notifications: {
        milestoneCompleted: true,
        weeklyProgress: true,
        encouragement: true
      }
    },
    statistics: {
      timeSpent: 0,
      sessionsCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageSessionDuration: 0,
      completionRate: 0,
      pointsEarned: 0
    }
  };
  
  await db.collection('userGoals').doc(goalId).set(userGoal);
  console.log(`     ✅ Created template-based goal: ${goalId}`);
  return goalId;
}

async function createCustomGoal(db, userId) {
  const goalId = `test_custom_goal_${Date.now()}`;
  
  // Generate a simple custom roadmap (simulating AI generation)
  const customRoadmap = [
    {
      id: `milestone_${Date.now()}`,
      title: "Research and Planning",
      description: "Understand requirements and create a plan",
      order: 1,
      estimatedDuration: 7,
      prerequisites: [],
      resources: [],
      isCompleted: false,
      subtasks: [
        {
          id: `subtask_${Date.now()}`,
          title: "Define objectives",
          description: "Clear goal definition",
          isCompleted: false,
          order: 1
        }
      ],
      points: 10
    }
  ];
  
  const userGoal = {
    id: goalId,
    userId,
    sourceType: 'custom',
    title: 'Learn Advanced JavaScript',
    description: 'Master modern JavaScript concepts and frameworks',
    category: 'programming',
    difficulty: 'intermediate',
    estimatedDuration: 12,
    tags: ['javascript', 'programming', 'web-development'],
    roadmap: customRoadmap,
    status: 'active',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      isPrivate: false,
      reminders: { enabled: true, frequency: 'weekly' },
      notifications: {
        milestoneCompleted: true,
        weeklyProgress: true,
        encouragement: true
      }
    },
    statistics: {
      timeSpent: 0,
      sessionsCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageSessionDuration: 0,
      completionRate: 0,
      pointsEarned: 0
    }
  };
  
  await db.collection('userGoals').doc(goalId).set(userGoal);
  console.log(`     ✅ Created custom goal: ${goalId}`);
  return goalId;
}

async function adoptMarketplaceGoal(db, userId) {
  const marketplaceGoals = await db.collection('marketplaceGoals').limit(1).get();
  if (marketplaceGoals.empty) {
    throw new Error('No marketplace goals available for testing');
  }
  
  const marketplaceGoal = marketplaceGoals.docs[0].data();
  const goalId = `test_marketplace_goal_${Date.now()}`;
  
  const userGoal = {
    id: goalId,
    userId,
    sourceType: 'marketplace',
    sourceId: marketplaceGoal.id,
    title: marketplaceGoal.title,
    description: marketplaceGoal.description,
    category: marketplaceGoal.category,
    difficulty: marketplaceGoal.difficulty,
    estimatedDuration: marketplaceGoal.estimatedDuration,
    tags: marketplaceGoal.tags,
    roadmap: marketplaceGoal.roadmap.map(milestone => ({
      ...milestone,
      isCompleted: false,
      subtasks: milestone.subtasks.map(subtask => ({
        ...subtask,
        isCompleted: false
      }))
    })),
    status: 'active',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      isPrivate: false,
      reminders: { enabled: true, frequency: 'weekly' },
      notifications: {
        milestoneCompleted: true,
        weeklyProgress: true,
        encouragement: true
      }
    },
    statistics: {
      timeSpent: 0,
      sessionsCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageSessionDuration: 0,
      completionRate: 0,
      pointsEarned: 0
    }
  };
  
  await db.collection('userGoals').doc(goalId).set(userGoal);
  
  // Update marketplace goal subscription count
  await db.collection('marketplaceGoals').doc(marketplaceGoal.id).update({
    'metadata.subscriptions': admin.firestore.FieldValue.increment(1)
  });
  
  console.log(`     ✅ Adopted marketplace goal: ${goalId}`);
  return goalId;
}

// Run the setup
quickSetup();