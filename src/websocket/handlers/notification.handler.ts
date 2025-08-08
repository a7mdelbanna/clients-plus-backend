import { Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { WebSocketServer } from '../socket.server';

export interface Notification {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  priority: NotificationPriority;
  expiresAt?: Date;
  createdAt: Date;
  readAt?: Date;
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  CLIENT_CHECKED_IN = 'CLIENT_CHECKED_IN',
  STAFF_LATE = 'STAFF_LATE',
  STAFF_ABSENT = 'STAFF_ABSENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVENTORY_LOW = 'INVENTORY_LOW',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SECURITY_ALERT = 'SECURITY_ALERT',
  CUSTOM = 'CUSTOM'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface BroadcastMessage {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  targetRoles?: string[];
  targetBranches?: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export class NotificationSocketHandler {
  private subscriptions: Set<string> = new Set(); // socketIds subscribed to notifications

  constructor(private socketServer: WebSocketServer) {}

  public handleSubscription(socket: Socket): void {
    try {
      const { userId } = (socket as any).data.user;
      
      // Add to subscriptions
      this.subscriptions.add(socket.id);
      
      // Join user notification room
      socket.join(`user:${userId}:notifications`);

      socket.emit('notifications:subscribed', {
        message: 'Subscribed to notifications'
      });

      logger.info(`Socket ${socket.id} subscribed to notifications`);
    } catch (error) {
      logger.error('Error handling notification subscription:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public handleUnsubscription(socket: Socket): void {
    try {
      const { userId } = (socket as any).data.user;
      
      // Remove from subscriptions
      this.subscriptions.delete(socket.id);
      
      // Leave notification room
      socket.leave(`user:${userId}:notifications`);

      socket.emit('notifications:unsubscribed', {
        message: 'Unsubscribed from notifications'
      });

      logger.info(`Socket ${socket.id} unsubscribed from notifications`);
    } catch (error) {
      logger.error('Error handling notification unsubscription:', error);
    }
  }

  public markAsRead(socket: Socket, notificationId: string): void {
    try {
      const { userId, companyId } = (socket as any).data.user;
      
      // Emit to user's other sessions that notification was read
      this.socketServer.emitToRoom(
        `user:${userId}:notifications`,
        'notification:marked-read',
        {
          notificationId,
          readAt: new Date(),
          userId
        }
      );

      socket.emit('notification:read-confirmed', {
        notificationId,
        message: 'Notification marked as read'
      });

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      socket.emit('error', {
        message: 'Failed to mark notification as read',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public handleDisconnection(socket: Socket): void {
    // Clean up subscriptions
    this.subscriptions.delete(socket.id);
  }

  // Methods to emit notification events
  public sendNotification(userId: string, notification: Notification): void {
    try {
      // Send to specific user
      this.socketServer.emitToRoom(
        `user:${userId}:notifications`,
        'notification:new',
        notification
      );

      logger.info(`Notification sent to user ${userId}: ${notification.title}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  public sendBulkNotifications(notifications: Notification[]): void {
    try {
      // Group notifications by user for efficient emission
      const notificationsByUser = notifications.reduce((acc, notification) => {
        if (!acc[notification.userId]) {
          acc[notification.userId] = [];
        }
        acc[notification.userId].push(notification);
        return acc;
      }, {} as Record<string, Notification[]>);

      // Send to each user
      Object.entries(notificationsByUser).forEach(([userId, userNotifications]) => {
        this.socketServer.emitToRoom(
          `user:${userId}:notifications`,
          'notifications:bulk',
          {
            notifications: userNotifications,
            count: userNotifications.length
          }
        );
      });

      logger.info(`Bulk notifications sent to ${Object.keys(notificationsByUser).length} users`);
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
    }
  }

  public broadcastToCompany(companyId: string, message: BroadcastMessage): void {
    try {
      // Broadcast to all users in the company
      this.socketServer.emitToRoom(
        `company:${companyId}`,
        'broadcast:message',
        message
      );

      logger.info(`Broadcast message sent to company ${companyId}: ${message.title}`);
    } catch (error) {
      logger.error('Error broadcasting to company:', error);
    }
  }

  public sendToRole(companyId: string, role: string, notification: Notification): void {
    try {
      // Send to users with specific role in the company
      this.socketServer.emitToRoom(
        `company:${companyId}:role:${role}`,
        'notification:role-specific',
        notification
      );

      logger.info(`Role-specific notification sent to ${role} in company ${companyId}`);
    } catch (error) {
      logger.error('Error sending role-specific notification:', error);
    }
  }

  public sendToBranch(branchId: string, notification: Notification): void {
    try {
      // Send to all users in a specific branch
      this.socketServer.emitToRoom(
        `branch:${branchId}`,
        'notification:branch-specific',
        notification
      );

      logger.info(`Branch-specific notification sent to branch ${branchId}`);
    } catch (error) {
      logger.error('Error sending branch-specific notification:', error);
    }
  }

  public sendAppointmentReminder(userId: string, appointmentData: any): void {
    try {
      const notification: Notification = {
        id: `reminder_${appointmentData.id}_${Date.now()}`,
        userId,
        companyId: appointmentData.companyId,
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Appointment Reminder',
        message: `Your appointment is scheduled for ${appointmentData.date} at ${appointmentData.startTime}`,
        data: appointmentData,
        isRead: false,
        priority: NotificationPriority.HIGH,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      this.sendNotification(userId, notification);

      // Also send push notification data for mobile apps
      this.socketServer.emitToRoom(
        `user:${userId}:notifications`,
        'push-notification',
        {
          title: notification.title,
          body: notification.message,
          data: notification.data,
          priority: 'high',
          sound: 'default'
        }
      );

      logger.info(`Appointment reminder sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending appointment reminder:', error);
    }
  }

  public sendPaymentNotification(userId: string, paymentData: any, success: boolean): void {
    try {
      const notification: Notification = {
        id: `payment_${paymentData.id}_${Date.now()}`,
        userId,
        companyId: paymentData.companyId,
        type: success ? NotificationType.PAYMENT_RECEIVED : NotificationType.PAYMENT_FAILED,
        title: success ? 'Payment Received' : 'Payment Failed',
        message: success 
          ? `Payment of $${paymentData.amount} has been received`
          : `Payment of $${paymentData.amount} failed. Please try again.`,
        data: paymentData,
        isRead: false,
        priority: success ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
        createdAt: new Date()
      };

      this.sendNotification(userId, notification);

      logger.info(`Payment notification sent to user ${userId}: ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      logger.error('Error sending payment notification:', error);
    }
  }

  public sendInventoryAlert(companyId: string, inventoryData: any): void {
    try {
      const notification: Notification = {
        id: `inventory_${inventoryData.productId}_${Date.now()}`,
        userId: '', // Will be sent to admin/manager roles
        companyId,
        type: NotificationType.INVENTORY_LOW,
        title: 'Low Inventory Alert',
        message: `${inventoryData.productName} is running low (${inventoryData.currentStock} remaining)`,
        data: inventoryData,
        isRead: false,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date()
      };

      // Send to admin and manager roles
      this.sendToRole(companyId, 'ADMIN', notification);
      this.sendToRole(companyId, 'MANAGER', notification);

      logger.info(`Inventory alert sent to company ${companyId} managers`);
    } catch (error) {
      logger.error('Error sending inventory alert:', error);
    }
  }

  public sendSystemAlert(message: string, priority: NotificationPriority = NotificationPriority.MEDIUM): void {
    try {
      const notification = {
        id: `system_${Date.now()}`,
        type: NotificationType.SYSTEM_MAINTENANCE,
        title: 'System Alert',
        message,
        priority,
        createdAt: new Date()
      };

      // Broadcast to all connected clients
      this.socketServer.broadcastToAll('system:alert', notification);

      logger.info(`System alert broadcasted: ${message}`);
    } catch (error) {
      logger.error('Error sending system alert:', error);
    }
  }

  public sendSecurityAlert(companyId: string, alertData: any): void {
    try {
      const notification: Notification = {
        id: `security_${companyId}_${Date.now()}`,
        userId: '', // Will be sent to admin roles
        companyId,
        type: NotificationType.SECURITY_ALERT,
        title: 'Security Alert',
        message: alertData.message || 'Security event detected',
        data: alertData,
        isRead: false,
        priority: NotificationPriority.URGENT,
        createdAt: new Date()
      };

      // Send to admin roles only
      this.sendToRole(companyId, 'ADMIN', notification);
      this.sendToRole(companyId, 'SUPER_ADMIN', notification);

      logger.warn(`Security alert sent to company ${companyId} administrators`);
    } catch (error) {
      logger.error('Error sending security alert:', error);
    }
  }

  // Utility methods
  public getActiveSubscriptions(): Set<string> {
    return this.subscriptions;
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  public isUserSubscribed(socketId: string): boolean {
    return this.subscriptions.has(socketId);
  }

  // Batch operations
  public markMultipleAsRead(userId: string, notificationIds: string[]): void {
    try {
      this.socketServer.emitToRoom(
        `user:${userId}:notifications`,
        'notifications:bulk-read',
        {
          notificationIds,
          readAt: new Date()
        }
      );

      logger.info(`${notificationIds.length} notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Error marking multiple notifications as read:', error);
    }
  }

  public clearExpiredNotifications(): void {
    try {
      // This would typically interact with a database to clean up expired notifications
      // For now, we'll emit an event to trigger cleanup on the client side
      this.socketServer.broadcastToAll('notifications:cleanup-expired', {
        timestamp: new Date()
      });

      logger.info('Expired notifications cleanup event broadcasted');
    } catch (error) {
      logger.error('Error clearing expired notifications:', error);
    }
  }
}