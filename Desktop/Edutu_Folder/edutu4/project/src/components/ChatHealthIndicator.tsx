import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { robustChatService } from '../services/robustChatService';

interface HealthStatus {
  chatWorking: boolean;
  backendsAvailable: number;
  llmProvidersAvailable: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ChatHealthIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const ChatHealthIndicator: React.FC<ChatHealthIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      // Simple health check using the robust chat service
      const status = robustChatService.getStatus();
      const healthStatus = {
        chatWorking: status.isWorking,
        backendsAvailable: status.isWorking ? 1 : 0,
        llmProvidersAvailable: status.isWorking ? 1 : 0,
        overallHealth: status.isWorking ? 'good' : 'poor' as 'excellent' | 'good' | 'fair' | 'poor'
      };
      setHealth(healthStatus);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({
        chatWorking: false,
        backendsAvailable: 0,
        llmProvidersAvailable: 0,
        overallHealth: 'poor'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial health check
    checkHealth();
    
    // Periodic health checks (every 60 seconds)
    const interval = setInterval(checkHealth, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = () => {
    if (isChecking) {
      return <Clock size={16} className="animate-spin text-blue-500" />;
    }

    if (!health) {
      return <AlertTriangle size={16} className="text-gray-400" />;
    }

    switch (health.overallHealth) {
      case 'excellent':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'good':
        return <Wifi size={16} className="text-blue-500" />;
      case 'fair':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'poor':
        return <WifiOff size={16} className="text-red-500" />;
      default:
        return <AlertTriangle size={16} className="text-gray-400" />;
    }
  };

  const getHealthColor = () => {
    if (!health) return 'text-gray-400';
    
    switch (health.overallHealth) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getHealthLabel = () => {
    if (isChecking) return 'Checking...';
    if (!health) return 'Unknown';
    
    return health.overallHealth.charAt(0).toUpperCase() + health.overallHealth.slice(1);
  };

  if (!showDetails && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
        title="Click to view chat system health details"
      >
        {getHealthIcon()}
        <span className={`text-xs ${getHealthColor()}`}>
          {getHealthLabel()}
        </span>
      </button>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getHealthIcon()}
          <span className={`text-sm font-medium ${getHealthColor()}`}>
            Chat System: {getHealthLabel()}
          </span>
        </div>
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {health && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              {health.chatWorking ? (
                <CheckCircle size={12} className="text-green-500" />
              ) : (
                <WifiOff size={12} className="text-red-500" />
              )}
              <span className={health.chatWorking ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                Chat: {health.chatWorking ? 'Working' : 'Failed'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                health.backendsAvailable > 0 ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-600 dark:text-gray-400">
                Backends: {health.backendsAvailable}
              </span>
            </div>

            <div className="flex items-center gap-1 col-span-2">
              <div className={`w-2 h-2 rounded-full ${
                health.llmProvidersAvailable > 0 ? 'bg-blue-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-600 dark:text-gray-400">
                AI Providers: {health.llmProvidersAvailable}
              </span>
            </div>
          </div>

          {lastChecked && (
            <div className="text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-2">
              Last checked: {lastChecked.toLocaleTimeString()}
            </div>
          )}

          {health.overallHealth === 'poor' && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              ⚠️ Chat system issues detected. Some features may not work properly.
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={checkHealth}
              disabled={isChecking}
              className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : 'Recheck'}
            </button>
            
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={async () => {
                  console.log('Running full chat system test...');
                  const results = await chatSystemTester.runAllTests();
                  console.log('Test results:', results);
                }}
                className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Full Test
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHealthIndicator;