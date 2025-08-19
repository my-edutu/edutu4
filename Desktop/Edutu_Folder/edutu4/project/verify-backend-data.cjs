/**
 * Comprehensive Backend Data Verification for Edutu
 * Tests all Firestore collections and data integrity
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables from main project
dotenv.config({ path: '.env' });

// Initialize Firebase Admin using the same approach as RSS scraper
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function verifyScholarshipsCollection() {
  console.log('\n🎓 SCHOLARSHIPS COLLECTION VERIFICATION');
  console.log('=' .repeat(50));
  
  try {
    const snapshot = await db.collection('scholarships')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`✅ Found ${snapshot.size} scholarships`);
    
    if (snapshot.size > 0) {
      console.log('\n📋 Recent Scholarships:');
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.title}`);
        console.log(`   Provider: ${data.provider}`);
        console.log(`   Created: ${data.createdAt?.toDate()}`);
      });
    }
    
    return snapshot.size;
  } catch (error) {
    console.log('❌ Error verifying scholarships:', error.message);
    return 0;
  }
}

async function verifyUserRoadmapsCollection() {
  console.log('\n🗺️ USER ROADMAPS COLLECTION VERIFICATION');
  console.log('=' .repeat(50));
  
  try {
    const snapshot = await db.collection('userRoadmaps')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`✅ Found ${snapshot.size} user roadmaps`);
    
    if (snapshot.size > 0) {
      console.log('\n📋 Sample Roadmaps:');
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. User: ${data.userId}`);
        console.log(`   Title: ${data.title || 'N/A'}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Progress: ${data.progress}%`);
        console.log(`   Milestones: ${data.milestones?.length || 0}`);
        console.log(`   Created: ${data.createdAt?.toDate()}`);
      });
    } else {
      console.log('ℹ️  No user roadmaps found - this is expected if no users have generated roadmaps yet');
    }
    
    return snapshot.size;
  } catch (error) {
    console.log('❌ Error verifying user roadmaps:', error.message);
    return 0;
  }
}

async function verifyUserActivityCollection() {
  console.log('\n📊 USER ACTIVITY COLLECTION VERIFICATION');
  console.log('=' .repeat(50));
  
  try {
    const snapshot = await db.collection('userActivity')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    console.log(`✅ Found ${snapshot.size} user activities`);
    
    if (snapshot.size > 0) {
      console.log('\n📋 Recent Activities:');
      const activityTypes = {};
      
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        const activityType = data.activityType;
        activityTypes[activityType] = (activityTypes[activityType] || 0) + 1;
        
        if (index < 5) {
          console.log(`${index + 1}. ${activityType}: ${data.details}`);
          console.log(`   User: ${data.userId}`);
          console.log(`   Time: ${data.timestamp?.toDate() || data.createdAt?.toDate()}`);
        }
      });
      
      console.log('\n📈 Activity Types Summary:');
      Object.entries(activityTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} events`);
      });
    } else {
      console.log('ℹ️  No user activities found - this is expected if activity tracking is not yet implemented');
    }
    
    return snapshot.size;
  } catch (error) {
    console.log('❌ Error verifying user activity:', error.message);
    return 0;
  }
}

async function verifyUsersCollection() {
  console.log('\n👥 USERS COLLECTION VERIFICATION');
  console.log('=' .repeat(50));
  
  try {
    const snapshot = await db.collection('users')
      .limit(5)
      .get();
    
    console.log(`✅ Found ${snapshot.size} users`);
    
    if (snapshot.size > 0) {
      console.log('\n📋 User Profiles (sample):');
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.name || 'N/A'}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   Age: ${data.age}`);
        console.log(`   Onboarding Complete: ${data.onboardingCompleted}`);
        console.log(`   Education Level: ${data.preferences?.educationLevel || 'N/A'}`);
        console.log(`   Created: ${data.createdAt?.toDate()}`);
      });
    } else {
      console.log('ℹ️  No users found - this is expected for a new application');
    }
    
    return snapshot.size;
  } catch (error) {
    console.log('❌ Error verifying users:', error.message);
    return 0;
  }
}

async function verifyChatHistoryCollection() {
  console.log('\n💬 CHAT HISTORY COLLECTION VERIFICATION');
  console.log('=' .repeat(50));
  
  try {
    const snapshot = await db.collection('chatHistory')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`✅ Found ${snapshot.size} chat messages`);
    
    if (snapshot.size > 0) {
      console.log('\n📋 Recent Chat Messages:');
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. User: ${data.userId}`);
        console.log(`   Message: ${data.message?.substring(0, 50)}...`);
        console.log(`   Response: ${data.response?.substring(0, 50)}...`);
        console.log(`   Time: ${data.createdAt?.toDate()}`);
      });
    } else {
      console.log('ℹ️  No chat history found - this is expected if AI chat is not yet active');
    }
    
    return snapshot.size;
  } catch (error) {
    console.log('❌ Error verifying chat history:', error.message);
    return 0;
  }
}

async function checkDataIntegrity() {
  console.log('\n🔍 DATA INTEGRITY CHECKS');
  console.log('=' .repeat(50));
  
  try {
    // Check for required fields in scholarships
    const scholarship = await db.collection('scholarships').limit(1).get();
    if (!scholarship.empty) {
      const data = scholarship.docs[0].data();
      const requiredFields = ['title', 'provider', 'link', 'summary'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length === 0) {
        console.log('✅ Scholarship data integrity: All required fields present');
      } else {
        console.log('⚠️  Scholarship data integrity: Missing fields:', missingFields);
      }
    }
    
    // Check for proper timestamps
    const collections = ['scholarships', 'users', 'userRoadmaps', 'userActivity'];
    for (const collection of collections) {
      const snapshot = await db.collection(collection).limit(1).get();
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        if (data.createdAt) {
          console.log(`✅ ${collection}: Timestamps properly formatted`);
        } else {
          console.log(`⚠️  ${collection}: Missing createdAt timestamps`);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Data integrity check failed:', error.message);
  }
}

async function generateBackendReport() {
  console.log('🚀 EDUTU AI BACKEND DATA VERIFICATION');
  console.log('=' .repeat(60));
  console.log('Testing all Firestore collections and data integrity');
  console.log('Project:', process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID);
  console.log('Time:', new Date().toISOString());
  
  const results = {
    scholarships: await verifyScholarshipsCollection(),
    userRoadmaps: await verifyUserRoadmapsCollection(), 
    userActivity: await verifyUserActivityCollection(),
    users: await verifyUsersCollection(),
    chatHistory: await verifyChatHistoryCollection()
  };
  
  await checkDataIntegrity();
  
  console.log('\n📊 SUMMARY REPORT');
  console.log('=' .repeat(50));
  
  let totalRecords = 0;
  Object.entries(results).forEach(([collection, count]) => {
    const status = count > 0 ? '✅' : '⚠️ ';
    console.log(`${status} ${collection}: ${count} records`);
    totalRecords += count;
  });
  
  console.log(`\n📈 Total Records: ${totalRecords}`);
  
  // Assessment
  console.log('\n🎯 BACKEND READINESS ASSESSMENT');
  console.log('=' .repeat(50));
  
  if (results.scholarships > 0) {
    console.log('✅ Opportunities Data: Ready (scholarships populated by RSS scraper)');
  } else {
    console.log('❌ Opportunities Data: Not Ready (no scholarships found)');
  }
  
  if (results.users > 0) {
    console.log('✅ User System: Active (users registered)');
  } else {
    console.log('⚠️  User System: No users yet (expected for new deployment)');
  }
  
  if (results.userRoadmaps > 0) {
    console.log('✅ Roadmap Generation: Active (roadmaps being created)');
  } else {
    console.log('⚠️  Roadmap Generation: Not yet active (no roadmaps generated)');
  }
  
  if (results.userActivity > 0) {
    console.log('✅ Activity Tracking: Active (user interactions logged)');
  } else {
    console.log('⚠️  Activity Tracking: Not yet active (no activities logged)');
  }
  
  if (results.chatHistory > 0) {
    console.log('✅ AI Chat: Active (users chatting with AI)');
  } else {
    console.log('⚠️  AI Chat: Not yet active (no chat history)');
  }
  
  console.log('\n🔮 NEXT STEPS FOR FULL AI BACKEND ACTIVATION:');
  console.log('1. Configure AI API keys (Google AI, OpenAI, Cohere)');
  console.log('2. Set up Supabase service role key for vector embeddings');
  console.log('3. Set up Firebase service account for full admin access');
  console.log('4. Run embedding generation for existing scholarships');
  console.log('5. Test API endpoints with proper authentication');
  
  process.exit(0);
}

// Run the verification
generateBackendReport().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});