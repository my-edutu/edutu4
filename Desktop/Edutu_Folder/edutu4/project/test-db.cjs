const admin = require('firebase-admin');
const path = require('path');

// Load service account key
const serviceAccountPath = path.join(__dirname, 'functions', '.env');

try {
  const serviceAccount = require(serviceAccountPath);
  
  // Initialize Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://edutu-ai.firebaseio.com'
    });
  }

  const db = admin.firestore();

  async function checkDatabase() {
    try {
      console.log('🔍 Checking goal templates...');
      const templatesSnapshot = await db.collection('goalTemplates').limit(5).get();
      console.log('Found', templatesSnapshot.size, 'goal templates');
      
      if (templatesSnapshot.size > 0) {
        templatesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log('✅ Template:', {
            id: doc.id,
            title: data.title,
            category: data.category,
            featured: data.featured
          });
        });
      } else {
        console.log('❌ No goal templates found - need to seed templates');
      }

      console.log('\n🔍 Checking marketplace goals...');
      const marketplaceSnapshot = await db.collection('marketplaceGoals').limit(3).get();
      console.log('Found', marketplaceSnapshot.size, 'marketplace goals');

      console.log('\n🔍 Checking user goals...');
      const userGoalsSnapshot = await db.collection('userGoals').limit(3).get();
      console.log('Found', userGoalsSnapshot.size, 'user goals');

    } catch (error) {
      console.error('❌ Error checking database:', error.message);
    }
  }

  checkDatabase().then(() => process.exit());

} catch (error) {
  console.error('❌ Error loading service account:', error.message);
  console.log('Make sure the service account file exists at:', serviceAccountPath);
  process.exit(1);
}