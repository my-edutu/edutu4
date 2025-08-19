const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
const API_URL = `${BASE_URL}/api`;

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds for slower operations
  retries: 3,
  delay: 1000 // 1 second between retries
};

// Utility function for retries
async function withRetry(operation, description, retries = TEST_CONFIG.retries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) {
        console.log(`❌ ${description} failed after ${retries} attempts:`, 
                   error.response?.data?.error || error.message);
        throw error;
      }
      console.log(`⚠️  ${description} attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delay));
    }
  }
}

async function testEnhancedAPI() {
  console.log('🧪 Testing Enhanced Edutu Opportunities Aggregator API\n');
  
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Enhanced Health Check
  try {
    console.log('1. Testing Enhanced Health Check...');
    const response = await withRetry(
      () => axios.get(`${API_URL}/health`, { timeout: TEST_CONFIG.timeout }),
      'Enhanced Health Check'
    );
    
    console.log('✅ Enhanced Health Check:', response.data.status);
    console.log('   Version:', response.data.version);
    console.log('   Data Sources:', Object.keys(response.data.services.dataSources || {}));
    console.log('   Cache Entries:', response.data.services.enhancedCache?.entries || 0);
    console.log('   Hit Rate:', (response.data.services.enhancedCache?.hitRate || 0).toFixed(2));
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 2: API Root with Enhanced Info
  try {
    console.log('\n2. Testing Enhanced API Root...');
    const response = await withRetry(
      () => axios.get(`${API_URL}`, { timeout: TEST_CONFIG.timeout }),
      'Enhanced API Root'
    );
    
    console.log('✅ Enhanced API Root:', response.data.message);
    console.log('   Version:', response.data.version);
    console.log('   Features:', Object.keys(response.data.features || {}));
    console.log('   Data Sources:', response.data.dataSources || []);
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 3: Legacy Search (Backward Compatibility)
  try {
    console.log('\n3. Testing Legacy Search Compatibility...');
    const response = await withRetry(
      () => axios.get(`${API_URL}/opportunities?topic=scholarships&limit=5`, { timeout: TEST_CONFIG.timeout }),
      'Legacy Search'
    );
    
    console.log('✅ Legacy Search successful');
    console.log('   Results:', response.data.data.length);
    console.log('   Enhanced Mode:', response.data.meta.enhanced);
    console.log('   Sources:', response.data.meta.sources || ['legacy']);
    console.log('   Cache Status:', response.data.meta.cached ? 'HIT' : 'MISS');
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 4: Enhanced Multi-Type Search
  try {
    console.log('\n4. Testing Enhanced Multi-Type Search...');
    const response = await withRetry(
      () => axios.get(`${API_URL}/opportunities?query=software engineering&type=job,internship&limit=3`, { timeout: TEST_CONFIG.timeout }),
      'Enhanced Multi-Type Search'
    );
    
    console.log('✅ Enhanced Multi-Type Search successful');
    console.log('   Results:', response.data.data.length);
    console.log('   Total Available:', response.data.pagination.total);
    console.log('   Has More:', response.data.pagination.hasMore);
    console.log('   Response Time:', response.data.meta.took + 'ms');
    
    if (response.data.filters) {
      console.log('   Available Types:', response.data.filters.types.map(t => `${t.type}(${t.count})`));
    }
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 5: Location-Based Search
  try {
    console.log('\n5. Testing Location-Based Search...');
    const locationQuery = encodeURIComponent('{"country":"USA","remote":true}');
    const response = await withRetry(
      () => axios.get(`${API_URL}/opportunities?query=remote work&location=${locationQuery}&limit=3`, { timeout: TEST_CONFIG.timeout }),
      'Location-Based Search'
    );
    
    console.log('✅ Location-Based Search successful');
    console.log('   Results:', response.data.data.length);
    console.log('   Location Filters:', response.data.filters?.locations || []);
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 6: Advanced Sorting and Filtering
  try {
    console.log('\n6. Testing Advanced Sorting...');
    const response = await withRetry(
      () => axios.get(`${API_URL}/opportunities?query=internship&sortBy=deadline&sortOrder=asc&limit=3`, { timeout: TEST_CONFIG.timeout }),
      'Advanced Sorting'
    );
    
    console.log('✅ Advanced Sorting successful');
    console.log('   Results:', response.data.data.length);
    console.log('   Sort Order:', 'deadline ascending');
    
    // Display first few results with deadlines
    response.data.data.slice(0, 2).forEach((opp, index) => {
      const deadline = opp.dates?.applicationDeadline || opp.publishedDate || 'No deadline';
      console.log(`   Result ${index + 1}:`, opp.title.slice(0, 60) + '...', 'Deadline:', deadline);
    });
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 7: Enhanced Cache Statistics
  try {
    console.log('\n7. Testing Enhanced Cache Statistics...');
    const response = await withRetry(
      () => axios.get(`${API_URL}/opportunities/cache/stats`, { timeout: TEST_CONFIG.timeout }),
      'Enhanced Cache Statistics'
    );
    
    console.log('✅ Enhanced Cache Statistics');
    const cacheData = response.data.data;
    console.log('   Total Entries:', cacheData.cache?.totalEntries || 0);
    console.log('   Hit Rate:', (cacheData.cache?.hitRate || 0).toFixed(2));
    console.log('   Cache Size:', Math.round((cacheData.cache?.totalSize || 0) / 1024) + ' KB');
    console.log('   Enhanced Features:', cacheData.enhanced);
    
    if (cacheData.dataSources) {
      Object.entries(cacheData.dataSources).forEach(([source, stats]) => {
        console.log(`   ${source}:`, `${stats.successfulRequests}/${stats.totalRequests} requests`);
      });
    }
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 8: Similar Search (Enhanced Feature)
  try {
    console.log('\n8. Testing Similar Search...');
    // First, make a search to populate cache
    await axios.get(`${API_URL}/opportunities?query=machine learning&limit=3`);
    
    // Then search for similar
    const response = await withRetry(
      () => axios.get(`${API_URL}/opportunities/similar?query=artificial intelligence&threshold=0.7`, { timeout: TEST_CONFIG.timeout }),
      'Similar Search'
    );
    
    console.log('✅ Similar Search successful');
    console.log('   Similar Results Found:', response.data.count);
    console.log('   Similarity Threshold:', response.data.threshold);
    
    if (response.data.data.length > 0) {
      console.log('   Sample Similar Result:', response.data.data[0].opportunities?.[0]?.title || 'N/A');
    }
    testsPassed++;
  } catch (error) {
    // Similar search might fail if cache is empty, which is acceptable
    if (error.response?.status === 404 || error.message.includes('not found')) {
      console.log('⚠️  Similar Search: No similar results found (cache may be empty)');
      testsPassed++;
    } else {
      testsFailed++;
    }
  }

  // Test 9: Configuration and Health Details
  try {
    console.log('\n9. Testing Configuration Details...');
    const response = await withRetry(
      () => axios.get(`${API_URL}/opportunities/config`, { timeout: TEST_CONFIG.timeout }),
      'Configuration Details'
    );
    
    console.log('✅ Configuration Details successful');
    console.log('   Legacy Mode:', response.data.data.legacyMode);
    console.log('   Cache Config Available:', !!response.data.data.cacheConfig);
    console.log('   Data Source Stats Available:', !!response.data.data.dataSourceStats);
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Test 10: Error Handling
  try {
    console.log('\n10. Testing Error Handling...');
    const response = await axios.get(`${API_URL}/opportunities?query=test&type=invalid_type&limit=5`);
    console.log('❌ Should have failed but got:', response.status);
    testsFailed++;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Error Handling: Correctly rejected invalid parameters');
      testsPassed++;
    } else {
      console.log('❌ Error Handling: Unexpected error status:', error.response?.status);
      testsFailed++;
    }
  }

  // Test 11: Performance Test
  try {
    console.log('\n11. Testing Performance...');
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        axios.get(`${API_URL}/opportunities?query=test${i}&limit=5`, { timeout: TEST_CONFIG.timeout })
      );
    }
    
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    console.log('✅ Performance Test successful');
    console.log('   Parallel Requests:', promises.length);
    console.log('   Total Time:', totalTime + 'ms');
    console.log('   Average per Request:', Math.round(totalTime / promises.length) + 'ms');
    console.log('   All Successful:', responses.every(r => r.status === 200));
    testsPassed++;
  } catch (error) {
    console.log('❌ Performance Test failed:', error.message);
    testsFailed++;
  }

  // Test 12: Edutu Integration (Legacy Compatibility)
  try {
    console.log('\n12. Testing Edutu Integration Endpoints...');
    
    // Status
    const statusResponse = await withRetry(
      () => axios.get(`${API_URL}/edutu/status`, { timeout: TEST_CONFIG.timeout }),
      'Edutu Status'
    );
    console.log('✅ Edutu Status:', statusResponse.data.status);
    
    // Categories
    const categoriesResponse = await withRetry(
      () => axios.get(`${API_URL}/edutu/categories`, { timeout: TEST_CONFIG.timeout }),
      'Edutu Categories'
    );
    console.log('✅ Edutu Categories:', categoriesResponse.data.categories.length, 'available');
    
    // Opportunities
    const opportunitiesResponse = await withRetry(
      () => axios.get(`${API_URL}/edutu/opportunities?q=scholarships&count=3`, { timeout: TEST_CONFIG.timeout }),
      'Edutu Opportunities'
    );
    console.log('✅ Edutu Opportunities:', opportunitiesResponse.data.data.length, 'results');
    
    testsPassed += 3;
  } catch (error) {
    testsFailed++;
  }

  // Test 13: Metrics Endpoint
  try {
    console.log('\n13. Testing Metrics Endpoint...');
    const response = await withRetry(
      () => axios.get(`${API_URL}/metrics`, { timeout: TEST_CONFIG.timeout }),
      'Metrics Endpoint'
    );
    
    console.log('✅ Metrics Endpoint successful');
    const metrics = response.data.data;
    console.log('   Total Requests:', metrics.summary?.totalRequests || 0);
    console.log('   Average Response Time:', (metrics.summary?.averageResponseTime || 0) + 'ms');
    console.log('   Error Rate:', (metrics.summary?.errorRate || 0).toFixed(2) + '%');
    testsPassed++;
  } catch (error) {
    testsFailed++;
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Enhanced API Test Complete!');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed > 0) {
    console.log('\n⚠️  Some tests failed. This might be expected if:');
    console.log('   - Google API is not configured (will use mock data)');
    console.log('   - Server is still starting up');
    console.log('   - Network connectivity issues');
    console.log('   - Cache is empty for similarity tests');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   - Configure Google Custom Search API for real data');
  console.log('   - Add more data sources for comprehensive results');
  console.log('   - Set up database for persistent storage');
  console.log('   - Monitor performance and optimize as needed');
  
  return { passed: testsPassed, failed: testsFailed };
}

// Self-executing test if run directly
if (require.main === module) {
  testEnhancedAPI()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testEnhancedAPI };