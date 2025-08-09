import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis.service';
import { logger } from '../config/logger';

interface CacheConfig {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  varyBy?: string[];
  skipCache?: boolean;
}

// Cache middleware with flexible configuration
export const cacheMiddleware = (config: CacheConfig = {}) => {
  const { 
    ttl = 3600, 
    keyGenerator = defaultKeyGenerator,
    condition = () => true,
    varyBy = [],
    skipCache = false 
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or when explicitly disabled
    if (req.method !== 'GET' || skipCache || !condition(req)) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      const varyKey = generateVaryKey(req, varyBy);
      const finalKey = varyKey ? `${cacheKey}:${varyKey}` : cacheKey;

      // Try to get cached response
      const cached = await redisService.get(finalKey);
      if (cached) {
        logger.debug(`Cache HIT: ${finalKey}`);
        
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', `public, max-age=${ttl}`);
        
        return res.json(cached);
      }

      logger.debug(`Cache MISS: ${finalKey}`);
      res.set('X-Cache', 'MISS');

      // Store original send function
      const originalJson = res.json.bind(res);
      
      // Override json function to cache the response
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisService.set(finalKey, data, { ttl }).catch(error => {
            logger.error('Cache set error in middleware:', error);
          });
        }
        
        // Set cache headers for fresh responses
        res.set('Cache-Control', `public, max-age=${ttl}`);
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Default key generator using URL and query parameters
function defaultKeyGenerator(req: Request): string {
  const companyId = req.user?.companyId || 'no-company';
  const baseUrl = req.baseUrl + req.path;
  const queryString = Object.keys(req.query).length > 0 
    ? `:${JSON.stringify(req.query)}` 
    : '';
  
  return `cache:${companyId}:${baseUrl}${queryString}`;
}

// Generate vary key based on specified headers/parameters
function generateVaryKey(req: Request, varyBy: string[]): string {
  if (varyBy.length === 0) return '';
  
  const varyParts: string[] = [];
  
  varyBy.forEach(key => {
    if (key.startsWith('header:')) {
      const headerName = key.substring(7);
      const headerValue = req.headers[headerName.toLowerCase()];
      if (headerValue) {
        varyParts.push(`${headerName}:${headerValue}`);
      }
    } else if (key.startsWith('query:')) {
      const queryName = key.substring(6);
      const queryValue = req.query[queryName];
      if (queryValue) {
        varyParts.push(`${queryName}:${queryValue}`);
      }
    } else if (key === 'user') {
      const userId = req.user?.id;
      if (userId) {
        varyParts.push(`user:${userId}`);
      }
    } else if (key === 'role') {
      const userRole = req.user?.role;
      if (userRole) {
        varyParts.push(`role:${userRole}`);
      }
    }
  });
  
  return varyParts.join('|');
}

// Specific cache configurations for common use cases
export const listCache = (ttl = 1800) => cacheMiddleware({
  ttl,
  varyBy: ['query:page', 'query:limit', 'query:sort', 'query:filter']
});

export const detailCache = (ttl = 3600) => cacheMiddleware({
  ttl,
  varyBy: ['query:include']
});

export const userSpecificCache = (ttl = 900) => cacheMiddleware({
  ttl,
  varyBy: ['user', 'role']
});

export const shortCache = (ttl = 300) => cacheMiddleware({ ttl });
export const mediumCache = (ttl = 1800) => cacheMiddleware({ ttl });
export const longCache = (ttl = 7200) => cacheMiddleware({ ttl });

// Cache invalidation middleware
export const invalidateCache = (patterns: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);
    
    res.send = function(data: any) {
      // Only invalidate on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const companyId = req.user?.companyId || 'no-company';
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];
        
        patternArray.forEach(pattern => {
          const fullPattern = `cache:${companyId}:${pattern}*`;
          redisService.invalidatePattern(fullPattern).catch(error => {
            logger.error('Cache invalidation error:', error);
          });
        });
      }
      
      return originalSend(data);
    };
    
    next();
  };
};

// Cache warming utilities
export class CacheWarmer {
  static async warmListEndpoints(companyId: string, endpoints: string[]): Promise<void> {
    const warmupPromises = endpoints.map(endpoint => 
      this.warmEndpoint(companyId, endpoint)
    );
    
    await Promise.all(warmupPromises);
    logger.info(`Cache warmed for ${endpoints.length} endpoints`);
  }

  private static async warmEndpoint(companyId: string, endpoint: string): Promise<void> {
    try {
      // This would typically fetch data and warm the cache
      // Implementation depends on your data access patterns
      const cacheKey = `cache:${companyId}:${endpoint}`;
      logger.debug(`Warming cache for: ${cacheKey}`);
      
      // Example: Pre-fetch and cache common queries
      // const data = await someService.getData(params);
      // await redisService.set(cacheKey, data, { ttl: 3600 });
    } catch (error) {
      logger.error(`Cache warming failed for ${endpoint}:`, error);
    }
  }
}

// Cache health check
export async function getCacheHealth(): Promise<{
  connected: boolean;
  stats?: any;
}> {
  try {
    const stats = await redisService.getStats();
    return {
      connected: true,
      stats
    };
  } catch (error) {
    return {
      connected: false
    };
  }
}