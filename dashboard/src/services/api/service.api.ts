import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// Service enums (matching backend Prisma schema)
export enum ServiceType {
  STANDARD = 'STANDARD',
  PACKAGE = 'PACKAGE',
  ADDON = 'ADDON',
  CONSULTATION = 'CONSULTATION',
  TREATMENT = 'TREATMENT'
}

// =========================== INTERFACES ===========================

export interface ServiceDuration {
  hours: number;
  minutes: number;
}

export interface OnlineBookingConfig {
  enabled: boolean;
  requiresApproval?: boolean;
  advanceBookingDays?: number;
  cancellationPolicy?: string;
}

export interface ServiceStaffAssignment {
  staffId: string;
  staffName?: string;
  price?: number;
  duration?: ServiceDuration;
  commissionRate?: number;
}

export interface ExpressService {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  categoryId?: string;
  categoryName?: string;
  type: ServiceType;
  startingPrice: number;
  duration: ServiceDuration;
  onlineBooking: OnlineBookingConfig;
  active: boolean;
  order: number;
  color?: string;
  image?: string;
  branchId?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  staff?: ServiceStaffAssignment[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  color?: string;
  icon?: string;
  active: boolean;
  order: number;
  companyId: string;
  servicesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFilters {
  categoryId?: string;
  branchId?: string;
  type?: ServiceType;
  active?: boolean;
  onlineBookingOnly?: boolean;
  searchTerm?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'name' | 'price' | 'duration' | 'createdAt' | 'order';
  sortDirection?: 'asc' | 'desc';
}

export interface ServicePaginationOptions {
  page?: number;
  limit?: number;
}

export interface CreateServiceDto {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  categoryId?: string;
  type?: ServiceType;
  startingPrice: number;
  duration: ServiceDuration;
  onlineBooking: OnlineBookingConfig;
  active?: boolean;
  color?: string;
  image?: string;
  branchId?: string;
}

export interface UpdateServiceDto extends Partial<CreateServiceDto> {}

export interface CreateCategoryDto {
  name: string;
  nameAr?: string;
  description?: string;
  color?: string;
  icon?: string;
  active?: boolean;
  order?: number;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface PaginatedServiceResponse {
  data: ExpressService[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =========================== SERVICE API CLASS ===========================

export class ServiceAPI {
  
  // ==================== Service CRUD Operations ====================
  
  /**
   * Get all services with filtering and pagination
   */
  async getServices(
    filters?: ServiceFilters,
    pagination?: ServicePaginationOptions
  ): Promise<PaginatedServiceResponse> {
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    
    // Add filter parameters
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.onlineBookingOnly !== undefined) params.append('onlineBookingOnly', filters.onlineBookingOnly.toString());
    if (filters?.searchTerm) params.append('search', filters.searchTerm);
    if (filters?.priceRange?.min) params.append('minPrice', filters.priceRange.min.toString());
    if (filters?.priceRange?.max) params.append('maxPrice', filters.priceRange.max.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortDirection) params.append('sortDirection', filters.sortDirection);

    const response = await apiClient.get<ApiResponse<ExpressService[]>>(`/services?${params.toString()}`);
    
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
   * Get a single service by ID
   */
  async getServiceById(id: string): Promise<ExpressService> {
    const response = await apiClient.get<ApiResponse<{ service: ExpressService }>>(`/services/${id}`);
    
    if (!response.data.success || !response.data.data?.service) {
      throw new Error('Service not found');
    }
    
    return response.data.data.service;
  }

  /**
   * Create a new service
   */
  async createService(data: CreateServiceDto): Promise<ExpressService> {
    const response = await apiClient.post<ApiResponse<{ service: ExpressService }>>('/services', data);
    
    if (!response.data.success || !response.data.data?.service) {
      throw new Error(response.data.message || 'Failed to create service');
    }
    
    return response.data.data.service;
  }

  /**
   * Update an existing service
   */
  async updateService(id: string, data: UpdateServiceDto): Promise<ExpressService> {
    const response = await apiClient.put<ApiResponse<{ service: ExpressService }>>(`/services/${id}`, data);
    
    if (!response.data.success || !response.data.data?.service) {
      throw new Error(response.data.message || 'Failed to update service');
    }
    
    return response.data.data.service;
  }

  /**
   * Delete a service (soft delete)
   */
  async deleteService(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/services/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete service');
    }
  }

  /**
   * Get all services without pagination (for autocomplete/dropdowns)
   */
  async getAllServices(): Promise<ExpressService[]> {
    const response = await apiClient.get<ApiResponse<ExpressService[]>>('/services/all');
    return response.data.data || [];
  }

  /**
   * Search services
   */
  async searchServices(
    searchTerm: string,
    filters?: Omit<ServiceFilters, 'searchTerm'>,
    pagination?: ServicePaginationOptions
  ): Promise<PaginatedServiceResponse> {
    const params = new URLSearchParams();
    params.append('q', searchTerm);
    
    // Add pagination parameters
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    
    // Add filter parameters
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.type) params.append('type', filters.type);

    const response = await apiClient.get<ApiResponse<ExpressService[]>>(`/services/search?${params.toString()}`);
    
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

  // ==================== Category Management ====================

  /**
   * Get all service categories
   */
  async getCategories(branchId?: string): Promise<ServiceCategory[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<ServiceCategory[]>>(`/services/categories?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Create a new service category
   */
  async createCategory(data: CreateCategoryDto): Promise<ServiceCategory> {
    const response = await apiClient.post<ApiResponse<{ categoryId: string }>>('/services/categories', data);
    
    if (!response.data.success || !response.data.data?.categoryId) {
      throw new Error(response.data.message || 'Failed to create category');
    }
    
    // Return a basic category object (API only returns ID)
    return {
      id: response.data.data.categoryId,
      name: data.name,
      nameAr: data.nameAr,
      description: data.description,
      color: data.color,
      icon: data.icon,
      active: data.active !== undefined ? data.active : true,
      order: data.order || 0,
      companyId: '', // Will be filled by backend
      servicesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update a service category
   */
  async updateCategory(id: string, data: UpdateCategoryDto): Promise<void> {
    const response = await apiClient.put<ApiResponse<void>>(`/services/categories/${id}`, data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update category');
    }
  }

  /**
   * Delete a service category (soft delete)
   */
  async deleteCategory(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/services/categories/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete category');
    }
  }

  // ==================== Service Organization ====================

  /**
   * Reorder services
   */
  async reorderServices(serviceIds: string[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/services/reorder', { serviceIds });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reorder services');
    }
  }

  // ==================== Staff Assignment ====================

  /**
   * Get services by staff member
   */
  async getServicesByStaff(staffId: string): Promise<ExpressService[]> {
    const response = await apiClient.get<ApiResponse<ExpressService[]>>(`/services/staff/${staffId}`);
    return response.data.data || [];
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(categoryId: string): Promise<ExpressService[]> {
    const response = await apiClient.get<ApiResponse<ExpressService[]>>(`/services/category/${categoryId}`);
    return response.data.data || [];
  }

  /**
   * Get online bookable services
   */
  async getOnlineBookableServices(branchId?: string): Promise<ExpressService[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<ExpressService[]>>(`/services/online-bookable?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Assign staff to service
   */
  async assignStaffToService(
    serviceId: string,
    staffAssignments: ServiceStaffAssignment[]
  ): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(
      `/services/${serviceId}/staff`,
      { staff: staffAssignments }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to assign staff to service');
    }
  }

  /**
   * Get service staff assignments
   */
  async getServiceStaff(serviceId: string): Promise<ServiceStaffAssignment[]> {
    const response = await apiClient.get<ApiResponse<ServiceStaffAssignment[]>>(`/services/${serviceId}/staff`);
    return response.data.data || [];
  }

  // ==================== Utility Methods ====================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/services/health');
      return response.data.success;
    } catch (error) {
      console.error('Service API health check failed:', error);
      return false;
    }
  }

  // ==================== Data Transformation Helpers ====================

  /**
   * Convert service duration from minutes to hours/minutes format
   */
  static minutesToDuration(minutes: number): ServiceDuration {
    return {
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
    };
  }

  /**
   * Convert service duration to total minutes
   */
  static durationToMinutes(duration: ServiceDuration): number {
    return (duration.hours * 60) + duration.minutes;
  }

  /**
   * Format duration for display
   */
  static formatDuration(duration: ServiceDuration): string {
    if (duration.hours === 0) {
      return `${duration.minutes}m`;
    } else if (duration.minutes === 0) {
      return `${duration.hours}h`;
    } else {
      return `${duration.hours}h ${duration.minutes}m`;
    }
  }

  /**
   * Calculate service end time based on start time and duration
   */
  static calculateEndTime(startTime: Date, duration: ServiceDuration): Date {
    const totalMinutes = this.durationToMinutes(duration);
    return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
  }
}

// Create and export singleton instance
export const serviceAPI = new ServiceAPI();
export default serviceAPI;