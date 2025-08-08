import { PrismaClient, StaffSchedule, StaffTimeOff, ScheduleType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface WorkingDay {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breaks?: Array<{
    start: string;
    end: string;
  }>;
}

export interface CreateScheduleData {
  staffId: string;
  branchId: string;
  workingDays: WorkingDay[];
  startDate: Date;
  endDate?: Date;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
  reason?: string; // e.g., 'appointment', 'break', 'time-off'
}

export interface AvailabilityOptions {
  bufferTime?: number; // minutes between appointments
  includeBreaks?: boolean;
  minSlotDuration?: number; // minimum slot duration in minutes
}

class ScheduleService {

  /**
   * Create or update staff schedule for a branch
   */
  async createOrUpdateSchedule(data: CreateScheduleData): Promise<StaffSchedule[]> {
    // Remove existing schedules for this staff member and branch
    await prisma.staffSchedule.deleteMany({
      where: {
        staffId: data.staffId,
        branchId: data.branchId,
        startDate: { gte: data.startDate },
      },
    });

    // Create new schedule entries
    const schedules: Prisma.StaffScheduleCreateManyInput[] = data.workingDays.map(day => ({
      staffId: data.staffId,
      branchId: data.branchId,
      dayOfWeek: day.dayOfWeek,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: day.startTime,
      endTime: day.endTime,
      breaks: day.breaks || [],
      isWorking: day.isWorking,
      type: 'REGULAR',
    }));

    await prisma.staffSchedule.createMany({
      data: schedules,
    });

    return await prisma.staffSchedule.findMany({
      where: {
        staffId: data.staffId,
        branchId: data.branchId,
        startDate: data.startDate,
      },
    });
  }

  /**
   * Get staff schedule for a specific branch
   */
  async getStaffSchedule(staffId: string, branchId?: string): Promise<StaffSchedule[]> {
    const where: Prisma.StaffScheduleWhereInput = {
      staffId,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    return await prisma.staffSchedule.findMany({
      where,
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  /**
   * Update single day schedule
   */
  async updateDaySchedule(
    staffId: string, 
    branchId: string, 
    dayOfWeek: number, 
    schedule: Omit<WorkingDay, 'dayOfWeek'>
  ): Promise<StaffSchedule> {
    // Try to find existing schedule
    const existing = await prisma.staffSchedule.findUnique({
      where: {
        staffId_branchId_dayOfWeek: {
          staffId,
          branchId,
          dayOfWeek,
        },
      },
    });

    if (existing) {
      return await prisma.staffSchedule.update({
        where: { id: existing.id },
        data: {
          isWorking: schedule.isWorking,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breaks: (schedule.breaks as any) || [],
        },
      });
    } else {
      return await prisma.staffSchedule.create({
        data: {
          staffId,
          branchId,
          dayOfWeek,
          startDate: new Date(),
          isWorking: schedule.isWorking,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breaks: schedule.breaks || [],
          type: 'REGULAR',
        },
      });
    }
  }

  /**
   * Create schedule override for specific date
   */
  async createScheduleOverride(
    staffId: string,
    branchId: string,
    overrideDate: Date,
    schedule: {
      isWorking: boolean;
      startTime?: string;
      endTime?: string;
      breaks?: Array<{ start: string; end: string }>;
      type?: ScheduleType;
    }
  ): Promise<StaffSchedule> {
    return await prisma.staffSchedule.create({
      data: {
        staffId,
        branchId,
        dayOfWeek: overrideDate.getDay(),
        startDate: overrideDate,
        endDate: overrideDate,
        overrideDate,
        isWorking: schedule.isWorking,
        startTime: schedule.startTime || '00:00',
        endTime: schedule.endTime || '23:59',
        breaks: schedule.breaks || [],
        type: schedule.type || 'OVERRIDE',
      },
    });
  }

  /**
   * Get comprehensive availability for a staff member
   */
  async getAvailability(
    staffId: string,
    branchId: string,
    date: Date,
    options: AvailabilityOptions = {}
  ): Promise<AvailabilitySlot[]> {
    const {
      bufferTime = 15,
      includeBreaks = true,
      minSlotDuration = 30,
    } = options;

    const dayOfWeek = date.getDay();

    // Check for specific date override first
    let schedule = await prisma.staffSchedule.findFirst({
      where: {
        staffId,
        branchId,
        overrideDate: date,
      },
    });

    // If no override, get regular schedule
    if (!schedule) {
      schedule = await prisma.staffSchedule.findFirst({
        where: {
          staffId,
          branchId,
          dayOfWeek,
          type: 'REGULAR',
          startDate: { lte: date },
          OR: [
            { endDate: null },
            { endDate: { gte: date } },
          ],
        },
      });
    }

    if (!schedule || !schedule.isWorking) {
      return [{
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
        available: false,
        reason: 'not-working',
      }];
    }

    // Check for time off
    const timeOff = await prisma.staffTimeOff.findFirst({
      where: {
        staffId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (timeOff) {
      return [{
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
        available: false,
        reason: 'time-off',
      }];
    }

    // Get working hours for the day
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

    const workStart = new Date(date);
    workStart.setHours(startHour, startMinute, 0, 0);
    
    const workEnd = new Date(date);
    workEnd.setHours(endHour, endMinute, 0, 0);

    // Get existing appointments
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        branchId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      orderBy: { startTime: 'asc' },
      include: {
        service: {
          select: {
            duration: true,
            // bufferTime: true // Field may not exist,
          },
        },
      },
    });

    // Generate time slots
    const slots: AvailabilitySlot[] = [];
    let currentTime = new Date(workStart);

    while (currentTime < workEnd) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + minSlotDuration);

      if (slotEnd > workEnd) break;

      // Check if slot conflicts with appointments
      let conflictReason: string | undefined;
      const hasAppointmentConflict = appointments.some(apt => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        
        // Add buffer time to appointment
        const bufferMinutes = apt.service?.bufferTime || bufferTime;
        aptEnd.setMinutes(aptEnd.getMinutes() + bufferMinutes);

        const overlaps = (currentTime < aptEnd && slotEnd > aptStart);
        if (overlaps) {
          conflictReason = 'appointment';
        }
        return overlaps;
      });

      // Check if slot conflicts with breaks
      let hasBreakConflict = false;
      if (includeBreaks && schedule.breaks && Array.isArray(schedule.breaks)) {
        hasBreakConflict = (schedule.breaks as any[]).some((breakTime: any) => {
          const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
          const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
          
          const breakStart = new Date(date);
          breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
          
          const breakEnd = new Date(date);
          breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

          const overlaps = (currentTime < breakEnd && slotEnd > breakStart);
          if (overlaps) {
            conflictReason = 'break';
          }
          return overlaps;
        });
      }

      slots.push({
        start: new Date(currentTime),
        end: new Date(slotEnd),
        available: !hasAppointmentConflict && !hasBreakConflict,
        reason: conflictReason,
      });

      currentTime.setMinutes(currentTime.getMinutes() + minSlotDuration);
    }

    return slots;
  }

  /**
   * Find next available slot for a service
   */
  async findNextAvailableSlot(
    staffId: string,
    branchId: string,
    serviceDuration: number,
    fromDate: Date = new Date(),
    maxDaysAhead: number = 30
  ): Promise<{ date: Date; start: Date; end: Date } | null> {
    const searchEndDate = new Date(fromDate);
    searchEndDate.setDate(searchEndDate.getDate() + maxDaysAhead);

    for (let currentDate = new Date(fromDate); currentDate <= searchEndDate; currentDate.setDate(currentDate.getDate() + 1)) {
      const availability = await this.getAvailability(staffId, branchId, currentDate, {
        minSlotDuration: serviceDuration,
      });

      const availableSlot = availability.find(slot => 
        slot.available && 
        (slot.end.getTime() - slot.start.getTime()) >= (serviceDuration * 60 * 1000)
      );

      if (availableSlot) {
        const slotEnd = new Date(availableSlot.start);
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);
        
        return {
          date: new Date(currentDate),
          start: availableSlot.start,
          end: slotEnd,
        };
      }
    }

    return null;
  }

  /**
   * Check if staff member is available at specific time
   */
  async isAvailableAt(
    staffId: string,
    branchId: string,
    startTime: Date,
    duration: number
  ): Promise<{ available: boolean; reason?: string }> {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + duration);

    const date = new Date(startTime);
    date.setHours(0, 0, 0, 0);

    const availability = await this.getAvailability(staffId, branchId, date);
    
    const conflictingSlot = availability.find(slot => 
      !slot.available && 
      startTime < slot.end && 
      endTime > slot.start
    );

    return {
      available: !conflictingSlot,
      reason: conflictingSlot?.reason,
    };
  }

  /**
   * Get staff working hours summary for all branches
   */
  async getWorkingHoursSummary(staffId: string): Promise<{
    branches: Array<{
      branchId: string;
      branchName: string;
      schedule: Array<{
        dayOfWeek: number;
        dayName: string;
        isWorking: boolean;
        startTime?: string;
        endTime?: string;
        breaks?: Array<{ start: string; end: string }>;
      }>;
    }>;
  }> {
    const schedules = await prisma.staffSchedule.findMany({
      where: {
        staffId,
        type: 'REGULAR',
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { branchId: 'asc' },
        { dayOfWeek: 'asc' },
      ],
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const branchesMap = new Map<string, any>();

    schedules.forEach(schedule => {
      if (!branchesMap.has(schedule.branchId)) {
        branchesMap.set(schedule.branchId, {
          branchId: schedule.branchId,
          branchName: schedule.branch.name,
          schedule: [],
        });
      }

      branchesMap.get(schedule.branchId).schedule.push({
        dayOfWeek: schedule.dayOfWeek,
        dayName: dayNames[schedule.dayOfWeek],
        isWorking: schedule.isWorking,
        startTime: schedule.isWorking ? schedule.startTime : undefined,
        endTime: schedule.isWorking ? schedule.endTime : undefined,
        breaks: schedule.isWorking && schedule.breaks ? schedule.breaks as any : undefined,
      });
    });

    return {
      branches: Array.from(branchesMap.values()),
    };
  }

  /**
   * Copy schedule from one branch to another
   */
  async copyScheduleToOtherBranches(
    staffId: string,
    sourceBranchId: string,
    targetBranchIds: string[]
  ): Promise<StaffSchedule[]> {
    // Get source schedule
    const sourceSchedule = await prisma.staffSchedule.findMany({
      where: {
        staffId,
        branchId: sourceBranchId,
        type: 'REGULAR',
      },
    });

    if (sourceSchedule.length === 0) {
      throw new Error('No source schedule found to copy');
    }

    const newSchedules: Prisma.StaffScheduleCreateManyInput[] = [];

    for (const targetBranchId of targetBranchIds) {
      // Remove existing schedule for target branch
      await prisma.staffSchedule.deleteMany({
        where: {
          staffId,
          branchId: targetBranchId,
          type: 'REGULAR',
        },
      });

      // Create new schedules for target branch
      sourceSchedule.forEach(schedule => {
        newSchedules.push({
          staffId,
          branchId: targetBranchId,
          dayOfWeek: schedule.dayOfWeek,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breaks: schedule.breaks,
          isWorking: schedule.isWorking,
          type: 'REGULAR',
        });
      });
    }

    if (newSchedules.length > 0) {
      await prisma.staffSchedule.createMany({
        data: newSchedules,
      });
    }

    return await prisma.staffSchedule.findMany({
      where: {
        staffId,
        branchId: { in: targetBranchIds },
        type: 'REGULAR',
      },
    });
  }

  /**
   * Delete schedule for a specific branch
   */
  async deleteSchedule(staffId: string, branchId?: string): Promise<void> {
    const where: Prisma.StaffScheduleWhereInput = {
      staffId,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    await prisma.staffSchedule.deleteMany({ where });
  }

  /**
   * Get schedule conflicts for appointments
   */
  async getScheduleConflicts(
    staffId: string,
    branchId: string,
    appointmentDateTime: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<Array<{ type: 'appointment' | 'time-off' | 'no-schedule' | 'break'; details: any }>> {
    const conflicts: Array<{ type: 'appointment' | 'time-off' | 'no-schedule' | 'break'; details: any }> = [];
    const endTime = new Date(appointmentDateTime);
    endTime.setMinutes(endTime.getMinutes() + duration);

    // Check if staff has working schedule
    const isAvailable = await this.isAvailableAt(staffId, branchId, appointmentDateTime, duration);
    if (!isAvailable.available) {
      conflicts.push({
        type: isAvailable.reason === 'time-off' ? 'time-off' : 
              isAvailable.reason === 'break' ? 'break' : 'no-schedule',
        details: { reason: isAvailable.reason },
      });
    }

    // Check for appointment conflicts
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        branchId,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: appointmentDateTime },
          },
        ],
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
      },
    });

    conflictingAppointments.forEach(apt => {
      conflicts.push({
        type: 'appointment',
        details: {
          appointmentId: apt.id,
          clientName: `${apt.client.firstName} ${apt.client.lastName}`,
          serviceName: apt.service.name,
          startTime: apt.startTime,
          endTime: apt.endTime,
        },
      });
    });

    return conflicts;
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;