import { webSocketServer } from './socket.server';
import { logger } from '../config/logger';

interface AppointmentData {
  id: string;
  companyId: string;
  branchId?: string;
  clientId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  [key: string]: any;
}

interface ClientData {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

interface NotificationData {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  targetUserId?: string;
  targetRole?: string;
  data?: any;
}

class WebSocketIntegration {
  // Appointment Events
  public emitAppointmentCreated(appointment: AppointmentData): void {
    try {
      webSocketServer.broadcastToCompany(appointment.companyId, 'appointment:created', {
        type: 'APPOINTMENT_CREATED',
        appointment,
      });

      if (appointment.branchId) {
        webSocketServer.broadcastToBranch(appointment.branchId, 'appointment:created', {
          type: 'APPOINTMENT_CREATED',
          appointment,
        });
      }

      if (appointment.staffId) {
        webSocketServer.broadcastToStaff(appointment.staffId, 'appointment:assigned', {
          type: 'APPOINTMENT_ASSIGNED',
          appointment,
        });
      }

      logger.info(`WebSocket: Appointment created event emitted for ${appointment.id}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting appointment created event:', error);
    }
  }

  public emitAppointmentUpdated(appointment: AppointmentData, changes: any): void {
    try {
      webSocketServer.broadcastToCompany(appointment.companyId, 'appointment:updated', {
        type: 'APPOINTMENT_UPDATED',
        appointment,
        changes,
      });

      if (appointment.branchId) {
        webSocketServer.broadcastToBranch(appointment.branchId, 'appointment:updated', {
          type: 'APPOINTMENT_UPDATED',
          appointment,
          changes,
        });
      }

      if (appointment.staffId) {
        webSocketServer.broadcastToStaff(appointment.staffId, 'appointment:updated', {
          type: 'APPOINTMENT_UPDATED',
          appointment,
          changes,
        });
      }

      logger.info(`WebSocket: Appointment updated event emitted for ${appointment.id}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting appointment updated event:', error);
    }
  }

  public emitAppointmentCancelled(appointment: AppointmentData, reason?: string): void {
    try {
      webSocketServer.broadcastToCompany(appointment.companyId, 'appointment:cancelled', {
        type: 'APPOINTMENT_CANCELLED',
        appointment,
        reason,
      });

      if (appointment.branchId) {
        webSocketServer.broadcastToBranch(appointment.branchId, 'appointment:cancelled', {
          type: 'APPOINTMENT_CANCELLED',
          appointment,
          reason,
        });
      }

      if (appointment.staffId) {
        webSocketServer.broadcastToStaff(appointment.staffId, 'appointment:cancelled', {
          type: 'APPOINTMENT_CANCELLED',
          appointment,
          reason,
        });
      }

      logger.info(`WebSocket: Appointment cancelled event emitted for ${appointment.id}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting appointment cancelled event:', error);
    }
  }

  public emitAppointmentConfirmed(appointment: AppointmentData): void {
    try {
      webSocketServer.broadcastToCompany(appointment.companyId, 'appointment:confirmed', {
        type: 'APPOINTMENT_CONFIRMED',
        appointment,
      });

      if (appointment.branchId) {
        webSocketServer.broadcastToBranch(appointment.branchId, 'appointment:confirmed', {
          type: 'APPOINTMENT_CONFIRMED',
          appointment,
        });
      }

      logger.info(`WebSocket: Appointment confirmed event emitted for ${appointment.id}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting appointment confirmed event:', error);
    }
  }

  // Availability Events
  public emitAvailabilityUpdated(data: {
    staffId: string;
    companyId: string;
    branchId?: string;
    date: string;
    availableSlots: any[];
    unavailableSlots?: any[];
  }): void {
    try {
      webSocketServer.broadcastToCompany(data.companyId, 'availability:updated', {
        type: 'AVAILABILITY_UPDATED',
        staffId: data.staffId,
        date: data.date,
        availableSlots: data.availableSlots,
        unavailableSlots: data.unavailableSlots || [],
      });

      if (data.branchId) {
        webSocketServer.broadcastToBranch(data.branchId, 'availability:updated', {
          type: 'AVAILABILITY_UPDATED',
          staffId: data.staffId,
          date: data.date,
          availableSlots: data.availableSlots,
          unavailableSlots: data.unavailableSlots || [],
        });
      }

      webSocketServer.broadcastToStaff(data.staffId, 'availability:updated', {
        type: 'AVAILABILITY_UPDATED',
        staffId: data.staffId,
        date: data.date,
        availableSlots: data.availableSlots,
        unavailableSlots: data.unavailableSlots || [],
      });

      logger.info(`WebSocket: Availability updated event emitted for staff ${data.staffId}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting availability updated event:', error);
    }
  }

  public emitStaffStatusUpdated(data: {
    staffId: string;
    companyId: string;
    branchId?: string;
    status: string;
  }): void {
    try {
      webSocketServer.broadcastToCompany(data.companyId, 'staff:status_updated', {
        type: 'STAFF_STATUS_UPDATED',
        staffId: data.staffId,
        status: data.status,
      });

      if (data.branchId) {
        webSocketServer.broadcastToBranch(data.branchId, 'staff:status_updated', {
          type: 'STAFF_STATUS_UPDATED',
          staffId: data.staffId,
          status: data.status,
        });
      }

      webSocketServer.broadcastToStaff(data.staffId, 'staff:status_updated', {
        type: 'STAFF_STATUS_UPDATED',
        staffId: data.staffId,
        status: data.status,
      });

      logger.info(`WebSocket: Staff status updated event emitted for ${data.staffId}: ${data.status}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting staff status updated event:', error);
    }
  }

  // Client Events
  public emitClientCreated(client: ClientData): void {
    try {
      webSocketServer.broadcastToCompany(client.companyId, 'client:created', {
        type: 'CLIENT_CREATED',
        client,
      });

      logger.info(`WebSocket: Client created event emitted for ${client.id}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting client created event:', error);
    }
  }

  public emitClientUpdated(client: ClientData, changes: any): void {
    try {
      webSocketServer.broadcastToCompany(client.companyId, 'client:updated', {
        type: 'CLIENT_UPDATED',
        client,
        changes,
      });

      logger.info(`WebSocket: Client updated event emitted for ${client.id}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting client updated event:', error);
    }
  }

  public emitClientCheckIn(data: {
    clientId: string;
    companyId: string;
    branchId: string;
    appointmentId?: string;
    checkedInAt: Date;
  }): void {
    try {
      webSocketServer.broadcastToCompany(data.companyId, 'client:checked_in', {
        type: 'CLIENT_CHECKED_IN',
        clientId: data.clientId,
        appointmentId: data.appointmentId,
        checkedInAt: data.checkedInAt,
      });

      webSocketServer.broadcastToBranch(data.branchId, 'client:checked_in', {
        type: 'CLIENT_CHECKED_IN',
        clientId: data.clientId,
        appointmentId: data.appointmentId,
        checkedInAt: data.checkedInAt,
      });

      logger.info(`WebSocket: Client check-in event emitted for ${data.clientId}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting client check-in event:', error);
    }
  }

  // Notification Events
  public emitNotificationToUser(notification: NotificationData): void {
    try {
      if (!notification.targetUserId) {
        logger.warn('WebSocket: Cannot emit user notification without targetUserId');
        return;
      }

      webSocketServer.broadcastToUser(notification.targetUserId, 'notification:new', {
        type: 'NOTIFICATION_NEW',
        notification,
      });

      logger.info(`WebSocket: Notification emitted to user ${notification.targetUserId}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting user notification:', error);
    }
  }

  public emitNotificationToCompany(notification: NotificationData): void {
    try {
      webSocketServer.broadcastToCompany(notification.companyId, 'notification:broadcast', {
        type: 'NOTIFICATION_BROADCAST',
        notification,
      });

      logger.info(`WebSocket: Company notification broadcasted to ${notification.companyId}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting company notification:', error);
    }
  }

  public emitNotificationToRole(notification: NotificationData): void {
    try {
      if (!notification.targetRole) {
        logger.warn('WebSocket: Cannot emit role notification without targetRole');
        return;
      }

      webSocketServer.broadcastToRole(notification.targetRole, notification.companyId, 'notification:role_broadcast', {
        type: 'NOTIFICATION_ROLE_BROADCAST',
        notification,
      });

      logger.info(`WebSocket: Role notification broadcasted to ${notification.targetRole} in company ${notification.companyId}`);
    } catch (error) {
      logger.error('WebSocket: Error emitting role notification:', error);
    }
  }

  // Utility Methods
  public getConnectionStats(companyId?: string): { connectionCount: number; isRunning: boolean } {
    return {
      connectionCount: webSocketServer.getConnectionCount(companyId),
      isRunning: webSocketServer.isRunning(),
    };
  }

  public isWebSocketServerRunning(): boolean {
    return webSocketServer.isRunning();
  }

  // Generic broadcast methods for custom events
  public broadcastToCompany(companyId: string, event: string, data: any): void {
    try {
      webSocketServer.broadcastToCompany(companyId, event, data);
      logger.info(`WebSocket: Custom event '${event}' broadcasted to company ${companyId}`);
    } catch (error) {
      logger.error(`WebSocket: Error broadcasting custom event '${event}':`, error);
    }
  }

  public broadcastToBranch(branchId: string, event: string, data: any): void {
    try {
      webSocketServer.broadcastToBranch(branchId, event, data);
      logger.info(`WebSocket: Custom event '${event}' broadcasted to branch ${branchId}`);
    } catch (error) {
      logger.error(`WebSocket: Error broadcasting custom event '${event}':`, error);
    }
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    try {
      webSocketServer.broadcastToUser(userId, event, data);
      logger.info(`WebSocket: Custom event '${event}' broadcasted to user ${userId}`);
    } catch (error) {
      logger.error(`WebSocket: Error broadcasting custom event '${event}':`, error);
    }
  }
}

export const wsIntegration = new WebSocketIntegration();