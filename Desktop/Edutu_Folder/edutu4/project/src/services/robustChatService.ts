// Robust Chat Service with Multiple Fallback Layers
// Ensures chat system always responds to user queries

import { auth, db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy, limit, addDoc } from 'firebase/firestore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  ragContext?: RAGContext;
  source?: string;
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
  source: 'api' | 'local' | 'fallback';
}

class RobustChatService {
  private conversationHistory: ChatMessage[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    this.conversationHistory = [{
      id: 'system-prompt',
      role: 'system',
      content: `You are Edutu AI, an expert opportunity coach for young African professionals (ages 16-30). 

Your core mission: Help users discover educational and career opportunities through personalized, actionable guidance.

Key capabilities:
- Find and recommend scholarships, grants, and educational opportunities
- Provide career guidance and skill development strategies  
- Create personalized application roadmaps and timelines
- Connect users with relevant communities and mentors
- Offer practical next steps and motivation

Communication style:
- Warm, encouraging, and professional tone
- Provide specific, actionable advice with clear steps
- Use relevant emojis moderately for engagement
- Focus on opportunities available to African youth globally
- Always include concrete next steps or resources

When discussing opportunities:
- Reference specific programs and deadlines when available
- Include application requirements and strategies
- Suggest skill-building activities
- Provide timeline recommendations

Every interaction should move users closer to their educational and career goals.`,
      timestamp: new Date()
    }];
    this.isInitialized = true;
  }

  async generateResponse(
    userMessage: string, 
    userContext?: { name?: string; age?: number }
  ): Promise<AIResponse> {
    if (!this.isInitialized) {
      this.initializeService();
    }

    // Add user message to history
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    this.conversationHistory.push(userMsg);

    // Maintain reasonable conversation history size
    if (this.conversationHistory.length > 21) {
      this.conversationHistory = [
        this.conversationHistory[0], // Keep system prompt
        ...this.conversationHistory.slice(-20)
      ];
    }

    try {
      // Step 1: Build RAG context for personalized responses
      const ragContext = await this.buildRAGContext(userMessage, userContext);
      
      // Step 2: Try backend services (with timeout)
      try {
        const backendResponse = await Promise.race([
          this.tryBackendServices(userMessage, userContext, ragContext),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5 second timeout
        ]);
        
        if (backendResponse) {
          this.addToHistory(backendResponse.content, ragContext, 'api');
          return backendResponse;
        }
      } catch (error) {
        console.warn('Backend services failed:', error.message);
      }

      // Step 3: Generate intelligent local response with RAG
      console.log('🤖 Generating local AI response with RAG context');
      const localResponse = await this.generateIntelligentResponse(
        userMessage, 
        userContext, 
        ragContext
      );
      
      this.addToHistory(localResponse.content, ragContext, 'local');
      return {
        ...localResponse,
        source: 'local'
      };

    } catch (error) {
      console.error('All chat methods failed, using emergency fallback:', error);
      
      // Emergency fallback - always works
      const emergencyResponse = this.generateEmergencyResponse(userMessage, userContext);
      this.addToHistory(emergencyResponse.content);
      
      return {
        ...emergencyResponse,
        source: 'fallback'
      };
    }
  }

  private async tryBackendServices(
    userMessage: string,
    userContext: any,
    ragContext: RAGContext
  ): Promise<AIResponse | null> {
    const endpoints = [
      // Firebase Functions endpoint
      async () => {
        const { sendChatMessage } = await import('./apiService');
        const response = await sendChatMessage(userMessage, null, {
          name: userContext?.name,
          age: userContext?.age,
          ragContext
        });
        
        if (response.success && response.response) {
          return {
            content: response.response,
            buttons: this.generateContextualButtons(userMessage, response.response, ragContext),
            ragContext,
            streaming: false,
            source: 'api' as const
          };
        }
        return null;
      },

      // AI Backend endpoint
      async () => {
        const response = await fetch('http://localhost:3001/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
          },
          body: JSON.stringify({
            userId: auth.currentUser?.uid,
            message: userMessage,
            context: ragContext
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            content: data.response,
            buttons: this.generateContextualButtons(userMessage, data.response, ragContext),
            ragContext,
            streaming: false,
            source: 'api' as const
          };
        }
        return null;
      }
    ];

    // Try each endpoint with individual timeouts
    for (const endpoint of endpoints) {
      try {
        const result = await Promise.race([
          endpoint(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
        ]);
        
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('Backend endpoint failed:', error.message);
        continue;
      }
    }

    return null;
  }

  private async buildRAGContext(
    userMessage: string, 
    userContext?: { name?: string; age?: number }
  ): Promise<RAGContext> {
    const ragContext: RAGContext = {
      scholarships: [],
      userProfile: null,
      recentConversations: [],
      contextUsed: false
    };

    if (!auth.currentUser) {
      return ragContext;
    }

    try {
      // Get user profile
      const userDoc = await Promise.race([
        getDoc(doc(db, 'users', auth.currentUser.uid)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
      ]);

      if (userDoc && userDoc.exists()) {
        ragContext.userProfile = userDoc.data();
      }

      // Get relevant scholarships
      ragContext.scholarships = await this.getRelevantScholarships(userMessage, ragContext.userProfile);

      // Get recent conversations
      ragContext.recentConversations = this.conversationHistory
        .filter(msg => msg.role !== 'system')
        .slice(-6);

      ragContext.contextUsed = ragContext.scholarships.length > 0 || !!ragContext.userProfile;

    } catch (error) {
      console.warn('RAG context building failed:', error);
    }

    return ragContext;
  }

  private async getRelevantScholarships(userMessage: string, userProfile: any): Promise<any[]> {
    try {
      const scholarshipsRef = collection(db, 'scholarships');
      const scholarshipQuery = query(
        scholarshipsRef,
        orderBy('createdAt', 'desc'),
        limit(30)
      );

      const snapshot = await Promise.race([
        getDocs(scholarshipQuery),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
      ]);

      if (!snapshot) return [];

      const allScholarships = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Enhanced relevance scoring
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
        .filter(s => s.relevanceScore > 2)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);

      console.log(`Found ${scoredScholarships.length} relevant scholarships for RAG context`);
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

    // Scholarship keyword matching
    const scholarshipKeywords = [
      'scholarship', 'funding', 'grant', 'financial aid', 'tuition',
      'study', 'apply', 'opportunity', 'fellowship', 'bursary'
    ];
    score += scholarshipKeywords.filter(keyword => messageLower.includes(keyword)).length * 3;

    // Content keyword matching
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

      // Career interests matching
      if (prefs.careerInterests && Array.isArray(prefs.careerInterests)) {
        for (const interest of prefs.careerInterests) {
          if (scholarshipText.includes(interest.toLowerCase())) {
            score += 6;
          }
        }
      }

      // Education level matching
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

    // Conversation context
    const recentMessages = conversationHistory.slice(-4);
    for (const msg of recentMessages) {
      const msgWords = msg.content.toLowerCase().split(/\s+/);
      for (const word of msgWords) {
        if (word.length > 3 && scholarshipText.includes(word)) {
          score += 1;
        }
      }
    }

    // Deadline urgency
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

    return score;
  }

  private async generateIntelligentResponse(
    userMessage: string,
    userContext?: { name?: string; age?: number },
    ragContext?: RAGContext
  ): Promise<AIResponse> {
    const messageLower = userMessage.toLowerCase();
    const userName = userContext?.name || ragContext?.userProfile?.name || 'there';

    // Use RAG context for personalized responses when available
    if (ragContext?.contextUsed && ragContext.scholarships.length > 0) {
      return this.generateRAGResponse(userMessage, userName, ragContext);
    }

    // Pattern-based responses for common queries
    if (this.matchesKeywords(messageLower, ['scholarship', 'funding', 'financial aid', 'grant'])) {
      return this.generateScholarshipResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['career', 'job', 'profession', 'work', 'employment'])) {
      return this.generateCareerResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['skill', 'learn', 'course', 'training', 'study', 'develop'])) {
      return this.generateSkillsResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['roadmap', 'plan', 'goal', 'strategy', 'timeline'])) {
      return this.generateRoadmapResponse(userName, userContext, ragContext);
    }

    if (this.matchesKeywords(messageLower, ['network', 'mentor', 'community', 'connect', 'people'])) {
      return this.generateNetworkingResponse(userName, userContext, ragContext);
    }

    // Greeting responses
    if (this.matchesKeywords(messageLower, ['hello', 'hi', 'hey', 'start', 'begin'])) {
      return this.generateWelcomeResponse(userName, userContext, ragContext);
    }

    // Help and guidance
    if (this.matchesKeywords(messageLower, ['help', 'assist', 'support', 'guide'])) {
      return this.generateHelpResponse(userName, userContext, ragContext);
    }

    // Default intelligent response
    return this.generateDefaultResponse(userName, userMessage, ragContext);
  }

  private generateRAGResponse(userMessage: string, userName: string, ragContext: RAGContext): AIResponse {
    const scholarships = ragContext.scholarships.slice(0, 3);
    let response = `Hi ${userName}! 🌟 Based on your interests and current opportunities, I found some excellent matches:\n\n`;

    scholarships.forEach((scholarship, index) => {
      const deadline = this.formatDeadline(scholarship.deadline);
      const amount = scholarship.amount || scholarship.value || 'Funding available';
      
      response += `**${index + 1}. ${scholarship.title}**\n`;
      response += `🏢 ${scholarship.provider || scholarship.organization}\n`;
      response += `📅 Deadline: ${deadline}\n`;
      response += `💰 ${amount}\n`;
      response += `✨ ${scholarship.summary || scholarship.description?.substring(0, 120) + '...' || 'Great opportunity for your goals!'}\n\n`;
    });

    response += `🎯 **Why these are perfect for you:**\n`;
    
    if (ragContext.userProfile?.preferences?.careerInterests) {
      response += `• Aligns with your interests in ${ragContext.userProfile.preferences.careerInterests.slice(0, 2).join(' and ')}\n`;
    }
    
    if (ragContext.userProfile?.preferences?.educationLevel) {
      response += `• Matches your ${ragContext.userProfile.preferences.educationLevel} education level\n`;
    }

    response += `• Selected from our live database of opportunities\n`;
    response += `\n💡 **Next Steps:**\n• Click below to start your application strategy\n• I can help create timelines and gather requirements\n• Let's make these opportunities yours! 🚀`;

    return {
      content: response,
      buttons: [
        { text: "📋 Application Strategy", type: "expert", data: { action: "application_help" } },
        { text: "🔍 More Opportunities", type: "scholarship", data: { action: "search_more" } },
        { text: "🗓️ Create Timeline", type: "expert", data: { action: "create_timeline" } },
        { text: "🤝 Join Community", type: "community", data: { action: "join" } }
      ],
      ragContext,
      streaming: false
    };
  }

  private generateScholarshipResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🎓 Excellent question about scholarships, ${userName}! Let me help you find perfect funding opportunities.\n\n`;
    
    response += `**🌟 Top Scholarships for African Students:**\n\n`;
    response += `**🏆 Mastercard Foundation Scholars Program**\n`;
    response += `• Full funding + leadership development\n`;
    response += `• Multiple partner universities globally\n`;
    response += `• Deadline: Usually September-October\n\n`;
    
    response += `**🎯 Mandela Rhodes Scholarship**\n`;
    response += `• Postgraduate studies + mentorship\n`;
    response += `• Leadership focus for African citizens\n`;
    response += `• Deadline: Usually August\n\n`;
    
    response += `**👩‍🎓 AAUW International Fellowships**\n`;
    response += `• $18,000-$30,000 for women in graduate studies\n`;
    response += `• Research and professional development\n`;
    response += `• Deadline: Usually November\n\n`;

    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `**🎯 Based on Your Interests (${interests.slice(0, 2).join(', ')}):**\n`;
      response += `• I can find specialized scholarships in your field\n`;
      response += `• Create application timelines\n`;
      response += `• Connect you with relevant programs\n\n`;
    }

    response += `**💡 Application Success Strategy:**\n`;
    response += `• Start 6-8 months before deadlines\n`;
    response += `• Focus on leadership and community impact\n`;
    response += `• Get strong recommendation letters\n`;
    response += `• Demonstrate financial need clearly\n\n`;
    response += `Ready to create your personalized scholarship roadmap? Let's do this! 🚀`;

    return {
      content: response,
      buttons: [
        { text: "🔍 Find Field-Specific Scholarships", type: "scholarship", data: { action: "field_search" } },
        { text: "📝 Application Timeline", type: "expert", data: { action: "timeline" } },
        { text: "💌 Essay Writing Guide", type: "expert", data: { action: "essay_help" } },
        { text: "👥 Scholarship Community", type: "community", data: { action: "join_scholars" } }
      ],
      streaming: false
    };
  }

  private generateCareerResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🚀 Great question about career development, ${userName}! Here are the most promising paths for young African professionals:\n\n`;

    response += `**🔥 High-Growth Sectors:**\n\n`;
    
    response += `**💻 Technology & Innovation**\n`;
    response += `• Software Development: $25,000-$60,000+ starting\n`;
    response += `• Data Science & AI: High demand, remote-friendly\n`;
    response += `• Cybersecurity: Critical shortage globally\n`;
    response += `• Mobile App Development: Growing African market\n\n`;
    
    response += `**🌱 Green Economy & Sustainability**\n`;
    response += `• Renewable Energy Engineering\n`;
    response += `• Climate Finance & Carbon Trading\n`;
    response += `• Sustainable Agriculture Technology\n`;
    response += `• Environmental Consulting\n\n`;
    
    response += `**🏥 Healthcare Innovation**\n`;
    response += `• Telemedicine & Health Tech\n`;
    response += `• Medical Device Development\n`;
    response += `• Public Health Policy\n`;
    response += `• Pharmaceutical Research\n\n`;
    
    response += `**💰 Financial Services**\n`;
    response += `• FinTech & Mobile Money\n`;
    response += `• Investment Analysis\n`;
    response += `• Digital Banking Solutions\n`;
    response += `• Cryptocurrency & Blockchain\n\n`;

    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `**🎯 Perfect for Your Interests (${interests[0]}):**\n`;
      response += `• I can create a detailed career roadmap\n`;
      response += `• Find internships and entry-level opportunities\n`;
      response += `• Connect you with industry mentors\n\n`;
    }

    response += `**📈 Success Framework:**\n`;
    response += `1. **Choose Your Focus** - Pick 1-2 areas that excite you\n`;
    response += `2. **Build Core Skills** - Technical + leadership skills\n`;
    response += `3. **Create Projects** - Build a portfolio\n`;
    response += `4. **Network Strategically** - Connect with professionals\n`;
    response += `5. **Gain Experience** - Internships, freelancing, volunteering\n\n`;
    response += `Which field excites you most? Let's create your career roadmap! 🎯`;

    return {
      content: response,
      buttons: [
        { text: "💻 Tech Career Guide", type: "expert", data: { career: "technology" } },
        { text: "🌿 Green Economy Path", type: "expert", data: { career: "sustainability" } },
        { text: "💡 FinTech Opportunities", type: "expert", data: { career: "fintech" } },
        { text: "🤝 Find Career Mentors", type: "community", data: { action: "career_mentors" } }
      ],
      streaming: false
    };
  }

  private generateSkillsResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `💪 Smart focus on skills, ${userName}! Here's your strategic learning roadmap:\n\n`;

    response += `**🎯 Most In-Demand Skills for 2024:**\n\n`;
    
    response += `**💻 Technical Skills (High ROI)**\n`;
    response += `• **Programming:** Python, JavaScript, SQL (Start here!)\n`;
    response += `• **Data Analysis:** Excel, Power BI, Tableau, R\n`;
    response += `• **AI/ML Basics:** Understanding ChatGPT, prompt engineering\n`;
    response += `• **Digital Marketing:** SEO, social media automation\n`;
    response += `• **Cloud Computing:** AWS/Google Cloud basics\n\n`;
    
    response += `**🤝 Essential Soft Skills**\n`;
    response += `• **Communication:** Public speaking, technical writing\n`;
    response += `• **Leadership:** Team management, project coordination\n`;
    response += `• **Problem-Solving:** Analytical thinking, creativity\n`;
    response += `• **Adaptability:** Learning agility, remote work skills\n\n`;
    
    response += `**🌍 Africa-Specific Skills**\n`;
    response += `• **Cross-Cultural Communication**\n`;
    response += `• **Mobile-First Development**\n`;
    response += `• **Financial Literacy & Entrepreneurship**\n`;
    response += `• **Local Language + English Proficiency**\n\n`;

    if (ragContext?.userProfile?.preferences?.currentSkills) {
      const skills = ragContext.userProfile.preferences.currentSkills;
      response += `**🚀 Building on Your Skills (${skills.slice(0, 2).join(', ')}):**\n`;
      response += `• I can suggest complementary skills\n`;
      response += `• Create a 90-day learning plan\n`;
      response += `• Find relevant courses and certifications\n\n`;
    }

    response += `**📚 Learning Strategy (Proven Framework):**\n`;
    response += `1. **Choose 1 Core Skill** - Focus for 3-4 months\n`;
    response += `2. **Daily Practice** - 30-60 minutes consistently\n`;
    response += `3. **Build Projects** - Apply skills to real problems\n`;
    response += `4. **Get Certified** - Add credentials to LinkedIn\n`;
    response += `5. **Teach Others** - Join communities, write blogs\n\n`;
    response += `Which skill should we prioritize first? Let's create your learning path! 🎓`;

    return {
      content: response,
      buttons: [
        { text: "🐍 Start Python (Beginner-Friendly)", type: "expert", data: { skill: "python" } },
        { text: "📊 Data Analysis Track", type: "expert", data: { skill: "data_analysis" } },
        { text: "🗣️ Communication Skills", type: "expert", data: { skill: "communication" } },
        { text: "👥 Learning Community", type: "community", data: { action: "learning_group" } }
      ],
      streaming: false
    };
  }

  private generateRoadmapResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🎯 Excellent focus on planning, ${userName}! Strategic roadmaps are the key to success. Here's your framework:\n\n`;

    response += `**🗺️ The Edutu Roadmap Method:**\n\n`;
    response += `**1. Vision Definition (Week 1)**\n`;
    response += `• Set clear 3-5 year destination\n`;
    response += `• Define your "why" - what drives you?\n`;
    response += `• Visualize success in detail\n\n`;
    
    response += `**2. Gap Analysis (Week 2)**\n`;
    response += `• Current skills vs. required skills\n`;
    response += `• Experience gaps to bridge\n`;
    response += `• Resources and connections needed\n\n`;
    
    response += `**3. Milestone Planning (Week 3)**\n`;
    response += `• Break into 6-month major milestones\n`;
    response += `• Set monthly objectives\n`;
    response += `• Plan weekly action steps\n\n`;
    
    response += `**4. Execution & Review (Ongoing)**\n`;
    response += `• Daily progress tracking\n`;
    response += `• Weekly plan adjustments\n`;
    response += `• Monthly milestone reviews\n\n`;

    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `**🎯 For Your Goals (${interests[0]}):**\n`;
      response += `• I can create a specific roadmap with deadlines\n`;
      response += `• Find relevant opportunities and resources\n`;
      response += `• Set up progress tracking systems\n\n`;
    }

    response += `**🚀 Popular Roadmap Templates:**\n`;
    response += `• **Scholarship Success** - 6-month application roadmap\n`;
    response += `• **Career Transition** - 12-month professional pivot\n`;
    response += `• **Skill Mastery** - 90-day intensive learning\n`;
    response += `• **Startup Launch** - 18-month entrepreneurship journey\n\n`;
    response += `Choose your roadmap type below, and I'll create a detailed plan with specific actions and deadlines! 📋`;

    return {
      content: response,
      buttons: [
        { text: "🎓 Scholarship Application Roadmap", type: "expert", data: { roadmap: "scholarship" } },
        { text: "💼 Career Transition Plan", type: "expert", data: { roadmap: "career" } },
        { text: "📈 Skill Development Path", type: "expert", data: { roadmap: "skills" } },
        { text: "🚀 Entrepreneurship Journey", type: "expert", data: { roadmap: "startup" } }
      ],
      streaming: false
    };
  }

  private generateNetworkingResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🤝 Fantastic question, ${userName}! Networking is often the secret to breakthrough opportunities. Here's your strategic guide:\n\n`;

    response += `**🌟 Strategic Networking for African Professionals:**\n\n`;
    
    response += `**💻 Digital Networking Mastery**\n`;
    response += `• **LinkedIn:** Optimize profile, engage authentically, connect purposefully\n`;
    response += `• **Twitter/X:** Follow industry leaders, join conversations\n`;
    response += `• **Discord/Slack:** Join professional communities\n`;
    response += `• **GitHub:** Showcase your work (essential for tech)\n\n`;
    
    response += `**🏢 African Professional Networks**\n`;
    response += `• **Young African Leaders Initiative (YALI)**\n`;
    response += `• **Tony Elumelu Foundation Entrepreneurship**\n`;
    response += `• **African Leadership Academy Alumni**\n`;
    response += `• **Africa Tech Summit Community**\n`;
    response += `• **Mandela Rhodes Scholar Network**\n\n`;
    
    response += `**🎯 The 5-Step Networking Strategy:**\n`;
    response += `1. **Give First** - Share value before asking for help\n`;
    response += `2. **Be Authentic** - Build genuine relationships\n`;
    response += `3. **Follow Up** - Maintain connections consistently\n`;
    response += `4. **Add Value** - Share opportunities and insights\n`;
    response += `5. **Stay Organized** - Track relationships systematically\n\n`;

    response += `**🎪 Networking Events & Opportunities:**\n`;
    response += `• **AfricArena Summit** - Tech and startups\n`;
    response += `• **Africa Innovation Summit** - Cross-sector innovation\n`;
    response += `• **Virtual conferences** - Globally accessible\n`;
    response += `• **Local meetups** - Build community connections\n`;
    response += `• **Alumni networks** - Leverage educational connections\n\n`;

    response += `**💼 Finding Mentors:**\n`;
    response += `• Identify 3-5 potential mentors in your field\n`;
    response += `• Research their background thoroughly\n`;
    response += `• Reach out with specific, thoughtful requests\n`;
    response += `• Offer value and show appreciation\n\n`;
    response += `Ready to build your professional network? Let's create your networking strategy! 🌐`;

    return {
      content: response,
      buttons: [
        { text: "📝 LinkedIn Profile Optimization", type: "expert", data: { action: "linkedin_guide" } },
        { text: "🎯 Find Mentors in Your Field", type: "expert", data: { action: "mentor_matching" } },
        { text: "👥 Join Professional Communities", type: "community", data: { action: "professional_networks" } },
        { text: "📅 Networking Events Calendar", type: "link", data: { url: "#events" } }
      ],
      streaming: false
    };
  }

  private generateWelcomeResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `👋 Hello ${userName}! Welcome to Edutu AI - your personal opportunity coach! 🌟\n\n`;

    response += `I'm here to help you unlock amazing possibilities for your future. I specialize in:\n\n`;
    response += `🎓 **Educational Opportunities**\n`;
    response += `• Finding scholarships and grants worldwide\n`;
    response += `• Application strategies and timelines\n`;
    response += `• Essay writing and interview preparation\n\n`;
    
    response += `💼 **Career Development**\n`;
    response += `• High-growth career paths in Africa\n`;
    response += `• Skill development and certification guidance\n`;
    response += `• Professional networking strategies\n\n`;
    
    response += `🚀 **Personal Growth**\n`;
    response += `• Goal setting and achievement frameworks\n`;
    response += `• Leadership development opportunities\n`;
    response += `• Confidence building and motivation\n\n`;
    
    response += `🤝 **Community & Mentorship**\n`;
    response += `• Connecting with like-minded peers\n`;
    response += `• Finding mentors and role models\n`;
    response += `• Joining professional communities\n\n`;

    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `I see you're interested in ${interests.slice(0, 2).join(' and ')} - exciting fields with tremendous opportunities! 🎯\n\n`;
    }

    response += `💡 **Quick Start Options:**\n`;
    response += `• Ask me about specific opportunities\n`;
    response += `• Request a personalized roadmap\n`;
    response += `• Get scholarship recommendations\n`;
    response += `• Explore career paths and skills\n\n`;
    response += `What would you like to explore first? I'm here to make your success journey smoother and faster! ✨`;

    return {
      content: response,
      buttons: [
        { text: "🔍 Find Opportunities Now", type: "scholarship", data: { action: "explore_opportunities" } },
        { text: "🗺️ Create My Success Roadmap", type: "expert", data: { action: "create_roadmap" } },
        { text: "💼 Explore Career Paths", type: "expert", data: { action: "career_exploration" } },
        { text: "🤝 Join Our Community", type: "community", data: { action: "community_welcome" } }
      ],
      streaming: false
    };
  }

  private generateHelpResponse(userName: string, userContext?: any, ragContext?: RAGContext): AIResponse {
    let response = `🌟 I'm here to help, ${userName}! Here's everything I can assist you with:\n\n`;

    response += `**🎓 Education & Scholarships:**\n`;
    response += `• Find scholarships matching your profile\n`;
    response += `• Create application timelines and strategies\n`;
    response += `• Essay writing and interview preparation\n`;
    response += `• University application guidance\n\n`;
    
    response += `**💼 Career Development:**\n`;
    response += `• Explore high-growth career paths\n`;
    response += `• Build in-demand skills step by step\n`;
    response += `• Create professional development plans\n`;
    response += `• Find internships and job opportunities\n\n`;
    
    response += `**🎯 Goal Achievement:**\n`;
    response += `• Set SMART goals with clear timelines\n`;
    response += `• Break big dreams into actionable steps\n`;
    response += `• Track progress and stay motivated\n`;
    response += `• Overcome obstacles and challenges\n\n`;
    
    response += `**🤝 Networking & Mentorship:**\n`;
    response += `• Build professional networks strategically\n`;
    response += `• Find mentors in your field\n`;
    response += `• Join relevant communities and groups\n`;
    response += `• Develop leadership and communication skills\n\n`;

    if (ragContext?.userProfile?.preferences) {
      const prefs = ragContext.userProfile.preferences;
      response += `**🎯 Personalized for You:**\n`;
      if (prefs.careerInterests) {
        response += `• Opportunities in ${prefs.careerInterests[0]}\n`;
      }
      if (prefs.educationLevel) {
        response += `• Resources for ${prefs.educationLevel} level\n`;
      }
      response += `• Tailored recommendations based on your profile\n\n`;
    }

    response += `**💡 How to Get Started:**\n`;
    response += `• Ask specific questions about your goals\n`;
    response += `• Tell me what you're struggling with\n`;
    response += `• Request help with applications or decisions\n`;
    response += `• Share your dreams and let's make them happen!\n\n`;
    response += `What specific area would you like help with today? 🚀`;

    return {
      content: response,
      buttons: [
        { text: "🎓 Scholarship Help", type: "scholarship", data: { action: "scholarship_help" } },
        { text: "💼 Career Guidance", type: "expert", data: { action: "career_help" } },
        { text: "🎯 Goal Setting Support", type: "expert", data: { action: "goal_help" } },
        { text: "🤝 Community Support", type: "community", data: { action: "community_help" } }
      ],
      streaming: false
    };
  }

  private generateDefaultResponse(userName: string, userMessage: string, ragContext?: RAGContext): AIResponse {
    let response = `Thanks for that question, ${userName}! 🌟 I'm here to help you achieve your goals.\n\n`;

    const messageLower = userMessage.toLowerCase();
    
    if (messageLower.includes('application')) {
      response += `I can help you with applications! Whether it's for scholarships, universities, or jobs, I'll guide you through:\n\n`;
      response += `• Research and preparation strategies\n`;
      response += `• Timeline creation and deadline management\n`;
      response += `• Essay writing and personal statements\n`;
      response += `• Interview preparation and practice\n\n`;
    } else if (messageLower.includes('advice')) {
      response += `Here's my best advice for young African professionals:\n\n`;
      response += `🎯 **Focus on high-impact activities:**\n`;
      response += `• Build skills that solve real problems\n`;
      response += `• Network with purpose and authenticity\n`;
      response += `• Apply for opportunities consistently\n`;
      response += `• Document and share your journey\n\n`;
    } else {
      response += `That's an interesting point! Let me help you explore related opportunities and strategies.\n\n`;
    }

    if (ragContext?.userProfile?.preferences?.careerInterests) {
      const interests = ragContext.userProfile.preferences.careerInterests;
      response += `**Based on your interests in ${interests[0]}:**\n`;
      response += `• I can find relevant opportunities\n`;
      response += `• Suggest skill development paths\n`;
      response += `• Connect you with resources and communities\n\n`;
    }

    response += `To provide the most helpful guidance, could you tell me:\n`;
    response += `• What specific opportunities interest you?\n`;
    response += `• What are your current goals or challenges?\n`;
    response += `• How can I best support your success journey?\n\n`;
    response += `Or explore the options below to get started! 👇`;

    return {
      content: response,
      buttons: [
        { text: "🔍 Find Opportunities", type: "scholarship", data: { action: "opportunity_search" } },
        { text: "💡 Get Career Advice", type: "expert", data: { action: "career_advice" } },
        { text: "🎯 Set Goals Together", type: "expert", data: { action: "goal_setting" } },
        { text: "🤝 Join Community", type: "community", data: { action: "community_join" } }
      ],
      streaming: false
    };
  }

  private generateEmergencyResponse(userMessage: string, userContext?: any): AIResponse {
    const userName = userContext?.name || 'there';
    
    return {
      content: `Hi ${userName}! I apologize for any technical difficulties. I'm still here to help you succeed! 🌟\n\nAs your opportunity coach, I can assist with:\n\n• Finding scholarships and educational opportunities\n• Career planning and skill development\n• Application strategies and timelines\n• Goal setting and achievement planning\n\nWhat specific area would you like to explore together? I'm committed to helping you unlock your potential, regardless of any technical challenges!`,
      buttons: [
        { text: "🎓 Find Scholarships", type: "scholarship" },
        { text: "💼 Career Guidance", type: "expert" },
        { text: "🎯 Set Goals", type: "expert" },
        { text: "🤝 Join Community", type: "community" }
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

  private addToHistory(content: string, ragContext?: RAGContext, source?: string) {
    this.conversationHistory.push({
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      ragContext,
      source
    });
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
      buttons.push({ text: "🔍 View All Matches", type: "scholarship", data: { action: "view_matches" } });
    }
    
    // Topic-based buttons
    if (input.includes('scholarship') || response.includes('scholarship')) {
      buttons.push({ text: "📋 Application Help", type: "expert", data: { action: "application_help" } });
    }
    
    if (input.includes('career') || response.includes('career')) {
      buttons.push({ text: "🗺️ Career Roadmap", type: "expert", data: { action: "career_roadmap" } });
    }
    
    if (input.includes('skill') || response.includes('skill')) {
      buttons.push({ text: "📚 Learning Path", type: "expert", data: { action: "learning_path" } });
    }
    
    // Always include community option
    if (buttons.length < 3) {
      buttons.push({ text: "🤝 Join Community", type: "community", data: { action: "join_community" } });
    }
    
    // Always include help option
    if (buttons.length < 3) {
      buttons.push({ text: "💬 Get More Help", type: "expert", data: { action: "get_help" } });
    }
    
    return buttons.slice(0, 4);
  }

  // Public methods for conversation management
  clearHistory(): void {
    this.initializeService();
  }

  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  async saveConversation(): Promise<void> {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'chatSessions'), {
        userId: auth.currentUser.uid,
        messages: this.conversationHistory.filter(msg => msg.role !== 'system'),
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    } catch (error) {
      console.warn('Failed to save conversation:', error);
    }
  }

  getStatus(): { isWorking: boolean; hasContext: boolean; messageCount: number } {
    return {
      isWorking: this.isInitialized,
      hasContext: this.conversationHistory.length > 1,
      messageCount: this.conversationHistory.filter(msg => msg.role !== 'system').length
    };
  }
}

export const robustChatService = new RobustChatService();
export type { AIResponse, ChatMessage, RAGContext };