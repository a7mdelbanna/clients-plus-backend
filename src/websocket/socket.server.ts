import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken, JWTPayload } from '../utils/jwt.utils';
import { authService } from '../services/auth.service';
import { logger } from '../config/logger';
import { env } from '../config/env';

// Event handlers
import { AppointmentSocketHandler } from './handlers/appointment.handler';
import { ClientSocketHandler } from './handlers/client.handler';
import { NotificationSocketHandler } from './handlers/notification.handler';
import { StaffSocketHandler } from './handlers/staff.handler';

// Extend Socket interface to include user data
interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      userId: string;
      email: string;
      companyId: string;
      role: string;
      permissions?: string[];
    };
  };
}

export class WebSocketServer {
  private io: SocketServer;
  private rooms: Map<string, Set<string>> = new Map(); // companyId -> socketIds
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  
  // Event handlers
  public appointmentHandler: AppointmentSocketHandler;
  public clientHandler: ClientSocketHandler;
  public notificationHandler: NotificationSocketHandler;
  public staffHandler: StaffSocketHandler;

  constructor() {
    this.appointmentHandler = new AppointmentSocketHandler(this);
    this.clientHandler = new ClientSocketHandler(this);
    this.notificationHandler = new NotificationSocketHandler(this);
    this.staffHandler = new StaffSocketHandler(this);
  }

  public initialize(httpServer: HTTPServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: env.ALLOWED_ORIGINS,
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupCleanup();
    
    logger.info('WebSocket server initialized');
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const payload = verifyAccessToken(token);
        
        // Validate user still exists and is active
        const user = await authService.getUserById(payload.userId, payload.companyId);
        if (!user) {
          return next(new Error('User not found or inactive'));
        }

        // Attach user info to socket
        (socket as AuthenticatedSocket).data = {
          user: {
            userId: payload.userId,
            email: payload.email,
            companyId: payload.companyId,
            role: payload.role,
            permissions: payload.permissions,
          }
        };

        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      // Simple rate limiting - in production, use Redis-based solution
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const maxRequests = 100; // 100 requests per minute

      if (!socket.data.rateLimitWindow) {
        socket.data.rateLimitWindow = now;
        socket.data.requestCount = 1;
      } else if (now - socket.data.rateLimitWindow > windowMs) {
        socket.data.rateLimitWindow = now;
        socket.data.requestCount = 1;
      } else {
        socket.data.requestCount = (socket.data.requestCount || 0) + 1;
        if (socket.data.requestCount > maxRequests) {
          return next(new Error('Rate limit exceeded'));
        }
      }
      
      next();
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const { userId, companyId } = socket.data.user;
      
      logger.info(`User ${userId} connected via WebSocket`);

      // Store socket mapping
      this.userSockets.set(userId, socket.id);
      
      // Join company room
      socket.join(`company:${companyId}`);
      
      // Join user-specific room
      socket.join(`user:${userId}`);

      // Add to company rooms tracking
      if (!this.rooms.has(companyId)) {
        this.rooms.set(companyId, new Set());
      }
      this.rooms.get(companyId)!.add(socket.id);

      // Setup event handlers
      this.setupAppointmentEvents(socket);
      this.setupClientEvents(socket);
      this.setupStaffEvents(socket);
      this.setupNotificationEvents(socket);

      // Handle room joining
      socket.on('join-room', (room: string) => {
        this.handleJoinRoom(socket, room);
      });

      socket.on('leave-room', (room: string) => {
        this.handleLeaveRoom(socket, room);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Connected to Clients+ real-time server',
        userId,
        companyId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupAppointmentEvents(socket: AuthenticatedSocket): void {
    socket.on('appointments:subscribe', (filters) => {
      this.appointmentHandler.handleSubscription(socket, filters);
    });

    socket.on('appointments:unsubscribe', () => {
      this.appointmentHandler.handleUnsubscription(socket);
    });

    socket.on('staff-appointments:subscribe', (staffId) => {
      this.appointmentHandler.handleStaffSubscription(socket, staffId);
    });

    socket.on('client-appointments:subscribe', (clientId) => {
      this.appointmentHandler.handleClientSubscription(socket, clientId);
    });
  }

  private setupClientEvents(socket: AuthenticatedSocket): void {
    socket.on('clients:subscribe', (filters) => {
      this.clientHandler.handleSubscription(socket, filters);
    });

    socket.on('clients:unsubscribe', () => {
      this.clientHandler.handleUnsubscription(socket);
    });
  }

  private setupStaffEvents(socket: AuthenticatedSocket): void {
    socket.on('staff:subscribe', (filters) => {
      this.staffHandler.handleSubscription(socket, filters);
    });

    socket.on('staff:unsubscribe', () => {
      this.staffHandler.handleUnsubscription(socket);
    });

    socket.on('staff-availability:subscribe', (staffId) => {
      this.staffHandler.handleAvailabilitySubscription(socket, staffId);
    });
  }

  private setupNotificationEvents(socket: AuthenticatedSocket): void {
    socket.on('notifications:mark-read', (notificationId) => {
      this.notificationHandler.markAsRead(socket, notificationId);
    });

    socket.on('notifications:subscribe', () => {
      this.notificationHandler.handleSubscription(socket);
    });
  }

  private handleJoinRoom(socket: AuthenticatedSocket, room: string): void {
    const { companyId, role } = socket.data.user;
    
    // Validate room access
    if (this.validateRoomAccess(room, companyId, role)) {
      socket.join(room);
      socket.emit('room-joined', { room });
      logger.info(`Socket ${socket.id} joined room ${room}`);
    } else {
      socket.emit('error', { message: 'Access denied to room', room });
    }
  }

  private handleLeaveRoom(socket: AuthenticatedSocket, room: string): void {
    socket.leave(room);
    socket.emit('room-left', { room });
    logger.info(`Socket ${socket.id} left room ${room}`);
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const { userId, companyId } = socket.data.user;
    
    logger.info(`User ${userId} disconnected from WebSocket`);

    // Remove from user sockets mapping
    this.userSockets.delete(userId);
    
    // Remove from company rooms tracking
    const companyRoom = this.rooms.get(companyId);
    if (companyRoom) {
      companyRoom.delete(socket.id);
      if (companyRoom.size === 0) {
        this.rooms.delete(companyId);
      }
    }

    // Clean up subscriptions
    this.appointmentHandler.handleDisconnection(socket);
    this.clientHandler.handleDisconnection(socket);
    this.staffHandler.handleDisconnection(socket);
    this.notificationHandler.handleDisconnection(socket);
  }

  private validateRoomAccess(room: string, companyId: string, role: string): boolean {
    // Parse room format: type:identifier
    const [roomType, roomId] = room.split(':');
    
    switch (roomType) {
      case 'company':
        return roomId === companyId;
      case 'branch':
        // In future, validate branch access
        return true;
      case 'user':
        // Users can join their own room or admin/manager can join any
        return ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
      default:
        return false;
    }
  }

  private setupCleanup(): void {
    // Periodic cleanup of stale connections
    setInterval(() => {
      const connectedSockets = new Set(
        Array.from(this.io.sockets.sockets.keys())
      );
      
      // Clean up user socket mappings
      for (const [userId, socketId] of this.userSockets.entries()) {
        if (!connectedSockets.has(socketId)) {
          this.userSockets.delete(userId);
        }
      }
      
      // Clean up room mappings
      for (const [companyId, socketIds] of this.rooms.entries()) {
        const activeSocketIds = new Set(
          Array.from(socketIds).filter(id => connectedSockets.has(id))
        );
        
        if (activeSocketIds.size === 0) {
          this.rooms.delete(companyId);
        } else {
          this.rooms.set(companyId, activeSocketIds);
        }
      }
    }, 30000); // Clean up every 30 seconds
  }

  // Public methods for emitting events
  public emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public emitToCompany(companyId: string, event: string, data: any): void {
    this.io.to(`company:${companyId}`).emit(event, data);
  }

  public emitToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getConnectedUsers(companyId: string): string[] {
    const room = this.io.sockets.adapter.rooms.get(`company:${companyId}`);
    if (!room) return [];
    
    return Array.from(room).map(socketId => {
      const socket = this.io.sockets.sockets.get(socketId) as AuthenticatedSocket;
      return socket?.data?.user?.userId;
    }).filter(Boolean);
  }

  public getConnectionCount(companyId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`company:${companyId}`);
    return room ? room.size : 0;
  }

  public close(): void {
    if (this.io) {
      this.io.close();
      logger.info('WebSocket server closed');
    }
  }
}

// Export singleton instance
export const webSocketServer = new WebSocketServer();