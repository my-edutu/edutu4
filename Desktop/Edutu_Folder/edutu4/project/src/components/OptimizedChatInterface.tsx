import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  ExternalLink, 
  Users, 
  MessageSquare, 
  Sparkles, 
  Brain, 
  Mic, 
  MicOff, 
  Paperclip, 
  MoreHorizontal, 
  ArrowLeft,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import Button from './ui/Button';
import { useDarkMode } from '../hooks/useDarkMode';
import { useOptimizedChat, type Message } from '../hooks/useOptimizedChat';
import { usePerformanceTracking } from '../services/performanceService';
import { webSocketService } from '../services/websocketService';
import { LoadingSpinner, ErrorState } from './ui/LoadingStates';
import ErrorBoundary from './ui/ErrorBoundary';

interface ChatInterfaceProps {
  user: { name: string; age: number } | null;
  onBack?: () => void;
}

// Memoized message component for better performance
const ChatMessage = memo(({ 
  message, 
  isUser, 
  onButtonClick 
}: { 
  message: Message; 
  isUser: boolean; 
  onButtonClick: (button: any) => void;
}) => {
  const messageRef = useRef<HTMLDivElement>(null);
  
  // Intersection observer for lazy loading animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={messageRef}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6`}
      role={!isUser ? 'article' : undefined}
      aria-label={!isUser ? 'AI response' : 'Your message'}
    >
      <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
          isUser 
            ? 'bg-gray-200 dark:bg-gray-700' 
            : 'bg-gradient-to-br from-primary to-accent'
        }`}>
          {isUser ? (
            <User size={16} className="sm:w-[18px] sm:h-[18px] text-gray-600 dark:text-gray-300" />
          ) : (
            <Bot size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`px-3 sm:px-4 lg:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-sm transition-all ${
            isUser 
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
                <span className="text-sm text-secondary">Edutu is thinking...</span>
              </div>
            ) : (
              <div className="text-sm sm:text-base leading-relaxed">
                <p className="whitespace-pre-line">{message.content}</p>
                
                {/* RAG Context Indicator */}
                {!isUser && message.ragContext?.contextUsed && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">Enhanced with:</span>
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
                
                {/* Streaming indicator */}
                {!isUser && message.streaming && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
                    <Zap size={12} className="animate-pulse" />
                    <span>Real-time response</span>
                  </div>
                )}
                
                {/* AI Attribution */}
                {!isUser && !message.isTyping && (
                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1 text-xs text-secondary opacity-70">
                      <Sparkles size={12} />
                      <span>Powered by Edutu AI</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {message.buttons && message.buttons.length > 0 && !message.isTyping && (
            <div className="mt-3 sm:mt-4 flex flex-wrap gap-2" role="group" aria-label="Message actions">
              {message.buttons.map((button, buttonIndex) => (
                <button
                  key={buttonIndex}
                  onClick={() => onButtonClick(button)}
                  className={`btn-touch inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all hover:scale-105 shadow-sm ${
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
  );
});

ChatMessage.displayName = 'ChatMessage';

const OptimizedChatInterface: React.FC<ChatInterfaceProps> = ({ user, onBack }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDarkMode } = useDarkMode();
  const { startTracking } = usePerformanceTracking('OptimizedChatInterface');

  // Use the optimized chat hook
  const {
    messages,
    isTyping,
    error,
    sendMessage,
    clearChat,
    retryLastMessage,
    isConnected,
    messageCount
  } = useOptimizedChat(user);

  // WebSocket connection status
  useEffect(() => {
    const unsubscribe = webSocketService.onConnection(setWsConnected);
    return unsubscribe;
  }, []);

  // Auto-scroll to bottom with performance optimization
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  useEffect(() => {
    // Debounce scroll to prevent excessive calls
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Handle message sending with performance tracking
  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const endTracking = startTracking();
    
    try {
      await sendMessage(input.trim());
      setInput('');
      inputRef.current?.focus();
    } finally {
      endTracking();
    }
  }, [input, isTyping, sendMessage, startTracking]);

  // Handle button clicks
  const handleButtonClick = useCallback((button: any) => {
    // Implementation would depend on button type
    switch (button.type) {
      case 'scholarship':
        // Navigate to scholarships or trigger search
        break;
      case 'community':
        // Navigate to community
        break;
      case 'expert':
        // Start expert chat or navigation
        break;
      case 'link':
        if (button.data?.action === 'retry') {
          retryLastMessage();
        }
        break;
    }
  }, [retryLastMessage]);

  // Handle voice recording
  const toggleRecording = useCallback(() => {
    setIsRecording(!isRecording);
    // Voice recording implementation would go here
  }, [isRecording]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement === inputRef.current) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === 'Escape') {
        setInput('');
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSend]);

  // Memoized connection status indicator
  const connectionStatus = useMemo(() => (
    <div className="flex items-center gap-2 text-xs text-secondary">
      {isConnected ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Online</span>
          {wsConnected && <Zap size={12} className="text-blue-500" title="Real-time connection active" />}
        </>
      ) : (
        <>
          <WifiOff size={12} className="text-red-500" />
          <span>Offline</span>
        </>
      )}
      <span className="opacity-50">• {messageCount} messages</span>
    </div>
  ), [isConnected, wsConnected, messageCount]);

  return (
    <div className={`flex flex-col h-screen max-h-screen surface-bg ${isDarkMode ? 'dark' : ''}`}>
      {/* Enhanced Header */}
      <header className="sticky top-0 z-20 background-bg shadow-sm safe-area-top border-b border-gray-200 dark:border-gray-700" role="banner">
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
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} aria-hidden="true"></div>
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
                {connectionStatus}
              </div>
            </div>
            
            {/* Menu Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={clearChat}
                className="btn-touch p-2 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Clear chat"
                title="Clear chat history"
              >
                <MoreHorizontal size={18} className="sm:w-5 sm:h-5 text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <main className="flex-1 overflow-y-auto safe-area-x px-3 sm:px-4 py-4 sm:py-6 pb-32" role="main">
        {error && (
          <div className="mb-4">
            <ErrorState
              title="Connection Error"
              message={error}
              onRetry={retryLastMessage}
              type="network"
            />
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isUser={message.type === 'user'}
            onButtonClick={handleButtonClick}
          />
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
              disabled // Feature not implemented yet
            >
              <Paperclip size={18} className="sm:w-5 sm:h-5" />
            </button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about scholarships, career guidance, skills, or goal setting..."
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-600 background-bg text-primary placeholder-secondary text-sm sm:text-base focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm disabled:opacity-50"
                aria-label="Type your message"
                disabled={isTyping}
                maxLength={1000}
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
              disabled // Feature not implemented yet
            >
              {isRecording ? <MicOff size={18} className="sm:w-5 sm:h-5" /> : <Mic size={18} className="sm:w-5 sm:h-5" />}
            </button>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="btn-touch p-2.5 sm:p-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Send message"
            >
              {isTyping ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send size={18} className="sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>

          {/* Voice Recording Indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 mt-3 text-red-500 animate-pulse" role="status" aria-live="polite">
              <div className="w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></div>
              <span className="text-xs sm:text-sm font-medium">Recording... Tap to stop</span>
            </div>
          )}
          
          {/* Character count for long messages */}
          {input.length > 800 && (
            <div className="text-xs text-secondary text-center mt-2">
              {input.length}/1000 characters
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

// Wrap with ErrorBoundary for production resilience
const OptimizedChatInterfaceWithErrorBoundary: React.FC<ChatInterfaceProps> = (props) => (
  <ErrorBoundary>
    <OptimizedChatInterface {...props} />
  </ErrorBoundary>
);

export default OptimizedChatInterfaceWithErrorBoundary;