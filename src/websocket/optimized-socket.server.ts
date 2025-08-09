import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken, JWTPayload } from '../utils/jwt.utils';
import { authService } from '../services/auth.service';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { redisService } from '../services/redis.service';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import zlib from 'zlib';

// Event handlers
import { AppointmentSocketHandler } from './handlers/appointment.handler';
import { ClientSocketHandler } from './handlers/client.handler';
import { NotificationSocketHandler } from './handlers/notification.handler';
import { StaffSocketHandler } from './handlers/staff.handler';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      userId: string;
      email: string;
      companyId: string;
      role: string;
      permissions?: string[];
    };
    rateLimitKey?: string;
    lastActivity?: number;
  };
}

interface MessageBatch {
  messages: Array<{
    event: string;
    data: any;
    timestamp: number;
  }>;
  companyId: string;
}

export class OptimizedWebSocketServer {
  private io: SocketServer;
  private rooms: Map<string, Set<string>> = new Map(); // companyId -> socketIds
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private messageBatches: Map<string, MessageBatch> = new Map(); // companyId -> batch
  private batchTimer: NodeJS.Timer | null = null;
  
  // Rate limiting
  private rateLimiter: RateLimiterRedis;
  
  // Connection pooling
  private connectionPool: Map<string, number> = new Map(); // companyId -> connection count
  private maxConnectionsPerCompany = 100;
  
  // Performance monitoring
  private metrics = {
    totalConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    compressionSaved: 0,
    lastReset: Date.now()
  };
  
  // Event handlers
  public appointmentHandler: AppointmentSocketHandler;
  public clientHandler: ClientSocketHandler;
  public notificationHandler: NotificationSocketHandler;
  public staffHandler: StaffSocketHandler;

  constructor() {
    // Initialize rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisService as any,
      keyPrefix: 'ws_rate_limit',
      points: 50, // Number of messages
      duration: 60, // Per 60 seconds
      blockDuration: 60, // Block for 60 seconds
    });

    this.appointmentHandler = new AppointmentSocketHandler(this);
    this.clientHandler = new ClientSocketHandler(this);
    this.notificationHandler = new NotificationSocketHandler(this);
    this.staffHandler = new StaffSocketHandler(this);
    
    // Start batch processing
    this.startMessageBatching();
    
    // Start metrics reset timer
    setInterval(() => this.resetMetrics(), 60000); // Reset every minute
  }

  public async initialize(httpServer: HTTPServer): Promise<void> {
    // Redis adapter for multi-server support
    const pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
    
    const subClient = pubClient.duplicate();
    
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: env.ALLOWED_ORIGINS,
        credentials: true,
        methods: ['GET', 'POST']
      },
      // Performance optimizations
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6, // 1MB
      // Enable compression
      compression: true,
      // Connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
      // Transports optimization
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
    });

    // Use Redis adapter for scalability
    this.io.adapter(createAdapter(pubClient, subClient));

    // Connection handling with authentication and rate limiting
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        await this.authenticateSocket(socket);
        await this.checkRateLimit(socket);
        await this.checkConnectionLimits(socket);
        next();
      } catch (error) {
        logger.warn(`WebSocket authentication failed: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });

    // Connection event handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('Optimized WebSocket server initialized');
  }

  private async authenticateSocket(socket: AuthenticatedSocket): Promise<void> {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      const decoded = verifyAccessToken(token) as JWTPayload;
      const user = await authService.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('Invalid or inactive user');
      }

      socket.data = {
        user: {
          userId: user.id,
          email: user.email,
          companyId: user.companyId,
          role: user.role,
          permissions: user.permissions as string[]
        },
        rateLimitKey: `ws:${user.id}`,
        lastActivity: Date.now()
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  private async checkRateLimit(socket: AuthenticatedSocket): Promise<void> {
    const rateLimitKey = socket.data.rateLimitKey!;
    
    try {
      await this.rateLimiter.consume(rateLimitKey);
    } catch (rateLimiterRes) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async checkConnectionLimits(socket: AuthenticatedSocket): Promise<void> {
    const companyId = socket.data.user.companyId;
    const currentConnections = this.connectionPool.get(companyId) || 0;
    
    if (currentConnections >= this.maxConnectionsPerCompany) {
      throw new Error('Company connection limit exceeded');
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const { userId, companyId, role } = socket.data.user;
    
    logger.info(`WebSocket connected: ${userId} from company ${companyId}`);
    
    // Update connection tracking
    this.metrics.totalConnections++;
    this.userSockets.set(userId, socket.id);
    this.connectionPool.set(companyId, (this.connectionPool.get(companyId) || 0) + 1);
    
    // Join company room
    socket.join(companyId);
    
    // Add to rooms map
    if (!this.rooms.has(companyId)) {
      this.rooms.set(companyId, new Set());
    }
    this.rooms.get(companyId)!.add(socket.id);

    // Set up message handling with rate limiting
    socket.onAny(async (event, data) => {
      try {
        await this.handleMessage(socket, event, data);
      } catch (error) {
        logger.error(`WebSocket message handling error: ${error.message}`);
        socket.emit('error', { message: 'Message handling failed' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected successfully',
      userId,
      companyId,
      role,
      serverTime: new Date().toISOString()
    });

    // Register event handlers
    this.appointmentHandler.register(socket);
    this.clientHandler.register(socket);
    this.notificationHandler.register(socket);
    this.staffHandler.register(socket);
  }

  private async handleMessage(socket: AuthenticatedSocket, event: string, data: any): Promise<void> {
    // Rate limiting check
    const rateLimitKey = socket.data.rateLimitKey!;
    
    try {
      await this.rateLimiter.consume(rateLimitKey);
    } catch {
      socket.emit('rate_limit_exceeded', { message: 'Too many messages, please slow down' });
      return;
    }

    // Update activity timestamp
    socket.data.lastActivity = Date.now();
    this.metrics.messagesReceived++;

    // Handle ping/pong for connection health
    if (event === 'ping') {
      socket.emit('pong', { timestamp: Date.now() });
      return;
    }

    // Log message for debugging
    logger.debug(`WebSocket message: ${event} from ${socket.data.user.userId}`);
  }

  private handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    const { userId, companyId } = socket.data.user;
    
    logger.info(`WebSocket disconnected: ${userId} from company ${companyId}, reason: ${reason}`);
    
    // Update connection tracking
    this.metrics.totalConnections--;
    this.userSockets.delete(userId);
    this.connectionPool.set(companyId, Math.max(0, (this.connectionPool.get(companyId) || 0) - 1));
    
    // Remove from rooms map
    const roomSockets = this.rooms.get(companyId);
    if (roomSockets) {
      roomSockets.delete(socket.id);
      if (roomSockets.size === 0) {
        this.rooms.delete(companyId);
      }
    }
  }

  // Message broadcasting with compression and batching
  public async broadcastToCompany(companyId: string, event: string, data: any, options?: {
    compress?: boolean;
    batch?: boolean;
    excludeUserId?: string;
  }): Promise<void> {
    const { compress = true, batch = false, excludeUserId } = options || {};

    if (batch) {
      this.addToBatch(companyId, event, data);
      return;
    }

    let payload = data;
    
    if (compress && JSON.stringify(data).length > 1024) {
      payload = this.compressMessage(data);
    }

    // Get all sockets in the company room
    const roomSockets = this.io.sockets.adapter.rooms.get(companyId);
    if (!roomSockets) return;

    let sentCount = 0;
    for (const socketId of roomSockets) {
      const socket = this.io.sockets.sockets.get(socketId) as AuthenticatedSocket;
      if (socket && socket.data?.user?.userId !== excludeUserId) {
        socket.emit(event, payload);
        sentCount++;
      }
    }

    this.metrics.messagesSent += sentCount;
    logger.debug(`Broadcast to company ${companyId}: ${event} to ${sentCount} clients`);
  }

  public async broadcastToUser(userId: string, event: string, data: any, options?: {
    compress?: boolean;
  }): Promise<void> {
    const { compress = true } = options || {};
    const socketId = this.userSockets.get(userId);
    
    if (!socketId) {
      logger.debug(`User ${userId} not connected for event ${event}`);
      return;
    }

    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) {
      this.userSockets.delete(userId);
      return;
    }

    let payload = data;
    if (compress && JSON.stringify(data).length > 1024) {
      payload = this.compressMessage(data);
    }

    socket.emit(event, payload);
    this.metrics.messagesSent++;
    logger.debug(`Message sent to user ${userId}: ${event}`);
  }

  // Message compression
  private compressMessage(data: any): { compressed: true; data: string } {
    const jsonString = JSON.stringify(data);
    const compressed = zlib.gzipSync(jsonString).toString('base64');
    
    this.metrics.compressionSaved += jsonString.length - compressed.length;
    
    return {
      compressed: true,
      data: compressed
    };
  }

  // Message batching for high-frequency updates
  private addToBatch(companyId: string, event: string, data: any): void {
    if (!this.messageBatches.has(companyId)) {
      this.messageBatches.set(companyId, {
        messages: [],
        companyId
      });
    }

    const batch = this.messageBatches.get(companyId)!;
    batch.messages.push({
      event,
      data,
      timestamp: Date.now()
    });

    // Limit batch size
    if (batch.messages.length > 50) {
      this.flushBatch(companyId);
    }
  }

  private startMessageBatching(): void {
    this.batchTimer = setInterval(() => {
      for (const companyId of this.messageBatches.keys()) {
        this.flushBatch(companyId);
      }
    }, 100); // Flush every 100ms
  }

  private flushBatch(companyId: string): void {
    const batch = this.messageBatches.get(companyId);
    if (!batch || batch.messages.length === 0) return;

    this.broadcastToCompany(companyId, 'batch_update', {
      messages: batch.messages,
      timestamp: Date.now()
    }, { compress: true });

    batch.messages = [];
  }

  // Performance metrics
  public getMetrics(): any {
    const uptime = Date.now() - this.metrics.lastReset;
    
    return {
      ...this.metrics,
      uptime,
      connectionsPerSecond: (this.metrics.totalConnections * 1000) / uptime,
      messagesPerSecond: ((this.metrics.messagesSent + this.metrics.messagesReceived) * 1000) / uptime,
      compressionRatio: this.metrics.compressionSaved > 0 ? 
        (this.metrics.compressionSaved / (this.metrics.compressionSaved + this.metrics.messagesSent)) : 0,
      roomsCount: this.rooms.size,
      connectionsByCompany: Object.fromEntries(this.connectionPool)
    };
  }

  private resetMetrics(): void {
    this.metrics = {
      totalConnections: this.metrics.totalConnections, // Keep current connections
      messagesSent: 0,
      messagesReceived: 0,
      compressionSaved: 0,
      lastReset: Date.now()
    };
  }

  // Connection management
  public async closeIdleConnections(): Promise<void> {
    const now = Date.now();
    const idleTimeout = 5 * 60 * 1000; // 5 minutes
    
    const socketsToClose: string[] = [];
    
    this.io.sockets.sockets.forEach((socket: AuthenticatedSocket) => {
      const lastActivity = socket.data?.lastActivity || now;
      if (now - lastActivity > idleTimeout) {
        socketsToClose.push(socket.id);
      }
    });

    for (const socketId of socketsToClose) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        logger.info(`Closed idle connection: ${socketId}`);
      }
    }
  }

  public async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    // Flush remaining batches
    for (const companyId of this.messageBatches.keys()) {
      this.flushBatch(companyId);
    }

    // Close all connections gracefully
    this.io.close();
    logger.info('WebSocket server shutdown complete');
  }

  // Getters for external access
  public getIO(): SocketServer {
    return this.io;
  }

  public getRooms(): Map<string, Set<string>> {
    return this.rooms;
  }

  public getUserSockets(): Map<string, string> {
    return this.userSockets;
  }
}

// Export singleton instance
export const optimizedWebSocketServer = new OptimizedWebSocketServer();