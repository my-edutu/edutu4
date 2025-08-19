const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

async function testAPI() {
  console.log('🧪 Testing Edutu Opportunities Aggregator API\n');

  // Test 1: Health Check
  try {
    console.log('1. Testing Health Check...');
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Health Check:', response.data.status);
    console.log('   Services:', JSON.stringify(response.data.services, null, 2));
  } catch (error) {
    console.log('❌ Health Check failed:', error.response?.data || error.message);
  }

  // Test 2: API Root
  try {
    console.log('\n2. Testing API Root...');
    const response = await axios.get(`${API_URL}`);
    console.log('✅ API Root:', response.data.message);
    console.log('   Endpoints:', Object.keys(response.data.endpoints));
  } catch (error) {
    console.log('❌ API Root failed:', error.response?.data || error.message);
  }

  // Test 3: API Documentation
  try {
    console.log('\n3. Testing API Documentation...');
    const response = await axios.get(`${API_URL}/docs`);
    console.log('✅ API Docs:', response.data.title);
    console.log('   Available endpoints:', response.data.endpoints.length);
  } catch (error) {
    console.log('❌ API Docs failed:', error.response?.data || error.message);
  }

  // Test 4: Opportunities Search - Missing topic
  try {
    console.log('\n4. Testing Opportunities Search (no topic - should fail)...');
    const response = await axios.get(`${API_URL}/opportunities`);
    console.log('❌ Should have failed but got:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected request without topic:', error.response.data.error);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 5: Opportunities Search - Valid request
  try {
    console.log('\n5. Testing Opportunities Search (with topic)...');
    const response = await axios.get(`${API_URL}/opportunities?topic=scholarships&limit=5`);
    console.log('✅ Opportunities Search successful');
    console.log('   Results:', response.data.data.length);
    console.log('   Cached:', response.data.meta.cached);
    console.log('   Sample result:', response.data.data[0]?.title);
  } catch (error) {
    console.log('❌ Opportunities Search failed:', error.response?.data || error.message);
  }

  // Test 6: Cache Stats
  try {
    console.log('\n6. Testing Cache Stats...');
    const response = await axios.get(`${API_URL}/opportunities/cache/stats`);
    console.log('✅ Cache Stats:', `${response.data.data.size} entries`);
  } catch (error) {
    console.log('❌ Cache Stats failed:', error.response?.data || error.message);
  }

  // Test 7: Test different topics
  const topics = ['internships', 'fellowships', 'grants'];
  for (const topic of topics) {
    try {
      console.log(`\n7. Testing topic: ${topic}...`);
      const response = await axios.get(`${API_URL}/opportunities?topic=${topic}&limit=3`);
      console.log(`✅ ${topic}: ${response.data.data.length} results`);
    } catch (error) {
      console.log(`❌ ${topic} failed:`, error.response?.data?.error || error.message);
    }
  }

  // Test 8: Test invalid parameters
  try {
    console.log('\n8. Testing invalid limit parameter...');
    const response = await axios.get(`${API_URL}/opportunities?topic=test&limit=invalid`);
    console.log('❌ Should have failed but got:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected invalid limit parameter');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 9: Edutu Integration Endpoints
  try {
    console.log('\n9. Testing Edutu Integration - Status...');
    const response = await axios.get(`${API_URL}/edutu/status`);
    console.log('✅ Edutu Status:', response.data.status);
  } catch (error) {
    console.log('❌ Edutu Status failed:', error.response?.data || error.message);
  }

  try {
    console.log('\n10. Testing Edutu Integration - Categories...');
    const response = await axios.get(`${API_URL}/edutu/categories`);
    console.log('✅ Edutu Categories:', response.data.categories.length, 'categories available');
  } catch (error) {
    console.log('❌ Edutu Categories failed:', error.response?.data || error.message);
  }

  try {
    console.log('\n11. Testing Edutu Integration - Opportunities...');
    const response = await axios.get(`${API_URL}/edutu/opportunities?q=scholarships&count=5`);
    console.log('✅ Edutu Opportunities:', response.data.data.length, 'results found');
  } catch (error) {
    console.log('❌ Edutu Opportunities failed:', error.response?.data || error.message);
  }

  // Test 12: Metrics
  try {
    console.log('\n12. Testing Metrics...');
    const response = await axios.get(`${API_URL}/metrics`);
    console.log('✅ Metrics:', `${response.data.data.summary.totalRequests} total requests`);
    console.log('   Average response time:', response.data.data.summary.averageResponseTime + 'ms');
  } catch (error) {
    console.log('❌ Metrics failed:', error.response?.data || error.message);
  }

  console.log('\n🏁 API Test Complete!');
}

if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = { testAPI };