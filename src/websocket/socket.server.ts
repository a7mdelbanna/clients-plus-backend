import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verify } from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { appointmentHandler } from './handlers/appointment.handler';
import { availabilityHandler } from './handlers/availability.handler';
import { notificationHandler } from './handlers/notification.handler';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  userRole?: string;
}

interface JWTPayload {
  userId: string;
  companyId: string;
  role: string;
}

class WebSocketServer {
  private io: Server | null = null;
  private connectedClients = new Map<string, AuthenticatedSocket>();

  public initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));

    logger.info('WebSocket server initialized');
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('No authentication token provided'));
      }

      const decoded = verify(token, env.JWT_SECRET) as JWTPayload;
      
      socket.userId = decoded.userId;
      socket.companyId = decoded.companyId;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const { userId, companyId, userRole } = socket;
    
    logger.info(`WebSocket client connected: ${socket.id} (User: ${userId}, Company: ${companyId})`);
    
    this.connectedClients.set(socket.id, socket);

    // Join company room for company-wide broadcasts
    if (companyId) {
      socket.join(`company_${companyId}`);
      logger.debug(`Socket ${socket.id} joined company room: company_${companyId}`);
    }

    // Join user-specific room for direct notifications
    if (userId) {
      socket.join(`user_${userId}`);
      logger.debug(`Socket ${socket.id} joined user room: user_${userId}`);
    }

    // Join role-based room for role-specific notifications
    if (userRole && companyId) {
      socket.join(`role_${userRole}_${companyId}`);
      logger.debug(`Socket ${socket.id} joined role room: role_${userRole}_${companyId}`);
    }

    // Register event handlers
    this.registerEventHandlers(socket);

    // Handle custom room joins
    this.handleRoomManagement(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (Reason: ${reason})`);
      this.connectedClients.delete(socket.id);
    });

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      rooms: Array.from(socket.rooms),
    });
  }

  private registerEventHandlers(socket: AuthenticatedSocket): void {
    // Appointment events
    appointmentHandler.register(socket, this.io!);
    
    // Availability events
    availabilityHandler.register(socket, this.io!);
    
    // Notification events
    notificationHandler.register(socket, this.io!);
  }

  private handleRoomManagement(socket: AuthenticatedSocket): void {
    // Join branch room
    socket.on('join_branch_room', (data: { branchId: string }) => {
      if (data.branchId) {
        socket.join(`branch_${data.branchId}`);
        socket.emit('room_joined', {
          room: `branch_${data.branchId}`,
          success: true,
          timestamp: new Date().toISOString(),
        });
        logger.debug(`Socket ${socket.id} joined branch room: branch_${data.branchId}`);
      }
    });

    // Join staff room
    socket.on('join_staff_room', (data: { staffId: string }) => {
      if (data.staffId) {
        socket.join(`staff_${data.staffId}`);
        socket.emit('room_joined', {
          room: `staff_${data.staffId}`,
          success: true,
          timestamp: new Date().toISOString(),
        });
        logger.debug(`Socket ${socket.id} joined staff room: staff_${data.staffId}`);
      }
    });

    // Leave room
    socket.on('leave_room', (data: { room: string }) => {
      if (data.room) {
        socket.leave(data.room);
        socket.emit('room_left', {
          room: data.room,
          success: true,
          timestamp: new Date().toISOString(),
        });
        logger.debug(`Socket ${socket.id} left room: ${data.room}`);
      }
    });
  }

  // Public methods for broadcasting events
  public broadcastToCompany(companyId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast');
      return;
    }

    this.io.to(`company_${companyId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastToBranch(branchId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast');
      return;
    }

    this.io.to(`branch_${branchId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast');
      return;
    }

    this.io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastToRole(role: string, companyId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast');
      return;
    }

    this.io.to(`role_${role}_${companyId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastToStaff(staffId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast');
      return;
    }

    this.io.to(`staff_${staffId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public getConnectionCount(companyId?: string): number {
    if (!this.io) return 0;

    if (companyId) {
      return this.io.sockets.adapter.rooms.get(`company_${companyId}`)?.size || 0;
    }

    return this.connectedClients.size;
  }

  public isRunning(): boolean {
    return this.io !== null;
  }

  public close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.connectedClients.clear();
      logger.info('WebSocket server closed');
    }
  }
}

export const webSocketServer = new WebSocketServer();