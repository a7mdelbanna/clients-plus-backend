import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { monitoringService } from '../services/monitoring.service';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    companyId: string;
    role: string;
    email: string;
  };
}

// Performance tracking middleware
export const performanceMiddleware = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const startTimestamp = Date.now();
    
    // Track request start
    req.startTime = startTime;
    
    // Override res.json to capture response time
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);
    
    let responseFinished = false;
    
    const finishTracking = () => {
      if (responseFinished) return;
      responseFinished = true;
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Extract endpoint info
      const endpoint = req.route?.path || req.path;
      const method = req.method;
      const statusCode = res.statusCode;
      const userId = req.user?.userId;
      const companyId = req.user?.companyId;
      
      // Track the request performance
      monitoringService.trackRequest(
        endpoint,
        method,
        duration,
        statusCode,
        userId,
        companyId
      );
      
      // Add performance headers
      res.set('X-Response-Time', `${duration}ms`);
      res.set('X-Timestamp', startTimestamp.toString());
      
      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          method,
          endpoint,
          duration: `${duration}ms`,
          statusCode,
          userId,
          companyId,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }
    };
    
    // Override response methods
    res.json = function(data: any) {
      finishTracking();
      return originalJson(data);
    };
    
    res.send = function(data: any) {
      finishTracking();
      return originalSend(data);
    };
    
    res.end = function(...args: any[]) {
      finishTracking();
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Memory usage tracking middleware
export const memoryTrackingMiddleware = () => {
  let requestCount = 0;
  
  return (req: Request, res: Response, next: NextFunction) => {
    requestCount++;
    
    // Check memory usage every 100 requests
    if (requestCount % 100 === 0) {
      const memUsage = process.memoryUsage();
      const memoryUsageMB = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
      
      if (memoryUsageMB > 200) { // 200MB threshold
        logger.warn('High memory usage detected', {
          heapUsed: `${memoryUsageMB}MB`,
          heapTotal: `${Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100}MB`,
          rss: `${Math.round((memUsage.rss / 1024 / 1024) * 100) / 100}MB`,
          external: `${Math.round((memUsage.external / 1024 / 1024) * 100) / 100}MB`,
          requestCount
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          logger.info('Forced garbage collection executed');
        }
      }
    }
    
    next();
  };
};

// Request size tracking middleware
export const requestSizeMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestSize = req.get('content-length');
    
    if (requestSize) {
      const sizeInMB = parseInt(requestSize) / (1024 * 1024);
      
      if (sizeInMB > 5) { // 5MB threshold
        logger.warn('Large request detected', {
          size: `${sizeInMB.toFixed(2)}MB`,
          endpoint: req.path,
          method: req.method,
          contentType: req.get('content-type')
        });
      }
      
      // Add request size header for monitoring
      res.set('X-Request-Size', `${sizeInMB.toFixed(2)}MB`);
    }
    
    next();
  };
};

// Database query tracking middleware  
export const dbQueryTrackingMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This would integrate with your database layer
    // For now, we'll add a hook that can be called by services
    
    (req as any).trackDbQuery = (query: string, duration: number, error?: Error) => {
      monitoringService.trackDatabaseQuery(query, duration, error);
    };
    
    next();
  };
};

// API rate limiting with performance considerations
export const adaptiveRateLimitMiddleware = () => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_MS = 60000; // 1 minute window
  
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = req.user?.companyId || req.ip;
    const now = Date.now();
    
    // Clean up old entries
    for (const [k, v] of requestCounts) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 0, resetTime: now + WINDOW_MS });
    }
    
    const userCount = requestCounts.get(key)!;
    userCount.count++;
    
    // Get current system performance
    const metrics = await monitoringService.getMetrics();
    
    // Adaptive limits based on system performance
    let maxRequests = 1000; // Default limit
    
    if (metrics.averageResponseTime > 2000) {
      maxRequests = 500; // Reduce limit when system is slow
    } else if (metrics.averageResponseTime > 1000) {
      maxRequests = 750;
    }
    
    if (metrics.errorRate > 5) {
      maxRequests = Math.floor(maxRequests * 0.7); // Reduce further if errors are high
    }
    
    if (userCount.count > maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per minute.`,
        retryAfter: Math.ceil((userCount.resetTime - now) / 1000)
      });
      return;
    }
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', (maxRequests - userCount.count).toString());
    res.set('X-RateLimit-Reset', userCount.resetTime.toString());
    
    next();
  };
};

// Circuit breaker middleware for external services
export const circuitBreakerMiddleware = (serviceName: string) => {
  const failures = new Map<string, { count: number; lastFailure: number; isOpen: boolean }>();
  const FAILURE_THRESHOLD = 5;
  const RECOVERY_TIME = 30000; // 30 seconds
  
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    
    if (!failures.has(serviceName)) {
      failures.set(serviceName, { count: 0, lastFailure: 0, isOpen: false });
    }
    
    const serviceState = failures.get(serviceName)!;
    
    // Check if circuit should be closed (recovered)
    if (serviceState.isOpen && now - serviceState.lastFailure > RECOVERY_TIME) {
      serviceState.isOpen = false;
      serviceState.count = 0;
      logger.info(`Circuit breaker closed for service: ${serviceName}`);
    }
    
    // Reject if circuit is open
    if (serviceState.isOpen) {
      res.status(503).json({
        error: 'Service unavailable',
        message: `${serviceName} is currently unavailable`,
        retryAfter: Math.ceil((serviceState.lastFailure + RECOVERY_TIME - now) / 1000)
      });
      return;
    }
    
    // Track response for circuit breaker logic
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (res.statusCode >= 500) {
        serviceState.count++;
        serviceState.lastFailure = now;
        
        if (serviceState.count >= FAILURE_THRESHOLD) {
          serviceState.isOpen = true;
          logger.error(`Circuit breaker opened for service: ${serviceName} (${serviceState.count} failures)`);
        }
      } else if (res.statusCode < 400) {
        // Reset on success
        serviceState.count = 0;
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

// Resource usage monitoring middleware
export const resourceMonitoringMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startCpuUsage = process.cpuUsage();
    const startMemory = process.memoryUsage();
    
    const originalEnd = res.end.bind(res);
    res.end = function(...args: any[]) {
      const endCpuUsage = process.cpuUsage(startCpuUsage);
      const endMemory = process.memoryUsage();
      
      const cpuTime = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to ms
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      // Log resource-intensive requests
      if (cpuTime > 100 || Math.abs(memoryDelta) > 10 * 1024 * 1024) { // 100ms CPU or 10MB memory
        logger.warn('Resource-intensive request', {
          endpoint: req.path,
          method: req.method,
          cpuTime: `${cpuTime.toFixed(2)}ms`,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          statusCode: res.statusCode
        });
      }
      
      // Add resource headers
      res.set('X-CPU-Time', `${cpuTime.toFixed(2)}ms`);
      res.set('X-Memory-Delta', `${(memoryDelta / 1024).toFixed(2)}KB`);
      
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Extend Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      trackDbQuery?: (query: string, duration: number, error?: Error) => void;
    }
  }
}