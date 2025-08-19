/**
 * AI Services Configuration
 * Integrates Gemini 1.5 Flash, OpenAI embeddings, and Cohere as fallback
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { CohereClient } = require('cohere-ai');
const logger = require('../utils/logger');

let geminiClient = null;
let openaiClient = null;
let cohereClient = null;

/**
 * Initialize all AI services
 */
async function initializeAI() {
  try {
    // Initialize Gemini 1.5 Flash
    if (process.env.GOOGLE_AI_API_KEY) {
      geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      logger.info('Gemini 1.5 Flash initialized');
    }
    
    // Initialize OpenAI for embeddings
    if (process.env.OPENAI_API_KEY) {
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      logger.info('OpenAI client initialized');
    }
    
    // Initialize Cohere as fallback
    if (process.env.COHERE_API_KEY) {
      cohereClient = new CohereClient({
        token: process.env.COHERE_API_KEY,
      });
      logger.info('Cohere client initialized');
    }
    
    // Test connections
    await testAIConnections();
    
    logger.info('All AI services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize AI services:', error);
    throw error;
  }
}

/**
 * Test AI service connections
 */
async function testAIConnections() {
  const tests = [];
  
  if (geminiClient) {
    tests.push(testGemini());
  }
  
  if (openaiClient) {
    tests.push(testOpenAI());
  }
  
  if (cohereClient) {
    tests.push(testCohere());
  }
  
  await Promise.all(tests);
}

/**
 * Test Gemini connection
 */
async function testGemini() {
  try {
    const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Test connection');
    logger.debug('Gemini connection test successful');
  } catch (error) {
    logger.error('Gemini connection test failed:', error);
    throw error;
  }
}

/**
 * Test OpenAI connection
 */
async function testOpenAI() {
  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test',
    });
    logger.debug('OpenAI connection test successful');
  } catch (error) {
    logger.error('OpenAI connection test failed:', error);
    throw error;
  }
}

/**
 * Test Cohere connection
 */
async function testCohere() {
  try {
    const response = await cohereClient.embed({
      texts: ['test'],
      model: 'embed-english-light-v3.0',
    });
    logger.debug('Cohere connection test successful');
  } catch (error) {
    logger.error('Cohere connection test failed:', error);
    throw error;
  }
}

/**
 * Generate text embeddings using OpenAI (primary) or Cohere (fallback)
 */
async function generateEmbeddings(texts, options = {}) {
  try {
    const { useCohere = false } = options;
    
    if (!useCohere && openaiClient) {
      return await generateOpenAIEmbeddings(texts);
    } else if (cohereClient) {
      return await generateCohereEmbeddings(texts);
    } else {
      throw new Error('No embedding service available');
    }
  } catch (error) {
    logger.error('Error generating embeddings:', error);
    
    // Try fallback if primary fails
    if (!options.useCohere && cohereClient) {
      logger.info('Trying Cohere as fallback for embeddings');
      return await generateCohereEmbeddings(texts);
    }
    
    throw error;
  }
}

/**
 * Generate embeddings using OpenAI text-embedding-3-small
 */
async function generateOpenAIEmbeddings(texts) {
  try {
    const textsArray = Array.isArray(texts) ? texts : [texts];
    
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: textsArray,
    });
    
    const embeddings = response.data.map(item => item.embedding);
    
    logger.debug(`Generated ${embeddings.length} OpenAI embeddings`);
    return Array.isArray(texts) ? embeddings : embeddings[0];
  } catch (error) {
    logger.error('OpenAI embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embeddings using Cohere
 */
async function generateCohereEmbeddings(texts) {
  try {
    const textsArray = Array.isArray(texts) ? texts : [texts];
    
    const response = await cohereClient.embed({
      texts: textsArray,
      model: 'embed-english-light-v3.0',
      inputType: 'search_document',
    });
    
    const embeddings = response.embeddings;
    
    logger.debug(`Generated ${embeddings.length} Cohere embeddings`);
    return Array.isArray(texts) ? embeddings : embeddings[0];
  } catch (error) {
    logger.error('Cohere embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate personalized roadmap using Gemini 1.5 Flash
 */
async function generateRoadmap(opportunity, userProfile, options = {}) {
  try {
    if (!geminiClient) {
      throw new Error('Gemini client not initialized');
    }
    
    const model = geminiClient.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
    const prompt = createRoadmapPrompt(opportunity, userProfile, options);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const roadmapText = response.text();
    
    // Parse the structured roadmap
    const roadmap = parseRoadmapResponse(roadmapText, opportunity);
    
    logger.info(`Generated roadmap for opportunity: ${opportunity.title}`);
    return roadmap;
  } catch (error) {
    logger.error('Error generating roadmap:', error);
    throw error;
  }
}

/**
 * Generate AI chat response using Gemini with RAG context
 */
async function generateChatResponse(message, context, userProfile) {
  try {
    if (!geminiClient) {
      throw new Error('Gemini client not initialized');
    }
    
    const model = geminiClient.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });
    
    const prompt = createChatPrompt(message, context, userProfile);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const chatResponse = response.text();
    
    logger.debug('Generated chat response');
    return chatResponse;
  } catch (error) {
    logger.error('Error generating chat response:', error);
    throw error;
  }
}

/**
 * Create roadmap generation prompt
 */
function createRoadmapPrompt(opportunity, userProfile, options) {
  const deadline = opportunity.deadline || 'Not specified';
  const currentDate = new Date().toLocaleDateString();
  
  return `You are an expert education and career coach. Create a detailed, personalized roadmap for applying to this opportunity.

OPPORTUNITY DETAILS:
- Title: ${opportunity.title}
- Organization: ${opportunity.organization || opportunity.provider}
- Deadline: ${deadline}
- Category: ${opportunity.category}
- Requirements: ${opportunity.requirements}
- Benefits: ${opportunity.benefits}
- Application Process: ${opportunity.applicationProcess}

USER PROFILE:
- Education Level: ${userProfile.preferences?.educationLevel || 'Not specified'}
- Career Interests: ${userProfile.preferences?.careerInterests?.join(', ') || 'Not specified'}
- Learning Style: ${userProfile.preferences?.learningStyle || 'Not specified'}
- Time Availability: ${userProfile.preferences?.timeAvailability || 'Not specified'}
- Current Skills: ${userProfile.preferences?.currentSkills?.join(', ') || 'Not specified'}

INSTRUCTIONS:
1. Create a step-by-step roadmap with specific, actionable milestones
2. Consider the application deadline and work backwards
3. Tailor advice to the user's education level and interests
4. Include timeline estimates for each milestone
5. Provide specific tips and resources

Please respond with a structured JSON format:
{
  "title": "Roadmap title",
  "description": "Brief description",
  "opportunityId": "${opportunity.id}",
  "estimatedDuration": "X weeks/months",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Milestone title",
      "description": "Detailed description",
      "dueDate": "YYYY-MM-DD",
      "estimatedHours": 5,
      "priority": "high|medium|low",
      "category": "research|preparation|application|follow-up",
      "resources": ["resource1", "resource2"],
      "tips": ["tip1", "tip2"]
    }
  ],
  "successTips": ["general tip 1", "general tip 2"],
  "commonPitfalls": ["pitfall 1", "pitfall 2"]
}

Current date: ${currentDate}`;
}

/**
 * Create chat prompt with RAG context
 */
function createChatPrompt(message, context, userProfile) {
  return `You are Edutu AI, a helpful education and career coaching assistant. You help users find opportunities, plan their applications, and achieve their goals.

CONTEXT INFORMATION:
${context.opportunities ? `Recent Opportunities: ${context.opportunities.map(o => `- ${o.title} (${o.organization})`).join('\n')}` : ''}
${context.roadmaps ? `Active Roadmaps: ${context.roadmaps.map(r => `- ${r.title} (${r.progress}% complete)`).join('\n')}` : ''}
${context.chatHistory ? `Recent Chat: ${context.chatHistory.slice(0, 3).map(c => `User: ${c.message}\nEdutu: ${c.response}`).join('\n')}` : ''}

USER PROFILE:
- Education: ${userProfile.preferences?.educationLevel || 'Not specified'}
- Interests: ${userProfile.preferences?.careerInterests?.join(', ') || 'Not specified'}
- Goals: ${userProfile.preferences?.careerGoals?.join(', ') || 'Not specified'}

USER MESSAGE: ${message}

Please provide a helpful, personalized response. Be encouraging, specific, and actionable. If the user asks about scholarships or opportunities, reference the context information. If they need help with applications, provide step-by-step guidance.`;
}

/**
 * Parse Gemini roadmap response into structured format
 */
function parseRoadmapResponse(roadmapText, opportunity) {
  try {
    // Try to parse JSON first
    const jsonMatch = roadmapText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        opportunityId: opportunity.id,
        createdAt: new Date(),
      };
    }
    
    // Fallback parsing if JSON fails
    return {
      title: `Application Roadmap for ${opportunity.title}`,
      description: 'AI-generated personalized roadmap',
      opportunityId: opportunity.id,
      estimatedDuration: '4-6 weeks',
      milestones: [
        {
          id: 'milestone-1',
          title: 'Research and Preparation',
          description: 'Research the opportunity and prepare required documents',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedHours: 8,
          priority: 'high',
          category: 'research',
          resources: ['Official website', 'Previous applicant experiences'],
          tips: ['Read all requirements carefully', 'Start early']
        },
        {
          id: 'milestone-2',
          title: 'Application Preparation',
          description: 'Prepare and review all application materials',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedHours: 12,
          priority: 'high',
          category: 'preparation',
          resources: ['Writing guides', 'Application templates'],
          tips: ['Get feedback from mentors', 'Proofread everything']
        },
        {
          id: 'milestone-3',
          title: 'Submit Application',
          description: 'Submit complete application before deadline',
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedHours: 2,
          priority: 'critical',
          category: 'application',
          resources: ['Application portal'],
          tips: ['Submit early', 'Keep confirmation receipts']
        }
      ],
      successTips: [
        'Start early and plan ahead',
        'Follow all instructions carefully',
        'Get feedback from others'
      ],
      commonPitfalls: [
        'Missing deadline',
        'Incomplete application',
        'Not following guidelines'
      ],
      createdAt: new Date(),
    };
  } catch (error) {
    logger.error('Error parsing roadmap response:', error);
    throw error;
  }
}

/**
 * Get AI client instances
 */
function getAIClients() {
  return {
    gemini: geminiClient,
    openai: openaiClient,
    cohere: cohereClient,
  };
}

module.exports = {
  initializeAI,
  generateEmbeddings,
  generateRoadmap,
  generateChatResponse,
  getAIClients,
};