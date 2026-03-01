import { useEffect, useRef, useCallback, useState } from 'react';
import { socketService, type WebSocketEvent } from './socket.service';
import type { 
  AppointmentUpdateEvent, 
  ClientUpdateEvent, 
  StaffUpdateEvent, 
  ServiceUpdateEvent,
  InventoryUpdateEvent,
  NotificationEvent
} from './socket.service';

// =========================== WEBSOCKET HOOK ===========================

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: string) => void;
  onReconnect?: () => void;
}

export interface WebSocketState {
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  error: string | null;
}

/**
 * Main WebSocket hook for connection management
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onReconnect
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    connectionState: 'disconnected',
    reconnectAttempts: 0,
    error: null,
  });

  const hasInitialized = useRef(false);

  // Update state based on socket service
  const updateState = useCallback(() => {
    const stats = socketService.getStats();
    setState({
      isConnected: stats.connected,
      connectionState: stats.connectionState,
      reconnectAttempts: stats.reconnectAttempts,
      error: null,
    });
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async (token: string, companyId: string, userId: string, branchId?: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await socketService.connect(token, companyId, userId, branchId);
      updateState();
      onConnect?.();
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      onError?.(error.message);
    }
  }, [updateState, onConnect, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    updateState();
  }, [updateState]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    socketService.reconnect();
    onReconnect?.();
  }, [onReconnect]);

  // Update context
  const updateContext = useCallback((companyId?: string, userId?: string, branchId?: string) => {
    socketService.updateContext(companyId, userId, branchId);
  }, []);

  // Set up connection event listeners
  useEffect(() => {
    const unsubscribe = socketService.onConnectionChange((data: any) => {
      updateState();
      
      if (data.reason) {
        onDisconnect?.(data.reason);
      }
      
      if (data.error) {
        setState(prev => ({ ...prev, error: data.error }));
        onError?.(data.error);
      }
    });

    return unsubscribe;
  }, [updateState, onDisconnect, onError]);

  // Initialize state
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      updateState();
    }
  }, [updateState]);

  return {
    state,
    connect,
    disconnect,
    reconnect,
    updateContext,
    isConnected: state.isConnected,
    connectionState: state.connectionState,
    error: state.error,
  };
}

// =========================== SPECIFIC EVENT HOOKS ===========================

/**
 * Hook for listening to appointment updates
 */
export function useAppointmentUpdates(
  callback: (appointment: AppointmentUpdateEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const unsubscribe = socketService.onAppointmentUpdate(callback);
    return unsubscribe;
  }, dependencies);
}

/**
 * Hook for listening to specific appointment events
 */
export function useAppointmentEvents(callbacks: {
  onCreate?: (appointment: AppointmentUpdateEvent) => void;
  onUpdate?: (appointment: AppointmentUpdateEvent) => void;
  onCancel?: (appointment: AppointmentUpdateEvent) => void;
}) {
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    if (callbacks.onCreate) {
      unsubscribes.push(socketService.onAppointmentCreated(callbacks.onCreate));
    }

    if (callbacks.onUpdate) {
      unsubscribes.push(socketService.onAppointmentUpdate(callbacks.onUpdate));
    }

    if (callbacks.onCancel) {
      unsubscribes.push(socketService.onAppointmentCancelled(callbacks.onCancel));
    }

    return () => {
      unsubscribes.forEach(fn => fn());
    };
  }, [callbacks.onCreate, callbacks.onUpdate, callbacks.onCancel]);
}

/**
 * Hook for listening to client updates
 */
export function useClientUpdates(
  callback: (client: ClientUpdateEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const unsubscribe = socketService.onClientUpdate(callback);
    return unsubscribe;
  }, dependencies);
}

/**
 * Hook for listening to staff updates
 */
export function useStaffUpdates(
  callback: (staff: StaffUpdateEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const unsubscribe = socketService.onStaffUpdate(callback);
    return unsubscribe;
  }, dependencies);
}

/**
 * Hook for listening to service updates
 */
export function useServiceUpdates(
  callback: (service: ServiceUpdateEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const unsubscribe = socketService.onServiceUpdate(callback);
    return unsubscribe;
  }, dependencies);
}

/**
 * Hook for listening to inventory updates
 */
export function useInventoryUpdates(
  callback: (inventory: InventoryUpdateEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const unsubscribe = socketService.onInventoryUpdate(callback);
    return unsubscribe;
  }, dependencies);
}

/**
 * Hook for listening to low stock alerts
 */
export function useLowStockAlerts(
  callback: (alert: InventoryUpdateEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const unsubscribe = socketService.onLowStockAlert(callback);
    return unsubscribe;
  }, dependencies);
}

/**
 * Hook for listening to notifications
 */
export function useNotifications(
  callback: (notification: NotificationEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const unsubscribe = socketService.onNotification(callback);
    return unsubscribe;
  }, dependencies);
}

// =========================== REAL-TIME DATA HOOKS ===========================

/**
 * Hook for real-time appointment list updates
 */
export function useRealTimeAppointments(initialAppointments: any[] = []) {
  const [appointments, setAppointments] = useState(initialAppointments);

  useAppointmentUpdates(useCallback((event: AppointmentUpdateEvent) => {
    setAppointments(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(apt => apt.id === event.appointment.id);
      
      if (event.type === 'appointment:created' && existingIndex === -1) {
        // Add new appointment
        updated.push(event.appointment);
      } else if (existingIndex !== -1) {
        if (event.type === 'appointment:cancelled') {
          // Update status or remove cancelled appointments
          updated[existingIndex] = { ...updated[existingIndex], status: 'cancelled' };
        } else {
          // Update existing appointment
          updated[existingIndex] = { ...updated[existingIndex], ...event.appointment };
        }
      }
      
      return updated;
    });
  }, []));

  return appointments;
}

/**
 * Hook for real-time client list updates
 */
export function useRealTimeClients(initialClients: any[] = []) {
  const [clients, setClients] = useState(initialClients);

  useClientUpdates(useCallback((event: ClientUpdateEvent) => {
    setClients(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(client => client.id === event.client.id);
      
      if (event.type === 'client:created' && existingIndex === -1) {
        // Add new client
        updated.push(event.client);
      } else if (existingIndex !== -1) {
        if (event.type === 'client:deleted') {
          // Remove deleted client
          updated.splice(existingIndex, 1);
        } else {
          // Update existing client
          updated[existingIndex] = { ...updated[existingIndex], ...event.client };
        }
      }
      
      return updated;
    });
  }, []));

  return clients;
}

/**
 * Hook for real-time notification management
 */
export function useRealTimeNotifications(maxNotifications = 50) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useNotifications(useCallback((notification: NotificationEvent) => {
    setNotifications(prev => {
      const updated = [notification, ...prev];
      // Keep only the latest notifications
      return updated.slice(0, maxNotifications);
    });
  }, [maxNotifications]));

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.notification.id !== id));
  }, []);

  return {
    notifications,
    clearNotifications,
    removeNotification,
  };
}

// =========================== UTILITY HOOKS ===========================

/**
 * Hook for WebSocket connection status with automatic reconnection
 */
export function useWebSocketHealth() {
  const [health, setHealth] = useState({
    isHealthy: false,
    lastCheck: null as Date | null,
    consecutiveFailures: 0,
  });

  const checkHealth = useCallback(() => {
    const stats = socketService.getStats();
    const isHealthy = stats.connected;
    
    setHealth(prev => ({
      isHealthy,
      lastCheck: new Date(),
      consecutiveFailures: isHealthy ? 0 : prev.consecutiveFailures + 1,
    }));

    return isHealthy;
  }, []);

  // Periodic health check
  useEffect(() => {
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds
    checkHealth(); // Initial check

    return () => clearInterval(interval);
  }, [checkHealth]);

  // Auto-reconnect after consecutive failures
  useEffect(() => {
    if (health.consecutiveFailures >= 3) {
      console.log('Auto-reconnecting due to consecutive failures');
      socketService.reconnect();
    }
  }, [health.consecutiveFailures]);

  return health;
}

/**
 * Hook for debugging WebSocket state
 */
export function useWebSocketDebug() {
  const [stats, setStats] = useState(() => socketService.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(socketService.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}