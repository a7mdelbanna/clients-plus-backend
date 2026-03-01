import { io, Socket } from 'socket.io-client';

// =========================== EVENT INTERFACES ===========================

export interface AppointmentUpdateEvent {
  type: 'appointment:created' | 'appointment:updated' | 'appointment:cancelled' | 'appointment:completed';
  appointment: {
    id: string;
    clientId: string;
    clientName: string;
    staffId: string;
    staffName: string;
    serviceId: string;
    serviceName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    branchId?: string;
  };
  companyId: string;
  branchId?: string;
  timestamp: string;
}

export interface ClientUpdateEvent {
  type: 'client:created' | 'client:updated' | 'client:deleted';
  client: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    status: string;
  };
  companyId: string;
  branchId?: string;
  timestamp: string;
}

export interface StaffUpdateEvent {
  type: 'staff:created' | 'staff:updated' | 'staff:deleted' | 'staff:schedule_changed';
  staff: {
    id: string;
    name: string;
    status: string;
    branchIds?: string[];
  };
  companyId: string;
  branchId?: string;
  timestamp: string;
}

export interface ServiceUpdateEvent {
  type: 'service:created' | 'service:updated' | 'service:deleted';
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
    active: boolean;
  };
  companyId: string;
  branchId?: string;
  timestamp: string;
}

export interface InventoryUpdateEvent {
  type: 'inventory:low_stock' | 'inventory:out_of_stock' | 'inventory:updated';
  product: {
    id: string;
    name: string;
    sku?: string;
    currentStock: number;
    threshold?: number;
  };
  branch: {
    id: string;
    name: string;
  };
  companyId: string;
  timestamp: string;
}

export interface NotificationEvent {
  type: 'notification:new' | 'notification:reminder';
  notification: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    action?: {
      label: string;
      url: string;
    };
  };
  companyId: string;
  userId?: string;
  timestamp: string;
}

// Union type for all possible events
export type WebSocketEvent = 
  | AppointmentUpdateEvent 
  | ClientUpdateEvent 
  | StaffUpdateEvent 
  | ServiceUpdateEvent 
  | InventoryUpdateEvent 
  | NotificationEvent;

// =========================== CONNECTION CONFIGURATION ===========================

export interface SocketConfig {
  url: string;
  reconnection: boolean;
  reconnectionDelay: number;
  reconnectionAttempts: number;
  timeout: number;
  forceNew: boolean;
  autoConnect: boolean;
}

const DEFAULT_CONFIG: SocketConfig = {
  url: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
  forceNew: false,
  autoConnect: false,
};

// =========================== WEBSOCKET SERVICE CLASS ===========================

export class SocketService {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private isConnecting = false;
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private companyId: string | null = null;
  private userId: string | null = null;
  private branchId: string | null = null;

  // Connection state
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error' = 'disconnected';

  constructor(customConfig?: Partial<SocketConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    this.maxReconnectAttempts = this.config.reconnectionAttempts;
    
    console.log('Socket service initialized with config:', this.config);
  }

  // =========================== CONNECTION MANAGEMENT ===========================

  /**
   * Connect to the WebSocket server with authentication
   */
  async connect(token: string, companyId: string, userId: string, branchId?: string): Promise<void> {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('Connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';
    this.companyId = companyId;
    this.userId = userId;
    this.branchId = branchId;

    try {
      console.log('Connecting to WebSocket server:', this.config.url);

      this.socket = io(this.config.url, {
        auth: {
          token,
          companyId,
          userId,
          branchId,
        },
        reconnection: this.config.reconnection,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionAttempts: this.config.reconnectionAttempts,
        timeout: this.config.timeout,
        forceNew: this.config.forceNew,
        autoConnect: false, // We'll connect manually
      });

      // Set up connection event handlers
      this.setupConnectionHandlers();

      // Set up business event handlers
      this.setupBusinessEventHandlers();

      // Actually connect
      this.socket.connect();

      // Wait for successful connection
      await this.waitForConnection();

      console.log('WebSocket connected successfully');
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.connectionState = 'error';
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from WebSocket server');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
  }

  /**
   * Check if socket is connected and authenticated
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected && this.isAuthenticated;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  // =========================== EVENT HANDLERS SETUP ===========================

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected to server');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
    });

    this.socket.on('authenticated', () => {
      console.log('WebSocket authenticated successfully');
      this.isAuthenticated = true;
      this.isConnecting = false;
      this.connectionState = 'authenticated';
      
      // Join company and branch rooms
      if (this.companyId) {
        this.socket?.emit('join:company', this.companyId);
      }
      
      if (this.branchId) {
        this.socket?.emit('join:branch', this.branchId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isAuthenticated = false;
      this.connectionState = 'disconnected';
      
      // Emit disconnect event to listeners
      this.emitToListeners('connection:disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionState = 'error';
      this.isConnecting = false;
      
      // Emit error event to listeners
      this.emitToListeners('connection:error', { error: error.message });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.connectionState = 'connected';
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket reconnection attempt ${attemptNumber}`);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket failed to reconnect after maximum attempts');
      this.connectionState = 'error';
      this.emitToListeners('connection:failed', { attempts: this.maxReconnectAttempts });
    });
  }

  private setupBusinessEventHandlers(): void {
    if (!this.socket) return;

    // Appointment events
    this.socket.on('appointment:created', (data: AppointmentUpdateEvent) => {
      console.log('Appointment created:', data);
      this.emitToListeners('appointment:created', data);
      this.emitToListeners('appointment:updated', data); // For generic listeners
    });

    this.socket.on('appointment:updated', (data: AppointmentUpdateEvent) => {
      console.log('Appointment updated:', data);
      this.emitToListeners('appointment:updated', data);
    });

    this.socket.on('appointment:cancelled', (data: AppointmentUpdateEvent) => {
      console.log('Appointment cancelled:', data);
      this.emitToListeners('appointment:cancelled', data);
      this.emitToListeners('appointment:updated', data); // For generic listeners
    });

    this.socket.on('appointment:completed', (data: AppointmentUpdateEvent) => {
      console.log('Appointment completed:', data);
      this.emitToListeners('appointment:completed', data);
      this.emitToListeners('appointment:updated', data); // For generic listeners
    });

    // Client events
    this.socket.on('client:created', (data: ClientUpdateEvent) => {
      console.log('Client created:', data);
      this.emitToListeners('client:created', data);
      this.emitToListeners('client:updated', data); // For generic listeners
    });

    this.socket.on('client:updated', (data: ClientUpdateEvent) => {
      console.log('Client updated:', data);
      this.emitToListeners('client:updated', data);
    });

    this.socket.on('client:deleted', (data: ClientUpdateEvent) => {
      console.log('Client deleted:', data);
      this.emitToListeners('client:deleted', data);
      this.emitToListeners('client:updated', data); // For generic listeners
    });

    // Staff events
    this.socket.on('staff:created', (data: StaffUpdateEvent) => {
      console.log('Staff created:', data);
      this.emitToListeners('staff:created', data);
      this.emitToListeners('staff:updated', data); // For generic listeners
    });

    this.socket.on('staff:updated', (data: StaffUpdateEvent) => {
      console.log('Staff updated:', data);
      this.emitToListeners('staff:updated', data);
    });

    this.socket.on('staff:schedule_changed', (data: StaffUpdateEvent) => {
      console.log('Staff schedule changed:', data);
      this.emitToListeners('staff:schedule_changed', data);
      this.emitToListeners('staff:updated', data); // For generic listeners
    });

    // Service events
    this.socket.on('service:created', (data: ServiceUpdateEvent) => {
      console.log('Service created:', data);
      this.emitToListeners('service:created', data);
      this.emitToListeners('service:updated', data); // For generic listeners
    });

    this.socket.on('service:updated', (data: ServiceUpdateEvent) => {
      console.log('Service updated:', data);
      this.emitToListeners('service:updated', data);
    });

    // Inventory events
    this.socket.on('inventory:low_stock', (data: InventoryUpdateEvent) => {
      console.log('Low stock alert:', data);
      this.emitToListeners('inventory:low_stock', data);
      this.emitToListeners('inventory:updated', data); // For generic listeners
    });

    this.socket.on('inventory:out_of_stock', (data: InventoryUpdateEvent) => {
      console.log('Out of stock alert:', data);
      this.emitToListeners('inventory:out_of_stock', data);
      this.emitToListeners('inventory:updated', data); // For generic listeners
    });

    // Notification events
    this.socket.on('notification:new', (data: NotificationEvent) => {
      console.log('New notification:', data);
      this.emitToListeners('notification:new', data);
    });
  }

  // =========================== EVENT SUBSCRIPTION API ===========================

  /**
   * Subscribe to appointment updates
   */
  onAppointmentUpdate(callback: (data: AppointmentUpdateEvent) => void): () => void {
    return this.addEventListener('appointment:updated', callback);
  }

  /**
   * Subscribe to specific appointment events
   */
  onAppointmentCreated(callback: (data: AppointmentUpdateEvent) => void): () => void {
    return this.addEventListener('appointment:created', callback);
  }

  onAppointmentCancelled(callback: (data: AppointmentUpdateEvent) => void): () => void {
    return this.addEventListener('appointment:cancelled', callback);
  }

  /**
   * Subscribe to client updates
   */
  onClientUpdate(callback: (data: ClientUpdateEvent) => void): () => void {
    return this.addEventListener('client:updated', callback);
  }

  /**
   * Subscribe to staff updates
   */
  onStaffUpdate(callback: (data: StaffUpdateEvent) => void): () => void {
    return this.addEventListener('staff:updated', callback);
  }

  /**
   * Subscribe to service updates
   */
  onServiceUpdate(callback: (data: ServiceUpdateEvent) => void): () => void {
    return this.addEventListener('service:updated', callback);
  }

  /**
   * Subscribe to inventory updates
   */
  onInventoryUpdate(callback: (data: InventoryUpdateEvent) => void): () => void {
    return this.addEventListener('inventory:updated', callback);
  }

  /**
   * Subscribe to low stock alerts
   */
  onLowStockAlert(callback: (data: InventoryUpdateEvent) => void): () => void {
    return this.addEventListener('inventory:low_stock', callback);
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (data: NotificationEvent) => void): () => void {
    return this.addEventListener('notification:new', callback);
  }

  /**
   * Subscribe to connection events
   */
  onConnectionChange(callback: (data: any) => void): () => void {
    const unsubscribeFns = [
      this.addEventListener('connection:disconnected', callback),
      this.addEventListener('connection:error', callback),
      this.addEventListener('connection:failed', callback),
    ];

    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }

  // =========================== GENERIC EVENT MANAGEMENT ===========================

  /**
   * Add event listener for any event type
   */
  addEventListener(eventType: string, callback: Function): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.removeEventListener(eventType, callback);
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventListeners.clear();
  }

  /**
   * Remove all listeners for a specific event type
   */
  off(eventType: string): void {
    this.eventListeners.delete(eventType);
  }

  // =========================== UTILITY METHODS ===========================

  private async waitForConnection(timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (this.isAuthenticated) {
          resolve();
        } else if (this.connectionState === 'error') {
          reject(new Error('Connection failed'));
        }
      };

      // Check immediately
      checkConnection();

      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      // Check periodically
      const intervalId = setInterval(() => {
        checkConnection();
        if (this.isAuthenticated || this.connectionState === 'error') {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }
      }, 100);
    });
  }

  private emitToListeners(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connected: this.isConnected(),
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      activeListeners: Array.from(this.eventListeners.keys()).reduce((acc, key) => {
        acc[key] = this.eventListeners.get(key)?.size || 0;
        return acc;
      }, {} as Record<string, number>),
      companyId: this.companyId,
      userId: this.userId,
      branchId: this.branchId,
    };
  }

  /**
   * Manually trigger a reconnection
   */
  reconnect(): void {
    if (this.socket) {
      console.log('Manually triggering WebSocket reconnection');
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  /**
   * Update user context (when user switches branches, etc.)
   */
  updateContext(companyId?: string, userId?: string, branchId?: string): void {
    if (companyId) this.companyId = companyId;
    if (userId) this.userId = userId;
    if (branchId !== undefined) this.branchId = branchId;

    // Re-join rooms if connected
    if (this.isConnected()) {
      if (this.companyId) {
        this.socket?.emit('join:company', this.companyId);
      }
      
      if (this.branchId) {
        this.socket?.emit('join:branch', this.branchId);
      } else {
        this.socket?.emit('leave:branch');
      }
    }
  }
}

// =========================== SINGLETON INSTANCE ===========================

// Create singleton instance
export const socketService = new SocketService();

// Export default
export default socketService;