/**
 * MCP Server Test Script
 * Tests both local and external MCP connections
 */

import fetch from 'node-fetch';

const LOCAL_MCP_URL = 'http://localhost:3001';

async function testLocalMCPServer() {
  console.log('\n🧪 Testing Local MCP Server...');
  
  try {
    // Test health endpoint
    console.log('📊 Testing health endpoint...');
    const healthResponse = await fetch(`${LOCAL_MCP_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check passed:', health);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
      return false;
    }

    // Test initialization
    console.log('🔧 Testing initialization...');
    const initResponse = await fetch(`${LOCAL_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'initialize',
        params: {
          capabilities: ['code_analysis', 'semantic_search', 'recommendations']
        }
      })
    });
    
    if (initResponse.ok) {
      const init = await initResponse.json();
      console.log('✅ Initialization successful:', init.result);
    } else {
      console.log('❌ Initialization failed:', initResponse.status);
      return false;
    }

    // Test code analysis
    console.log('🔍 Testing code analysis...');
    const analysisResponse = await fetch(`${LOCAL_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'analyze_code',
        params: {
          code: `function greetUser(name) {
  if (!name) return 'Hello, stranger!';
  return \`Hello, \${name}!\`;
}`,
          language: 'javascript'
        }
      })
    });
    
    if (analysisResponse.ok) {
      const analysis = await analysisResponse.json();
      console.log('✅ Code analysis successful:', analysis.result);
    } else {
      console.log('❌ Code analysis failed:', analysisResponse.status);
      return false;
    }

    // Test recommendations
    console.log('💡 Testing recommendations...');
    const recResponse = await fetch(`${LOCAL_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'get_coding_recommendations',
        params: {
          opportunity: 'Frontend Developer Internship',
          skills: ['JavaScript', 'HTML']
        }
      })
    });
    
    if (recResponse.ok) {
      const recommendations = await recResponse.json();
      console.log('✅ Recommendations successful:', recommendations.result);
    } else {
      console.log('❌ Recommendations failed:', recResponse.status);
      return false;
    }

    // Test semantic search
    console.log('🔎 Testing semantic search...');
    const searchResponse = await fetch(`${LOCAL_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'semantic_search',
        params: {
          query: 'React development opportunities',
          context: 'opportunities'
        }
      })
    });
    
    if (searchResponse.ok) {
      const search = await searchResponse.json();
      console.log('✅ Semantic search successful:', search.result);
    } else {
      console.log('❌ Semantic search failed:', searchResponse.status);
      return false;
    }

    console.log('\n🎉 All local MCP server tests passed!');
    return true;

  } catch (error) {
    console.log('❌ Local MCP server test failed:', error.message);
    return false;
  }
}

async function testEdutuMCPIntegration() {
  console.log('\n🧪 Testing Edutu MCP Integration...');
  
  try {
    // Import and test the MCP service
    const { mcpService } = await import('./src/services/mcpService.ts');
    
    // Test initialization
    console.log('🔧 Testing MCP service initialization...');
    const initialized = await mcpService.initialize();
    console.log('✅ MCP service initialized:', initialized);
    
    // Test status
    const status = mcpService.getStatus();
    console.log('📊 MCP service status:', status);
    
    // Test code analysis
    console.log('🔍 Testing code analysis integration...');
    const analysis = await mcpService.analyzeCode(`
      function calculateMatch(user, opportunity) {
        return user.skills.filter(skill => 
          opportunity.requirements.includes(skill)
        ).length / user.skills.length * 100;
      }
    `, 'javascript');
    console.log('✅ Code analysis integration:', analysis);
    
    // Test recommendations
    console.log('💡 Testing recommendations integration...');
    const recommendations = await mcpService.getCodingRecommendations(
      'Machine Learning Engineer Position',
      ['Python', 'JavaScript']
    );
    console.log('✅ Recommendations integration:', recommendations);
    
    console.log('\n🎉 Edutu MCP integration tests passed!');
    return true;
    
  } catch (error) {
    console.log('❌ Edutu MCP integration test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting MCP Test Suite...');
  
  const localTest = await testLocalMCPServer();
  const integrationTest = await testEdutuMCPIntegration();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Local MCP Server: ${localTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Edutu Integration: ${integrationTest ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = localTest && integrationTest;
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runAllTests, testLocalMCPServer, testEdutuMCPIntegration };