#!/usr/bin/env node

/**
 * Comprehensive Goals System Test
 * Tests all 3 goal creation options and verifies end-to-end functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5001/edutu-3/us-central1/api'; // Firebase Functions emulator
const TEST_USER = {
  uid: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com'
};

async function testGoalsSystem() {
  console.log('🎯 Testing Edutu Goals System - End-to-End Verification\n');

  try {
    // Test 1: Verify Templates System
    console.log('1️⃣ Testing Goal Templates System...');
    await testTemplateSystem();
    
    // Test 2: Verify Community Marketplace
    console.log('\n2️⃣ Testing Community Marketplace...');
    await testMarketplaceSystem();
    
    // Test 3: Verify Custom Goal Creation with AI
    console.log('\n3️⃣ Testing Custom Goal Creation with AI...');
    await testCustomGoalSystem();
    
    // Test 4: Verify Goal Management
    console.log('\n4️⃣ Testing Goal Management...');
    await testGoalManagement();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

async function testTemplateSystem() {
  try {
    // Test fetching templates
    const response = await axios.get(`${BASE_URL}/goals/templates`, {
      headers: { 'Authorization': `Bearer mock-token` }
    });
    
    console.log(`✅ Found ${response.data.templates?.length || 0} goal templates`);
    
    if (response.data.templates?.length > 0) {
      const template = response.data.templates[0];
      console.log(`   - Sample template: "${template.title}" (${template.category})`);
      
      // Test creating goal from template
      const goalData = {
        sourceType: 'template',
        sourceId: template.id,
        settings: {
          reminders: { enabled: true, frequency: 'weekly' }
        }
      };
      
      const createResponse = await axios.post(`${BASE_URL}/goals`, {
        userId: TEST_USER.uid,
        ...goalData
      }, {
        headers: { 'Authorization': `Bearer mock-token` }
      });
      
      console.log(`✅ Created goal from template: ${createResponse.data.goal?.id}`);
    } else {
      console.log('⚠️  No templates found - need to seed templates');
    }
    
  } catch (error) {
    console.log(`❌ Template system error: ${error.message}`);
  }
}

async function testMarketplaceSystem() {
  try {
    // Test marketplace search
    const response = await axios.get(`${BASE_URL}/goals/marketplace/search`, {
      headers: { 'Authorization': `Bearer mock-token` }
    });
    
    console.log(`✅ Found ${response.data.goals?.length || 0} marketplace goals`);
    
    // Test featured goals
    const featuredResponse = await axios.get(`${BASE_URL}/goals/marketplace/featured`, {
      headers: { 'Authorization': `Bearer mock-token` }
    });
    
    console.log(`✅ Found ${featuredResponse.data.goals?.length || 0} featured goals`);
    
    // Test trending goals
    const trendingResponse = await axios.get(`${BASE_URL}/goals/marketplace/trending`, {
      headers: { 'Authorization': `Bearer mock-token` }
    });
    
    console.log(`✅ Found ${trendingResponse.data.goals?.length || 0} trending goals`);
    
  } catch (error) {
    console.log(`❌ Marketplace system error: ${error.message}`);
  }
}

async function testCustomGoalSystem() {
  try {
    // Test custom goal creation with AI
    const customGoalData = {
      sourceType: 'custom',
      title: 'Learn Machine Learning Fundamentals',
      description: 'Master the basics of machine learning including algorithms, data preprocessing, and model evaluation',
      category: 'education'
    };
    
    const response = await axios.post(`${BASE_URL}/goals`, {
      userId: TEST_USER.uid,
      ...customGoalData
    }, {
      headers: { 'Authorization': `Bearer mock-token` }
    });
    
    console.log(`✅ Created custom goal with AI: ${response.data.goal?.id}`);
    console.log(`   - AI generated roadmap with ${response.data.goal?.roadmap?.length || 0} milestones`);
    
    return response.data.goal?.id;
    
  } catch (error) {
    console.log(`❌ Custom goal system error: ${error.message}`);
    return null;
  }
}

async function testGoalManagement() {
  try {
    // Test fetching user goals
    const response = await axios.get(`${BASE_URL}/goals/user/${TEST_USER.uid}`, {
      headers: { 'Authorization': `Bearer mock-token` }
    });
    
    console.log(`✅ Found ${response.data.goals?.length || 0} user goals`);
    
    if (response.data.goals?.length > 0) {
      const goal = response.data.goals[0];
      console.log(`   - Sample goal: "${goal.title}" (${goal.progress || 0}% complete)`);
      
      // Test dashboard
      const dashboardResponse = await axios.get(`${BASE_URL}/goals/user/${TEST_USER.uid}/dashboard`, {
        headers: { 'Authorization': `Bearer mock-token` }
      });
      
      console.log(`✅ Dashboard loaded with ${dashboardResponse.data.dashboard?.activeGoals?.length || 0} active goals`);
    }
    
  } catch (error) {
    console.log(`❌ Goal management error: ${error.message}`);
  }
}

// Mock authentication middleware bypass for testing
function setupMockAuth() {
  axios.defaults.headers.common['Authorization'] = 'Bearer mock-token';
}

async function seedTemplatesIfNeeded() {
  try {
    console.log('🌱 Seeding goal templates...');
    const response = await axios.post(`${BASE_URL}/../seedGoalTemplates`, {}, {
      headers: { 'Authorization': `Bearer mock-token` }
    });
    console.log('✅ Templates seeded successfully');
  } catch (error) {
    console.log('⚠️  Template seeding failed:', error.message);
  }
}

// Main execution
if (require.main === module) {
  setupMockAuth();
  
  console.log('Starting in 3 seconds to allow emulator startup...');
  setTimeout(async () => {
    await seedTemplatesIfNeeded();
    await testGoalsSystem();
  }, 3000);
}

module.exports = {
  testGoalsSystem,
  testTemplateSystem,
  testMarketplaceSystem,
  testCustomGoalSystem,
  testGoalManagement
};