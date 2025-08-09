import { Request, Response } from 'express';
import { z } from 'zod';
import { AppointmentService, AppointmentInput } from '../services/appointment.service';
import { AvailabilityService } from '../services/availability.service';
import { BookingService, PublicBookingData, WaitlistEntry } from '../services/booking.service';
import { AppointmentStatus, AppointmentSource } from '@prisma/client';
import { successResponse, errorResponse } from '../utils/response';

// Validation schemas
const createAppointmentSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  staffId: z.string().optional(),
  resourceId: z.string().optional(),
  
  // Client info
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  clientEmail: z.string().email().optional(),
  isNewClient: z.boolean().optional(),
  
  // Scheduling
  date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format').optional(),
  totalDuration: z.number().min(1, 'Duration must be at least 1 minute'),
  
  // Services
  services: z.array(z.object({
    serviceId: z.string(),
    serviceName: z.string(),
    duration: z.number(),
    price: z.number(),
    staffId: z.string().optional()
  })).min(1, 'At least one service is required'),
  categoryId: z.string().optional(),
  totalPrice: z.number().min(0, 'Total price cannot be negative'),
  
  // Status
  status: z.nativeEnum(AppointmentStatus).optional(),
  paymentStatus: z.string().optional(),
  
  // Recurring
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    interval: z.number().min(1),
    endDate: z.string().optional(),
    maxOccurrences: z.number().optional(),
    excludeDates: z.array(z.string()).optional()
  }).optional(),
  
  // Details
  title: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  color: z.string().optional(),
  
  // Pricing
  startingPrice: z.number().optional(),
  prepaidAmount: z.number().optional(),
  discount: z.number().optional(),
  
  // Source
  source: z.nativeEnum(AppointmentSource).optional(),
  bookingLinkId: z.string().optional(),
  
  // Notifications
  notifications: z.array(z.object({
    type: z.enum(['confirmation', 'reminder', 'follow_up']),
    methods: z.array(z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'])),
    timing: z.number().optional()
  })).optional()
});

const updateAppointmentSchema = createAppointmentSchema.partial();

const appointmentFilterSchema = z.object({
  branchId: z.string().optional(),
  staffId: z.string().optional(),
  clientId: z.string().optional(),
  status: z.array(z.nativeEnum(AppointmentStatus)).optional(),
  source: z.array(z.nativeEnum(AppointmentSource)).optional(),
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

const availabilityQuerySchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  serviceIds: z.array(z.string()).min(1, 'At least one service ID is required'),
  staffId: z.string().optional(),
  duration: z.number().min(1).optional(),
  resourceIds: z.array(z.string()).optional()
});

const publicBookingSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  clientEmail: z.string().email().optional(),
  serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
  preferredStaffId: z.string().optional(),
  date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  notes: z.string().optional(),
  source: z.enum(['WEB', 'APP', 'PHONE']).default('WEB'),
  bookingLinkId: z.string().optional()
});

const waitlistSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  clientEmail: z.string().email().optional(),
  serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
  preferredStaffId: z.string().optional(),
  preferredDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  flexibleDates: z.boolean().default(false),
  notes: z.string().optional()
});

export class AppointmentController {
  private appointmentService = new AppointmentService();
  private availabilityService = new AvailabilityService();
  private bookingService = new BookingService();
  
  // Admin Endpoints
  
  /**
   * Create appointment (Admin)
   */
  async createAppointment(req: Request, res: Response) {
    try {
      const validation = createAppointmentSchema.safeParse(req.body);
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.errors);
      }
      
      const data = validation.data;
      const companyId = req.user?.companyId!;
      const userId = req.user?.id!;
      
      // Convert string date to Date object
      const appointmentInput: AppointmentInput = {
        ...data,
        companyId,
        date: new Date(data.date),
        recurringPattern: data.recurringPattern ? {
          ...data.recurringPattern,
          endDate: data.recurringPattern.endDate ? new Date(data.recurringPattern.endDate) : undefined
        } : undefined
      };
      
      const appointmentId = await this.appointmentService.createAppointment(appointmentInput, userId);
      
      // Get created appointment with full details
      const appointment = await this.appointmentService.getAppointmentById(appointmentId);
      
      return successResponse(res, 'Appointment created successfully', {
        appointmentId,
        appointment
      }, 201);
      
    } catch (error) {
      console.error('Error in createAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to create appointment');
    }
  }
  
  /**
   * Get appointments with filtering (Admin)
   */
  async getAppointments(req: Request, res: Response) {
    try {
      const validation = appointmentFilterSchema.safeParse(req.query);
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.errors);
      }
      
      const filter = validation.data;
      const companyId = req.user?.companyId!;
      
      const appointments = await this.appointmentService.getAppointments({
        ...filter,
        companyId,
        startDate: filter.startDate ? new Date(filter.startDate) : undefined,
        endDate: filter.endDate ? new Date(filter.endDate) : undefined
      });
      
      return successResponse(res, 'Appointments retrieved successfully', appointments);
      
    } catch (error) {
      console.error('Error in getAppointments:', error);
      return errorResponse(res, 'Failed to retrieve appointments');
    }
  }
  
  /**
   * Get single appointment (Admin)
   */
  async getAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const appointment = await this.appointmentService.getAppointmentById(id);
      
      return successResponse(res, 'Appointment retrieved successfully', appointment);
      
    } catch (error) {
      console.error('Error in getAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to retrieve appointment');
    }
  }
  
  /**
   * Update appointment (Admin)
   */
  async updateAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validation = updateAppointmentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.errors);
      }
      
      const updates = validation.data;
      const userId = req.user?.id!;
      
      // Convert date strings to Date objects
      const updateData: Partial<AppointmentInput> = {
        ...updates,
        date: updates.date ? new Date(updates.date) : undefined,
        recurringPattern: updates.recurringPattern ? {
          ...updates.recurringPattern,
          endDate: updates.recurringPattern.endDate ? new Date(updates.recurringPattern.endDate) : undefined
        } : undefined
      };
      
      const updatedAppointment = await this.appointmentService.updateAppointment(id, updateData, userId);
      
      return successResponse(res, 'Appointment updated successfully', updatedAppointment);
      
    } catch (error) {
      console.error('Error in updateAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to update appointment');
    }
  }
  
  /**
   * Cancel appointment (Admin)
   */
  async cancelAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason, cancelledBy } = req.body;
      const userId = req.user?.id!;
      
      await this.appointmentService.cancelAppointment(id, userId, reason, cancelledBy);
      
      return successResponse(res, 'Appointment cancelled successfully');
      
    } catch (error) {
      console.error('Error in cancelAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to cancel appointment');
    }
  }
  
  /**
   * Reschedule appointment (Admin)
   */
  async rescheduleAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newDate, newStartTime, newStaffId } = req.body;
      const userId = req.user?.id!;
      
      if (!newDate || !newStartTime) {
        return errorResponse(res, 'New date and start time are required', 400);
      }
      
      const newAppointmentId = await this.appointmentService.rescheduleAppointment(
        id,
        new Date(newDate),
        newStartTime,
        newStaffId,
        userId
      );
      
      const newAppointment = await this.appointmentService.getAppointmentById(newAppointmentId);
      
      return successResponse(res, 'Appointment rescheduled successfully', {
        originalAppointmentId: id,
        newAppointmentId,
        newAppointment
      });
      
    } catch (error) {
      console.error('Error in rescheduleAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to reschedule appointment');
    }
  }
  
  /**
   * Check-in appointment (Admin)
   */
  async checkInAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id!;
      
      const appointment = await this.appointmentService.checkInAppointment(id, userId);
      
      return successResponse(res, 'Client checked in successfully', appointment);
      
    } catch (error) {
      console.error('Error in checkInAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to check in appointment');
    }
  }
  
  /**
   * Start appointment (Admin)
   */
  async startAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id!;
      
      const appointment = await this.appointmentService.startAppointment(id, userId);
      
      return successResponse(res, 'Appointment started successfully', appointment);
      
    } catch (error) {
      console.error('Error in startAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to start appointment');
    }
  }
  
  /**
   * Complete appointment (Admin)
   */
  async completeAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id!;
      
      const appointment = await this.appointmentService.completeAppointment(id, userId);
      
      return successResponse(res, 'Appointment completed successfully', appointment);
      
    } catch (error) {
      console.error('Error in completeAppointment:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to complete appointment');
    }
  }
  
  /**
   * Mark no-show (Admin)
   */
  async markNoShow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id!;
      
      const appointment = await this.appointmentService.markNoShow(id, userId);
      
      return successResponse(res, 'Appointment marked as no-show', appointment);
      
    } catch (error) {
      console.error('Error in markNoShow:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to mark no-show');
    }
  }
  
  // Availability Endpoints
  
  /**
   * Get available slots
   */
  async getAvailableSlots(req: Request, res: Response) {
    try {
      const validation = availabilityQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.errors);
      }
      
      const query = validation.data;
      const availableSlots = await this.availabilityService.getAvailableSlots({
        ...query,
        date: new Date(query.date),
        serviceIds: Array.isArray(query.serviceIds) ? query.serviceIds : [query.serviceIds]
      });
      
      return successResponse(res, 'Available slots retrieved successfully', availableSlots);
      
    } catch (error) {
      console.error('Error in getAvailableSlots:', error);
      return errorResponse(res, 'Failed to get available slots');
    }
  }
  
  /**
   * Check specific slot availability
   */
  async checkSlotAvailability(req: Request, res: Response) {
    try {
      const { branchId, date, startTime, staffId } = req.query;
      const { serviceIds } = req.body;
      
      if (!branchId || !date || !startTime || !serviceIds) {
        return errorResponse(res, 'Branch ID, date, start time, and service IDs are required', 400);
      }
      
      const availability = await this.availabilityService.checkSlotAvailability(
        branchId as string,
        new Date(date as string),
        startTime as string,
        serviceIds,
        staffId as string | undefined
      );
      
      return successResponse(res, 'Slot availability checked', availability);
      
    } catch (error) {
      console.error('Error in checkSlotAvailability:', error);
      return errorResponse(res, 'Failed to check slot availability');
    }
  }
  
  // Public Booking Endpoints
  
  /**
   * Get public booking availability
   */
  async getPublicAvailability(req: Request, res: Response) {
    try {
      const { companyId, branchId, date, staffId } = req.query;
      const { serviceIds } = req.body;
      
      if (!companyId || !branchId || !date || !serviceIds) {
        return errorResponse(res, 'Company ID, branch ID, date, and service IDs are required', 400);
      }
      
      const availability = await this.bookingService.getPublicAvailability(
        companyId as string,
        branchId as string,
        serviceIds,
        new Date(date as string),
        staffId as string | undefined
      );
      
      return successResponse(res, 'Public availability retrieved', availability);
      
    } catch (error) {
      console.error('Error in getPublicAvailability:', error);
      return errorResponse(res, 'Failed to get availability');
    }
  }
  
  /**
   * Create public booking
   */
  async createPublicBooking(req: Request, res: Response) {
    try {
      const validation = publicBookingSchema.safeParse(req.body);
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.errors);
      }
      
      const data = validation.data;
      const companyId = req.params.companyId; // From URL path
      
      const bookingData: PublicBookingData = {
        ...data,
        companyId,
        date: new Date(data.date)
      };
      
      const confirmation = await this.bookingService.createBooking(bookingData);
      
      return successResponse(res, 'Booking created successfully', confirmation, 201);
      
    } catch (error) {
      console.error('Error in createPublicBooking:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to create booking');
    }
  }
  
  /**
   * Cancel public booking
   */
  async cancelPublicBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;
      
      await this.bookingService.cancelBooking(id, cancellationReason);
      
      return successResponse(res, 'Booking cancelled successfully');
      
    } catch (error) {
      console.error('Error in cancelPublicBooking:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to cancel booking');
    }
  }
  
  /**
   * Get client bookings
   */
  async getClientBookings(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const { clientPhone, limit } = req.query;
      
      if (!clientPhone) {
        return errorResponse(res, 'Client phone is required', 400);
      }
      
      const bookings = await this.bookingService.getClientBookings(
        companyId,
        clientPhone as string,
        limit ? parseInt(limit as string) : undefined
      );
      
      return successResponse(res, 'Client bookings retrieved', bookings);
      
    } catch (error) {
      console.error('Error in getClientBookings:', error);
      return errorResponse(res, 'Failed to get client bookings');
    }
  }
  
  // Waitlist Endpoints
  
  /**
   * Add to waitlist
   */
  async addToWaitlist(req: Request, res: Response) {
    try {
      const validation = waitlistSchema.safeParse(req.body);
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.errors);
      }
      
      const data = validation.data;
      const companyId = req.params.companyId;
      
      const waitlistData: WaitlistEntry = {
        ...data,
        companyId,
        preferredDate: new Date(data.preferredDate)
      };
      
      const waitlistId = await this.bookingService.addToWaitlist(waitlistData);
      
      return successResponse(res, 'Added to waitlist successfully', { waitlistId }, 201);
      
    } catch (error) {
      console.error('Error in addToWaitlist:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to add to waitlist');
    }
  }
  
  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await this.bookingService.removeFromWaitlist(id);
      
      return successResponse(res, 'Removed from waitlist successfully');
      
    } catch (error) {
      console.error('Error in removeFromWaitlist:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to remove from waitlist');
    }
  }
  
  // Bulk Operations
  
  /**
   * Get bulk availability for calendar view
   */
  async getBulkAvailability(req: Request, res: Response) {
    try {
      const { companyId, branchId, startDate, endDate, staffId } = req.query;
      const { serviceIds } = req.body;
      
      if (!companyId || !branchId || !startDate || !endDate || !serviceIds) {
        return errorResponse(res, 'Missing required parameters', 400);
      }
      
      const availability = await this.bookingService.getBulkAvailability(
        companyId as string,
        branchId as string,
        serviceIds,
        new Date(startDate as string),
        new Date(endDate as string),
        staffId as string | undefined
      );
      
      return successResponse(res, 'Bulk availability retrieved', availability);
      
    } catch (error) {
      console.error('Error in getBulkAvailability:', error);
      return errorResponse(res, 'Failed to get bulk availability');
    }
  }
}

export const appointmentController = new AppointmentController();