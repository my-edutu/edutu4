const dotenv = require('dotenv');
const { scrapeScholarships, processFeed } = require('./index.js');

// Load environment variables
dotenv.config();

async function testSetup() {
  console.log('🧪 Testing RSS Scraper Setup...\n');

  // Test environment variables
  console.log('1. Checking environment variables...');
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID', 
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('Please check your .env file and ensure all Firebase credentials are set');
    return;
  }
  
  console.log('✅ Environment variables OK');

  // Test single feed processing (non-blocking)
  console.log('\n2. Testing single RSS feed...');
  try {
    const testFeed = { 
      url: 'https://www.scholarshippositions.com/feed/', 
      source: 'Test - Scholarship Positions' 
    };
    
    console.log('Processing test feed (this may take a few minutes)...');
    const result = await processFeed(testFeed);
    console.log(`✅ Test feed processed - New: ${result.newScholarships}, Duplicates: ${result.duplicates}`);
    
  } catch (error) {
    console.error('❌ Test feed failed:', error.message);
    return;
  }

  console.log('\n🎉 Setup test completed successfully!');
  console.log('\nTo run the full scraper:');
  console.log('- Development (one-time): npm run dev');  
  console.log('- Production (continuous): npm start');
  
  process.exit(0);
}

if (require.main === module) {
  testSetup().catch((error) => {
    console.error('❌ Setup test failed:', error);
    process.exit(1);
  });
}

module.exports = testSetup;