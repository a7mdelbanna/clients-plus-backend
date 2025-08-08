import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Create Redis client for rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

if (env.REDIS_URL) {
  redisClient = createClient({
    url: env.REDIS_URL,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  redisClient.connect().catch((err) => {
    logger.error('Failed to connect to Redis:', err);
    redisClient = null;
  });
}

/**
 * Create rate limiter with Redis store (falls back to memory store)
 */
const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const baseOptions = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100, // 100 requests default
    message: options.message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        user: req.user?.userId,
      });
      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests, please try again later',
        error: 'RATE_LIMIT_EXCEEDED',
      });
    },
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.userId || req.ip || 'unknown';
    }),
  };

  // Use Redis store if available, otherwise use memory store
  if (redisClient) {
    return rateLimit({
      ...baseOptions,
      store: new RedisStore({
        // @ts-ignore - RedisStore type mismatch
        client: redisClient,
        prefix: 'rate-limit:',
      }),
    });
  }

  logger.warn('Redis not available, using memory store for rate limiting');
  return rateLimit(baseOptions);
};

/**
 * General API rate limiter
 */
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by IP for auth endpoints
    return req.ip || 'unknown';
  },
});

/**
 * Rate limiter for password reset
 */
export const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by email or IP
    return req.body?.email || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for registration
 */
export const registrationRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour
  message: 'Too many registration attempts, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by IP
    return req.ip || 'unknown';
  },
});

/**
 * Rate limiter for API key generation
 */
export const apiKeyRateLimit = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 API keys per day
  message: 'Too many API key generation attempts, please try again tomorrow',
  keyGenerator: (req: Request) => {
    // Rate limit by user ID
    return req.user?.userId || 'unknown';
  },
});

/**
 * Rate limiter for file uploads
 */
export const uploadRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by user ID or IP
    return req.user?.userId || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for data export
 */
export const exportRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  message: 'Too many export requests, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by company ID
    return req.user?.companyId || 'unknown';
  },
});

/**
 * Rate limiter for webhook endpoints
 */
export const webhookRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many webhook requests, please slow down',
  keyGenerator: (req: Request) => {
    // Rate limit by source IP
    return req.ip || 'unknown';
  },
});

/**
 * Dynamic rate limiter based on user role
 */
export const dynamicRateLimit = (req: Request, res: Response, next: any) => {
  let maxRequests = 100; // Default
  
  if (req.user) {
    switch (req.user.role) {
      case 'SUPER_ADMIN':
        maxRequests = 1000;
        break;
      case 'ADMIN':
        maxRequests = 500;
        break;
      case 'MANAGER':
        maxRequests = 300;
        break;
      case 'USER':
      case 'STAFF':
        maxRequests = 200;
        break;
      case 'RECEPTIONIST':
        maxRequests = 150;
        break;
    }
  }

  const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    message: `Rate limit exceeded (${maxRequests} requests per 15 minutes)`,
  });

  limiter(req, res, next);
};

/**
 * Skip rate limiting for certain conditions
 */
export const skipRateLimit = (req: Request): boolean => {
  // Skip for health checks
  if (req.path === '/health' || req.path === '/ready') {
    return true;
  }

  // Skip for super admins (optional)
  if (req.user?.role === 'SUPER_ADMIN') {
    return true;
  }

  // Skip for whitelisted IPs (if configured)
  const whitelistedIPs = env.RATE_LIMIT_WHITELIST?.split(',') || [];
  if (req.ip && whitelistedIPs.includes(req.ip)) {
    return true;
  }

  return false;
};

/**
 * Conditional rate limiter
 */
export const conditionalRateLimit = (limiter: any) => {
  return (req: Request, res: Response, next: any) => {
    if (skipRateLimit(req)) {
      return next();
    }
    limiter(req, res, next);
  };
};

/**
 * Cleanup Redis connection on shutdown
 */
export const cleanupRateLimiter = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
};