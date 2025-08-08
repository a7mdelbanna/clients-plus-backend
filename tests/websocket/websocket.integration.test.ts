import { WebSocketIntegration } from '../../src/websocket/websocket.integration';
import { webSocketServer } from '../../src/websocket/socket.server';
import { logger } from '../../src/config/logger';
import { Client } from '../../src/websocket/handlers/client.handler';
import { Staff } from '../../src/websocket/handlers/staff.handler';
import { Appointment } from '../../src/websocket/handlers/appointment.handler';
import { Notification, NotificationType, NotificationPriority } from '../../src/websocket/handlers/notification.handler';

// Mock the WebSocket server
jest.mock('../../src/websocket/socket.server', () => ({
  webSocketServer: {
    appointmentHandler: {
      handleAppointmentCreated: jest.fn(),
      handleAppointmentUpdated: jest.fn(),
      handleAppointmentCancelled: jest.fn(),
      handleAppointmentStatusChange: jest.fn(),
      handleAvailabilityChange: jest.fn(),
      handleBulkAppointmentUpdate: jest.fn(),
    },
    clientHandler: {
      handleClientCreated: jest.fn(),
      handleClientUpdated: jest.fn(),
      handleClientDeleted: jest.fn(),
      handleClientStatusChange: jest.fn(),
      handleClientCheckIn: jest.fn(),
      handleClientCheckOut: jest.fn(),
      handleBulkClientUpdate: jest.fn(),
    },
    staffHandler: {
      handleStaffCreated: jest.fn(),
      handleStaffUpdated: jest.fn(),
      handleStaffDeleted: jest.fn(),
      handleStaffStatusChange: jest.fn(),
      handleStaffCheckIn: jest.fn(),
      handleStaffCheckOut: jest.fn(),
      handleBulkStaffUpdate: jest.fn(),
    },
    notificationHandler: {
      sendNotification: jest.fn(),
      broadcastToCompany: jest.fn(),
      sendToRole: jest.fn(),
      sendAppointmentReminder: jest.fn(),
      sendPaymentNotification: jest.fn(),
      sendInventoryAlert: jest.fn(),
      sendSystemAlert: jest.fn(),
      sendSecurityAlert: jest.fn(),
      sendBulkNotifications: jest.fn(),
    },
    getConnectedUsers: jest.fn(),
    getConnectionCount: jest.fn(),
    emitToUser: jest.fn(),
    emitToCompany: jest.fn(),
    emitToRoom: jest.fn(),
    broadcastToAll: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WebSocketIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Client Events', () => {
    const mockClient: Client = {
      id: 'client-123',
      companyId: 'company-456',
      branchId: 'branch-789',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      status: 'ACTIVE',
      tags: ['VIP'],
      notes: 'Regular client',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastVisit: new Date(),
      totalVisits: 5,
      totalSpent: 500,
      preferences: {},
    };

    it('should emit client created event', () => {
      WebSocketIntegration.emitClientCreated(mockClient);

      expect(webSocketServer.clientHandler.handleClientCreated).toHaveBeenCalledWith(mockClient);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Client created event emitted - ID: ${mockClient.id}`);
    });

    it('should emit client updated event', () => {
      WebSocketIntegration.emitClientUpdated(mockClient);

      expect(webSocketServer.clientHandler.handleClientUpdated).toHaveBeenCalledWith(mockClient);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Client updated event emitted - ID: ${mockClient.id}`);
    });

    it('should emit client deleted event', () => {
      const clientData = { companyId: mockClient.companyId, status: 'ARCHIVED' };
      WebSocketIntegration.emitClientDeleted(mockClient.id, clientData);

      expect(webSocketServer.clientHandler.handleClientDeleted).toHaveBeenCalledWith(mockClient.id, clientData);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Client deleted event emitted - ID: ${mockClient.id}`);
    });

    it('should emit client check-in event', () => {
      const appointmentId = 'appointment-123';
      WebSocketIntegration.emitClientCheckIn(mockClient.id, mockClient, appointmentId);

      expect(webSocketServer.clientHandler.handleClientCheckIn).toHaveBeenCalledWith(
        mockClient.id,
        mockClient,
        appointmentId
      );
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Client check-in event emitted - ID: ${mockClient.id}`);
    });

    it('should handle errors gracefully', () => {
      const error = new Error('WebSocket error');
      (webSocketServer.clientHandler.handleClientCreated as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => WebSocketIntegration.emitClientCreated(mockClient)).not.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Error emitting client created event:', error);
    });
  });

  describe('Appointment Events', () => {
    const mockAppointment: Appointment = {
      id: 'appointment-123',
      clientId: 'client-123',
      staffId: 'staff-123',
      branchId: 'branch-123',
      companyId: 'company-123',
      serviceId: 'service-123',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      status: 'SCHEDULED',
      notes: 'Regular appointment',
      client: {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      },
      staff: {
        id: 'staff-123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'THERAPIST',
      },
      service: {
        id: 'service-123',
        name: 'Massage Therapy',
        duration: 60,
        price: 100,
      },
    };

    it('should emit appointment created event', () => {
      WebSocketIntegration.emitAppointmentCreated(mockAppointment);

      expect(webSocketServer.appointmentHandler.handleAppointmentCreated).toHaveBeenCalledWith(mockAppointment);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Appointment created event emitted - ID: ${mockAppointment.id}`);
    });

    it('should emit appointment updated event', () => {
      WebSocketIntegration.emitAppointmentUpdated(mockAppointment);

      expect(webSocketServer.appointmentHandler.handleAppointmentUpdated).toHaveBeenCalledWith(mockAppointment);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Appointment updated event emitted - ID: ${mockAppointment.id}`);
    });

    it('should emit appointment cancelled event', () => {
      const appointmentData = { companyId: mockAppointment.companyId, status: 'CANCELLED' };
      WebSocketIntegration.emitAppointmentCancelled(mockAppointment.id, appointmentData);

      expect(webSocketServer.appointmentHandler.handleAppointmentCancelled).toHaveBeenCalledWith(
        mockAppointment.id,
        appointmentData
      );
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Appointment cancelled event emitted - ID: ${mockAppointment.id}`);
    });

    it('should emit availability change event', () => {
      const availabilityData = {
        staffId: 'staff-123',
        date: new Date(),
        timeSlots: [
          { start: '09:00', end: '10:00', available: true },
          { start: '10:00', end: '11:00', available: false },
        ],
      };

      WebSocketIntegration.emitAvailabilityChange('staff-123', 'company-123', availabilityData);

      expect(webSocketServer.appointmentHandler.handleAvailabilityChange).toHaveBeenCalledWith(
        'staff-123',
        'company-123',
        availabilityData
      );
      expect(logger.info).toHaveBeenCalledWith('WebSocket: Availability changed event emitted - Staff ID: staff-123');
    });
  });

  describe('Staff Events', () => {
    const mockStaff: Staff = {
      id: 'staff-123',
      companyId: 'company-123',
      branchId: 'branch-123',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1234567890',
      role: 'THERAPIST',
      department: 'Wellness',
      status: 'ACTIVE' as any,
      isActive: true,
      hireDate: new Date(),
      skills: ['Massage', 'Reflexology'],
      workingHours: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
      },
      breaks: [{ start: '12:00', end: '13:00' }],
      currentStatus: 'AVAILABLE' as any,
      lastCheckIn: new Date(),
    };

    it('should emit staff created event', () => {
      WebSocketIntegration.emitStaffCreated(mockStaff);

      expect(webSocketServer.staffHandler.handleStaffCreated).toHaveBeenCalledWith(mockStaff);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Staff created event emitted - ID: ${mockStaff.id}`);
    });

    it('should emit staff status change event', () => {
      const newStatus = 'BUSY';
      WebSocketIntegration.emitStaffStatusChange(mockStaff.id, newStatus, mockStaff);

      expect(webSocketServer.staffHandler.handleStaffStatusChange).toHaveBeenCalledWith(
        mockStaff.id,
        newStatus,
        mockStaff
      );
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Staff status changed event emitted - ID: ${mockStaff.id}, Status: ${newStatus}`);
    });

    it('should emit staff check-in event', () => {
      WebSocketIntegration.emitStaffCheckIn(mockStaff.id, mockStaff);

      expect(webSocketServer.staffHandler.handleStaffCheckIn).toHaveBeenCalledWith(mockStaff.id, mockStaff);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Staff check-in event emitted - ID: ${mockStaff.id}`);
    });
  });

  describe('Notification Events', () => {
    const mockNotification: Notification = {
      id: 'notification-123',
      userId: 'user-123',
      companyId: 'company-123',
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Appointment Reminder',
      message: 'You have an appointment at 2 PM',
      data: { appointmentId: 'appointment-123' },
      isRead: false,
      priority: NotificationPriority.HIGH,
      createdAt: new Date(),
    };

    it('should send notification', () => {
      WebSocketIntegration.sendNotification('user-123', mockNotification);

      expect(webSocketServer.notificationHandler.sendNotification).toHaveBeenCalledWith('user-123', mockNotification);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Notification sent - User ID: user-123, Type: ${mockNotification.type}`);
    });

    it('should broadcast to company', () => {
      const message = { title: 'System Update', content: 'Scheduled maintenance tonight' };
      WebSocketIntegration.broadcastToCompany('company-123', message);

      expect(webSocketServer.notificationHandler.broadcastToCompany).toHaveBeenCalledWith('company-123', message);
      expect(logger.info).toHaveBeenCalledWith('WebSocket: Broadcast message sent to company company-123');
    });

    it('should send role-specific notification', () => {
      WebSocketIntegration.sendToRole('company-123', 'ADMIN', mockNotification);

      expect(webSocketServer.notificationHandler.sendToRole).toHaveBeenCalledWith('company-123', 'ADMIN', mockNotification);
      expect(logger.info).toHaveBeenCalledWith('WebSocket: Role-specific notification sent - Company: company-123, Role: ADMIN');
    });

    it('should send appointment reminder', () => {
      const appointmentData = { id: 'appointment-123', date: '2023-12-01', startTime: '14:00' };
      WebSocketIntegration.sendAppointmentReminder('user-123', appointmentData);

      expect(webSocketServer.notificationHandler.sendAppointmentReminder).toHaveBeenCalledWith('user-123', appointmentData);
      expect(logger.info).toHaveBeenCalledWith('WebSocket: Appointment reminder sent - User ID: user-123');
    });

    it('should send payment notification', () => {
      const paymentData = { id: 'payment-123', amount: 100 };
      WebSocketIntegration.sendPaymentNotification('user-123', paymentData, true);

      expect(webSocketServer.notificationHandler.sendPaymentNotification).toHaveBeenCalledWith('user-123', paymentData, true);
      expect(logger.info).toHaveBeenCalledWith('WebSocket: Payment notification sent - User ID: user-123, Success: true');
    });

    it('should send system alert', () => {
      const message = 'System will be down for maintenance';
      WebSocketIntegration.sendSystemAlert(message);

      expect(webSocketServer.notificationHandler.sendSystemAlert).toHaveBeenCalledWith(message, undefined);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: System alert sent - Message: ${message}`);
    });

    it('should send security alert', () => {
      const alertData = { type: 'UNAUTHORIZED_ACCESS', ip: '192.168.1.1' };
      WebSocketIntegration.sendSecurityAlert('company-123', alertData);

      expect(webSocketServer.notificationHandler.sendSecurityAlert).toHaveBeenCalledWith('company-123', alertData);
      expect(logger.warn).toHaveBeenCalledWith('WebSocket: Security alert sent - Company ID: company-123');
    });
  });

  describe('Utility Methods', () => {
    it('should get connection stats', () => {
      (webSocketServer.getConnectedUsers as jest.Mock).mockReturnValue(['user-1', 'user-2']);
      (webSocketServer.getConnectionCount as jest.Mock).mockReturnValue(2);

      const stats = WebSocketIntegration.getConnectionStats('company-123');

      expect(stats).toEqual({
        connectedUsers: ['user-1', 'user-2'],
        connectionCount: 2,
      });
      expect(webSocketServer.getConnectedUsers).toHaveBeenCalledWith('company-123');
      expect(webSocketServer.getConnectionCount).toHaveBeenCalledWith('company-123');
    });

    it('should emit custom events', () => {
      const eventData = { message: 'Custom event data' };

      WebSocketIntegration.emitToUser('user-123', 'custom:event', eventData);
      WebSocketIntegration.emitToCompany('company-123', 'custom:event', eventData);
      WebSocketIntegration.emitToRoom('room-123', 'custom:event', eventData);

      expect(webSocketServer.emitToUser).toHaveBeenCalledWith('user-123', 'custom:event', eventData);
      expect(webSocketServer.emitToCompany).toHaveBeenCalledWith('company-123', 'custom:event', eventData);
      expect(webSocketServer.emitToRoom).toHaveBeenCalledWith('room-123', 'custom:event', eventData);
    });

    it('should check if WebSocket server is running', () => {
      const isRunning = WebSocketIntegration.isWebSocketServerRunning();
      expect(isRunning).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    it('should emit bulk client updates', () => {
      const clients = [
        { id: 'client-1', companyId: 'company-123', firstName: 'John', lastName: 'Doe' },
        { id: 'client-2', companyId: 'company-123', firstName: 'Jane', lastName: 'Smith' },
      ] as Client[];

      WebSocketIntegration.emitBulkClientUpdates(clients);

      expect(webSocketServer.clientHandler.handleBulkClientUpdate).toHaveBeenCalledWith(clients);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Bulk client updates emitted - Count: ${clients.length}`);
    });

    it('should send bulk notifications', () => {
      const notifications = [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Reminder 1',
          message: 'Message 1',
        },
        {
          id: 'notification-2',
          userId: 'user-2',
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Reminder 2',
          message: 'Message 2',
        },
      ] as Notification[];

      WebSocketIntegration.sendBulkNotifications(notifications);

      expect(webSocketServer.notificationHandler.sendBulkNotifications).toHaveBeenCalledWith(notifications);
      expect(logger.info).toHaveBeenCalledWith(`WebSocket: Bulk notifications sent - Count: ${notifications.length}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in connection stats gracefully', () => {
      const error = new Error('Connection error');
      (webSocketServer.getConnectedUsers as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const stats = WebSocketIntegration.getConnectionStats('company-123');

      expect(stats).toEqual({
        connectedUsers: [],
        connectionCount: 0,
      });
      expect(logger.error).toHaveBeenCalledWith('Error getting connection stats:', error);
    });

    it('should handle errors in custom event emission gracefully', () => {
      const error = new Error('Emission error');
      (webSocketServer.emitToUser as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => WebSocketIntegration.emitToUser('user-123', 'test:event', {})).not.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Error emitting custom event to user:', error);
    });
  });
});