import { Request, Response } from 'express';
import { z } from 'zod';
import { AppointmentService } from '../services/appointment.service';
import { RecurringAppointmentService } from '../services/recurring-appointment.service';
import { successResponse, errorResponse } from '../utils/response';
import { AppointmentStatus } from '@prisma/client';

// Validation schemas
const createRecurringSeriesSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  staffId: z.string().optional(),
  
  // Client info
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  clientEmail: z.string().email().optional(),
  
  // Scheduling
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  totalDuration: z.number().min(1, 'Duration must be at least 1 minute'),
  
  // Services
  services: z.array(z.object({
    serviceId: z.string(),
    serviceName: z.string(),
    duration: z.number(),
    price: z.number(),
    staffId: z.string().optional()
  })).min(1, 'At least one service is required'),
  totalPrice: z.number().min(0, 'Total price cannot be negative'),
  
  // Recurring pattern
  recurringPattern: z.object({
    type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    interval: z.number().min(1),
    endDate: z.string().optional(),
    maxOccurrences: z.number().optional(),
    excludeDates: z.array(z.string()).optional(),
    specificDays: z.array(z.number().min(0).max(6)).optional(), // For weekly: 0=Sunday, 6=Saturday
    dayOfMonth: z.number().min(1).max(31).optional(), // For monthly
    weekOfMonth: z.number().min(1).max(5).optional() // For monthly: 1st week, 2nd week, etc.
  }),
  
  // Optional details
  title: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  color: z.string().optional(),
  
  // Notification settings for the series
  notifications: z.array(z.object({
    type: z.enum(['confirmation', 'reminder', 'follow_up']),
    methods: z.array(z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'])),
    timing: z.number().optional()
  })).optional()
});

const updateRecurringSeriesSchema = z.object({
  // What to update
  updateType: z.enum(['THIS_ONLY', 'THIS_AND_FUTURE', 'ALL_OCCURRENCES']),
  
  // Optional updates
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  totalDuration: z.number().min(1).optional(),
  staffId: z.string().optional(),
  services: z.array(z.object({
    serviceId: z.string(),
    serviceName: z.string(),
    duration: z.number(),
    price: z.number(),
    staffId: z.string().optional()
  })).optional(),
  totalPrice: z.number().min(0).optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  color: z.string().optional(),
  
  // Pattern updates (only for THIS_AND_FUTURE or ALL_OCCURRENCES)
  recurringPattern: z.object({
    type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    interval: z.number().min(1).optional(),
    endDate: z.string().optional(),
    maxOccurrences: z.number().optional(),
    excludeDates: z.array(z.string()).optional(),
    specificDays: z.array(z.number().min(0).max(6)).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    weekOfMonth: z.number().min(1).max(5).optional()
  }).optional()
});

export class RecurringAppointmentController {
  private appointmentService = new AppointmentService();
  private recurringService = new RecurringAppointmentService();
  
  /**
   * Create a new recurring appointment series
   */
  async createRecurringSeries(req: Request, res: Response) {
    try {
      const validation = createRecurringSeriesSchema.safeParse(req.body);
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.issues);
      }
      
      const data = validation.data;
      const companyId = req.user?.companyId!;
      const userId = req.user?.userId!;
      
      const seriesId = await this.recurringService.createRecurringSeries({
        ...data,
        companyId,
        startDate: new Date(data.startDate),
        recurringPattern: {
          ...data.recurringPattern,
          endDate: data.recurringPattern.endDate ? new Date(data.recurringPattern.endDate) : undefined
        }
      }, userId);
      
      const series = await this.recurringService.getRecurringSeries(seriesId);
      
      return successResponse(res, 'Recurring appointment series created successfully', {
        seriesId,
        series
      }, 201);
      
    } catch (error) {
      console.error('Error in createRecurringSeries:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to create recurring series');
    }
  }
  
  /**
   * Get recurring appointment series details
   */
  async getRecurringSeries(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { includeAppointments } = req.query;
      
      const series = await this.recurringService.getRecurringSeries(
        groupId, 
        includeAppointments === 'true'
      );
      
      return successResponse(res, 'Recurring series retrieved successfully', series);
      
    } catch (error) {
      console.error('Error in getRecurringSeries:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to get recurring series');
    }
  }
  
  /**
   * Update recurring appointment series
   */
  async updateRecurringSeries(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { appointmentId } = req.query; // Specific appointment ID for context
      
      const validation = updateRecurringSeriesSchema.safeParse(req.body);
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.issues);
      }
      
      const data = validation.data;
      const userId = req.user?.userId!;
      
      const result = await this.recurringService.updateRecurringSeries(
        groupId,
        appointmentId as string || undefined,
        data,
        userId
      );
      
      return successResponse(res, 'Recurring series updated successfully', result);
      
    } catch (error) {
      console.error('Error in updateRecurringSeries:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to update recurring series');
    }
  }
  
  /**
   * Delete/Cancel recurring appointment series
   */
  async deleteRecurringSeries(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { appointmentId, deleteType, reason } = req.query;
      const userId = req.user?.userId!;
      
      if (!deleteType || !['THIS_ONLY', 'THIS_AND_FUTURE', 'ALL_OCCURRENCES'].includes(deleteType as string)) {
        return errorResponse(res, 'Delete type is required and must be one of: THIS_ONLY, THIS_AND_FUTURE, ALL_OCCURRENCES', 400);
      }
      
      const result = await this.recurringService.deleteRecurringSeries(
        groupId,
        appointmentId as string || undefined,
        deleteType as 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES',
        reason as string || 'Cancelled by user',
        userId
      );
      
      return successResponse(res, 'Recurring series cancelled successfully', result);
      
    } catch (error) {
      console.error('Error in deleteRecurringSeries:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to cancel recurring series');
    }
  }
  
  /**
   * Get all recurring series for a company
   */
  async getCompanyRecurringSeries(req: Request, res: Response) {
    try {
      const { status, branchId, staffId, clientId, limit, offset } = req.query;
      const companyId = req.user?.companyId!;
      
      const filters = {
        companyId,
        status: status ? (status as string).split(',') as AppointmentStatus[] : undefined,
        branchId: branchId as string,
        staffId: staffId as string,
        clientId: clientId as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      };
      
      const series = await this.recurringService.getCompanyRecurringSeries(filters);
      
      return successResponse(res, 'Company recurring series retrieved successfully', series);
      
    } catch (error) {
      console.error('Error in getCompanyRecurringSeries:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to get recurring series');
    }
  }
  
  /**
   * Skip specific occurrence in recurring series
   */
  async skipOccurrence(req: Request, res: Response) {
    try {
      const { groupId, appointmentId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.userId!;
      
      const result = await this.recurringService.skipOccurrence(
        groupId,
        appointmentId,
        reason || 'Skipped by user',
        userId
      );
      
      return successResponse(res, 'Appointment occurrence skipped successfully', result);
      
    } catch (error) {
      console.error('Error in skipOccurrence:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to skip occurrence');
    }
  }
  
  /**
   * Reschedule specific occurrence in recurring series
   */
  async rescheduleOccurrence(req: Request, res: Response) {
    try {
      const { groupId, appointmentId } = req.params;
      const { newDate, newStartTime, newStaffId, applyToFuture } = req.body;
      const userId = req.user?.userId!;
      
      if (!newDate || !newStartTime) {
        return errorResponse(res, 'New date and start time are required', 400);
      }
      
      const result = await this.recurringService.rescheduleOccurrence(
        groupId,
        appointmentId,
        {
          newDate: new Date(newDate),
          newStartTime,
          newStaffId,
          applyToFuture: applyToFuture === true
        },
        userId
      );
      
      return successResponse(res, 'Appointment occurrence rescheduled successfully', result);
      
    } catch (error) {
      console.error('Error in rescheduleOccurrence:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to reschedule occurrence');
    }
  }
  
  /**
   * Get recurring series statistics
   */
  async getRecurringStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate, branchId, staffId } = req.query;
      const companyId = req.user?.companyId!;
      
      const stats = await this.recurringService.getRecurringStatistics({
        companyId,
        branchId: branchId as string,
        staffId: staffId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      return successResponse(res, 'Recurring appointment statistics retrieved successfully', stats);
      
    } catch (error) {
      console.error('Error in getRecurringStatistics:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to get recurring statistics');
    }
  }
  
  /**
   * Generate upcoming occurrences preview
   */
  async previewUpcomingOccurrences(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { limit } = req.query;
      
      const preview = await this.recurringService.previewUpcomingOccurrences(
        groupId,
        limit ? parseInt(limit as string) : 10
      );
      
      return successResponse(res, 'Upcoming occurrences preview generated', preview);
      
    } catch (error) {
      console.error('Error in previewUpcomingOccurrences:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to generate preview');
    }
  }
  
  /**
   * Check for conflicts in recurring series
   */
  async checkRecurringConflicts(req: Request, res: Response) {
    try {
      const validation = createRecurringSeriesSchema.omit({ 
        clientName: true, 
        clientPhone: true,
        services: true,
        totalPrice: true 
      }).extend({
        services: z.array(z.string()).min(1), // Just service IDs for conflict check
        excludeGroupId: z.string().optional()
      }).safeParse(req.body);
      
      if (!validation.success) {
        return errorResponse(res, 'Validation error', 400, validation.error.issues);
      }
      
      const data = validation.data;
      const companyId = req.user?.companyId!;
      
      const conflicts = await this.recurringService.checkRecurringConflicts({
        ...data,
        companyId,
        startDate: new Date(data.startDate),
        recurringPattern: {
          ...data.recurringPattern,
          endDate: data.recurringPattern.endDate ? new Date(data.recurringPattern.endDate) : undefined
        }
      });
      
      return successResponse(res, 'Recurring conflicts checked', {
        hasConflicts: conflicts.length > 0,
        conflicts
      });
      
    } catch (error) {
      console.error('Error in checkRecurringConflicts:', error);
      return errorResponse(res, error instanceof Error ? error.message : 'Failed to check recurring conflicts');
    }
  }
}

export const recurringAppointmentController = new RecurringAppointmentController();