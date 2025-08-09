import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { addMinutes, format, parse, startOfDay, endOfDay, addDays, isBefore, isAfter } from 'date-fns';

const prisma = new PrismaClient();

export interface AvailabilityQuery {
  branchId: string;
  date: Date;
  serviceIds: string[];
  staffId?: string;
  duration?: number;
  resourceIds?: string[];
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  staffId?: string;
  conflicts?: string[];
  suggestedAlternatives?: TimeSlot[];
}

export interface StaffAvailability {
  staffId: string;
  staffName: string;
  slots: TimeSlot[];
  totalAvailableSlots: number;
}

export interface DayAvailability {
  date: string;
  totalSlots: number;
  availableSlots: number;
  staffAvailability: StaffAvailability[];
  businessHours: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    breaks?: { start: string; end: string }[];
  };
}

export interface AvailabilitySearchParams {
  companyId: string;
  branchId: string;
  serviceIds: string[];
  preferredStaffId?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  preferredTimeRanges?: { start: string; end: string }[];
}

export class AvailabilityService {
  
  /**
   * Get available slots for specific parameters
   */
  async getAvailableSlots(params: AvailabilityQuery): Promise<TimeSlot[]> {
    try {
      const {
        branchId,
        date,
        serviceIds,
        staffId,
        duration = 60,
        resourceIds
      } = params;
      
      // 1. Get branch operating hours
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });
      
      if (!branch) {
        throw new Error('Branch not found');
      }
      
      // 2. Get available staff for the services
      let availableStaff;
      if (staffId) {
        availableStaff = await prisma.staff.findMany({
          where: {
            id: staffId,
            status: 'ACTIVE',
            services: {
              some: {
                serviceId: { in: serviceIds },
                isActive: true
              }
            }
          },
          include: {
            schedules: {
              where: {
                dayOfWeek: date.getDay(),
                startDate: { lte: date },
                OR: [
                  { endDate: null },
                  { endDate: { gte: date } }
                ]
              }
            }
          }
        });
      } else {
        // Get all available staff for the services
        availableStaff = await prisma.staff.findMany({
          where: {
            status: 'ACTIVE',
            services: {
              some: {
                serviceId: { in: serviceIds },
                isActive: true
              }
            },
            branches: {
              some: {
                branchId: branchId,
                isActive: true
              }
            }
          },
          include: {
            schedules: {
              where: {
                dayOfWeek: date.getDay(),
                startDate: { lte: date },
                OR: [
                  { endDate: null },
                  { endDate: { gte: date } }
                ]
              }
            }
          }
        });
      }
      
      // 3. Get existing appointments for the date
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          branchId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
          },
          ...(staffId && { staffId })
        }
      });
      
      // 4. Generate slots for each available staff member
      const allSlots: TimeSlot[] = [];
      
      for (const staff of availableStaff) {
        const staffSlots = await this.generateStaffSlots(
          staff,
          date,
          duration,
          existingAppointments.filter(apt => apt.staffId === staff.id),
          branch
        );
        allSlots.push(...staffSlots);
      }
      
      // 5. Sort slots by time and return
      return allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }
  
  /**
   * Check if a specific slot is available
   */
  async checkSlotAvailability(
    branchId: string,
    date: Date,
    startTime: string,
    serviceIds: string[],
    staffId?: string
  ): Promise<{ available: boolean; conflicts?: string[] }> {
    try {
      const conflicts: string[] = [];
      
      // Calculate end time
      const duration = await this.calculateServicesDuration(serviceIds);
      const endTime = this.calculateEndTime(startTime, duration);
      
      // Check staff availability
      if (staffId) {
        const staffConflicts = await this.checkStaffSlotConflicts(
          staffId,
          date,
          startTime,
          duration
        );
        conflicts.push(...staffConflicts);
      }
      
      // Check business hours
      const businessHoursConflict = await this.checkBusinessHoursConflict(
        branchId,
        date,
        startTime,
        duration
      );
      if (businessHoursConflict) {
        conflicts.push(businessHoursConflict);
      }
      
      return {
        available: conflicts.length === 0,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
      
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return { available: false, conflicts: ['System error'] };
    }
  }
  
  /**
   * Find next available slot from a given time
   */
  async findNextAvailable(
    branchId: string,
    serviceIds: string[],
    preferredTime?: string,
    staffId?: string
  ): Promise<TimeSlot | null> {
    try {
      const searchDate = new Date();
      const maxSearchDays = 30; // Search up to 30 days ahead
      
      for (let dayOffset = 0; dayOffset < maxSearchDays; dayOffset++) {
        const currentDate = addDays(searchDate, dayOffset);
        
        const availableSlots = await this.getAvailableSlots({
          branchId,
          date: currentDate,
          serviceIds,
          staffId,
          duration: await this.calculateServicesDuration(serviceIds)
        });
        
        // If we have a preferred time, try to find slots around that time
        if (preferredTime && availableSlots.length > 0) {
          const preferredSlot = availableSlots.find(slot => 
            slot.startTime >= preferredTime && slot.available
          );
          if (preferredSlot) {
            return preferredSlot;
          }
        }
        
        // Otherwise, return the first available slot of the day
        const firstAvailable = availableSlots.find(slot => slot.available);
        if (firstAvailable) {
          return firstAvailable;
        }
      }
      
      return null; // No availability found in the search period
    } catch (error) {
      console.error('Error finding next available slot:', error);
      return null;
    }
  }
  
  /**
   * Get comprehensive availability for a date range
   */
  async getWeeklyAvailability(params: AvailabilitySearchParams): Promise<DayAvailability[]> {
    try {
      const {
        companyId,
        branchId,
        serviceIds,
        preferredStaffId,
        startDate,
        endDate,
        duration,
        preferredTimeRanges
      } = params;
      
      const dayAvailabilities: DayAvailability[] = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayAvailability = await this.getDayAvailability(
          companyId,
          branchId,
          currentDate,
          serviceIds,
          duration,
          preferredStaffId,
          preferredTimeRanges
        );
        
        dayAvailabilities.push(dayAvailability);
        currentDate = addDays(currentDate, 1);
      }
      
      return dayAvailabilities;
    } catch (error) {
      console.error('Error getting weekly availability:', error);
      throw error;
    }
  }
  
  /**
   * Smart slot suggestions based on preferences
   */
  async suggestOptimalSlots(
    params: AvailabilitySearchParams,
    maxSuggestions: number = 10
  ): Promise<TimeSlot[]> {
    try {
      const allAvailable = await this.getWeeklyAvailability(params);
      const suggestions: TimeSlot[] = [];
      
      for (const day of allAvailable) {
        for (const staffAvail of day.staffAvailability) {
          for (const slot of staffAvail.slots) {
            if (slot.available && suggestions.length < maxSuggestions) {
              // Score slot based on preferences
              const score = this.scoreSlot(slot, params.preferredTimeRanges);
              (slot as any).score = score;
              suggestions.push(slot);
            }
          }
        }
      }
      
      // Sort by score (highest first) and return
      return suggestions
        .sort((a, b) => ((b as any).score || 0) - ((a as any).score || 0))
        .slice(0, maxSuggestions);
        
    } catch (error) {
      console.error('Error suggesting optimal slots:', error);
      throw error;
    }
  }
  
  /**
   * Get capacity and utilization metrics
   */
  async getCapacityMetrics(
    companyId: string,
    branchId: string,
    date: Date,
    serviceIds?: string[]
  ): Promise<{
    totalCapacity: number;
    bookedSlots: number;
    availableSlots: number;
    utilizationRate: number;
    peakHours: { hour: number; bookings: number }[];
  }> {
    try {
      const appointments = await prisma.appointment.findMany({
        where: {
          companyId,
          branchId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED]
          },
          ...(serviceIds?.length && {
            services: {
              path: '$[*].serviceId',
              array_contains: serviceIds
            }
          })
        }
      });
      
      // Calculate peak hours
      const hourlyBookings: { [hour: number]: number } = {};
      appointments.forEach(apt => {
        const hour = parseInt(apt.startTime.split(':')[0]);
        hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1;
      });
      
      const peakHours = Object.entries(hourlyBookings)
        .map(([hour, count]) => ({ hour: parseInt(hour), bookings: count }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 3);
      
      // Get total capacity (simplified calculation)
      const totalCapacity = await this.calculateDayCapacity(branchId, date);
      const bookedSlots = appointments.length;
      const availableSlots = totalCapacity - bookedSlots;
      const utilizationRate = totalCapacity > 0 ? (bookedSlots / totalCapacity) * 100 : 0;
      
      return {
        totalCapacity,
        bookedSlots,
        availableSlots,
        utilizationRate,
        peakHours
      };
      
    } catch (error) {
      console.error('Error getting capacity metrics:', error);
      throw error;
    }
  }
  
  /**
   * Private helper methods
   */
  
  private async generateStaffSlots(
    staff: any,
    date: Date,
    duration: number,
    existingAppointments: any[],
    branch: any
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    
    try {
      // Get staff working hours for this day
      const dayOfWeek = date.getDay();
      const schedule = staff.schedules.find((s: any) => s.dayOfWeek === dayOfWeek);
      
      if (!schedule || !schedule.isWorking) {
        return slots;
      }
      
      // Generate slots within working hours
      const workStart = this.parseTime(schedule.startTime);
      const workEnd = this.parseTime(schedule.endTime);
      const slotInterval = 30; // 30-minute slots
      
      let currentTime = workStart;
      
      while (currentTime + duration <= workEnd) {
        const startTime = this.formatTime(currentTime);
        const endTime = this.formatTime(currentTime + duration);
        
        // Check for conflicts
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = this.parseTime(apt.startTime);
          const aptEnd = aptStart + apt.totalDuration;
          return (currentTime < aptEnd && currentTime + duration > aptStart);
        });
        
        // Handle breaks
        let inBreak = false;
        if (schedule.breaks) {
          const breaks = schedule.breaks as any[];
          inBreak = breaks.some(breakTime => {
            const breakStart = this.parseTime(breakTime.start);
            const breakEnd = this.parseTime(breakTime.end);
            return (currentTime < breakEnd && currentTime + duration > breakStart);
          });
        }
        
        slots.push({
          date: format(date, 'yyyy-MM-dd'),
          startTime,
          endTime,
          available: !hasConflict && !inBreak,
          staffId: staff.id,
          conflicts: hasConflict ? ['Staff unavailable'] : inBreak ? ['Break time'] : undefined
        });
        
        currentTime += slotInterval;
      }
      
      return slots;
    } catch (error) {
      console.error('Error generating staff slots:', error);
      return slots;
    }
  }
  
  private async getDayAvailability(
    companyId: string,
    branchId: string,
    date: Date,
    serviceIds: string[],
    duration: number,
    preferredStaffId?: string,
    preferredTimeRanges?: { start: string; end: string }[]
  ): Promise<DayAvailability> {
    try {
      // Get branch business hours
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });
      
      const dayName = format(date, 'EEEE').toLowerCase();
      const businessHours = (branch?.operatingHours as any)?.[dayName] || {
        isOpen: true,
        openTime: '09:00',
        closeTime: '18:00'
      };
      
      // Get available staff
      const availableStaff = await prisma.staff.findMany({
        where: {
          status: 'ACTIVE',
          services: {
            some: {
              serviceId: { in: serviceIds },
              isActive: true
            }
          },
          branches: {
            some: {
              branchId: branchId,
              isActive: true
            }
          },
          ...(preferredStaffId && { id: preferredStaffId })
        },
        include: {
          schedules: {
            where: {
              dayOfWeek: date.getDay(),
              startDate: { lte: date },
              OR: [
                { endDate: null },
                { endDate: { gte: date } }
              ]
            }
          }
        }
      });
      
      // Get existing appointments
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          branchId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
          }
        }
      });
      
      // Generate availability for each staff member
      const staffAvailability: StaffAvailability[] = [];
      let totalSlots = 0;
      let availableSlots = 0;
      
      for (const staff of availableStaff) {
        const staffSlots = await this.generateStaffSlots(
          staff,
          date,
          duration,
          existingAppointments.filter(apt => apt.staffId === staff.id),
          branch
        );
        
        const availableStaffSlots = staffSlots.filter(slot => slot.available).length;
        
        staffAvailability.push({
          staffId: staff.id,
          staffName: staff.name,
          slots: staffSlots,
          totalAvailableSlots: availableStaffSlots
        });
        
        totalSlots += staffSlots.length;
        availableSlots += availableStaffSlots;
      }
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        totalSlots,
        availableSlots,
        staffAvailability,
        businessHours
      };
      
    } catch (error) {
      console.error('Error getting day availability:', error);
      throw error;
    }
  }
  
  private async calculateServicesDuration(serviceIds: string[]): Promise<number> {
    try {
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } }
      });
      
      return services.reduce((total, service) => {
        const duration = (service.duration as any)?.minutes || 
                        (service.duration as any)?.hours * 60 || 
                        60; // Default 60 minutes
        return total + duration;
      }, 0);
    } catch (error) {
      console.error('Error calculating services duration:', error);
      return 60; // Default duration
    }
  }
  
  private async checkStaffSlotConflicts(
    staffId: string,
    date: Date,
    startTime: string,
    duration: number
  ): Promise<string[]> {
    const conflicts: string[] = [];
    
    try {
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          staffId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
          }
        }
      });
      
      const appointmentStart = this.parseTime(startTime);
      const appointmentEnd = appointmentStart + duration;
      
      for (const existing of conflictingAppointments) {
        const existingStart = this.parseTime(existing.startTime);
        const existingEnd = existingStart + existing.totalDuration;
        
        if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
          conflicts.push(`Staff has appointment at ${existing.startTime}`);
        }
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error checking staff slot conflicts:', error);
      return ['Error checking staff availability'];
    }
  }
  
  private async checkBusinessHoursConflict(
    branchId: string,
    date: Date,
    startTime: string,
    duration: number
  ): Promise<string | null> {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });
      
      if (!branch?.operatingHours) {
        return null;
      }
      
      const dayName = format(date, 'EEEE').toLowerCase();
      const dayHours = (branch.operatingHours as any)[dayName];
      
      if (!dayHours?.isOpen) {
        return 'Business is closed on this day';
      }
      
      const appointmentStart = this.parseTime(startTime);
      const appointmentEnd = appointmentStart + duration;
      const businessStart = this.parseTime(dayHours.openTime);
      const businessEnd = this.parseTime(dayHours.closeTime);
      
      if (appointmentStart < businessStart || appointmentEnd > businessEnd) {
        return `Outside business hours (${dayHours.openTime} - ${dayHours.closeTime})`;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return null;
    }
  }
  
  private scoreSlot(slot: TimeSlot, preferredTimeRanges?: { start: string; end: string }[]): number {
    let score = 100; // Base score
    
    // Prefer earlier slots (morning preference)
    const hour = parseInt(slot.startTime.split(':')[0]);
    if (hour >= 9 && hour <= 12) {
      score += 20; // Morning bonus
    } else if (hour >= 13 && hour <= 17) {
      score += 10; // Afternoon bonus
    }
    
    // Prefer slots within preferred time ranges
    if (preferredTimeRanges?.length) {
      const inPreferredRange = preferredTimeRanges.some(range => 
        slot.startTime >= range.start && slot.startTime <= range.end
      );
      if (inPreferredRange) {
        score += 50;
      }
    }
    
    return score;
  }
  
  private async calculateDayCapacity(branchId: string, date: Date): Promise<number> {
    try {
      // Simplified capacity calculation
      // In a real implementation, this would consider:
      // - Number of staff working
      // - Working hours
      // - Average appointment duration
      // - Break times
      
      const activeStaff = await prisma.staff.count({
        where: {
          status: 'ACTIVE',
          branches: {
            some: {
              branchId: branchId,
              isActive: true
            }
          }
        }
      });
      
      // Assume 8 hours * 2 appointments per hour per staff
      return activeStaff * 8 * 2;
    } catch (error) {
      console.error('Error calculating day capacity:', error);
      return 0;
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

export const availabilityService = new AvailabilityService();