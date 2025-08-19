"use strict";
/**
 * Minimal Working AI Chat Function
 * This provides immediate chat functionality while we configure API keys
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleChatMinimal = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Minimal AI Chat Endpoint - Works immediately with intelligent fallbacks
 */
exports.simpleChatMinimal = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    try {
        const { message, userId, sessionId, userContext, ragContext } = req.body;
        if (!message || message.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Message is required'
            });
            return;
        }
        // Get user profile if userId is provided
        let userProfile = null;
        if (ragContext === null || ragContext === void 0 ? void 0 : ragContext.userProfile) {
            userProfile = ragContext.userProfile;
            console.log('Using RAG context from frontend');
        }
        else if (userId) {
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    userProfile = userDoc.data();
                }
            }
            catch (error) {
                console.warn('Could not fetch user profile:', error);
            }
        }
        // Generate intelligent response using enhanced fallback system
        const aiResponse = generateIntelligentResponse(message, userProfile, userContext, ragContext);
        // Save chat message to Firestore
        if (userId) {
            try {
                const chatId = `${userId}_${Date.now()}`;
                await db.collection('chatMessages').doc(chatId).set({
                    userId,
                    sessionId: sessionId || `session_${Date.now()}`,
                    userMessage: message,
                    aiResponse: aiResponse,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    model: 'intelligent_fallback'
                });
            }
            catch (error) {
                console.warn('Could not save chat message:', error);
            }
        }
        res.json({
            success: true,
            response: aiResponse,
            conversationId: sessionId || `session_${Date.now()}`
        });
    }
    catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate AI response',
            response: generateBasicFallback()
        });
    }
});
/**
 * Generate intelligent response using context and pattern matching
 */
function generateIntelligentResponse(message, userProfile = null, userContext = null, ragContext = null) {
    var _a, _b;
    const lowerMessage = message.toLowerCase();
    const userName = (userContext === null || userContext === void 0 ? void 0 : userContext.name) || (userProfile === null || userProfile === void 0 ? void 0 : userProfile.name) || ((_a = userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) === null || _a === void 0 ? void 0 : _a.name) || 'there';
    // Check if we have RAG context with specific scholarships
    if ((ragContext === null || ragContext === void 0 ? void 0 : ragContext.contextUsed) && ((_b = ragContext.scholarships) === null || _b === void 0 ? void 0 : _b.length) > 0) {
        return generateRAGResponse(message, userName, ragContext);
    }
    // Scholarship-related queries
    if (lowerMessage.includes('scholarship') || lowerMessage.includes('funding') || lowerMessage.includes('grant')) {
        return generateScholarshipResponse(userName, userProfile);
    }
    // Career-related queries
    if (lowerMessage.includes('career') || lowerMessage.includes('job') || lowerMessage.includes('work')) {
        return generateCareerResponse(userName, userProfile);
    }
    // Learning/skills queries
    if (lowerMessage.includes('learn') || lowerMessage.includes('skill') || lowerMessage.includes('course') || lowerMessage.includes('study')) {
        return generateLearningResponse(userName, userProfile);
    }
    // Roadmap/planning queries
    if (lowerMessage.includes('roadmap') || lowerMessage.includes('plan') || lowerMessage.includes('strategy')) {
        return generateRoadmapResponse(userName, userProfile);
    }
    // Goal setting queries
    if (lowerMessage.includes('goal') || lowerMessage.includes('achieve') || lowerMessage.includes('target')) {
        return generateGoalResponse(userName, userProfile);
    }
    // Application help queries
    if (lowerMessage.includes('apply') || lowerMessage.includes('application') || lowerMessage.includes('essay')) {
        return generateApplicationResponse(userName, userProfile);
    }
    // Networking queries  
    if (lowerMessage.includes('network') || lowerMessage.includes('mentor') || lowerMessage.includes('connect')) {
        return generateNetworkingResponse(userName, userProfile);
    }
    // General motivational or greeting
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help') || lowerMessage.includes('what')) {
        return generateWelcomeResponse(userName, userProfile);
    }
    // Default response
    return generateContextualResponse(message, userName, userProfile);
}
/**
 * Generate response using RAG context data
 */
function generateRAGResponse(message, userName, ragContext) {
    const scholarships = ragContext.scholarships.slice(0, 3);
    let response = `Hi ${userName}! 🌟 Based on your interests and our live database, I found some excellent scholarship matches:\n\n`;
    scholarships.forEach((scholarship, index) => {
        var _a;
        const deadline = scholarship.deadline ?
            (scholarship.deadline.seconds ?
                new Date(scholarship.deadline.seconds * 1000).toLocaleDateString() :
                scholarship.deadline) :
            'Open';
        response += `**${index + 1}. ${scholarship.title}**\n`;
        response += `📍 Provider: ${scholarship.provider}\n`;
        response += `📅 Deadline: ${deadline}\n`;
        response += `✨ ${scholarship.summary || ((_a = scholarship.description) === null || _a === void 0 ? void 0 : _a.substring(0, 150)) + '...' || 'Great opportunity for your career!'}\n\n`;
    });
    response += `💡 **Next Steps:**\n`;
    response += `• Review each opportunity's requirements carefully\n`;
    response += `• Start preparing your application materials\n`;
    response += `• Set up deadline reminders\n`;
    response += `• Feel free to ask me about specific application strategies!\n\n`;
    response += `*This data is from our live scholarship database and updated regularly!* ✅\n\n`;
    response += `Would you like me to help you create an application roadmap for any of these opportunities?`;
    return response;
}
/**
 * Generate scholarship-focused response
 */
function generateScholarshipResponse(userName, userProfile) {
    var _a, _b;
    const interests = ((_a = userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) === null || _a === void 0 ? void 0 : _a.careerInterests) || [];
    const educationLevel = ((_b = userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) === null || _b === void 0 ? void 0 : _b.educationLevel) || 'undergraduate';
    return `Hi ${userName}! 🎓 I'd be happy to help you find scholarship opportunities. Here are some excellent programs for ${educationLevel} students:

**Top Recommendations:**
• **Mastercard Foundation Scholars Program** - Comprehensive funding for African students with leadership focus
• **AAUW International Fellowships** - Supporting women in graduate studies worldwide  
• **Rhodes Scholarships** - Prestigious program for exceptional students
• **Chevening Scholarships** - UK government funding for future leaders

${interests.length > 0 ? `\n**Based on your interests in ${interests.slice(0, 2).join(' and ')}:**` : ''}
${interests.includes('Technology') ? '• Google Developer Scholarships\n• Microsoft Student Partner Programs\n' : ''}
${interests.includes('Business') ? '• McKinsey Forward Program\n• World Bank Graduate Scholarship\n' : ''}
${interests.includes('Health') ? '• WHO Young Professionals Programme\n• Gates Foundation Health Scholarships\n' : ''}

💡 **Application Tips:**
• Start applications 6-8 months before deadlines
• Focus on leadership and community impact in essays
• Get strong recommendation letters from mentors
• Practice interview skills early

What specific field or level of study interests you most? I can provide more targeted recommendations and help create an application strategy! ✨`;
}
/**
 * Generate career-focused response
 */
function generateCareerResponse(userName, userProfile) {
    return `Hello ${userName}! 💼 Career planning is exciting! The job market for young African professionals is full of opportunities, especially in these high-growth areas:

**🔥 Hottest Career Fields in 2024:**

**Technology & Innovation** 💻
• Software Development (Python, JavaScript, React)
• Data Science & AI/ML Engineering  
• Cybersecurity & Cloud Computing
• Mobile App Development
• DevOps & System Administration

**Digital Economy** 📱
• Digital Marketing & Social Media Management
• E-commerce & Online Business Development
• FinTech & Digital Banking
• Content Creation & Influencer Marketing
• UX/UI Design

**Sustainable Development** 🌱
• Renewable Energy Engineering
• Environmental Consulting & Policy
• Green Finance & Impact Investment
• Sustainable Agriculture Technology
• Climate Change Adaptation

**Healthcare Innovation** 🏥
• Telemedicine & Health Tech
• Biomedical Engineering
• Public Health & Epidemiology
• Medical Device Development
• Healthcare Data Analytics

💡 **Success Strategy:**
1. Choose a field that aligns with your passions
2. Build relevant skills through online courses and projects
3. Create a strong portfolio showcasing your work
4. Network with professionals in your chosen field
5. Seek internships and mentorship opportunities

What field excites you most? I can help you create a detailed career roadmap with specific steps, skills to develop, and opportunities to pursue! 🚀`;
}
/**
 * Generate learning-focused response
 */
function generateLearningResponse(userName, userProfile) {
    return `Great mindset, ${userName}! 📚 Continuous learning is your superpower. Here's a strategic approach to skill development:

**🎯 Most In-Demand Skills for 2024:**

**Technical Skills** 🛠️
• **Programming Languages:** Python, JavaScript, SQL, Java
• **Data Analysis:** Excel, Tableau, Power BI, Python pandas
• **Cloud Computing:** AWS, Google Cloud, Microsoft Azure
• **AI/ML Basics:** Understanding ChatGPT, automation tools
• **Digital Marketing:** SEO, social media, content creation

**Professional Skills** 💼
• **Project Management:** Agile, Scrum, organizational skills
• **Communication:** Public speaking, writing, presentation
• **Leadership:** Team management, decision-making
• **Financial Literacy:** Budgeting, investment basics
• **Language Skills:** English fluency, local languages

**Creative Skills** 🎨
• **Design:** Canva, Adobe Creative Suite, UI/UX
• **Content Creation:** Video editing, copywriting
• **Photography:** Product, portrait, event photography

**🚀 Learning Strategy:**
1. **Pick 2-3 core skills** to focus on this year
2. **Use free resources:** Coursera, edX, YouTube, Khan Academy
3. **Practice with real projects** - build a portfolio
4. **Get certified** - add credentials to your LinkedIn
5. **Join learning communities** - learn from peers

**⏰ Time Investment:** Just 1-2 hours daily can transform your capabilities in 3-6 months!

What specific skill would you like to master first? I can recommend specific courses, create a learning timeline, and suggest practical projects to build your expertise! 💪`;
}
/**
 * Generate roadmap-focused response
 */
function generateRoadmapResponse(userName, userProfile) {
    return `Excellent thinking, ${userName}! 🗺️ Having a clear roadmap is crucial for success. Let me help you create a strategic plan:

**📋 Roadmap Creation Framework:**

**Step 1: Vision Setting** 🎯
• Define your 5-year vision clearly
• Identify your core values and passions
• Set specific, measurable outcomes

**Step 2: Goal Breakdown** 📊
• Annual milestones (what to achieve each year)
• Quarterly objectives (3-month goals)
• Monthly action steps (concrete tasks)
• Weekly activities (daily habits)

**Step 3: Resource Planning** 🛠️
• Skills you need to develop
• Courses and certifications to complete
• People to connect with (mentors, peers)
• Financial requirements and funding sources

**Step 4: Timeline Management** ⏰
• Priority matrix (urgent vs important)
• Deadline mapping with buffers
• Regular review and adjustment periods

**🎯 Roadmap Categories:**

**Career Roadmap**
• Industry research and positioning
• Skill development timeline
• Network building strategy
• Job/opportunity targeting

**Education Roadmap** 
• Course selection and sequencing
• Application deadlines and requirements
• Funding and scholarship strategy
• Academic milestone planning

**Personal Development Roadmap**
• Leadership skills building
• Communication improvement
• Health and wellness goals
• Financial literacy development

What specific area would you like to create a roadmap for? I can help you build a detailed, actionable plan with specific timelines and milestones! 🚀`;
}
/**
 * Generate goal-setting response
 */
function generateGoalResponse(userName, userProfile) {
    return `I love your focus on goal-setting, ${userName}! 🎯 Clear goals are the foundation of every success story. Let me help you create a winning strategy:

**🚀 SMART Goals Framework:**

**S**pecific - Clear, well-defined objectives
**M**easurable - Track progress with concrete metrics  
**A**chievable - Realistic given your current resources
**R**elevant - Aligned with your values and long-term vision
**T**ime-bound - Set clear deadlines for accountability

**📋 Goal Categories to Consider:**

**Career Goals** 💼
• Land dream job/internship by [date]
• Develop specific technical skills
• Build professional network (X connections)
• Increase income by X% within Y timeframe

**Education Goals** 🎓
• Complete degree/certification program
• Win scholarship or funding opportunity
• Achieve specific GPA or grades
• Learn new language to fluency level

**Personal Development** 🌟
• Build public speaking confidence
• Develop leadership capabilities
• Create work-life balance systems
• Establish healthy daily routines

**Financial Goals** 💰
• Build emergency fund ($X amount)
• Start investing or savings plan
• Launch side business or income stream
• Achieve financial independence timeline

**🛣️ Goal Achievement Strategy:**
1. **Write down your goals** - makes them 42% more likely to happen
2. **Break into smaller steps** - monthly and weekly actions
3. **Create accountability systems** - partners, apps, regular reviews
4. **Celebrate milestones** - reward progress to maintain motivation
5. **Adjust as needed** - flexibility is key to long-term success

What's your biggest goal right now? Let's break it down into a concrete action plan with specific steps and deadlines! I'll help you create a system to track progress and stay motivated. 💪`;
}
/**
 * Generate application help response
 */
function generateApplicationResponse(userName, userProfile) {
    return `I'm here to help you with applications, ${userName}! 📝 Strong applications are your ticket to amazing opportunities. Here's your comprehensive guide:

**🎯 Application Excellence Strategy:**

**Research Phase** 🔍
• Thoroughly read all requirements and criteria
• Research the organization's values and mission
• Find successful applicant profiles and stories
• Understand selection committee priorities

**Document Preparation** 📋
• **Personal Statement/Essay:** Tell your unique story
• **CV/Resume:** Highlight relevant achievements
• **Letters of Recommendation:** Choose strong advocates
• **Transcripts:** Ensure accuracy and completeness
• **Portfolio:** Showcase your best work (if applicable)

**Essay Writing Mastery** ✍️
• **Hook:** Start with compelling opening
• **Story Arc:** Challenge → Action → Growth → Impact
• **Specificity:** Use concrete examples and numbers
• **Authenticity:** Let your personality shine through
• **Connection:** Link your goals to the opportunity

**Common Essay Prompts & Approaches:**
• "Why this program?" → Research + Personal fit
• "Greatest challenge?" → Problem-solving + resilience  
• "Leadership experience?" → Impact + lessons learned
• "Future goals?" → Vision + how program helps

**📅 Application Timeline:**
• **8-10 weeks before:** Start research and planning
• **6-8 weeks before:** Draft essays and gather documents
• **4-6 weeks before:** Get feedback and revise
• **2-4 weeks before:** Final reviews and submissions
• **1-2 weeks before:** Submit early (avoid last-minute issues)

**💡 Pro Tips:**
• Follow instructions exactly (formatting, word limits, etc.)
• Use active voice and strong action verbs
• Quantify achievements when possible
• Proofread multiple times for errors
• Submit 24-48 hours before deadline

What specific application are you working on? I can help you brainstorm essay topics, review your approach, or create a personalized application timeline! 🌟`;
}
/**
 * Generate networking response
 */
function generateNetworkingResponse(userName, userProfile) {
    return `Fantastic question, ${userName}! 🤝 Networking is often the secret ingredient to breakthrough opportunities. Here's your strategic networking playbook:

**🌟 Strategic Networking Approach:**

**Online Networking** 💻
• **LinkedIn:** Optimize profile, engage with posts, connect thoughtfully
• **Twitter/X:** Follow industry leaders, join conversations
• **Professional Communities:** Join field-specific groups and forums
• **Virtual Events:** Attend webinars, online conferences, workshops

**Offline Opportunities** 👥  
• **Industry Events:** Conferences, workshops, meetups in your city
• **University Networks:** Connect with alumni in your field
• **Professional Associations:** Join relevant industry organizations
• **Community Service:** Meet professionals while contributing to causes

**🎯 Networking Best Practices:**

**The Give-First Mindset**
• Share valuable content and insights
• Make introductions between contacts
• Offer help before asking for favors
• Celebrate others' achievements publicly

**Meaningful Conversations** 
• Ask thoughtful questions about their work
• Share your genuine interests and goals
• Listen actively and remember details
• Follow up with specific references to your chat

**Professional Follow-Up**
• Send personalized LinkedIn connection requests
• Share relevant articles or opportunities
• Schedule informational interviews
• Maintain regular but not overwhelming contact

**🔥 Power Networking Strategies:**

**Informational Interviews**
• Reach out to professionals in your field
• Ask for 15-20 minute conversations
• Prepare thoughtful questions about their career path
• Always ask for additional contacts to speak with

**Mentorship Development**
• Identify potential mentors in your industry
• Approach with specific, respectful requests
• Come prepared with clear questions and goals
• Show appreciation and follow through on advice

**Community Building**
• Start or join professional groups
• Organize local meetups or study groups
• Create valuable content (blogs, posts, videos)
• Become known as a connector in your field

Want me to help you create a networking strategy or draft messages to reach out to specific professionals? I can help you identify the best events to attend and approach to take! 🚀`;
}
/**
 * Generate welcome/general response
 */
function generateWelcomeResponse(userName, userProfile) {
    var _a, _b;
    const interests = ((_a = userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) === null || _a === void 0 ? void 0 : _a.careerInterests) || [];
    const educationLevel = ((_b = userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) === null || _b === void 0 ? void 0 : _b.educationLevel) || '';
    return `Hello ${userName}! 👋 Welcome to Edutu! I'm your AI opportunity coach, and I'm excited to help you unlock amazing possibilities for your future.

${interests.length > 0 ? `I see you're interested in ${interests.slice(0, 2).join(' and ')} - exciting fields with lots of opportunity!` : ''}

**🌟 Here's how I can support your journey:**

**🎓 Educational Opportunities**
• Find scholarships and grants that match your profile
• Discover online courses and certifications
• Connect with educational programs and universities
• Help with application strategies and essays

**💼 Career Development**  
• Explore high-growth career paths in Africa and globally
• Build in-demand skills for your target industry
• Create professional networks and find mentors
• Develop job search and interview strategies

**🚀 Personal Growth**
• Set and achieve ambitious goals with clear roadmaps
• Develop leadership and communication capabilities
• Build confidence and resilience for challenges
• Create work-life balance and wellness habits

**🤝 Community & Mentorship**
• Connect with like-minded peers and study groups
• Find mentors and role models in your field
• Join professional communities and networks
• Access ongoing support and accountability

**💡 What would you like to explore today?**

Some popular topics I help with:
• "Help me find scholarships for [your field]"
• "What career path should I consider in tech?"
• "Create a learning roadmap for [specific skill]"  
• "How do I network effectively in my industry?"
• "Help me set goals for the next 6 months"

Remember: Every expert was once a beginner, and every success story started with a single step. You have incredible potential, and I'm here to help you realize it! 

What specific area interests you most today? 🌟`;
}
/**
 * Generate contextual response for unmatched queries
 */
function generateContextualResponse(message, userName, userProfile) {
    return `Thanks for your question, ${userName}! 🤔 I want to make sure I give you the most helpful response possible.

I'm Edutu, your AI opportunity coach, and I specialize in helping young African professionals with:

**🎯 My Core Expertise:**
• **Scholarship & Funding Opportunities** - Finding and applying for financial aid
• **Career Guidance & Planning** - Exploring paths in growing industries  
• **Skill Development** - Building capabilities employers value
• **Goal Setting & Achievement** - Creating actionable success plans
• **Networking & Mentorship** - Connecting with the right people
• **Application Support** - Essays, CVs, interview preparation

**💡 To better help you, could you be more specific about:**
• What type of opportunity you're looking for?
• What stage you're at in your education/career?
• What specific challenge you're facing?
• What goal you're trying to achieve?

**🚀 Here are some ways to rephrase your question:**
• "Help me find scholarships for [your field of study]"
• "What skills should I learn for a career in [industry]?"
• "How do I create a plan to achieve [specific goal]?"
• "What's the best way to network in [your field]?"

I'm here to provide personalized, actionable guidance to help you succeed. What would you like to focus on first? ✨`;
}
/**
 * Basic fallback for system errors
 */
function generateBasicFallback() {
    return `Hi there! 👋 I'm experiencing some technical difficulties, but I'm still here to help!

I'm Edutu, your AI opportunity coach specializing in helping young African professionals with:

• 🎓 **Scholarships & Funding** - Find opportunities that match your profile
• 💼 **Career Guidance** - Explore paths in growing industries  
• 📚 **Skill Development** - Build capabilities that employers value
• 🎯 **Goal Setting** - Create actionable plans for success
• 🤝 **Networking** - Connect with mentors and industry professionals

Please try asking me about any of these topics, and I'll do my best to provide helpful guidance!

Example questions:
• "What scholarships are available for my field?"
• "How do I start a career in technology?"
• "What skills should I learn this year?"
• "Help me create a 6-month goal plan"

I'm here to support your journey to success! 🌟`;
}
//# sourceMappingURL=simpleChatMinimal.js.map