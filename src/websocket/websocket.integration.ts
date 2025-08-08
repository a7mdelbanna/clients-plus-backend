import { webSocketServer } from './socket.server';
import { logger } from '../config/logger';
import { Appointment } from './handlers/appointment.handler';
import { Client } from './handlers/client.handler';
import { Staff } from './handlers/staff.handler';
import { Notification } from './handlers/notification.handler';

/**
 * WebSocket Integration Service
 * 
 * This service acts as a bridge between business services and the WebSocket server.
 * It handles emitting real-time events when data changes occur in the system.
 */
export class WebSocketIntegration {
  // Appointment Events
  public static emitAppointmentCreated(appointment: Appointment): void {
    try {
      webSocketServer.appointmentHandler.handleAppointmentCreated(appointment);
      logger.info(`WebSocket: Appointment created event emitted - ID: ${appointment.id}`);
    } catch (error) {
      logger.error('Error emitting appointment created event:', error);
    }
  }

  public static emitAppointmentUpdated(appointment: Appointment): void {
    try {
      webSocketServer.appointmentHandler.handleAppointmentUpdated(appointment);
      logger.info(`WebSocket: Appointment updated event emitted - ID: ${appointment.id}`);
    } catch (error) {
      logger.error('Error emitting appointment updated event:', error);
    }
  }

  public static emitAppointmentCancelled(appointmentId: string, appointment: Partial<Appointment>): void {
    try {
      webSocketServer.appointmentHandler.handleAppointmentCancelled(appointmentId, appointment);
      logger.info(`WebSocket: Appointment cancelled event emitted - ID: ${appointmentId}`);
    } catch (error) {
      logger.error('Error emitting appointment cancelled event:', error);
    }
  }

  public static emitAppointmentStatusChange(appointmentId: string, status: string, appointment: Partial<Appointment>): void {
    try {
      webSocketServer.appointmentHandler.handleAppointmentStatusChange(appointmentId, status, appointment);
      logger.info(`WebSocket: Appointment status changed event emitted - ID: ${appointmentId}, Status: ${status}`);
    } catch (error) {
      logger.error('Error emitting appointment status change event:', error);
    }
  }

  public static emitAvailabilityChange(staffId: string, companyId: string, availabilityData: any): void {
    try {
      webSocketServer.appointmentHandler.handleAvailabilityChange(staffId, companyId, availabilityData);
      logger.info(`WebSocket: Availability changed event emitted - Staff ID: ${staffId}`);
    } catch (error) {
      logger.error('Error emitting availability change event:', error);
    }
  }

  // Client Events
  public static emitClientCreated(client: Client): void {
    try {
      webSocketServer.clientHandler.handleClientCreated(client);
      logger.info(`WebSocket: Client created event emitted - ID: ${client.id}`);
    } catch (error) {
      logger.error('Error emitting client created event:', error);
    }
  }

  public static emitClientUpdated(client: Client): void {
    try {
      webSocketServer.clientHandler.handleClientUpdated(client);
      logger.info(`WebSocket: Client updated event emitted - ID: ${client.id}`);
    } catch (error) {
      logger.error('Error emitting client updated event:', error);
    }
  }

  public static emitClientDeleted(clientId: string, client: Partial<Client>): void {
    try {
      webSocketServer.clientHandler.handleClientDeleted(clientId, client);
      logger.info(`WebSocket: Client deleted event emitted - ID: ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client deleted event:', error);
    }
  }

  public static emitClientStatusChange(clientId: string, status: string, client: Partial<Client>): void {
    try {
      webSocketServer.clientHandler.handleClientStatusChange(clientId, status, client);
      logger.info(`WebSocket: Client status changed event emitted - ID: ${clientId}, Status: ${status}`);
    } catch (error) {
      logger.error('Error emitting client status change event:', error);
    }
  }

  public static emitClientCheckIn(clientId: string, client: Partial<Client>, appointmentId?: string): void {
    try {
      webSocketServer.clientHandler.handleClientCheckIn(clientId, client, appointmentId);
      logger.info(`WebSocket: Client check-in event emitted - ID: ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client check-in event:', error);
    }
  }

  public static emitClientCheckOut(clientId: string, client: Partial<Client>, appointmentId?: string): void {
    try {
      webSocketServer.clientHandler.handleClientCheckOut(clientId, client, appointmentId);
      logger.info(`WebSocket: Client check-out event emitted - ID: ${clientId}`);
    } catch (error) {
      logger.error('Error emitting client check-out event:', error);
    }
  }

  // Staff Events
  public static emitStaffCreated(staff: Staff): void {
    try {
      webSocketServer.staffHandler.handleStaffCreated(staff);
      logger.info(`WebSocket: Staff created event emitted - ID: ${staff.id}`);
    } catch (error) {
      logger.error('Error emitting staff created event:', error);
    }
  }

  public static emitStaffUpdated(staff: Staff): void {
    try {
      webSocketServer.staffHandler.handleStaffUpdated(staff);
      logger.info(`WebSocket: Staff updated event emitted - ID: ${staff.id}`);
    } catch (error) {
      logger.error('Error emitting staff updated event:', error);
    }
  }

  public static emitStaffDeleted(staffId: string, staff: Partial<Staff>): void {
    try {
      webSocketServer.staffHandler.handleStaffDeleted(staffId, staff);
      logger.info(`WebSocket: Staff deleted event emitted - ID: ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff deleted event:', error);
    }
  }

  public static emitStaffStatusChange(staffId: string, currentStatus: any, staff: Partial<Staff>): void {
    try {
      webSocketServer.staffHandler.handleStaffStatusChange(staffId, currentStatus, staff);
      logger.info(`WebSocket: Staff status changed event emitted - ID: ${staffId}, Status: ${currentStatus}`);
    } catch (error) {
      logger.error('Error emitting staff status change event:', error);
    }
  }

  public static emitStaffCheckIn(staffId: string, staff: Partial<Staff>): void {
    try {
      webSocketServer.staffHandler.handleStaffCheckIn(staffId, staff);
      logger.info(`WebSocket: Staff check-in event emitted - ID: ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff check-in event:', error);
    }
  }

  public static emitStaffCheckOut(staffId: string, staff: Partial<Staff>): void {
    try {
      webSocketServer.staffHandler.handleStaffCheckOut(staffId, staff);
      logger.info(`WebSocket: Staff check-out event emitted - ID: ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff check-out event:', error);
    }
  }

  // Notification Events
  public static sendNotification(userId: string, notification: Notification): void {
    try {
      webSocketServer.notificationHandler.sendNotification(userId, notification);
      logger.info(`WebSocket: Notification sent - User ID: ${userId}, Type: ${notification.type}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  public static broadcastToCompany(companyId: string, message: any): void {
    try {
      webSocketServer.notificationHandler.broadcastToCompany(companyId, message);
      logger.info(`WebSocket: Broadcast message sent to company ${companyId}`);
    } catch (error) {
      logger.error('Error broadcasting to company:', error);
    }
  }

  public static sendToRole(companyId: string, role: string, notification: Notification): void {
    try {
      webSocketServer.notificationHandler.sendToRole(companyId, role, notification);
      logger.info(`WebSocket: Role-specific notification sent - Company: ${companyId}, Role: ${role}`);
    } catch (error) {
      logger.error('Error sending role-specific notification:', error);
    }
  }

  public static sendAppointmentReminder(userId: string, appointmentData: any): void {
    try {
      webSocketServer.notificationHandler.sendAppointmentReminder(userId, appointmentData);
      logger.info(`WebSocket: Appointment reminder sent - User ID: ${userId}`);
    } catch (error) {
      logger.error('Error sending appointment reminder:', error);
    }
  }

  public static sendPaymentNotification(userId: string, paymentData: any, success: boolean): void {
    try {
      webSocketServer.notificationHandler.sendPaymentNotification(userId, paymentData, success);
      logger.info(`WebSocket: Payment notification sent - User ID: ${userId}, Success: ${success}`);
    } catch (error) {
      logger.error('Error sending payment notification:', error);
    }
  }

  public static sendInventoryAlert(companyId: string, inventoryData: any): void {
    try {
      webSocketServer.notificationHandler.sendInventoryAlert(companyId, inventoryData);
      logger.info(`WebSocket: Inventory alert sent - Company ID: ${companyId}`);
    } catch (error) {
      logger.error('Error sending inventory alert:', error);
    }
  }

  public static sendSystemAlert(message: string, priority?: any): void {
    try {
      webSocketServer.notificationHandler.sendSystemAlert(message, priority);
      logger.info(`WebSocket: System alert sent - Message: ${message}`);
    } catch (error) {
      logger.error('Error sending system alert:', error);
    }
  }

  public static sendSecurityAlert(companyId: string, alertData: any): void {
    try {
      webSocketServer.notificationHandler.sendSecurityAlert(companyId, alertData);
      logger.warn(`WebSocket: Security alert sent - Company ID: ${companyId}`);
    } catch (error) {
      logger.error('Error sending security alert:', error);
    }
  }

  // Utility Methods
  public static getConnectionStats(companyId: string): { connectedUsers: string[]; connectionCount: number } {
    try {
      const connectedUsers = webSocketServer.getConnectedUsers(companyId);
      const connectionCount = webSocketServer.getConnectionCount(companyId);
      
      return {
        connectedUsers,
        connectionCount
      };
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      return {
        connectedUsers: [],
        connectionCount: 0
      };
    }
  }

  public static emitToUser(userId: string, event: string, data: any): void {
    try {
      webSocketServer.emitToUser(userId, event, data);
      logger.info(`WebSocket: Custom event emitted to user - User ID: ${userId}, Event: ${event}`);
    } catch (error) {
      logger.error('Error emitting custom event to user:', error);
    }
  }

  public static emitToCompany(companyId: string, event: string, data: any): void {
    try {
      webSocketServer.emitToCompany(companyId, event, data);
      logger.info(`WebSocket: Custom event emitted to company - Company ID: ${companyId}, Event: ${event}`);
    } catch (error) {
      logger.error('Error emitting custom event to company:', error);
    }
  }

  public static emitToRoom(room: string, event: string, data: any): void {
    try {
      webSocketServer.emitToRoom(room, event, data);
      logger.info(`WebSocket: Custom event emitted to room - Room: ${room}, Event: ${event}`);
    } catch (error) {
      logger.error('Error emitting custom event to room:', error);
    }
  }

  // Health Check
  public static isWebSocketServerRunning(): boolean {
    try {
      // Check if WebSocket server is initialized and running
      return webSocketServer !== null && webSocketServer !== undefined;
    } catch (error) {
      logger.error('Error checking WebSocket server status:', error);
      return false;
    }
  }

  // Performance Monitoring
  public static getServerMetrics(): {
    totalConnections: number;
    companiesWithConnections: number;
    averageConnectionsPerCompany: number;
  } {
    try {
      // This would collect metrics from the WebSocket server
      // For now, return placeholder values
      return {
        totalConnections: 0,
        companiesWithConnections: 0,
        averageConnectionsPerCompany: 0
      };
    } catch (error) {
      logger.error('Error getting server metrics:', error);
      return {
        totalConnections: 0,
        companiesWithConnections: 0,
        averageConnectionsPerCompany: 0
      };
    }
  }

  // Bulk Operations for Performance
  public static emitBulkAppointmentUpdates(appointments: Appointment[]): void {
    try {
      webSocketServer.appointmentHandler.handleBulkAppointmentUpdate(appointments);
      logger.info(`WebSocket: Bulk appointment updates emitted - Count: ${appointments.length}`);
    } catch (error) {
      logger.error('Error emitting bulk appointment updates:', error);
    }
  }

  public static emitBulkClientUpdates(clients: Client[]): void {
    try {
      webSocketServer.clientHandler.handleBulkClientUpdate(clients);
      logger.info(`WebSocket: Bulk client updates emitted - Count: ${clients.length}`);
    } catch (error) {
      logger.error('Error emitting bulk client updates:', error);
    }
  }

  public static emitBulkStaffUpdates(staff: Staff[]): void {
    try {
      webSocketServer.staffHandler.handleBulkStaffUpdate(staff);
      logger.info(`WebSocket: Bulk staff updates emitted - Count: ${staff.length}`);
    } catch (error) {
      logger.error('Error emitting bulk staff updates:', error);
    }
  }

  public static sendBulkNotifications(notifications: Notification[]): void {
    try {
      webSocketServer.notificationHandler.sendBulkNotifications(notifications);
      logger.info(`WebSocket: Bulk notifications sent - Count: ${notifications.length}`);
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
    }
  }
}

// Export as singleton for consistent usage
export const wsIntegration = WebSocketIntegration;