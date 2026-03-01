/**
 * WebSocket Services
 * Real-time communication layer for the dashboard application
 */

// Core WebSocket service
export { socketService, SocketService } from './socket.service';
export type {
  AppointmentUpdateEvent,
  ClientUpdateEvent,
  StaffUpdateEvent,
  ServiceUpdateEvent,
  InventoryUpdateEvent,
  NotificationEvent,
  WebSocketEvent,
  SocketConfig,
} from './socket.service';

// React hooks for WebSocket integration
export {
  useWebSocket,
  useAppointmentUpdates,
  useAppointmentEvents,
  useClientUpdates,
  useStaffUpdates,
  useServiceUpdates,
  useInventoryUpdates,
  useLowStockAlerts,
  useNotifications,
  useRealTimeAppointments,
  useRealTimeClients,
  useRealTimeNotifications,
  useWebSocketHealth,
  useWebSocketDebug,
} from './useWebSocket';

export type {
  UseWebSocketOptions,
  WebSocketState,
} from './useWebSocket';

// Default export
export { socketService as default } from './socket.service';