import Redis from 'redis';
import { logger } from '../config/logger';

interface CacheOptions {
  ttl?: number;
  compressed?: boolean;
}

export class RedisService {
  private redis: Redis.RedisClientType;
  private defaultTTL = 3600; // 1 hour
  private isConnected = false;
  
  constructor() {
    const redisConfig = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 10000,
        lazyConnect: true
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    };

    this.redis = Redis.createClient(redisConfig);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.redis.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.redis.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.redis.on('end', () => {
      logger.warn('Redis client connection ended');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.redis.connect();
      } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.redis.disconnect();
        this.isConnected = false;
      } catch (error) {
        logger.error('Error disconnecting from Redis:', error);
      }
    }
  }

  // Cache with automatic serialization
  async set(key: string, data: any, options: CacheOptions = {}): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const ttl = options.ttl || this.defaultTTL;
      let value: string;

      if (typeof data === 'string') {
        value = data;
      } else {
        value = JSON.stringify(data);
      }

      // Use compression for large payloads
      if (options.compressed && value.length > 1024) {
        // For production, consider using compression library
        value = `compressed:${value}`;
      }

      await this.redis.setEx(key, ttl, value);
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('Redis cache set error:', error);
    }
  }

  // Get with automatic deserialization
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      let value = data;

      // Handle compressed data
      if (data.startsWith('compressed:')) {
        value = data.substring(11);
        // For production, add decompression logic here
      }

      // Try to parse as JSON, return as string if it fails
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      logger.error('Redis cache get error:', error);
      return null;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  // Delete single key
  async del(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.redis.del(keys);
        logger.debug(`Cache pattern invalidated: ${pattern} (${deleted} keys)`);
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.error('Redis pattern invalidation error:', error);
      return 0;
    }
  }

  // Increment counter
  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      logger.error('Redis increment error:', error);
      return 0;
    }
  }

  // Hash operations
  async hSet(key: string, field: string, value: any, ttl?: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.hSet(key, field, serializedValue);
      
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
    } catch (error) {
      logger.error('Redis hash set error:', error);
    }
  }

  async hGet<T>(key: string, field: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis.hGet(key, field);
      if (!data) return null;

      try {
        return JSON.parse(data) as T;
      } catch {
        return data as T;
      }
    } catch (error) {
      logger.error('Redis hash get error:', error);
      return null;
    }
  }

  async hGetAll<T>(key: string): Promise<Record<string, T> | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis.hGetAll(key);
      if (!data || Object.keys(data).length === 0) return null;

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch {
          result[field] = value as T;
        }
      }
      return result;
    } catch (error) {
      logger.error('Redis hash get all error:', error);
      return null;
    }
  }

  // List operations
  async lPush(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.lPush(key, serializedValue);
      
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
    } catch (error) {
      logger.error('Redis list push error:', error);
    }
  }

  async lRange<T>(key: string, start: number = 0, stop: number = -1): Promise<T[]> {
    if (!this.isConnected) return [];

    try {
      const data = await this.redis.lRange(key, start, stop);
      return data.map(item => {
        try {
          return JSON.parse(item) as T;
        } catch {
          return item as T;
        }
      });
    } catch (error) {
      logger.error('Redis list range error:', error);
      return [];
    }
  }

  // Set operations
  async sAdd(key: string, member: string, ttl?: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.sAdd(key, member);
      
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
    } catch (error) {
      logger.error('Redis set add error:', error);
    }
  }

  async sMembers(key: string): Promise<string[]> {
    if (!this.isConnected) return [];

    try {
      return await this.redis.sMembers(key);
    } catch (error) {
      logger.error('Redis set members error:', error);
      return [];
    }
  }

  // Cache warming and preloading
  async warmCache(warmupData: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    if (!this.isConnected) return;

    try {
      const pipeline = this.redis.multi();
      
      warmupData.forEach(({ key, data, ttl }) => {
        const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
        pipeline.setEx(key, ttl || this.defaultTTL, serializedData);
      });

      await pipeline.exec();
      logger.info(`Cache warmed with ${warmupData.length} entries`);
    } catch (error) {
      logger.error('Cache warming error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    if (!this.isConnected) return null;

    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbSize();
      
      return {
        connected: this.isConnected,
        memory_usage: info,
        total_keys: dbSize
      };
    } catch (error) {
      logger.error('Redis stats error:', error);
      return null;
    }
  }
}

// Singleton instance
export const redisService = new RedisService();