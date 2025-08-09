import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Connection pool configuration
const CONNECTION_POOL_CONFIG = {
  // Maximum number of database connections in the pool
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'),
  // Minimum number of connections to maintain in the pool
  minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '5'),
  // Maximum time to wait for a connection (milliseconds)
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'),
  // Time after which idle connections are closed (milliseconds)
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'), // 5 minutes
  // Maximum lifetime of a connection (milliseconds)
  maxLifetime: parseInt(process.env.DB_MAX_LIFETIME || '1800000'), // 30 minutes
  // Connection timeout (milliseconds)
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'),
  // Socket timeout (milliseconds)
  socketTimeout: parseInt(process.env.DB_SOCKET_TIMEOUT || '60000'),
};

// Query optimization settings
const QUERY_OPTIMIZATION = {
  // Enable query logging in development
  enableQueryLogging: process.env.NODE_ENV === 'development',
  // Slow query threshold (milliseconds)
  slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000'),
  // Enable query metrics collection
  enableMetrics: process.env.ENABLE_DB_METRICS === 'true',
};

class OptimizedDatabase {
  private prisma: PrismaClient;
  private connectionCount: number = 0;
  private queryMetrics = {
    totalQueries: 0,
    slowQueries: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    lastReset: Date.now()
  };

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.buildConnectionString(),
        },
      },
      log: this.getLogConfig(),
      errorFormat: 'pretty',
    });

    this.setupQueryInterceptors();
    this.setupCleanupHandlers();
  }

  private buildConnectionString(): string {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Parse existing URL
    const url = new URL(baseUrl);
    
    // Add connection pool parameters
    const params = new URLSearchParams(url.search);
    
    // PostgreSQL-specific optimizations
    if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
      // Connection pool settings
      params.set('connection_limit', CONNECTION_POOL_CONFIG.connectionLimit.toString());
      params.set('connect_timeout', (CONNECTION_POOL_CONFIG.connectTimeout / 1000).toString());
      params.set('socket_timeout', (CONNECTION_POOL_CONFIG.socketTimeout / 1000).toString());
      
      // Performance optimizations
      params.set('statement_cache_size', '100');
      params.set('prepared_statement_cache_queries', '100');
      
      // SSL settings for production
      if (process.env.NODE_ENV === 'production') {
        params.set('sslmode', 'require');
        params.set('sslcert', process.env.DB_SSL_CERT || '');
        params.set('sslkey', process.env.DB_SSL_KEY || '');
        params.set('sslrootcert', process.env.DB_SSL_ROOT_CERT || '');
      }
    }

    url.search = params.toString();
    return url.toString();
  }

  private getLogConfig(): any[] {
    const logConfig: any[] = [];
    
    if (QUERY_OPTIMIZATION.enableQueryLogging) {
      logConfig.push({
        emit: 'event',
        level: 'query',
      });
      
      logConfig.push({
        emit: 'event',
        level: 'info',
      });
      
      logConfig.push({
        emit: 'event',
        level: 'warn',
      });
      
      logConfig.push({
        emit: 'event',
        level: 'error',
      });
    }

    return logConfig;
  }

  private setupQueryInterceptors(): void {
    if (QUERY_OPTIMIZATION.enableQueryLogging) {
      this.prisma.$on('query', (e) => {
        const duration = parseInt(e.duration);
        
        // Update metrics
        if (QUERY_OPTIMIZATION.enableMetrics) {
          this.updateQueryMetrics(duration);
        }
        
        // Log slow queries
        if (duration > QUERY_OPTIMIZATION.slowQueryThreshold) {
          logger.warn('Slow query detected', {
            query: e.query,
            duration: `${duration}ms`,
            params: e.params,
          });
          
          this.queryMetrics.slowQueries++;
        } else {
          logger.debug('Query executed', {
            query: e.query.substring(0, 100) + '...',
            duration: `${duration}ms`,
          });
        }
      });

      this.prisma.$on('info', (e) => {
        logger.info('Prisma info:', e);
      });

      this.prisma.$on('warn', (e) => {
        logger.warn('Prisma warning:', e);
      });

      this.prisma.$on('error', (e) => {
        logger.error('Prisma error:', e);
      });
    }
  }

  private updateQueryMetrics(duration: number): void {
    this.queryMetrics.totalQueries++;
    this.queryMetrics.totalResponseTime += duration;
    this.queryMetrics.averageResponseTime = 
      this.queryMetrics.totalResponseTime / this.queryMetrics.totalQueries;
  }

  private setupCleanupHandlers(): void {
    // Graceful shutdown handlers
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGUSR2', () => this.gracefulShutdown('SIGUSR2')); // Nodemon restart
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('unhandledRejection');
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.connectionCount++;
      
      // Run initial optimizations
      await this.runInitialOptimizations();
      
      logger.info('Database connected successfully', {
        connectionLimit: CONNECTION_POOL_CONFIG.connectionLimit,
        minConnections: CONNECTION_POOL_CONFIG.minConnections,
      });
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.connectionCount = 0;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  private async runInitialOptimizations(): Promise<void> {
    try {
      // PostgreSQL-specific optimizations
      if (process.env.DATABASE_URL?.includes('postgres')) {
        await this.optimizePostgreSQL();
      }
      
      logger.info('Database optimizations applied');
    } catch (error) {
      logger.warn('Database optimization warning:', error.message);
    }
  }

  private async optimizePostgreSQL(): Promise<void> {
    try {
      // Update table statistics for better query planning
      await this.prisma.$executeRaw`ANALYZE;`;
      
      // Enable query planner optimizations
      await this.prisma.$executeRaw`
        SET random_page_cost = 1.1;
        SET effective_cache_size = '1GB';
        SET shared_preload_libraries = 'pg_stat_statements';
      `;
      
      logger.info('PostgreSQL optimizations applied');
    } catch (error) {
      // Non-critical errors, log as warning
      logger.warn('PostgreSQL optimization warning:', error.message);
    }
  }

  // Connection health check
  public async healthCheck(): Promise<{
    connected: boolean;
    responseTime: number;
    connectionCount: number;
    metrics?: any;
  }> {
    const startTime = Date.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        responseTime,
        connectionCount: this.connectionCount,
        ...(QUERY_OPTIMIZATION.enableMetrics && { metrics: this.getMetrics() }),
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        connectionCount: this.connectionCount,
      };
    }
  }

  // Query performance metrics
  public getMetrics(): any {
    const uptime = Date.now() - this.queryMetrics.lastReset;
    
    return {
      ...this.queryMetrics,
      uptime,
      queriesPerSecond: (this.queryMetrics.totalQueries * 1000) / uptime,
      slowQueryPercentage: this.queryMetrics.totalQueries > 0 
        ? (this.queryMetrics.slowQueries / this.queryMetrics.totalQueries) * 100 
        : 0,
    };
  }

  public resetMetrics(): void {
    this.queryMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      lastReset: Date.now()
    };
  }

  // Manual connection pool management
  public async optimizeConnectionPool(): Promise<void> {
    try {
      // Force connection pool cleanup
      await this.prisma.$disconnect();
      await this.prisma.$connect();
      
      logger.info('Connection pool optimized');
    } catch (error) {
      logger.error('Connection pool optimization failed:', error);
      throw error;
    }
  }

  // Query optimization helpers
  public async explainQuery(query: string): Promise<any> {
    try {
      const result = await this.prisma.$queryRawUnsafe(`EXPLAIN ANALYZE ${query}`);
      return result;
    } catch (error) {
      logger.error('Query explain failed:', error);
      throw error;
    }
  }

  public async getSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      // Requires pg_stat_statements extension
      const queries = await this.prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT ${limit}
      `;
      
      return queries as any[];
    } catch (error) {
      logger.warn('Could not fetch slow queries - pg_stat_statements may not be enabled');
      return [];
    }
  }

  public async vacuumAnalyze(): Promise<void> {
    try {
      await this.prisma.$executeRaw`VACUUM ANALYZE`;
      logger.info('Database vacuum analyze completed');
    } catch (error) {
      logger.error('Vacuum analyze failed:', error);
      throw error;
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      await this.disconnect();
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  // Getter for Prisma client
  public getClient(): PrismaClient {
    return this.prisma;
  }
}

// Export optimized database instance
export const optimizedDatabase = new OptimizedDatabase();

// Backward compatibility
export const database = optimizedDatabase;