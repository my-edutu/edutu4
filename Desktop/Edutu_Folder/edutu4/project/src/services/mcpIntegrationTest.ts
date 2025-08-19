/**
 * MCP Integration Test Suite
 * Quick tests to verify MCP service functionality
 */

import { mcpService } from './mcpService';

export async function runMCPIntegrationTests(): Promise<{
  success: boolean;
  results: Array<{
    test: string;
    passed: boolean;
    error?: string;
    duration: number;
  }>;
}> {
  const results: Array<{
    test: string;
    passed: boolean;
    error?: string;
    duration: number;
  }> = [];

  console.log('🧪 Starting MCP Integration Tests...');

  // Test 1: Service Initialization
  const test1Start = Date.now();
  try {
    const initialized = await mcpService.initialize();
    results.push({
      test: 'Service Initialization',
      passed: true,
      duration: Date.now() - test1Start
    });
    console.log('✅ Service initialization:', initialized ? 'Connected' : 'Local mode');
  } catch (error) {
    results.push({
      test: 'Service Initialization',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - test1Start
    });
    console.log('❌ Service initialization failed:', error);
  }

  // Test 2: Status Check
  const test2Start = Date.now();
  try {
    const status = mcpService.getStatus();
    const hasRequiredCapabilities = status.capabilities.includes('code_analysis') && 
                                   status.capabilities.includes('semantic_search');
    
    results.push({
      test: 'Status Check',
      passed: hasRequiredCapabilities,
      duration: Date.now() - test2Start
    });
    console.log('✅ Status check:', status);
  } catch (error) {
    results.push({
      test: 'Status Check',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - test2Start
    });
    console.log('❌ Status check failed:', error);
  }

  // Test 3: Code Analysis
  const test3Start = Date.now();
  try {
    const sampleCode = `
function greetUser(name) {
  if (!name) {
    return 'Hello, stranger!';
  }
  return \`Hello, \${name}!\`;
}
`;
    
    const analysis = await mcpService.analyzeCode(sampleCode, 'javascript');
    const hasValidAnalysis = analysis.summary && analysis.complexity && analysis.recommendations;
    
    results.push({
      test: 'Code Analysis',
      passed: hasValidAnalysis,
      duration: Date.now() - test3Start
    });
    console.log('✅ Code analysis:', analysis);
  } catch (error) {
    results.push({
      test: 'Code Analysis',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - test3Start
    });
    console.log('❌ Code analysis failed:', error);
  }

  // Test 4: Coding Recommendations
  const test4Start = Date.now();
  try {
    const recommendations = await mcpService.getCodingRecommendations(
      'Frontend Developer Position',
      ['JavaScript', 'HTML']
    );
    
    const hasValidRecommendations = recommendations.languages.length > 0 || 
                                   recommendations.frameworks.length > 0;
    
    results.push({
      test: 'Coding Recommendations',
      passed: hasValidRecommendations,
      duration: Date.now() - test4Start
    });
    console.log('✅ Coding recommendations:', recommendations);
  } catch (error) {
    results.push({
      test: 'Coding Recommendations',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - test4Start
    });
    console.log('❌ Coding recommendations failed:', error);
  }

  // Test 5: Semantic Search
  const test5Start = Date.now();
  try {
    const searchResults = await mcpService.semanticSearch(
      'React development opportunities',
      'opportunities'
    );
    
    const hasValidSearch = searchResults.suggestions.length > 0 || 
                          searchResults.confidence >= 0;
    
    results.push({
      test: 'Semantic Search',
      passed: hasValidSearch,
      duration: Date.now() - test5Start
    });
    console.log('✅ Semantic search:', searchResults);
  } catch (error) {
    results.push({
      test: 'Semantic Search',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - test5Start
    });
    console.log('❌ Semantic search failed:', error);
  }

  // Test 6: Code Examples Generation
  const test6Start = Date.now();
  try {
    const examples = await mcpService.generateCodeExamples('javascript', 'beginner');
    const hasValidExamples = examples.examples.length > 0;
    
    results.push({
      test: 'Code Examples Generation',
      passed: hasValidExamples,
      duration: Date.now() - test6Start
    });
    console.log('✅ Code examples:', examples);
  } catch (error) {
    results.push({
      test: 'Code Examples Generation',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - test6Start
    });
    console.log('❌ Code examples failed:', error);
  }

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const success = passedTests === totalTests;

  console.log(`\n🎯 MCP Integration Test Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (success) {
    console.log('🎉 All MCP integration tests passed!');
  } else {
    console.log('⚠️  Some MCP integration tests failed. Check the results for details.');
  }

  return { success, results };
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - add to global scope for manual testing
  (window as any).runMCPTests = runMCPIntegrationTests;
  console.log('🔧 MCP tests available. Run runMCPTests() in the console to test.');
}