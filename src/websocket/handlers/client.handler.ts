import { Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { WebSocketServer } from '../socket.server';

export interface ClientFilter {
  branchId?: string;
  status?: string[];
  tags?: string[];
  search?: string;
}

export interface Client {
  id: string;
  companyId: string;
  branchId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastVisit?: Date;
  totalVisits: number;
  totalSpent: number;
  preferences?: Record<string, any>;
}

export class ClientSocketHandler {
  private subscriptions: Map<string, ClientFilter> = new Map();

  constructor(private socketServer: WebSocketServer) {}

  public handleSubscription(socket: Socket, filters: ClientFilter = {}): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Store subscription filters
      this.subscriptions.set(socket.id, filters);

      // Join relevant rooms based on filters
      if (filters.branchId) {
        socket.join(`branch:${filters.branchId}:clients`);
      } else {
        socket.join(`company:${companyId}:clients`);
      }

      socket.emit('clients:subscribed', {
        filters,
        message: 'Subscribed to client updates'
      });

      logger.info(`Socket ${socket.id} subscribed to clients with filters:`, filters);
    } catch (error) {
      logger.error('Error handling client subscription:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to clients',
        error: error.message
      });
    }
  }

  public handleUnsubscription(socket: Socket): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Remove from subscription tracking
      this.subscriptions.delete(socket.id);

      // Leave all client-related rooms
      socket.leave(`company:${companyId}:clients`);
      
      // Leave branch-specific rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.includes(':clients')) {
          socket.leave(room);
        }
      });

      socket.emit('clients:unsubscribed', {
        message: 'Unsubscribed from client updates'
      });

      logger.info(`Socket ${socket.id} unsubscribed from clients`);
    } catch (error) {
      logger.error('Error handling client unsubscription:', error);
    }
  }

  public handleDisconnection(socket: Socket): void {
    // Clean up subscriptions
    this.subscriptions.delete(socket.id);
  }

  // Methods to emit client events
  public handleClientCreated(client: Client): void {
    try {
      const { companyId, branchId } = client;

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:clients`,
        'client:created',
        client
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:clients`,
          'client:created',
          client
        );
      }

      // Emit to specific client room for future self-updates
      this.socketServer.emitToRoom(
        `client:${client.id}`,
        'client:created',
        client
      );

      logger.info(`Client created event emitted for client ${client.id}`);
    } catch (error) {
      logger.error('Error emitting client created event:', error);
    }
  }

  public handleClientUpdated(client: Client): void {
    try {
      const { companyId, branchId } = client;

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:clients`,
        'client:updated',
        client
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:clients`,
          'client:updated',
          client
        );
      }

      // Emit to specific client room
      this.socketServer.emitToRoom(
        `client:${client.id}`,
        'client:updated',
        client
      );

      logger.info(`Client updated event emitted for client ${client.id}`);
    } catch (error) {
      logger.error('Error emitting client updated event:', error);
    }
  }

  public handleClientDeleted(clientId: string, client: Partial<Client>): void {
    try {
      const { companyId, branchId } = client;

      const eventData = {
        id: clientId,
        deletedAt: new Date(),
        ...client
      };

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:clients`,
        'client:deleted',
        eventData
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:clients`,
          'client:deleted',
          eventData
        );
      }

      // Emit to specific client room
      this.socketServer.emitToRoom(
        `client:${clientId}`,
        'client:deleted',
        eventData
      );

      logger.info(`Client deleted event emitted for client ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client deleted event:', error);
    }
  }

  public handleClientStatusChange(clientId: string, status: string, client: Partial<Client>): void {
    try {
      const { companyId, branchId } = client;

      const eventData = {
        id: clientId,
        status,
        statusChangedAt: new Date(),
        ...client
      };

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:clients`,
        'client:status-changed',
        eventData
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:clients`,
          'client:status-changed',
          eventData
        );
      }

      // Emit to specific client room
      this.socketServer.emitToRoom(
        `client:${clientId}`,
        'client:status-changed',
        eventData
      );

      logger.info(`Client status change event emitted for client ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client status change event:', error);
    }
  }

  public handleClientCheckIn(clientId: string, client: Partial<Client>, appointmentId?: string): void {
    try {
      const { companyId, branchId } = client;

      const eventData = {
        id: clientId,
        checkedInAt: new Date(),
        appointmentId,
        ...client
      };

      // Emit to company for dashboard updates
      this.socketServer.emitToRoom(
        `company:${companyId}:clients`,
        'client:checked-in',
        eventData
      );

      // Emit to branch for reception desk
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:clients`,
          'client:checked-in',
          eventData
        );
      }

      // Emit to specific client room
      this.socketServer.emitToRoom(
        `client:${clientId}`,
        'client:checked-in',
        eventData
      );

      // If associated with an appointment, emit to appointment room
      if (appointmentId) {
        this.socketServer.emitToRoom(
          `appointment:${appointmentId}`,
          'client:checked-in',
          eventData
        );
      }

      logger.info(`Client check-in event emitted for client ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client check-in event:', error);
    }
  }

  public handleClientCheckOut(clientId: string, client: Partial<Client>, appointmentId?: string): void {
    try {
      const { companyId, branchId } = client;

      const eventData = {
        id: clientId,
        checkedOutAt: new Date(),
        appointmentId,
        ...client
      };

      // Emit to company for dashboard updates
      this.socketServer.emitToRoom(
        `company:${companyId}:clients`,
        'client:checked-out',
        eventData
      );

      // Emit to branch for reception desk
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:clients`,
          'client:checked-out',
          eventData
        );
      }

      // Emit to specific client room
      this.socketServer.emitToRoom(
        `client:${clientId}`,
        'client:checked-out',
        eventData
      );

      // If associated with an appointment, emit to appointment room
      if (appointmentId) {
        this.socketServer.emitToRoom(
          `appointment:${appointmentId}`,
          'client:checked-out',
          eventData
        );
      }

      logger.info(`Client check-out event emitted for client ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client check-out event:', error);
    }
  }

  public handleBulkClientUpdate(clients: Client[]): void {
    try {
      // Group clients by company for efficient emission
      const clientsByCompany = clients.reduce((acc, client) => {
        if (!acc[client.companyId]) {
          acc[client.companyId] = [];
        }
        acc[client.companyId].push(client);
        return acc;
      }, {} as Record<string, Client[]>);

      // Emit bulk updates to each company
      Object.entries(clientsByCompany).forEach(([companyId, companyClients]) => {
        this.socketServer.emitToRoom(
          `company:${companyId}:clients`,
          'clients:bulk-updated',
          {
            clients: companyClients,
            updatedAt: new Date()
          }
        );

        // Also emit to branch-specific rooms
        const clientsByBranch = companyClients.reduce((acc, client) => {
          if (client.branchId) {
            if (!acc[client.branchId]) {
              acc[client.branchId] = [];
            }
            acc[client.branchId].push(client);
          }
          return acc;
        }, {} as Record<string, Client[]>);

        Object.entries(clientsByBranch).forEach(([branchId, branchClients]) => {
          this.socketServer.emitToRoom(
            `branch:${branchId}:clients`,
            'clients:bulk-updated',
            {
              clients: branchClients,
              updatedAt: new Date()
            }
          );
        });
      });

      logger.info(`Bulk client update event emitted for ${clients.length} clients`);
    } catch (error) {
      logger.error('Error emitting bulk client update event:', error);
    }
  }

  public handleClientVisitUpdate(clientId: string, visitData: {
    totalVisits: number;
    lastVisit: Date;
    totalSpent?: number;
  }): void {
    try {
      const eventData = {
        id: clientId,
        visitUpdatedAt: new Date(),
        ...visitData
      };

      // Emit to specific client room
      this.socketServer.emitToRoom(
        `client:${clientId}`,
        'client:visit-updated',
        eventData
      );

      logger.info(`Client visit update event emitted for client ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client visit update event:', error);
    }
  }

  public handleClientPreferencesUpdate(clientId: string, preferences: Record<string, any>): void {
    try {
      const eventData = {
        id: clientId,
        preferences,
        preferencesUpdatedAt: new Date()
      };

      // Emit to specific client room
      this.socketServer.emitToRoom(
        `client:${clientId}`,
        'client:preferences-updated',
        eventData
      );

      logger.info(`Client preferences update event emitted for client ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client preferences update event:', error);
    }
  }

  // Utility methods for subscription management
  public getActiveSubscriptions(): Map<string, ClientFilter> {
    return this.subscriptions;
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  public getFilteredSubscriptions(companyId: string): Array<{ socketId: string; filters: ClientFilter }> {
    const result: Array<{ socketId: string; filters: ClientFilter }> = [];
    
    for (const [socketId, filters] of this.subscriptions.entries()) {
      // Note: In a real implementation, you'd need to validate company access
      result.push({ socketId, filters });
    }
    
    return result;
  }
}