// Enhanced Chat Service with Direct LLM Integration
// Provides fallback LLM integration when backend is unavailable

import { auth, db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { sendChatMessage } from './apiService';
import { unifiedBackendService, type ChatRequest } from './unifiedBackendService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  ragContext?: RAGContext;
  streaming?: boolean;
}

interface RAGContext {
  scholarships: any[];
  userProfile: any;
  recentConversations: any[];
  contextUsed: boolean;
}

interface AIResponse {
  content: string;
  buttons?: Array<{
    text: string;
    type: 'scholarship' | 'community' | 'expert' | 'link';
    data?: any;
  }>;
  ragContext?: RAGContext;
  streaming?: boolean;
  source: 'api' | 'fallback' | 'enhanced_local';
}

class EnhancedChatService {
  private conversationHistory: ChatMessage[] = [];
  private conversationId: string | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 2;

  constructor() {
    this.initializeSystemPrompt();
  }

  private initializeSystemPrompt() {
    this.conversationHistory = [{
      id: 'system',
      role: 'system',
      content: `You are Edutu AI, an expert opportunity coach for young African professionals (ages 16-30). 

Your mission: Help users discover and pursue educational and career opportunities through personalized guidance.

Core capabilities:
- Find and recommend scholarships, grants, and educational opportunities
- Provide career guidance and skill development advice
- Create personalized learning and application roadmaps
- Connect users with relevant communities and mentors
- Offer motivational support and practical next steps

Communication style:
- Warm, encouraging, and professional
- Specific and actionable advice
- Use relevant emojis sparingly for engagement
- Focus on opportunities available to African youth globally
- Always provide concrete next steps

When discussing opportunities:
- Reference specific programs when possible
- Include deadlines and requirements
- Suggest application strategies
- Recommend skill building activities

Remember: Every interaction should move the user closer to achieving their educational and career goals.`,
      timestamp: new Date()
    }];
  }

  async generateResponse(
    userMessage: string, 
    userContext?: { name?: string; age?: number }
  ): Promise<AIResponse> {
    // Add user message to history
    const userMessageObj: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    this.conversationHistory.push(userMessageObj);

    // Maintain conversation history (keep last 20 exchanges + system prompt)
    if (this.conversationHistory.length > 41) { // 20 exchanges * 2 + 1 system
      this.conversationHistory = [
        this.conversationHistory[0], // Keep system prompt
        ...this.conversationHistory.slice(-40) // Keep last 40 messages
      ];
    }

    try {
      // Step 1: Build enhanced RAG context
      const ragContext = await this.buildEnhancedRAGContext(userMessage, userContext);

      // Step 2: Try multiple backend endpoints for resilience
      if (this.retryCount < this.maxRetries) {
        try {
          console.log('🗨️ Attempting backend API call...');
          
          const backendRequest: ChatRequest = {
            message: userMessage,
            conversationId: this.conversationId || undefined,
            userContext: {
              name: userContext?.name,
              age: userContext?.age,
              ragContext
            }
          };
          
          // Try unified backend service
          let backendResponse;
          try {
            backendResponse = await unifiedBackendService.sendChatMessage(backendRequest);
          } catch (unifiedError) {
            console.warn('📦 Unified backend service failed, trying direct API:', unifiedError.message);
            
            // Fallback to direct API call
            const { sendChatMessage } = await import('./apiService');
            const apiResponse = await sendChatMessage(
              userMessage,
              this.conversationId,
              {
                name: userContext?.name,
                age: userContext?.age,
                ragContext
              }
            );
            
            if (apiResponse.success) {
              backendResponse = {
                success: true,
                response: apiResponse.response,
                conversationId: apiResponse.conversationId,
                source: 'api'
              };
            } else {
              throw new Error('Direct API call failed');
            }
          }
          
          if (backendResponse && backendResponse.success) {
            this.retryCount = 0; // Reset on success
            this.conversationId = backendResponse.conversationId || this.conversationId;
            this.addToHistory(backendResponse.response, ragContext);
            
            console.log('✅ Backend API call successful');
            
            return {
              content: backendResponse.response,
              buttons: this.generateContextualButtons(userMessage, backendResponse.response, ragContext),
              ragContext,
              streaming: false,
              source: backendResponse.source === 'fallback-llm' ? 'enhanced_local' : 'api'
            };
          }
        } catch (backendError) {
          console.warn('❌ All backend methods failed:', backendError.message);
          this.retryCount++;
        }
      }

      // Step 3: Use enhanced local AI response with RAG
      console.log('🤖 Using enhanced local response with RAG context');
      
      const localResponse = await this.generateEnhancedLocalResponse(
        userMessage, 
        userContext, 
        ragContext
      );
      
      this.addToHistory(localResponse.content, ragContext);
      
      console.log('✅ Enhanced local response generated successfully');
      
      return {
        ...localResponse,
        source: 'enhanced_local'
      };

    } catch (error) {
      console.error('All chat methods failed:', error);
      // Ultimate fallback
      const fallbackResponse = this.generateFallbackResponse(userMessage, userContext);
      this.addToHistory(fallbackResponse.content);
      return {
        ...fallbackResponse,
        source: 'fallback'
      };
    }
  }

  // Legacy method - now uses unified backend service
  private async tryBackendAPI(
    userMessage: string, 
    userContext: any, 
    ragContext: RAGContext
  ): Promise<AIResponse | null> {
    try {
      // Try original API service as fallback
      const apiResponse = await sendChatMessage(userMessage, this.conversationId, {
        ...userContext,
        ragContext,
        conversationHistory: this.getRecentContext()
      });

      if (apiResponse.success && apiResponse.response) {
        if (apiResponse.conversationId) {
          this.conversationId = apiResponse.conversationId;
        }

        return {
          content: apiResponse.response,
          buttons: this.generateContextualButtons(userMessage, apiResponse.response, ragContext),
          ragContext,
          streaming: false
        };
      }
      return null;
    } catch (error) {
      console.warn('Legacy API call failed:', error);
      return null;
    }
  }

  private async buildEnhancedRAGContext(
    userMessage: string, 
    userContext?: { name?: string; age?: number }
  ): Promise<RAGContext> {
    const ragContext: RAGContext = {
      scholarships: [],
      userProfile: null,
      recentConversations: [],
      contextUsed: false
    };

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return ragContext;
    }

    try {
      // Get user profile
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        ragContext.userProfile = userDoc.data();
      }

      // Get relevant scholarships with enhanced matching
      ragContext.scholarships = await this.getRelevantScholarships(userMessage, ragContext.userProfile);
      
      // Get recent conversations for context
      ragContext.recentConversations = this.conversationHistory
        .filter(msg => msg.role !== 'system')
        .slice(-6);

      ragContext.contextUsed = 
        ragContext.scholarships.length > 0 || 
        !!ragContext.userProfile ||
        ragContext.recentConversations.length > 0;

      console.log(`Enhanced RAG Context: ${ragContext.scholarships.length} scholarships, profile: ${!!ragContext.userProfile}`);
      
    } catch (error) {
      console.error('Error building RAG context:', error);
    }

    return ragContext;
  }

  private async getRelevantScholarships(userMessage: string, userProfile: any): Promise<any[]> {
    try {
      const scholarshipsRef = collection(db, 'scholarships');
      const scholarshipQuery = query(
        scholarshipsRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(scholarshipQuery);
      const allScholarships = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Enhanced scoring algorithm
      const scoredScholarships = allScholarships
        .map(scholarship => ({
          ...scholarship,
          relevanceScore: this.calculateRelevanceScore(
            scholarship, 
            userMessage, 
            userProfile,
            this.conversationHistory
          )
        }))
        .filter(scholarship => scholarship.relevanceScore > 3)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);

      return scoredScholarships;
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      return [];
    }
  }

  private calculateRelevanceScore(
    scholarship: any, 
    userMessage: string, 
    userProfile: any,
    conversationHistory: ChatMessage[]
  ): number {
    let score = 1; // Base score

    const messageLower = userMessage.toLowerCase();
    const scholarshipText = [
      scholarship.title || '',
      scholarship.summary || '',
      scholarship.description || '',
      scholarship.category || '',
      scholarship.provider || '',
      ...(scholarship.tags || [])
    ].join(' ').toLowerCase();

    // Message relevance (high weight)
    const scholarshipKeywords = [
      'scholarship', 'funding', 'grant', 'financial aid', 'tuition', 
      'study', 'apply', 'opportunity', 'fellowship', 'bursary'
    ];
    const scholarshipMatches = scholarshipKeywords.filter(keyword => 
      messageLower.includes(keyword)
    ).length;
    score += scholarshipMatches * 4;

    // Keyword matching in content
    const messageWords = messageLower
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'can', 'you', 'how', 'what', 'help', 'me'].includes(word));

    for (const word of messageWords) {
      if ((scholarship.title || '').toLowerCase().includes(word)) {
        score += 5; // Title matches are very important
      } else if ((scholarship.provider || '').toLowerCase().includes(word)) {
        score += 3;
      } else if (scholarshipText.includes(word)) {
        score += 2;
      }
    }

    // User profile matching
    if (userProfile?.preferences) {
      const prefs = userProfile.preferences;
      
      // Career interests
      if (prefs.careerInterests && Array.isArray(prefs.careerInterests)) {
        for (const interest of prefs.careerInterests) {
          if (scholarshipText.includes(interest.toLowerCase())) {
            score += 6;
          }
        }
      }

      // Education level
      if (prefs.educationLevel) {
        const eduLevel = prefs.educationLevel.toLowerCase();
        if (scholarshipText.includes(eduLevel) ||
            (eduLevel.includes('bachelor') && scholarshipText.includes('undergraduate')) ||
            (eduLevel.includes('master') && scholarshipText.includes('graduate'))) {
          score += 4;
        }
      }

      // Skills matching
      if (prefs.currentSkills && Array.isArray(prefs.currentSkills)) {
        for (const skill of prefs.currentSkills) {
          if (scholarshipText.includes(skill.toLowerCase())) {
            score += 3;
          }
        }
      }
    }

    // Conversation history context
    const recentMessages = conversationHistory.slice(-4);
    for (const msg of recentMessages) {
      const msgWords = msg.content.toLowerCase().split(/\s+/);
      for (const word of msgWords) {
        if (word.length > 3 && scholarshipText.includes(word)) {
          score += 1;
        }
      }
    }

    // Deadline urgency (prefer upcoming deadlines)
    if (scholarship.deadline && scholarship.deadline !== 'Not specified') {
      try {
        const deadline = new Date(
          scholarship.deadline.seconds ? 
          scholarship.deadline.seconds * 1000 : 
          scholarship.deadline
        );
        const now = new Date();
        const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysUntilDeadline > 0 && daysUntilDeadline < 365) {
          score += Math.max(1, 4 - Math.floor(daysUntilDeadline / 90));
        }
      } catch (error) {
        // Invalid date, skip
      }
    }

    // Category-specific bonuses
    if (messageLower.includes('tech') && scholarship.category?.toLowerCase().includes('tech')) {
      score += 3;
    }
    if (messageLower.includes('business') && scholarship.category?.toLowerCase().includes('business')) {
      score += 3;
    }
    if (messageLower.includes('health') && scholarship.category?.toLowerCase().includes('health')) {
      score += 3;
    }

    return Math.max(0, score);
  }

  private async generateEnhancedLocalResponse(
    userMessage: string,
    userContext?: { name?: string; age?: number },
    ragContext?: RAGContext
  ): Promise<AIResponse> {
    const messageLower = userMessage.toLowerCase();
    const userName = userContext?.name || ragContext?.userProfile?.name || 'there';

    // Use RAG context for personalized responses
    if (ragContext?.contextUsed && ragContext.scholarships.length > 0) {
      return this.generateRAGEnhancedResponse(userMessage, userName, ragContext);
    }

    // Enhanced pattern-based responses
    if (this.matchesKeywords(messageLower, ['scholarship', 'funding', 'financial aid', 'grant'])) {
      return this.generateScholarshipResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['career', 'job', 'profession', 'work'])) {
      return this.generateCareerResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['skill', 'learn', 'course', 'training', 'study'])) {
      return this.generateSkillsResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['roadmap', 'plan', 'goal', 'strategy'])) {
      return this.generateRoadmapResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['network', 'mentor', 'community', 'connect'])) {
      return this.generateNetworkingResponse(userName, userContext, ragContext);
    }

    // Conversational responses
    if (this.matchesKeywords(messageLower, ['hello', 'hi', 'hey', 'start'])) {
      return this.generateWelcomeResponse(userName, userContext, ragContext);
    }

    // Default intelligent response
    return this.generateDefaultIntelligentResponse(userName, userMessage, ragContext);
  }

  private generateRAGEnhancedResponse(
    userMessage: string, 
    userName: string, 
    ragContext: RAGContext
  ): AIResponse {
    const scholarships = ragContext.scholarships.slice(0, 3);
    let response = `Hi ${userName}! 🌟 Great question! Based on your interests and current opportunities, I found some excellent matches:\n\n`;

    scholarships.forEach((scholarship, index) => {
      const deadline = this.formatDeadline(scholarship.deadline);
      const amount = scholarship.amount || scholarship.value || 'Funding available';
      
      response += `**${index + 1}. ${scholarship.title}**\n`;
      response += `🏢 ${scholarship.provider || scholarship.organization}\n`;
      response += `📅 Deadline: ${deadline}\n`;
      response += `💰 ${amount}\n`;
      response += `✨ ${scholarship.summary || scholarship.description?.substring(0, 120) + '...' || 'Excellent opportunity for your goals!'}\n\n`;
    });

    // Add personalized insights
    response += `🎯 **Why these are perfect for you:**\n`;
    
    if (ragContext.userProfile?.preferences?.careerInterests) {
      response += `• Aligns with your interests in ${ragContext.userProfile.preferences.careerInterests.slice(0, 2).join(' and ')}\n`;
    }
    
    if (ragContext.userProfile?.preferences?.educationLevel) {
      response += `• Matches your ${ragContext.userProfile.preferences.educationLevel} education level\n`;
    }

    response += `• Selected from ${ragContext.scholarships.length} relevant opportunities in our database\n`;
    response += `\n💡 **Next Steps:**\n• Click below to explore applications\n• Start gathering required documents\n• Set up deadline reminders\n• I'm here to help with applications!`;

    return {
      content: response,
      buttons: [
        { text: "📋 Application Guide", type: "expert", data: { action: "application_help" } },
        { text: "🔍 More Opportunities", type: "scholarship", data: { action: "search_more" } },
        { text: "🗓️ Create Roadmap", type: "expert", data: { action: "create_roadmap" } },
        { text: "🤝 Join Community", type: "community", data: { action: "join_community" } }
      ],
      ragContext,
      streaming: false
    };
  }

  private generateScholarshipResponse(
    userName: string, 
    userContext?: any, 
    ragContext?: RAGContext
  ): AIResponse {
    let response = `🎓 Excellent question about scholarships, ${userName}! Let me help you find the perfect funding opportunities.\n\n`;
    
    response += `**🌟 Top-Tier Scholarships for African Students:**\n\n`;
    response += `**🏆 Mastercard Foundation Scholars Program**\n`;
    response += `• Full funding + leadership development\n`;
    response += `• Multiple partner universities globally\n`;
    response += `• Focus on transformational leadership\n\n`;
    
    response += `**🎯 Mandela Rhodes Scholarship**\n`;
    response += `• Postgraduate studies + mentorship\n`;
    response += `• Leadership and entrepreneurship focus\n`;
    response += `• Available for multiple African countries\n\n`;
    
    response += `**👩‍🎓 AAUW International Fellowships**\n`;
    response += `• Supporting women in graduate studies\n`;
    response += `• $18,000-$30,000 funding available\n`;
    response += `• Research and professional development\n\n`;

    // Add personalized suggestions if profile available
    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `**🎯 Based on Your Interests (${interests.slice(0, 2).join(', ')}):**\n`;
      response += `• I can find field-specific scholarships\n`;
      response += `• Connect you with relevant programs\n`;
      response += `• Help create application strategies\n\n`;
    }

    response += `**💡 Application Strategy:**\n`;
    response += `• Start 6-8 months before deadlines\n`;
    response += `• Focus on leadership and impact in essays\n`;
    response += `• Get strong letters of recommendation\n`;
    response += `• Demonstrate community involvement\n\n`;
    response += `Ready to dive deeper? I can create a personalized search and application plan for you! 🚀`;

    return {
      content: response,
      buttons: [
        { text: "🔍 Find Field-Specific Scholarships", type: "scholarship", data: { action: "field_specific" } },
        { text: "📝 Application Strategy Guide", type: "expert", data: { action: "application_strategy" } },
        { text: "🗓️ Create Application Timeline", type: "expert", data: { action: "timeline" } },
        { text: "👥 Join Scholarship Community", type: "community", data: { action: "join" } }
      ],
      streaming: false
    };
  }

  private generateCareerResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🚀 Great question about career development, ${userName}! Let me share insights on the most promising paths for young African professionals:\n\n`;

    response += `**🔥 High-Growth Sectors in Africa:**\n\n`;
    
    response += `**💻 Technology & Innovation**\n`;
    response += `• Software Development (Python, JavaScript, Mobile apps)\n`;
    response += `• Data Science & AI/ML\n`;
    response += `• Cybersecurity & Cloud Computing\n`;
    response += `• Average starting salary: $25,000-45,000+\n\n`;
    
    response += `**🌱 Green Economy & Sustainability**\n`;
    response += `• Renewable Energy Engineering\n`;
    response += `• Sustainable Agriculture Technology\n`;
    response += `• Environmental Consulting\n`;
    response += `• Climate Finance & Carbon Markets\n\n`;
    
    response += `**🏥 Healthcare Innovation**\n`;
    response += `• Telemedicine & Health Tech\n`;
    response += `• Medical Device Development\n`;
    response += `• Public Health Policy\n`;
    response += `• Pharmaceutical Research\n\n`;
    
    response += `**💰 Financial Technology (FinTech)**\n`;
    response += `• Mobile Payment Solutions\n`;
    response += `• Blockchain & Cryptocurrency\n`;
    response += `• Digital Banking Services\n`;
    response += `• Investment & Wealth Management\n\n`;

    // Add personalized career advice if profile available
    if (ragContext?.userProfile?.preferences) {
      const prefs = ragContext.userProfile.preferences;
      if (prefs.careerInterests && prefs.careerInterests.length > 0) {
        response += `**🎯 Based on Your Interests (${prefs.careerInterests[0]}):**\n`;
        response += `• I can create a detailed career roadmap\n`;
        response += `• Find relevant internships and opportunities\n`;
        response += `• Connect you with industry mentors\n\n`;
      }
    }

    response += `**📈 Success Strategy:**\n`;
    response += `1. **Identify Your Passion** - What energizes you?\n`;
    response += `2. **Develop Core Skills** - Technical + soft skills\n`;
    response += `3. **Build Portfolio Projects** - Show your capabilities\n`;
    response += `4. **Network Strategically** - Connect with professionals\n`;
    response += `5. **Gain Experience** - Internships, freelancing, volunteering\n\n`;
    response += `Which field interests you most? I'll create a personalized roadmap! 🎯`;

    return {
      content: response,
      buttons: [
        { text: "💻 Tech Career Roadmap", type: "expert", data: { career: "technology" } },
        { text: "🌿 Green Jobs Guide", type: "expert", data: { career: "sustainability" } },
        { text: "💡 FinTech Opportunities", type: "expert", data: { career: "fintech" } },
        { text: "🤝 Find Career Mentors", type: "community", data: { action: "mentors" } }
      ],
      streaming: false
    };
  }

  private generateSkillsResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `💪 Smart thinking, ${userName}! Continuous learning is your competitive advantage. Here's a strategic approach:\n\n`;

    response += `**🎯 Most In-Demand Skills for 2024:**\n\n`;
    
    response += `**💻 Technical Skills (High ROI)**\n`;
    response += `• **Programming:** Python, JavaScript, SQL (Start here!)\n`;
    response += `• **Data Analysis:** Excel, Tableau, Power BI, R\n`;
    response += `• **AI/ML Basics:** Understanding GPT, automation tools\n`;
    response += `• **Cloud Computing:** AWS, Google Cloud basics\n`;
    response += `• **Digital Marketing:** SEO, social media, content creation\n\n`;
    
    response += `**🤝 Essential Soft Skills**\n`;
    response += `• **Communication:** Public speaking, technical writing\n`;
    response += `• **Leadership:** Team management, project coordination\n`;
    response += `• **Problem-Solving:** Analytical thinking, creativity\n`;
    response += `• **Adaptability:** Learning agility, change management\n\n`;
    
    response += `**🌍 Global Skills for African Professionals**\n`;
    response += `• **Cross-Cultural Communication**\n`;
    response += `• **Remote Work Proficiency**\n`;
    response += `• **Financial Literacy**\n`;
    response += `• **Entrepreneurship & Innovation**\n\n`;

    // Personalized skill recommendations
    if (ragContext?.userProfile?.preferences?.currentSkills) {
      const currentSkills = ragContext.userProfile.preferences.currentSkills;
      response += `**🚀 Building on Your Current Skills (${currentSkills.slice(0, 2).join(', ')}):**\n`;
      response += `• I can recommend complementary skills\n`;
      response += `• Create a learning roadmap\n`;
      response += `• Find relevant courses and certifications\n\n`;
    }

    response += `**📚 Learning Strategy:**\n`;
    response += `1. **Start with One Skill** - Focus for 3-6 months\n`;
    response += `2. **Practice Daily** - Even 30 minutes makes a difference\n`;
    response += `3. **Build Projects** - Apply skills to real problems\n`;
    response += `4. **Get Certified** - Add credentials to your profile\n`;
    response += `5. **Teach Others** - Solidify your knowledge\n\n`;
    response += `Which skill would you like to master first? Let's create your learning plan! 🎓`;

    return {
      content: response,
      buttons: [
        { text: "🐍 Start Python Journey", type: "expert", data: { skill: "python" } },
        { text: "📊 Data Analysis Track", type: "expert", data: { skill: "data_analysis" } },
        { text: "🗣️ Communication Skills", type: "expert", data: { skill: "communication" } },
        { text: "👥 Join Learning Community", type: "community", data: { action: "learning" } }
      ],
      streaming: false
    };
  }

  private generateRoadmapResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🎯 Excellent focus on planning, ${userName}! Strategic roadmaps are the foundation of success. Let me help you create one:\n\n`;

    response += `**🗺️ Roadmap Creation Framework:**\n\n`;
    response += `**1. Vision Setting (Week 1)**\n`;
    response += `• Define your 3-5 year goal clearly\n`;
    response += `• Identify why this matters to you\n`;
    response += `• Visualize your success outcome\n\n`;
    
    response += `**2. Gap Analysis (Week 2)**\n`;
    response += `• Current skills vs. required skills\n`;
    response += `• Experience gaps to fill\n`;
    response += `• Resources and connections needed\n\n`;
    
    response += `**3. Milestone Planning (Week 3)**\n`;
    response += `• Break into 6-month milestones\n`;
    response += `• Set monthly objectives\n`;
    response += `• Plan weekly action steps\n\n`;
    
    response += `**4. Resource Mapping (Week 4)**\n`;
    response += `• Courses and learning materials\n`;
    response += `• Mentors and network connections\n`;
    response += `• Funding and scholarship opportunities\n\n`;

    // Add personalized roadmap suggestions
    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `**🎯 For Your Career Goals (${interests[0]}):**\n`;
      response += `• I can create a specific roadmap\n`;
      response += `• Find relevant opportunities and resources\n`;
      response += `• Set up milestone tracking\n\n`;
    }

    response += `**📋 Popular Roadmap Templates:**\n`;
    response += `• **Scholarship Application Roadmap** - 6-month timeline\n`;
    response += `• **Career Transition Roadmap** - 12-month plan\n`;
    response += `• **Skill Development Roadmap** - 3-6 month sprints\n`;
    response += `• **Entrepreneurship Roadmap** - 18-month journey\n\n`;
    response += `**🚀 Next Steps:**\n`;
    response += `Choose a roadmap type below, and I'll create a detailed, personalized plan with specific actions, deadlines, and resources!`;

    return {
      content: response,
      buttons: [
        { text: "🎓 Scholarship Roadmap", type: "expert", data: { roadmap: "scholarship" } },
        { text: "💼 Career Transition Plan", type: "expert", data: { roadmap: "career" } },
        { text: "📈 Skill Development Path", type: "expert", data: { roadmap: "skills" } },
        { text: "🚀 Entrepreneurship Journey", type: "expert", data: { roadmap: "entrepreneurship" } }
      ],
      streaming: false
    };
  }

  private generateNetworkingResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🤝 Fantastic question, ${userName}! Networking is often the secret ingredient to breakthrough opportunities. Here's your strategic guide:\n\n`;

    response += `**🌟 Strategic Networking for African Professionals:**\n\n`;
    
    response += `**💻 Digital Networking Mastery**\n`;
    response += `• **LinkedIn:** Optimize profile, engage thoughtfully, connect strategically\n`;
    response += `• **Twitter/X:** Follow industry leaders, join conversations\n`;
    response += `• **Discord/Slack:** Join professional communities\n`;
    response += `• **GitHub:** Showcase your work (for tech professionals)\n\n`;
    
    response += `**🏢 Professional Platforms for Africa**\n`;
    response += `• **Africa Tech Summit Network**\n`;
    response += `• **Young African Leaders Initiative (YALI)**\n`;
    response += `• **Tony Elumelu Foundation Network**\n`;
    response += `• **African Development Bank Youth Network**\n\n`;
    
    response += `**🎯 Strategic Networking Approach:**\n`;
    response += `1. **Give First:** Share value before asking for help\n`;
    response += `2. **Be Authentic:** Build genuine relationships\n`;
    response += `3. **Follow Up:** Maintain connections consistently\n`;
    response += `4. **Add Value:** Share opportunities and insights\n`;
    response += `5. **Stay Organized:** Use CRM tools to track relationships\n\n`;

    response += `**🎪 Event Networking (Online & Offline)**\n`;
    response += `• **AfricArena Summit** - Tech and startup ecosystem\n`;
    response += `• **Africa Innovation Summit** - Cross-sector innovation\n`;
    response += `• **Virtual conferences** - Accessible globally\n`;
    response += `• **Local meetups** - Build community connections\n\n`;

    response += `**👥 Mentorship & Community Building:**\n`;
    response += `• **Identify potential mentors** in your field\n`;
    response += `• **Join alumni networks** from schools/programs\n`;
    response += `• **Participate in online communities** relevant to your interests\n`;
    response += `• **Volunteer for causes** you care about\n\n`;

    response += `Ready to build your professional network? I can help you create a networking strategy and find the right communities to join! 🌟`;

    return {
      content: response,
      buttons: [
        { text: "📝 LinkedIn Strategy Guide", type: "expert", data: { action: "linkedin_guide" } },
        { text: "🎯 Find Mentors", type: "expert", data: { action: "find_mentors" } },
        { text: "👥 Join Professional Communities", type: "community", data: { action: "professional" } },
        { text: "📅 Networking Events Calendar", type: "link", data: { url: "#events" } }
      ],
      streaming: false
    };
  }

  private generateWelcomeResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `👋 Hello ${userName}! Welcome to Edutu AI - your personal opportunity coach! \n\n`;

    response += `I'm here to help you unlock amazing possibilities for your future. Whether you're looking for:\n\n`;
    response += `🎓 **Scholarships & Educational Opportunities**\n`;
    response += `💼 **Career Guidance & Professional Development**\n`;
    response += `🚀 **Skill Building & Learning Pathways**\n`;
    response += `🎯 **Goal Setting & Strategic Planning**\n`;
    response += `🤝 **Networking & Mentorship Connections**\n\n`;

    // Add personalized welcome if profile exists
    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `I see you're interested in ${interests.slice(0, 2).join(' and ')} - exciting fields with great opportunities! 🌟\n\n`;
    }

    response += `💡 **Quick Start Options:**\n`;
    response += `• Ask me anything about opportunities\n`;
    response += `• Request a personalized roadmap\n`;
    response += `• Get scholarship recommendations\n`;
    response += `• Explore career paths\n\n`;
    response += `What would you like to explore first? I'm here to make your journey to success as smooth as possible! ✨`;

    return {
      content: response,
      buttons: [
        { text: "🔍 Find Opportunities", type: "scholarship", data: { action: "explore" } },
        { text: "🗺️ Create My Roadmap", type: "expert", data: { action: "roadmap" } },
        { text: "💼 Career Guidance", type: "expert", data: { action: "career" } },
        { text: "🤝 Join Community", type: "community", data: { action: "welcome" } }
      ],
      streaming: false
    };
  }

  private generateDefaultIntelligentResponse(
    userName: string, 
    userMessage: string, 
    ragContext?: RAGContext
  ): AIResponse {
    let response = `Thanks for that question, ${userName}! 🌟 I'm here to help you navigate your journey to success.\n\n`;

    // Try to extract intent from the message
    const messageLower = userMessage.toLowerCase();
    
    if (messageLower.includes('help')) {
      response += `I'd love to help! I'm specialized in:\n\n`;
      response += `• **Finding opportunities** - scholarships, grants, programs\n`;
      response += `• **Career planning** - paths, skills, strategies\n`;
      response += `• **Application support** - essays, timelines, requirements\n`;
      response += `• **Skill development** - learning paths and resources\n`;
      response += `• **Goal achievement** - roadmaps and milestones\n\n`;
    } else if (messageLower.includes('advice')) {
      response += `Here's some strategic advice for young African professionals:\n\n`;
      response += `🎯 **Focus on high-impact activities:**\n`;
      response += `• Build skills that solve real problems\n`;
      response += `• Network with purpose and authenticity\n`;
      response += `• Apply for opportunities consistently\n`;
      response += `• Document and share your journey\n\n`;
    } else {
      response += `That's an interesting point! Let me help you explore some related opportunities and strategies.\n\n`;
    }

    // Add context-aware suggestions if profile available
    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `**Based on your interests in ${interests[0]}:**\n`;
      response += `• I can find relevant opportunities\n`;
      response += `• Suggest skill development paths\n`;
      response += `• Connect you with resources and communities\n\n`;
    }

    response += `To give you the most helpful guidance, could you tell me more about:\n`;
    response += `• What specific opportunities interest you?\n`;
    response += `• What are your current goals or challenges?\n`;
    response += `• What type of support would be most valuable?\n\n`;
    response += `Or feel free to explore the options below! 👇`;

    return {
      content: response,
      buttons: [
        { text: "🎓 Find Scholarships", type: "scholarship", data: { action: "search" } },
        { text: "💼 Get Career Advice", type: "expert", data: { action: "career_advice" } },
        { text: "🎯 Set Goals", type: "expert", data: { action: "goal_setting" } },
        { text: "🤝 Join Community", type: "community", data: { action: "explore" } }
      ],
      streaming: false
    };
  }

  private generateFallbackResponse(userMessage: string, userContext?: any): AIResponse {
    const userName = userContext?.name || 'there';
    
    return {
      content: `Hi ${userName}! I apologize, but I'm experiencing some technical difficulties right now. However, I'm still here to help! 🌟\n\nI specialize in helping young African professionals like you find scholarships, plan careers, and achieve goals. \n\nCould you please rephrase your question or let me know specifically how I can assist you today?\n\nI'm committed to helping you succeed, even with these temporary technical challenges!`,
      buttons: [
        { text: "🎓 Ask About Scholarships", type: "scholarship" },
        { text: "💼 Career Questions", type: "expert" },
        { text: "🤝 Join Community", type: "community" },
        { text: "🔄 Try Again", type: "link", data: { action: "retry" } }
      ],
      streaming: false
    };
  }

  // Helper methods
  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private formatDeadline(deadline: any): string {
    if (!deadline || deadline === 'Not specified') return 'Check website';
    
    try {
      const date = deadline.seconds ? 
        new Date(deadline.seconds * 1000) : 
        new Date(deadline);
      return date.toLocaleDateString();
    } catch {
      return deadline.toString();
    }
  }

  private addToHistory(content: string, ragContext?: RAGContext) {
    this.conversationHistory.push({
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      ragContext
    });
  }

  private getRecentContext() {
    return this.conversationHistory
      .filter(msg => msg.role !== 'system')
      .slice(-8)
      .map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 500),
        timestamp: msg.timestamp
      }));
  }

  private generateContextualButtons(
    userMessage: string, 
    aiResponse: string, 
    ragContext?: RAGContext
  ): Array<{ text: string; type: 'scholarship' | 'community' | 'expert' | 'link'; data?: any; }> {
    const buttons: Array<{ text: string; type: 'scholarship' | 'community' | 'expert' | 'link'; data?: any; }> = [];
    
    const input = userMessage.toLowerCase();
    const response = aiResponse.toLowerCase();
    
    // Context-aware buttons based on RAG results
    if (ragContext?.scholarships && ragContext.scholarships.length > 0) {
      buttons.push({ text: "🔍 View All Matches", type: "scholarship", data: { action: "view_all" } });
    }
    
    // Topic-based buttons
    if (input.includes('scholarship') || response.includes('scholarship')) {
      buttons.push({ text: "📋 Application Help", type: "expert", data: { action: "application" } });
    }
    
    if (input.includes('career') || response.includes('career')) {
      buttons.push({ text: "🗺️ Career Roadmap", type: "expert", data: { action: "career_roadmap" } });
    }
    
    if (input.includes('skill') || response.includes('skill')) {
      buttons.push({ text: "📚 Learning Path", type: "expert", data: { action: "learning_path" } });
    }
    
    // Always include community option
    if (buttons.length < 3) {
      buttons.push({ text: "🤝 Join Community", type: "community", data: { action: "join" } });
    }
    
    // Always include general help
    if (buttons.length < 3) {
      buttons.push({ text: "💬 Get More Help", type: "expert", data: { action: "help" } });
    }
    
    return buttons.slice(0, 4); // Limit to 4 buttons
  }

  // Public methods for conversation management
  clearHistory(): void {
    this.initializeSystemPrompt();
    this.conversationId = null;
    this.retryCount = 0;
  }

  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  getStatus(): { connected: boolean; retryCount: number; hasContext: boolean } {
    return {
      connected: this.retryCount < this.maxRetries,
      retryCount: this.retryCount,
      hasContext: this.conversationHistory.length > 1
    };
  }
}

export const enhancedChatService = new EnhancedChatService();
export type { AIResponse, ChatMessage, RAGContext };