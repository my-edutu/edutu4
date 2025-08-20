import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, ExternalLink, Users, MessageSquare, Sparkles, Zap, Brain, Mic, MicOff, Paperclip, MoreHorizontal, ArrowLeft } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { aiChatService } from '../services/aiChatService';
import { enhancedChatService } from '../services/enhancedChatService';
import { robustChatService } from '../services/robustChatService';
import { LoadingSpinner, ChatMessageSkeleton, ErrorState } from './ui/LoadingStates';
import ErrorBoundary from './ui/ErrorBoundary';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  buttons?: Array<{
    text: string;
    type: 'scholarship' | 'community' | 'expert' | 'link';
    data?: any;
  }>;
  isTyping?: boolean;
  ragContext?: {
    scholarships: any[];
    userProfile: any;
    recentConversations: any[];
    contextUsed: boolean;
  };
  streaming?: boolean;
}

interface ChatInterfaceProps {
  user: { name: string; age: number } | null;
  onBack?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `Hi ${user?.name || 'there'}! 👋 Welcome to Edutu Chat.\n\nI'm here to help you with personalized guidance and support. What would you like to explore today?`,
      timestamp: new Date(),
      buttons: [
        { text: "🎓 Find Scholarships", type: "scholarship" },
        { text: "💼 Career Guidance", type: "link", data: { url: "#career" } },
        { text: "🚀 Skill Development", type: "link", data: { url: "#skills" } },
        { text: "🎯 Set Goals", type: "link", data: { url: "#goals" } }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [responseSource, setResponseSource] = useState<'api' | 'fallback' | 'enhanced_local'>('api');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useDarkMode();

  // Monitor connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Test connection by making a simple request
        setConnectionStatus('connecting');
        const response = await fetch('/health');
        setConnectionStatus(response.ok ? 'connected' : 'disconnected');
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const quickPrompts = [
    { text: "Help me find the best scholarships for my field", icon: "🎓" },
    { text: "What career should I pursue in tech?", icon: "💻" },
    { text: "Create a skill development roadmap for me", icon: "🚀" },
    { text: "How can I build a professional network?", icon: "🤝" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    
    setMessages(prev => [...prev, typingMessage]);

    try {
      setChatError(null); // Clear any previous errors
      setConnectionStatus('connecting');
      
      // Use robust AI service for response - always works
      const aiResponse = await robustChatService.generateResponse(
        currentInput, 
        { name: user?.name, age: user?.age }
      );
      
      // Track response source for debugging
      setResponseSource(aiResponse.source);
      
      const botMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        content: aiResponse.content,
        timestamp: new Date(),
        buttons: aiResponse.buttons,
        ragContext: aiResponse.ragContext,
        streaming: aiResponse.streaming,
        source: aiResponse.source
      };
      
      setMessages(prev => prev.filter(m => !m.isTyping).concat([botMessage]));
      setRetryCount(0); // Reset retry count on success
      setConnectionStatus(aiResponse.source === 'api' ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('AI Chat Error:', error);
      
      // Show error to user and provide fallback
      setChatError(error instanceof Error ? error.message : 'Failed to get AI response');
      setRetryCount(prev => prev + 1);
      
      // Use robust fallback - guaranteed to work
      const fallbackResponse = await robustChatService.generateResponse(
        currentInput,
        { name: user?.name, age: user?.age }
      );
      
      const botMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        content: fallbackResponse.source === 'fallback' ? 
          `⚠️ I'm experiencing some connectivity issues, but I can still help!\n\n${fallbackResponse.content}` :
          fallbackResponse.content,
        timestamp: new Date(),
        buttons: fallbackResponse.buttons,
        ragContext: fallbackResponse.ragContext,
        source: fallbackResponse.source
      };
      
      setMessages(prev => prev.filter(m => !m.isTyping).concat([botMessage]));
      setConnectionStatus('disconnected');
    } finally {
      setIsTyping(false);
    }
  };

  const generateBotResponse = (userInput: string): { content: string; buttons?: Array<{ text: string; type: 'scholarship' | 'community' | 'expert' | 'link'; data?: any }> } => {
    const input = userInput.toLowerCase();
    
    if (input.includes('scholarship')) {
      return {
        content: "🎓 Excellent! I've found some amazing scholarship opportunities that match your profile:\n\n• **Mastercard Foundation Scholars Program** - Full funding for African students with leadership potential\n• **AAUW International Fellowships** - Supporting women in graduate studies worldwide\n• **Mandela Rhodes Scholarships** - Comprehensive leadership development in Africa\n• **Local university merit scholarships** - Institution-specific opportunities\n\nI can help you create a personalized application strategy. What type of scholarship interests you most?",
        buttons: [
          { text: "🎯 View Mastercard Foundation", type: "scholarship", data: { id: "1", title: "Mastercard Foundation Scholars Program" } },
          { text: "👩‍🎓 AAUW Fellowship Details", type: "scholarship", data: { id: "2", title: "AAUW International Fellowships" } },
          { text: "🤝 Join Scholarship Community", type: "community" },
          { text: "💬 Talk to Expert", type: "expert" }
        ]
      };
    }
    
    if (input.includes('career')) {
      return {
        content: "🚀 Let's explore your career path! Based on current trends in Africa and global opportunities, here are some high-growth fields:\n\n• **Technology & Software Development** - High demand, remote-friendly, excellent growth\n• **Digital Marketing & E-commerce** - Booming with Africa's digital transformation\n• **Renewable Energy & Sustainability** - Critical for Africa's future development\n• **Healthcare & Telemedicine** - Essential services with growing demand\n• **Financial Technology (FinTech)** - Revolutionary banking and payment solutions\n\nWhich field sparks your interest? I can create a detailed roadmap for you!",
        buttons: [
          { text: "💻 Tech Career Path", type: "link", data: { url: "#tech-career" } },
          { text: "🌱 Sustainability Careers", type: "link", data: { url: "#sustainability" } },
          { text: "🏥 Healthcare Opportunities", type: "link", data: { url: "#healthcare" } },
          { text: "🤝 Join Career Community", type: "community" }
        ]
      };
    }
    
    if (input.includes('skill')) {
      return {
        content: "💪 Building the right skills is your gateway to success! Here are the most in-demand skills for young African professionals:\n\n• **Digital & Technical Skills** - Python, JavaScript, data analysis, AI/ML basics\n• **Communication & Leadership** - Public speaking, writing, team management\n• **Critical Thinking & Problem-Solving** - Analytical thinking, creative solutions\n• **Project Management** - Agile methodologies, organization, planning\n• **Languages & Cultural Intelligence** - English, French, local languages, global awareness\n\nWhich skill area would you like to focus on first? I'll create a learning plan for you!",
        buttons: [
          { text: "🐍 Start Python Journey", type: "link", data: { url: "#python-path" } },
          { text: "🗣️ Communication Skills", type: "link", data: { url: "#communication" } },
          { text: "📊 Data Analysis Track", type: "link", data: { url: "#data-analysis" } },
          { text: "🎯 Talk to Skills Expert", type: "expert" }
        ]
      };
    }
    
    return {
      content: `That's a fantastic question, ${user?.name}! 🌟 I'm here to be your personal opportunity coach and help you navigate your journey to success. Whether you're looking for:\n\n✨ **Educational opportunities** - Scholarships, courses, certifications\n🚀 **Career development** - Job opportunities, skill building, networking\n🎯 **Personal growth** - Goal setting, mentorship, community building\n\nI can provide personalized guidance, create roadmaps, and connect you with the right resources. What specific area would you like to explore together?`,
      buttons: [
        { text: "🎓 Find Opportunities", type: "link", data: { url: "#opportunities" } },
        { text: "🤝 Join Community", type: "community" },
        { text: "💬 Talk to Expert", type: "expert" },
        { text: "🎯 Set Goals", type: "link", data: { url: "#goals" } }
      ]
    };
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleButtonClick = (button: { text: string; type: 'scholarship' | 'community' | 'expert' | 'link'; data?: any }) => {
    switch (button.type) {
      case 'scholarship':
        break;
      case 'community':
        break;
      case 'expert':
        break;
      case 'link':
        break;
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Implement voice recording logic here
  };

  return (
    <div className={`flex flex-col h-screen max-h-screen surface-bg ${isDarkMode ? 'dark' : ''}`}>
      {/* Enhanced Header */}
      <header className="sticky top-0 z-20 background-bg shadow-sm safe-area-top" role="banner">
        <div className="safe-area-x px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Back Button */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="btn-touch p-2 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-secondary transition-colors flex-shrink-0"
                  aria-label="Go back to dashboard"
                >
                  <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}
              
              {/* AI Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-accent rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                  <Bot size={20} className="sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" aria-hidden="true"></div>
              </div>
              
              {/* Title and Status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 sm:gap-2 mb-0.5">
                  <h1 className="text-base sm:text-lg font-semibold text-primary truncate">
                    Edutu AI Coach
                  </h1>
                  <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
                    <Brain size={14} className="text-primary animate-pulse" />
                    <Sparkles size={12} className="text-accent animate-ping" />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm text-secondary">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-spin' :
                    'bg-red-500'
                  }`} aria-hidden="true"></div>
                  <span className="truncate">
                    <span className="font-medium">
                      {connectionStatus === 'connected' ? 'Online' :
                       connectionStatus === 'connecting' ? 'Connecting...' :
                       'Reconnecting...'}
                    </span>
                    <span className="hidden sm:inline"> • AI-Powered Guidance</span>
                    {responseSource !== 'api' && (
                      <span className="hidden sm:inline text-xs opacity-70"> ({responseSource})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Menu Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                className="btn-touch p-2 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal size={18} className="sm:w-5 sm:h-5 text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <main className="flex-1 overflow-y-auto safe-area-x px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-32" role="main">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            style={{ animationDelay: `${index * 100}ms` }}
            role={message.type === 'bot' ? 'article' : undefined}
            aria-label={message.type === 'bot' ? 'AI response' : 'Your message'}
          >
            <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                message.type === 'user' 
                  ? 'bg-gray-200 dark:bg-gray-700' 
                  : 'bg-gradient-to-br from-primary to-accent'
              }`}>
                {message.type === 'user' ? (
                  <User size={16} className="sm:w-[18px] sm:h-[18px] text-gray-600 dark:text-gray-300" />
                ) : (
                  <Bot size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`px-3 sm:px-4 lg:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-sm transition-all ${
                  message.type === 'user' 
                    ? 'bg-primary text-white rounded-br-md' 
                    : 'background-bg border border-gray-200 dark:border-gray-700 text-primary rounded-bl-md'
                }`}>
                  {message.isTyping ? (
                    <div className="flex items-center gap-2" role="status" aria-label="AI is typing">
                      <div className="flex gap-1" aria-hidden="true">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-secondary">Edutu is analyzing opportunities...</span>
                    </div>
                  ) : (
                    <div className="text-sm sm:text-base leading-relaxed">
                      <p className="whitespace-pre-line">{message.content}</p>
                      
                      {/* RAG Context Indicator */}
                      {message.type === 'bot' && message.ragContext?.contextUsed && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium">Context Used:</span>
                            </div>
                            {message.ragContext.scholarships.length > 0 && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
                                {message.ragContext.scholarships.length} scholarships
                              </span>
                            )}
                            {message.ragContext.userProfile && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                Profile data
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* AI Attribution with streaming indicator */}
                      {message.type === 'bot' && !message.isTyping && (
                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-1 text-xs text-secondary opacity-70">
                            <Sparkles size={12} className={message.streaming ? 'animate-pulse text-blue-500' : ''} />
                            <span>Powered by Edutu AI</span>
                            {message.streaming && (
                              <div className="flex items-center gap-1 ml-2">
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                {message.buttons && message.buttons.length > 0 && !message.isTyping && (
                  <div className="mt-3 sm:mt-4 space-y-2" role="group" aria-label="Message actions">
                    {message.buttons.map((button, buttonIndex) => (
                      <button
                        key={buttonIndex}
                        onClick={() => handleButtonClick(button)}
                        className={`btn-touch inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all hover:scale-105 mr-2 mb-2 shadow-sm ${
                          button.type === 'scholarship' 
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
                            : button.type === 'community'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800'
                            : button.type === 'expert'
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                        }`}
                        aria-label={`${button.text} action`}
                      >
                        {button.type === 'scholarship' && <ExternalLink size={14} />}
                        {button.type === 'community' && <Users size={14} />}
                        {button.type === 'expert' && <MessageSquare size={14} />}
                        {button.type === 'link' && <ExternalLink size={14} />}
                        {button.text}
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-secondary mt-2 opacity-70">
                  <time dateTime={message.timestamp.toISOString()}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              </div>
            </div>
          </div>
        ))}


        <div ref={messagesEndRef} aria-hidden="true" />
      </main>

      {/* Enhanced Input Area */}
      <footer className="fixed bottom-0 left-0 right-0 background-bg border-t border-gray-200 dark:border-gray-700 shadow-lg safe-area-bottom" role="contentinfo">
        <div className="safe-area-x px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
            {/* Attachment Button */}
            <button 
              className="btn-touch p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-secondary transition-colors flex-shrink-0"
              aria-label="Attach file"
            >
              <Paperclip size={18} className="sm:w-5 sm:h-5" />
            </button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me anything about scholarships, career guidance, skills, or goal setting..."
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-600 background-bg text-primary placeholder-secondary text-sm sm:text-base focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                aria-label="Type your message"
                disabled={isTyping}
              />
              {input && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Voice Button */}
            <button 
              onClick={toggleRecording}
              className={`btn-touch p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all flex-shrink-0 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-secondary'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
              aria-pressed={isRecording}
            >
              {isRecording ? <MicOff size={18} className="sm:w-5 sm:h-5" /> : <Mic size={18} className="sm:w-5 sm:h-5" />}
            </button>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="btn-touch p-2.5 sm:p-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Send message"
              icon={Send}
            >
              Send
            </Button>
          </div>

          {/* Voice Recording Indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 mt-3 text-red-500 animate-pulse" role="status" aria-live="polite">
              <div className="w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></div>
              <span className="text-xs sm:text-sm font-medium">Recording... Tap to stop</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

// Wrap with ErrorBoundary for production resilience
const ChatInterfaceWithErrorBoundary: React.FC<ChatInterfaceProps> = (props) => (
  <ErrorBoundary>
    <ChatInterface {...props} />
  </ErrorBoundary>
);

export default ChatInterfaceWithErrorBoundary;