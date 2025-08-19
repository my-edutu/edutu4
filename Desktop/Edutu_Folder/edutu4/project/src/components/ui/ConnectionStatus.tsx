import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { webSocketService } from '../../services/websocketService';
import { performanceService } from '../../services/performanceService';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

interface ConnectionMetrics {
  latency: number;
  uptime: number;
  reconnectCount: number;
  lastError?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '', 
  showDetails = false,
  compact = false 
}) => {
  const [online, setOnline] = useState(navigator.onLine);
  const [wsConnected, setWsConnected] = useState(false);
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    latency: 0,
    uptime: 0,
    reconnectCount: 0
  });
  const [showTooltip, setShowTooltip] = useState(false);

  // Monitor browser online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor WebSocket connection
  useEffect(() => {
    const unsubscribe = webSocketService.onConnection((connected) => {
      setWsConnected(connected);
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        reconnectCount: webSocketService.reconnectCount,
        uptime: connected ? Date.now() : prev.uptime
      }));
    });

    // Initial state
    setWsConnected(webSocketService.isConnected);

    return unsubscribe;
  }, []);

  // Ping test for latency measurement
  useEffect(() => {
    if (!online || !wsConnected) return;

    const measureLatency = async () => {
      const start = performance.now();
      
      try {
        // Send ping and measure response time
        const success = webSocketService.send({
          type: 'system',
          payload: { action: 'ping' },
          timestamp: Date.now()
        });

        if (success) {
          // Simulate response time measurement
          // In a real implementation, you'd wait for the pong response
          const latency = performance.now() - start;
          setMetrics(prev => ({ ...prev, latency }));
        }
      } catch (error) {
        setMetrics(prev => ({ 
          ...prev, 
          lastError: error instanceof Error ? error.message : 'Unknown error' 
        }));
      }
    };

    const interval = setInterval(measureLatency, 10000); // Every 10 seconds
    measureLatency(); // Initial measurement

    return () => clearInterval(interval);
  }, [online, wsConnected]);

  const getConnectionStatus = () => {
    if (!online) {
      return {
        status: 'offline',
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        label: 'Offline',
        description: 'No internet connection'
      };
    }

    if (!wsConnected) {
      return {
        status: 'degraded',
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        label: 'Limited',
        description: 'Basic functionality only'
      };
    }

    if (metrics.latency > 1000) {
      return {
        status: 'slow',
        icon: Wifi,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        label: 'Slow',
        description: 'High latency detected'
      };
    }

    return {
      status: 'optimal',
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      label: 'Optimal',
      description: 'Real-time connection active'
    };
  };

  const connectionInfo = getConnectionStatus();
  const Icon = connectionInfo.icon;

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="relative">
          <Icon size={16} className={connectionInfo.color} />
          {wsConnected && connectionInfo.status === 'optimal' && (
            <Zap size={10} className="absolute -top-1 -right-1 text-blue-500 animate-pulse" />
          )}
          
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
              <div className="font-medium">{connectionInfo.label}</div>
              <div className="opacity-75">{connectionInfo.description}</div>
              {showDetails && (
                <>
                  <div className="mt-1 pt-1 border-t border-gray-700 dark:border-gray-300">
                    <div>Latency: {metrics.latency.toFixed(0)}ms</div>
                    {metrics.reconnectCount > 0 && (
                      <div>Reconnects: {metrics.reconnectCount}</div>
                    )}
                  </div>
                </>
              )}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
            </div>
          )}
        </div>
        
        <span className={`text-xs font-medium ${connectionInfo.color}`}>
          {connectionInfo.label}
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 px-3 py-2 rounded-lg border ${connectionInfo.bgColor} ${connectionInfo.borderColor} ${className}`}>
      <div className="flex items-center gap-2">
        <Icon size={18} className={connectionInfo.color} />
        {wsConnected && connectionInfo.status === 'optimal' && (
          <Zap size={14} className="text-blue-500 animate-pulse" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${connectionInfo.color}`}>
          {connectionInfo.label}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {connectionInfo.description}
        </div>
      </div>

      {showDetails && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
          <div>
            {metrics.latency > 0 ? `${metrics.latency.toFixed(0)}ms` : '--'}
          </div>
          {metrics.reconnectCount > 0 && (
            <div className="text-yellow-600 dark:text-yellow-400">
              {metrics.reconnectCount} reconnects
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Hook for getting connection status programmatically
export const useConnectionStatus = () => {
  const [status, setStatus] = useState({
    online: navigator.onLine,
    wsConnected: webSocketService.isConnected,
    latency: 0,
    quality: 'unknown' as 'optimal' | 'good' | 'poor' | 'offline' | 'unknown'
  });

  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      const wsConnected = webSocketService.isConnected;
      
      let quality: typeof status.quality = 'unknown';
      
      if (!online) {
        quality = 'offline';
      } else if (!wsConnected) {
        quality = 'poor';
      } else if (status.latency < 500) {
        quality = 'optimal';
      } else if (status.latency < 1000) {
        quality = 'good';
      } else {
        quality = 'poor';
      }

      setStatus(prev => ({
        ...prev,
        online,
        wsConnected,
        quality
      }));
    };

    // Initial update
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for WebSocket connection changes
    const unsubscribeWs = webSocketService.onConnection(() => updateStatus());

    // Periodic latency measurement
    const measureLatency = async () => {
      if (webSocketService.isConnected) {
        const start = performance.now();
        const success = webSocketService.send({
          type: 'system',
          payload: { action: 'ping' },
          timestamp: Date.now()
        });
        
        if (success) {
          const latency = performance.now() - start;
          setStatus(prev => ({ ...prev, latency }));
        }
      }
    };

    const latencyInterval = setInterval(measureLatency, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeWs();
      clearInterval(latencyInterval);
    };
  }, [status.latency]);

  return status;
};

export default ConnectionStatus;