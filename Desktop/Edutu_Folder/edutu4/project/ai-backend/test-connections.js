/**
 * Simple connection test for Edutu AI Backend
 */

require('dotenv').config();
console.log('Starting connection tests...');

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    console.log('\n1. Testing Firebase connection...');
    
    // Check if environment variables are present
    console.log('   Firebase Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('   Firebase Client Email:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set');
    console.log('   Firebase Private Key:', process.env.FIREBASE_PRIVATE_KEY ? 'Set (partial)' : 'Not set');
    
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.log('   ❌ Firebase project ID not configured');
      return false;
    }
    
    if (process.env.FIREBASE_PRIVATE_KEY === 'PLACEHOLDER_PRIVATE_KEY') {
      console.log('   ⚠️  Firebase private key is placeholder - cannot test connection');
      return false;
    }
    
    // If we have proper credentials, try to connect
    const admin = require('firebase-admin');
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    const db = admin.firestore();
    const snapshot = await db.collection('scholarships').limit(1).get();
    console.log('   ✅ Firebase connection successful');
    console.log('   📊 Found', snapshot.size, 'scholarship documents');
    return true;
    
  } catch (error) {
    console.log('   ❌ Firebase connection failed:', error.message);
    return false;
  }
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('\n2. Testing Supabase connection...');
    
    // Check environment variables
    console.log('   Supabase URL:', process.env.SUPABASE_URL);
    console.log('   Supabase Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('   ❌ Supabase credentials not configured');
      return false;
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Test basic connection
    const { data, error } = await supabase.from('scholarships_embeddings').select('count').limit(1);
    
    if (error) {
      console.log('   ❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('   ✅ Supabase connection successful');
    
    // Check for embeddings table
    const { data: embeddingData, error: embeddingError } = await supabase
      .from('scholarships_embeddings')
      .select('count', { count: 'exact' });
    
    if (!embeddingError) {
      console.log('   📊 Found', embeddingData?.[0]?.count || 0, 'scholarship embeddings');
    } else {
      console.log('   ⚠️  Embeddings table not found or accessible:', embeddingError.message);
    }
    
    return true;
    
  } catch (error) {
    console.log('   ❌ Supabase connection failed:', error.message);
    return false;
  }
}

// Test AI services (without actual API calls)
async function testAIServiceConfiguration() {
  console.log('\n3. Testing AI service configuration...');
  
  const services = {
    'Google AI (Gemini)': process.env.GOOGLE_AI_API_KEY,
    'OpenAI': process.env.OPENAI_API_KEY,
    'Cohere': process.env.COHERE_API_KEY
  };
  
  let configuredServices = 0;
  
  Object.entries(services).forEach(([name, key]) => {
    if (key && key !== `PLACEHOLDER_${name.toUpperCase().replace(/[^A-Z]/g, '_')}_KEY`) {
      console.log(`   ✅ ${name}: Configured`);
      configuredServices++;
    } else {
      console.log(`   ❌ ${name}: Not configured`);
    }
  });
  
  console.log(`   📊 ${configuredServices}/3 AI services configured`);
  
  return configuredServices > 0;
}

// Check existing scholarship data
async function checkScholarshipData() {
  try {
    console.log('\n4. Checking existing scholarship data...');
    
    // Use the same verification as the RSS scraper
    const admin = require('firebase-admin');
    const db = admin.firestore();
    
    const snapshot = await db.collection('scholarships')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`   📊 Found ${snapshot.size} recent scholarships`);
    
    if (snapshot.size > 0) {
      console.log('   📝 Sample scholarship titles:');
      let count = 0;
      snapshot.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`      - ${data.title}`);
          count++;
        }
      });
    }
    
    return snapshot.size > 0;
    
  } catch (error) {
    console.log('   ❌ Could not check scholarship data:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('Edutu AI Backend Connection Tests');
  console.log('='.repeat(60));
  
  const results = {};
  
  results.firebase = await testFirebaseConnection();
  results.supabase = await testSupabaseConnection();
  results.aiConfig = await testAIServiceConfiguration();
  
  if (results.firebase) {
    results.data = await checkScholarshipData();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === 0) {
    console.log('\n⚠️  No services are properly configured. Please check your .env file.');
  } else if (passedTests < totalTests) {
    console.log('\n⚠️  Some services are not configured. AI features may be limited.');
  } else {
    console.log('\n🎉 All services are properly configured and ready!');
  }
  
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});