import { Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { WebSocketServer } from '../socket.server';

export interface AppointmentFilter {
  branchId?: string;
  staffId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
}

export interface Appointment {
  id: string;
  clientId: string;
  staffId: string;
  branchId: string;
  companyId: string;
  serviceId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  service?: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
}

export interface AvailabilityChange {
  staffId: string;
  date: Date;
  timeSlots: {
    start: string;
    end: string;
    available: boolean;
  }[];
}

export class AppointmentSocketHandler {
  private subscriptions: Map<string, AppointmentFilter> = new Map();
  private staffSubscriptions: Map<string, string> = new Map(); // socketId -> staffId
  private clientSubscriptions: Map<string, string> = new Map(); // socketId -> clientId

  constructor(private socketServer: WebSocketServer) {}

  public handleSubscription(socket: Socket, filters: AppointmentFilter): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Store subscription filters
      this.subscriptions.set(socket.id, {
        ...filters,
        // Ensure company isolation
      });

      // Join relevant rooms based on filters
      if (filters.branchId) {
        socket.join(`branch:${filters.branchId}:appointments`);
      } else {
        socket.join(`company:${companyId}:appointments`);
      }

      if (filters.staffId) {
        socket.join(`staff:${filters.staffId}:appointments`);
      }

      socket.emit('appointments:subscribed', {
        filters,
        message: 'Subscribed to appointment updates'
      });

      logger.info(`Socket ${socket.id} subscribed to appointments with filters:`, filters);
    } catch (error) {
      logger.error('Error handling appointment subscription:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to appointments',
        error: error.message
      });
    }
  }

  public handleUnsubscription(socket: Socket): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Remove from subscription tracking
      this.subscriptions.delete(socket.id);

      // Leave all appointment-related rooms
      socket.leave(`company:${companyId}:appointments`);
      
      // Leave branch-specific rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.includes(':appointments')) {
          socket.leave(room);
        }
      });

      socket.emit('appointments:unsubscribed', {
        message: 'Unsubscribed from appointment updates'
      });

      logger.info(`Socket ${socket.id} unsubscribed from appointments`);
    } catch (error) {
      logger.error('Error handling appointment unsubscription:', error);
    }
  }

  public handleStaffSubscription(socket: Socket, staffId: string): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Store staff subscription
      this.staffSubscriptions.set(socket.id, staffId);
      
      // Join staff-specific appointment room
      socket.join(`staff:${staffId}:appointments`);
      socket.join(`staff:${staffId}:availability`);

      socket.emit('staff-appointments:subscribed', {
        staffId,
        message: 'Subscribed to staff appointment updates'
      });

      logger.info(`Socket ${socket.id} subscribed to staff ${staffId} appointments`);
    } catch (error) {
      logger.error('Error handling staff appointment subscription:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to staff appointments',
        error: error.message
      });
    }
  }

  public handleClientSubscription(socket: Socket, clientId: string): void {
    try {
      const { companyId } = (socket as any).data.user;
      
      // Store client subscription
      this.clientSubscriptions.set(socket.id, clientId);
      
      // Join client-specific appointment room
      socket.join(`client:${clientId}:appointments`);

      socket.emit('client-appointments:subscribed', {
        clientId,
        message: 'Subscribed to client appointment updates'
      });

      logger.info(`Socket ${socket.id} subscribed to client ${clientId} appointments`);
    } catch (error) {
      logger.error('Error handling client appointment subscription:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to client appointments',
        error: error.message
      });
    }
  }

  public handleDisconnection(socket: Socket): void {
    // Clean up subscriptions
    this.subscriptions.delete(socket.id);
    this.staffSubscriptions.delete(socket.id);
    this.clientSubscriptions.delete(socket.id);
  }

  // Methods to emit appointment events
  public handleAppointmentCreated(appointment: Appointment): void {
    try {
      const { companyId, staffId, clientId, branchId } = appointment;

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:appointments`,
        'appointment:created',
        appointment
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:appointments`,
          'appointment:created',
          appointment
        );
      }

      // Emit to staff
      this.socketServer.emitToRoom(
        `staff:${staffId}:appointments`,
        'appointment:created',
        appointment
      );

      // Emit to client
      this.socketServer.emitToRoom(
        `client:${clientId}:appointments`,
        'appointment:created',
        appointment
      );

      logger.info(`Appointment created event emitted for appointment ${appointment.id}`);
    } catch (error) {
      logger.error('Error emitting appointment created event:', error);
    }
  }

  public handleAppointmentUpdated(appointment: Appointment): void {
    try {
      const { companyId, staffId, clientId, branchId } = appointment;

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:appointments`,
        'appointment:updated',
        appointment
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:appointments`,
          'appointment:updated',
          appointment
        );
      }

      // Emit to staff
      this.socketServer.emitToRoom(
        `staff:${staffId}:appointments`,
        'appointment:updated',
        appointment
      );

      // Emit to client
      this.socketServer.emitToRoom(
        `client:${clientId}:appointments`,
        'appointment:updated',
        appointment
      );

      logger.info(`Appointment updated event emitted for appointment ${appointment.id}`);
    } catch (error) {
      logger.error('Error emitting appointment updated event:', error);
    }
  }

  public handleAppointmentCancelled(appointmentId: string, appointment: Partial<Appointment>): void {
    try {
      const { companyId, staffId, clientId, branchId } = appointment;

      const eventData = {
        id: appointmentId,
        ...appointment,
        status: 'CANCELLED',
        cancelledAt: new Date()
      };

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:appointments`,
        'appointment:cancelled',
        eventData
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:appointments`,
          'appointment:cancelled',
          eventData
        );
      }

      // Emit to staff
      if (staffId) {
        this.socketServer.emitToRoom(
          `staff:${staffId}:appointments`,
          'appointment:cancelled',
          eventData
        );
      }

      // Emit to client
      if (clientId) {
        this.socketServer.emitToRoom(
          `client:${clientId}:appointments`,
          'appointment:cancelled',
          eventData
        );
      }

      logger.info(`Appointment cancelled event emitted for appointment ${appointmentId}`);
    } catch (error) {
      logger.error('Error emitting appointment cancelled event:', error);
    }
  }

  public handleAppointmentStatusChange(appointmentId: string, status: string, appointment: Partial<Appointment>): void {
    try {
      const { companyId, staffId, clientId, branchId } = appointment;

      const eventData = {
        id: appointmentId,
        status,
        statusChangedAt: new Date(),
        ...appointment
      };

      // Emit to company
      this.socketServer.emitToRoom(
        `company:${companyId}:appointments`,
        'appointment:status-changed',
        eventData
      );

      // Emit to branch if specified
      if (branchId) {
        this.socketServer.emitToRoom(
          `branch:${branchId}:appointments`,
          'appointment:status-changed',
          eventData
        );
      }

      // Emit to staff
      if (staffId) {
        this.socketServer.emitToRoom(
          `staff:${staffId}:appointments`,
          'appointment:status-changed',
          eventData
        );
      }

      // Emit to client
      if (clientId) {
        this.socketServer.emitToRoom(
          `client:${clientId}:appointments`,
          'appointment:status-changed',
          eventData
        );
      }

      logger.info(`Appointment status change event emitted for appointment ${appointmentId}`);
    } catch (error) {
      logger.error('Error emitting appointment status change event:', error);
    }
  }

  public handleAvailabilityChange(staffId: string, companyId: string, availabilityData: AvailabilityChange): void {
    try {
      // Emit to staff availability subscribers
      this.socketServer.emitToRoom(
        `staff:${staffId}:availability`,
        'availability:changed',
        availabilityData
      );

      // Emit to company for scheduling dashboard
      this.socketServer.emitToRoom(
        `company:${companyId}:appointments`,
        'availability:changed',
        availabilityData
      );

      logger.info(`Availability change event emitted for staff ${staffId}`);
    } catch (error) {
      logger.error('Error emitting availability change event:', error);
    }
  }

  public handleBulkAppointmentUpdate(appointments: Appointment[]): void {
    try {
      // Group appointments by company for efficient emission
      const appointmentsByCompany = appointments.reduce((acc, appointment) => {
        if (!acc[appointment.companyId]) {
          acc[appointment.companyId] = [];
        }
        acc[appointment.companyId].push(appointment);
        return acc;
      }, {} as Record<string, Appointment[]>);

      // Emit bulk updates to each company
      Object.entries(appointmentsByCompany).forEach(([companyId, companyAppointments]) => {
        this.socketServer.emitToRoom(
          `company:${companyId}:appointments`,
          'appointments:bulk-updated',
          {
            appointments: companyAppointments,
            updatedAt: new Date()
          }
        );
      });

      logger.info(`Bulk appointment update event emitted for ${appointments.length} appointments`);
    } catch (error) {
      logger.error('Error emitting bulk appointment update event:', error);
    }
  }

  // Utility methods for subscription management
  public getActiveSubscriptions(): Map<string, AppointmentFilter> {
    return this.subscriptions;
  }

  public getStaffSubscriptions(): Map<string, string> {
    return this.staffSubscriptions;
  }

  public getClientSubscriptions(): Map<string, string> {
    return this.clientSubscriptions;
  }
}