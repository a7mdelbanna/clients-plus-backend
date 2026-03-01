import { staffService, type Staff } from './staff.service';
import { toDateSafe } from '../utils/dateUtils';

// Work Schedule interfaces
export interface DaySchedule {
  date: Date;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    avatar?: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    breaks?: Array<{
      start: string;
      end: string;
    }>;
  }>;
}

export interface MonthSchedule {
  year: number;
  month: number; // 0-11
  days: DaySchedule[];
  totalHours: number;
  employeeTotals: {
    [employeeId: string]: {
      name: string;
      totalHours: number;
      scheduledDays: number;
    };
  };
}

export interface WeekSchedule {
  year: number;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: DaySchedule[];
  totalHours: number;
  employeeTotals: {
    [employeeId: string]: {
      name: string;
      totalHours: number;
      scheduledDays: number;
    };
  };
}

export type ViewMode = 'month' | 'week';

class WorkScheduleService {
  // Get all staff schedules for a company
  async getStaffSchedules(companyId: string, branchId?: string): Promise<Staff[]> {
    try {
      return await staffService.getStaff(companyId, branchId);
    } catch (error) {
      console.error('Error getting staff schedules:', error);
      throw error;
    }
  }

  // Get schedule for a specific month
  async getMonthSchedule(companyId: string, year: number, month: number, branchId?: string): Promise<MonthSchedule> {
    try {
      const staff = await this.getStaffSchedules(companyId, branchId);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthSchedule: MonthSchedule = {
        year,
        month,
        days: [],
        totalHours: 0,
        employeeTotals: {},
      };

      // Initialize employee totals
      staff.forEach(employee => {
        if (employee.id) {
          monthSchedule.employeeTotals[employee.id] = {
            name: employee.name,
            totalHours: 0,
            scheduledDays: 0,
          };
        }
      });

      // Build schedule for each day
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const daySchedule = this.getDayScheduleFromStaff(staff, date);
        monthSchedule.days.push(daySchedule);

        // Update totals
        daySchedule.employees.forEach(emp => {
          monthSchedule.totalHours += emp.totalHours;
          if (monthSchedule.employeeTotals[emp.employeeId]) {
            monthSchedule.employeeTotals[emp.employeeId].totalHours += emp.totalHours;
            monthSchedule.employeeTotals[emp.employeeId].scheduledDays += 1;
          }
        });
      }

      return monthSchedule;
    } catch (error) {
      console.error('Error getting month schedule:', error);
      throw error;
    }
  }

  // Get schedule for a specific week
  async getWeekSchedule(companyId: string, startDate: Date, branchId?: string): Promise<WeekSchedule> {
    try {
      const staff = await this.getStaffSchedules(companyId, branchId);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const weekSchedule: WeekSchedule = {
        year: startDate.getFullYear(),
        weekNumber: this.getWeekNumber(startDate),
        startDate,
        endDate,
        days: [],
        totalHours: 0,
        employeeTotals: {},
      };

      // Initialize employee totals
      staff.forEach(employee => {
        if (employee.id) {
          weekSchedule.employeeTotals[employee.id] = {
            name: employee.name,
            totalHours: 0,
            scheduledDays: 0,
          };
        }
      });

      // Build schedule for each day of the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const daySchedule = this.getDayScheduleFromStaff(staff, date);
        weekSchedule.days.push(daySchedule);

        // Update totals
        daySchedule.employees.forEach(emp => {
          weekSchedule.totalHours += emp.totalHours;
          if (weekSchedule.employeeTotals[emp.employeeId]) {
            weekSchedule.employeeTotals[emp.employeeId].totalHours += emp.totalHours;
            weekSchedule.employeeTotals[emp.employeeId].scheduledDays += 1;
          }
        });
      }

      return weekSchedule;
    } catch (error) {
      console.error('Error getting week schedule:', error);
      throw error;
    }
  }

  // Get schedule for a specific day from staff working hours
  private getDayScheduleFromStaff(staff: Staff[], date: Date): DaySchedule {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const daySchedule: DaySchedule = {
      date,
      employees: [],
    };

    staff.forEach(employee => {
      if (employee.schedule.isScheduled && employee.schedule.workingHours) {
        // Check if the date falls within the employee's scheduled period
        let isWithinSchedulePeriod = true;

        // Check schedule start date
        if (employee.schedule.scheduleStartDate) {
          const scheduleStartDate = toDateSafe(employee.schedule.scheduleStartDate);
          scheduleStartDate.setHours(0, 0, 0, 0);
          if (date < scheduleStartDate) {
            isWithinSchedulePeriod = false;
          }
        }

        // Check schedule end date
        if (employee.schedule.scheduledUntil) {
          const scheduledUntilDate = toDateSafe(employee.schedule.scheduledUntil);
          scheduledUntilDate.setHours(23, 59, 59, 999);
          if (date > scheduledUntilDate) {
            isWithinSchedulePeriod = false;
          }
        }

        if (isWithinSchedulePeriod) {
          const dayHours = employee.schedule.workingHours[dayName];
          if (dayHours && dayHours.isWorking && dayHours.start && dayHours.end) {
            const totalHours = this.calculateHours(dayHours.start, dayHours.end);
            daySchedule.employees.push({
              employeeId: employee.id!,
              employeeName: employee.name,
              avatar: employee.avatar,
              startTime: dayHours.start,
              endTime: dayHours.end,
              totalHours,
              breaks: dayHours.breaks,
            });
          }
        }
      }
    });

    return daySchedule;
  }

  // Calculate hours between two time strings
  private calculateHours(start: string, end: string): number {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return (endMinutes - startMinutes) / 60;
  }

  // Get week number for a date
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Subscribe to staff schedule changes (polling via staffService)
  subscribeToScheduleChanges(
    companyId: string,
    onUpdate: (staff: Staff[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    return staffService.subscribeToStaff(companyId, onUpdate, onError);
  }

  // Export schedule to PDF (placeholder)
  async exportScheduleToPDF(
    schedule: MonthSchedule | WeekSchedule,
    viewMode: ViewMode,
    companyName: string
  ): Promise<Blob> {
    console.log('Exporting schedule to PDF:', { schedule, viewMode, companyName });
    throw new Error('PDF export not yet implemented');
  }

  // Update employee schedule for a specific day
  async updateDaySchedule(
    employeeId: string,
    date: Date,
    schedule: { start: string; end: string; breaks?: Array<{ start: string; end: string }> } | null
  ): Promise<void> {
    try {
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

      // Get current employee data
      const employee = await staffService.getStaffMember(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Update the specific day in working hours
      const workingHours = { ...employee.schedule.workingHours };

      if (schedule) {
        workingHours[dayName] = {
          isWorking: true,
          start: schedule.start,
          end: schedule.end,
          breaks: schedule.breaks || [],
        };
      } else {
        workingHours[dayName] = {
          isWorking: false,
          start: '',
          end: '',
          breaks: [],
        };
      }

      // Update the employee
      await staffService.updateStaff(employeeId, {
        'schedule.workingHours': workingHours,
      });
    } catch (error) {
      console.error('Error updating day schedule:', error);
      throw error;
    }
  }

  // Get schedule summary for dashboard
  async getScheduleSummary(companyId: string, branchId?: string): Promise<{
    todayScheduled: number;
    weekScheduled: number;
    monthScheduled: number;
  }> {
    try {
      const staff = await this.getStaffSchedules(companyId, branchId);
      const today = new Date();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];

      let todayScheduled = 0;
      let weekScheduled = 0;
      let monthScheduled = 0;

      staff.forEach(employee => {
        if (employee.schedule.isScheduled && employee.schedule.workingHours) {
          const todayHours = employee.schedule.workingHours[dayName];
          if (todayHours && todayHours.isWorking) {
            todayScheduled++;
          }

          const hasWorkingDays = Object.values(employee.schedule.workingHours).some(
            day => day.isWorking
          );
          if (hasWorkingDays) {
            weekScheduled++;
            monthScheduled++;
          }
        }
      });

      return {
        todayScheduled,
        weekScheduled,
        monthScheduled,
      };
    } catch (error) {
      console.error('Error getting schedule summary:', error);
      return {
        todayScheduled: 0,
        weekScheduled: 0,
        monthScheduled: 0,
      };
    }
  }
}

export const workScheduleService = new WorkScheduleService();
