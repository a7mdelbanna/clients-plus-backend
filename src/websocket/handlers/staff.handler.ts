import { Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { WebSocketServer } from '../socket.server';

export interface StaffFilter {
  branchId?: string;
  role?: string[];
  status?: string[];
  department?: string;
}

export interface Staff {
  id: string;
  companyId: string;
  branchId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
  status: StaffStatus;
  isActive: boolean;
  hireDate: Date;
  skills?: string[];
  workingHours?: {
    monday?: TimeSlot[];
    tuesday?: TimeSlot[];
    wednesday?: TimeSlot[];
    thursday?: TimeSlot[];
    friday?: TimeSlot[];
    saturday?: TimeSlot[];
    sunday?: TimeSlot[];
  };
  breaks?: TimeSlot[];
  currentStatus?: StaffCurrentStatus;
  lastCheckIn?: Date;
  lastCheckOut?: Date;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED'
}

export enum StaffCurrentStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  ON_BREAK = 'ON_BREAK',
  OFF_DUTY = 'OFF_DUTY',
  LATE = 'LATE',
  ABSENT = 'ABSENT'
}

export interface StaffAvailability {
  staffId: string;
  date: Date;
  isAvailable: boolean;
  timeSlots: {
    start: string;
    end: string;
    isBooked: boolean;
    appointmentId?: string;
  }[];
  breaks: TimeSlot[];
  notes?: string;
}

export class StaffSocketHandler {
  private subscriptions: Map<string, StaffFilter> = new Map();
  private availabilitySubscriptions: Map<string, string> = new Map(); // socketId -> staffId

  constructor(private socketServer: WebSocketServer) {}

  public handleSubscription(socket: Socket, filters: StaffFilter = {}): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Store subscription filters
      this.subscriptions.set(socket.id, filters);

      // Join relevant rooms based on filters
      if (filters.branchId) {
        socket.join(`branch:${filters.branchId}:staff`);
      } else {
        socket.join(`company:${companyId}:staff`);
      }

      if (filters.department) {
        socket.join(`department:${filters.department}:staff`);
      }

      socket.emit('staff:subscribed', {
        filters,
        message: 'Subscribed to staff updates'
      });

      logger.info(`Socket ${socket.id} subscribed to staff with filters:`, filters);
    } catch (error) {
      logger.error('Error handling staff subscription:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to staff',
        error: error.message
      });
    }
  }

  public handleUnsubscription(socket: Socket): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Remove from subscription tracking
      this.subscriptions.delete(socket.id);

      // Leave all staff-related rooms
      socket.leave(`company:${companyId}:staff`);
      
      // Leave branch and department-specific rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.includes(':staff')) {
          socket.leave(room);
        }
      });

      socket.emit('staff:unsubscribed', {
        message: 'Unsubscribed from staff updates'
      });

      logger.info(`Socket ${socket.id} unsubscribed from staff`);
    } catch (error) {
      logger.error('Error handling staff unsubscription:', error);
    }
  }

  public handleAvailabilitySubscription(socket: Socket, staffId: string): void {
    try {
      // Store availability subscription
      this.availabilitySubscriptions.set(socket.id, staffId);
      
      // Join staff-specific availability room
      socket.join(`staff:${staffId}:availability`);

      socket.emit('staff-availability:subscribed', {
        staffId,
        message: 'Subscribed to staff availability updates'
      });

      logger.info(`Socket ${socket.id} subscribed to staff ${staffId} availability`);
    } catch (error) {
      logger.error('Error handling staff availability subscription:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to staff availability',
        error: error.message
      });
    }
  }

  public handleDisconnection(socket: Socket): void {
    // Clean up subscriptions
    this.subscriptions.delete(socket.id);
    this.availabilitySubscriptions.delete(socket.id);
  }

  // Methods to emit staff events
  public handleStaffCreated(staff: Staff): void {
    try {
      const { companyId, branchId, department } = staff;

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:staff`,
        'staff:created',
        staff
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:staff`,
          'staff:created',
          staff
        );
      }

      // Emit to department if specified
      if (department) {
        this.socketServer.emitToRoom(
          `department:${department}:staff`,
          'staff:created',
          staff
        );
      }

      // Emit to staff-specific room
      this.socketServer.emitToRoom(
        `staff:${staff.id}`,
        'staff:created',
        staff
      );

      logger.info(`Staff created event emitted for staff ${staff.id}`);
    } catch (error) {
      logger.error('Error emitting staff created event:', error);
    }
  }

  public handleStaffUpdated(staff: Staff): void {
    try {
      const { companyId, branchId, department } = staff;

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:staff`,
        'staff:updated',
        staff
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:staff`,
          'staff:updated',
          staff
        );
      }

      // Emit to department if specified
      if (department) {
        this.socketServer.emitToRoom(
          `department:${department}:staff`,
          'staff:updated',
          staff
        );
      }

      // Emit to staff-specific room
      this.socketServer.emitToRoom(
        `staff:${staff.id}`,
        'staff:updated',
        staff
      );

      logger.info(`Staff updated event emitted for staff ${staff.id}`);
    } catch (error) {
      logger.error('Error emitting staff updated event:', error);
    }
  }

  public handleStaffDeleted(staffId: string, staff: Partial<Staff>): void {
    try {
      const { companyId, branchId, department } = staff;

      const eventData = {
        id: staffId,
        deletedAt: new Date(),
        ...staff
      };

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:staff`,
        'staff:deleted',
        eventData
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:staff`,
          'staff:deleted',
          eventData
        );
      }

      // Emit to department if specified
      if (department) {
        this.socketServer.emitToRoom(
          `department:${department}:staff`,
          'staff:deleted',
          eventData
        );
      }

      // Emit to staff-specific room
      this.socketServer.emitToRoom(
        `staff:${staffId}`,
        'staff:deleted',
        eventData
      );

      logger.info(`Staff deleted event emitted for staff ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff deleted event:', error);
    }
  }

  public handleStaffStatusChange(staffId: string, currentStatus: StaffCurrentStatus, staff: Partial<Staff>): void {
    try {
      const { companyId, branchId, department } = staff;

      const eventData = {
        id: staffId,
        currentStatus,
        statusChangedAt: new Date(),
        ...staff
      };

      // Emit to company for dashboard updates
      this.socketServer.emitToRoom(
        `company:${companyId}:staff`,
        'staff:status-changed',
        eventData
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:staff`,
          'staff:status-changed',
          eventData
        );
      }

      // Emit to department if specified
      if (department) {
        this.socketServer.emitToRoom(
          `department:${department}:staff`,
          'staff:status-changed',
          eventData
        );
      }

      // Emit to staff-specific room
      this.socketServer.emitToRoom(
        `staff:${staffId}`,
        'staff:status-changed',
        eventData
      );

      // Emit availability change for scheduling
      this.socketServer.emitToRoom(
        `staff:${staffId}:availability`,
        'availability:status-changed',
        eventData
      );

      logger.info(`Staff status change event emitted for staff ${staffId}: ${currentStatus}`);
    } catch (error) {
      logger.error('Error emitting staff status change event:', error);
    }
  }

  public handleStaffCheckIn(staffId: string, staff: Partial<Staff>): void {
    try {
      const { companyId, branchId, department } = staff;

      const eventData = {
        id: staffId,
        checkedInAt: new Date(),
        currentStatus: StaffCurrentStatus.AVAILABLE,
        ...staff
      };

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:staff`,
        'staff:checked-in',
        eventData
      );

      // Emit to branch
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:staff`,
          'staff:checked-in',
          eventData
        );
      }

      // Emit to department
      if (department) {
        this.socketServer.emitToRoom(
          `department:${department}:staff`,
          'staff:checked-in',
          eventData
        );
      }

      // Emit availability change
      this.socketServer.emitToRoom(
        `staff:${staffId}:availability`,
        'availability:check-in',
        eventData
      );

      logger.info(`Staff check-in event emitted for staff ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff check-in event:', error);
    }
  }

  public handleStaffCheckOut(staffId: string, staff: Partial<Staff>): void {
    try {
      const { companyId, branchId, department } = staff;

      const eventData = {
        id: staffId,
        checkedOutAt: new Date(),
        currentStatus: StaffCurrentStatus.OFF_DUTY,
        ...staff
      };

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:staff`,
        'staff:checked-out',
        eventData
      );

      // Emit to branch
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:staff`,
          'staff:checked-out',
          eventData
        );
      }

      // Emit to department
      if (department) {
        this.socketServer.emitToRoom(
          `department:${department}:staff`,
          'staff:checked-out',
          eventData
        );
      }

      // Emit availability change
      this.socketServer.emitToRoom(
        `staff:${staffId}:availability`,
        'availability:check-out',
        eventData
      );

      logger.info(`Staff check-out event emitted for staff ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff check-out event:', error);
    }
  }

  public handleStaffAvailabilityUpdate(staffId: string, availability: StaffAvailability): void {
    try {
      // Emit to staff availability subscribers
      this.socketServer.emitToRoom(
        `staff:${staffId}:availability`,
        'availability:updated',
        availability
      );

      // Also emit to company for scheduling dashboard
      this.socketServer.emitToRoom(
        `company:${availability.staffId}:staff`, // Note: This assumes staffId contains companyId
        'staff:availability-updated',
        availability
      );

      logger.info(`Staff availability update event emitted for staff ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff availability update event:', error);
    }
  }

  public handleStaffShiftChange(staffId: string, shiftData: {
    oldShift?: TimeSlot;
    newShift: TimeSlot;
    date: Date;
    reason?: string;
  }): void {
    try {
      const eventData = {
        staffId,
        ...shiftData,
        shiftChangedAt: new Date()
      };

      // Emit to staff availability subscribers
      this.socketServer.emitToRoom(
        `staff:${staffId}:availability`,
        'shift:changed',
        eventData
      );

      // Emit to staff-specific room
      this.socketServer.emitToRoom(
        `staff:${staffId}`,
        'shift:changed',
        eventData
      );

      logger.info(`Staff shift change event emitted for staff ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff shift change event:', error);
    }
  }

  public handleBulkStaffUpdate(staff: Staff[]): void {
    try {
      // Group staff by company for efficient emission
      const staffByCompany = staff.reduce((acc, member) => {
        if (!acc[member.companyId]) {
          acc[member.companyId] = [];
        }
        acc[member.companyId].push(member);
        return acc;
      }, {} as Record<string, Staff[]>);

      // Emit bulk updates to each company
      Object.entries(staffByCompany).forEach(([companyId, companyStaff]) => {
        this.socketServer.emitToRoom(
          `company:${companyId}:staff`,
          'staff:bulk-updated',
          {
            staff: companyStaff,
            updatedAt: new Date()
          }
        );

        // Also emit to branch-specific rooms
        const staffByBranch = companyStaff.reduce((acc, member) => {
          if (member.branchId) {
            if (!acc[member.branchId]) {
              acc[member.branchId] = [];
            }
            acc[member.branchId].push(member);
          }
          return acc;
        }, {} as Record<string, Staff[]>);

        Object.entries(staffByBranch).forEach(([branchId, branchStaff]) => {
          this.socketServer.emitToRoom(
            `branch:${branchId}:staff`,
            'staff:bulk-updated',
            {
              staff: branchStaff,
              updatedAt: new Date()
            }
          );
        });
      });

      logger.info(`Bulk staff update event emitted for ${staff.length} staff members`);
    } catch (error) {
      logger.error('Error emitting bulk staff update event:', error);
    }
  }

  public handleStaffSkillsUpdate(staffId: string, skills: string[]): void {
    try {
      const eventData = {
        id: staffId,
        skills,
        skillsUpdatedAt: new Date()
      };

      // Emit to staff-specific room
      this.socketServer.emitToRoom(
        `staff:${staffId}`,
        'staff:skills-updated',
        eventData
      );

      logger.info(`Staff skills update event emitted for staff ${staffId}`);
    } catch (error) {
      logger.error('Error emitting staff skills update event:', error);
    }
  }

  // Utility methods for subscription management
  public getActiveSubscriptions(): Map<string, StaffFilter> {
    return this.subscriptions;
  }

  public getAvailabilitySubscriptions(): Map<string, string> {
    return this.availabilitySubscriptions;
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  public getAvailabilitySubscriptionCount(): number {
    return this.availabilitySubscriptions.size;
  }

  // Performance monitoring methods
  public getStaffStatusSummary(companyId: string): Promise<Record<StaffCurrentStatus, number>> {
    // This would typically query the database for current staff status counts
    // For now, return a placeholder
    return Promise.resolve({
      [StaffCurrentStatus.AVAILABLE]: 0,
      [StaffCurrentStatus.BUSY]: 0,
      [StaffCurrentStatus.ON_BREAK]: 0,
      [StaffCurrentStatus.OFF_DUTY]: 0,
      [StaffCurrentStatus.LATE]: 0,
      [StaffCurrentStatus.ABSENT]: 0
    });
  }
}