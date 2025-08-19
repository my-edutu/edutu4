import React, { useState, useEffect } from 'react';
import { Activity, Zap, Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { performanceService, type ChatMetrics } from '../services/performanceService';
import { webSocketService } from '../services/websocketService';
import ConnectionStatus from './ui/ConnectionStatus';
import Card from './ui/Card';

interface PerformanceDashboardProps {
  className?: string;
  isVisible?: boolean;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  className = '',
  isVisible = false 
}) => {
  const [report, setReport] = useState<any>(null);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [bundleAnalysis, setBundleAnalysis] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update performance data periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateData = () => {
      const newReport = performanceService.generateReport();
      const memory = performanceService.getMemoryUsage();
      
      setReport(newReport);
      setMemoryUsage(memory);
    };

    // Initial update
    updateData();

    // Update every 5 seconds when visible
    const interval = setInterval(updateData, 5000);

    // Get bundle analysis (once)
    performanceService.analyzeBundleSize().then(setBundleAnalysis);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible || !report) {
    return null;
  }

  const { coreWebVitals, chatMetrics, componentMetrics, recommendations } = report;

  const getVitalStatus = (value: number | null, good: number, needs: number) => {
    if (value === null) return { status: 'unknown', color: 'text-gray-500', icon: Clock };
    if (value <= good) return { status: 'good', color: 'text-green-500', icon: CheckCircle };
    if (value <= needs) return { status: 'needs-improvement', color: 'text-yellow-500', icon: AlertTriangle };
    return { status: 'poor', color: 'text-red-500', icon: AlertTriangle };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMs = (ms: number | null) => {
    if (ms === null) return '--';
    return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-105"
        title="Toggle Performance Dashboard"
      >
        <Activity size={20} />
      </button>

      {/* Dashboard Panel */}
      {isExpanded && (
        <div className="w-96 max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance Monitor
              </h3>
              <ConnectionStatus compact showDetails />
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Core Web Vitals */}
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Zap size={16} />
                Core Web Vitals
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { key: 'fcp', label: 'FCP', value: coreWebVitals.fcp, good: 1800, needs: 3000 },
                  { key: 'lcp', label: 'LCP', value: coreWebVitals.lcp, good: 2500, needs: 4000 },
                  { key: 'fid', label: 'FID', value: coreWebVitals.fid, good: 100, needs: 300 },
                  { key: 'cls', label: 'CLS', value: coreWebVitals.cls, good: 0.1, needs: 0.25 }
                ].map(vital => {
                  const status = getVitalStatus(vital.value, vital.good, vital.needs);
                  const Icon = status.icon;
                  
                  return (
                    <div key={vital.key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Icon size={12} className={status.color} />
                        <span className="font-medium">{vital.label}</span>
                      </div>
                      <span className={`font-mono ${status.color}`}>
                        {vital.key === 'cls' ? 
                          (vital.value?.toFixed(3) || '--') : 
                          formatMs(vital.value)
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Chat Performance */}
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Chat Performance
              </h4>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Avg Response Time</span>
                  <span className={`font-mono ${chatMetrics.avgResponseTime > 3000 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatMs(chatMetrics.avgResponseTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Messages Sent</span>
                  <span className="font-mono">{chatMetrics.messagesSent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span className={`font-mono ${
                    (chatMetrics.errorsCount / Math.max(chatMetrics.messagesSent, 1)) > 0.1 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {((chatMetrics.errorsCount / Math.max(chatMetrics.messagesSent, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>RAG Usage</span>
                  <span className="font-mono">{chatMetrics.ragContextUsage}</span>
                </div>
                {chatMetrics.streamingLatency > 0 && (
                  <div className="flex justify-between">
                    <span>Streaming Latency</span>
                    <span className="font-mono">{formatMs(chatMetrics.streamingLatency)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Memory Usage */}
            {memoryUsage && (
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Memory Usage
                </h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Used</span>
                    <span className="font-mono">{formatBytes(memoryUsage.used)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        memoryUsage.usagePercentage > 80 ? 'bg-red-500' : 
                        memoryUsage.usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(memoryUsage.usagePercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>{memoryUsage.usagePercentage.toFixed(1)}% used</span>
                    <span>{formatBytes(memoryUsage.total)} total</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Bundle Analysis */}
            {bundleAnalysis && (
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Bundle Size
                </h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-medium">
                    <span>Total Size</span>
                    <span className="font-mono">{formatBytes(bundleAnalysis.totalSize)}</span>
                  </div>
                  
                  {bundleAnalysis.chunks.slice(0, 3).map((chunk: any, index: number) => (
                    <div key={index} className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span className="truncate">{chunk.name}</span>
                      <span className="font-mono">{formatBytes(chunk.size)}</span>
                    </div>
                  ))}
                  
                  {bundleAnalysis.chunks.length > 3 && (
                    <div className="text-gray-500 text-center">
                      +{bundleAnalysis.chunks.length - 3} more chunks
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Component Performance */}
            {componentMetrics.length > 0 && (
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Component Performance
                </h4>
                
                <div className="space-y-2 text-xs">
                  {componentMetrics.slice(0, 5).map(({ name, metrics }) => (
                    <div key={name} className="flex justify-between">
                      <span className="truncate">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatMs(metrics.renderTime)}</span>
                        <span className="text-gray-500">({metrics.updateCount})</span>
                        {metrics.errorBoundaryTriggers > 0 && (
                          <AlertTriangle size={10} className="text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <Card className="p-4 border-l-4 border-yellow-500">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  Recommendations
                </h4>
                
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
                      • {rec}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {/* WebSocket Status */}
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                WebSocket Status
              </h4>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Connection State</span>
                  <span className={`font-mono ${
                    webSocketService.connectionState === 'OPEN' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {webSocketService.connectionState}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reconnect Count</span>
                  <span className="font-mono">{webSocketService.reconnectCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// Development-only component wrapper
const PerformanceDashboardDev: React.FC<PerformanceDashboardProps> = (props) => {
  if (import.meta.env.PROD) return null;
  return <PerformanceDashboard {...props} />;
};

export default PerformanceDashboardDev;