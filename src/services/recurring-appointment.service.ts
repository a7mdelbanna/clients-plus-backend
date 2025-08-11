import { PrismaClient, AppointmentStatus, AppointmentSource } from '@prisma/client';
import { addDays, addWeeks, addMonths, format, startOfDay, endOfDay, isAfter, isBefore, getDay } from 'date-fns';
import { AppointmentService, AppointmentInput } from './appointment.service';

const prisma = new PrismaClient();

export interface RecurringSeriesInput {
  companyId: string;
  branchId: string;
  clientId: string;
  staffId?: string;
  
  // Client info
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  
  // Scheduling
  startDate: Date;
  startTime: string;
  totalDuration: number;
  
  // Services
  services: Array<{
    serviceId: string;
    serviceName: string;
    duration: number;
    price: number;
    staffId?: string;
  }>;
  totalPrice: number;
  
  // Recurring pattern
  recurringPattern: {
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    endDate?: Date;
    maxOccurrences?: number;
    excludeDates?: string[];
    specificDays?: number[]; // For weekly
    dayOfMonth?: number; // For monthly
    weekOfMonth?: number; // For monthly
  };
  
  // Optional details
  title?: string;
  notes?: string;
  internalNotes?: string;
  color?: string;
  notifications?: Array<{
    type: 'confirmation' | 'reminder' | 'follow_up';
    methods: ('SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH')[];
    timing?: number;
  }>;
}

export interface RecurringSeriesUpdate {
  updateType: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES';
  startTime?: string;
  totalDuration?: number;
  staffId?: string;
  services?: Array<{
    serviceId: string;
    serviceName: string;
    duration: number;
    price: number;
    staffId?: string;
  }>;
  totalPrice?: number;
  title?: string;
  notes?: string;
  internalNotes?: string;
  color?: string;
  recurringPattern?: {
    type?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval?: number;
    endDate?: string;
    maxOccurrences?: number;
    excludeDates?: string[];
    specificDays?: number[];
    dayOfMonth?: number;
    weekOfMonth?: number;
  };
}

export interface RecurringConflict {
  date: Date;
  conflicts: Array<{
    type: string;
    message: string;
    conflictingAppointmentId?: string;
  }>;
}

export class RecurringAppointmentService {
  private appointmentService = new AppointmentService();
  
  /**
   * Create a new recurring appointment series
   */
  async createRecurringSeries(input: RecurringSeriesInput, userId: string): Promise<string> {
    try {
      const pattern = input.recurringPattern;
      const seriesId = `series_${Date.now()}`;
      
      // Generate all occurrence dates
      const occurrences = this.generateOccurrenceDates(input.startDate, pattern);
      
      if (occurrences.length === 0) {
        throw new Error('No valid occurrences could be generated');
      }
      
      // Check for conflicts across all occurrences
      const conflicts = await this.checkAllOccurrencesConflicts(input, occurrences);
      if (conflicts.length > 0) {
        throw new Error(`Recurring series has conflicts on ${conflicts.length} dates. First conflict: ${conflicts[0].conflicts[0].message}`);
      }
      
      const createdAppointments: string[] = [];
      
      // Create appointments in transaction
      await prisma.$transaction(async (tx) => {
        for (const occurrenceDate of occurrences) {
          try {
            const appointmentInput: AppointmentInput = {
              companyId: input.companyId,
              branchId: input.branchId,
              clientId: input.clientId,
              staffId: input.staffId,
              clientName: input.clientName,
              clientPhone: input.clientPhone,
              clientEmail: input.clientEmail,
              date: occurrenceDate,
              startTime: input.startTime,
              endTime: this.calculateEndTime(input.startTime, input.totalDuration),
              totalDuration: input.totalDuration,
              services: input.services,
              totalPrice: input.totalPrice,
              isRecurring: true,
              recurringPattern: pattern as any,
              title: input.title,
              notes: input.notes,
              internalNotes: input.internalNotes,
              color: input.color,
              source: AppointmentSource.DASHBOARD,
              notifications: input.notifications as any
            };
            
            const appointmentId = await this.appointmentService.createAppointment(appointmentInput, userId);
            
            // Update with series ID
            await tx.appointment.update({
              where: { id: appointmentId },
              data: { recurringGroupId: seriesId }
            });
            
            createdAppointments.push(appointmentId);
          } catch (error) {
            console.error(`Failed to create appointment for ${occurrenceDate.toISOString()}:`, error);
            // Continue creating other appointments
          }
        }
        
        if (createdAppointments.length === 0) {
          throw new Error('Failed to create any appointments in the series');
        }
      });
      
      return seriesId;
    } catch (error) {
      console.error('Error creating recurring series:', error);
      throw error;
    }
  }
  
  /**
   * Get recurring appointment series details
   */
  async getRecurringSeries(groupId: string, includeAppointments = true) {
    try {
      const whereClause = { recurringGroupId: groupId };
      
      if (includeAppointments) {
        const appointments = await prisma.appointment.findMany({
          where: whereClause,
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
        
        if (appointments.length === 0) {
          throw new Error('Recurring series not found');
        }
        
        const firstAppointment = appointments[0];
        const series = {
          groupId,
          pattern: firstAppointment.recurringPattern,
          totalAppointments: appointments.length,
          completedAppointments: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
          upcomingAppointments: appointments.filter(a => 
            a.status !== AppointmentStatus.CANCELLED && 
            a.status !== AppointmentStatus.COMPLETED &&
            new Date(a.date) >= new Date()
          ).length,
          cancelledAppointments: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
          firstAppointment: appointments[0],
          lastAppointment: appointments[appointments.length - 1],
          nextAppointment: appointments.find(a => 
            a.status !== AppointmentStatus.CANCELLED && 
            a.status !== AppointmentStatus.COMPLETED &&
            new Date(a.date) >= new Date()
          ),
          appointments
        };
        
        return series;
      } else {
        // Just return summary
        const appointments = await prisma.appointment.findMany({
          where: whereClause,
          select: {
            id: true,
            date: true,
            startTime: true,
            status: true,
            recurringPattern: true,
            clientName: true,
            totalPrice: true
          },
          orderBy: [
            { date: 'asc' }
          ]
        });
        
        if (appointments.length === 0) {
          throw new Error('Recurring series not found');
        }
        
        return {
          groupId,
          pattern: appointments[0].recurringPattern,
          totalAppointments: appointments.length,
          completedAppointments: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
          upcomingAppointments: appointments.filter(a => 
            a.status !== AppointmentStatus.CANCELLED && 
            a.status !== AppointmentStatus.COMPLETED &&
            new Date(a.date) >= new Date()
          ).length,
          cancelledAppointments: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
          dateRange: {
            start: appointments[0].date,
            end: appointments[appointments.length - 1].date
          }
        };
      }
    } catch (error) {
      console.error('Error getting recurring series:', error);
      throw error;
    }
  }
  
  /**
   * Update recurring appointment series
   */
  async updateRecurringSeries(
    groupId: string,
    appointmentId: string | undefined,
    updates: RecurringSeriesUpdate,
    userId: string
  ) {
    try {
      const { updateType, ...updateData } = updates;
      
      switch (updateType) {
        case 'THIS_ONLY':
          if (!appointmentId) {
            throw new Error('Appointment ID required for THIS_ONLY update');
          }
          return await this.updateSingleOccurrence(appointmentId, updateData, userId);
          
        case 'THIS_AND_FUTURE':
          if (!appointmentId) {
            throw new Error('Appointment ID required for THIS_AND_FUTURE update');
          }
          return await this.updateThisAndFutureOccurrences(groupId, appointmentId, updateData, userId);
          
        case 'ALL_OCCURRENCES':
          return await this.updateAllOccurrences(groupId, updateData, userId);
          
        default:
          throw new Error('Invalid update type');
      }
    } catch (error) {
      console.error('Error updating recurring series:', error);
      throw error;
    }
  }
  
  /**
   * Delete/Cancel recurring appointment series
   */
  async deleteRecurringSeries(
    groupId: string,
    appointmentId: string | undefined,
    deleteType: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES',
    reason: string,
    userId: string
  ) {
    try {
      switch (deleteType) {
        case 'THIS_ONLY':
          if (!appointmentId) {
            throw new Error('Appointment ID required for THIS_ONLY deletion');
          }
          await this.appointmentService.cancelAppointment(appointmentId, userId, reason, 'recurring-single');
          return { cancelled: 1, message: 'Single occurrence cancelled' };
          
        case 'THIS_AND_FUTURE':
          if (!appointmentId) {
            throw new Error('Appointment ID required for THIS_AND_FUTURE deletion');
          }
          return await this.cancelThisAndFutureOccurrences(groupId, appointmentId, reason, userId);
          
        case 'ALL_OCCURRENCES':
          return await this.cancelAllOccurrences(groupId, reason, userId);
          
        default:
          throw new Error('Invalid delete type');
      }
    } catch (error) {
      console.error('Error deleting recurring series:', error);
      throw error;
    }
  }
  
  /**
   * Get company recurring series
   */
  async getCompanyRecurringSeries(filters: {
    companyId: string;
    status?: AppointmentStatus[];
    branchId?: string;
    staffId?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {
        companyId: filters.companyId,
        recurringGroupId: { not: null },
        isRecurring: true
      };
      
      if (filters.status?.length) where.status = { in: filters.status };
      if (filters.branchId) where.branchId = filters.branchId;
      if (filters.staffId) where.staffId = filters.staffId;
      if (filters.clientId) where.clientId = filters.clientId;
      
      // Get unique recurring groups
      const appointments = await prisma.appointment.findMany({
        where,
        select: {
          recurringGroupId: true,
          clientName: true,
          totalPrice: true,
          date: true,
          startTime: true,
          status: true,
          recurringPattern: true,
          staff: { select: { name: true } },
          branch: { select: { name: true } },
          client: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Group by recurring group ID
      const grouped = appointments.reduce((acc, apt) => {
        const groupId = apt.recurringGroupId!;
        if (!acc[groupId]) {
          acc[groupId] = {
            groupId,
            pattern: apt.recurringPattern,
            client: apt.clientName,
            staff: apt.staff?.name,
            branch: apt.branch?.name,
            appointments: [],
            totalPrice: 0,
            nextAppointment: null as any,
            status: 'ACTIVE'
          };
        }
        acc[groupId].appointments.push(apt);
        acc[groupId].totalPrice += apt.totalPrice.toNumber();
        
        // Find next appointment
        if (!acc[groupId].nextAppointment && 
            apt.status !== AppointmentStatus.CANCELLED &&
            apt.status !== AppointmentStatus.COMPLETED &&
            new Date(apt.date) >= new Date()) {
          acc[groupId].nextAppointment = apt;
        }
        
        return acc;
      }, {} as Record<string, any>);
      
      const series = Object.values(grouped)
        .slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50));
      
      return {
        series,
        total: Object.keys(grouped).length,
        pagination: {
          offset: filters.offset || 0,
          limit: filters.limit || 50
        }
      };
    } catch (error) {
      console.error('Error getting company recurring series:', error);
      throw error;
    }
  }
  
  /**
   * Skip specific occurrence
   */
  async skipOccurrence(groupId: string, appointmentId: string, reason: string, userId: string) {
    try {
      // Instead of cancelling, we'll update the status and add a note
      const appointment = await this.appointmentService.updateAppointment(appointmentId, {
        status: AppointmentStatus.CANCELLED,
        internalNotes: `Skipped: ${reason}`
      } as any, userId);
      
      return {
        message: 'Occurrence skipped successfully',
        appointment
      };
    } catch (error) {
      console.error('Error skipping occurrence:', error);
      throw error;
    }
  }
  
  /**
   * Reschedule specific occurrence
   */
  async rescheduleOccurrence(
    groupId: string,
    appointmentId: string,
    options: {
      newDate: Date;
      newStartTime: string;
      newStaffId?: string;
      applyToFuture?: boolean;
    },
    userId: string
  ) {
    try {
      if (options.applyToFuture) {
        // Reschedule this and all future occurrences
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId }
        });
        
        if (!appointment) {
          throw new Error('Appointment not found');
        }
        
        const futureAppointments = await prisma.appointment.findMany({
          where: {
            recurringGroupId: groupId,
            date: { gte: appointment.date },
            status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED] }
          },
          orderBy: { date: 'asc' }
        });
        
        const results = [];
        let currentDate = options.newDate;
        
        for (const futureApt of futureAppointments) {
          const newId = await this.appointmentService.rescheduleAppointment(
            futureApt.id,
            currentDate,
            options.newStartTime,
            options.newStaffId,
            userId
          );
          
          results.push({ originalId: futureApt.id, newId });
          
          // Calculate next occurrence date based on pattern
          const pattern = appointment.recurringPattern as any;
          if (pattern?.type === 'DAILY') {
            currentDate = addDays(currentDate, pattern.interval || 1);
          } else if (pattern?.type === 'WEEKLY') {
            currentDate = addWeeks(currentDate, pattern.interval || 1);
          } else if (pattern?.type === 'MONTHLY') {
            currentDate = addMonths(currentDate, pattern.interval || 1);
          }
        }
        
        return {
          message: 'This and future occurrences rescheduled successfully',
          rescheduledCount: results.length,
          appointments: results
        };
      } else {
        // Reschedule only this occurrence
        const newAppointmentId = await this.appointmentService.rescheduleAppointment(
          appointmentId,
          options.newDate,
          options.newStartTime,
          options.newStaffId,
          userId
        );
        
        return {
          message: 'Occurrence rescheduled successfully',
          originalAppointmentId: appointmentId,
          newAppointmentId
        };
      }
    } catch (error) {
      console.error('Error rescheduling occurrence:', error);
      throw error;
    }
  }
  
  /**
   * Get recurring appointment statistics
   */
  async getRecurringStatistics(filters: {
    companyId: string;
    branchId?: string;
    staffId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const where: any = {
        companyId: filters.companyId,
        isRecurring: true,
        recurringGroupId: { not: null }
      };
      
      if (filters.branchId) where.branchId = filters.branchId;
      if (filters.staffId) where.staffId = filters.staffId;
      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
      }
      
      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          client: true,
          staff: true
        }
      });
      
      // Group by recurring group ID
      const seriesGroups = appointments.reduce((acc, apt) => {
        const groupId = apt.recurringGroupId!;
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(apt);
        return acc;
      }, {} as Record<string, any[]>);
      
      const totalSeries = Object.keys(seriesGroups).length;
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
      const cancelledAppointments = appointments.filter(a => a.status === AppointmentStatus.CANCELLED);
      
      const stats = {
        totalRecurringSeries: totalSeries,
        totalRecurringAppointments: totalAppointments,
        averageAppointmentsPerSeries: totalSeries > 0 ? Math.round(totalAppointments / totalSeries) : 0,
        completionRate: totalAppointments > 0 ? (completedAppointments.length / totalAppointments) * 100 : 0,
        cancellationRate: totalAppointments > 0 ? (cancelledAppointments.length / totalAppointments) * 100 : 0,
        totalRecurringRevenue: completedAppointments.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0),
        averageSeriesValue: totalSeries > 0 
          ? completedAppointments.reduce((sum, a) => sum + a.totalPrice.toNumber(), 0) / totalSeries 
          : 0,
        patternBreakdown: this.getPatternBreakdown(seriesGroups),
        topClients: this.getTopRecurringClients(seriesGroups),
        monthlyTrends: this.getRecurringTrends(appointments, 'month')
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting recurring statistics:', error);
      throw error;
    }
  }
  
  /**
   * Preview upcoming occurrences
   */
  async previewUpcomingOccurrences(groupId: string, limit = 10) {
    try {
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          recurringGroupId: groupId,
          date: { gte: new Date() },
          status: { notIn: [AppointmentStatus.CANCELLED] }
        },
        include: {
          staff: { select: { name: true } },
          branch: { select: { name: true } }
        },
        orderBy: { date: 'asc' },
        take: limit
      });
      
      return {
        groupId,
        upcomingOccurrences: upcomingAppointments.map(apt => ({
          id: apt.id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          status: apt.status,
          staff: apt.staff?.name,
          branch: apt.branch?.name,
          totalPrice: apt.totalPrice.toNumber()
        })),
        hasMore: upcomingAppointments.length === limit
      };
    } catch (error) {
      console.error('Error previewing upcoming occurrences:', error);
      throw error;
    }
  }
  
  /**
   * Check for conflicts in recurring series
   */
  async checkRecurringConflicts(input: any): Promise<RecurringConflict[]> {
    try {
      const occurrences = this.generateOccurrenceDates(input.startDate, input.recurringPattern);
      return await this.checkAllOccurrencesConflicts(input, occurrences);
    } catch (error) {
      console.error('Error checking recurring conflicts:', error);
      throw error;
    }
  }
  
  /**
   * Private helper methods
   */
  private generateOccurrenceDates(startDate: Date, pattern: any): Date[] {
    const dates: Date[] = [];
    const maxOccurrences = pattern.maxOccurrences || 52; // Default to 1 year
    let currentDate = new Date(startDate);
    let occurrenceCount = 0;
    
    while (occurrenceCount < maxOccurrences) {
      // Check if we've passed the end date
      if (pattern.endDate && isAfter(currentDate, pattern.endDate)) {
        break;
      }
      
      // Skip excluded dates
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      if (!pattern.excludeDates?.includes(dateStr)) {
        // Check if this date matches the pattern
        if (this.dateMatchesPattern(currentDate, startDate, pattern)) {
          dates.push(new Date(currentDate));
          occurrenceCount++;
        }
      }
      
      // Move to next potential date
      currentDate = addDays(currentDate, 1);
      
      // Safety check to prevent infinite loops
      if (dates.length === 0 && currentDate > addMonths(startDate, 24)) {
        break;
      }
    }
    
    return dates;
  }
  
  private dateMatchesPattern(currentDate: Date, startDate: Date, pattern: any): boolean {
    const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (pattern.type) {
      case 'DAILY':
        return daysDiff % (pattern.interval || 1) === 0;
        
      case 'WEEKLY':
        const weeksDiff = Math.floor(daysDiff / 7);
        if (weeksDiff % (pattern.interval || 1) !== 0) {
          return false;
        }
        
        // Check specific days if provided
        if (pattern.specificDays?.length > 0) {
          const dayOfWeek = getDay(currentDate);
          return pattern.specificDays.includes(dayOfWeek);
        }
        
        return getDay(currentDate) === getDay(startDate);
        
      case 'MONTHLY':
        const monthsDiff = 
          (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
          currentDate.getMonth() - startDate.getMonth();
          
        if (monthsDiff % (pattern.interval || 1) !== 0) {
          return false;
        }
        
        // Check day of month or week of month
        if (pattern.dayOfMonth) {
          return currentDate.getDate() === pattern.dayOfMonth;
        }
        
        return currentDate.getDate() === startDate.getDate();
        
      default:
        return false;
    }
  }
  
  private async checkAllOccurrencesConflicts(input: any, occurrences: Date[]): Promise<RecurringConflict[]> {
    const conflicts: RecurringConflict[] = [];
    
    for (const date of occurrences.slice(0, 20)) { // Check first 20 occurrences
      try {
        const appointmentConflicts = await this.appointmentService.detectConflicts({
          companyId: input.companyId,
          branchId: input.branchId,
          clientId: input.clientId,
          staffId: input.staffId,
          date,
          startTime: input.startTime,
          endTime: this.calculateEndTime(input.startTime, input.totalDuration),
          totalDuration: input.totalDuration,
          services: input.services || [],
          totalPrice: input.totalPrice || 0,
          clientName: input.clientName || 'Recurring Client',
          clientPhone: input.clientPhone || '000-000-0000'
        });
        
        if (appointmentConflicts.length > 0) {
          conflicts.push({
            date,
            conflicts: appointmentConflicts
          });
        }
      } catch (error) {
        console.error(`Error checking conflicts for ${date.toISOString()}:`, error);
      }
    }
    
    return conflicts;
  }
  
  private async updateSingleOccurrence(appointmentId: string, updates: any, userId: string) {
    return await this.appointmentService.updateAppointment(appointmentId, updates, userId);
  }
  
  private async updateThisAndFutureOccurrences(
    groupId: string,
    appointmentId: string,
    updates: any,
    userId: string
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    const futureAppointments = await prisma.appointment.findMany({
      where: {
        recurringGroupId: groupId,
        date: { gte: appointment.date },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED] }
      }
    });
    
    const results = [];
    for (const apt of futureAppointments) {
      try {
        const updated = await this.appointmentService.updateAppointment(apt.id, updates, userId);
        results.push(updated);
      } catch (error) {
        console.error(`Failed to update appointment ${apt.id}:`, error);
      }
    }
    
    return {
      message: 'This and future occurrences updated',
      updatedCount: results.length,
      appointments: results
    };
  }
  
  private async updateAllOccurrences(groupId: string, updates: any, userId: string) {
    const allAppointments = await prisma.appointment.findMany({
      where: {
        recurringGroupId: groupId,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED] }
      }
    });
    
    const results = [];
    for (const apt of allAppointments) {
      try {
        const updated = await this.appointmentService.updateAppointment(apt.id, updates, userId);
        results.push(updated);
      } catch (error) {
        console.error(`Failed to update appointment ${apt.id}:`, error);
      }
    }
    
    return {
      message: 'All occurrences updated',
      updatedCount: results.length,
      appointments: results
    };
  }
  
  private async cancelThisAndFutureOccurrences(
    groupId: string,
    appointmentId: string,
    reason: string,
    userId: string
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    const futureAppointments = await prisma.appointment.findMany({
      where: {
        recurringGroupId: groupId,
        date: { gte: appointment.date },
        status: { notIn: [AppointmentStatus.CANCELLED] }
      }
    });
    
    let cancelledCount = 0;
    for (const apt of futureAppointments) {
      try {
        await this.appointmentService.cancelAppointment(apt.id, userId, reason, 'recurring-future');
        cancelledCount++;
      } catch (error) {
        console.error(`Failed to cancel appointment ${apt.id}:`, error);
      }
    }
    
    return {
      cancelled: cancelledCount,
      message: `${cancelledCount} future occurrences cancelled`
    };
  }
  
  private async cancelAllOccurrences(groupId: string, reason: string, userId: string) {
    const allAppointments = await prisma.appointment.findMany({
      where: {
        recurringGroupId: groupId,
        status: { notIn: [AppointmentStatus.CANCELLED] }
      }
    });
    
    let cancelledCount = 0;
    for (const apt of allAppointments) {
      try {
        await this.appointmentService.cancelAppointment(apt.id, userId, reason, 'recurring-all');
        cancelledCount++;
      } catch (error) {
        console.error(`Failed to cancel appointment ${apt.id}:`, error);
      }
    }
    
    return {
      cancelled: cancelledCount,
      message: `All ${cancelledCount} occurrences cancelled`
    };
  }
  
  private getPatternBreakdown(seriesGroups: Record<string, any[]>) {
    const patterns = { DAILY: 0, WEEKLY: 0, MONTHLY: 0, OTHER: 0 };
    
    Object.values(seriesGroups).forEach(appointments => {
      if (appointments.length > 0) {
        const pattern = appointments[0].recurringPattern as any;
        const type = pattern?.type || 'OTHER';
        if (type in patterns) {
          (patterns as any)[type]++;
        } else {
          patterns.OTHER++;
        }
      }
    });
    
    return patterns;
  }
  
  private getTopRecurringClients(seriesGroups: Record<string, any[]>) {
    const clientCounts = Object.values(seriesGroups).reduce((acc, appointments) => {
      if (appointments.length > 0) {
        const clientName = appointments[0].clientName;
        acc[clientName] = (acc[clientName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(clientCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([client, count]) => ({ client, seriesCount: count }));
  }
  
  private getRecurringTrends(appointments: any[], groupBy: 'month' | 'week' = 'month') {
    const grouped = appointments.reduce((acc, apt) => {
      let key: string;
      if (groupBy === 'month') {
        key = format(new Date(apt.date), 'yyyy-MM');
      } else {
        key = format(new Date(apt.date), 'yyyy-[W]ww');
      }
      
      if (!acc[key]) {
        acc[key] = { appointments: 0, revenue: 0, completed: 0 };
      }
      acc[key].appointments += 1;
      acc[key].revenue += apt.totalPrice.toNumber();
      if (apt.status === AppointmentStatus.COMPLETED) {
        acc[key].completed += 1;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...(data as Record<string, any>) }));
  }
  
  private calculateEndTime(startTime: string, duration: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }
}

export const recurringAppointmentService = new RecurringAppointmentService();