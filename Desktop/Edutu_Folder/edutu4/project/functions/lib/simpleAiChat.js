"use strict";
/**
 * Simple AI Chat Integration for Immediate Functionality
 * This provides working AI responses without complex RAG (can upgrade later)
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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleAiChat = void 0;
const functions = __importStar(require("firebase-functions"));
// Simple imports to avoid dependency issues
const admin = __importStar(require("firebase-admin"));
// AI services will be initialized if API keys are available
let gemini = null;
let openai = null;
// Try to initialize AI services
try {
    if (((_a = functions.config().ai) === null || _a === void 0 ? void 0 : _a.gemini_key) || process.env.GEMINI_API_KEY) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        gemini = new GoogleGenerativeAI(((_b = functions.config().ai) === null || _b === void 0 ? void 0 : _b.gemini_key) || process.env.GEMINI_API_KEY || '');
    }
}
catch (error) {
    console.warn('Could not initialize Gemini:', error);
}
try {
    if (((_c = functions.config().ai) === null || _c === void 0 ? void 0 : _c.openai_key) || process.env.OPENAI_API_KEY) {
        const { OpenAI } = require('openai');
        openai = new OpenAI({
            apiKey: ((_d = functions.config().ai) === null || _d === void 0 ? void 0 : _d.openai_key) || process.env.OPENAI_API_KEY || ''
        });
    }
}
catch (error) {
    console.warn('Could not initialize OpenAI:', error);
}
const db = admin.firestore();
/**
 * Simple AI Chat Endpoint - Works Immediately
 */
exports.simpleAiChat = functions.https.onRequest(async (req, res) => {
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
        // Use provided RAG context or fetch user profile
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
        // Generate AI response with enhanced context
        const aiResponse = await generateAIResponse(message, userProfile, userContext, ragContext);
        // Save chat message to Firestore (optional)
        if (userId) {
            try {
                const chatId = `${userId}_${Date.now()}`;
                await db.collection('chatMessages').doc(chatId).set({
                    userId,
                    sessionId: sessionId || `session_${Date.now()}`,
                    userMessage: message,
                    aiResponse: aiResponse.response,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    model: aiResponse.model || 'gemini'
                });
            }
            catch (error) {
                console.warn('Could not save chat message:', error);
            }
        }
        res.json({
            success: true,
            response: aiResponse.response,
            conversationId: sessionId || `session_${Date.now()}`
        });
    }
    catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate AI response',
            response: generateFallbackResponse()
        });
    }
});
/**
 * Generate AI response with multiple provider fallback
 */
async function generateAIResponse(message, userProfile = null, userContext = null, ragContext = null) {
    var _a, _b;
    // Build context-aware prompt with RAG data
    const prompt = buildContextualPrompt(message, userProfile, userContext, ragContext);
    // Try Gemini first (fastest and cheapest)
    try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        if (response && response.trim().length > 0) {
            return { response: response.trim(), model: 'gemini' };
        }
    }
    catch (error) {
        console.warn('Gemini API failed:', error);
    }
    // Try OpenAI as fallback
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: getSystemPrompt()
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });
        const response = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
        if (response && response.trim().length > 0) {
            return { response: response.trim(), model: 'openai' };
        }
    }
    catch (error) {
        console.warn('OpenAI API failed:', error);
    }
    // Final fallback to intelligent rule-based response
    return {
        response: generateIntelligentFallback(message, userProfile),
        model: 'fallback'
    };
}
/**
 * Build contextual prompt with user information
 */
function buildContextualPrompt(message, userProfile = null, userContext = null, ragContext = null) {
    var _a, _b, _c, _d, _e;
    let prompt = `User message: "${message}"\n\n`;
    // Add user context if available
    if (userContext === null || userContext === void 0 ? void 0 : userContext.name) {
        prompt += `User name: ${userContext.name}\n`;
    }
    if (userContext === null || userContext === void 0 ? void 0 : userContext.age) {
        prompt += `User age: ${userContext.age}\n`;
    }
    // Add user profile information
    if (userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) {
        const prefs = userProfile.preferences;
        if (((_a = prefs.careerInterests) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            prompt += `Career interests: ${prefs.careerInterests.join(', ')}\n`;
        }
        if (prefs.educationLevel) {
            prompt += `Education level: ${prefs.educationLevel}\n`;
        }
        if (((_b = prefs.currentSkills) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            prompt += `Current skills: ${prefs.currentSkills.join(', ')}\n`;
        }
        if (((_c = prefs.preferredLocations) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            prompt += `Preferred locations: ${prefs.preferredLocations.join(', ')}\n`;
        }
    }
    // Add RAG context data for more specific responses
    if ((ragContext === null || ragContext === void 0 ? void 0 : ragContext.contextUsed) && ((_d = ragContext.scholarships) === null || _d === void 0 ? void 0 : _d.length) > 0) {
        prompt += `\n=== RELEVANT SCHOLARSHIPS (Use this data for specific recommendations) ===\n`;
        ragContext.scholarships.slice(0, 5).forEach((scholarship, index) => {
            var _a;
            prompt += `${index + 1}. ${scholarship.title}\n`;
            prompt += `   Provider: ${scholarship.provider}\n`;
            prompt += `   Category: ${scholarship.category || 'General'}\n`;
            prompt += `   Summary: ${scholarship.summary || ((_a = scholarship.description) === null || _a === void 0 ? void 0 : _a.substring(0, 200)) || 'Scholarship opportunity'}\n`;
            if (scholarship.deadline) {
                const deadline = new Date(scholarship.deadline.seconds * 1000).toLocaleDateString();
                prompt += `   Deadline: ${deadline}\n`;
            }
            if (scholarship.amount) {
                prompt += `   Amount: ${scholarship.amount}\n`;
            }
            if (scholarship.relevanceScore) {
                prompt += `   Relevance Score: ${scholarship.relevanceScore}/10\n`;
            }
            prompt += '\n';
        });
        prompt += `\nIMPORTANT: Use the above scholarship data to provide specific, accurate recommendations. Reference actual scholarship names, providers, and details when relevant to the user's query.\n`;
    }
    // Add conversation context
    if (((_e = ragContext === null || ragContext === void 0 ? void 0 : ragContext.recentConversations) === null || _e === void 0 ? void 0 : _e.length) > 0) {
        prompt += `\n=== RECENT CONVERSATION CONTEXT ===\n`;
        ragContext.recentConversations.slice(-4).forEach((conv) => {
            prompt += `${conv.role}: ${conv.content.substring(0, 100)}...\n`;
        });
        prompt += '\n';
    }
    prompt += '\nPlease provide a helpful, personalized response as Edutu, an AI opportunity coach for young African professionals. If you have specific scholarship data above, prioritize those in your recommendations and mention them by name.';
    return prompt;
}
/**
 * System prompt for AI personality
 */
function getSystemPrompt() {
    return `You are Edutu, an AI opportunity coach specifically designed to help young African professionals (ages 16-30) discover and pursue educational and career opportunities.

Your role is to:
- Help users find scholarships, internships, and educational opportunities
- Provide career guidance and skill development advice
- Create personalized learning roadmaps
- Connect users with relevant resources
- Provide motivation and actionable guidance

Always be encouraging, specific, and actionable in your responses. Focus on opportunities available in Africa or globally accessible to African youth. When possible, suggest concrete next steps.

Keep responses conversational, helpful, and motivating. Use emojis occasionally to make interactions engaging.

If you don't have specific information, provide general guidance and encourage the user to explore resources or ask follow-up questions.`;
}
/**
 * Generate intelligent fallback response
 */
function generateIntelligentFallback(message, userProfile = null) {
    var _a;
    const lowerMessage = message.toLowerCase();
    const userName = (userProfile === null || userProfile === void 0 ? void 0 : userProfile.name) || ((_a = userProfile === null || userProfile === void 0 ? void 0 : userProfile.preferences) === null || _a === void 0 ? void 0 : _a.name) || 'there';
    // Scholarship-related queries
    if (lowerMessage.includes('scholarship') || lowerMessage.includes('funding')) {
        return `Hi ${userName}! 🎓 I'd be happy to help you find scholarship opportunities. Based on your interests, here are some directions to explore:

• **Mastercard Foundation Scholars Program** - Comprehensive funding for African students
• **AAUW International Fellowships** - For women pursuing graduate studies
• **Country-specific scholarships** in your field of interest

To provide more targeted recommendations, could you tell me:
- What field you're interested in studying?
- What level (undergraduate/graduate)?
- Any preferred countries or regions?

I'm here to help you find the perfect opportunities! ✨`;
    }
    // Career-related queries
    if (lowerMessage.includes('career') || lowerMessage.includes('job')) {
        return `Hello ${userName}! 💼 Career guidance is one of my specialties. The job market for young African professionals is full of opportunities, especially in:

• **Technology** - Software development, data science, AI
• **Digital Marketing** - Social media, content creation, e-commerce
• **Green Energy** - Renewable energy, sustainability consulting
• **Healthcare** - Telemedicine, health tech, public health
• **Finance** - FinTech, digital banking, investment

What field interests you most? I can help you:
- Explore specific career paths
- Identify required skills
- Find relevant training programs
- Connect with networking opportunities

Let's build your career roadmap together! 🚀`;
    }
    // Learning/skills queries
    if (lowerMessage.includes('learn') || lowerMessage.includes('skill')) {
        return `Great to hear you're focused on learning, ${userName}! 📚 Continuous skill development is key to success. Here are some high-impact areas:

**Technical Skills:**
• Programming (Python, JavaScript)
• Data analysis and visualization
• Digital marketing and social media
• Project management

**Soft Skills:**
• Communication and presentation
• Leadership and teamwork
• Critical thinking and problem-solving
• Networking and relationship building

What specific skills are you most interested in developing? I can suggest:
- Free online courses and resources
- Practical projects to build your portfolio
- Communities to join for learning and networking

Let's create a personalized learning plan! 💪`;
    }
    // General fallback
    return `Hello ${userName}! 👋 Thanks for reaching out. I'm Edutu, your AI opportunity coach, and I'm here to help you with:

• 🎓 **Scholarships & Funding** - Find opportunities that match your profile
• 💼 **Career Guidance** - Explore paths in growing industries
• 📚 **Skill Development** - Build capabilities that employers value
• 🌍 **Networking** - Connect with mentors and peers
• 🎯 **Goal Setting** - Create actionable plans for success

What would you like to focus on today? Feel free to ask me anything about education, career development, or opportunities for young African professionals.

I'm here to help you succeed! ✨`;
}
/**
 * Final fallback response
 */
function generateFallbackResponse() {
    return `Hi there! 👋 I'm experiencing some technical difficulties, but I'm still here to help! 

I'm Edutu, your AI opportunity coach specializing in helping young African professionals find scholarships, career guidance, and learning opportunities.

Please try asking me about:
• Scholarship opportunities in your field
• Career advice and skill development
• Learning roadmaps and resources
• Networking and mentorship

I'm here to support your journey to success! 🌟`;
}
//# sourceMappingURL=simpleAiChat.js.map