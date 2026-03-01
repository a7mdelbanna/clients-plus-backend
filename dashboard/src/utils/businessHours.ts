import { parse, format, isWithinInterval, isBefore, isAfter } from 'date-fns';

// Interface for structured business hours
export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "17:00"
  breaks?: Array<{
    startTime: string;
    endTime: string;
  }>;
}

export interface WeekSchedule {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
}

// Parse business hours string back to structured format
export function parseBusinessHoursString(businessHoursString: string): WeekSchedule | null {
  try {
    if (!businessHoursString) return null;

    const defaultSchedule: WeekSchedule = {
      sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
      monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    };

    // Parse the string format
    // Example: "الأحد: مغلق\nالإثنين: 09:00 - 17:00\nالثلاثاء: 09:00 - 17:00 (استراحة: 12:00-13:00)"
    const lines = businessHoursString.split('\n');
    const dayMapping: { [key: string]: keyof WeekSchedule } = {
      'الأحد': 'sunday',
      'الإثنين': 'monday',
      'الثلاثاء': 'tuesday',
      'الأربعاء': 'wednesday',
      'الخميس': 'thursday',
      'الجمعة': 'friday',
      'السبت': 'saturday',
      'Sunday': 'sunday',
      'Monday': 'monday',
      'Tuesday': 'tuesday',
      'Wednesday': 'wednesday',
      'Thursday': 'thursday',
      'Friday': 'friday',
      'Saturday': 'saturday',
    };

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const dayName = line.substring(0, colonIndex).trim();
      const hours = line.substring(colonIndex + 1).trim();
      
      const dayKey = dayMapping[dayName];
      if (!dayKey) continue;

      if (hours === 'مغلق' || hours === 'Closed') {
        defaultSchedule[dayKey].isOpen = false;
      } else {
        // Parse time range (e.g., "09:00 - 17:00")
        const timeMatch = hours.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        if (timeMatch) {
          defaultSchedule[dayKey] = {
            isOpen: true,
            openTime: timeMatch[1],
            closeTime: timeMatch[2],
            breaks: []
          };

          // Parse breaks if present
          const breakMatch = hours.match(/\((استراحة|Break):\s*(.+)\)/);
          if (breakMatch) {
            const breakTimes = breakMatch[2].split(',');
            for (const breakTime of breakTimes) {
              const breakTimeMatch = breakTime.trim().match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
              if (breakTimeMatch) {
                defaultSchedule[dayKey].breaks!.push({
                  startTime: breakTimeMatch[1],
                  endTime: breakTimeMatch[2]
                });
              }
            }
          }
        }
      }
    }

    return defaultSchedule;
  } catch (error) {
    console.error('Error parsing business hours string:', error);
    return null;
  }
}

// Check if a datetime is within business hours
export function isWithinBusinessHours(
  date: Date,
  businessHours: WeekSchedule | string
): boolean {
  try {
    // Parse string format if needed
    const schedule = typeof businessHours === 'string' 
      ? parseBusinessHoursString(businessHours)
      : businessHours;

    if (!schedule) return true; // If no schedule, assume always open

    // Get day of week
    const dayOfWeek = date.getDay();
    const dayNames: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const daySchedule = schedule[dayName];

    if (!daySchedule.isOpen) {
      return false; // Business is closed on this day
    }

    // Parse open and close times
    const [openHour, openMinute] = daySchedule.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = daySchedule.closeTime.split(':').map(Number);

    const openTime = new Date(date);
    openTime.setHours(openHour, openMinute, 0, 0);

    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    // Check if within open hours
    if (date < openTime || date >= closeTime) {
      return false;
    }

    // Check if within break times
    if (daySchedule.breaks && daySchedule.breaks.length > 0) {
      for (const breakPeriod of daySchedule.breaks) {
        const [breakStartHour, breakStartMinute] = breakPeriod.startTime.split(':').map(Number);
        const [breakEndHour, breakEndMinute] = breakPeriod.endTime.split(':').map(Number);

        const breakStart = new Date(date);
        breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

        const breakEnd = new Date(date);
        breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

        if (date >= breakStart && date < breakEnd) {
          return false; // Within break time
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return true; // Default to allowing if there's an error
  }
}

// Check if an appointment duration fits within business hours
export function appointmentFitsWithinBusinessHours(
  startDate: Date,
  durationMinutes: number,
  businessHours: WeekSchedule | string
): boolean {
  try {
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);

    // Check if start time is within business hours
    if (!isWithinBusinessHours(startDate, businessHours)) {
      return false;
    }

    // Parse schedule
    const schedule = typeof businessHours === 'string' 
      ? parseBusinessHoursString(businessHours)
      : businessHours;

    if (!schedule) return true;

    // Get day schedule
    const dayOfWeek = startDate.getDay();
    const dayNames: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const daySchedule = schedule[dayName];

    if (!daySchedule.isOpen) {
      return false;
    }

    // Check if appointment ends within business hours
    const [closeHour, closeMinute] = daySchedule.closeTime.split(':').map(Number);
    const closeTime = new Date(startDate);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    if (endDate > closeTime) {
      return false; // Appointment extends beyond closing time
    }

    // Check if appointment spans across break times
    if (daySchedule.breaks && daySchedule.breaks.length > 0) {
      for (const breakPeriod of daySchedule.breaks) {
        const [breakStartHour, breakStartMinute] = breakPeriod.startTime.split(':').map(Number);
        const [breakEndHour, breakEndMinute] = breakPeriod.endTime.split(':').map(Number);

        const breakStart = new Date(startDate);
        breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

        const breakEnd = new Date(startDate);
        breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

        // Check if appointment overlaps with break
        if (
          (startDate < breakEnd && endDate > breakStart) || // Overlaps break
          (startDate < breakStart && endDate > breakEnd) // Spans entire break
        ) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking appointment fit:', error);
    return true;
  }
}

// Get available time slots for a given day considering business hours
export function getAvailableTimeSlots(
  date: Date,
  slotDurationMinutes: number,
  businessHours: WeekSchedule | string
): Date[] {
  const slots: Date[] = [];

  try {
    const schedule = typeof businessHours === 'string' 
      ? parseBusinessHoursString(businessHours)
      : businessHours;

    if (!schedule) return slots;

    const dayOfWeek = date.getDay();
    const dayNames: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const daySchedule = schedule[dayName];

    if (!daySchedule.isOpen) {
      return slots; // No slots on closed days
    }

    const [openHour, openMinute] = daySchedule.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = daySchedule.closeTime.split(':').map(Number);

    let currentSlot = new Date(date);
    currentSlot.setHours(openHour, openMinute, 0, 0);

    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    while (currentSlot < closeTime) {
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);

      // Check if slot fits within business hours and doesn't overlap breaks
      if (appointmentFitsWithinBusinessHours(currentSlot, slotDurationMinutes, schedule)) {
        slots.push(new Date(currentSlot));
      }

      // Move to next slot
      currentSlot.setMinutes(currentSlot.getMinutes() + slotDurationMinutes);
    }

    return slots;
  } catch (error) {
    console.error('Error getting available time slots:', error);
    return slots;
  }
}