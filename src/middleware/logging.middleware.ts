import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Custom token for user ID
 */
morgan.token('user-id', (req: Request) => {
  return req.user?.userId || 'anonymous';
});

/**
 * Custom token for company ID
 */
morgan.token('company-id', (req: Request) => {
  return req.user?.companyId || (req as any).companyId || 'unknown';
});

/**
 * Custom token for response time in ms
 */
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = (res as any)['response-time'];
  return responseTime ? `${responseTime}ms` : '-';
});

/**
 * Custom token for request body (sanitized)
 */
morgan.token('body', (req: Request) => {
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitized = { ...req.body };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.currentPassword;
    delete sanitized.newPassword;
    delete sanitized.refreshToken;
    delete sanitized.accessToken;
    delete sanitized.token;
    delete sanitized.apiKey;
    delete sanitized.secret;
    
    return JSON.stringify(sanitized);
  }
  return '-';
});

/**
 * Development logging format
 */
const developmentFormat = ':method :url :status :response-time-ms - :res[content-length] - user::user-id company::company-id';

/**
 * Production logging format (more detailed)
 */
const productionFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user-id',
  companyId: ':company-id',
  referrer: ':referrer',
});

/**
 * Create Morgan middleware with Winston stream
 */
const stream = {
  write: (message: string) => {
    // Remove trailing newline
    const trimmedMessage = message.trim();
    
    // Parse status code to determine log level
    const statusMatch = trimmedMessage.match(/"status":"(\d+)"/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : 200;
    
    if (status >= 500) {
      logger.error(trimmedMessage);
    } else if (status >= 400) {
      logger.warn(trimmedMessage);
    } else {
      logger.info(trimmedMessage);
    }
  },
};

/**
 * Morgan middleware for HTTP request logging
 */
export const morganMiddleware = morgan(
  env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  {
    stream,
    skip: (req: Request, res: Response) => {
      // Skip health check endpoints in production
      if (env.NODE_ENV === 'production') {
        return req.path === '/health' || req.path === '/ready';
      }
      return false;
    },
  }
);

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

/**
 * Log request details middleware
 */
export const logRequestDetails = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  logger.debug('Incoming request', {
    requestId: (req as any).requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    },
    user: req.user?.userId,
    company: req.user?.companyId,
    ip: req.ip,
  });
  
  // Log response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    logger.debug('Outgoing response', {
      requestId: (req as any).requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.userId,
      company: req.user?.companyId,
    });
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests
    if (duration > 1000) { // More than 1 second
      logger.warn('Slow request detected', {
        requestId: (req as any).requestId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        user: req.user?.userId,
        company: req.user?.companyId,
      });
    }
    
    // Add performance header
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};

/**
 * Audit log middleware for sensitive operations
 */
export const auditLog = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info('Audit log', {
          action,
          resource,
          requestId: (req as any).requestId,
          user: req.user?.userId,
          userEmail: req.user?.email,
          company: req.user?.companyId,
          method: req.method,
          path: req.path,
          params: req.params,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString(),
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Security event logging
 */
export const securityLog = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    logger.warn('Security event', {
      eventType,
      requestId: (req as any).requestId,
      user: req.user?.userId,
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });
    
    next();
  };
};