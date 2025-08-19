import { logger } from '../utils/logger';

interface RequestMetrics {
  count: number;
  totalDuration: number;
  averageDuration: number;
  lastRequest: string;
  errors: number;
}

interface EndpointMetrics {
  [endpoint: string]: RequestMetrics;
}

export class MetricsService {
  private metrics: EndpointMetrics = {};
  private startTime: Date = new Date();

  recordRequest(endpoint: string, duration: number, isError: boolean = false): void {
    if (!this.metrics[endpoint]) {
      this.metrics[endpoint] = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        lastRequest: '',
        errors: 0
      };
    }

    const metric = this.metrics[endpoint];
    metric.count += 1;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.lastRequest = new Date().toISOString();
    
    if (isError) {
      metric.errors += 1;
    }

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        endpoint,
        duration,
        threshold: 5000
      });
    }
  }

  getMetrics(): {
    uptime: number;
    startTime: string;
    endpoints: EndpointMetrics;
    summary: {
      totalRequests: number;
      totalErrors: number;
      averageResponseTime: number;
    };
  } {
    const totalRequests = Object.values(this.metrics).reduce((sum, metric) => sum + metric.count, 0);
    const totalErrors = Object.values(this.metrics).reduce((sum, metric) => sum + metric.errors, 0);
    const totalDuration = Object.values(this.metrics).reduce((sum, metric) => sum + metric.totalDuration, 0);
    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;

    return {
      uptime: Date.now() - this.startTime.getTime(),
      startTime: this.startTime.toISOString(),
      endpoints: this.metrics,
      summary: {
        totalRequests,
        totalErrors,
        averageResponseTime: Math.round(averageResponseTime)
      }
    };
  }

  reset(): void {
    this.metrics = {};
    this.startTime = new Date();
    logger.info('Metrics reset');
  }
}

export default new MetricsService();