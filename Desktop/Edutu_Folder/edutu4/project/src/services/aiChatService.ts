// AI Chat Service for Edutu - Enhanced with Real RAG Integration
// This service handles AI-powered conversations with real-time context retrieval

import { sendChatMessage } from './apiService';
import { auth, db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { mcpService } from './mcpService';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  ragContext?: RAGContext;
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
}

class AIChatService {
  private conversationId: string | null = null;
  private conversationHistory: ChatMessage[] = [];
  private ragEnabled: boolean = true;
  
  constructor() {
    // Initialize system prompt for Edutu context
    this.conversationHistory = [{
      role: 'system',
      content: `You are Edutu, an AI opportunity coach specifically designed to help young African professionals (ages 16-30) discover and pursue educational and career opportunities. 

Your core capabilities include:
- Real-time scholarship and opportunity discovery using RAG (Retrieval-Augmented Generation)
- Personalized recommendations based on user profiles and preferences
- Context-aware conversations that remember user goals and interests
- Integration with live opportunity databases (scholarships collection)

IMPORTANT: You have access to real-time data about:
- Current scholarship opportunities from the 'scholarships' collection
- User profile data including career interests, education level, and goals
- Previous conversation context for continuity

Always use the provided RAG context to give specific, accurate, and up-to-date information. When referencing scholarships or opportunities, use actual data from the context provided.

Response guidelines:
- Be encouraging, specific, and actionable
- Focus on opportunities available in Africa or globally accessible to African youth
- Provide concrete next steps and resources
- Use emojis occasionally to make interactions engaging
- Always indicate when you're using real-time data vs. general guidance

When RAG context is available, prioritize specific opportunities and personalized advice over generic responses.`
    }];
  }

  private async initializeMCP() {
    try {
      await mcpService.initialize();
      console.log('MCP service initialized successfully');
    } catch (error) {
      console.warn('MCP service initialization failed:', error);
    }
  }

  async generateResponse(userMessage: string, userContext?: { name?: string; age?: number }): Promise<AIResponse> {
    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Maintain conversation history size (keep last 20 messages)
    if (this.conversationHistory.length > 21) { // +1 for system message
      this.conversationHistory = [
        this.conversationHistory[0], // Keep system message
        ...this.conversationHistory.slice(-20) // Keep last 20 messages
      ];
    }

    try {
      // Step 1: Retrieve RAG context for better responses
      const ragContext = await this.buildRAGContext(userMessage, userContext);
      
      // Step 2: Try Firebase Functions API with enhanced context
      const apiResponse = await sendChatMessage(userMessage, this.conversationId, {
        ...userContext,
        ragContext: ragContext,
        conversationHistory: this.getRecentConversationContext()
      });
      
      if (apiResponse.success) {
        // Store conversation ID for context continuity
        if (apiResponse.conversationId) {
          this.conversationId = apiResponse.conversationId;
        }
        
        // Add AI response to conversation history with RAG context
        this.conversationHistory.push({
          role: 'assistant',
          content: apiResponse.response,
          timestamp: new Date(),
          ragContext: ragContext
        });

        return {
          content: apiResponse.response,
          buttons: this.generateContextualButtons(userMessage, apiResponse.response, ragContext),
          ragContext: ragContext,
          streaming: false
        };
      } else {
        throw new Error(`API call failed: ${apiResponse.response || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('AI Chat Service Error:', error);
      console.warn('API failed, using enhanced fallback with RAG context');
      
      // Enhanced fallback with RAG context
      const ragContext = await this.buildRAGContext(userMessage, userContext);
      const fallbackResponse = await this.generateEnhancedResponseWithRAG(userMessage, userContext, ragContext);
      
      // Add fallback response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date(),
        ragContext: ragContext
      });

      return {
        ...fallbackResponse,
        ragContext: ragContext
      };
    }
  }

  /**
   * Build comprehensive RAG context from Firestore data
   */
  private async buildRAGContext(userMessage: string, userContext?: { name?: string; age?: number }): Promise<RAGContext> {
    const currentUser = auth.currentUser;
    
    const ragContext: RAGContext = {
      scholarships: [],
      userProfile: null,
      recentConversations: [],
      contextUsed: false
    };

    if (!currentUser) {
      console.warn('No authenticated user for RAG context');
      return ragContext;
    }

    try {
      // Fetch user profile for personalization
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        ragContext.userProfile = userDoc.data();
      }

      // Fetch relevant scholarships based on message content and user profile
      ragContext.scholarships = await this.getRelevantScholarships(userMessage, ragContext.userProfile);

      // Fetch recent conversation history for context continuity
      ragContext.recentConversations = await this.getRecentConversations(currentUser.uid);

      ragContext.contextUsed = ragContext.scholarships.length > 0 || !!ragContext.userProfile;
      
      console.log(`RAG Context built: ${ragContext.scholarships.length} scholarships, profile: ${!!ragContext.userProfile}`);
      
    } catch (error) {
      console.error('Error building RAG context:', error);
    }

    return ragContext;
  }

  /**
   * Get relevant scholarships from Firestore based on user query and profile
   */
  private async getRelevantScholarships(userMessage: string, userProfile: any): Promise<any[]> {
    try {
      const scholarshipsRef = collection(db, 'scholarships');
      const messageLower = userMessage.toLowerCase();
      
      // Base query for recent scholarships
      let scholarshipQuery = query(
        scholarshipsRef,
        orderBy('createdAt', 'desc'),
        limit(50) // Get more items for better matching
      );

      const snapshot = await getDocs(scholarshipQuery);
      const allScholarships = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Found ${allScholarships.length} scholarships for RAG context`);

      // Score scholarships based on relevance to message and user profile
      const scoredScholarships = allScholarships
        .map(scholarship => ({
          ...scholarship,
          relevanceScore: this.calculateScholarshipRelevance(scholarship, userMessage, userProfile)
        }))
        .filter(scholarship => scholarship.relevanceScore > 2) // Only include relevant ones
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5); // Top 5 most relevant

      console.log(`RAG Context: Selected ${scoredScholarships.length} relevant scholarships`);
      scoredScholarships.forEach(s => console.log(`- ${s.title} (score: ${s.relevanceScore})`));

      return scoredScholarships;
    } catch (error) {
      console.error('Error fetching relevant scholarships:', error);
      return [];
    }
  }

  /**
   * Calculate scholarship relevance score
   */
  private calculateScholarshipRelevance(scholarship: any, userMessage: string, userProfile: any): number {
    let score = 0;
    const messageLower = userMessage.toLowerCase();
    
    // Base score for recent scholarships
    score += 1;
    
    // Boost score if user message contains scholarship-related keywords
    const scholarshipKeywords = ['scholarship', 'funding', 'grant', 'financial aid', 'tuition', 'study', 'apply', 'opportunity'];
    const scholarshipKeywordCount = scholarshipKeywords.filter(keyword => messageLower.includes(keyword)).length;
    score += scholarshipKeywordCount * 3;

    // Extract scholarship searchable text
    const scholarshipText = [
      scholarship.title || '',
      scholarship.summary || '',
      scholarship.description || '',
      scholarship.category || '',
      scholarship.provider || '',
      ...(scholarship.tags || [])
    ].join(' ').toLowerCase();

    // Enhanced keyword matching with different weights
    const messageWords = messageLower.split(/\s+/).filter(word => word.length > 2);
    const importantWords = messageWords.filter(word => 
      !['the', 'and', 'for', 'can', 'you', 'how', 'what', 'where', 'when', 'why', 'help', 'me', 'my'].includes(word)
    );

    for (const word of importantWords) {
      // Title matches are more important
      if ((scholarship.title || '').toLowerCase().includes(word)) {
        score += 5;
      }
      // Provider matches
      else if ((scholarship.provider || '').toLowerCase().includes(word)) {
        score += 3;
      }
      // General text matches
      else if (scholarshipText.includes(word)) {
        score += 2;
      }
    }

    // User profile matching with enhanced scoring
    if (userProfile?.preferences) {
      const prefs = userProfile.preferences;
      
      // Career interests matching (high priority)
      if (prefs.careerInterests && Array.isArray(prefs.careerInterests)) {
        for (const interest of prefs.careerInterests) {
          const interestLower = interest.toLowerCase();
          if (scholarshipText.includes(interestLower)) {
            score += 6; // Higher weight for career interest matches
          }
          // Partial matches for compound interests
          const interestWords = interestLower.split(/\s+/);
          for (const word of interestWords) {
            if (word.length > 3 && scholarshipText.includes(word)) {
              score += 2;
            }
          }
        }
      }
      
      // Education level matching
      if (prefs.educationLevel) {
        const eduLower = prefs.educationLevel.toLowerCase();
        if (scholarshipText.includes(eduLower) || 
            scholarshipText.includes('undergraduate') && eduLower.includes('bachelor') ||
            scholarshipText.includes('graduate') && eduLower.includes('master') ||
            scholarshipText.includes('phd') && eduLower.includes('doctoral')) {
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
      
      // Location preferences
      if (prefs.preferredLocations && Array.isArray(prefs.preferredLocations)) {
        for (const location of prefs.preferredLocations) {
          if (scholarshipText.includes(location.toLowerCase())) {
            score += 2;
          }
        }
      }

      // Age appropriateness (if scholarship has age requirements)
      if (prefs.age && scholarship.requirements) {
        const reqText = scholarship.requirements.toLowerCase();
        if (reqText.includes('age') || reqText.includes('years old')) {
          // This is a simplified check - in production, you'd parse age ranges
          score += 1;
        }
      }
    }

    // Deadline relevance (prefer scholarships with upcoming deadlines)
    if (scholarship.deadline && scholarship.deadline !== 'Not specified') {
      try {
        const deadline = scholarship.deadline.seconds ? 
          new Date(scholarship.deadline.seconds * 1000) : 
          new Date(scholarship.deadline);
        const now = new Date();
        const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysUntilDeadline > 0 && daysUntilDeadline < 365) {
          // Prefer scholarships with deadlines in the next year
          score += Math.max(1, 5 - Math.floor(daysUntilDeadline / 90)); // Higher score for sooner deadlines
        }
      } catch (error) {
        // Invalid date format, skip deadline scoring
      }
    }

    // Category matching for specific queries
    const categoryKeywords = {
      'technology': ['tech', 'technology', 'computer', 'software', 'engineering'],
      'business': ['business', 'entrepreneurship', 'management', 'finance'],
      'health': ['health', 'medical', 'medicine', 'nursing', 'healthcare'],
      'education': ['education', 'teaching', 'pedagogy', 'academic'],
      'arts': ['arts', 'creative', 'design', 'music', 'culture']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        if ((scholarship.category || '').toLowerCase().includes(category) ||
            scholarshipText.includes(category)) {
          score += 4;
        }
      }
    }

    return Math.max(0, score);
  }

  /**
   * Get recent conversation history for context
   */
  private async getRecentConversations(userId: string): Promise<any[]> {
    try {
      // This would typically query a chatMessages collection
      // For now, return from local history
      return this.conversationHistory
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .slice(-6); // Last 3 exchanges
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  /**
   * Get recent conversation context for API calls
   */
  private getRecentConversationContext(): any[] {
    return this.conversationHistory
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-8) // Last 4 exchanges (8 messages)
      .map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 500), // Limit content length
        timestamp: msg.timestamp
      }));
  }

  private isTechnicalQuery(input: string): boolean {
    const techKeywords = [
      'programming', 'coding', 'software', 'web', 'app', 'development', 
      'javascript', 'python', 'react', 'node', 'api', 'database',
      'frontend', 'backend', 'fullstack', 'mobile', 'tech', 'developer'
    ];
    
    return techKeywords.some(keyword => input.includes(keyword));
  }

  private extractSkillFromQuery(input: string): string | null {
    const skills = [
      'javascript', 'python', 'react', 'node', 'typescript', 'java',
      'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'
    ];
    
    for (const skill of skills) {
      if (input.includes(skill)) {
        return skill;
      }
    }
    
    return null;
  }

  private formatTechRecommendations(recommendations: any): string {
    let result = '';
    
    if (recommendations.languages.length > 0) {
      result += `\n**Languages:** ${recommendations.languages.slice(0, 3).join(', ')}`;
    }
    
    if (recommendations.frameworks.length > 0) {
      result += `\n**Frameworks:** ${recommendations.frameworks.slice(0, 3).join(', ')}`;
    }
    
    if (recommendations.projects.length > 0) {
      result += `\n**Project Ideas:** ${recommendations.projects.slice(0, 2).join(', ')}`;
    }
    
    return result;
  }

  private formatCodeExample(example: any): string {
    return `\n**${example.title}**\n\`\`\`${example.difficulty.toLowerCase()}\n${example.code}\n\`\`\`\n*${example.explanation}*`;
  }

  /**
   * Generate enhanced response using RAG context
   */
  private async generateEnhancedResponseWithRAG(
    userMessage: string, 
    userContext?: { name?: string; age?: number }, 
    ragContext?: RAGContext
  ): Promise<AIResponse> {
    const input = userMessage.toLowerCase();
    const userName = userContext?.name || ragContext?.userProfile?.name || 'there';
    
    // Use RAG context to provide specific, data-driven responses
    if (ragContext?.contextUsed && ragContext.scholarships.length > 0) {
      return this.generateRAGEnhancedResponse(userMessage, userName, ragContext);
    }
    
    // Fallback to enhanced generic responses
    return this.generateEnhancedResponse(userMessage, userContext);
  }

  /**
   * Generate response enhanced with real RAG data
   */
  private generateRAGEnhancedResponse(userMessage: string, userName: string, ragContext: RAGContext): AIResponse {
    const input = userMessage.toLowerCase();
    const scholarships = ragContext.scholarships.slice(0, 3); // Top 3 scholarships
    
    let response = `Hi ${userName}! 🌟 Based on your interests and current opportunities, I found some excellent matches for you:\n\n`;
    
    // Add specific scholarship recommendations
    scholarships.forEach((scholarship, index) => {
      const deadline = scholarship.deadline ? new Date(scholarship.deadline.seconds * 1000).toLocaleDateString() : 'Open';
      response += `**${index + 1}. ${scholarship.title}**\n📍 ${scholarship.provider}\n📅 Deadline: ${deadline}\n💰 ${scholarship.amount || 'Funding Available'}\n✨ ${scholarship.summary || scholarship.description?.substring(0, 100) + '...' || 'Great opportunity for your career!'}\n\n`;
    });

    response += `🎯 **Why these are perfect for you:**\n`;
    
    if (ragContext.userProfile?.preferences?.careerInterests) {
      response += `• Matches your interests in ${ragContext.userProfile.preferences.careerInterests.slice(0, 2).join(' and ')}\n`;
    }
    
    if (ragContext.userProfile?.preferences?.educationLevel) {
      response += `• Suitable for your ${ragContext.userProfile.preferences.educationLevel} level\n`;
    }
    
    response += `\n💡 **Next Steps:**\n• Review application requirements carefully\n• Start gathering necessary documents\n• Reach out if you need help with applications\n\n*This information is pulled from our live database and updated regularly!* ✅`;

    return {
      content: response,
      buttons: [
        { text: "📋 Application Guide", type: "expert" },
        { text: "🔍 More Scholarships", type: "scholarship" },
        { text: "💬 Chat with Expert", type: "expert" },
        { text: "🤝 Join Community", type: "community" }
      ]
    };
  }

  private generateContextualButtons(
    userMessage: string, 
    aiResponse: string, 
    ragContext?: RAGContext
  ): Array<{ text: string; type: 'scholarship' | 'community' | 'expert' | 'link'; data?: any; }> {
    const input = userMessage.toLowerCase();
    const response = aiResponse.toLowerCase();
    
    const buttons: Array<{ text: string; type: 'scholarship' | 'community' | 'expert' | 'link'; data?: any; }> = [];
    
    // Add context-aware buttons based on RAG results
    if (ragContext?.scholarships && ragContext.scholarships.length > 0) {
      buttons.push({ text: "🔍 View All Matches", type: "scholarship" });
      buttons.push({ text: "📋 Application Help", type: "expert" });
    }
    
    // Scholarship-related buttons
    if (input.includes('scholarship') || response.includes('scholarship') || input.includes('funding')) {
      buttons.push({ text: "🎓 Browse More Scholarships", type: "scholarship" });
    }
    
    // Career-related buttons
    if (input.includes('career') || response.includes('career') || input.includes('job')) {
      buttons.push({ text: "💼 Career Guidance", type: "link", data: { url: "#career" } });
    }
    
    // Roadmap-related buttons
    if (input.includes('roadmap') || response.includes('roadmap') || input.includes('plan')) {
      buttons.push({ text: "🗺️ Create Roadmap", type: "expert" });
    }
    
    // Always include community option
    if (buttons.length < 3) {
      buttons.push({ text: "🤝 Join Community", type: "community" });
    }
    
    // Always include expert help
    if (buttons.length < 3) {
      buttons.push({ text: "💬 Get Expert Help", type: "expert" });
    }
    
    // Limit to 3 buttons for UI cleanliness
    return buttons.slice(0, 3);
  }

  private async generateEnhancedResponse(userMessage: string, userContext?: { name?: string; age?: number }): Promise<AIResponse> {
    const input = userMessage.toLowerCase();
    const userName = userContext?.name || 'there';
    
    // Enhanced pattern matching with more sophisticated responses
    
    // Scholarship-related queries
    if (this.matchesPattern(input, ['scholarship', 'funding', 'financial aid', 'grant', 'bursary'])) {
      return {
        content: `🎓 Great question about scholarships, ${userName}! Let me help you find the perfect funding opportunities.\n\nBased on current opportunities for African students, here are some excellent options:\n\n**🌟 Top Tier Scholarships:**\n• **Mastercard Foundation Scholars** - Full funding + leadership development\n• **Mandela Rhodes Scholarship** - Graduate studies + mentorship\n• **AAUW International Fellowships** - For women in graduate studies\n\n**🎯 Field-Specific Options:**\n• **STEM scholarships** through various foundations\n• **Business/Entrepreneurship** funding programs\n• **Arts & Creative** grants and fellowships\n\n**💡 Pro Tips:**\n• Start applications 6-8 months early\n• Focus on leadership and community impact in essays\n• Get strong recommendation letters from mentors\n\nWhat field or level of study interests you most? I can create a personalized scholarship strategy!`,
        buttons: [
          { text: "🔍 Find STEM Scholarships", type: "scholarship", data: { category: "stem" } },
          { text: "💼 Business Funding Options", type: "scholarship", data: { category: "business" } },
          { text: "👥 Join Scholarship Community", type: "community" },
          { text: "📝 Application Strategy Guide", type: "expert" }
        ]
      };
    }

    // Career guidance queries
    if (this.matchesPattern(input, ['career', 'job', 'profession', 'work', 'employment', 'industry'])) {
      return {
        content: `🚀 Excellent! Career planning is crucial for your success, ${userName}. Let me share insights on the most promising career paths for young African professionals:\n\n**🔥 High-Growth Fields in Africa:**\n\n**Technology Sector** 🖥️\n• Software Development (Python, JavaScript, Mobile apps)\n• Data Science & AI\n• Cybersecurity\n• Digital Marketing\n\n**Green Economy** 🌱\n• Renewable Energy Engineering\n• Sustainable Agriculture Tech\n• Environmental Consulting\n• Climate Finance\n\n**Healthcare Innovation** 🏥\n• Telemedicine\n• Health Tech Development\n• Public Health Policy\n• Medical Device Innovation\n\n**Financial Services** 💰\n• FinTech Development\n• Digital Banking\n• Investment Analysis\n• Cryptocurrency/Blockchain\n\n**📈 Success Strategy:**\n1. Choose a field aligned with your interests\n2. Build relevant skills through online courses\n3. Create projects for your portfolio\n4. Network with industry professionals\n5. Seek mentorship and internships\n\nWhich field excites you most? I'll create a detailed roadmap!`,
        buttons: [
          { text: "💻 Tech Career Roadmap", type: "link", data: { url: "#tech-career" } },
          { text: "🌿 Green Jobs Guide", type: "link", data: { url: "#green-careers" } },
          { text: "💡 FinTech Opportunities", type: "link", data: { url: "#fintech" } },
          { text: "🤝 Connect with Mentors", type: "expert" }
        ]
      };
    }

    // Skills development queries
    if (this.matchesPattern(input, ['skill', 'learn', 'course', 'training', 'develop', 'education'])) {
      return {
        content: `💪 Smart thinking, ${userName}! Continuous learning is your superpower. Here's a strategic approach to skill development:\n\n**🎯 Most In-Demand Skills for 2024:**\n\n**Technical Skills** 🛠️\n• **Programming:** Python, JavaScript, SQL\n• **Data Analysis:** Excel, Tableau, Power BI\n• **AI/ML Basics:** Understanding ChatGPT, automation\n• **Digital Marketing:** SEO, social media, content creation\n\n**Soft Skills** 🤝\n• **Communication:** Public speaking, writing, presentation\n• **Leadership:** Team management, project coordination\n• **Critical Thinking:** Problem-solving, analytical thinking\n• **Adaptability:** Learning agility, change management\n\n**🚀 Learning Strategy:**\n1. **Choose 2-3 core skills** to focus on\n2. **Use free resources:** Coursera, edX, YouTube, freeCodeCamp\n3. **Practice with projects** - build a portfolio\n4. **Get certified** - add credentials to your CV\n5. **Join communities** - learn from peers\n\n**⏰ Time Investment:** Just 1-2 hours daily can transform your capabilities in 3-6 months!\n\nWhat specific skill would you like to master first?`,
        buttons: [
          { text: "🐍 Start Python Journey", type: "link", data: { url: "#python-course" } },
          { text: "📊 Data Analysis Track", type: "link", data: { url: "#data-analysis" } },
          { text: "🗣️ Communication Skills", type: "link", data: { url: "#communication" } },
          { text: "👥 Join Learning Community", type: "community" }
        ]
      };
    }

    // Networking and mentorship queries
    if (this.matchesPattern(input, ['network', 'mentor', 'connect', 'community', 'people', 'relationship'])) {
      return {
        content: `🤝 Fantastic question, ${userName}! Networking is often the secret ingredient to breakthrough opportunities. Here's how to build meaningful professional relationships:\n\n**🌟 Strategic Networking Approach:**\n\n**Online Platforms** 💻\n• **LinkedIn:** Optimize profile, engage with content, connect strategically\n• **Twitter/X:** Follow industry leaders, participate in discussions\n• **Professional Communities:** Join field-specific groups and forums\n\n**Offline Opportunities** 👥\n• **Industry Events:** Conferences, workshops, meetups\n• **University Alumni Networks:** Connect with graduates in your field\n• **Professional Associations:** Join relevant industry organizations\n• **Volunteer Work:** Meet professionals while contributing to causes\n\n**🎯 Networking Best Practices:**\n1. **Give First:** Offer help before asking for favors\n2. **Be Genuine:** Build real relationships, not transactional ones\n3. **Follow Up:** Maintain connections with regular check-ins\n4. **Add Value:** Share insights, opportunities, and resources\n5. **Be Patient:** Relationships take time to develop\n\n**💡 Mentorship Tips:**\n• Identify potential mentors in your field\n• Approach with specific, thoughtful requests\n• Respect their time and come prepared\n• Show appreciation and follow through\n\nWant me to help you create a networking strategy?`,
        buttons: [
          { text: "📝 LinkedIn Optimization", type: "link", data: { url: "#linkedin-guide" } },
          { text: "🎯 Find a Mentor", type: "expert" },
          { text: "👥 Join Professional Community", type: "community" },
          { text: "📅 Networking Events Near Me", type: "link", data: { url: "#events" } }
        ]
      };
    }

    // Goal setting and planning queries
    if (this.matchesPattern(input, ['goal', 'plan', 'roadmap', 'future', 'achieve', 'success', 'dream'])) {
      return {
        content: `🎯 I love your focus on goal-setting, ${userName}! Clear goals are the foundation of every success story. Let me help you create a winning strategy:\n\n**🚀 SMART Goal Framework:**\n\n**S**pecific - Clear, well-defined objectives\n**M**easurable - Track progress with metrics\n**A**chievable - Realistic given your resources\n**R**elevant - Aligned with your values and vision\n**T**ime-bound - Set clear deadlines\n\n**📋 Goal Categories to Consider:**\n\n**Career Goals** 💼\n• Land dream job/internship\n• Develop specific skills\n• Build professional network\n• Increase income by X%\n\n**Education Goals** 🎓\n• Complete degree/certification\n• Win scholarship\n• Improve grades\n• Learn new language\n\n**Personal Development** 🌟\n• Build confidence\n• Improve communication\n• Develop leadership skills\n• Create work-life balance\n\n**🛣️ Creating Your Roadmap:**\n1. **Define your 5-year vision**\n2. **Break into 1-year milestones**\n3. **Create quarterly objectives**\n4. **Set monthly action steps**\n5. **Plan weekly activities**\n6. **Review and adjust regularly**\n\nWhat's your biggest goal right now? Let's create a roadmap together!`,
        buttons: [
          { text: "🎯 Set Career Goals", type: "link", data: { url: "#career-goals" } },
          { text: "📚 Education Planning", type: "link", data: { url: "#education-goals" } },
          { text: "👥 Goal Accountability Partner", type: "community" },
          { text: "📊 Track Progress Tools", type: "link", data: { url: "#tracking-tools" } }
        ]
      };
    }

    // General motivational and guidance
    return {
      content: `🌟 Hi ${userName}! I'm so glad you're here. As your AI opportunity coach, I'm designed to help you unlock amazing possibilities for your future.\n\n**Here's how I can support your journey:**\n\n**🎓 Educational Opportunities**\n• Find scholarships and grants\n• Discover online courses and certifications\n• Connect with educational programs\n\n**💼 Career Development**\n• Explore high-growth career paths\n• Build in-demand skills\n• Create professional networks\n\n**🚀 Personal Growth**\n• Set and achieve ambitious goals\n• Develop leadership capabilities\n• Build confidence and resilience\n\n**🤝 Community & Mentorship**\n• Connect with like-minded peers\n• Find mentors and role models\n• Join professional communities\n\n**💡 What would you like to explore first?**\n\nRemember: Every expert was once a beginner, and every success story started with a single step. You have incredible potential, and I'm here to help you realize it!\n\nWhat specific area interests you most today?`,
      buttons: [
        { text: "🎓 Find Opportunities", type: "scholarship" },
        { text: "💼 Career Guidance", type: "link", data: { url: "#career" } },
        { text: "🎯 Set Goals", type: "link", data: { url: "#goals" } },
        { text: "🤝 Join Community", type: "community" }
      ]
    };
  }

  private matchesPattern(input: string, keywords: string[]): boolean {
    return keywords.some(keyword => input.includes(keyword));
  }

  private getFallbackResponse(): AIResponse {
    return {
      content: "I apologize, but I'm experiencing some technical difficulties right now. Let me still try to help you! Could you please rephrase your question, or feel free to ask about scholarships, career advice, skill development, or goal setting? I'm here to support your journey! 🌟",
      buttons: [
        { text: "🎓 Ask about Scholarships", type: "scholarship" },
        { text: "💼 Career Questions", type: "link", data: { url: "#career" } },
        { text: "🤝 Join Community", type: "community" }
      ]
    };
  }

  // Method to integrate with actual AI APIs in the future
  async callAIAPI(messages: ChatMessage[]): Promise<string> {
    // Placeholder for actual AI API integration
    // This would integrate with OpenAI, Claude, or other AI services
    
    // Example OpenAI integration (commented out - requires API key):
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
    */
    
    throw new Error('AI API integration not yet configured');
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [{
      role: 'system',
      content: this.conversationHistory[0].content
    }];
  }

  // Get conversation history
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }
}

export const aiChatService = new AIChatService();
export type { AIResponse, ChatMessage };