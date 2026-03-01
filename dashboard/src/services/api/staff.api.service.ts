import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// ======================= ENUMS =======================

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

export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  TIERED = 'TIERED'
}

export enum PayrollStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

// ======================= INTERFACES =======================

export interface WorkingDay {
  dayOfWeek: number; // 0-6 (Sunday = 0)
  isWorking: boolean;
  startTime?: string; // HH:MM format
  endTime?: string;   // HH:MM format
  breaks?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
    type?: 'break' | 'lunch';
    paid?: boolean;
  }[];
}

export interface StaffSchedule {
  id: string;
  staffId: string;
  branchId: string;
  workingDays: WorkingDay[];
  startDate: string;
  endDate?: string;
  isTemplate?: boolean;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffPosition {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  companyId: string;
  level: number; // hierarchy level
  permissions: string[];
  defaultCommissionRate?: number;
  defaultHourlyRate?: number;
  active: boolean;
  staffCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffCommission {
  id: string;
  staffId: string;
  type: CommissionType;
  value: number; // percentage or fixed amount
  serviceId?: string; // service-specific commission
  categoryId?: string; // category-specific commission
  minAmount?: number; // minimum threshold
  maxAmount?: number; // maximum cap
  startDate?: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

export interface PerformanceMetrics {
  period: string; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string;
  endDate: string;
  metrics: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalRevenue: number;
    averageServiceTime: number;
    customerSatisfaction?: number;
    repeatCustomers: number;
    newCustomers: number;
    utilizationRate: number; // percentage of scheduled time actually used
  };
}

export interface TimeOffRequest {
  id?: string;
  staffId: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick' | 'personal' | 'emergency' | 'maternity' | 'paternity';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollEntry {
  id: string;
  staffId: string;
  period: string; // YYYY-MM format
  baseSalary: number;
  commissionTotal: number;
  bonuses: number;
  deductions: number;
  totalHours: number;
  overtimeHours: number;
  overtimeRate: number;
  grossAmount: number;
  netAmount: number;
  taxes: number;
  status: PayrollStatus;
  paidAt?: string;
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
  position?: StaffPosition;
  employmentDate?: string;
  terminationDate?: string;
  
  // Access & Status
  accessLevel: AccessLevel;
  accessStatus: AccessStatus;
  status: StaffStatus;
  
  // Online Booking
  onlineBookingEnabled: boolean;
  onlineBookingProfile?: {
    displayName?: string;
    bio?: string;
    showRating?: boolean;
    allowAnyService?: boolean;
  };
  onlineBookingRules?: {
    requiresPrepayment?: boolean;
    allowAnySpecialist?: boolean;
    advanceBookingDays?: number;
    cancellationPolicy?: string;
  };
  schedulingTime?: 'general' | 'personal';
  
  // Appearance & Organization
  color?: string;
  avatar?: string;
  order: number;
  
  // Financial
  commissionRate?: number;
  hourlyRate?: number;
  baseSalary?: number;
  
  // Professional Info
  specializations?: string[];
  qualifications?: string;
  certifications?: {
    name: string;
    issuer: string;
    dateIssued?: string;
    expiryDate?: string;
    certificateUrl?: string;
  }[];
  languages?: string[];
  
  // Personal Information
  personalInfo?: {
    dateOfBirth?: string;
    nationality?: string;
    idNumber?: string;
    passportNumber?: string;
    taxId?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  
  // System fields
  userId?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Relations
  branches: {
    branchId: string;
    branch: {
      id: string;
      name: string;
    };
    isPrimary: boolean;
    assignedAt: string;
  }[];
  
  services: {
    serviceId: string;
    service: {
      id: string;
      name: string;
    };
    customPrice?: number;
    customDuration?: number;
    commissionRate?: number;
    assignedAt: string;
  }[];
  
  schedules?: StaffSchedule[];
  commissions?: StaffCommission[];
  timeOff?: TimeOffRequest[];
  performance?: PerformanceMetrics;
}

export interface StaffFilters {
  branchId?: string;
  serviceId?: string;
  positionId?: string;
  accessLevel?: AccessLevel;
  status?: StaffStatus;
  accessStatus?: AccessStatus;
  searchTerm?: string;
  onlineBookingEnabled?: boolean;
  hasEmail?: boolean;
  hasSchedule?: boolean;
  sortBy?: 'name' | 'createdAt' | 'employmentDate' | 'accessLevel' | 'status';
  sortDirection?: 'asc' | 'desc';
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
  
  // Online booking settings
  onlineBookingEnabled?: boolean;
  onlineBookingProfile?: ExpressStaff['onlineBookingProfile'];
  onlineBookingRules?: ExpressStaff['onlineBookingRules'];
  schedulingTime?: string;
  
  // Appearance
  color?: string;
  avatar?: string;
  order?: number;
  
  // Assignments
  branchIds?: string[];
  serviceIds?: string[];
  
  // Financial
  userId?: string;
  commissionRate?: number;
  hourlyRate?: number;
  baseSalary?: number;
  
  // Professional info
  specializations?: string[];
  qualifications?: string;
  certifications?: ExpressStaff['certifications'];
  languages?: string[];
  
  // Personal info
  personalInfo?: ExpressStaff['personalInfo'];
}

export interface UpdateStaffDto extends Partial<CreateStaffDto> {
  status?: StaffStatus;
  accessStatus?: AccessStatus;
  terminationDate?: string;
}

export interface ScheduleUpdate {
  branchId: string;
  workingDays: WorkingDay[];
  startDate: string;
  endDate?: string;
  isTemplate?: boolean;
  templateName?: string;
}

export interface TimeSlot {
  start: string; // HH:MM
  end: string;   // HH:MM
  available: boolean;
  duration: number; // in minutes
  appointmentId?: string;
  type?: 'available' | 'booked' | 'break' | 'blocked';
}

export interface AvailabilityQuery {
  date: string; // YYYY-MM-DD
  serviceId?: string;
  duration?: number; // service duration in minutes
  branchId?: string;
}

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  terminated: number;
  withOnlineBooking: number;
  withoutEmail: number;
  recentlyAdded: number; // added in last 30 days
  averageCommissionRate: number;
  totalPayroll: number;
}

export interface WorkingHoursSummary {
  totalHours: number;
  workingDays: number;
  averageHoursPerDay: number;
  earliestStart: string;
  latestEnd: string;
  totalBreaks: number;
}

export interface BulkStaffImport {
  staff: CreateStaffDto[];
  defaultBranchId?: string;
  defaultPositionId?: string;
  updateExisting?: boolean;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    staff: string;
    error: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ======================= STAFF API CLASS =======================

export class StaffApiService {

  // ==================== Staff CRUD Operations ====================

  /**
   * Get all staff with filtering and pagination
   */
  async getStaff(
    filters?: StaffFilters,
    pagination?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<ExpressStaff>> {
    const params = new URLSearchParams();
    
    // Add pagination
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    
    // Add filters
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.positionId) params.append('positionId', filters.positionId);
    if (filters?.accessLevel) params.append('accessLevel', filters.accessLevel);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.accessStatus) params.append('accessStatus', filters.accessStatus);
    if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);
    if (filters?.onlineBookingEnabled !== undefined) {
      params.append('onlineBookingEnabled', filters.onlineBookingEnabled.toString());
    }
    if (filters?.hasEmail !== undefined) params.append('hasEmail', filters.hasEmail.toString());
    if (filters?.hasSchedule !== undefined) params.append('hasSchedule', filters.hasSchedule.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortDirection) params.append('sortDirection', filters.sortDirection);

    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff?${params.toString()}`);
    
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  /**
   * Get staff member by ID with full details
   */
  async getStaffById(
    id: string, 
    includeRelations = true,
    includeSchedules = false,
    includePerformance = false
  ): Promise<ExpressStaff> {
    const params = new URLSearchParams();
    if (includeRelations) params.append('includeRelations', 'true');
    if (includeSchedules) params.append('includeSchedules', 'true');
    if (includePerformance) params.append('includePerformance', 'true');

    const response = await apiClient.get<ApiResponse<ExpressStaff>>(`/staff/${id}?${params.toString()}`);
    
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
  async deleteStaff(id: string, terminationReason?: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/staff/${id}`, {
      data: { terminationReason }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete staff member');
    }
  }

  // ==================== Staff Query Operations ====================

  /**
   * Get all staff (no pagination, for dropdowns)
   */
  async getAllStaff(activeOnly = true): Promise<ExpressStaff[]> {
    const params = new URLSearchParams();
    if (activeOnly) params.append('status', 'ACTIVE');

    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff/all?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Get staff who provide a specific service
   */
  async getStaffByService(serviceId: string, branchId?: string): Promise<ExpressStaff[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff/by-service/${serviceId}?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Get staff in a specific branch
   */
  async getStaffByBranch(branchId: string): Promise<ExpressStaff[]> {
    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff/by-branch/${branchId}`);
    return response.data.data || [];
  }

  /**
   * Get staff by position
   */
  async getStaffByPosition(positionId: string): Promise<ExpressStaff[]> {
    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff/by-position/${positionId}`);
    return response.data.data || [];
  }

  /**
   * Search staff
   */
  async searchStaff(searchTerm: string, filters?: Omit<StaffFilters, 'searchTerm'>): Promise<ExpressStaff[]> {
    const params = new URLSearchParams();
    params.append('q', searchTerm);
    
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.positionId) params.append('positionId', filters.positionId);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiClient.get<ApiResponse<ExpressStaff[]>>(`/staff/search?${params.toString()}`);
    return response.data.data || [];
  }

  // ==================== Position Management ====================

  /**
   * Get all positions
   */
  async getPositions(): Promise<StaffPosition[]> {
    const response = await apiClient.get<ApiResponse<StaffPosition[]>>('/staff/positions');
    return response.data.data || [];
  }

  /**
   * Create new position
   */
  async createPosition(data: Omit<StaffPosition, 'id' | 'createdAt' | 'updatedAt' | 'staffCount'>): Promise<StaffPosition> {
    const response = await apiClient.post<ApiResponse<StaffPosition>>('/staff/positions', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create position');
    }
    
    return response.data.data;
  }

  /**
   * Update position
   */
  async updatePosition(id: string, data: Partial<StaffPosition>): Promise<StaffPosition> {
    const response = await apiClient.put<ApiResponse<StaffPosition>>(`/staff/positions/${id}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update position');
    }
    
    return response.data.data;
  }

  /**
   * Delete position
   */
  async deletePosition(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/staff/positions/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete position');
    }
  }

  // ==================== Service Assignment ====================

  /**
   * Assign service to staff member
   */
  async assignService(
    staffId: string, 
    serviceId: string, 
    overrides?: { customPrice?: number; customDuration?: number; commissionRate?: number }
  ): Promise<void> {
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

  /**
   * Bulk assign services to staff
   */
  async bulkAssignServices(
    staffId: string,
    serviceAssignments: Array<{
      serviceId: string;
      customPrice?: number;
      customDuration?: number;
      commissionRate?: number;
    }>
  ): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/bulk-assign-services`, {
      services: serviceAssignments
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to bulk assign services');
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

  /**
   * Set primary branch for staff
   */
  async setPrimaryBranch(staffId: string, branchId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/set-primary-branch`, {
      branchId
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to set primary branch');
    }
  }

  // ==================== Schedule Management ====================

  /**
   * Get staff schedule for a branch
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

  /**
   * Create schedule template
   */
  async createScheduleTemplate(
    staffId: string,
    templateName: string,
    workingDays: WorkingDay[]
  ): Promise<StaffSchedule> {
    const response = await apiClient.post<ApiResponse<StaffSchedule>>(`/staff/${staffId}/schedule-template`, {
      templateName,
      workingDays,
      isTemplate: true
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create schedule template');
    }
    
    return response.data.data;
  }

  /**
   * Apply schedule template
   */
  async applyScheduleTemplate(
    staffId: string,
    templateId: string,
    branchIds: string[],
    startDate: string,
    endDate?: string
  ): Promise<StaffSchedule[]> {
    const response = await apiClient.post<ApiResponse<StaffSchedule[]>>(`/staff/${staffId}/apply-schedule-template`, {
      templateId,
      branchIds,
      startDate,
      endDate
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to apply schedule template');
    }
    
    return response.data.data;
  }

  // ==================== Availability Management ====================

  /**
   * Check staff availability for a specific date and time
   */
  async checkAvailability(
    staffId: string,
    query: AvailabilityQuery
  ): Promise<TimeSlot[]> {
    const params = new URLSearchParams();
    params.append('date', query.date);
    if (query.serviceId) params.append('serviceId', query.serviceId);
    if (query.duration) params.append('duration', query.duration.toString());
    if (query.branchId) params.append('branchId', query.branchId);

    const response = await apiClient.get<ApiResponse<TimeSlot[]>>(
      `/staff/${staffId}/availability?${params.toString()}`
    );
    
    return response.data.data || [];
  }

  /**
   * Get working hours summary
   */
  async getWorkingHours(staffId: string, branchId?: string): Promise<WorkingHoursSummary> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<WorkingHoursSummary>>(
      `/staff/${staffId}/working-hours?${params.toString()}`
    );
    
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
  ): Promise<{ date: string; time: TimeSlot } | null> {
    const params = new URLSearchParams();
    params.append('branchId', branchId);
    params.append('serviceDuration', serviceDuration.toString());
    if (fromDate) params.append('fromDate', fromDate.toISOString());
    params.append('maxDaysAhead', maxDaysAhead.toString());

    const response = await apiClient.get<ApiResponse<{ date: string; time: TimeSlot }>>(
      `/staff/${staffId}/next-available?${params.toString()}`
    );
    
    return response.data.data || null;
  }

  /**
   * Block time slots
   */
  async blockTimeSlots(
    staffId: string,
    branchId: string,
    timeSlots: Array<{
      date: string;
      startTime: string;
      endTime: string;
      reason?: string;
    }>
  ): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/block-time`, {
      branchId,
      timeSlots
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to block time slots');
    }
  }

  // ==================== Time Off Management ====================

  /**
   * Request time off
   */
  async requestTimeOff(staffId: string, data: Omit<TimeOffRequest, 'id' | 'staffId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<TimeOffRequest> {
    const response = await apiClient.post<ApiResponse<TimeOffRequest>>(`/staff/${staffId}/time-off`, {
      ...data,
      status: 'pending'
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to request time off');
    }
    
    return response.data.data;
  }

  /**
   * Get time off records
   */
  async getTimeOff(
    staffId: string,
    filters?: {
      status?: TimeOffRequest['status'];
      type?: TimeOffRequest['type'];
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TimeOffRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get<ApiResponse<TimeOffRequest[]>>(
      `/staff/${staffId}/time-off?${params.toString()}`
    );
    return response.data.data || [];
  }

  /**
   * Approve/reject time off request
   */
  async updateTimeOffStatus(
    staffId: string,
    requestId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<TimeOffRequest> {
    const response = await apiClient.put<ApiResponse<TimeOffRequest>>(
      `/staff/${staffId}/time-off/${requestId}`,
      { status, notes }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update time off status');
    }
    
    return response.data.data;
  }

  // ==================== Commission Tracking ====================

  /**
   * Get staff commissions
   */
  async getCommissions(staffId: string): Promise<StaffCommission[]> {
    const response = await apiClient.get<ApiResponse<StaffCommission[]>>(`/staff/${staffId}/commissions`);
    return response.data.data || [];
  }

  /**
   * Add commission rule
   */
  async addCommission(staffId: string, commission: Omit<StaffCommission, 'id' | 'staffId' | 'createdAt'>): Promise<StaffCommission> {
    const response = await apiClient.post<ApiResponse<StaffCommission>>(`/staff/${staffId}/commissions`, commission);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to add commission rule');
    }
    
    return response.data.data;
  }

  /**
   * Update commission rule
   */
  async updateCommission(
    staffId: string,
    commissionId: string,
    updates: Partial<StaffCommission>
  ): Promise<StaffCommission> {
    const response = await apiClient.put<ApiResponse<StaffCommission>>(
      `/staff/${staffId}/commissions/${commissionId}`,
      updates
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update commission rule');
    }
    
    return response.data.data;
  }

  /**
   * Delete commission rule
   */
  async deleteCommission(staffId: string, commissionId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/staff/${staffId}/commissions/${commissionId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete commission rule');
    }
  }

  // ==================== Performance Metrics ====================

  /**
   * Get staff performance metrics
   */
  async getPerformanceMetrics(
    staffId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: string,
    endDate: string
  ): Promise<PerformanceMetrics> {
    const params = new URLSearchParams();
    params.append('period', period);
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    const response = await apiClient.get<ApiResponse<PerformanceMetrics>>(
      `/staff/${staffId}/performance?${params.toString()}`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch performance metrics');
    }
    
    return response.data.data;
  }

  /**
   * Get team performance comparison
   */
  async getTeamPerformance(
    branchId: string,
    period: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ staffId: string; staffName: string; metrics: PerformanceMetrics['metrics'] }>> {
    const params = new URLSearchParams();
    params.append('period', period);
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    const response = await apiClient.get<ApiResponse<Array<{ staffId: string; staffName: string; metrics: PerformanceMetrics['metrics'] }>>>(
      `/staff/team-performance/${branchId}?${params.toString()}`
    );
    
    return response.data.data || [];
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

  // ==================== Staff Invitation & Communication ====================

  /**
   * Send invitation to staff member
   */
  async sendInvitation(staffId: string, contactMethod: 'email' | 'sms' = 'email'): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/send-invitation`, {
      contactMethod
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to send invitation');
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(staffId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/resend-invitation`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to resend invitation');
    }
  }

  /**
   * Revoke staff access
   */
  async revokeAccess(staffId: string, reason?: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/staff/${staffId}/revoke-access`, {
      reason
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to revoke access');
    }
  }

  // ==================== Bulk Operations ====================

  /**
   * Bulk import staff
   */
  async bulkImportStaff(data: BulkStaffImport): Promise<ImportResult> {
    const response = await apiClient.post<ApiResponse<ImportResult>>('/staff/bulk-import', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Bulk import failed');
    }
    
    return response.data.data;
  }

  /**
   * Export staff data
   */
  async exportStaff(
    format: 'csv' | 'excel' = 'csv',
    filters?: StaffFilters
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.positionId) params.append('positionId', filters.positionId);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiClient.get(`/staff/export?${params.toString()}`, {
      responseType: 'blob',
    });
    
    return response.data;
  }

  /**
   * Bulk update staff
   */
  async bulkUpdateStaff(
    staffIds: string[],
    updates: Partial<UpdateStaffDto>
  ): Promise<{ updated: number; failed: number; errors: any[] }> {
    const response = await apiClient.put<ApiResponse<{ updated: number; failed: number; errors: any[] }>>(
      '/staff/bulk-update',
      {
        staffIds,
        updates,
      }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Bulk update failed');
    }
    
    return response.data.data;
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
   * Check if email exists
   */
  async checkEmailExists(email: string, excludeStaffId?: string): Promise<boolean> {
    const params = new URLSearchParams();
    params.append('email', email);
    if (excludeStaffId) params.append('excludeId', excludeStaffId);

    const response = await apiClient.get<ApiResponse<{ exists: boolean }>>(`/staff/check-email?${params.toString()}`);
    return response.data.data?.exists || false;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/staff/health');
      return response.data.success;
    } catch (error) {
      console.error('Staff API health check failed:', error);
      return false;
    }
  }

  // ==================== Static Helper Methods ====================

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
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
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

  /**
   * Calculate total working hours per week
   */
  static calculateWeeklyHours(workingDays: WorkingDay[]): number {
    return workingDays
      .filter(day => day.isWorking && day.startTime && day.endTime)
      .reduce((total, day) => {
        const start = new Date(`1970-01-01T${day.startTime}`);
        const end = new Date(`1970-01-01T${day.endTime}`);
        const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        // Subtract break time
        const breakTime = day.breaks?.reduce((breakTotal, breakItem) => {
          const breakStart = new Date(`1970-01-01T${breakItem.start}`);
          const breakEnd = new Date(`1970-01-01T${breakItem.end}`);
          return breakTotal + ((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60));
        }, 0) || 0;
        
        return total + hoursWorked - breakTime;
      }, 0);
  }

  /**
   * Format access level for display
   */
  static formatAccessLevel(level: AccessLevel, language = 'ar'): string {
    const labels = {
      ar: {
        OWNER: 'المالك',
        ADMIN: 'مدير',
        MANAGER: 'مشرف',
        EMPLOYEE: 'موظف',
        RECEPTIONIST: 'موظف استقبال',
        VIEWER: 'مشاهد'
      },
      en: {
        OWNER: 'Owner',
        ADMIN: 'Administrator',
        MANAGER: 'Manager',
        EMPLOYEE: 'Employee',
        RECEPTIONIST: 'Receptionist',
        VIEWER: 'Viewer'
      }
    };
    
    return labels[language as keyof typeof labels][level] || level;
  }

  /**
   * Format staff status for display
   */
  static formatStatus(status: StaffStatus, language = 'ar'): string {
    const labels = {
      ar: {
        ACTIVE: 'نشط',
        INACTIVE: 'غير نشط',
        ON_LEAVE: 'في إجازة',
        TERMINATED: 'منتهي الخدمة'
      },
      en: {
        ACTIVE: 'Active',
        INACTIVE: 'Inactive',
        ON_LEAVE: 'On Leave',
        TERMINATED: 'Terminated'
      }
    };
    
    return labels[language as keyof typeof labels][status] || status;
  }
}

// Create and export singleton instance
export const staffApiService = new StaffApiService();
export default staffApiService;

// Export types for use in other files
export type {
  ExpressStaff,
  StaffPosition,
  StaffFilters,
  CreateStaffDto,
  UpdateStaffDto,
  StaffSchedule,
  WorkingDay,
  TimeOffRequest,
  StaffCommission,
  PerformanceMetrics,
  StaffStats,
  BulkStaffImport,
  ImportResult,
  PaginatedResponse,
};