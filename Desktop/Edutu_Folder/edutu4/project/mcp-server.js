/**
 * Basic MCP Server for Edutu
 * Provides semantic code analysis and enhanced AI capabilities
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Tool Implementation Functions
function analyzeCode(code, language) {
  const lines = code.split('\n').length;
  const complexity = lines > 100 ? 'high' : lines > 50 ? 'medium' : 'low';
  
  // Basic static analysis
  const hasComments = /\/\*[\s\S]*?\*\/|\/\/.*$/gm.test(code);
  const hasErrorHandling = /try\s*{|catch\s*\(|throw\s+/gm.test(code);
  const functionCount = (code.match(/function\s+\w+|=>\s*{|=>\s*\w/g) || []).length;
  
  const recommendations = [];
  if (!hasComments) recommendations.push('Add comments to improve code readability');
  if (!hasErrorHandling) recommendations.push('Add error handling for better reliability');
  if (functionCount > 10) recommendations.push('Consider breaking down into smaller modules');
  if (lines > 200) recommendations.push('Consider splitting large files');
  
  const codeQuality = Math.min(95, Math.max(40, 
    85 - (lines > 100 ? 20 : 0) + 
    (hasComments ? 10 : 0) + 
    (hasErrorHandling ? 5 : 0)
  ));

  return {
    summary: `${language} code with ${lines} lines and ${functionCount} functions`,
    complexity,
    recommendations,
    dependencies: extractDependencies(code),
    codeQuality,
    metrics: {
      lines,
      functions: functionCount,
      hasComments,
      hasErrorHandling
    }
  };
}

function getCodingRecommendations(opportunityTitle, userSkills) {
  const title = opportunityTitle.toLowerCase();
  const skills = userSkills.map(s => s.toLowerCase());
  
  const recommendations = {
    languages: [],
    frameworks: [],
    learningPath: [],
    projects: []
  };

  // AI/ML opportunities
  if (title.includes('ai') || title.includes('machine learning') || title.includes('data science')) {
    recommendations.languages.push('Python', 'R', 'SQL');
    recommendations.frameworks.push('TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas');
    recommendations.projects.push('ML Model Development', 'Data Analysis Dashboard', 'AI Chatbot');
  }

  // Web Development
  if (title.includes('web') || title.includes('frontend') || title.includes('fullstack')) {
    recommendations.languages.push('JavaScript', 'TypeScript', 'HTML', 'CSS');
    recommendations.frameworks.push('React', 'Vue.js', 'Angular', 'Node.js');
    recommendations.projects.push('Portfolio Website', 'E-commerce Platform', 'Web Application');
  }

  // Backend Development
  if (title.includes('backend') || title.includes('api') || title.includes('server')) {
    recommendations.languages.push('JavaScript', 'Python', 'Java', 'Go');
    recommendations.frameworks.push('Express.js', 'FastAPI', 'Spring Boot', 'Django');
    recommendations.projects.push('REST API', 'Microservices', 'Database Design');
  }

  // Mobile Development
  if (title.includes('mobile') || title.includes('ios') || title.includes('android')) {
    recommendations.languages.push('Swift', 'Kotlin', 'JavaScript', 'Dart');
    recommendations.frameworks.push('React Native', 'Flutter', 'Xamarin');
    recommendations.projects.push('Mobile App', 'Cross-platform App', 'Native iOS/Android App');
  }

  // Cloud/DevOps
  if (title.includes('cloud') || title.includes('devops') || title.includes('infrastructure')) {
    recommendations.languages.push('Python', 'Bash', 'YAML', 'Terraform');
    recommendations.frameworks.push('AWS', 'Azure', 'Docker', 'Kubernetes');
    recommendations.projects.push('CI/CD Pipeline', 'Cloud Infrastructure', 'Monitoring System');
  }

  // Default recommendations if nothing specific matches
  if (recommendations.languages.length === 0) {
    recommendations.languages.push('JavaScript', 'Python');
    recommendations.frameworks.push('React', 'Node.js');
    recommendations.projects.push('Personal Portfolio', 'API Project');
  }

  // Generate learning path based on current skills and opportunity
  recommendations.learningPath = generateLearningPath(recommendations.languages, skills);

  return recommendations;
}

function performSemanticSearch(query, context) {
  const confidence = Math.random() * 0.3 + 0.7; // Random confidence between 0.7-1.0
  
  const suggestions = [];
  const queryWords = query.toLowerCase().split(' ');
  
  // Generate contextual suggestions
  if (context === 'opportunities') {
    suggestions.push(`Explore ${queryWords[0]} internships`);
    suggestions.push(`Related ${queryWords[0]} scholarships`);
    suggestions.push(`${queryWords[0]} certification programs`);
  } else if (context === 'skills') {
    suggestions.push(`Learn ${queryWords[0]} fundamentals`);
    suggestions.push(`${queryWords[0]} project ideas`);
    suggestions.push(`${queryWords[0]} career paths`);
  }

  // Add query variations
  suggestions.push(`Try "${query}" with filters`);
  suggestions.push(`Advanced ${query} opportunities`);

  return {
    results: [], // In a real implementation, this would contain actual search results
    suggestions: suggestions.slice(0, 5),
    confidence: Math.round(confidence * 100) / 100,
    queryAnalysis: {
      intent: inferIntent(query),
      entities: extractEntities(query),
      complexity: queryWords.length > 5 ? 'complex' : 'simple'
    }
  };
}

// Helper Functions
function extractDependencies(code) {
  const dependencies = [];
  
  // Extract ES6 imports
  const importMatches = code.match(/import.*from\s+['"`]([^'"`]+)['"`]/g) || [];
  importMatches.forEach(match => {
    const dep = match.match(/from\s+['"`]([^'"`]+)['"`]/);
    if (dep) dependencies.push(dep[1]);
  });

  // Extract require statements
  const requireMatches = code.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
  requireMatches.forEach(match => {
    const dep = match.match(/require\(['"`]([^'"`]+)['"`]\)/);
    if (dep) dependencies.push(dep[1]);
  });

  return [...new Set(dependencies)];
}

function generateLearningPath(recommendedLanguages, currentSkills) {
  const path = ['Review fundamentals'];
  
  if (currentSkills.length === 0) {
    path.push('Start with basics', 'Build practice projects');
  } else {
    path.push('Expand current skills', 'Learn complementary technologies');
  }
  
  path.push('Create portfolio projects', 'Contribute to open source', 'Apply to opportunities');
  
  return path;
}

function inferIntent(query) {
  if (query.includes('learn') || query.includes('tutorial')) return 'learning';
  if (query.includes('job') || query.includes('career')) return 'career';
  if (query.includes('project') || query.includes('build')) return 'project';
  return 'general';
}

function extractEntities(query) {
  const technologies = ['javascript', 'python', 'react', 'node', 'java', 'go', 'rust', 'ai', 'ml'];
  const entities = [];
  
  technologies.forEach(tech => {
    if (query.toLowerCase().includes(tech)) {
      entities.push({ type: 'technology', value: tech });
    }
  });
  
  return entities;
}

// Express HTTP endpoints for non-MCP clients
app.post('/mcp', async (req, res) => {
  try {
    const { method, params = {} } = req.body;
    
    switch (method) {
      case 'initialize':
        res.json({
          result: {
            capabilities: ['code_analysis', 'semantic_search', 'recommendations', 'example_generation'],
            serverInfo: {
              name: "edutu-mcp-server",
              version: "1.0.0"
            }
          }
        });
        break;
        
      case 'analyze_code':
        const analysis = analyzeCode(params.code, params.language);
        res.json({ result: analysis });
        break;
        
      case 'get_coding_recommendations':
        const recommendations = getCodingRecommendations(params.opportunity, params.skills);
        res.json({ result: recommendations });
        break;
        
      case 'semantic_search':
        const searchResults = performSemanticSearch(params.query, params.context);
        res.json({ result: searchResults });
        break;
        
      case 'generate_examples':
        res.json({
          result: {
            examples: [{
              title: `${params.skill} Example`,
              code: `// ${params.skill} example for ${params.level} level\nconsole.log('Hello from ${params.skill}!');`,
              explanation: `Basic ${params.skill} example demonstrating core concepts`,
              difficulty: params.level
            }]
          }
        });
        break;
        
      default:
        res.status(400).json({
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        });
    }
  } catch (error) {
    res.status(500).json({
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    capabilities: ['code_analysis', 'semantic_search', 'recommendations', 'example_generation']
  });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`✅ MCP Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// No MCP server export needed for simple HTTP server