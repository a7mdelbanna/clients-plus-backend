import { PrismaClient, AppointmentStatus, AppointmentSource, ReminderType, PaymentStatus } from '@prisma/client';
import { addMinutes, addDays, addWeeks, addMonths, format, parse, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { enhancedNotificationService, EnhancedNotificationData } from './enhanced-notification.service';
import { availabilityService } from './availability.service';

const prisma = new PrismaClient();

export interface AppointmentInput {
  companyId: string;
  branchId: string;
  clientId: string;
  staffId?: string;
  resourceId?: string;
  
  // Client Information
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  isNewClient?: boolean;
  
  // Scheduling
  date: Date;
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  duration?: number; // legacy
  totalDuration: number; // in minutes
  
  // Services
  services: ServiceAppointmentInput[];
  categoryId?: string;
  totalPrice: number;
  
  // Status
  status?: AppointmentStatus;
  paymentStatus?: string;
  
  // Recurring
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  
  // Details
  title?: string;
  notes?: string;
  internalNotes?: string;
  color?: string;
  
  // Pricing
  startingPrice?: number;
  prepaidAmount?: number;
  discount?: number;
  
  // Resources
  resources?: any[];
  
  // Source
  source?: AppointmentSource;
  bookingLinkId?: string;
  
  // Notifications
  notifications?: NotificationConfig[];
}

export interface ServiceAppointmentInput {
  serviceId: string;
  serviceName: string;
  duration: number;
  price: number;
  staffId?: string;
}

export interface RecurringPattern {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number; // 1 = every day/week/month, 2 = every other, etc.
  endDate?: Date;
  maxOccurrences?: number;
  excludeDates?: string[]; // ISO date strings
}

export interface NotificationConfig {
  type: 'confirmation' | 'reminder' | 'follow_up';
  methods: ('SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH')[];
  timing?: number; // minutes before appointment
}

export interface TimeSlot {
  date: string; // ISO date
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  available: boolean;
  staffId: string;
  conflictReason?: string;
}

export interface Conflict {
  type: 'STAFF_UNAVAILABLE' | 'RESOURCE_UNAVAILABLE' | 'CLIENT_DOUBLE_BOOKING' | 'BUSINESS_HOURS';
  message: string;
  staffId?: string;
  resourceId?: string;
  conflictingAppointmentId?: string;
}

export interface AppointmentFilter {
  companyId: string;
  branchId?: string;
  staffId?: string;
  clientId?: string;
  status?: AppointmentStatus[];
  source?: AppointmentSource[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AppointmentService {
  private availabilityService = availabilityService;
  
  /**
   * Create a new appointment with comprehensive validation
   */
  async createAppointment(input: AppointmentInput, userId: string): Promise<string> {
    try {
      // 1. Validate input
      await this.validateAppointmentInput(input);
      
      // 2. Check availability and detect conflicts
      const conflicts = await this.detectConflicts(input);
      if (conflicts.length > 0) {
        throw new Error(`Appointment conflicts detected: ${conflicts.map(c => c.message).join(', ')}`);
      }
      
      // 3. Calculate end time if not provided
      const endTime = input.endTime || this.calculateEndTime(input.startTime, input.totalDuration);
      
      // 4. Create appointment in transaction
      const appointment = await prisma.$transaction(async (tx) => {
        const newAppointment = await tx.appointment.create({
          data: {
            // Basic info
            companyId: input.companyId,
            branchId: input.branchId,
            clientId: input.clientId,
            staffId: input.staffId,
            resourceId: input.resourceId,
            
            // Client info
            clientName: input.clientName,
            clientPhone: input.clientPhone,
            clientEmail: input.clientEmail,
            isNewClient: input.isNewClient || false,
            staffName: input.staffId ? await this.getStaffName(input.staffId) : undefined,
            
            // Scheduling
            date: input.date,
            startTime: input.startTime,
            endTime,
            duration: input.duration,
            totalDuration: input.totalDuration,
            
            // Services (JSON)
            services: input.services as any,
            categoryId: input.categoryId,
            totalPrice: input.totalPrice,
            
            // Status
            status: input.status || AppointmentStatus.PENDING,
            paymentStatus: (input.paymentStatus as PaymentStatus) || PaymentStatus.PENDING,
            
            // Recurring
            isRecurring: input.isRecurring || false,
            recurringPattern: input.recurringPattern as any,
            
            // Details
            title: input.title,
            notes: input.notes,
            internalNotes: input.internalNotes,
            color: input.color,
            
            // Pricing
            startingPrice: input.startingPrice,
            prepaidAmount: input.prepaidAmount,
            discount: input.discount,
            
            // Resources
            resources: input.resources,
            
            // Source and metadata
            source: input.source || AppointmentSource.DASHBOARD,
            bookingLinkId: input.bookingLinkId,
            createdBy: userId,
            
            // Notifications
            notifications: input.notifications as any,
            
            // Change tracking
            changeHistory: [{
              changedAt: new Date(),
              changedBy: userId,
              changes: ['Appointment created']
            }]
          }
        });
        
        return newAppointment;
      });
      
      // 5. Handle recurring appointments if needed
      if (input.isRecurring && input.recurringPattern) {
        await this.createRecurringSeries(appointment.id, input, userId);
      }
      
      // 6. Send confirmation and schedule reminders
      await this.sendAppointmentNotifications(appointment.id, 'confirmation');
      
      return appointment.id;
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }
  
  /**
   * Get appointments with comprehensive filtering
   */
  async getAppointments(filter: AppointmentFilter) {
    try {
      const where: any = {
        companyId: filter.companyId,
      };
      
      if (filter.branchId) where.branchId = filter.branchId;
      if (filter.staffId) where.staffId = filter.staffId;
      if (filter.clientId) where.clientId = filter.clientId;
      if (filter.status?.length) where.status = { in: filter.status };
      if (filter.source?.length) where.source = { in: filter.source };
      
      if (filter.startDate || filter.endDate) {
        where.date = {};
        if (filter.startDate) where.date.gte = filter.startDate;
        if (filter.endDate) where.date.lte = filter.endDate;
      }
      
      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          client: true,
          staff: true,
          branch: true,
          reminders: true,
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ],
        take: filter.limit,
        skip: filter.offset,
      });
      
      return appointments;
    } catch (error) {
      console.error('Error getting appointments:', error);
      throw error;
    }
  }
  
  /**
   * Get single appointment by ID
   */
  async getAppointmentById(appointmentId: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: true,
          staff: true,
          branch: true,
          reminders: true,
          company: true,
        }
      });
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      return appointment;
    } catch (error) {
      console.error('Error getting appointment:', error);
      throw error;
    }
  }
  
  /**
   * Update appointment with conflict checking
   */
  async updateAppointment(appointmentId: string, updates: Partial<AppointmentInput>, userId: string) {
    try {
      const currentAppointment = await this.getAppointmentById(appointmentId);
      
      // Check for conflicts if scheduling details changed
      if (updates.date || updates.startTime || updates.staffId || updates.totalDuration) {
        const mergedInput: AppointmentInput = {
          ...currentAppointment,
          ...updates,
          date: updates.date || currentAppointment.date,
          startTime: updates.startTime || currentAppointment.startTime,
          staffId: updates.staffId || currentAppointment.staffId,
          totalDuration: updates.totalDuration || currentAppointment.totalDuration,
        } as AppointmentInput;
        
        const conflicts = await this.detectConflicts(mergedInput, appointmentId);
        if (conflicts.length > 0) {
          throw new Error(`Update conflicts detected: ${conflicts.map(c => c.message).join(', ')}`);
        }
      }
      
      // Track changes
      const changes: string[] = [];
      if (updates.date) changes.push('Date changed');
      if (updates.startTime) changes.push('Time changed');
      if (updates.staffId) changes.push('Staff changed');
      if (updates.status) changes.push(`Status changed to ${updates.status}`);
      if (updates.services) changes.push('Services modified');
      
      const changeEntry = {
        changedAt: new Date(),
        changedBy: userId,
        changes
      };
      
      // Calculate end time if needed
      let endTime = updates.endTime;
      if (updates.startTime && updates.totalDuration && !endTime) {
        endTime = this.calculateEndTime(updates.startTime, updates.totalDuration);
      }
      
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          ...(updates as any),
          endTime,
          lastModifiedBy: userId,
          changeHistory: [...(currentAppointment.changeHistory as any[] || []), changeEntry]
        },
        include: {
          client: true,
          staff: true,
          branch: true,
        }
      });
      
      return updatedAppointment;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }
  
  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: string, userId: string, reason?: string, cancelledBy?: string) {
    try {
      const updates = {
        status: AppointmentStatus.CANCELLED,
        cancelledBy: cancelledBy || 'staff',
        cancelledAt: new Date(),
        cancellationReason: reason,
        internalNotes: reason ? `Cancellation reason: ${reason}` : undefined
      };
      
      const result = await this.updateAppointment(appointmentId, updates, userId);
      
      // Send cancellation notification
      await this.sendAppointmentNotifications(appointmentId, 'cancellation');
      
      return result;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }
  
  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: Date,
    newStartTime: string,
    newStaffId?: string,
    userId?: string
  ) {
    try {
      const currentAppointment = await this.getAppointmentById(appointmentId);
      
      // Create new appointment with new time
      const newAppointmentInput: AppointmentInput = {
        companyId: currentAppointment.companyId,
        branchId: currentAppointment.branchId,
        clientId: currentAppointment.clientId,
        staffId: (newStaffId || currentAppointment.staffId) as string,
        resourceId: currentAppointment.resourceId || undefined,
        clientName: currentAppointment.clientName,
        clientPhone: currentAppointment.clientPhone,
        clientEmail: currentAppointment.clientEmail || undefined,
        isNewClient: currentAppointment.isNewClient,
        date: newDate,
        startTime: newStartTime,
        endTime: this.calculateEndTime(newStartTime, currentAppointment.totalDuration),
        totalDuration: currentAppointment.totalDuration,
        services: (currentAppointment.services as unknown) as ServiceAppointmentInput[],
        categoryId: currentAppointment.categoryId || undefined,
        totalPrice: currentAppointment.totalPrice.toNumber(),
        status: AppointmentStatus.PENDING,
        paymentStatus: currentAppointment.paymentStatus,
        isRecurring: false, // Don't copy recurring pattern for reschedule
        title: currentAppointment.title || undefined,
        notes: currentAppointment.notes || undefined,
        internalNotes: currentAppointment.internalNotes || undefined,
        color: currentAppointment.color || undefined,
        startingPrice: currentAppointment.startingPrice?.toNumber() || undefined,
        prepaidAmount: currentAppointment.prepaidAmount?.toNumber() || undefined,
        discount: currentAppointment.discount?.toNumber() || undefined,
        resources: currentAppointment.resources as any[] || undefined,
        source: currentAppointment.source,
        bookingLinkId: currentAppointment.bookingLinkId || undefined,
        notifications: (currentAppointment.notifications as unknown) as NotificationConfig[]
      };
      
      const newAppointmentId = await this.createAppointment(newAppointmentInput, userId || 'system');
      
      // Update original appointment
      await this.updateAppointment(appointmentId, {
        status: AppointmentStatus.RESCHEDULED,
        rescheduledTo: newAppointmentId,
        rescheduledAt: new Date()
      } as any, userId || 'system');
      
      // Send reschedule notification for the new appointment
      await this.sendAppointmentNotifications(newAppointmentId, 'reschedule');
      
      return newAppointmentId;
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  }
  
  /**
   * Check-in client
   */
  async checkInAppointment(appointmentId: string, userId: string) {
    try {
      return await this.updateAppointment(appointmentId, {
        status: AppointmentStatus.ARRIVED,
      }, userId);
    } catch (error) {
      console.error('Error checking in appointment:', error);
      throw error;
    }
  }
  
  /**
   * Start appointment
   */
  async startAppointment(appointmentId: string, userId: string) {
    try {
      return await this.updateAppointment(appointmentId, {
        status: AppointmentStatus.IN_PROGRESS,
      }, userId);
    } catch (error) {
      console.error('Error starting appointment:', error);
      throw error;
    }
  }
  
  /**
   * Complete appointment
   */
  async completeAppointment(appointmentId: string, userId: string) {
    try {
      return await this.updateAppointment(appointmentId, {
        status: AppointmentStatus.COMPLETED,
      }, userId);
    } catch (error) {
      console.error('Error completing appointment:', error);
      throw error;
    }
  }
  
  /**
   * Mark appointment as no-show
   */
  async markNoShow(appointmentId: string, userId: string) {
    try {
      return await this.updateAppointment(appointmentId, {
        status: AppointmentStatus.NO_SHOW,
      }, userId);
    } catch (error) {
      console.error('Error marking no-show:', error);
      throw error;
    }
  }
  
  /**
   * Detect conflicts for appointment
   */
  async detectConflicts(input: AppointmentInput, excludeAppointmentId?: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    try {
      // 1. Check staff availability
      if (input.staffId) {
        const staffConflicts = await this.checkStaffConflicts(
          input.staffId,
          input.date,
          input.startTime,
          input.totalDuration,
          excludeAppointmentId
        );
        conflicts.push(...staffConflicts);
      }
      
      // 2. Check resource availability
      if (input.resourceId) {
        const resourceConflicts = await this.checkResourceConflicts(
          input.resourceId,
          input.date,
          input.startTime,
          input.totalDuration,
          excludeAppointmentId
        );
        conflicts.push(...resourceConflicts);
      }
      
      // 3. Check client double-booking
      const clientConflicts = await this.checkClientConflicts(
        input.clientId,
        input.date,
        input.startTime,
        input.totalDuration,
        excludeAppointmentId
      );
      conflicts.push(...clientConflicts);
      
      // 4. Check business hours
      const businessHoursConflict = await this.checkBusinessHours(
        input.companyId,
        input.branchId,
        input.date,
        input.startTime,
        input.totalDuration
      );
      if (businessHoursConflict) {
        conflicts.push(businessHoursConflict);
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }
  
  /**
   * Check staff conflicts
   */
  private async checkStaffConflicts(
    staffId: string,
    date: Date,
    startTime: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    try {
      // Get staff working hours for the day
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: { schedules: true }
      });
      
      if (!staff) {
        conflicts.push({
          type: 'STAFF_UNAVAILABLE',
          message: 'Staff member not found',
          staffId
        });
        return conflicts;
      }
      
      // Check if staff is scheduled for this day
      const dayOfWeek = date.getDay();
      const workingHours = await this.getStaffWorkingHours(staffId, date);
      
      if (!workingHours || workingHours.length === 0) {
        conflicts.push({
          type: 'STAFF_UNAVAILABLE',
          message: 'Staff member is not scheduled to work on this day',
          staffId
        });
        return conflicts;
      }
      
      // Check if appointment is within working hours
      const appointmentStart = this.parseTime(startTime);
      const appointmentEnd = appointmentStart + duration;
      
      let withinWorkingHours = false;
      for (const period of workingHours) {
        const workStart = this.parseTime(format(period.start, 'HH:mm'));
        const workEnd = this.parseTime(format(period.end, 'HH:mm'));
        
        if (appointmentStart >= workStart && appointmentEnd <= workEnd) {
          withinWorkingHours = true;
          break;
        }
      }
      
      if (!withinWorkingHours) {
        conflicts.push({
          type: 'STAFF_UNAVAILABLE',
          message: 'Appointment is outside staff working hours',
          staffId
        });
      }
      
      // Check for conflicting appointments
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          staffId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
          },
          ...(excludeAppointmentId && { id: { not: excludeAppointmentId } })
        }
      });
      
      for (const existing of conflictingAppointments) {
        const existingStart = this.parseTime(existing.startTime);
        const existingEnd = existingStart + existing.totalDuration;
        
        const hasOverlap = (appointmentStart < existingEnd && appointmentEnd > existingStart);
        
        if (hasOverlap) {
          conflicts.push({
            type: 'STAFF_UNAVAILABLE',
            message: `Staff member has conflicting appointment from ${existing.startTime} to ${existing.endTime}`,
            staffId,
            conflictingAppointmentId: existing.id
          });
        }
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error checking staff conflicts:', error);
      return [];
    }
  }
  
  /**
   * Check resource conflicts
   */
  private async checkResourceConflicts(
    resourceId: string,
    date: Date,
    startTime: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    try {
      // Get existing appointments using this resource
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          resourceId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
          },
          ...(excludeAppointmentId && { id: { not: excludeAppointmentId } })
        }
      });
      
      const appointmentStart = this.parseTime(startTime);
      const appointmentEnd = appointmentStart + duration;
      
      for (const existing of conflictingAppointments) {
        const existingStart = this.parseTime(existing.startTime);
        const existingEnd = existingStart + existing.totalDuration;
        
        const hasOverlap = (appointmentStart < existingEnd && appointmentEnd > existingStart);
        
        if (hasOverlap) {
          conflicts.push({
            type: 'RESOURCE_UNAVAILABLE',
            message: `Resource is already booked from ${existing.startTime} to ${existing.endTime}`,
            resourceId,
            conflictingAppointmentId: existing.id
          });
        }
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error checking resource conflicts:', error);
      return [];
    }
  }
  
  /**
   * Check client double-booking conflicts
   */
  private async checkClientConflicts(
    clientId: string,
    date: Date,
    startTime: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    try {
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          clientId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
          },
          ...(excludeAppointmentId && { id: { not: excludeAppointmentId } })
        }
      });
      
      const appointmentStart = this.parseTime(startTime);
      const appointmentEnd = appointmentStart + duration;
      
      for (const existing of conflictingAppointments) {
        const existingStart = this.parseTime(existing.startTime);
        const existingEnd = existingStart + existing.totalDuration;
        
        const hasOverlap = (appointmentStart < existingEnd && appointmentEnd > existingStart);
        
        if (hasOverlap) {
          conflicts.push({
            type: 'CLIENT_DOUBLE_BOOKING',
            message: `Client has conflicting appointment from ${existing.startTime} to ${existing.endTime}`,
            conflictingAppointmentId: existing.id
          });
        }
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error checking client conflicts:', error);
      return [];
    }
  }
  
  /**
   * Check business hours
   */
  private async checkBusinessHours(
    companyId: string,
    branchId: string,
    date: Date,
    startTime: string,
    duration: number
  ): Promise<Conflict | null> {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });
      
      if (!branch || !branch.operatingHours) {
        return null; // No business hours restriction
      }
      
      const dayName = format(date, 'EEEE').toLowerCase();
      const dayHours = (branch.operatingHours as any)[dayName];
      
      if (!dayHours || !dayHours.isOpen) {
        return {
          type: 'BUSINESS_HOURS',
          message: 'Business is closed on this day'
        };
      }
      
      const appointmentStart = this.parseTime(startTime);
      const appointmentEnd = appointmentStart + duration;
      const businessStart = this.parseTime(dayHours.openTime);
      const businessEnd = this.parseTime(dayHours.closeTime);
      
      if (appointmentStart < businessStart || appointmentEnd > businessEnd) {
        return {
          type: 'BUSINESS_HOURS',
          message: `Appointment is outside business hours (${dayHours.openTime} - ${dayHours.closeTime})`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return null;
    }
  }
  
  /**
   * Create recurring appointment series
   */
  private async createRecurringSeries(originalId: string, input: AppointmentInput, userId: string) {
    try {
      if (!input.recurringPattern) return;
      
      const pattern = input.recurringPattern;
      const repeatGroupId = originalId;
      
      // Update original appointment with group ID
      await prisma.appointment.update({
        where: { id: originalId },
        data: { recurringGroupId: repeatGroupId }
      });
      
      let currentDate = new Date(input.date);
      const maxOccurrences = pattern.maxOccurrences || 52;
      let occurrences = 0;
      
      while (occurrences < maxOccurrences - 1) { // -1 because original counts as first
        // Calculate next date
        if (pattern.type === 'DAILY') {
          currentDate = addDays(currentDate, pattern.interval);
        } else if (pattern.type === 'WEEKLY') {
          currentDate = addWeeks(currentDate, pattern.interval);
        } else if (pattern.type === 'MONTHLY') {
          currentDate = addMonths(currentDate, pattern.interval);
        }
        
        // Check end date
        if (pattern.endDate && isAfter(currentDate, pattern.endDate)) {
          break;
        }
        
        // Skip excluded dates
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        if (pattern.excludeDates?.includes(dateStr)) {
          continue;
        }
        
        // Create recurring appointment
        const recurringInput: AppointmentInput = {
          ...input,
          date: currentDate,
        };
        
        try {
          const newAppointmentId = await this.createAppointment(recurringInput, userId);
          await prisma.appointment.update({
            where: { id: newAppointmentId },
            data: { recurringGroupId: repeatGroupId }
          });
          
          occurrences++;
        } catch (error) {
          console.error(`Error creating recurring appointment for ${dateStr}:`, error);
          // Continue with other occurrences
        }
      }
      
    } catch (error) {
      console.error('Error creating recurring series:', error);
      throw error;
    }
  }
  
  /**
   * Schedule appointment reminders
   */
  private async scheduleReminders(appointmentId: string, notifications: NotificationConfig[], appointment: any) {
    try {
      for (const notification of notifications) {
        if (notification.type === 'reminder' && notification.timing) {
          for (const method of notification.methods) {
            const scheduledFor = addMinutes(appointment.date, -notification.timing);
            
            await prisma.appointmentReminder.create({
              data: {
                appointmentId,
                type: method as ReminderType,
                scheduledFor,
                sent: false
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }
  
  /**
   * Get staff working hours for a specific date
   */
  private async getStaffWorkingHours(staffId: string, date: Date): Promise<{ start: Date; end: Date }[] | null> {
    try {
      const dayOfWeek = date.getDay();
      
      const schedule = await prisma.staffSchedule.findFirst({
        where: {
          staffId,
          dayOfWeek,
          startDate: { lte: date },
          OR: [
            { endDate: null },
            { endDate: { gte: date } }
          ]
        }
      });
      
      if (!schedule || !schedule.isWorking) {
        return null;
      }
      
      const startTime = parse(schedule.startTime, 'HH:mm', date);
      const endTime = parse(schedule.endTime, 'HH:mm', date);
      
      // Handle breaks if any
      if (schedule.breaks) {
        const periods: { start: Date; end: Date }[] = [];
        const breaks = schedule.breaks as any[];
        
        let currentStart = startTime;
        for (const breakTime of breaks) {
          const breakStart = parse(breakTime.start, 'HH:mm', date);
          const breakEnd = parse(breakTime.end, 'HH:mm', date);
          
          if (isBefore(currentStart, breakStart)) {
            periods.push({ start: currentStart, end: breakStart });
          }
          currentStart = breakEnd;
        }
        
        if (isBefore(currentStart, endTime)) {
          periods.push({ start: currentStart, end: endTime });
        }
        
        return periods;
      }
      
      return [{ start: startTime, end: endTime }];
    } catch (error) {
      console.error('Error getting staff working hours:', error);
      return null;
    }
  }
  
  /**
   * Helper methods
   */
  private async validateAppointmentInput(input: AppointmentInput) {
    if (!input.companyId || !input.branchId || !input.clientId) {
      throw new Error('Company ID, Branch ID, and Client ID are required');
    }
    
    if (!input.date || !input.startTime || !input.totalDuration) {
      throw new Error('Date, start time, and duration are required');
    }
    
    if (!input.services || input.services.length === 0) {
      throw new Error('At least one service is required');
    }
  }
  
  private async getStaffName(staffId: string): Promise<string | undefined> {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        select: { name: true }
      });
      return staff?.name;
    } catch {
      return undefined;
    }
  }
  
  private calculateEndTime(startTime: string, duration: number): string {
    const start = parse(startTime, 'HH:mm', new Date());
    const end = addMinutes(start, duration);
    return format(end, 'HH:mm');
  }
  
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Send appointment notifications
   */
  async sendAppointmentNotifications(
    appointmentId: string, 
    type: 'confirmation' | 'reminder' | 'cancellation' | 'reschedule'
  ): Promise<void> {
    try {
      const appointment = await this.getAppointmentById(appointmentId);
      
      const notificationData: EnhancedNotificationData = {
        appointmentId: appointment.id,
        companyId: appointment.companyId,
        branchId: appointment.branchId || undefined,
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        clientEmail: appointment.clientEmail || undefined,
        businessName: appointment.company.name,
        serviceName: Array.isArray(appointment.services) 
          ? (appointment.services as any[]).map(s => s.serviceName || s.name).join(', ')
          : 'Service',
        staffName: appointment.staff?.name,
        appointmentDate: appointment.date,
        appointmentTime: appointment.startTime,
        businessAddress: typeof appointment.branch?.address === 'string' 
          ? appointment.branch.address 
          : 'Business Address',
        businessPhone: typeof appointment.branch?.contact === 'object' && appointment.branch.contact 
          ? (appointment.branch.contact as any)?.phone || 'N/A'
          : 'N/A',
        language: 'ar', // Default to Arabic, can be made dynamic
        googleMapsLink: this.getGoogleMapsLink(appointment.branch?.address as any)
      };

      switch (type) {
        case 'confirmation':
          await enhancedNotificationService.sendAppointmentConfirmation(notificationData);
          break;
        case 'cancellation':
          await enhancedNotificationService.sendAppointmentCancellation(notificationData);
          break;
        case 'reschedule':
          await enhancedNotificationService.sendAppointmentReschedule(
            notificationData, 
            appointment.date, 
            appointment.startTime
          );
          break;
      }

    } catch (error) {
      console.error(`Error sending ${type} notifications:`, error);
      // Don't throw here to avoid breaking the main appointment operation
    }
  }

  /**
   * Helper method to get Google Maps link
   */
  private getGoogleMapsLink(address: any): string | undefined {
    if (!address) return undefined;
    
    let addressString = '';
    if (typeof address === 'string') {
      addressString = address;
    } else {
      addressString = [address.street, address.city, address.country].filter(Boolean).join(', ');
    }
    
    if (addressString) {
      return `https://maps.google.com/?q=${encodeURIComponent(addressString)}`;
    }
    
    return undefined;
  }

  /**
   * Get client appointment history with analytics
   */
  async getClientHistory(
    clientId: string, 
    companyId: string, 
    options: { limit?: number; offset?: number; includeAnalytics?: boolean } = {}
  ) {
    try {
      const { limit = 50, offset = 0, includeAnalytics = false } = options;
      
      const appointments = await prisma.appointment.findMany({
        where: {
          clientId,
          companyId
        },
        include: {
          staff: true,
          branch: true,
          reminders: true
        },
        orderBy: [
          { date: 'desc' },
          { startTime: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      let analytics = null;
      if (includeAnalytics) {
        analytics = {
          totalAppointments: appointments.length,
          completedAppointments: appointments.filter(a => a.status === 'COMPLETED').length,
          cancelledAppointments: appointments.filter(a => a.status === 'CANCELLED').length,
          noShowCount: appointments.filter(a => a.status === 'NO_SHOW').length,
          averageSpending: appointments.length > 0 
            ? appointments.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0) / appointments.length 
            : 0,
          totalSpending: appointments.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0),
          favoriteStaff: this.calculateFavoriteStaff(appointments),
          appointmentFrequency: this.calculateAppointmentFrequency(appointments)
        };
      }

      return {
        appointments,
        analytics,
        pagination: {
          total: await prisma.appointment.count({ where: { clientId, companyId } }),
          limit,
          offset
        }
      };
    } catch (error) {
      console.error('Error getting client history:', error);
      throw error;
    }
  }

  /**
   * Get staff schedule for different time periods
   */
  async getStaffSchedule(
    staffId: string,
    companyId: string,
    date: Date,
    view: 'day' | 'week' | 'month' = 'day'
  ) {
    try {
      let startDate = startOfDay(date);
      let endDate = endOfDay(date);

      if (view === 'week') {
        startDate = startOfDay(addDays(date, -date.getDay()));
        endDate = endOfDay(addDays(startDate, 6));
      } else if (view === 'month') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          staffId,
          companyId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          client: true,
          branch: true
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ]
      });

      // Get staff working schedule
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          schedules: {
            where: {
              startDate: { lte: endDate },
              OR: [
                { endDate: null },
                { endDate: { gte: startDate } }
              ]
            }
          }
        }
      });

      return {
        staff: staff ? { id: staff.id, name: staff.name } : null,
        appointments,
        workingSchedule: staff?.schedules || [],
        period: {
          startDate,
          endDate,
          view
        },
        summary: {
          totalAppointments: appointments.length,
          confirmedCount: appointments.filter(a => a.status === 'CONFIRMED').length,
          pendingCount: appointments.filter(a => a.status === 'PENDING').length,
          completedCount: appointments.filter(a => a.status === 'COMPLETED').length,
          totalRevenue: appointments.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0)
        }
      };
    } catch (error) {
      console.error('Error getting staff schedule:', error);
      throw error;
    }
  }

  /**
   * Bulk operations on appointments
   */
  async bulkOperation(
    operation: string,
    appointmentIds: string[],
    data: any,
    userId: string
  ) {
    try {
      const results = {
        success: [] as string[],
        failed: [] as { id: string; error: string }[]
      };

      for (const appointmentId of appointmentIds) {
        try {
          switch (operation) {
            case 'cancel':
              await this.cancelAppointment(appointmentId, userId, data.reason, 'bulk');
              results.success.push(appointmentId);
              break;
            case 'complete':
              await this.completeAppointment(appointmentId, userId);
              results.success.push(appointmentId);
              break;
            case 'reschedule':
              if (!data.newDate || !data.newStartTime) {
                throw new Error('New date and start time required for reschedule');
              }
              await this.rescheduleAppointment(
                appointmentId,
                new Date(data.newDate),
                data.newStartTime,
                data.newStaffId,
                userId
              );
              results.success.push(appointmentId);
              break;
            case 'update-status':
              await this.updateAppointment(appointmentId, { status: data.status }, userId);
              results.success.push(appointmentId);
              break;
            default:
              throw new Error(`Unsupported operation: ${operation}`);
          }
        } catch (error) {
          results.failed.push({
            id: appointmentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in bulk operation:', error);
      throw error;
    }
  }

  /**
   * Get appointment analytics
   */
  async getAnalytics(params: {
    companyId: string;
    branchId?: string;
    staffId?: string;
    startDate: Date;
    endDate: Date;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    try {
      const where: any = {
        companyId: params.companyId,
        date: {
          gte: params.startDate,
          lte: params.endDate
        }
      };

      if (params.branchId) where.branchId = params.branchId;
      if (params.staffId) where.staffId = params.staffId;

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          client: true,
          staff: true
        }
      });

      const analytics = {
        totalAppointments: appointments.length,
        statusBreakdown: {
          pending: appointments.filter(a => a.status === 'PENDING').length,
          confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
          completed: appointments.filter(a => a.status === 'COMPLETED').length,
          cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
          noShow: appointments.filter(a => a.status === 'NO_SHOW').length
        },
        revenue: {
          total: appointments.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0),
          completed: appointments
            .filter(a => a.status === 'COMPLETED')
            .reduce((sum, a) => sum + a.totalPrice.toNumber(), 0)
        },
        averageDuration: appointments.length > 0 
          ? appointments.reduce((sum, a) => sum + a.totalDuration, 0) / appointments.length 
          : 0,
        topServices: this.getTopServices(appointments),
        topStaff: this.getTopStaff(appointments),
        busyHours: this.getBusyHours(appointments),
        clientAnalytics: {
          newClients: appointments.filter(a => a.isNewClient).length,
          returningClients: appointments.filter(a => !a.isNewClient).length,
          uniqueClients: Array.from(new Set(appointments.map(a => a.clientId))).length
        },
        trends: params.groupBy ? this.getTrends(appointments, params.groupBy) : null
      };

      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Add attachment to appointment
   */
  async addAttachment(appointmentId: string, attachment: {
    url: string;
    type: string;
    description?: string;
    uploadedBy: string;
    uploadedAt: Date;
  }) {
    try {
      const currentAppointment = await this.getAppointmentById(appointmentId);
      
      const attachments = (currentAppointment.changeHistory as any[]) || [];
      const newAttachment = {
        id: `attach_${Date.now()}`,
        ...attachment
      };
      
      attachments.push({
        type: 'attachment_added',
        attachment: newAttachment,
        timestamp: new Date(),
        by: attachment.uploadedBy
      });

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          changeHistory: attachments
        }
      });

      return newAttachment;
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  }

  /**
   * Get no-show statistics
   */
  async getNoShowStatistics(params: {
    companyId: string;
    branchId?: string;
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const where: any = {
        companyId: params.companyId,
        status: AppointmentStatus.NO_SHOW
      };

      if (params.branchId) where.branchId = params.branchId;
      if (params.clientId) where.clientId = params.clientId;
      if (params.startDate || params.endDate) {
        where.date = {};
        if (params.startDate) where.date.gte = params.startDate;
        if (params.endDate) where.date.lte = params.endDate;
      }

      const noShows = await prisma.appointment.findMany({
        where,
        include: {
          client: true,
          staff: true,
          branch: true
        }
      });

      // Get total appointments for comparison
      const totalWhere = { ...where };
      delete totalWhere.status;
      const totalAppointments = await prisma.appointment.count({ where: totalWhere });

      const stats = {
        totalNoShows: noShows.length,
        totalAppointments,
        noShowRate: totalAppointments > 0 ? (noShows.length / totalAppointments) * 100 : 0,
        clientBreakdown: this.getClientNoShowBreakdown(noShows),
        timePatterns: this.getNoShowTimePatterns(noShows),
        revenueImpact: noShows.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0),
        staffBreakdown: this.getStaffNoShowBreakdown(noShows)
      };

      return stats;
    } catch (error) {
      console.error('Error getting no-show statistics:', error);
      throw error;
    }
  }

  /**
   * Find optimal reschedule time
   */
  async findOptimalRescheduleTime(
    appointmentId: string,
    preferences: {
      preferredDates?: string[];
      preferredTimes?: string[];
      maxSuggestions?: number;
    }
  ) {
    try {
      const appointment = await this.getAppointmentById(appointmentId);
      const { preferredDates = [], preferredTimes = [], maxSuggestions = 10 } = preferences;

      // Get available slots for the next 30 days
      const suggestions = [];
      const searchEndDate = addDays(new Date(), 30);
      
      let currentDate = new Date();
      while (currentDate <= searchEndDate && suggestions.length < maxSuggestions) {
        // Skip if not in preferred dates (if specified)
        if (preferredDates.length > 0) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          if (!preferredDates.includes(dateStr)) {
            currentDate = addDays(currentDate, 1);
            continue;
          }
        }

        // Get available slots for this day
        const availableSlots = await this.availabilityService.getAvailableSlots({
          branchId: appointment.branchId,
          date: currentDate,
          serviceIds: (appointment.services as any[]).map(s => s.serviceId),
          staffId: appointment.staffId || undefined,
          duration: appointment.totalDuration
        });

        // Filter by preferred times if specified
        let filteredSlots = availableSlots.filter(slot => slot.available);
        if (preferredTimes.length > 0) {
          filteredSlots = filteredSlots.filter(slot => 
            preferredTimes.some(time => slot.startTime >= time)
          );
        }

        // Add to suggestions with scoring
        for (const slot of filteredSlots.slice(0, maxSuggestions - suggestions.length)) {
          suggestions.push({
            ...slot,
            score: this.scoreRescheduleOption(slot, appointment, preferences)
          });
        }

        currentDate = addDays(currentDate, 1);
      }

      // Sort by score and return
      return suggestions
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, maxSuggestions);

    } catch (error) {
      console.error('Error finding optimal reschedule time:', error);
      throw error;
    }
  }

  /**
   * Private helper methods for analytics
   */
  private calculateFavoriteStaff(appointments: any[]) {
    const staffCounts = appointments.reduce((acc, apt) => {
      if (apt.staffId) {
        acc[apt.staffId] = (acc[apt.staffId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topStaff = Object.entries(staffCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 1)[0];

    return topStaff ? {
      staffId: topStaff[0],
      count: topStaff[1],
      staffName: appointments.find(a => a.staffId === topStaff[0])?.staff?.name
    } : null;
  }

  private calculateAppointmentFrequency(appointments: any[]) {
    if (appointments.length < 2) return null;

    const dates = appointments
      .map(a => new Date(a.date))
      .sort((a, b) => a.getTime() - b.getTime());

    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      const days = Math.abs(dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    return {
      averageDaysBetween: Math.round(averageInterval),
      totalAppointments: appointments.length,
      firstAppointment: dates[0],
      lastAppointment: dates[dates.length - 1]
    };
  }

  private getTopServices(appointments: any[]) {
    const serviceCounts = appointments.reduce((acc, apt) => {
      if (apt.services) {
        (apt.services as any[]).forEach(service => {
          const key = service.serviceName || service.name;
          acc[key] = (acc[key] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(serviceCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([service, count]) => ({ service, count: count as number }));
  }

  private getTopStaff(appointments: any[]) {
    const staffCounts = appointments.reduce((acc, apt) => {
      if (apt.staff) {
        acc[apt.staff.name] = (acc[apt.staff.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(staffCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([staff, count]) => ({ staff, count: count as number }));
  }

  private getBusyHours(appointments: any[]) {
    const hourCounts = appointments.reduce((acc, apt) => {
      const hour = parseInt(apt.startTime.split(':')[0]);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([hour, count]) => ({ hour: parseInt(hour), count: count as number }));
  }

  private getTrends(appointments: any[], groupBy: 'day' | 'week' | 'month') {
    const grouped = appointments.reduce((acc, apt) => {
      let key: string;
      const date = new Date(apt.date);
      
      if (groupBy === 'day') {
        key = format(date, 'yyyy-MM-dd');
      } else if (groupBy === 'week') {
        key = format(date, 'yyyy-[W]ww');
      } else {
        key = format(date, 'yyyy-MM');
      }
      
      if (!acc[key]) {
        acc[key] = { appointments: 0, revenue: 0 };
      }
      acc[key].appointments += 1;
      acc[key].revenue += apt.totalPrice.toNumber();
      
      return acc;
    }, {} as Record<string, { appointments: number; revenue: number }>);

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, appointments: (data as { appointments: number; revenue: number }).appointments, revenue: (data as { appointments: number; revenue: number }).revenue }));
  }

  private getClientNoShowBreakdown(noShows: any[]) {
    const clientCounts = noShows.reduce((acc, apt) => {
      const key = apt.clientName;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(clientCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([client, count]) => ({ client, count: count as number }));
  }

  private getNoShowTimePatterns(noShows: any[]) {
    const hourCounts = noShows.reduce((acc, apt) => {
      const hour = parseInt(apt.startTime.split(':')[0]);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const dayOfWeekCounts = noShows.reduce((acc, apt) => {
      const dayOfWeek = new Date(apt.date).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      byHour: Object.entries(hourCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([hour, count]) => ({ hour: parseInt(hour), count: count as number })),
      byDayOfWeek: Object.entries(dayOfWeekCounts)
        .map(([day, count]) => ({ day, count }))
    };
  }

  private getStaffNoShowBreakdown(noShows: any[]) {
    const staffCounts = noShows.reduce((acc, apt) => {
      if (apt.staff) {
        acc[apt.staff.name] = (acc[apt.staff.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(staffCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([staff, count]) => ({ staff, count: count as number }));
  }

  private scoreRescheduleOption(slot: any, originalAppointment: any, preferences: any): number {
    let score = 100; // Base score

    // Prefer same time of day
    const originalHour = parseInt(originalAppointment.startTime.split(':')[0]);
    const slotHour = parseInt(slot.startTime.split(':')[0]);
    const hourDiff = Math.abs(originalHour - slotHour);
    score -= hourDiff * 5;

    // Prefer same staff if possible
    if (slot.staffId === originalAppointment.staffId) {
      score += 20;
    }

    // Prefer sooner dates
    const daysFromNow = Math.abs(new Date(slot.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    score -= daysFromNow * 2;

    // Prefer preferred times
    if (preferences.preferredTimes?.length > 0) {
      const isPreferred = preferences.preferredTimes.some((time: string) => 
        slot.startTime >= time && slot.startTime <= addMinutes(parse(time, 'HH:mm', new Date()), 120)
      );
      if (isPreferred) score += 30;
    }

    return Math.max(0, score);
  }

  /**
   * Confirm appointment
   */
  async confirmAppointment(appointmentId: string, userId: string) {
    try {
      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CONFIRMED,
          updatedAt: new Date(),
          changeHistory: {
            push: {
              changedAt: new Date(),
              changedBy: userId,
              changes: ['Status updated to CONFIRMED']
            }
          }
        },
        include: {
          client: true,
          staff: true,
          branch: true,
          company: true,
          reminders: true
        }
      });

      // Send confirmation notification
      await this.sendAppointmentNotifications(appointmentId, 'confirmation');

      return appointment;
    } catch (error) {
      console.error('Error confirming appointment:', error);
      throw error;
    }
  }

  /**
   * Get calendar view with appointments
   */
  async getCalendarView(params: {
    companyId: string;
    branchId?: string;
    staffId?: string;
    startDate: Date;
    endDate: Date;
    view: 'day' | 'week' | 'month';
  }) {
    try {
      const where: any = {
        companyId: params.companyId,
        date: {
          gte: params.startDate,
          lte: params.endDate
        }
      };

      if (params.branchId) where.branchId = params.branchId;
      if (params.staffId) where.staffId = params.staffId;

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          client: true,
          staff: true,
          branch: true
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ]
      });

      // Group appointments by date for calendar display
      const calendarData = appointments.reduce((acc, appointment) => {
        const dateKey = format(appointment.date, 'yyyy-MM-dd');
        
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        
        acc[dateKey].push({
          id: appointment.id,
          title: `${appointment.clientName} - ${this.getServicesDisplay(appointment.services)}`,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          duration: appointment.totalDuration,
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone,
          staffName: appointment.staff?.name,
          status: appointment.status,
          totalPrice: appointment.totalPrice.toNumber(),
          color: appointment.color,
          services: appointment.services,
          notes: appointment.notes
        });
        
        return acc;
      }, {} as Record<string, any[]>);

      // Get working hours for staff if specified
      let workingHours = null;
      if (params.staffId) {
        workingHours = await this.getStaffWorkingSchedule(params.staffId, params.startDate, params.endDate);
      }

      return {
        calendar: calendarData,
        workingHours,
        summary: {
          totalAppointments: appointments.length,
          statusBreakdown: {
            pending: appointments.filter(a => a.status === 'PENDING').length,
            confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
            completed: appointments.filter(a => a.status === 'COMPLETED').length,
            cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
            noShow: appointments.filter(a => a.status === 'NO_SHOW').length
          },
          totalRevenue: appointments.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0),
          period: {
            startDate: params.startDate,
            endDate: params.endDate,
            view: params.view
          }
        }
      };
    } catch (error) {
      console.error('Error getting calendar view:', error);
      throw error;
    }
  }

  /**
   * Helper method to get services display string
   */
  private getServicesDisplay(services: any): string {
    if (!services || !Array.isArray(services)) return 'Service';
    return services.map(s => s.serviceName || s.name).join(', ');
  }

  /**
   * Get staff working schedule for calendar view
   */
  private async getStaffWorkingSchedule(staffId: string, startDate: Date, endDate: Date) {
    try {
      const schedules = await prisma.staffSchedule.findMany({
        where: {
          staffId,
          startDate: { lte: endDate },
          OR: [
            { endDate: null },
            { endDate: { gte: startDate } }
          ]
        }
      });

      return schedules.map(schedule => ({
        dayOfWeek: schedule.dayOfWeek,
        isWorking: schedule.isWorking,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breaks: schedule.breaks
      }));
    } catch (error) {
      console.error('Error getting staff working schedule:', error);
      return null;
    }
  }
}

export const appointmentService = new AppointmentService();