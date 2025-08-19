import React, { useState, useEffect } from 'react';
import { MessageCircle, Brain, X, Sparkles, Zap, Send } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import Button from './ui/Button';

interface ChatFABProps {
  onChatClick?: () => void;
  className?: string;
}

const ChatFAB: React.FC<ChatFABProps> = ({
  onChatClick,
  className = ''
}) => {
  const { isDarkMode } = useDarkMode();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewSuggestions, setHasNewSuggestions] = useState(true);

  // Sample AI suggestions
  const quickSuggestions = [
    "Find scholarships for computer science",
    "What opportunities match my profile?",
    "Help me build a roadmap",
    "Show me deadlines this month"
  ];

  const handleMainClick = () => {
    if (onChatClick) {
      onChatClick();
    } else {
      setShowQuickChat(!showQuickChat);
    }
  };

  const handleQuickSend = () => {
    if (!quickMessage.trim()) return;
    
    setIsTyping(true);
    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setQuickMessage('');
      setShowQuickChat(false);
      // Here you would typically handle the actual message
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuickMessage(suggestion);
  };

  // Auto-hide suggestions after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasNewSuggestions(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Quick Chat Modal */}
      {showQuickChat && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 flex items-end justify-end p-4">
          <div 
            className={`w-80 max-w-full rounded-2xl shadow-2xl border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            } animate-slide-up mb-20 mr-4`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    AI Assistant
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Ask me anything about opportunities
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickChat(false)}
                className={`p-1 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="p-4 space-y-3">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Quick actions:
              </p>
              <div className="space-y-2">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left p-3 rounded-xl text-sm border transition-all hover:scale-105 ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {suggestion}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  placeholder="Ask me anything..."
                  onKeyPress={(e) => e.key === 'Enter' && handleQuickSend()}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                  disabled={isTyping}
                />
                <Button
                  size="sm"
                  onClick={handleQuickSend}
                  disabled={!quickMessage.trim() || isTyping}
                  className="px-3"
                >
                  {isTyping ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {isTyping && (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  AI is thinking...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {/* Quick Actions (when expanded) */}
        {isExpanded && (
          <div className="mb-4 space-y-3 animate-fade-in">
            <button
              onClick={() => {/* Handle roadmap click */}}
              className={`flex items-center gap-3 p-3 rounded-2xl shadow-lg border transition-all hover:scale-105 ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium whitespace-nowrap">Get Roadmap</span>
            </button>
            
            <button
              onClick={() => {/* Handle opportunities click */}}
              className={`flex items-center gap-3 p-3 rounded-2xl shadow-lg border transition-all hover:scale-105 ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium whitespace-nowrap">Find Opportunities</span>
            </button>
          </div>
        )}

        {/* Main FAB */}
        <div className="relative">
          {/* Notification Dot */}
          {hasNewSuggestions && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse z-10" />
          )}
          
          {/* Main Button */}
          <button
            onClick={handleMainClick}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => setIsExpanded(false)}
            className="group relative p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus:scale-110"
            aria-label="Open AI Assistant Chat"
            aria-expanded={showQuickChat}
            aria-describedby={hasNewSuggestions ? "fab-notification" : undefined}
          >
            <div className="relative">
              <MessageCircle className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
              
              {/* Animated Background */}
              <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Ripple Effect */}
              <div className="absolute inset-0 rounded-xl bg-white/10 scale-0 group-active:scale-100 transition-transform duration-200" />
            </div>
          </button>

          {/* Tooltip */}
          {isExpanded && (
            <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap animate-fade-in">
              Chat with Edutu AI
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 dark:border-l-gray-700 border-y-4 border-y-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Add custom animations to global CSS if not already present */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ChatFAB;