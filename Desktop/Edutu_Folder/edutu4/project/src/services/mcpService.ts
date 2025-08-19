/**
 * MCP (Model Context Protocol) Service for Edutu
 * Provides semantic code analysis and enhanced AI capabilities
 * Inspired by Serena MCP server architecture
 */

import { auth } from '../config/firebase';

// MCP Protocol Types
interface MCPRequest {
  method: string;
  params?: Record<string, any>;
  id?: string;
}

interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string;
}

interface CodeContext {
  file: string;
  line: number;
  column: number;
  context: string;
  symbols: string[];
}

interface SemanticAnalysis {
  summary: string;
  complexity: 'low' | 'medium' | 'high';
  recommendations: string[];
  dependencies: string[];
  codeQuality: number; // 0-100
}

/**
 * MCP Service for enhanced AI capabilities
 */
class MCPService {
  private baseUrl: string;
  private isConnected: boolean = false;
  private analysisCache: Map<string, SemanticAnalysis> = new Map();

  constructor() {
    // Primary MCP server URL (local server)
    this.baseUrl = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001';
  }

  /**
   * Initialize MCP connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Try to connect to MCP server
      const response = await this.sendMCPRequest({
        method: 'initialize',
        params: {
          capabilities: ['code_analysis', 'semantic_search', 'recommendations']
        }
      });

      this.isConnected = !!response.result;
      return this.isConnected;
    } catch (error) {
      console.warn('MCP server not available, using local analysis:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Analyze code semantically
   */
  async analyzeCode(code: string, language: string = 'typescript'): Promise<SemanticAnalysis> {
    const cacheKey = `${language}_${this.hashCode(code)}`;
    
    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      if (this.isConnected) {
        // Use MCP server for analysis
        const response = await this.sendMCPRequest({
          method: 'analyze_code',
          params: { code, language }
        });

        if (response.result) {
          this.analysisCache.set(cacheKey, response.result);
          return response.result;
        }
      }

      // Fallback to local analysis
      const analysis = this.performLocalAnalysis(code, language);
      this.analysisCache.set(cacheKey, analysis);
      return analysis;

    } catch (error) {
      console.error('Code analysis failed:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Get coding recommendations for opportunities
   */
  async getCodingRecommendations(opportunityTitle: string, userSkills: string[] = []): Promise<{
    languages: string[];
    frameworks: string[];
    learningPath: string[];
    projects: string[];
  }> {
    try {
      if (this.isConnected) {
        const response = await this.sendMCPRequest({
          method: 'get_coding_recommendations',
          params: { opportunity: opportunityTitle, skills: userSkills }
        });

        if (response.result) {
          return response.result;
        }
      }

      // Fallback to local recommendations
      return this.generateLocalRecommendations(opportunityTitle, userSkills);

    } catch (error) {
      console.error('Failed to get coding recommendations:', error);
      return this.getDefaultRecommendations();
    }
  }

  /**
   * Enhanced search with semantic understanding
   */
  async semanticSearch(query: string, context: 'opportunities' | 'skills' | 'careers' = 'opportunities'): Promise<{
    results: any[];
    suggestions: string[];
    confidence: number;
  }> {
    try {
      if (this.isConnected) {
        const response = await this.sendMCPRequest({
          method: 'semantic_search',
          params: { query, context }
        });

        if (response.result) {
          return response.result;
        }
      }

      // Fallback to enhanced local search
      return this.performEnhancedSearch(query, context);

    } catch (error) {
      console.error('Semantic search failed:', error);
      return { results: [], suggestions: [], confidence: 0 };
    }
  }

  /**
   * Generate code examples for learning
   */
  async generateCodeExamples(skill: string, level: 'beginner' | 'intermediate' | 'advanced' = 'beginner'): Promise<{
    examples: Array<{
      title: string;
      code: string;
      explanation: string;
      difficulty: string;
    }>;
  }> {
    try {
      if (this.isConnected) {
        const response = await this.sendMCPRequest({
          method: 'generate_examples',
          params: { skill, level }
        });

        if (response.result) {
          return response.result;
        }
      }

      // Fallback to local examples
      return this.generateLocalExamples(skill, level);

    } catch (error) {
      console.error('Failed to generate code examples:', error);
      return { examples: [] };
    }
  }

  // Private helper methods

  private async sendMCPRequest(request: MCPRequest): Promise<MCPResponse> {
    const token = await auth.currentUser?.getIdToken();
    const fallbackUrl = import.meta.env.VITE_MCP_FALLBACK_URL;
    
    // Try primary server first
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        return await response.json();
      }
      
      throw new Error(`Primary MCP server failed: ${response.statusText}`);
    } catch (primaryError) {
      console.warn('Primary MCP server unavailable, trying fallback:', primaryError);
      
      // Try fallback server if available
      if (fallbackUrl) {
        try {
          const response = await fetch(fallbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(request)
          });

          if (response.ok) {
            console.log('✅ Fallback MCP server responded successfully');
            return await response.json();
          }
        } catch (fallbackError) {
          console.warn('Fallback MCP server also failed:', fallbackError);
        }
      }
      
      throw new Error(`All MCP servers failed. Primary: ${primaryError.message}`);
    }
  }

  private performLocalAnalysis(code: string, language: string): SemanticAnalysis {
    // Simple local analysis
    const lines = code.split('\n').length;
    const complexity = lines > 100 ? 'high' : lines > 50 ? 'medium' : 'low';
    
    return {
      summary: `${language} code with ${lines} lines`,
      complexity,
      recommendations: [
        'Consider adding more comments',
        'Break down large functions',
        'Add error handling'
      ],
      dependencies: this.extractDependencies(code),
      codeQuality: Math.min(90, Math.max(60, 100 - lines / 2))
    };
  }

  private generateLocalRecommendations(opportunityTitle: string, userSkills: string[]) {
    const title = opportunityTitle.toLowerCase();
    
    // Basic recommendation logic
    const recommendations = {
      languages: [] as string[],
      frameworks: [] as string[],
      learningPath: [] as string[],
      projects: [] as string[]
    };

    if (title.includes('web') || title.includes('frontend')) {
      recommendations.languages.push('JavaScript', 'TypeScript', 'HTML', 'CSS');
      recommendations.frameworks.push('React', 'Vue', 'Angular');
      recommendations.projects.push('Portfolio Website', 'E-commerce Site');
    }

    if (title.includes('backend') || title.includes('api')) {
      recommendations.languages.push('Node.js', 'Python', 'Java');
      recommendations.frameworks.push('Express', 'FastAPI', 'Spring');
      recommendations.projects.push('REST API', 'Microservices');
    }

    if (title.includes('data') || title.includes('analytics')) {
      recommendations.languages.push('Python', 'R', 'SQL');
      recommendations.frameworks.push('Pandas', 'NumPy', 'TensorFlow');
      recommendations.projects.push('Data Visualization', 'Machine Learning Model');
    }

    if (title.includes('mobile')) {
      recommendations.languages.push('JavaScript', 'Dart', 'Swift', 'Kotlin');
      recommendations.frameworks.push('React Native', 'Flutter');
      recommendations.projects.push('Mobile App', 'Cross-platform App');
    }

    // Generate learning path
    recommendations.learningPath = [
      'Learn fundamentals',
      'Build practice projects',
      'Contribute to open source',
      'Create portfolio',
      'Apply for internships'
    ];

    return recommendations;
  }

  private performEnhancedSearch(query: string, context: string) {
    // Enhanced local search with basic semantic understanding
    return {
      results: [],
      suggestions: [
        `Try "${query}" with filters`,
        `Related: ${query.split(' ')[0]} opportunities`,
        `Similar: ${context} in your area`
      ],
      confidence: 0.7
    };
  }

  private generateLocalExamples(skill: string, level: string) {
    const examples = {
      'javascript': {
        beginner: {
          title: 'Hello World Function',
          code: 'function greetUser(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greetUser("World"));',
          explanation: 'A simple function that takes a name parameter and returns a greeting.',
          difficulty: 'Easy'
        }
      },
      'python': {
        beginner: {
          title: 'List Comprehension',
          code: 'numbers = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in numbers]\nprint(squares)  # [1, 4, 9, 16, 25]',
          explanation: 'Using list comprehension to create a new list of squared numbers.',
          difficulty: 'Easy'
        }
      }
    };

    const skillExamples = examples[skill.toLowerCase() as keyof typeof examples];
    if (skillExamples && skillExamples[level as keyof typeof skillExamples]) {
      return {
        examples: [skillExamples[level as keyof typeof skillExamples]]
      };
    }

    return {
      examples: [{
        title: `${skill} Example`,
        code: `// ${skill} example code here`,
        explanation: `Basic ${skill} example for ${level} level`,
        difficulty: level
      }]
    };
  }

  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    
    // Extract import statements
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    // Extract require statements
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  private getDefaultAnalysis(): SemanticAnalysis {
    return {
      summary: 'Code analysis unavailable',
      complexity: 'medium',
      recommendations: ['Enable MCP server for detailed analysis'],
      dependencies: [],
      codeQuality: 75
    };
  }

  private getDefaultRecommendations() {
    return {
      languages: ['JavaScript', 'Python'],
      frameworks: ['React', 'Node.js'],
      learningPath: ['Learn basics', 'Build projects', 'Apply skills'],
      projects: ['Personal website', 'API project']
    };
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Get service status
   */
  getStatus(): {
    connected: boolean;
    cacheSize: number;
    capabilities: string[];
  } {
    return {
      connected: this.isConnected,
      cacheSize: this.analysisCache.size,
      capabilities: [
        'code_analysis',
        'semantic_search', 
        'coding_recommendations',
        'example_generation'
      ]
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}

// Export singleton instance
export const mcpService = new MCPService();
export default mcpService;