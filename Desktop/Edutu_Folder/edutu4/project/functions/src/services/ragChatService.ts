/**
 * Advanced RAG Chat Service for Edutu AI Assistant
 * Provides context-aware, personalized responses using retrieval-augmented generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { CohereClient } from 'cohere-ai';
import * as admin from 'firebase-admin';
import { vectorStore } from './vectorStore';
import { enhancedEmbeddingService } from './enhancedEmbeddingService';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

interface ChatContext {
  scholarships: any[];
  roadmaps: any[];
  chatHistory: any[];
  userContext: Record<string, any>;
  totalTokens: number;
}

interface RAGResponse {
  response: string;
  confidence: number;
  contextUsed: {
    scholarships: number;
    roadmaps: number;
    chatHistory: number;
  };
  followUpSuggestions: string[];
  metadata: {
    model: string;
    provider: string;
    totalTokens: number;
    responseTime: number;
  };
}

interface MessageIntent {
  primary: string;
  secondary?: string;
  entities: string[];
  urgency: 'low' | 'medium' | 'high';
  actionRequired: boolean;
}

export class RAGChatService {
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI;
  private cohere: CohereClient;
  private db: FirebaseFirestore.Firestore;

  // Model configurations
  private readonly modelConfigs = {
    gemini: {
      model: 'gemini-1.5-flash',
      maxTokens: 8192,
      temperature: 0.7,
      contextWindow: 32768
    },
    openai: {
      model: 'gpt-3.5-turbo',
      maxTokens: 4096,
      temperature: 0.7,
      contextWindow: 16385
    },
    cohere: {
      model: 'command',
      maxTokens: 4096,
      temperature: 0.7,
      contextWindow: 4096
    }
  };

  constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.cohere = new CohereClient({ token: process.env.COHERE_API_KEY || '' });
    this.db = admin.firestore();
  }

  /**
   * Generate contextualized RAG response
   */
  async generateRAGResponse(
    userId: string,
    message: string,
    sessionId: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // 1. Analyze message intent
      const intent = await this.analyzeMessageIntent(message);
      
      // 2. Generate query embedding
      const queryEmbedding = await enhancedEmbeddingService.generateEmbedding(
        message,
        'openai',
        { userId, contentType: 'query' }
      );

      // 3. Retrieve relevant context
      const context = await vectorStore.retrieveContext({
        userId,
        sessionId,
        query: message,
        queryEmbedding: queryEmbedding.embedding,
        maxResults: 10,
        similarityThreshold: 0.7,
        includeHistory: true,
        timeWindow: 24
      });

      // 4. Build comprehensive prompt
      const prompt = await this.buildRAGPrompt(
        message,
        context,
        intent,
        conversationHistory
      );

      // 5. Generate response with fallback chain
      const response = await this.generateWithFallback(prompt, intent);

      // 6. Store chat interaction
      await this.storeChatInteraction(
        userId,
        sessionId,
        message,
        response.response,
        intent,
        context
      );

      // 7. Generate follow-up suggestions
      const followUpSuggestions = await this.generateFollowUpSuggestions(
        message,
        response.response,
        context,
        intent
      );

      const responseTime = Date.now() - startTime;

      return {
        response: response.response,
        confidence: response.confidence,
        contextUsed: {
          scholarships: context.scholarships.length,
          roadmaps: context.roadmaps.length,
          chatHistory: context.chatHistory.length
        },
        followUpSuggestions,
        metadata: {
          ...response.metadata,
          responseTime
        }
      };

    } catch (error) {
      console.error('RAG response generation failed:', error);
      
      // Fallback to simple response
      return this.generateFallbackResponse(message, userId);
    }
  }

  /**
   * Start new conversation session
   */
  async startConversationSession(
    userId: string,
    initialMessage?: string
  ): Promise<{ sessionId: string; welcomeMessage: string }> {
    const sessionId = uuidv4();
    
    // Create session in vector store
    await vectorStore.upsertConversationSession(sessionId, userId);

    // Generate personalized welcome message
    const userContext = await vectorStore.getUserContext(userId);
    const welcomeMessage = await this.generateWelcomeMessage(userContext, initialMessage);

    return { sessionId, welcomeMessage };
  }

  /**
   * End conversation session with summary
   */
  async endConversationSession(sessionId: string): Promise<{
    summary: string;
    keyTopics: string[];
    recommendations: string[];
  }> {
    try {
      // Get conversation history from vector store
      const { data: messages } = await vectorStore.supabase
        .from('chat_history_embeddings')
        .select('message_text, message_type, message_intent, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!messages || messages.length === 0) {
        return {
          summary: 'No messages found in this session.',
          keyTopics: [],
          recommendations: []
        };
      }

      // Generate session summary
      const summary = await this.generateSessionSummary(messages);
      const keyTopics = this.extractKeyTopics(messages);
      const recommendations = await this.generateSessionRecommendations(messages, keyTopics);

      // Store session summary
      await vectorStore.endConversationSession(
        sessionId,
        summary,
        keyTopics,
        this.calculateSessionSentiment(messages)
      );

      return { summary, keyTopics, recommendations };

    } catch (error) {
      console.error('Failed to end conversation session:', error);
      return {
        summary: 'Session ended successfully.',
        keyTopics: [],
        recommendations: []
      };
    }
  }

  /**
   * Get contextual chat suggestions
   */
  async getChatSuggestions(
    userId: string,
    sessionId: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      // Get user context and recent activity
      const userContext = await vectorStore.getUserContext(userId);
      
      // Get recent conversation context
      const recentMessages = await this.getRecentMessages(sessionId, 5);

      // Generate contextual suggestions
      return this.generateContextualSuggestions(userContext, recentMessages, limit);

    } catch (error) {
      console.error('Failed to get chat suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  // Private helper methods

  /**
   * Analyze message intent using AI
   */
  private async analyzeMessageIntent(message: string): Promise<MessageIntent> {
    try {
      const model = this.gemini.getGenerativeModel({ 
        model: 'gemini-1.5-flash' 
      });

      const prompt = `Analyze this user message and extract intent information:

Message: "${message}"

Provide analysis in this JSON format:
{
  "primary": "primary intent (scholarship, roadmap, career, technical, general)",
  "secondary": "secondary intent if applicable",
  "entities": ["list", "of", "key", "entities"],
  "urgency": "low/medium/high",
  "actionRequired": true/false
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      try {
        const analysis = JSON.parse(responseText);
        return {
          primary: analysis.primary || 'general',
          secondary: analysis.secondary,
          entities: analysis.entities || [],
          urgency: analysis.urgency || 'medium',
          actionRequired: analysis.actionRequired || false
        };
      } catch (parseError) {
        console.warn('Failed to parse intent analysis, using defaults');
        return this.getDefaultIntent(message);
      }

    } catch (error) {
      console.warn('Intent analysis failed, using rule-based fallback:', error);
      return this.getDefaultIntent(message);
    }
  }

  /**
   * Build comprehensive RAG prompt
   */
  private async buildRAGPrompt(
    userMessage: string,
    context: ChatContext,
    intent: MessageIntent,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = this.getSystemPrompt(context.userContext);
    
    let contextSection = '';

    // Add scholarship context if relevant
    if (context.scholarships.length > 0) {
      contextSection += '\n## Available Scholarships:\n';
      context.scholarships.forEach((scholarship, index) => {
        contextSection += `${index + 1}. **${scholarship.metadata.title}**\n`;
        contextSection += `   Provider: ${scholarship.metadata.provider}\n`;
        contextSection += `   Category: ${scholarship.metadata.category}\n`;
        contextSection += `   Summary: ${scholarship.content.substring(0, 200)}...\n\n`;
      });
    }

    // Add roadmap context if relevant
    if (context.roadmaps.length > 0) {
      contextSection += '\n## Relevant Learning Roadmaps:\n';
      context.roadmaps.forEach((roadmap, index) => {
        contextSection += `${index + 1}. **${roadmap.metadata.title}**\n`;
        contextSection += `   Duration: ${roadmap.metadata.duration}\n`;
        contextSection += `   Difficulty: ${roadmap.metadata.difficulty}\n`;
        contextSection += `   Skills: ${roadmap.metadata.skills?.join(', ')}\n`;
        contextSection += `   Overview: ${roadmap.content.substring(0, 200)}...\n\n`;
      });
    }

    // Add conversation history context
    if (context.chatHistory.length > 0) {
      contextSection += '\n## Recent Conversation Context:\n';
      context.chatHistory.slice(-5).forEach(msg => {
        contextSection += `- ${msg.metadata.messageType}: ${msg.content.substring(0, 100)}...\n`;
      });
    }

    // Add user profile context
    if (context.userContext.profile) {
      contextSection += '\n## User Profile:\n';
      contextSection += `- Education Level: ${context.userContext.profile.educationLevel || 'Not specified'}\n`;
      contextSection += `- Career Interests: ${context.userContext.profile.careerInterests?.join(', ') || 'Not specified'}\n`;
      contextSection += `- Learning Style: ${context.userContext.learningStyle || 'Mixed'}\n`;
      contextSection += `- Current Skill Level: ${context.userContext.skillLevel || 'Beginner'}\n`;
    }

    // Add active goals if available
    if (context.userContext.activeGoals?.length > 0) {
      contextSection += '\n## Current Goals:\n';
      context.userContext.activeGoals.forEach((goal: any) => {
        contextSection += `- ${goal.title}: ${goal.description || 'No description'}\n`;
      });
    }

    const conversationHistoryText = conversationHistory
      .slice(-5)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `${systemPrompt}

${contextSection}

## Conversation History:
${conversationHistoryText}

## Current User Message:
${userMessage}

## Message Intent Analysis:
- Primary Intent: ${intent.primary}
- Key Entities: ${intent.entities.join(', ')}
- Urgency: ${intent.urgency}
- Action Required: ${intent.actionRequired}

Please provide a helpful, personalized response based on the context above. Be specific and actionable, referencing relevant scholarships, roadmaps, or conversation history when appropriate.

Response Guidelines:
1. Address the user's specific question directly
2. Use relevant context from scholarships/roadmaps when applicable
3. Provide actionable next steps
4. Maintain a supportive, encouraging tone
5. Keep responses concise but comprehensive
6. Include specific details from the context when relevant`;
  }

  /**
   * Generate response with provider fallback
   */
  private async generateWithFallback(
    prompt: string,
    intent: MessageIntent
  ): Promise<{
    response: string;
    confidence: number;
    metadata: { model: string; provider: string; totalTokens: number };
  }> {
    const providers = this.getProviderOrder(intent.urgency);

    for (const provider of providers) {
      try {
        return await this.generateWithProvider(prompt, provider);
      } catch (error) {
        console.warn(`Response generation failed with ${provider}:`, error);
        continue;
      }
    }

    throw new Error('All response generation providers failed');
  }

  /**
   * Generate response with specific provider
   */
  private async generateWithProvider(
    prompt: string,
    provider: 'gemini' | 'openai' | 'cohere'
  ): Promise<{
    response: string;
    confidence: number;
    metadata: { model: string; provider: string; totalTokens: number };
  }> {
    switch (provider) {
      case 'gemini':
        return await this.generateWithGemini(prompt);
      case 'openai':
        return await this.generateWithOpenAI(prompt);
      case 'cohere':
        return await this.generateWithCohere(prompt);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async generateWithGemini(prompt: string) {
    const model = this.gemini.getGenerativeModel({
      model: this.modelConfigs.gemini.model
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return {
      response,
      confidence: 0.9,
      metadata: {
        model: this.modelConfigs.gemini.model,
        provider: 'gemini',
        totalTokens: this.estimateTokens(prompt + response)
      }
    };
  }

  private async generateWithOpenAI(prompt: string) {
    const response = await this.openai.chat.completions.create({
      model: this.modelConfigs.openai.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.modelConfigs.openai.temperature,
      max_tokens: this.modelConfigs.openai.maxTokens
    });

    return {
      response: response.choices[0].message.content || '',
      confidence: 0.85,
      metadata: {
        model: this.modelConfigs.openai.model,
        provider: 'openai',
        totalTokens: response.usage?.total_tokens || 0
      }
    };
  }

  private async generateWithCohere(prompt: string) {
    const response = await this.cohere.generate({
      model: this.modelConfigs.cohere.model,
      prompt,
      maxTokens: this.modelConfigs.cohere.maxTokens,
      temperature: this.modelConfigs.cohere.temperature
    });

    return {
      response: response.generations[0].text,
      confidence: 0.8,
      metadata: {
        model: this.modelConfigs.cohere.model,
        provider: 'cohere',
        totalTokens: this.estimateTokens(prompt + response.generations[0].text)
      }
    };
  }

  /**
   * Store chat interaction in both Firestore and vector database
   */
  private async storeChatInteraction(
    userId: string,
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
    intent: MessageIntent,
    context: ChatContext
  ): Promise<void> {
    const timestamp = new Date();
    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();

    // Store in Firestore for traditional queries
    const chatBatch = this.db.batch();
    
    const userMessageRef = this.db.collection('chatMessages').doc(userMessageId);
    chatBatch.set(userMessageRef, {
      messageId: userMessageId,
      sessionId,
      userId,
      type: 'user',
      content: userMessage,
      intent: intent.primary,
      entities: intent.entities,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        urgency: intent.urgency,
        actionRequired: intent.actionRequired
      }
    });

    const assistantMessageRef = this.db.collection('chatMessages').doc(assistantMessageId);
    chatBatch.set(assistantMessageRef, {
      messageId: assistantMessageId,
      sessionId,
      userId,
      type: 'assistant',
      content: assistantResponse,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        contextUsed: {
          scholarships: context.scholarships.length,
          roadmaps: context.roadmaps.length,
          chatHistory: context.chatHistory.length
        }
      }
    });

    await chatBatch.commit();

    // Store in vector database for semantic search
    await Promise.all([
      vectorStore.storeChatMessage(
        userId,
        sessionId,
        userMessageId,
        userMessage,
        'user',
        intent.primary
      ),
      vectorStore.storeChatMessage(
        userId,
        sessionId,
        assistantMessageId,
        assistantResponse,
        'assistant'
      )
    ]);
  }

  /**
   * Generate follow-up suggestions based on context
   */
  private async generateFollowUpSuggestions(
    userMessage: string,
    response: string,
    context: ChatContext,
    intent: MessageIntent
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Intent-based suggestions
    switch (intent.primary) {
      case 'scholarship':
        suggestions.push(
          'Tell me about application deadlines for these scholarships',
          'How can I improve my scholarship application?',
          'What documents do I need for scholarship applications?'
        );
        break;
      
      case 'roadmap':
        suggestions.push(
          'Create a personalized study schedule for this roadmap',
          'What skills should I focus on first?',
          'How do I track my progress on this roadmap?'
        );
        break;
      
      case 'career':
        suggestions.push(
          'What are the job prospects in this field?',
          'How do I build a portfolio for this career?',
          'What networking opportunities are available?'
        );
        break;
      
      default:
        suggestions.push(
          'Find scholarships related to my interests',
          'Show me relevant learning roadmaps',
          'Help me set career goals'
        );
    }

    // Context-based suggestions
    if (context.scholarships.length > 0) {
      suggestions.push('Compare these scholarships for me');
    }
    
    if (context.roadmaps.length > 0) {
      suggestions.push('Which roadmap is best for my skill level?');
    }

    // Return top 3 unique suggestions
    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * Generate personalized welcome message
   */
  private async generateWelcomeMessage(
    userContext: Record<string, any>,
    initialMessage?: string
  ): Promise<string> {
    const name = userContext.profile?.name || 'there';
    const interests = userContext.profile?.careerInterests || [];
    const goals = userContext.activeGoals || [];

    let welcomeMessage = `Hi ${name}! 👋 I'm your AI opportunity coach, ready to help you discover scholarships, create learning roadmaps, and guide your career journey.`;

    if (interests.length > 0) {
      welcomeMessage += ` I see you're interested in ${interests.slice(0, 2).join(' and ')}.`;
    }

    if (goals.length > 0) {
      welcomeMessage += ` I noticed you have some active goals we can work on together.`;
    }

    welcomeMessage += '\n\nWhat would you like to explore today?';

    return welcomeMessage;
  }

  /**
   * Generate session summary
   */
  private async generateSessionSummary(messages: any[]): Promise<string> {
    if (messages.length === 0) return 'No conversation took place.';

    const conversationText = messages
      .map(msg => `${msg.message_type}: ${msg.message_text}`)
      .join('\n');

    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Summarize this conversation in 2-3 sentences:

${conversationText}

Focus on the main topics discussed and any outcomes or recommendations provided.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Failed to generate session summary:', error);
      return `Session covered ${messages.length} messages with topics including: ${this.extractKeyTopics(messages).join(', ')}.`;
    }
  }

  // Utility methods

  private getSystemPrompt(userContext: Record<string, any>): string {
    return `You are Edutu, an AI opportunity coach specifically designed to help young African professionals (ages 16-30) discover and pursue educational and career opportunities. 

Your role is to:
- Help users find scholarships, internships, and educational opportunities
- Provide career guidance and skill development advice
- Create personalized learning roadmaps
- Connect users with relevant resources and communities
- Provide motivation and actionable guidance

Always be encouraging, specific, and actionable in your responses. Focus on opportunities available in Africa or globally accessible to African youth. When possible, suggest concrete next steps and resources.

Keep responses conversational, helpful, and motivating. Use the provided context to give personalized recommendations.`;
  }

  private getDefaultIntent(message: string): MessageIntent {
    const lowerMessage = message.toLowerCase();
    
    let primary = 'general';
    if (lowerMessage.includes('scholarship') || lowerMessage.includes('funding')) {
      primary = 'scholarship';
    } else if (lowerMessage.includes('roadmap') || lowerMessage.includes('learn')) {
      primary = 'roadmap';
    } else if (lowerMessage.includes('career') || lowerMessage.includes('job')) {
      primary = 'career';
    }

    return {
      primary,
      entities: [],
      urgency: 'medium',
      actionRequired: false
    };
  }

  private getProviderOrder(urgency: string): ('gemini' | 'openai' | 'cohere')[] {
    switch (urgency) {
      case 'high':
        return ['gemini', 'openai', 'cohere'];
      case 'low':
        return ['cohere', 'openai', 'gemini'];
      default:
        return ['openai', 'gemini', 'cohere'];
    }
  }

  private async getRecentMessages(sessionId: string, limit: number): Promise<any[]> {
    const { data } = await vectorStore.supabase
      .from('chat_history_embeddings')
      .select('message_text, message_type, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  private async generateContextualSuggestions(
    userContext: Record<string, any>,
    recentMessages: any[],
    limit: number
  ): Promise<string[]> {
    const suggestions = [
      'Find scholarships for my field of interest',
      'Create a learning roadmap for my career goals',
      'What skills should I develop next?',
      'Help me find internship opportunities',
      'How can I improve my application profile?'
    ];

    return suggestions.slice(0, limit);
  }

  private getDefaultSuggestions(): string[] {
    return [
      'Find scholarships for me',
      'Show me learning roadmaps',
      'Help with career planning',
      'What skills should I learn?',
      'Find internship opportunities'
    ];
  }

  private extractKeyTopics(messages: any[]): string[] {
    const topics = new Set<string>();
    
    messages.forEach(msg => {
      if (msg.message_intent) {
        topics.add(msg.message_intent);
      }
    });

    return Array.from(topics);
  }

  private calculateSessionSentiment(messages: any[]): number {
    const sentiments = messages
      .filter(msg => msg.sentiment_score !== undefined)
      .map(msg => msg.sentiment_score);

    if (sentiments.length === 0) return 0;
    
    return sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
  }

  private async generateSessionRecommendations(
    messages: any[],
    keyTopics: string[]
  ): Promise<string[]> {
    const recommendations = [];
    
    if (keyTopics.includes('scholarship')) {
      recommendations.push('Continue exploring scholarship opportunities that match your profile');
    }
    
    if (keyTopics.includes('roadmap')) {
      recommendations.push('Start working on the roadmap tasks we discussed');
    }
    
    if (keyTopics.includes('career')) {
      recommendations.push('Research the career paths we talked about');
    }

    return recommendations;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private generateFallbackResponse(message: string, userId: string): RAGResponse {
    return {
      response: "I apologize, but I'm experiencing some technical difficulties right now. However, I'm still here to help! Could you please rephrase your question, or feel free to ask about scholarships, career advice, or learning roadmaps? I'm here to support your journey! 🌟",
      confidence: 0.5,
      contextUsed: { scholarships: 0, roadmaps: 0, chatHistory: 0 },
      followUpSuggestions: [
        'Ask about scholarships',
        'Get career guidance',
        'Find learning resources'
      ],
      metadata: {
        model: 'fallback',
        provider: 'fallback',
        totalTokens: 0,
        responseTime: 0
      }
    };
  }
}

export const ragChatService = new RAGChatService();