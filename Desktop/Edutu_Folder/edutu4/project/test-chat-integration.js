/**
 * Quick Test Script for AI Chat Integration
 * Verifies that chat is working with real AI responses
 */

import axios from 'axios';

const BASE_URL = 'https://us-central1-edutu-3.cloudfunctions.net';
const TEST_MESSAGES = [
  'Hello, I need help finding scholarships',
  'What career advice do you have for a CS student?',
  'Can you help me learn Python programming?',
  'I want to study abroad, what opportunities are available?'
];

async function testChatEndpoint() {
  console.log('🧪 Testing Edutu AI Chat Integration...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Health Check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/healthCheck`, { timeout: 10000 });
    if (response.status === 200) {
      console.log('✅ Health check passed');
      passedTests++;
    } else {
      console.log(`❌ Health check failed with status ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
  totalTests++;
  
  // Test 2: Simple Chat Endpoint
  console.log('\n2️⃣ Testing simple chat endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/simpleChat`, {
      message: 'Hello, this is a test message',
      userId: 'test-user-123'
    }, { timeout: 30000 });
    
    if (response.status === 200 && response.data.success && response.data.response) {
      console.log('✅ Simple chat endpoint working');
      console.log(`📝 Response preview: "${response.data.response.substring(0, 100)}..."`);
      
      // Check if it's a real AI response (not mock)
      const responseText = response.data.response.toLowerCase();
      const hasAiIndicators = responseText.includes('edutu') || 
                             responseText.includes('scholarship') || 
                             responseText.includes('career') ||
                             responseText.includes('help');
      
      if (hasAiIndicators) {
        console.log('✅ Response appears to be from AI (contains relevant keywords)');
        passedTests++;
      } else {
        console.log('⚠️ Response might be generic fallback');
      }
    } else {
      console.log(`❌ Simple chat failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.log(`❌ Simple chat failed: ${error.message}`);
    if (error.response) {
      console.log(`📄 Error response: ${JSON.stringify(error.response.data)}`);
    }
  }
  totalTests++;
  
  // Test 3: Multiple Message Types
  console.log('\n3️⃣ Testing different message types...');
  let messageTestsPassed = 0;
  
  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    const message = TEST_MESSAGES[i];
    console.log(`\n   Testing: "${message}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/simpleChat`, {
        message: message,
        userId: 'test-user-123',
        userContext: { name: 'Test User', age: 22 }
      }, { timeout: 30000 });
      
      if (response.status === 200 && response.data.success && response.data.response) {
        console.log(`   ✅ Response received (${response.data.response.length} chars)`);
        
        // Check if response is contextually relevant
        const responseText = response.data.response.toLowerCase();
        const messageText = message.toLowerCase();
        
        let isRelevant = false;
        if (messageText.includes('scholarship') && responseText.includes('scholarship')) {
          isRelevant = true;
        } else if (messageText.includes('career') && responseText.includes('career')) {
          isRelevant = true;
        } else if (messageText.includes('python') && responseText.includes('python')) {
          isRelevant = true;
        } else if (messageText.includes('study abroad') && responseText.includes('abroad')) {
          isRelevant = true;
        }
        
        if (isRelevant) {
          console.log('   ✅ Response is contextually relevant');
          messageTestsPassed++;
        } else {
          console.log('   ⚠️ Response may not be contextually relevant');
          console.log(`   📝 Response: "${response.data.response.substring(0, 150)}..."`);
        }
      } else {
        console.log(`   ❌ Invalid response format`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (messageTestsPassed >= TEST_MESSAGES.length / 2) {
    console.log(`\n✅ Message type tests passed (${messageTestsPassed}/${TEST_MESSAGES.length})`);
    passedTests++;
  } else {
    console.log(`\n❌ Message type tests failed (${messageTestsPassed}/${TEST_MESSAGES.length})`);
  }
  totalTests++;
  
  // Test 4: Complex API Endpoint (fallback)
  console.log('\n4️⃣ Testing complex chat API endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
      message: 'Hello from complex endpoint',
      userId: 'test-user-123'
    }, { timeout: 30000 });
    
    if (response.status === 200) {
      console.log('✅ Complex chat endpoint accessible');
      passedTests++;
    } else {
      console.log(`⚠️ Complex chat endpoint returned status ${response.status}`);
    }
  } catch (error) {
    console.log(`⚠️ Complex chat endpoint not working: ${error.message}`);
    console.log('   (This is expected if the complex router isn\'t deployed yet)');
  }
  totalTests++;
  
  // Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests >= 3) {
    console.log('\n🎉 SUCCESS: AI Chat is working properly!');
    console.log('✨ Your users should now receive real AI responses.');
    console.log('\n📱 Next steps:');
    console.log('1. Open your Edutu frontend application');
    console.log('2. Navigate to the chat feature');
    console.log('3. Send messages and verify you get intelligent responses');
    console.log('4. Check that responses mention specific opportunities/advice');
    
    return true;
  } else {
    console.log('\n❌ FAILURE: AI Chat needs attention');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check Firebase Functions logs: firebase functions:log --project=edutu-3');
    console.log('2. Verify API keys are set: firebase functions:config:get --project=edutu-3');
    console.log('3. Ensure functions are deployed: firebase functions:list --project=edutu-3');
    console.log('4. Test individual endpoints with curl');
    
    return false;
  }
}

// Run the test
testChatEndpoint()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test script crashed:', error.message);
    process.exit(1);
  });