/**
 * AI Service for Edutu Functions
 * Handles AI operations including embeddings, chat, and roadmap generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';

// Initialize AI clients
const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const cohereKey = process.env.COHERE_API_KEY;

let gemini: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;
let cohere: CohereClient | null = null;

// Initialize clients if keys are available
if (geminiKey) {
  gemini = new GoogleGenerativeAI(geminiKey);
}

if (openaiKey) {
  openai = new OpenAI({ apiKey: openaiKey });
}

if (cohereKey) {
  cohere = new CohereClient({ token: cohereKey });
}

/**
 * Generate embeddings for text using available AI service
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    // Try OpenAI first (most reliable embeddings)
    if (openai) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit text length
      });
      return response.data[0].embedding;
    }

    // Fallback to Cohere
    if (cohere) {
      const response = await cohere.embed({
        texts: [text.substring(0, 8000)],
        model: 'embed-english-v3.0',
        inputType: 'search_document'
      });
      return response.embeddings[0];
    }

    // Last fallback: simple hash-based embedding (not ideal but functional)
    console.warn('No embedding service available, using hash-based fallback');
    return generateHashEmbedding(text);

  } catch (error) {
    console.error('Error generating embeddings:', error);
    // Return hash-based embedding as ultimate fallback
    return generateHashEmbedding(text);
  }
}

/**
 * Generate chat response using available AI service with enhanced RAG context
 */
export async function generateChatResponse(message: string, ragContext: any): Promise<string> {
  try {
    const systemPrompt = buildEnhancedChatSystemPrompt(ragContext);
    const fullPrompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;

    // Try Gemini first
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(fullPrompt);
      const response = result.response.text();
      if (response && response.length > 10) {
        return response.trim();
      }
    }

    // Fallback to OpenAI
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });
      
      const content = response.choices[0]?.message?.content;
      if (content && content.length > 10) {
        return content.trim();
      }
    }

    // Fallback to Cohere
    if (cohere) {
      const response = await cohere.chat({
        message: message,
        preamble: systemPrompt,
        maxTokens: 500,
      });
      
      if (response.text && response.text.length > 10) {
        return response.text.trim();
      }
    }

    // Ultimate fallback: enhanced rule-based response
    return generateEnhancedRuleBasedResponse(message, ragContext);

  } catch (error) {
    console.error('Error generating chat response:', error);
    return generateEnhancedRuleBasedResponse(message, ragContext);
  }
}

/**
 * Generate personalized roadmap using AI
 */
export async function generateRoadmap(opportunity: any, userProfile: any, options: any = {}): Promise<any> {
  try {
    const prompt = buildRoadmapPrompt(opportunity, userProfile, options);

    // Try Gemini for roadmap generation
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const roadmapData = parseRoadmapResponse(response);
        if (roadmapData.milestones && roadmapData.milestones.length > 0) {
          return enrichRoadmapData(roadmapData, opportunity, userProfile);
        }
      } catch (parseError) {
        console.warn('Failed to parse Gemini roadmap response:', parseError);
      }
    }

    // Fallback to OpenAI
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert educational advisor creating personalized learning roadmaps.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
      
      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const roadmapData = parseRoadmapResponse(content);
          if (roadmapData.milestones && roadmapData.milestones.length > 0) {
            return enrichRoadmapData(roadmapData, opportunity, userProfile);
          }
        } catch (parseError) {
          console.warn('Failed to parse OpenAI roadmap response:', parseError);
        }
      }
    }

    // Ultimate fallback: template-based roadmap
    return generateTemplateRoadmap(opportunity, userProfile);

  } catch (error) {
    console.error('Error generating roadmap:', error);
    return generateTemplateRoadmap(opportunity, userProfile);
  }
}

/**
 * Build enhanced chat system prompt with comprehensive RAG context
 */
function buildEnhancedChatSystemPrompt(ragContext: any): string {
  let prompt = `You are Edutu AI, a world-class career coaching assistant specialized in helping young African professionals aged 16-30. You are knowledgeable, encouraging, and provide actionable advice about educational opportunities, scholarships, and career development.

PERSONALITY & APPROACH:
- Friendly, encouraging, and supportive mentor
- Provide specific, actionable advice with clear next steps
- Reference user's context and conversation history when relevant
- Focus on opportunities available in Africa or globally accessible to African youth
- Never use generic "technical difficulties" responses

`;

  // Add comprehensive user context
  if (ragContext.userProfile) {
    const profile = ragContext.userProfile;
    prompt += `USER PROFILE:
- Name: ${profile.name}
- Education Level: ${profile.preferences?.educationLevel || 'Not specified'}
- Career Interests: ${profile.preferences?.careerInterests?.join(', ') || 'Not specified'}
- Learning Style: ${profile.preferences?.learningStyle || 'Not specified'}
- Skills: ${profile.preferences?.currentSkills?.join(', ') || 'Not specified'}
- Career Goals: ${profile.preferences?.careerGoals?.join(', ') || 'Not specified'}
- Time Availability: ${profile.preferences?.timeAvailability || 'Not specified'}

`;
  }

  // Add chat history context
  if (ragContext.chatHistory && ragContext.chatHistory.length > 0) {
    prompt += `RECENT CONVERSATION CONTEXT:\n`;
    ragContext.chatHistory.slice(-3).forEach((chat: any) => {
      prompt += `User: ${chat.message}\nAI: ${chat.response}\n\n`;
    });
  }

  // Add user goals
  if (ragContext.userGoals && ragContext.userGoals.length > 0) {
    prompt += `ACTIVE GOALS:\n`;
    ragContext.userGoals.slice(0, 3).forEach((goal: any) => {
      prompt += `- ${goal.title}: ${goal.description || 'No description'} (${goal.status})\n`;
    });
    prompt += '\n';
  }

  // Add relevant scholarships
  if (ragContext.relevantScholarships && ragContext.relevantScholarships.length > 0) {
    prompt += `RELEVANT SCHOLARSHIPS & OPPORTUNITIES:\n`;
    ragContext.relevantScholarships.slice(0, 5).forEach((scholarship: any, i: number) => {
      prompt += `${i + 1}. ${scholarship.title} (${scholarship.provider})\n`;
      if (scholarship.summary) prompt += `   Summary: ${scholarship.summary.substring(0, 150)}...\n`;
      if (scholarship.deadline) {
        const deadline = new Date(scholarship.deadline.toMillis());
        prompt += `   Deadline: ${deadline.toLocaleDateString()}\n`;
      }
      prompt += '\n';
    });
  }

  prompt += `INSTRUCTIONS:
- Provide specific, actionable advice tailored to the user's profile and goals
- Reference relevant scholarships and opportunities when appropriate
- Build on previous conversation context when available
- Be encouraging but realistic about requirements and timelines
- Always end with clear next steps or follow-up questions
- Never respond with generic "technical difficulties" messages

Respond naturally and conversationally while being highly informative and helpful.`;

  return prompt;
}

/**
 * Build roadmap generation prompt
 */
function buildRoadmapPrompt(opportunity: any, userProfile: any, options: any): string {
  return `Create a personalized learning roadmap for this opportunity:

OPPORTUNITY:
Title: ${opportunity.title}
Summary: ${opportunity.summary}
Requirements: ${opportunity.requirements || 'See details'}
Deadline: ${opportunity.deadline || 'Not specified'}
Provider: ${opportunity.provider || 'Unknown'}

USER PROFILE:
Education Level: ${userProfile.preferences?.educationLevel || 'Not specified'}
Career Interests: ${userProfile.preferences?.careerInterests?.join(', ') || 'Not specified'}
Learning Style: ${userProfile.preferences?.learningStyle || 'Not specified'}
Time Availability: ${userProfile.preferences?.timeAvailability || 'Not specified'}
Current Goals: ${userProfile.preferences?.currentGoals || 'Not specified'}

Generate a structured roadmap with:
1. 4-6 specific milestones
2. Timeline for each milestone
3. Required resources/actions
4. Success metrics
5. Tips for success

Format as JSON with this structure:
{
  "title": "Roadmap title",
  "summary": "Brief roadmap description",
  "duration": "Expected timeframe",
  "milestones": [
    {
      "id": "milestone_1",
      "title": "Milestone title",
      "description": "What to accomplish",
      "timeline": "When to complete by",
      "actions": ["Action 1", "Action 2"],
      "resources": ["Resource 1", "Resource 2"],
      "successCriteria": "How to know you've succeeded"
    }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;
}

/**
 * Parse AI response into structured roadmap data
 */
function parseRoadmapResponse(response: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // If no JSON found, try to parse structured text
    const lines = response.split('\n').filter(line => line.trim());
    const roadmap: any = {
      title: 'Personalized Learning Roadmap',
      summary: 'AI-generated roadmap for your selected opportunity',
      duration: '3-6 months',
      milestones: [],
      tips: []
    };

    // Extract milestones and tips from text
    let currentMilestone: any = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/^\d+\./)) {
        // New milestone
        if (currentMilestone) {
          roadmap.milestones.push(currentMilestone);
        }
        currentMilestone = {
          id: `milestone_${roadmap.milestones.length + 1}`,
          title: trimmed.replace(/^\d+\./, '').trim(),
          description: '',
          timeline: '2-4 weeks',
          actions: [],
          resources: [],
          successCriteria: 'Complete all actions'
        };
      } else if (trimmed.startsWith('-') && currentMilestone) {
        // Action item
        currentMilestone.actions.push(trimmed.replace(/^-/, '').trim());
      } else if (trimmed.toLowerCase().includes('tip')) {
        roadmap.tips.push(trimmed);
      }
    }

    if (currentMilestone) {
      roadmap.milestones.push(currentMilestone);
    }

    return roadmap;
  } catch (error) {
    console.error('Error parsing roadmap response:', error);
    throw error;
  }
}

/**
 * Enrich roadmap data with additional metadata
 */
function enrichRoadmapData(roadmapData: any, opportunity: any, userProfile: any): any {
  return {
    ...roadmapData,
    opportunityId: opportunity.id,
    userId: userProfile.id,
    difficulty: calculateDifficulty(opportunity, userProfile),
    estimatedHours: calculateEstimatedHours(roadmapData.milestones),
    tags: extractRoadmapTags(roadmapData, opportunity),
    status: 'active',
    progress: 0,
    createdBy: 'ai',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate template-based roadmap as fallback
 */
function generateTemplateRoadmap(opportunity: any, userProfile: any): any {
  return {
    title: `Roadmap for ${opportunity.title}`,
    summary: 'A structured approach to achieving your educational goal',
    duration: '3-6 months',
    milestones: [
      {
        id: 'milestone_1',
        title: 'Research and Planning',
        description: 'Understand requirements and create application strategy',
        timeline: '1-2 weeks',
        actions: ['Review application requirements', 'Gather necessary documents', 'Create timeline'],
        resources: ['Official website', 'Application guidelines'],
        successCriteria: 'Complete application checklist'
      },
      {
        id: 'milestone_2',
        title: 'Application Preparation',
        description: 'Prepare all application materials',
        timeline: '2-4 weeks',
        actions: ['Write personal statement', 'Gather references', 'Complete forms'],
        resources: ['Writing guides', 'Template examples'],
        successCriteria: 'All materials ready for review'
      },
      {
        id: 'milestone_3',
        title: 'Application Submission',
        description: 'Submit complete application',
        timeline: '1 week',
        actions: ['Final review', 'Submit application', 'Confirm receipt'],
        resources: ['Application portal', 'Confirmation emails'],
        successCriteria: 'Application successfully submitted'
      },
      {
        id: 'milestone_4',
        title: 'Follow-up',
        description: 'Track application and prepare for next steps',
        timeline: 'Ongoing',
        actions: ['Monitor application status', 'Prepare for interviews', 'Plan next steps'],
        resources: ['Status portal', 'Interview guides'],
        successCriteria: 'Ready for all possible outcomes'
      }
    ],
    tips: [
      'Start early to avoid last-minute stress',
      'Keep organized records of all materials',
      'Seek feedback on your application',
      'Have backup options ready'
    ],
    opportunityId: opportunity.id,
    userId: userProfile.id,
    difficulty: 'medium',
    estimatedHours: 20,
    tags: ['application', 'planning'],
    status: 'active',
    progress: 0,
    createdBy: 'template',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate enhanced rule-based chat response as ultimate fallback
 */
function generateEnhancedRuleBasedResponse(message: string, ragContext: any): string {
  const lowerMessage = message.toLowerCase();

  // Personalize responses with user name if available
  const userName = ragContext.userProfile?.name ? `, ${ragContext.userProfile.name}` : '';

  if (lowerMessage.includes('scholarship') || lowerMessage.includes('funding')) {
    if (ragContext.relevantScholarships && ragContext.relevantScholarships.length > 0) {
      return `Hi${userName}! I found ${ragContext.relevantScholarships.length} scholarship opportunities that match your profile:

${ragContext.relevantScholarships.slice(0, 3).map((s: any, i: number) => 
  `${i + 1}. **${s.title}** (${s.provider})
   ${s.summary?.substring(0, 120)}...${s.deadline ? `\n   Deadline: ${new Date(s.deadline.toMillis()).toLocaleDateString()}` : ''}`
).join('\n\n')}

Based on your interests in ${ragContext.userProfile?.preferences?.careerInterests?.join(', ') || 'your field'}, these look particularly promising. Would you like detailed information about any of these, or shall I help you create an application roadmap?`;
    }
    return `Hi${userName}! I'd love to help you find scholarship opportunities. Based on your profile as a ${ragContext.userProfile?.preferences?.educationLevel || 'student'} interested in ${ragContext.userProfile?.preferences?.careerInterests?.[0] || 'your field'}, let me search for the most relevant funding opportunities for you.`;
  }

  if (lowerMessage.includes('roadmap') || lowerMessage.includes('plan')) {
    if (ragContext.userGoals && ragContext.userGoals.length > 0) {
      return `Great question${userName}! I see you have ${ragContext.userGoals.length} active goals:

${ragContext.userGoals.slice(0, 2).map((g: any, i: number) => 
  `${i + 1}. **${g.title}** - ${g.status}`
).join('\n')}

I can help you create a detailed step-by-step roadmap for any of these goals, or we can work on a new learning path. Which goal would you like to focus on first?`;
    }
    return `Absolutely${userName}! Creating a personalized roadmap is one of my specialties. Based on your background in ${ragContext.userProfile?.preferences?.educationLevel || 'your studies'} and interest in ${ragContext.userProfile?.preferences?.careerInterests?.[0] || 'your field'}, I can help you design a step-by-step plan. What specific goal or opportunity would you like to work towards?`;
  }

  if (lowerMessage.includes('career') || lowerMessage.includes('job')) {
    const interests = ragContext.userProfile?.preferences?.careerInterests || [];
    if (interests.length > 0) {
      return `Hi${userName}! I'd be happy to help with your career planning. I see you're interested in ${interests.slice(0, 2).join(' and ')}. Here's how I can assist:

- **Skill Development**: Identify key skills needed in your field
- **Opportunity Matching**: Find relevant internships, jobs, and programs  
- **Application Strategy**: Help with CVs, cover letters, and interview prep
- **Networking Guidance**: Connect with mentors and industry professionals

What aspect of your career development would you like to focus on?`;
    }
    return `Hi${userName}! Career planning is crucial, and I'm here to help. Let me know what stage you're at - are you exploring career options, preparing for applications, or looking to advance in your current field?`;
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return `Hi${userName}! I'm your personal AI career coach, and I'm here to support your educational and professional journey. Here's what I can help you with:

**🎓 Scholarships & Funding**
- Find scholarships matching your profile
- Application strategies and deadlines
- Financial planning for education

**🗺️ Personalized Roadmaps**  
- Step-by-step learning plans
- Career development paths
- Goal tracking and progress monitoring

**💼 Career Guidance**
- Industry insights and trends
- Skill development recommendations
- Job search and application support

**📚 Educational Resources**
- Course recommendations
- Certification programs
- Professional development opportunities

What area would you like to explore first?`;
  }

  // Context-aware general response
  if (ragContext.chatHistory && ragContext.chatHistory.length > 0) {
    return `Hi${userName}! I'm here to continue helping you with your educational and career goals. Based on our previous conversation, I remember we were discussing ${ragContext.chatHistory[0]?.message.split(' ').slice(0, 5).join(' ')}... 

Is there anything specific you'd like to follow up on, or do you have a new question about scholarships, career planning, or educational opportunities?`;
  }

  return `Hello${userName}! I'm Edutu AI, your personal career coaching assistant. I'm here to help you navigate educational opportunities, find scholarships, and plan your career path.

${ragContext.userProfile ? `I see you're a ${ragContext.userProfile.preferences?.educationLevel || 'student'} interested in ${ragContext.userProfile.preferences?.careerInterests?.[0] || 'your field'}.` : ''} 

How can I assist you today? You can ask me about:
- Scholarship opportunities and funding
- Creating personalized learning roadmaps
- Career guidance and planning
- Educational resources and next steps

What would you like to explore?`;
}

/**
 * Generate hash-based embedding fallback
 */
function generateHashEmbedding(text: string, dimensions: number = 384): number[] {
  const embedding = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
    }
    
    const index = Math.abs(hash) % dimensions;
    embedding[index] += 1 / words.length;
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
}

/**
 * Calculate difficulty based on opportunity and user profile
 */
function calculateDifficulty(opportunity: any, userProfile: any): string {
  // Simple heuristic - can be made more sophisticated
  const requirements = (opportunity.requirements || '').toLowerCase();
  const userLevel = (userProfile.preferences?.educationLevel || '').toLowerCase();
  
  if (requirements.includes('graduate') || requirements.includes('phd')) {
    return 'high';
  } else if (requirements.includes('undergraduate') || userLevel.includes('bachelor')) {
    return 'medium';
  }
  return 'low';
}

/**
 * Calculate estimated hours for roadmap completion
 */
function calculateEstimatedHours(milestones: any[]): number {
  // Base estimate + milestone complexity
  return Math.max(10, milestones.length * 5 + Math.random() * 20);
}

/**
 * Extract relevant tags from roadmap and opportunity
 */
function extractRoadmapTags(roadmapData: any, opportunity: any): string[] {
  const tags = new Set(['roadmap']);
  
  // Add opportunity-based tags
  if (opportunity.category) tags.add(opportunity.category);
  if (opportunity.provider) tags.add(opportunity.provider.toLowerCase());
  
  // Add milestone-based tags
  const text = (roadmapData.title + ' ' + roadmapData.summary).toLowerCase();
  const commonTags = ['scholarship', 'application', 'essay', 'interview', 'research'];
  
  commonTags.forEach(tag => {
    if (text.includes(tag)) tags.add(tag);
  });
  
  return Array.from(tags);
}