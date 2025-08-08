import io, { Socket } from 'socket.io-client';
import { Appointment, AppointmentFilter } from './handlers/appointment.handler';
import { Client, ClientFilter } from './handlers/client.handler';
import { Staff, StaffFilter } from './handlers/staff.handler';
import { Notification } from './handlers/notification.handler';

export interface RealtimeClientOptions {
  url: string;
  token: string;
  autoReconnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}

export class RealtimeClient {
  private socket: Socket | null = null;
  private options: RealtimeClientOptions;
  private status: ConnectionStatus = {
    connected: false,
    connecting: false,
    reconnectAttempts: 0
  };
  
  private listeners: Map<string, Set<Function>> = new Map();
  private subscriptions: Set<string> = new Set();

  constructor(options: RealtimeClientOptions) {
    this.options = {
      autoReconnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...options
    };
  }

  // Connection management
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.status.connecting = true;
      this.status.error = undefined;

      this.socket = io(this.options.url, {
        auth: {
          token: this.options.token
        },
        autoConnect: true,
        reconnection: this.options.autoReconnect,
        reconnectionAttempts: this.options.reconnectionAttempts,
        reconnectionDelay: this.options.reconnectionDelay,
        transports: ['websocket', 'polling']
      });

      // Connection events
      this.socket.on('connect', () => {
        this.status.connected = true;
        this.status.connecting = false;
        this.status.lastConnected = new Date();
        this.status.reconnectAttempts = 0;
        
        this.emit('connection:established', { status: this.status });
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.status.connected = false;
        this.status.connecting = false;
        this.status.error = error.message;
        this.status.reconnectAttempts++;
        
        this.emit('connection:error', { error: error.message, attempts: this.status.reconnectAttempts });
        reject(new Error(`Connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', (reason) => {
        this.status.connected = false;
        this.status.connecting = false;
        
        this.emit('connection:lost', { reason, status: this.status });
      });

      this.socket.on('reconnect', (attemptNumber) => {
        this.status.connected = true;
        this.status.connecting = false;
        
        this.emit('connection:restored', { attempts: attemptNumber, status: this.status });
        this.resubscribeAll();
      });

      // Server events
      this.socket.on('connected', (data) => {
        this.emit('server:ready', data);
      });

      this.socket.on('error', (error) => {
        this.emit('server:error', error);
      });

      // Setup event forwarding
      this.setupEventForwarding();
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.status.connected = false;
    this.status.connecting = false;
    this.subscriptions.clear();
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  // Event subscription methods
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Appointment subscriptions
  public subscribeToAppointments(filters: AppointmentFilter = {}): void {
    this.ensureConnected();
    this.socket!.emit('appointments:subscribe', filters);
    this.subscriptions.add('appointments');
  }

  public unsubscribeFromAppointments(): void {
    this.ensureConnected();
    this.socket!.emit('appointments:unsubscribe');
    this.subscriptions.delete('appointments');
  }

  public subscribeToStaffAppointments(staffId: string): void {
    this.ensureConnected();
    this.socket!.emit('staff-appointments:subscribe', staffId);
    this.subscriptions.add(`staff-appointments:${staffId}`);
  }

  public subscribeToClientAppointments(clientId: string): void {
    this.ensureConnected();
    this.socket!.emit('client-appointments:subscribe', clientId);
    this.subscriptions.add(`client-appointments:${clientId}`);
  }

  // Appointment event listeners
  public onAppointmentCreated(callback: (appointment: Appointment) => void): void {
    this.on('appointment:created', callback);
  }

  public onAppointmentUpdated(callback: (appointment: Appointment) => void): void {
    this.on('appointment:updated', callback);
  }

  public onAppointmentCancelled(callback: (data: any) => void): void {
    this.on('appointment:cancelled', callback);
  }

  public onAppointmentStatusChanged(callback: (data: any) => void): void {
    this.on('appointment:status-changed', callback);
  }

  public onAvailabilityChanged(callback: (data: any) => void): void {
    this.on('availability:changed', callback);
  }

  // Client subscriptions
  public subscribeToClients(filters: ClientFilter = {}): void {
    this.ensureConnected();
    this.socket!.emit('clients:subscribe', filters);
    this.subscriptions.add('clients');
  }

  public unsubscribeFromClients(): void {
    this.ensureConnected();
    this.socket!.emit('clients:unsubscribe');
    this.subscriptions.delete('clients');
  }

  // Client event listeners
  public onClientCreated(callback: (client: Client) => void): void {
    this.on('client:created', callback);
  }

  public onClientUpdated(callback: (client: Client) => void): void {
    this.on('client:updated', callback);
  }

  public onClientDeleted(callback: (data: any) => void): void {
    this.on('client:deleted', callback);
  }

  public onClientCheckedIn(callback: (data: any) => void): void {
    this.on('client:checked-in', callback);
  }

  public onClientCheckedOut(callback: (data: any) => void): void {
    this.on('client:checked-out', callback);
  }

  // Staff subscriptions
  public subscribeToStaff(filters: StaffFilter = {}): void {
    this.ensureConnected();
    this.socket!.emit('staff:subscribe', filters);
    this.subscriptions.add('staff');
  }

  public unsubscribeFromStaff(): void {
    this.ensureConnected();
    this.socket!.emit('staff:unsubscribe');
    this.subscriptions.delete('staff');
  }

  public subscribeToStaffAvailability(staffId: string): void {
    this.ensureConnected();
    this.socket!.emit('staff-availability:subscribe', staffId);
    this.subscriptions.add(`staff-availability:${staffId}`);
  }

  // Staff event listeners
  public onStaffCreated(callback: (staff: Staff) => void): void {
    this.on('staff:created', callback);
  }

  public onStaffUpdated(callback: (staff: Staff) => void): void {
    this.on('staff:updated', callback);
  }

  public onStaffStatusChanged(callback: (data: any) => void): void {
    this.on('staff:status-changed', callback);
  }

  public onStaffCheckedIn(callback: (data: any) => void): void {
    this.on('staff:checked-in', callback);
  }

  public onStaffCheckedOut(callback: (data: any) => void): void {
    this.on('staff:checked-out', callback);
  }

  // Notification subscriptions
  public subscribeToNotifications(): void {
    this.ensureConnected();
    this.socket!.emit('notifications:subscribe');
    this.subscriptions.add('notifications');
  }

  public markNotificationAsRead(notificationId: string): void {
    this.ensureConnected();
    this.socket!.emit('notifications:mark-read', notificationId);
  }

  // Notification event listeners
  public onNotification(callback: (notification: Notification) => void): void {
    this.on('notification:new', callback);
  }

  public onNotificationRead(callback: (data: any) => void): void {
    this.on('notification:marked-read', callback);
  }

  public onBulkNotifications(callback: (data: { notifications: Notification[]; count: number }) => void): void {
    this.on('notifications:bulk', callback);
  }

  public onBroadcastMessage(callback: (message: any) => void): void {
    this.on('broadcast:message', callback);
  }

  public onPushNotification(callback: (data: any) => void): void {
    this.on('push-notification', callback);
  }

  // Room management
  public joinRoom(room: string): void {
    this.ensureConnected();
    this.socket!.emit('join-room', room);
  }

  public leaveRoom(room: string): void {
    this.ensureConnected();
    this.socket!.emit('leave-room', room);
  }

  // Utility methods
  private ensureConnected(): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected. Call connect() first.');
    }
  }

  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Appointment events
    this.socket.on('appointment:created', (data) => this.emit('appointment:created', data));
    this.socket.on('appointment:updated', (data) => this.emit('appointment:updated', data));
    this.socket.on('appointment:cancelled', (data) => this.emit('appointment:cancelled', data));
    this.socket.on('appointment:status-changed', (data) => this.emit('appointment:status-changed', data));
    this.socket.on('availability:changed', (data) => this.emit('availability:changed', data));

    // Client events
    this.socket.on('client:created', (data) => this.emit('client:created', data));
    this.socket.on('client:updated', (data) => this.emit('client:updated', data));
    this.socket.on('client:deleted', (data) => this.emit('client:deleted', data));
    this.socket.on('client:checked-in', (data) => this.emit('client:checked-in', data));
    this.socket.on('client:checked-out', (data) => this.emit('client:checked-out', data));

    // Staff events
    this.socket.on('staff:created', (data) => this.emit('staff:created', data));
    this.socket.on('staff:updated', (data) => this.emit('staff:updated', data));
    this.socket.on('staff:status-changed', (data) => this.emit('staff:status-changed', data));
    this.socket.on('staff:checked-in', (data) => this.emit('staff:checked-in', data));
    this.socket.on('staff:checked-out', (data) => this.emit('staff:checked-out', data));

    // Notification events
    this.socket.on('notification:new', (data) => this.emit('notification:new', data));
    this.socket.on('notification:marked-read', (data) => this.emit('notification:marked-read', data));
    this.socket.on('notifications:bulk', (data) => this.emit('notifications:bulk', data));
    this.socket.on('broadcast:message', (data) => this.emit('broadcast:message', data));
    this.socket.on('push-notification', (data) => this.emit('push-notification', data));

    // System events
    this.socket.on('system:alert', (data) => this.emit('system:alert', data));

    // Room events
    this.socket.on('room-joined', (data) => this.emit('room:joined', data));
    this.socket.on('room-left', (data) => this.emit('room:left', data));
  }

  private resubscribeAll(): void {
    // Re-establish all subscriptions after reconnection
    this.subscriptions.forEach(subscription => {
      const [type, id] = subscription.split(':');
      
      switch (type) {
        case 'appointments':
          this.socket!.emit('appointments:subscribe', {});
          break;
        case 'clients':
          this.socket!.emit('clients:subscribe', {});
          break;
        case 'staff':
          this.socket!.emit('staff:subscribe', {});
          break;
        case 'notifications':
          this.socket!.emit('notifications:subscribe');
          break;
        case 'staff-appointments':
          if (id) this.socket!.emit('staff-appointments:subscribe', id);
          break;
        case 'client-appointments':
          if (id) this.socket!.emit('client-appointments:subscribe', id);
          break;
        case 'staff-availability':
          if (id) this.socket!.emit('staff-availability:subscribe', id);
          break;
      }
    });
  }

  // Debugging and monitoring
  public getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  public getEventListeners(): string[] {
    return Array.from(this.listeners.keys());
  }

  public enableDebugMode(): void {
    if (this.socket) {
      this.socket.on('connect', () => console.log('🔌 WebSocket connected'));
      this.socket.on('disconnect', (reason) => console.log('❌ WebSocket disconnected:', reason));
      this.socket.on('connect_error', (error) => console.error('🚨 Connection error:', error));
      this.socket.on('reconnect', (attempt) => console.log('🔄 WebSocket reconnected after', attempt, 'attempts'));
    }
  }
}

// Factory function for easier instantiation
export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  return new RealtimeClient(options);
}

// React hook-compatible types (for frontend integration)
export interface UseRealtimeOptions extends RealtimeClientOptions {
  autoConnect?: boolean;
}

// Export types for frontend usage
export type {
  Appointment,
  AppointmentFilter,
  Client,
  ClientFilter,
  Staff,
  StaffFilter,
  Notification,
  ConnectionStatus
};