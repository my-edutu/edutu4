/**
 * AI Service
 * Unified AI integration with multiple provider support and fallback mechanisms
 */

const logger = require('../utils/logger');
const config = require('../config');

// AI Provider imports
let OpenAI, GoogleGenerativeAI, CohereAI;

// Initialize AI providers
try {
  if (config.ai.openai.apiKey) {
    OpenAI = require('openai');
  }
} catch (error) {
  logger.warn('OpenAI package not available:', error.message);
}

try {
  if (config.ai.google.apiKey) {
    const { GoogleGenerativeAI: GoogleAI } = require('@google/generative-ai');
    GoogleGenerativeAI = GoogleAI;
  }
} catch (error) {
  logger.warn('Google AI package not available:', error.message);
}

try {
  if (config.ai.cohere.apiKey) {
    const { CohereClient } = require('cohere-ai');
    CohereAI = CohereClient;
  }
} catch (error) {
  logger.warn('Cohere AI package not available:', error.message);
}

class AIService {
  constructor() {
    this.providers = {};
    this.fallbackResponses = new Map();
    this.initialized = false;
  }

  async initialize() {
    logger.info('🤖 Initializing AI services...');

    // Initialize OpenAI
    if (OpenAI && config.ai.openai.apiKey) {
      try {
        this.providers.openai = new OpenAI({
          apiKey: config.ai.openai.apiKey
        });
        logger.info('✅ OpenAI initialized');
      } catch (error) {
        logger.warn('⚠️ OpenAI initialization failed:', error.message);
      }
    }

    // Initialize Google AI
    if (GoogleGenerativeAI && config.ai.google.apiKey) {
      try {
        this.providers.google = new GoogleGenerativeAI(config.ai.google.apiKey);
        logger.info('✅ Google AI initialized');
      } catch (error) {
        logger.warn('⚠️ Google AI initialization failed:', error.message);
      }
    }

    // Initialize Cohere
    if (CohereAI && config.ai.cohere.apiKey) {
      try {
        this.providers.cohere = new CohereAI({
          token: config.ai.cohere.apiKey
        });
        logger.info('✅ Cohere AI initialized');
      } catch (error) {
        logger.warn('⚠️ Cohere AI initialization failed:', error.message);
      }
    }

    // Initialize fallback responses
    this.initializeFallbackResponses();

    this.initialized = true;
    const providerCount = Object.keys(this.providers).length;
    logger.info(`🎯 AI service initialized with ${providerCount} provider(s)`);
  }

  /**
   * Generate chat response with provider fallback
   */
  async generateChatResponse(message, context, options = {}) {
    if (!this.initialized) {
      throw new Error('AI service not initialized');
    }

    const providers = ['openai', 'google', 'cohere'];
    
    for (const providerName of providers) {
      if (this.providers[providerName]) {
        try {
          logger.debug(`Trying ${providerName} for chat response`);
          const response = await this.callProvider(providerName, message, context, options);
          
          if (response) {
            logger.info(`✅ Chat response generated using ${providerName}`);
            return {
              ...response,
              provider: providerName
            };
          }
        } catch (error) {
          logger.warn(`${providerName} failed:`, error.message);
          continue;
        }
      }
    }

    // If all providers fail, use intelligent fallback
    logger.warn('All AI providers failed, using intelligent fallback');
    return this.generateIntelligentFallback(message, context);
  }

  /**
   * Call specific AI provider
   */
  async callProvider(providerName, message, context, options) {
    switch (providerName) {
      case 'openai':
        return await this.callOpenAI(message, context, options);
      case 'google':
        return await this.callGoogleAI(message, context, options);
      case 'cohere':
        return await this.callCohere(message, context, options);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * OpenAI integration
   */
  async callOpenAI(message, context, options) {
    const messages = this.buildOpenAIMessages(message, context);
    
    const response = await this.providers.openai.chat.completions.create({
      model: config.ai.openai.model,
      messages,
      max_tokens: config.ai.openai.maxTokens,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return {
      content: content.trim(),
      suggestions: this.extractSuggestions(content, context),
      buttons: this.generateContextualButtons(message, content, context)
    };
  }

  /**
   * Google AI integration
   */
  async callGoogleAI(message, context, options) {
    const model = this.providers.google.getGenerativeModel({ 
      model: config.ai.google.model 
    });

    const prompt = this.buildGoogleAIPrompt(message, context);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No content in Google AI response');
    }

    return {
      content: content.trim(),
      suggestions: this.extractSuggestions(content, context),
      buttons: this.generateContextualButtons(message, content, context)
    };
  }

  /**
   * Cohere integration
   */
  async callCohere(message, context, options) {
    const response = await this.providers.cohere.generate({
      model: config.ai.cohere.model,
      prompt: this.buildCoherePrompt(message, context),
      max_tokens: 1000,
      temperature: 0.7,
      k: 0,
      stop_sequences: [],
      return_likelihoods: 'NONE'
    });

    const content = response.generations[0]?.text;
    if (!content) {
      throw new Error('No content in Cohere response');
    }

    return {
      content: content.trim(),
      suggestions: this.extractSuggestions(content, context),
      buttons: this.generateContextualButtons(message, content, context)
    };
  }

  /**
   * Build OpenAI message format
   */
  buildOpenAIMessages(message, context) {
    const messages = [{
      role: 'system',
      content: this.getSystemPrompt(context)
    }];

    // Add context from recent chats
    if (context.recentChats) {
      context.recentChats.slice(-4).forEach(chat => {
        messages.push({ role: 'user', content: chat.message });
        messages.push({ role: 'assistant', content: chat.response });
      });
    }

    // Add current message
    messages.push({
      role: 'user', 
      content: this.enhanceMessageWithContext(message, context)
    });

    return messages;
  }

  /**
   * Build Google AI prompt
   */
  buildGoogleAIPrompt(message, context) {
    const systemPrompt = this.getSystemPrompt(context);
    const enhancedMessage = this.enhanceMessageWithContext(message, context);
    
    let prompt = `${systemPrompt}\n\nUser: ${enhancedMessage}\n\nAssistant:`;

    // Add recent conversation context
    if (context.recentChats) {
      const recentContext = context.recentChats.slice(-2).map(chat =>
        `User: ${chat.message}\nAssistant: ${chat.response}`
      ).join('\n\n');
      
      prompt = `${systemPrompt}\n\n${recentContext}\n\nUser: ${enhancedMessage}\n\nAssistant:`;
    }

    return prompt;
  }

  /**
   * Build Cohere prompt
   */
  buildCoherePrompt(message, context) {
    const systemPrompt = this.getSystemPrompt(context);
    const enhancedMessage = this.enhanceMessageWithContext(message, context);
    
    return `${systemPrompt}\n\nUser Question: ${enhancedMessage}\n\nResponse:`;
  }

  /**
   * Get system prompt based on context
   */
  getSystemPrompt(context) {
    let prompt = `You are Edutu, an AI opportunity coach designed to help young African professionals (ages 16-30) discover and pursue educational and career opportunities.

Your capabilities:
- Personalized scholarship and opportunity recommendations
- Career guidance and skill development advice
- Goal setting and roadmap creation
- Community building and networking support

Guidelines:
- Be encouraging, specific, and actionable
- Focus on opportunities in Africa or globally accessible to African youth
- Provide concrete next steps and resources
- Use emojis occasionally to make interactions engaging
- Reference specific opportunities when available in context`;

    // Add context-specific information
    if (context.userProfile) {
      const profile = context.userProfile;
      prompt += `\n\nUser Profile:
- Name: ${profile.name || 'User'}
- Interests: ${profile.preferences?.careerInterests?.join(', ') || 'Various'}
- Education Level: ${profile.preferences?.educationLevel || 'Not specified'}
- Skills: ${profile.preferences?.currentSkills?.join(', ') || 'Not specified'}`;
    }

    if (context.opportunities?.length > 0) {
      prompt += `\n\nAvailable Opportunities:`;
      context.opportunities.slice(0, 3).forEach((opp, index) => {
        prompt += `\n${index + 1}. ${opp.title} - ${opp.provider} (${opp.category || 'General'})`;
      });
    }

    return prompt;
  }

  /**
   * Enhance message with context information
   */
  enhanceMessageWithContext(message, context) {
    let enhancedMessage = message;

    // Add context clues for better AI understanding
    const contextClues = [];
    
    if (context.sources?.includes('scholarships_rag')) {
      contextClues.push('(User has relevant scholarship data available)');
    }
    
    if (context.userProfile?.preferences?.careerInterests) {
      contextClues.push(`(User interests: ${context.userProfile.preferences.careerInterests.join(', ')})`);
    }

    if (contextClues.length > 0) {
      enhancedMessage += ` ${contextClues.join(' ')}`;
    }

    return enhancedMessage;
  }

  /**
   * Generate intelligent fallback response
   */
  generateIntelligentFallback(message, context) {
    const messageLower = message.toLowerCase();
    
    // Use pattern matching for common queries
    if (this.matchesPattern(messageLower, ['scholarship', 'funding', 'grant'])) {
      return this.generateScholarshipFallback(context);
    }
    
    if (this.matchesPattern(messageLower, ['career', 'job', 'work'])) {
      return this.generateCareerFallback(context);
    }
    
    if (this.matchesPattern(messageLower, ['skill', 'learn', 'course'])) {
      return this.generateSkillsFallback(context);
    }

    // Generic helpful response
    return this.generateGenericFallback(context);
  }

  /**
   * Generate contextual buttons
   */
  generateContextualButtons(message, response, context) {
    const buttons = [];
    const messageLower = message.toLowerCase();
    const responseLower = response.toLowerCase();

    // Scholarship-related buttons
    if (messageLower.includes('scholarship') || responseLower.includes('scholarship')) {
      buttons.push({ 
        text: '🎓 Find More Scholarships', 
        type: 'action',
        action: 'search_scholarships'
      });
    }

    // Career-related buttons  
    if (messageLower.includes('career') || responseLower.includes('career')) {
      buttons.push({ 
        text: '💼 Career Guidance', 
        type: 'action',
        action: 'career_guidance'
      });
    }

    // Add opportunities button if context has opportunities
    if (context.opportunities?.length > 0) {
      buttons.push({ 
        text: '🔍 View All Opportunities', 
        type: 'action',
        action: 'view_opportunities'
      });
    }

    // Always include community button
    if (buttons.length < 3) {
      buttons.push({ 
        text: '🤝 Join Community', 
        type: 'action',
        action: 'join_community'
      });
    }

    return buttons.slice(0, 3);
  }

  /**
   * Extract suggestions from AI response
   */
  extractSuggestions(content, context) {
    // This could be enhanced with NLP to extract actual suggestions
    // For now, return contextual suggestions based on user profile
    const suggestions = [];
    
    if (context.userProfile?.preferences?.careerInterests) {
      const interests = context.userProfile.preferences.careerInterests;
      suggestions.push(`Tell me more about ${interests[0]} opportunities`);
    }

    if (context.opportunities?.length > 0) {
      suggestions.push('Which opportunity best matches my goals?');
    }

    suggestions.push('How can I improve my application?');
    suggestions.push('What skills should I develop?');

    return suggestions.slice(0, 4);
  }

  /**
   * Initialize fallback response patterns
   */
  initializeFallbackResponses() {
    // This would be populated with pre-written responses for common scenarios
    this.fallbackResponses.set('scholarship', 
      `🎓 I'd love to help you find scholarships! While I'm experiencing some connectivity issues, I can still share some guidance:

**Top Scholarship Categories:**
• **Academic Excellence** - Merit-based funding
• **Field-Specific** - STEM, Arts, Business scholarships  
• **Leadership** - Community impact and leadership development
• **Financial Need** - Need-based assistance programs

**Application Tips:**
1. Start early - applications take time
2. Tailor each application to the specific scholarship
3. Highlight your unique story and achievements
4. Get strong recommendation letters

Would you like me to help you search for specific types of scholarships?`
    );

    // Add more fallback patterns as needed
  }

  /**
   * Pattern matching helper
   */
  matchesPattern(input, keywords) {
    return keywords.some(keyword => input.includes(keyword));
  }

  /**
   * Generate welcome message for new sessions
   */
  async generateWelcomeMessage(context) {
    const userName = context.userProfile?.name || 'there';
    
    let welcomeMessage = `Hi ${userName}! 👋 Welcome to Edutu Chat.\n\nI'm here to help you discover amazing opportunities and achieve your goals.`;

    if (context.userProfile?.preferences?.careerInterests) {
      const interests = context.userProfile.preferences.careerInterests.slice(0, 2);
      welcomeMessage += ` I see you're interested in ${interests.join(' and ')} - that's fantastic!`;
    }

    if (context.recommendations?.length > 0) {
      welcomeMessage += `\n\nI've found ${context.recommendations.length} opportunities that might interest you. `;
    }

    welcomeMessage += `\n\nWhat would you like to explore today?`;

    const suggestions = [
      "🎓 Find scholarships for my field",
      "💼 Get career guidance", 
      "🚀 Create a skill development plan",
      "🎯 Set educational goals"
    ];

    return {
      content: welcomeMessage,
      suggestions
    };
  }

  /**
   * Generate suggestions based on user context
   */
  async generateSuggestions(userProfile, contextType) {
    const suggestions = [];

    if (userProfile?.preferences?.careerInterests) {
      const interest = userProfile.preferences.careerInterests[0];
      suggestions.push(`Find ${interest} opportunities`);
      suggestions.push(`What skills do I need for ${interest}?`);
    }

    switch (contextType) {
      case 'scholarships':
        suggestions.push('What scholarships match my profile?');
        suggestions.push('How do I write a strong personal statement?');
        break;
      case 'career':
        suggestions.push('What career paths are growing in Africa?');
        suggestions.push('How do I build professional networks?');
        break;
      default:
        suggestions.push('Help me set career goals');
        suggestions.push('What opportunities are available?');
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Health check for AI services
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      providers: {},
      initialized: this.initialized
    };

    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        // Simple test call
        if (name === 'openai' && provider) {
          await provider.models.list();
          health.providers[name] = 'healthy';
        } else {
          health.providers[name] = 'available';
        }
      } catch (error) {
        health.providers[name] = 'unhealthy';
        health.status = 'degraded';
      }
    }

    return health;
  }

  /**
   * Shutdown AI services
   */
  async shutdown() {
    logger.info('Shutting down AI services...');
    // Clean up any resources if needed
    this.initialized = false;
  }
}

module.exports = new AIService();