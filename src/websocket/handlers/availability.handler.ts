import { Server, Socket } from 'socket.io';
import { logger } from '../../config/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  userRole?: string;
}

interface AvailabilitySlot {
  start: string;
  end: string;
  available?: boolean;
  reason?: string;
}

interface AvailabilityUpdateData {
  staffId: string;
  branchId?: string;
  date: string;
  availableSlots: AvailabilitySlot[];
  unavailableSlots?: AvailabilitySlot[];
  workingHours?: {
    start: string;
    end: string;
  };
}

class AvailabilityHandler {
  public register(socket: AuthenticatedSocket, io: Server): void {
    // Handle availability updates
    socket.on('update_availability', (data: AvailabilityUpdateData) => {
      this.handleUpdateAvailability(socket, io, data);
    });

    // Handle staff status updates
    socket.on('update_staff_status', (data: { staffId: string; status: string; branchId?: string }) => {
      this.handleUpdateStaffStatus(socket, io, data);
    });

    // Handle bulk availability updates
    socket.on('bulk_update_availability', (data: { updates: AvailabilityUpdateData[] }) => {
      this.handleBulkUpdateAvailability(socket, io, data);
    });

    // Handle break time updates
    socket.on('update_break_time', (data: { staffId: string; breakStart: string; breakEnd: string; branchId?: string }) => {
      this.handleUpdateBreakTime(socket, io, data);
    });

    // Handle working hours updates
    socket.on('update_working_hours', (data: { staffId: string; date: string; start: string; end: string; branchId?: string }) => {
      this.handleUpdateWorkingHours(socket, io, data);
    });

    logger.debug(`Availability event handlers registered for socket ${socket.id}`);
  }

  private handleUpdateAvailability(socket: AuthenticatedSocket, io: Server, data: AvailabilityUpdateData): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      const availabilityEvent = {
        type: 'AVAILABILITY_UPDATED',
        staffId: data.staffId,
        branchId: data.branchId,
        date: data.date,
        availableSlots: data.availableSlots,
        unavailableSlots: data.unavailableSlots || [],
        workingHours: data.workingHours,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('availability:updated', availabilityEvent);

      // Broadcast to specific branch if provided
      if (data.branchId) {
        io.to(`branch_${data.branchId}`).emit('availability:updated', availabilityEvent);
      }

      // Notify the specific staff member
      io.to(`staff_${data.staffId}`).emit('availability:updated', availabilityEvent);

      socket.emit('availability_updated_success', {
        staffId: data.staffId,
        date: data.date,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Availability updated event broadcasted for staff ${data.staffId} on ${data.date}`);
    } catch (error) {
      logger.error('Error handling update availability event:', error);
      socket.emit('error', { message: 'Failed to update availability', code: 'UPDATE_AVAILABILITY_FAILED' });
    }
  }

  private handleUpdateStaffStatus(socket: AuthenticatedSocket, io: Server, data: { staffId: string; status: string; branchId?: string }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      const statusEvent = {
        type: 'STAFF_STATUS_UPDATED',
        staffId: data.staffId,
        status: data.status,
        branchId: data.branchId,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('staff:status_updated', statusEvent);

      // Broadcast to specific branch if provided
      if (data.branchId) {
        io.to(`branch_${data.branchId}`).emit('staff:status_updated', statusEvent);
      }

      // Notify the specific staff member
      io.to(`staff_${data.staffId}`).emit('staff:status_updated', statusEvent);

      socket.emit('staff_status_updated_success', {
        staffId: data.staffId,
        status: data.status,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Staff status updated event broadcasted for staff ${data.staffId}: ${data.status}`);
    } catch (error) {
      logger.error('Error handling update staff status event:', error);
      socket.emit('error', { message: 'Failed to update staff status', code: 'UPDATE_STAFF_STATUS_FAILED' });
    }
  }

  private handleBulkUpdateAvailability(socket: AuthenticatedSocket, io: Server, data: { updates: AvailabilityUpdateData[] }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      const bulkUpdateEvent = {
        type: 'BULK_AVAILABILITY_UPDATED',
        updates: data.updates.map(update => ({
          ...update,
          updatedBy: socket.userId,
        })),
        updatedBy: socket.userId,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('availability:bulk_updated', bulkUpdateEvent);

      // Broadcast to affected branches
      const affectedBranches = new Set(data.updates.map(update => update.branchId).filter(Boolean));
      affectedBranches.forEach(branchId => {
        if (branchId) {
          io.to(`branch_${branchId}`).emit('availability:bulk_updated', {
            ...bulkUpdateEvent,
            updates: bulkUpdateEvent.updates.filter(update => update.branchId === branchId),
          });
        }
      });

      // Notify affected staff members
      data.updates.forEach(update => {
        io.to(`staff_${update.staffId}`).emit('availability:updated', {
          type: 'AVAILABILITY_UPDATED',
          ...update,
          updatedBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.emit('bulk_availability_updated_success', {
        updatedCount: data.updates.length,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Bulk availability updated event broadcasted for ${data.updates.length} staff members`);
    } catch (error) {
      logger.error('Error handling bulk update availability event:', error);
      socket.emit('error', { message: 'Failed to bulk update availability', code: 'BULK_UPDATE_AVAILABILITY_FAILED' });
    }
  }

  private handleUpdateBreakTime(socket: AuthenticatedSocket, io: Server, data: { staffId: string; breakStart: string; breakEnd: string; branchId?: string }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      const breakTimeEvent = {
        type: 'BREAK_TIME_UPDATED',
        staffId: data.staffId,
        breakStart: data.breakStart,
        breakEnd: data.breakEnd,
        branchId: data.branchId,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('staff:break_updated', breakTimeEvent);

      // Broadcast to specific branch if provided
      if (data.branchId) {
        io.to(`branch_${data.branchId}`).emit('staff:break_updated', breakTimeEvent);
      }

      // Notify the specific staff member
      io.to(`staff_${data.staffId}`).emit('staff:break_updated', breakTimeEvent);

      socket.emit('break_time_updated_success', {
        staffId: data.staffId,
        breakStart: data.breakStart,
        breakEnd: data.breakEnd,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Break time updated event broadcasted for staff ${data.staffId}`);
    } catch (error) {
      logger.error('Error handling update break time event:', error);
      socket.emit('error', { message: 'Failed to update break time', code: 'UPDATE_BREAK_TIME_FAILED' });
    }
  }

  private handleUpdateWorkingHours(socket: AuthenticatedSocket, io: Server, data: { staffId: string; date: string; start: string; end: string; branchId?: string }): void {
    try {
      const { companyId } = socket;
      
      if (!companyId) {
        socket.emit('error', { message: 'Company ID not found', code: 'MISSING_COMPANY' });
        return;
      }

      const workingHoursEvent = {
        type: 'WORKING_HOURS_UPDATED',
        staffId: data.staffId,
        date: data.date,
        start: data.start,
        end: data.end,
        branchId: data.branchId,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to company room
      io.to(`company_${companyId}`).emit('staff:working_hours_updated', workingHoursEvent);

      // Broadcast to specific branch if provided
      if (data.branchId) {
        io.to(`branch_${data.branchId}`).emit('staff:working_hours_updated', workingHoursEvent);
      }

      // Notify the specific staff member
      io.to(`staff_${data.staffId}`).emit('staff:working_hours_updated', workingHoursEvent);

      socket.emit('working_hours_updated_success', {
        staffId: data.staffId,
        date: data.date,
        start: data.start,
        end: data.end,
        success: true,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Working hours updated event broadcasted for staff ${data.staffId} on ${data.date}`);
    } catch (error) {
      logger.error('Error handling update working hours event:', error);
      socket.emit('error', { message: 'Failed to update working hours', code: 'UPDATE_WORKING_HOURS_FAILED' });
    }
  }
}

export const availabilityHandler = new AvailabilityHandler();