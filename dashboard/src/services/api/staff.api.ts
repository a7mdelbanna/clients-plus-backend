import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// Staff enums (matching backend Prisma schema)
export enum AccessLevel {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  RECEPTIONIST = 'RECEPTIONIST',
  VIEWER = 'VIEWER'
}

export enum AccessStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED'
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED'
}

// =========================== INTERFACES ===========================

export interface WorkingDay {
  dayOfWeek: number; // 0-6 (Sunday = 0)
  isWorking: boolean;
  startTime?: string; // HH:MM format
  endTime?: string;   // HH:MM format
  breaks?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  }[];
}

export interface StaffSchedule {
  id: string;
  staffId: string;
  branchId: string;
  workingDays: WorkingDay[];
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpressStaff {
  id: string;
  name: string;
  nameAr?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  bio?: string;
  specialization?: string;
  positionId?: string;
  employmentDate?: string;
  accessLevel: AccessLevel;
  accessStatus: AccessStatus;
  status: StaffStatus;
  onlineBookingEnabled: boolean;
  onlineBookingProfile?: any;
  onlineBookingRules?: any;
  schedulingTime?: string;
  color?: string;
  order: number;
  userId?: string;
  companyId: string;
  commissionRate?: number;
  hourlyRate?: number;
  specializations?: string[];
  qualifications?: string;
  certifications?: any;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  branches: {
    branchId: string;
    branch: {
      id: string;
      name: string;
    };
    isPrimary: boolean;
  }[];
  services: {
    serviceId: string;
    service: {
      id: string;
      name: string;
    };
  }[];
  schedules?: StaffSchedule[];
}

export interface StaffFilters {
  branchId?: string;
  serviceId?: string;
  positionId?: string;
  accessLevel?: AccessLevel;
  status?: StaffStatus;
  searchTerm?: string;
  onlineBookingEnabled?: boolean;
}

export interface CreateStaffDto {
  name: string;
  nameAr?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  bio?: string;
  specialization?: string;
  positionId?: string;
  employmentDate?: string;
  accessLevel?: AccessLevel;
  onlineBookingEnabled?: boolean;
  onlineBookingProfile?: any;
  onlineBookingRules?: any;
  schedulingTime?: string;
  color?: string;
  order?: number;
  branchIds?: string[];
  serviceIds?: string[];
  userId?: string;
  commissionRate?: number;
  hourlyRate?: number;
  specializations?: string[];
  qualifications?: string;
  certifications?: any;
}

export interface UpdateStaffDto extends Partial<CreateStaffDto> {
  status?: StaffStatus;
  accessStatus?: AccessStatus;
}

export interface ScheduleUpdate {
  branchId: string;
  workingDays: WorkingDay[];
  startDate: string;
  endDate?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  duration: number; // in minutes
}

export interface TimeOffRequest {
  startDate: string;
  endDate: string;
  type: string;
  reason?: string;
}

export interface TimeOff {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason?: string;
  status: string;
  createdAt: string;
}

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  withOnlineBooking: number;
  withoutEmail: number;
  recentlyAdded: number;
}

export interface WorkingHoursSummary {
  totalHours: number;
  workingDays: number;
  averageHoursPerDay: number;
  earliestStart: string;
  latestEnd: string;
}

// =========================== STAFF API CLASS ===========================

export class StaffAPI {

  // ==================== Staff CRUD Operations ====================

  /**
   * Get all staff with filtering
   */
  async getStaff(filters?: StaffFilters): Promise<ExpressStaff[]> {
    const params = new URLSearchParams();
    
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.positionId) params.append('positionId', filters.positionId);
    if (filters?.accessLevel) params.append('accessLevel', filters.accessLevel);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);
    if (filters?.onlineBookingEnabled !== undefined) {
      params.append('onlineBookingEnabled', filters.onlineBookingEnabled.toString());
    }

    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Get staff member by ID
   */
  async getStaffById(id: string): Promise<ExpressStaff> {
    const response = await apiClient.get<ApiResponse<ExpressStaff>>(`/staff/${id}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Staff member not found');
    }
    
    return response.data.data;
  }

  /**
   * Create new staff member
   */
  async createStaff(data: CreateStaffDto): Promise<ExpressStaff> {
    const response = await apiClient.post<ApiResponse<ExpressStaff>>('/staff', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create staff member');
    }
    
    return response.data.data;
  }

  /**
   * Update staff member
   */
  async updateStaff(id: string, data: UpdateStaffDto): Promise<ExpressStaff> {
    const response = await apiClient.put<ApiResponse<ExpressStaff>>(`/staff/${id}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update staff member');
    }
    
    return response.data.data;
  }

  /**
   * Delete staff member (soft delete/deactivate)
   */
  async deleteStaff(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/staff/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete staff member');
    }
  }

  // ==================== Staff by Context ====================

  /**
   * Get staff who provide a specific service
   */
  async getStaffByService(serviceId: string): Promise<ExpressStaff[]> {
    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff/by-service/${serviceId}`);
    return response.data.data || [];
  }

  /**
   * Get staff in a specific branch
   */
  async getStaffByBranch(branchId: string): Promise<ExpressStaff[]> {
    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff/by-branch/${branchId}`);
    return response.data.data || [];
  }

  // ==================== Service Assignment ====================

  /**
   * Assign service to staff member
   */
  async assignService(staffId: string, serviceId: string, overrides?: any): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/assign-service`, {
      serviceId,
      ...overrides,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to assign service');
    }
  }

  /**
   * Remove service from staff member
   */
  async unassignService(staffId: string, serviceId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/staff/${staffId}/unassign-service/${serviceId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to unassign service');
    }
  }

  // ==================== Branch Assignment ====================

  /**
   * Assign staff to branch
   */
  async assignBranch(staffId: string, branchId: string, isPrimary = false): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/assign-branch`, {
      branchId,
      isPrimary,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to assign branch');
    }
  }

  /**
   * Remove staff from branch
   */
  async unassignBranch(staffId: string, branchId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/staff/${staffId}/unassign-branch/${branchId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to unassign branch');
    }
  }

  // ==================== Staff Organization ====================

  /**
   * Reorder staff display
   */
  async reorderStaff(staffOrders: { staffId: string; order: number }[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/staff/reorder', { staffOrders });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reorder staff');
    }
  }

  // ==================== Schedule Management ====================

  /**
   * Get staff schedule
   */
  async getSchedule(staffId: string, branchId?: string): Promise<StaffSchedule | null> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<StaffSchedule>>(
      `/staff/${staffId}/schedule?${params.toString()}`
    );
    
    return response.data.data || null;
  }

  /**
   * Update staff schedule
   */
  async updateSchedule(staffId: string, scheduleData: ScheduleUpdate): Promise<StaffSchedule> {
    const response = await apiClient.put<ApiResponse<StaffSchedule>>(`/staff/${staffId}/schedule`, scheduleData);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update schedule');
    }
    
    return response.data.data;
  }

  /**
   * Copy schedule to other branches
   */
  async copySchedule(
    staffId: string,
    sourceBranchId: string,
    targetBranchIds: string[]
  ): Promise<StaffSchedule[]> {
    const response = await apiClient.post<ApiResponse<StaffSchedule[]>>(`/staff/${staffId}/copy-schedule`, {
      sourceBranchId,
      targetBranchIds,
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to copy schedule');
    }
    
    return response.data.data;
  }

  // ==================== Availability ====================

  /**
   * Check staff availability for a specific date and duration
   */
  async checkAvailability(
    staffId: string,
    date: Date,
    duration: number,
    branchId?: string
  ): Promise<TimeSlot[]> {
    const params = new URLSearchParams();
    params.append('date', date.toISOString());
    params.append('duration', duration.toString());
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<TimeSlot[]>>(
      `/staff/${staffId}/availability?${params.toString()}`
    );
    
    return response.data.data || [];
  }

  /**
   * Get working hours summary
   */
  async getWorkingHours(staffId: string): Promise<WorkingHoursSummary> {
    const response = await apiClient.get<ApiResponse<WorkingHoursSummary>>(`/staff/${staffId}/working-hours`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch working hours');
    }
    
    return response.data.data;
  }

  /**
   * Find next available slot
   */
  async getNextAvailableSlot(
    staffId: string,
    branchId: string,
    serviceDuration: number,
    fromDate?: Date,
    maxDaysAhead = 30
  ): Promise<TimeSlot | null> {
    const params = new URLSearchParams();
    params.append('branchId', branchId);
    params.append('serviceDuration', serviceDuration.toString());
    if (fromDate) params.append('fromDate', fromDate.toISOString());
    params.append('maxDaysAhead', maxDaysAhead.toString());

    const response = await apiClient.get<ApiResponse<TimeSlot>>(
      `/staff/${staffId}/next-available?${params.toString()}`
    );
    
    return response.data.data || null;
  }

  // ==================== Time Off Management ====================

  /**
   * Request time off
   */
  async requestTimeOff(staffId: string, data: TimeOffRequest): Promise<TimeOff> {
    const response = await apiClient.post<ApiResponse<TimeOff>>(`/staff/${staffId}/time-off`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to request time off');
    }
    
    return response.data.data;
  }

  /**
   * Get time off records
   */
  async getTimeOff(staffId: string): Promise<TimeOff[]> {
    const response = await apiClient.get<ApiResponse<TimeOff[]>>(`/staff/${staffId}/time-off`);
    return response.data.data || [];
  }

  // ==================== Staff Invitation & Communication ====================

  /**
   * Send invitation to staff member
   */
  async sendInvitation(staffId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/send-invitation`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to send invitation');
    }
  }

  // ==================== Statistics ====================

  /**
   * Get staff statistics
   */
  async getStaffStats(): Promise<StaffStats> {
    const response = await apiClient.get<ApiResponse<StaffStats>>('/staff/stats');
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch staff statistics');
    }
    
    return response.data.data;
  }

  // ==================== Utility Methods ====================

  /**
   * Format staff name for display
   */
  static formatStaffName(staff: ExpressStaff): string {
    if (staff.firstName && staff.lastName) {
      return `${staff.firstName} ${staff.lastName}`;
    }
    return staff.name;
  }

  /**
   * Get staff initials for avatars
   */
  static getStaffInitials(staff: ExpressStaff): string {
    if (staff.firstName && staff.lastName) {
      return `${staff.firstName.charAt(0)}${staff.lastName.charAt(0)}`;
    }
    const name = staff.name.split(' ');
    return name.length > 1 
      ? `${name[0].charAt(0)}${name[name.length - 1].charAt(0)}`
      : name[0].charAt(0);
  }

  /**
   * Check if staff member has access to a branch
   */
  static hasAccessToBranch(staff: ExpressStaff, branchId: string): boolean {
    return staff.branches.some(sb => sb.branchId === branchId);
  }

  /**
   * Check if staff member provides a service
   */
  static providesService(staff: ExpressStaff, serviceId: string): boolean {
    return staff.services.some(ss => ss.serviceId === serviceId);
  }

  /**
   * Get primary branch for staff member
   */
  static getPrimaryBranch(staff: ExpressStaff) {
    return staff.branches.find(sb => sb.isPrimary)?.branch || staff.branches[0]?.branch;
  }

  /**
   * Format working time for display
   */
  static formatWorkingTime(startTime: string, endTime: string): string {
    return `${startTime} - ${endTime}`;
  }

  /**
   * Convert working days to readable schedule
   */
  static formatSchedule(workingDays: WorkingDay[]): string[] {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return workingDays
      .filter(day => day.isWorking)
      .map(day => {
        const dayName = days[day.dayOfWeek];
        if (day.startTime && day.endTime) {
          return `${dayName}: ${day.startTime} - ${day.endTime}`;
        }
        return dayName;
      });
  }
}

// Create and export singleton instance
export const staffAPI = new StaffAPI();
export default staffAPI;