import { Server, Socket } from 'socket.io';
import { logger } from '../../config/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  userRole?: string;
}

interface NotificationData {
  id?: string;
  title: string;
  message: string;
  type: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  data?: any;
  targetUserId?: string;
  targetRole?: string;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

interface BroadcastData {
  title: string;
  message: string;
  type: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  data?: any;
  targetRoles?: string[];
  expiresAt?: Date;
}

class NotificationHandler {
  public register(socket: AuthenticatedSocket, io: Server): void {
    // Handle sending notifications to specific users
    socket.on('send_notification', (data: NotificationData) => {
      this.handleSendNotification(socket, io, data);
    });

    // Handle broadcasting to company
    socket.on('broadcast_to_company', (data: BroadcastData) => {
      this.handleBroadcastToCompany(socket, io, data);
    });

    // Handle broadcasting to specific roles
    socket.on('broadcast_to_role', (data: BroadcastData & { role: string }) => {
      this.handleBroadcastToRole(socket, io, data);
    });

    // Handle notification acknowledgment
    socket.on('acknowledge_notification', (data: { notificationId: string }) => {
      this.handleAcknowledgeNotification(socket, io, data);
    });

    // Handle marking notification as read
    socket.on('mark_notification_read', (data: { notificationId: string }) => {
      this.handleMarkNotificationRead(socket, io, data);
    });

    // Handle clearing all notifications
    socket.on('clear_all_notifications', () => {
      this.handleClearAllNotifications(socket, io);
    });

    // Handle system alerts
    socket.on('send_system_alert', (data: NotificationData) => {
      this.handleSendSystemAlert(socket, io, data);
    });

    logger.debug(`Notification event handlers registered for socket ${socket.id}`);
  }

  private handleSendNotification(socket: AuthenticatedSocket, io: Server, data: NotificationData): void {
    try {
      const { companyId, userRole } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Check if user has permission to send notifications
      if (!this.canSendNotification(userRole)) {
        socket.emit('error', { message: 'Insufficient permissions to send notifications', code: 'INSUFFICIENT_PERMISSIONS' });
        return;
      }

      const notificationId = data.id || `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const notification = {
        id: notificationId,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority || 'MEDIUM',
        data: data.data,
        sentBy: socket.userId,
        companyId,
        expiresAt: data.expiresAt,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        timestamp: new Date().toISOString(),
      };

      if (data.targetUserId) {
        // Send to specific user
        io.to(`user_${data.targetUserId}`).emit('notification:new', notification);
        logger.info(`Notification sent to user ${data.targetUserId}: ${data.title}`);
      } else {
        // Send to all users in company
        io.to(`company_${companyId}`).emit('notification:new', notification);
        logger.info(`Company-wide notification sent: ${data.title}`);
      }

      socket.emit('notification_sent_success', {
        notificationId,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error handling send notification event:', error);
      socket.emit('error', { message: 'Failed to send notification', code: 'SEND_NOTIFICATION_FAILED' });
    }
  }

  private handleBroadcastToCompany(socket: AuthenticatedSocket, io: Server, data: BroadcastData): void {
    try {
      const { companyId, userRole } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Check if user has permission to broadcast
      if (!this.canBroadcast(userRole)) {
        socket.emit('error', { message: 'Insufficient permissions to broadcast', code: 'INSUFFICIENT_PERMISSIONS' });
        return;
      }

      const broadcastId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const broadcast = {
        id: broadcastId,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority || 'MEDIUM',
        data: data.data,
        broadcastBy: socket.userId,
        companyId,
        targetRoles: data.targetRoles,
        expiresAt: data.expiresAt,
        timestamp: new Date().toISOString(),
      };

      if (data.targetRoles && data.targetRoles.length > 0) {
        // Broadcast to specific roles
        data.targetRoles.forEach(role => {
          io.to(`role_${role}_${companyId}`).emit('notification:broadcast', broadcast);
        });
        logger.info(`Role-based broadcast sent to roles [${data.targetRoles.join(', ')}]: ${data.title}`);
      } else {
        // Broadcast to entire company
        io.to(`company_${companyId}`).emit('notification:broadcast', broadcast);
        logger.info(`Company-wide broadcast sent: ${data.title}`);
      }

      socket.emit('broadcast_sent_success', {
        broadcastId,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error handling broadcast to company event:', error);
      socket.emit('error', { message: 'Failed to send broadcast', code: 'SEND_BROADCAST_FAILED' });
    }
  }

  private handleBroadcastToRole(socket: AuthenticatedSocket, io: Server, data: BroadcastData & { role: string }): void {
    try {
      const { companyId, userRole } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Check if user has permission to broadcast to roles
      if (!this.canBroadcastToRole(userRole, data.role)) {
        socket.emit('error', { message: 'Insufficient permissions to broadcast to this role', code: 'INSUFFICIENT_PERMISSIONS' });
        return;
      }

      const broadcastId = `role_broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const broadcast = {
        id: broadcastId,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority || 'MEDIUM',
        data: data.data,
        broadcastBy: socket.userId,
        companyId,
        targetRole: data.role,
        expiresAt: data.expiresAt,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to specific role
      io.to(`role_${data.role}_${companyId}`).emit('notification:role_broadcast', broadcast);

      socket.emit('role_broadcast_sent_success', {
        broadcastId,
        role: data.role,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Role-based broadcast sent to ${data.role}: ${data.title}`);
    } catch (error) {
      logger.error('Error handling broadcast to role event:', error);
      socket.emit('error', { message: 'Failed to send role broadcast', code: 'SEND_ROLE_BROADCAST_FAILED' });
    }
  }

  private handleAcknowledgeNotification(socket: AuthenticatedSocket, io: Server, data: { notificationId: string }): void {
    try {
      const { companyId, userId } = socket;
      
      if (!companyId || !userId) {
        socket.emit('error', { message: 'User or Company ID not found', code: 'MISSING_DATA' });
        return;
      }

      const acknowledgment = {
        notificationId: data.notificationId,
        acknowledgedBy: userId,
        acknowledgedAt: new Date().toISOString(),
      };

      // Notify company room about acknowledgment (for tracking purposes)
      io.to(`company_${companyId}`).emit('notification:acknowledged', acknowledgment);

      socket.emit('notification_acknowledged_success', {
        notificationId: data.notificationId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Notification acknowledged: ${data.notificationId} by user ${userId}`);
    } catch (error) {
      logger.error('Error handling acknowledge notification event:', error);
      socket.emit('error', { message: 'Failed to acknowledge notification', code: 'ACKNOWLEDGE_NOTIFICATION_FAILED' });
    }
  }

  private handleMarkNotificationRead(socket: AuthenticatedSocket, io: Server, data: { notificationId: string }): void {
    try {
      const { userId } = socket;
      
      if (!userId) {
        socket.emit('error', { message: 'User ID not found', code: 'MISSING_USER' });
        return;
      }

      socket.emit('notification_marked_read_success', {
        notificationId: data.notificationId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Notification marked as read: ${data.notificationId} by user ${userId}`);
    } catch (error) {
      logger.error('Error handling mark notification read event:', error);
      socket.emit('error', { message: 'Failed to mark notification as read', code: 'MARK_NOTIFICATION_READ_FAILED' });
    }
  }

  private handleClearAllNotifications(socket: AuthenticatedSocket, io: Server): void {
    try {
      const { userId } = socket;
      
      if (!userId) {
        socket.emit('error', { message: 'User ID not found', code: 'MISSING_USER' });
        return;
      }

      socket.emit('all_notifications_cleared_success', {
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`All notifications cleared for user ${userId}`);
    } catch (error) {
      logger.error('Error handling clear all notifications event:', error);
      socket.emit('error', { message: 'Failed to clear all notifications', code: 'CLEAR_NOTIFICATIONS_FAILED' });
    }
  }

  private handleSendSystemAlert(socket: AuthenticatedSocket, io: Server, data: NotificationData): void {
    try {
      const { companyId, userRole } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Check if user has permission to send system alerts
      if (!this.canSendSystemAlert(userRole)) {
        socket.emit('error', { message: 'Insufficient permissions to send system alerts', code: 'INSUFFICIENT_PERMISSIONS' });
        return;
      }

      const alertId = `system_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const systemAlert = {
        id: alertId,
        title: data.title,
        message: data.message,
        type: 'SYSTEM_ALERT',
        priority: data.priority || 'HIGH',
        data: data.data,
        sentBy: socket.userId,
        companyId,
        expiresAt: data.expiresAt,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        timestamp: new Date().toISOString(),
      };

      // Send system alert to all admins and managers
      io.to(`role_ADMIN_${companyId}`).emit('notification:system_alert', systemAlert);
      io.to(`role_MANAGER_${companyId}`).emit('notification:system_alert', systemAlert);

      socket.emit('system_alert_sent_success', {
        alertId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`System alert sent: ${data.title}`);
    } catch (error) {
      logger.error('Error handling send system alert event:', error);
      socket.emit('error', { message: 'Failed to send system alert', code: 'SEND_SYSTEM_ALERT_FAILED' });
    }
  }

  private canSendNotification(userRole?: string): boolean {
    return ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole || '');
  }

  private canBroadcast(userRole?: string): boolean {
    return ['ADMIN', 'MANAGER'].includes(userRole || '');
  }

  private canBroadcastToRole(userRole?: string, targetRole?: string): boolean {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'MANAGER' && targetRole !== 'ADMIN') return true;
    return false;
  }

  private canSendSystemAlert(userRole?: string): boolean {
    return userRole === 'ADMIN';
  }
}

export const notificationHandler = new NotificationHandler();