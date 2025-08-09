import { PrismaClient, AppointmentStatus, AppointmentSource, ReminderType } from '@prisma/client';
import { addMinutes, addDays, addWeeks, addMonths, format, parse, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';

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
            services: input.services,
            categoryId: input.categoryId,
            totalPrice: input.totalPrice,
            
            // Status
            status: input.status || AppointmentStatus.PENDING,
            paymentStatus: input.paymentStatus || 'PENDING',
            
            // Recurring
            isRecurring: input.isRecurring || false,
            recurringPattern: input.recurringPattern,
            
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
            notifications: input.notifications,
            
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
      
      // 6. Schedule reminders
      if (input.notifications) {
        await this.scheduleReminders(appointment.id, input.notifications, appointment);
      }
      
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
          ...updates,
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
      
      return await this.updateAppointment(appointmentId, updates, userId);
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
        ...currentAppointment,
        date: newDate,
        startTime: newStartTime,
        staffId: newStaffId || currentAppointment.staffId,
        status: AppointmentStatus.PENDING,
      } as AppointmentInput;
      
      const newAppointmentId = await this.createAppointment(newAppointmentInput, userId || 'system');
      
      // Update original appointment
      await this.updateAppointment(appointmentId, {
        status: AppointmentStatus.RESCHEDULED,
        rescheduledTo: newAppointmentId,
        rescheduledAt: new Date()
      }, userId || 'system');
      
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
}

export const appointmentService = new AppointmentService();