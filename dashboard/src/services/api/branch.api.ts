import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// Branch enums (matching backend Prisma schema)
export enum BranchType {
  MAIN = 'MAIN',
  SECONDARY = 'SECONDARY',
  FRANCHISE = 'FRANCHISE',
  POPUP = 'POPUP',
  MOBILE = 'MOBILE'
}

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED'
}

// =========================== INTERFACES ===========================

export interface OperatingHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

export interface BranchContact {
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export interface BranchAddress {
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  googlePlaceId?: string;
  formattedAddress?: string;
}

export interface BranchSettings {
  timezone: string;
  currency: string;
  language: string;
  bookingAdvanceDays: number;
  cancellationHours: number;
  noShowHours: number;
  autoConfirmBookings: boolean;
  requireDeposit: boolean;
  depositAmount?: number;
  depositPercentage?: number;
  taxRate?: number;
  serviceChargeRate?: number;
  allowOnlinePayment: boolean;
  allowCashPayment: boolean;
  allowCardPayment: boolean;
}

export interface Branch {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  type: BranchType;
  status: BranchStatus;
  isDefault: boolean;
  address: BranchAddress;
  contact: BranchContact;
  operatingHours: OperatingHours;
  settings: BranchSettings;
  images?: string[];
  logo?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Statistics/counts (if included in response)
  staffCount?: number;
  serviceCount?: number;
  resourceCount?: number;
}

export interface BranchFilters {
  search?: string;
  includeInactive?: boolean;
  type?: BranchType;
  status?: BranchStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateBranchDto {
  name: string;
  nameAr?: string;
  description?: string;
  type?: BranchType;
  address: BranchAddress;
  contact?: BranchContact;
  operatingHours?: Partial<OperatingHours>;
  settings?: Partial<BranchSettings>;
  images?: string[];
  logo?: string;
}

export interface UpdateBranchDto extends Partial<CreateBranchDto> {
  status?: BranchStatus;
}

export interface PaginatedBranchResponse {
  data: Branch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =========================== BRANCH API CLASS ===========================

export class BranchAPI {

  // ==================== Branch CRUD Operations ====================

  /**
   * Get all branches for the company with filtering and pagination
   */
  async getBranches(companyId: string, filters?: BranchFilters): Promise<PaginatedBranchResponse> {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.includeInactive !== undefined) params.append('includeInactive', filters.includeInactive.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get<ApiResponse<Branch[]>>(`/companies/${companyId}/branches?${params.toString()}`);
    
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
   * Get branch by ID
   */
  async getBranchById(companyId: string, branchId: string): Promise<Branch> {
    const response = await apiClient.get<ApiResponse<Branch>>(`/companies/${companyId}/branches/${branchId}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Branch not found');
    }
    
    return response.data.data;
  }

  /**
   * Create a new branch
   */
  async createBranch(companyId: string, data: CreateBranchDto): Promise<Branch> {
    const response = await apiClient.post<ApiResponse<Branch>>(`/companies/${companyId}/branches`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create branch');
    }
    
    return response.data.data;
  }

  /**
   * Update an existing branch
   */
  async updateBranch(companyId: string, branchId: string, data: UpdateBranchDto): Promise<Branch> {
    const response = await apiClient.put<ApiResponse<Branch>>(`/companies/${companyId}/branches/${branchId}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update branch');
    }
    
    return response.data.data;
  }

  /**
   * Delete a branch (soft delete)
   */
  async deleteBranch(companyId: string, branchId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/companies/${companyId}/branches/${branchId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete branch');
    }
  }

  // ==================== Branch Management ====================

  /**
   * Set branch as default/main
   */
  async setDefaultBranch(companyId: string, branchId: string): Promise<Branch> {
    const response = await apiClient.post<ApiResponse<Branch>>(`/companies/${companyId}/branches/${branchId}/set-default`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to set default branch');
    }
    
    return response.data.data;
  }

  /**
   * Get branch count for company
   */
  async getBranchCount(companyId: string): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(`/companies/${companyId}/branches/count`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to get branch count');
    }
    
    return response.data.data.count;
  }

  // ==================== Operating Hours Management ====================

  /**
   * Get branch operating hours
   */
  async getOperatingHours(companyId: string, branchId: string): Promise<OperatingHours> {
    const response = await apiClient.get<ApiResponse<{ operatingHours: OperatingHours }>>(
      `/companies/${companyId}/branches/${branchId}/operating-hours`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to get operating hours');
    }
    
    return response.data.data.operatingHours;
  }

  /**
   * Update branch operating hours
   */
  async updateOperatingHours(
    companyId: string,
    branchId: string,
    operatingHours: OperatingHours
  ): Promise<Branch> {
    const response = await apiClient.put<ApiResponse<Branch>>(
      `/companies/${companyId}/branches/${branchId}/operating-hours`,
      { operatingHours }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update operating hours');
    }
    
    return response.data.data;
  }

  // ==================== Staff Assignment ====================

  /**
   * Assign staff to branch
   */
  async assignStaff(companyId: string, branchId: string, staffIds: string[]): Promise<Branch> {
    const response = await apiClient.post<ApiResponse<Branch>>(
      `/companies/${companyId}/branches/${branchId}/assign-staff`,
      { staffIds }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to assign staff to branch');
    }
    
    return response.data.data;
  }

  // ==================== Service Assignment ====================

  /**
   * Assign services to branch
   */
  async assignServices(companyId: string, branchId: string, serviceIds: string[]): Promise<Branch> {
    const response = await apiClient.post<ApiResponse<Branch>>(
      `/companies/${companyId}/branches/${branchId}/assign-services`,
      { serviceIds }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to assign services to branch');
    }
    
    return response.data.data;
  }

  // ==================== Resource Assignment ====================

  /**
   * Assign resources to branch
   */
  async assignResources(companyId: string, branchId: string, resourceIds: string[]): Promise<Branch> {
    const response = await apiClient.post<ApiResponse<Branch>>(
      `/companies/${companyId}/branches/${branchId}/assign-resources`,
      { resourceIds }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to assign resources to branch');
    }
    
    return response.data.data;
  }

  // ==================== Utility Methods ====================

  /**
   * Get default operating hours template
   */
  static getDefaultOperatingHours(): OperatingHours {
    const defaultDay = { open: '09:00', close: '18:00', closed: false };
    const closedDay = { open: '09:00', close: '18:00', closed: true };
    
    return {
      monday: { ...defaultDay },
      tuesday: { ...defaultDay },
      wednesday: { ...defaultDay },
      thursday: { ...defaultDay },
      friday: { ...defaultDay },
      saturday: { ...defaultDay },
      sunday: { ...closedDay },
    };
  }

  /**
   * Get default branch settings
   */
  static getDefaultSettings(): BranchSettings {
    return {
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      bookingAdvanceDays: 30,
      cancellationHours: 24,
      noShowHours: 2,
      autoConfirmBookings: false,
      requireDeposit: false,
      allowOnlinePayment: true,
      allowCashPayment: true,
      allowCardPayment: true,
    };
  }

  /**
   * Check if branch is open at a specific time
   */
  static isBranchOpen(branch: Branch, dateTime: Date): boolean {
    const dayOfWeek = dateTime.getDay(); // 0 = Sunday
    const dayNames: (keyof OperatingHours)[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    
    const dayName = dayNames[dayOfWeek];
    const daySchedule = branch.operatingHours[dayName];
    
    if (daySchedule.closed) return false;
    
    const currentTime = dateTime.toTimeString().slice(0, 5); // HH:MM
    return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
  }

  /**
   * Get branch next opening time
   */
  static getNextOpeningTime(branch: Branch, fromDate: Date = new Date()): Date | null {
    const dayNames: (keyof OperatingHours)[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    
    let checkDate = new Date(fromDate);
    
    // Check up to 7 days ahead
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = checkDate.getDay();
      const dayName = dayNames[dayOfWeek];
      const daySchedule = branch.operatingHours[dayName];
      
      if (!daySchedule.closed) {
        const openTime = new Date(checkDate);
        const [hours, minutes] = daySchedule.open.split(':').map(Number);
        openTime.setHours(hours, minutes, 0, 0);
        
        // If it's today and we're before opening time, return today's opening
        if (i === 0 && fromDate <= openTime) {
          return openTime;
        }
        
        // If it's a future day, return that day's opening time
        if (i > 0) {
          return openTime;
        }
      }
      
      // Move to next day
      checkDate.setDate(checkDate.getDate() + 1);
    }
    
    return null; // No opening time found in the next 7 days
  }

  /**
   * Format address for display
   */
  static formatAddress(address: BranchAddress): string {
    if (address.formattedAddress) {
      return address.formattedAddress;
    }
    
    const parts = [address.street, address.city, address.state, address.country];
    return parts.filter(Boolean).join(', ');
  }

  /**
   * Generate Google Maps URL
   */
  static getGoogleMapsUrl(address: BranchAddress): string {
    if (address.coordinates) {
      return `https://www.google.com/maps?q=${address.coordinates.lat},${address.coordinates.lng}`;
    }
    
    const query = encodeURIComponent(this.formatAddress(address));
    return `https://www.google.com/maps/search/?q=${query}`;
  }

  /**
   * Validate operating hours
   */
  static validateOperatingHours(hours: OperatingHours): string[] {
    const errors: string[] = [];
    const dayNames = Object.keys(hours) as (keyof OperatingHours)[];
    
    dayNames.forEach(day => {
      const dayHours = hours[day];
      if (!dayHours.closed) {
        if (!dayHours.open || !dayHours.close) {
          errors.push(`${day}: Open and close times are required when not closed`);
        } else if (dayHours.open >= dayHours.close) {
          errors.push(`${day}: Close time must be after open time`);
        }
      }
    });
    
    return errors;
  }

  /**
   * Check if two time ranges overlap
   */
  static timeRangesOverlap(
    start1: string, end1: string,
    start2: string, end2: string
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Calculate total operating hours per week
   */
  static calculateWeeklyHours(hours: OperatingHours): number {
    let totalMinutes = 0;
    
    Object.values(hours).forEach(dayHours => {
      if (!dayHours.closed && dayHours.open && dayHours.close) {
        const [openHours, openMinutes] = dayHours.open.split(':').map(Number);
        const [closeHours, closeMinutes] = dayHours.close.split(':').map(Number);
        
        const openTotalMinutes = openHours * 60 + openMinutes;
        const closeTotalMinutes = closeHours * 60 + closeMinutes;
        
        totalMinutes += closeTotalMinutes - openTotalMinutes;
      }
    });
    
    return totalMinutes / 60; // Convert to hours
  }
}

// Create and export singleton instance
export const branchAPI = new BranchAPI();
export default branchAPI;