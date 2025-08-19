interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface ChatMetrics {
  responseTime: number;
  messagesSent: number;
  errorsCount: number;
  avgResponseTime: number;
  ragContextUsage: number;
  streamingLatency: number;
}

interface ComponentMetrics {
  renderTime: number;
  updateCount: number;
  errorBoundaryTriggers: number;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private chatMetrics: ChatMetrics = {
    responseTime: 0,
    messagesSent: 0,
    errorsCount: 0,
    avgResponseTime: 0,
    ragContextUsage: 0,
    streamingLatency: 0
  };
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializePerformanceObservers();
  }

  private initializePerformanceObservers(): void {
    try {
      // Observe long tasks
      if ('PerformanceObserver' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.recordMetric('long_task', entry.duration, {
                entryType: entry.entryType,
                name: entry.name
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);

        // Observe layout shifts
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) continue;
            this.recordMetric('cumulative_layout_shift', (entry as any).value);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);

        // Observe navigation timing
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
            this.recordMetric('load_complete', navEntry.loadEventEnd - navEntry.loadEventStart);
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      }
    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  // Record general performance metrics
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log significant performance issues
    if (this.isSignificantMetric(name, value)) {
      console.warn(`⚠️ Performance issue detected: ${name} = ${value}ms`, tags);
    }
  }

  // Chat-specific performance tracking
  startChatResponse(): () => void {
    const startTime = performance.now();
    
    return () => {
      const responseTime = performance.now() - startTime;
      this.recordChatMetric('responseTime', responseTime);
      this.recordMetric('chat_response_time', responseTime);
    };
  }

  recordChatError(): void {
    this.chatMetrics.errorsCount++;
    this.recordMetric('chat_error', 1);
  }

  recordRAGContextUsage(used: boolean): void {
    if (used) {
      this.chatMetrics.ragContextUsage++;
      this.recordMetric('rag_context_used', 1);
    }
  }

  recordStreamingLatency(latency: number): void {
    this.chatMetrics.streamingLatency = latency;
    this.recordMetric('streaming_latency', latency);
  }

  private recordChatMetric(key: keyof ChatMetrics, value: number): void {
    const current = this.chatMetrics[key] as number;
    
    if (key === 'responseTime' || key === 'streamingLatency') {
      this.chatMetrics[key] = value;
    } else if (key === 'avgResponseTime') {
      const totalMessages = this.chatMetrics.messagesSent;
      this.chatMetrics[key] = (current * totalMessages + value) / (totalMessages + 1);
    } else {
      (this.chatMetrics[key] as number) = current + value;
    }

    if (key === 'responseTime') {
      this.chatMetrics.messagesSent++;
      // Update average response time
      const totalMessages = this.chatMetrics.messagesSent;
      this.chatMetrics.avgResponseTime = (this.chatMetrics.avgResponseTime * (totalMessages - 1) + value) / totalMessages;
    }
  }

  // Component performance tracking
  trackComponentRender(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      
      const current = this.componentMetrics.get(componentName) || {
        renderTime: 0,
        updateCount: 0,
        errorBoundaryTriggers: 0
      };

      current.renderTime = renderTime;
      current.updateCount++;
      
      this.componentMetrics.set(componentName, current);
      this.recordMetric('component_render_time', renderTime, { component: componentName });
    };
  }

  recordComponentError(componentName: string): void {
    const current = this.componentMetrics.get(componentName) || {
      renderTime: 0,
      updateCount: 0,
      errorBoundaryTriggers: 0
    };

    current.errorBoundaryTriggers++;
    this.componentMetrics.set(componentName, current);
    this.recordMetric('component_error', 1, { component: componentName });
  }

  // Core Web Vitals calculation
  getCoreWebVitals(): {
    fcp: number | null;
    lcp: number | null;
    fid: number | null;
    cls: number;
  } {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformancePaintTiming;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as PerformancePaintTiming[];
    const fidEntries = performance.getEntriesByType('first-input') as PerformanceEventTiming[];
    
    const clsEntries = this.metrics.filter(m => m.name === 'cumulative_layout_shift');
    const totalCLS = clsEntries.reduce((sum, entry) => sum + entry.value, 0);

    return {
      fcp: fcpEntry ? fcpEntry.startTime : null,
      lcp: lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null,
      fid: fidEntries.length > 0 ? fidEntries[0].processingStart - fidEntries[0].startTime : null,
      cls: totalCLS
    };
  }

  // Performance report generation
  generateReport(): {
    coreWebVitals: ReturnType<typeof this.getCoreWebVitals>;
    chatMetrics: ChatMetrics;
    componentMetrics: Array<{ name: string; metrics: ComponentMetrics }>;
    recentMetrics: PerformanceMetric[];
    recommendations: string[];
  } {
    const coreWebVitals = this.getCoreWebVitals();
    const recentMetrics = this.metrics.slice(-100); // Last 100 metrics
    const recommendations = this.generateRecommendations(coreWebVitals);

    const componentMetricsArray = Array.from(this.componentMetrics.entries()).map(([name, metrics]) => ({
      name,
      metrics
    }));

    return {
      coreWebVitals,
      chatMetrics: { ...this.chatMetrics },
      componentMetrics: componentMetricsArray,
      recentMetrics,
      recommendations
    };
  }

  private generateRecommendations(vitals: ReturnType<typeof this.getCoreWebVitals>): string[] {
    const recommendations: string[] = [];

    if (vitals.fcp && vitals.fcp > 1800) {
      recommendations.push('First Contentful Paint is slow. Consider optimizing above-the-fold content.');
    }

    if (vitals.lcp && vitals.lcp > 2500) {
      recommendations.push('Largest Contentful Paint is slow. Optimize your largest image or text block.');
    }

    if (vitals.fid && vitals.fid > 100) {
      recommendations.push('First Input Delay is high. Reduce JavaScript execution time.');
    }

    if (vitals.cls > 0.1) {
      recommendations.push('Cumulative Layout Shift is high. Ensure images and ads have reserved space.');
    }

    if (this.chatMetrics.avgResponseTime > 3000) {
      recommendations.push('Chat response time is slow. Consider optimizing LLM calls or adding streaming.');
    }

    if (this.chatMetrics.errorsCount / Math.max(this.chatMetrics.messagesSent, 1) > 0.1) {
      recommendations.push('High chat error rate detected. Review error handling and fallback mechanisms.');
    }

    const longTasks = this.metrics.filter(m => m.name === 'long_task').length;
    if (longTasks > 5) {
      recommendations.push('Multiple long tasks detected. Consider code splitting or using web workers.');
    }

    return recommendations;
  }

  private isSignificantMetric(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      'chat_response_time': 5000,
      'component_render_time': 100,
      'long_task': 100,
      'streaming_latency': 1000
    };

    return thresholds[name] && value > thresholds[name];
  }

  // Memory usage tracking
  getMemoryUsage(): {
    used: number;
    total: number;
    usagePercentage: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        usagePercentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return null;
  }

  // Bundle size analysis
  analyzeBundleSize(): Promise<{
    totalSize: number;
    chunks: Array<{ name: string; size: number }>;
  }> {
    return new Promise((resolve) => {
      // This would typically integrate with webpack-bundle-analyzer or similar
      // For now, we'll estimate based on performance entries
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.endsWith('.js'));
      
      const chunks = jsResources.map(resource => ({
        name: resource.name.split('/').pop() || 'unknown',
        size: resource.transferSize || 0
      }));

      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

      resolve({ totalSize, chunks });
    });
  }

  // Cleanup
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.componentMetrics.clear();
  }
}

// Singleton instance
export const performanceService = new PerformanceService();

// React hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const trackRender = performanceService.trackComponentRender(componentName);
  
  // Return cleanup function
  return {
    startTracking: trackRender,
    recordError: () => performanceService.recordComponentError(componentName)
  };
};

// Development-only performance logging
if (import.meta.env.DEV) {
  // Log performance report every 30 seconds in development
  setInterval(() => {
    const report = performanceService.generateReport();
    if (report.recommendations.length > 0) {
      console.group('🚀 Performance Recommendations');
      report.recommendations.forEach(rec => console.warn(rec));
      console.groupEnd();
    }
  }, 30000);
}

export type { PerformanceMetric, ChatMetrics, ComponentMetrics };