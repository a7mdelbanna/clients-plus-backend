import { Server, Socket } from 'socket.io';
import { logger } from '../../config/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  userRole?: string;
}

interface AppointmentEventData {
  appointmentId: string;
  clientId?: string;
  staffId?: string;
  branchId?: string;
  serviceId?: string;
  startTime?: Date;
  endTime?: Date;
  status?: string;
  notes?: string;
}

class AppointmentHandler {
  public register(socket: AuthenticatedSocket, io: Server): void {
    // Handle appointment creation requests
    socket.on('create_appointment', (data: AppointmentEventData) => {
      this.handleCreateAppointment(socket, io, data);
    });

    // Handle appointment updates
    socket.on('update_appointment', (data: AppointmentEventData & { changes: any }) => {
      this.handleUpdateAppointment(socket, io, data);
    });

    // Handle appointment cancellation
    socket.on('cancel_appointment', (data: { appointmentId: string; reason?: string }) => {
      this.handleCancelAppointment(socket, io, data);
    });

    // Handle appointment confirmation
    socket.on('confirm_appointment', (data: { appointmentId: string }) => {
      this.handleConfirmAppointment(socket, io, data);
    });

    // Handle appointment reschedule
    socket.on('reschedule_appointment', (data: { appointmentId: string; newStartTime: Date; newEndTime: Date }) => {
      this.handleRescheduleAppointment(socket, io, data);
    });

    // Handle appointment check-in
    socket.on('checkin_appointment', (data: { appointmentId: string; checkedInAt?: Date }) => {
      this.handleCheckinAppointment(socket, io, data);
    });

    // Handle appointment completion
    socket.on('complete_appointment', (data: { appointmentId: string; completedAt?: Date; notes?: string }) => {
      this.handleCompleteAppointment(socket, io, data);
    });

    logger.debug(`Appointment event handlers registered for socket ${socket.id}`);
  }

  private handleCreateAppointment(socket: AuthenticatedSocket, io: Server, data: AppointmentEventData): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('appointment:created', {
        type: 'APPOINTMENT_CREATED',
        appointment: data,
        createdBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to specific branch if provided
      if (data.branchId) {
        io.to(`branch_${data.branchId}`).emit('appointment:created', {
          type: 'APPOINTMENT_CREATED',
          appointment: data,
          createdBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }

      // Notify assigned staff
      if (data.staffId) {
        io.to(`staff_${data.staffId}`).emit('appointment:assigned', {
          type: 'APPOINTMENT_ASSIGNED',
          appointment: data,
          assignedBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }

      socket.emit('appointment_created_success', {
        appointmentId: data.appointmentId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appointment created event broadcasted: ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error handling create appointment event:', error);
      socket.emit('error', { message: 'Failed to create appointment', code: 'CREATE_APPOINTMENT_FAILED' });
    }
  }

  private handleUpdateAppointment(socket: AuthenticatedSocket, io: Server, data: AppointmentEventData & { changes: any }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('appointment:updated', {
        type: 'APPOINTMENT_UPDATED',
        appointment: data,
        changes: data.changes,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to specific branch if provided
      if (data.branchId) {
        io.to(`branch_${data.branchId}`).emit('appointment:updated', {
          type: 'APPOINTMENT_UPDATED',
          appointment: data,
          changes: data.changes,
          updatedBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }

      // Notify affected staff
      if (data.staffId) {
        io.to(`staff_${data.staffId}`).emit('appointment:updated', {
          type: 'APPOINTMENT_UPDATED',
          appointment: data,
          changes: data.changes,
          updatedBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }

      socket.emit('appointment_updated_success', {
        appointmentId: data.appointmentId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appointment updated event broadcasted: ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error handling update appointment event:', error);
      socket.emit('error', { message: 'Failed to update appointment', code: 'UPDATE_APPOINTMENT_FAILED' });
    }
  }

  private handleCancelAppointment(socket: AuthenticatedSocket, io: Server, data: { appointmentId: string; reason?: string }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('appointment:cancelled', {
        type: 'APPOINTMENT_CANCELLED',
        appointmentId: data.appointmentId,
        reason: data.reason,
        cancelledBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('appointment_cancelled_success', {
        appointmentId: data.appointmentId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appointment cancelled event broadcasted: ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error handling cancel appointment event:', error);
      socket.emit('error', { message: 'Failed to cancel appointment', code: 'CANCEL_APPOINTMENT_FAILED' });
    }
  }

  private handleConfirmAppointment(socket: AuthenticatedSocket, io: Server, data: { appointmentId: string }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('appointment:confirmed', {
        type: 'APPOINTMENT_CONFIRMED',
        appointmentId: data.appointmentId,
        confirmedBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('appointment_confirmed_success', {
        appointmentId: data.appointmentId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appointment confirmed event broadcasted: ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error handling confirm appointment event:', error);
      socket.emit('error', { message: 'Failed to confirm appointment', code: 'CONFIRM_APPOINTMENT_FAILED' });
    }
  }

  private handleRescheduleAppointment(socket: AuthenticatedSocket, io: Server, data: { appointmentId: string; newStartTime: Date; newEndTime: Date }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('appointment:rescheduled', {
        type: 'APPOINTMENT_RESCHEDULED',
        appointmentId: data.appointmentId,
        newStartTime: data.newStartTime,
        newEndTime: data.newEndTime,
        rescheduledBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('appointment_rescheduled_success', {
        appointmentId: data.appointmentId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appointment rescheduled event broadcasted: ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error handling reschedule appointment event:', error);
      socket.emit('error', { message: 'Failed to reschedule appointment', code: 'RESCHEDULE_APPOINTMENT_FAILED' });
    }
  }

  private handleCheckinAppointment(socket: AuthenticatedSocket, io: Server, data: { appointmentId: string; checkedInAt?: Date }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('appointment:checkedin', {
        type: 'APPOINTMENT_CHECKEDIN',
        appointmentId: data.appointmentId,
        checkedInAt: data.checkedInAt || new Date(),
        checkedInBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('appointment_checkin_success', {
        appointmentId: data.appointmentId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appointment check-in event broadcasted: ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error handling checkin appointment event:', error);
      socket.emit('error', { message: 'Failed to check in appointment', code: 'CHECKIN_APPOINTMENT_FAILED' });
    }
  }

  private handleCompleteAppointment(socket: AuthenticatedSocket, io: Server, data: { appointmentId: string; completedAt?: Date; notes?: string }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('appointment:completed', {
        type: 'APPOINTMENT_COMPLETED',
        appointmentId: data.appointmentId,
        completedAt: data.completedAt || new Date(),
        notes: data.notes,
        completedBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('appointment_completed_success', {
        appointmentId: data.appointmentId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appointment completed event broadcasted: ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error handling complete appointment event:', error);
      socket.emit('error', { message: 'Failed to complete appointment', code: 'COMPLETE_APPOINTMENT_FAILED' });
    }
  }
}

export const appointmentHandler = new AppointmentHandler();