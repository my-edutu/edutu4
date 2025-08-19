const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001';
const API_KEY = process.env.API_KEY;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

async function testAPI() {
  console.log('🧪 Testing Edutu API Server...\n');

  try {
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data.status);

    console.log('\n2. Testing GET all opportunities...');
    const getResponse = await apiClient.get('/api/opportunities');
    console.log('✅ GET opportunities:', getResponse.data.success);
    console.log(`   Found ${getResponse.data.count} opportunities`);

    console.log('\n3. Testing POST new opportunity...');
    const newOpportunity = {
      title: 'Test Scholarship',
      description: 'This is a test scholarship for API testing',
      type: 'scholarship',
      organization: 'Test Organization',
      location: 'Remote',
      deadline: '2024-12-31',
      amount: 5000,
      eligibility: 'All students',
      applicationUrl: 'https://example.com/apply',
      tags: ['test', 'scholarship'],
      isActive: true
    };

    const postResponse = await apiClient.post('/api/opportunities', newOpportunity);
    console.log('✅ POST opportunity:', postResponse.data.success);
    const createdId = postResponse.data.data.id;
    console.log(`   Created opportunity with ID: ${createdId}`);

    console.log('\n4. Testing GET opportunity by ID...');
    const getByIdResponse = await apiClient.get(`/api/opportunities/${createdId}`);
    console.log('✅ GET opportunity by ID:', getByIdResponse.data.success);

    console.log('\n5. Testing PUT update opportunity...');
    const updateData = {
      title: 'Updated Test Scholarship',
      amount: 7500
    };
    const putResponse = await apiClient.put(`/api/opportunities/${createdId}`, updateData);
    console.log('✅ PUT opportunity:', putResponse.data.success);

    console.log('\n6. Testing DELETE opportunity...');
    const deleteResponse = await apiClient.delete(`/api/opportunities/${createdId}`);
    console.log('✅ DELETE opportunity:', deleteResponse.data.success);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testAPI();
}

module.exports = testAPI;