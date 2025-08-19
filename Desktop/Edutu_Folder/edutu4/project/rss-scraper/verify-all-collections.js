const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
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
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function verifyAllCollections() {
  console.log('🚀 EDUTU AI BACKEND - COMPLETE FIRESTORE VERIFICATION');
  console.log('=' .repeat(60));
  console.log(`Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log();

  const collections = [
    'scholarships',
    'users', 
    'userRoadmaps',
    'userActivity',
    'chatHistory'
  ];

  const results = {};

  for (const collectionName of collections) {
    console.log(`🔍 Checking ${collectionName} collection...`);
    
    try {
      let query = db.collection(collectionName);
      
      // Add appropriate ordering if the field exists
      if (collectionName === 'scholarships') {
        query = query.orderBy('createdAt', 'desc');
      } else if (collectionName === 'userActivity') {
        // userActivity might use 'timestamp' instead of 'createdAt'
        try {
          query = query.orderBy('timestamp', 'desc');
        } catch {
          // If timestamp doesn't exist, try createdAt
          try {
            query = query.orderBy('createdAt', 'desc'); 
          } catch {
            // If neither exists, just limit without ordering
            query = query;
          }
        }
      } else if (collectionName !== 'users') {
        // For other collections, try to order by createdAt if it exists
        try {
          query = query.orderBy('createdAt', 'desc');
        } catch {
          // If createdAt doesn't exist, just proceed without ordering
          query = query;
        }
      }
      
      const snapshot = await query.limit(10).get();
      results[collectionName] = snapshot.size;
      
      console.log(`   📊 Found ${snapshot.size} documents`);
      
      if (snapshot.size > 0) {
        console.log('   📋 Sample documents:');
        let count = 0;
        snapshot.forEach(doc => {
          if (count < 3) {
            const data = doc.data();
            console.log(`   ${count + 1}. ID: ${doc.id}`);
            
            // Show relevant fields based on collection type
            if (collectionName === 'scholarships') {
              console.log(`      Title: ${data.title || 'N/A'}`);
              console.log(`      Provider: ${data.provider || 'N/A'}`);
              console.log(`      Created: ${data.createdAt?.toDate() || 'N/A'}`);
            } else if (collectionName === 'users') {
              console.log(`      Name: ${data.name || 'N/A'}`);
              console.log(`      Email: ${data.email || 'N/A'}`);
              console.log(`      Onboarding: ${data.onboardingCompleted ? 'Complete' : 'Incomplete'}`);
            } else if (collectionName === 'userRoadmaps') {
              console.log(`      User ID: ${data.userId || 'N/A'}`);
              console.log(`      Status: ${data.status || 'N/A'}`);
              console.log(`      Progress: ${data.progress || 0}%`);
              console.log(`      Milestones: ${data.milestones?.length || 0}`);
            } else if (collectionName === 'userActivity') {
              console.log(`      User ID: ${data.userId || 'N/A'}`);
              console.log(`      Activity Type: ${data.activityType || 'N/A'}`);
              console.log(`      Details: ${data.details || 'N/A'}`);
            } else if (collectionName === 'chatHistory') {
              console.log(`      User ID: ${data.userId || 'N/A'}`);
              console.log(`      Message: ${data.message?.substring(0, 50) || 'N/A'}...`);
              console.log(`      Response: ${data.response?.substring(0, 50) || 'N/A'}...`);
            }
            count++;
          }
        });
      } else {
        console.log('   ℹ️  No documents found (expected for unused collections)');
      }
      
    } catch (error) {
      console.log(`   ❌ Error accessing ${collectionName}:`, error.message);
      results[collectionName] = -1; // Mark as error
    }
    
    console.log(); // Empty line between collections
  }

  // Summary Report
  console.log('📊 SUMMARY REPORT');
  console.log('=' .repeat(40));
  
  let totalRecords = 0;
  let activeCollections = 0;
  let errorCollections = 0;
  
  Object.entries(results).forEach(([collection, count]) => {
    let status;
    if (count > 0) {
      status = '✅ Active';
      activeCollections++;
      totalRecords += count;
    } else if (count === 0) {
      status = '⚠️  Empty';
    } else {
      status = '❌ Error';
      errorCollections++;
    }
    
    console.log(`${status.padEnd(10)} ${collection}: ${count >= 0 ? count : 'Error'} records`);
  });
  
  console.log();
  console.log(`📈 Total Records: ${totalRecords}`);
  console.log(`🟢 Active Collections: ${activeCollections}/${collections.length}`);
  if (errorCollections > 0) {
    console.log(`🔴 Collections with Errors: ${errorCollections}`);
  }

  // AI Backend Readiness Assessment  
  console.log();
  console.log('🎯 AI BACKEND READINESS ASSESSMENT');
  console.log('=' .repeat(40));
  
  if (results.scholarships > 0) {
    console.log('✅ Data Source: Ready (RSS scraper populating opportunities)');
  } else {
    console.log('❌ Data Source: Not ready (no opportunities found)');
  }
  
  if (results.users > 0) {
    console.log('✅ User Management: Active (users registered)');
  } else {
    console.log('⚠️  User Management: No users yet');
  }
  
  if (results.userRoadmaps > 0) {
    console.log('✅ Roadmap System: Active (AI generating roadmaps)');
  } else {
    console.log('⚠️  Roadmap System: Not active yet (no AI-generated roadmaps)');
  }
  
  if (results.userActivity > 0) {
    console.log('✅ Learning Loop: Active (tracking user interactions)');
  } else {
    console.log('⚠️  Learning Loop: Not active yet (no activity tracking)');
  }
  
  if (results.chatHistory > 0) {
    console.log('✅ AI Chat: Active (users interacting with AI assistant)');
  } else {
    console.log('⚠️  AI Chat: Not active yet (no chat interactions)');
  }

  console.log();
  console.log('🔧 NEXT STEPS TO COMPLETE AI BACKEND:');
  console.log('1. 🔑 Configure AI API keys (Google AI, OpenAI, Cohere)');
  console.log('2. 🗄️  Set up Supabase vector database with embeddings');  
  console.log('3. 🚀 Start AI backend server (npm start in ai-backend/)');
  console.log('4. 📊 Generate embeddings for existing opportunities');
  console.log('5. 🧪 Test API endpoints for recommendations and chat');
  console.log('6. 📱 Connect frontend to AI backend services');

  process.exit(0);
}

// Run verification
verifyAllCollections().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});