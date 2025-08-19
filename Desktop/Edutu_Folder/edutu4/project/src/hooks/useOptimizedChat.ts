import { useState, useCallback, useRef, useEffect } from 'react';
import { enhancedChatService, type AIResponse, type ChatMessage } from '../services/enhancedChatService';
import { robustChatService } from '../services/robustChatService';

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

interface UseOptimizedChatReturn {
  messages: Message[];
  isTyping: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
  isConnected: boolean;
  messageCount: number;
}

export const useOptimizedChat = (
  user?: { name?: string; age?: number } | null,
  initialMessage?: string
): UseOptimizedChatReturn => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const welcomeMessage: Message = {
      id: 'welcome-1',
      type: 'bot',
      content: initialMessage || `Hi ${user?.name || 'there'}! 👋 Welcome to Edutu Chat.\n\nI'm here to help you with personalized guidance and support. What would you like to explore today?`,
      timestamp: new Date(),
      buttons: [
        { text: "🎓 Find Scholarships", type: "scholarship" },
        { text: "💼 Career Guidance", type: "link", data: { url: "#career" } },
        { text: "🚀 Skill Development", type: "link", data: { url: "#skills" } },
        { text: "🎯 Set Goals", type: "link", data: { url: "#goals" } }
      ]
    };
    return [welcomeMessage];
  });
  
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const lastUserMessageRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdRef = useRef(0);

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return `msg-${Date.now()}-${messageIdRef.current}`;
  }, []);

  // Optimized message sending with abort capability
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: generateMessageId(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    lastUserMessageRef.current = content.trim();
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    // Add typing indicator with unique ID
    const typingMessage: Message = {
      id: generateMessageId(),
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Check connection status
      setIsConnected(navigator.onLine);

      // Generate AI response with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30s timeout
      });

      const responsePromise = enhancedChatService.generateResponse(
        content.trim(),
        { name: user?.name, age: user?.age }
      );

      // Use enhanced chat service for better reliability
      const aiResponse: AIResponse = await Promise.race([
        responsePromise,
        timeoutPromise
      ]);

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const botMessage: Message = {
        id: generateMessageId(),
        type: 'bot',
        content: aiResponse.content,
        timestamp: new Date(),
        buttons: aiResponse.buttons,
        ragContext: aiResponse.ragContext,
        streaming: aiResponse.streaming
      };

      // Remove typing indicator and add bot response
      setMessages(prev => prev.filter(m => !m.isTyping).concat([botMessage]));
      setError(null);
      setIsConnected(true);

    } catch (err) {
      console.error('Chat error:', err);
      
      // Handle different error types
      let errorMessage = 'Failed to send message. Please try again.';
      let isNetworkError = false;

      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your connection and try again.';
          isNetworkError = true;
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error. Please check your connection.';
          isNetworkError = true;
        }
      }

      setError(errorMessage);
      setIsConnected(!isNetworkError);

      // Remove typing indicator and add error message
      const errorBotMessage: Message = {
        id: generateMessageId(),
        type: 'bot',
        content: `⚠️ I'm having trouble connecting right now. ${errorMessage}\n\nIn the meantime, here are some things I can help you with when we reconnect:\n• Finding scholarships and opportunities\n• Career guidance and planning\n• Skill development roadmaps\n• Goal setting strategies`,
        timestamp: new Date(),
        buttons: [
          { text: "🔄 Try Again", type: "link", data: { action: "retry" } },
          { text: "🎓 Browse Opportunities", type: "scholarship" },
          { text: "🤝 Join Community", type: "community" }
        ]
      };

      setMessages(prev => prev.filter(m => !m.isTyping).concat([errorBotMessage]));
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [user, isTyping, generateMessageId]);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  // Clear chat history
  const clearChat = useCallback(() => {
    enhancedChatService.clearHistory();
    setMessages([{
      id: 'welcome-clear',
      type: 'bot',
      content: `Hi ${user?.name || 'there'}! 👋 How can I help you today?`,
      timestamp: new Date(),
      buttons: [
        { text: "🎓 Find Scholarships", type: "scholarship" },
        { text: "💼 Career Guidance", type: "link", data: { url: "#career" } },
        { text: "🚀 Skill Development", type: "link", data: { url: "#skills" } },
        { text: "🎯 Set Goals", type: "link", data: { url: "#goals" } }
      ]
    }]);
    setError(null);
    setIsTyping(false);
    lastUserMessageRef.current = '';
  }, [user?.name]);

  // Add system health monitoring
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const health = robustChatService.getStatus();
        console.log('Chat system health:', health);
        
        // Update connection status based on health
        if (!health.isWorking) {
          setIsConnected(false);
        } else {
          setIsConnected(true);
        }
      } catch (error) {
        console.warn('Health check failed:', error);
        setIsConnected(false);
      }
    };
    
    // Initial health check
    checkSystemHealth();
    
    // Periodic health checks (every 2 minutes)
    const healthInterval = setInterval(checkSystemHealth, 120000);
    
    return () => clearInterval(healthInterval);
  }, []);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isTyping,
    error,
    sendMessage,
    clearChat,
    retryLastMessage,
    isConnected,
    messageCount: messages.length
  };
};

// Hook for chat performance metrics
export const useChatMetrics = () => {
  const [metrics, setMetrics] = useState({
    avgResponseTime: 0,
    totalMessages: 0,
    errorRate: 0,
    lastResponseTime: 0
  });

  const recordResponseTime = useCallback((startTime: number) => {
    const responseTime = Date.now() - startTime;
    setMetrics(prev => ({
      ...prev,
      lastResponseTime: responseTime,
      totalMessages: prev.totalMessages + 1,
      avgResponseTime: (prev.avgResponseTime * (prev.totalMessages - 1) + responseTime) / prev.totalMessages
    }));
  }, []);

  const recordError = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      errorRate: (prev.errorRate * prev.totalMessages + 1) / (prev.totalMessages + 1)
    }));
  }, []);

  return {
    metrics,
    recordResponseTime,
    recordError
  };
};

export type { Message, UseOptimizedChatReturn };