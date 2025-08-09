import { logger } from '../config/logger';
import { redisService } from './redis.service';
import { optimizedDatabase } from '../config/database-optimized';
import { performance } from 'perf_hooks';
import os from 'os';
import v8 from 'v8';

interface PerformanceMetrics {
  // Request metrics
  totalRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  slowRequests: number;
  
  // Database metrics
  databaseQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  
  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  
  // WebSocket metrics
  activeConnections: number;
  messagesSent: number;
  messagesReceived: number;
  
  // System metrics
  cpuUsage: number;
  memoryUsage: number;
  memoryHeapUsed: number;
  memoryHeapTotal: number;
  uptime: number;
  
  // Error metrics
  errorRate: number;
  totalErrors: number;
}

interface RequestTiming {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  userId?: string;
  companyId?: string;
}

export class MonitoringService {
  private metrics = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
    lastAccess: number;
  }>();
  
  private requestTimings: RequestTiming[] = [];
  private maxRequestHistory = 10000;
  
  private systemMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    slowRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    startTime: Date.now(),
    lastReset: Date.now()
  };

  constructor() {
    // Start periodic metrics collection
    this.startMetricsCollection();
    
    // Clean up old data periodically
    setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  // Track individual request performance
  public trackRequest(
    endpoint: string, 
    method: string, 
    duration: number, 
    statusCode: number, 
    userId?: string, 
    companyId?: string
  ): void {
    const key = `${method}:${endpoint}`;
    const timing: RequestTiming = {
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: Date.now(),
      userId,
      companyId
    };

    // Update endpoint metrics
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        lastAccess: Date.now()
      });
    }

    const endpointMetrics = this.metrics.get(key)!;
    endpointMetrics.count++;
    endpointMetrics.totalTime += duration;
    endpointMetrics.minTime = Math.min(endpointMetrics.minTime, duration);
    endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, duration);
    endpointMetrics.lastAccess = Date.now();

    if (statusCode >= 400) {
      endpointMetrics.errors++;
      this.systemMetrics.totalErrors++;
    }

    if (duration > 1000) { // Slow request threshold: 1 second
      this.systemMetrics.slowRequests++;
    }

    this.systemMetrics.totalRequests++;

    // Store timing data for analysis
    this.requestTimings.push(timing);
    if (this.requestTimings.length > this.maxRequestHistory) {
      this.requestTimings.shift(); // Remove oldest
    }

    // Log slow requests
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        endpoint,
        method,
        duration: `${duration}ms`,
        statusCode,
        userId,
        companyId
      });
    }
  }

  // Track database query performance
  public trackDatabaseQuery(query: string, duration: number, error?: Error): void {
    const key = `db:${query.substring(0, 50)}...`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        lastAccess: Date.now()
      });
    }

    const queryMetrics = this.metrics.get(key)!;
    queryMetrics.count++;
    queryMetrics.totalTime += duration;
    queryMetrics.minTime = Math.min(queryMetrics.minTime, duration);
    queryMetrics.maxTime = Math.max(queryMetrics.maxTime, duration);
    queryMetrics.lastAccess = Date.now();

    if (error) {
      queryMetrics.errors++;
    }
  }

  // Track cache performance
  public trackCacheHit(key: string): void {
    this.systemMetrics.cacheHits++;
    logger.debug(`Cache HIT: ${key}`);
  }

  public trackCacheMiss(key: string): void {
    this.systemMetrics.cacheMisses++;
    logger.debug(`Cache MISS: ${key}`);
  }

  // Get comprehensive performance metrics
  public async getMetrics(): Promise<PerformanceMetrics> {
    const now = Date.now();
    const uptime = now - this.systemMetrics.startTime;
    const timeSinceReset = now - this.systemMetrics.lastReset;

    // System metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0]; // 1 minute load average
    
    // Database metrics
    const dbHealth = await optimizedDatabase.healthCheck();
    const dbMetrics = optimizedDatabase.getMetrics();
    
    // Cache metrics
    const cacheStats = await redisService.getStats();
    const totalCacheOperations = this.systemMetrics.cacheHits + this.systemMetrics.cacheMisses;
    const cacheHitRate = totalCacheOperations > 0 ? 
      (this.systemMetrics.cacheHits / totalCacheOperations) * 100 : 0;

    // Request metrics
    const averageResponseTime = this.calculateAverageResponseTime();
    const requestsPerSecond = timeSinceReset > 0 ? 
      (this.systemMetrics.totalRequests * 1000) / timeSinceReset : 0;
    const errorRate = this.systemMetrics.totalRequests > 0 ? 
      (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests) * 100 : 0;

    return {
      // Request metrics
      totalRequests: this.systemMetrics.totalRequests,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      slowRequests: this.systemMetrics.slowRequests,
      
      // Database metrics
      databaseQueries: dbMetrics?.totalQueries || 0,
      slowQueries: dbMetrics?.slowQueries || 0,
      averageQueryTime: dbMetrics?.averageResponseTime || 0,
      
      // Cache metrics
      cacheHits: this.systemMetrics.cacheHits,
      cacheMisses: this.systemMetrics.cacheMisses,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      
      // WebSocket metrics
      activeConnections: 0, // Would be populated by WebSocket server
      messagesSent: 0,
      messagesReceived: 0,
      
      // System metrics
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100, // MB
      memoryHeapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
      memoryHeapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
      uptime: uptime,
      
      // Error metrics
      errorRate: Math.round(errorRate * 100) / 100,
      totalErrors: this.systemMetrics.totalErrors
    };
  }

  // Get detailed endpoint metrics
  public getEndpointMetrics(): Array<{
    endpoint: string;
    count: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    errorRate: number;
    requestsPerHour: number;
  }> {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return Array.from(this.metrics.entries())
      .filter(([key]) => !key.startsWith('db:'))
      .map(([endpoint, metrics]) => {
        const timeSinceLastAccess = now - metrics.lastAccess;
        const requestsPerHour = timeSinceLastAccess < oneHour ? 
          (metrics.count * oneHour) / timeSinceLastAccess : 0;
        
        return {
          endpoint,
          count: metrics.count,
          averageTime: Math.round((metrics.totalTime / metrics.count) * 100) / 100,
          minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
          maxTime: metrics.maxTime,
          errorRate: Math.round((metrics.errors / metrics.count) * 100 * 100) / 100,
          requestsPerHour: Math.round(requestsPerHour * 100) / 100
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // Get slowest endpoints
  public getSlowestEndpoints(limit: number = 10): Array<{
    endpoint: string;
    averageTime: number;
    count: number;
    maxTime: number;
  }> {
    return this.getEndpointMetrics()
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit)
      .map(({ endpoint, averageTime, count, maxTime }) => ({
        endpoint,
        averageTime,
        count,
        maxTime
      }));
  }

  // Get most error-prone endpoints
  public getErrorProneEndpoints(limit: number = 10): Array<{
    endpoint: string;
    errorRate: number;
    totalErrors: number;
    count: number;
  }> {
    return this.getEndpointMetrics()
      .filter(metric => metric.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit)
      .map(({ endpoint, errorRate, count }) => ({
        endpoint,
        errorRate,
        totalErrors: Math.round((errorRate * count) / 100),
        count
      }));
  }

  // Get performance trends
  public getPerformanceTrends(timeWindow: number = 3600000): Array<{
    timestamp: number;
    requestCount: number;
    averageResponseTime: number;
    errorCount: number;
  }> {
    const now = Date.now();
    const bucketSize = 60000; // 1 minute buckets
    const buckets = Math.floor(timeWindow / bucketSize);
    
    const trends = new Array(buckets).fill(null).map((_, index) => ({
      timestamp: now - (buckets - index) * bucketSize,
      requestCount: 0,
      averageResponseTime: 0,
      errorCount: 0,
      totalResponseTime: 0
    }));

    // Populate trends from request timings
    this.requestTimings
      .filter(timing => timing.timestamp > now - timeWindow)
      .forEach(timing => {
        const bucketIndex = Math.floor((timing.timestamp - (now - timeWindow)) / bucketSize);
        if (bucketIndex >= 0 && bucketIndex < buckets) {
          trends[bucketIndex].requestCount++;
          trends[bucketIndex].totalResponseTime += timing.duration;
          if (timing.statusCode >= 400) {
            trends[bucketIndex].errorCount++;
          }
        }
      });

    // Calculate averages
    return trends.map(trend => ({
      timestamp: trend.timestamp,
      requestCount: trend.requestCount,
      averageResponseTime: trend.requestCount > 0 ? 
        Math.round((trend.totalResponseTime / trend.requestCount) * 100) / 100 : 0,
      errorCount: trend.errorCount
    }));
  }

  // Get system health status
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    uptime: number;
    metrics: PerformanceMetrics;
  }> {
    const metrics = await this.getMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check various health indicators
    if (metrics.averageResponseTime > 2000) {
      issues.push(`High average response time: ${metrics.averageResponseTime}ms`);
      status = 'warning';
    }

    if (metrics.averageResponseTime > 5000) {
      status = 'critical';
    }

    if (metrics.errorRate > 5) {
      issues.push(`High error rate: ${metrics.errorRate}%`);
      status = status === 'critical' ? 'critical' : 'warning';
    }

    if (metrics.errorRate > 15) {
      status = 'critical';
    }

    if (metrics.cacheHitRate < 70) {
      issues.push(`Low cache hit rate: ${metrics.cacheHitRate}%`);
      if (status === 'healthy') status = 'warning';
    }

    if (metrics.memoryUsage > 80) {
      issues.push(`High memory usage: ${metrics.memoryUsage}%`);
      status = status === 'critical' ? 'critical' : 'warning';
    }

    if (metrics.cpuUsage > 80) {
      issues.push(`High CPU usage: ${metrics.cpuUsage}%`);
      status = status === 'critical' ? 'critical' : 'warning';
    }

    // Database health check
    const dbHealth = await optimizedDatabase.healthCheck();
    if (!dbHealth.connected) {
      issues.push('Database connection failed');
      status = 'critical';
    } else if (dbHealth.responseTime > 1000) {
      issues.push(`Slow database response: ${dbHealth.responseTime}ms`);
      if (status !== 'critical') status = 'warning';
    }

    return {
      status,
      issues,
      uptime: metrics.uptime,
      metrics
    };
  }

  // Performance alerting
  public async checkAlerts(): Promise<Array<{
    type: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: number;
  }>> {
    const alerts = [];
    const metrics = await this.getMetrics();
    const timestamp = Date.now();

    // Define alert thresholds
    const thresholds = {
      responseTime: { warning: 1000, critical: 3000 },
      errorRate: { warning: 2, critical: 10 },
      cacheHitRate: { warning: 60, critical: 40 },
      memoryUsage: { warning: 70, critical: 90 },
      cpuUsage: { warning: 70, critical: 90 }
    };

    // Check thresholds
    if (metrics.averageResponseTime > thresholds.responseTime.critical) {
      alerts.push({
        type: 'critical',
        message: 'Critical: Very high average response time',
        metric: 'averageResponseTime',
        value: metrics.averageResponseTime,
        threshold: thresholds.responseTime.critical,
        timestamp
      });
    } else if (metrics.averageResponseTime > thresholds.responseTime.warning) {
      alerts.push({
        type: 'warning',
        message: 'Warning: High average response time',
        metric: 'averageResponseTime',
        value: metrics.averageResponseTime,
        threshold: thresholds.responseTime.warning,
        timestamp
      });
    }

    // Add more threshold checks...
    
    return alerts;
  }

  // Cleanup old metrics
  private cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Remove old metrics
    for (const [key, metrics] of this.metrics) {
      if (now - metrics.lastAccess > oneHour) {
        this.metrics.delete(key);
      }
    }
    
    // Trim request timings
    const oneHourAgo = now - oneHour;
    this.requestTimings = this.requestTimings.filter(timing => timing.timestamp > oneHourAgo);
    
    logger.debug(`Metrics cleanup completed. Active metrics: ${this.metrics.size}`);
  }

  // Start periodic metrics collection
  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      const metrics = await this.getMetrics();
      
      // Store in Redis for persistence
      await redisService.set('performance:metrics', metrics, { ttl: 3600 });
      
      // Log periodic summary
      if (metrics.totalRequests > 0) {
        logger.info('Performance summary', {
          requests: metrics.totalRequests,
          avgResponseTime: `${metrics.averageResponseTime}ms`,
          errorRate: `${metrics.errorRate}%`,
          cacheHitRate: `${metrics.cacheHitRate}%`,
          memoryUsage: `${metrics.memoryUsage}MB`
        });
      }
    }, 60000);
  }

  private calculateAverageResponseTime(): number {
    const totalTime = Array.from(this.metrics.values())
      .filter((_, index) => !Array.from(this.metrics.keys())[index].startsWith('db:'))
      .reduce((sum, metric) => sum + metric.totalTime, 0);
      
    const totalCount = Array.from(this.metrics.values())
      .filter((_, index) => !Array.from(this.metrics.keys())[index].startsWith('db:'))
      .reduce((sum, metric) => sum + metric.count, 0);
    
    return totalCount > 0 ? totalTime / totalCount : 0;
  }

  // Reset metrics (for testing or periodic resets)
  public resetMetrics(): void {
    this.metrics.clear();
    this.requestTimings = [];
    this.systemMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      slowRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      startTime: Date.now(),
      lastReset: Date.now()
    };
    
    logger.info('Performance metrics reset');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();