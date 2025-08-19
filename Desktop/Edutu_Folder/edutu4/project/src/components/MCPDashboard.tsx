import React, { useState, useEffect } from 'react';
import { Brain, Code, Search, TrendingUp, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { mcpService } from '../services/mcpService';

interface MCPDashboardProps {
  onBack?: () => void;
}

const MCPDashboard: React.FC<MCPDashboardProps> = ({ onBack }) => {
  const { isDarkMode } = useDarkMode();
  const [mcpStatus, setMcpStatus] = useState({ connected: false, cacheSize: 0, capabilities: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [codeAnalysis, setCodeAnalysis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  useEffect(() => {
    loadMCPStatus();
  }, []);

  const loadMCPStatus = async () => {
    setIsLoading(true);
    try {
      await mcpService.initialize();
      const status = mcpService.getStatus();
      setMcpStatus(status);
    } catch (error) {
      console.error('Failed to load MCP status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runCodeAnalysisDemo = async () => {
    setActiveDemo('analysis');
    const sampleCode = `
function calculateScholarshipMatch(opportunity, userProfile) {
  const interests = userProfile.interests || [];
  const skills = userProfile.skills || [];
  
  let score = 0;
  
  // Interest matching
  if (interests.some(interest => 
    opportunity.category.toLowerCase().includes(interest.toLowerCase())
  )) {
    score += 40;
  }
  
  // Skills matching
  const requiredSkills = opportunity.requirements || [];
  const matchingSkills = skills.filter(skill =>
    requiredSkills.some(req => req.toLowerCase().includes(skill.toLowerCase()))
  );
  
  score += (matchingSkills.length / skills.length) * 60;
  
  return Math.min(score, 100);
}
`;

    try {
      const analysis = await mcpService.analyzeCode(sampleCode, 'javascript');
      setCodeAnalysis(analysis);
    } catch (error) {
      console.error('Code analysis failed:', error);
      setCodeAnalysis({ error: 'Analysis failed' });
    } finally {
      setActiveDemo(null);
    }
  };

  const runRecommendationsDemo = async () => {
    setActiveDemo('recommendations');
    try {
      const recs = await mcpService.getCodingRecommendations(
        'Software Engineering Internship at Google',
        ['JavaScript', 'React']
      );
      setRecommendations(recs);
    } catch (error) {
      console.error('Recommendations failed:', error);
      setRecommendations({ error: 'Recommendations failed' });
    } finally {
      setActiveDemo(null);
    }
  };

  const runSemanticSearchDemo = async () => {
    setActiveDemo('search');
    try {
      const results = await mcpService.semanticSearch(
        'machine learning opportunities for beginners',
        'opportunities'
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ error: 'Search failed' });
    } finally {
      setActiveDemo(null);
    }
  };

  const clearCache = () => {
    mcpService.clearCache();
    setMcpStatus({ ...mcpStatus, cacheSize: 0 });
    setCodeAnalysis(null);
    setRecommendations(null);
    setSearchResults(null);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center ${isDarkMode ? 'dark' : ''}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing MCP Service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCP Integration</h1>
              <p className="text-gray-600 dark:text-gray-400">Model Context Protocol Dashboard</p>
            </div>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
        </div>

        {/* Status Card */}
        <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Status</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              mcpStatus.connected 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            }`}>
              {mcpStatus.connected ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {mcpStatus.connected ? 'Connected' : 'Local Mode'}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="text-2xl font-bold text-primary">{mcpStatus.capabilities.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Capabilities</div>
            </div>
            <div className="text-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="text-2xl font-bold text-accent">{mcpStatus.cacheSize}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Cached Analyses</div>
            </div>
            <div className="text-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCache}
                disabled={mcpStatus.cacheSize === 0}
              >
                Clear Cache
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Capabilities:</h3>
            <div className="flex flex-wrap gap-2">
              {mcpStatus.capabilities.map((cap, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                >
                  {cap.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Demo Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Code Analysis Demo */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Code Analysis</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Analyze code semantically and get improvement suggestions.
            </p>
            <Button 
              onClick={runCodeAnalysisDemo}
              disabled={activeDemo === 'analysis'}
              className="w-full"
            >
              {activeDemo === 'analysis' ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                'Run Analysis Demo'
              )}
            </Button>
          </Card>

          {/* Recommendations Demo */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Tech Recommendations</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get personalized technology recommendations for opportunities.
            </p>
            <Button 
              onClick={runRecommendationsDemo}
              disabled={activeDemo === 'recommendations'}
              variant="secondary"
              className="w-full"
            >
              {activeDemo === 'recommendations' ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                'Get Recommendations'
              )}
            </Button>
          </Card>

          {/* Semantic Search Demo */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Semantic Search</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Perform intelligent search with contextual understanding.
            </p>
            <Button 
              onClick={runSemanticSearchDemo}
              disabled={activeDemo === 'search'}
              variant="outline"
              className="w-full"
            >
              {activeDemo === 'search' ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                'Run Search Demo'
              )}
            </Button>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Code Analysis Results */}
          {codeAnalysis && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Code Analysis Results</h3>
              {codeAnalysis.error ? (
                <div className="text-red-600 dark:text-red-400">
                  Error: {codeAnalysis.error}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary:</div>
                    <div className="text-gray-600 dark:text-gray-400">{codeAnalysis.summary}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Complexity:</div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      codeAnalysis.complexity === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      codeAnalysis.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {codeAnalysis.complexity}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality Score:</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${codeAnalysis.codeQuality}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{codeAnalysis.codeQuality}%</span>
                    </div>
                  </div>
                  {codeAnalysis.recommendations.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommendations:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {codeAnalysis.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Recommendations Results */}
          {recommendations && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Technology Recommendations</h3>
              {recommendations.error ? (
                <div className="text-red-600 dark:text-red-400">
                  Error: {recommendations.error}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommended Languages:</div>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.languages.map((lang: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frameworks:</div>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.frameworks.map((fw: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Ideas:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {recommendations.projects.map((project: string, index: number) => (
                        <li key={index}>{project}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Search Results */}
          {searchResults && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Semantic Search Results</h3>
              {searchResults.error ? (
                <div className="text-red-600 dark:text-red-400">
                  Error: {searchResults.error}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Confidence Score:</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 max-w-32">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${searchResults.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{Math.round(searchResults.confidence * 100)}%</span>
                  </div>
                  
                  {searchResults.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Suggestions:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {searchResults.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MCPDashboard;