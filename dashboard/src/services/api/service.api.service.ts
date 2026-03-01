import apiClient from '../../config/api';

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ======================= ENUMS =======================

export enum ServiceType {
  STANDARD = 'STANDARD',
  PACKAGE = 'PACKAGE',
  ADDON = 'ADDON',
  CONSULTATION = 'CONSULTATION',
  TREATMENT = 'TREATMENT',
  PRODUCT = 'PRODUCT'
}

export enum ServiceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED'
}

export enum PriceType {
  FIXED = 'FIXED',
  HOURLY = 'HOURLY',
  CUSTOM = 'CUSTOM'
}

// ======================= INTERFACES =======================

export interface ServiceDuration {
  hours: number;
  minutes: number;
}

export interface ServiceTranslation {
  language: string; // 'en', 'ar', 'fr', etc.
  name: string;
  description?: string;
}

export interface ServiceImage {
  id?: string;
  url: string;
  alt?: string;
  isDefault: boolean;
  order: number;
  uploadedAt?: string;
}

export interface OnlineBookingSettings {
  enabled: boolean;
  displayName?: string;
  description?: string;
  translations?: ServiceTranslation[];
  requiresApproval?: boolean;
  prepaymentRequired?: boolean;
  membershipRequired?: boolean;
  advanceBookingDays?: number;
  cancellationPolicy?: string;
  availabilityPeriod?: number; // days
}

export interface ServiceStaffAssignment {
  id?: string;
  staffId: string;
  staffName?: string;
  price?: number;
  duration?: ServiceDuration;
  commissionRate?: number;
  billOfMaterials?: string;
  assignedAt?: string;
  active?: boolean;
}

export interface ServicePricing {
  type: PriceType;
  startingPrice: number;
  priceRange?: {
    min: number;
    max: number;
  };
  hourlyRate?: number;
  customPricing?: {
    staffId: string;
    price: number;
  }[];
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
  branchId?: string;
  servicesCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ExpressService {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  categoryId?: string;
  category?: ServiceCategory;
  type: ServiceType;
  status: ServiceStatus;
  
  // Pricing
  pricing: ServicePricing;
  
  // Duration
  duration: ServiceDuration;
  
  // Online booking
  onlineBooking: OnlineBookingSettings;
  
  // Images
  images?: ServiceImage[];
  
  // Organization
  order: number;
  color?: string;
  
  // Branch assignment
  branchId?: string; // Deprecated - use branchIds
  branchIds?: string[];
  
  // Advanced settings
  invoiceName?: string;
  taxSystem?: string;
  vat?: number;
  followUpDays?: number;
  autoDeduction?: boolean;
  
  // API integration
  apiId?: string;
  
  // System fields
  companyId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Relations
  staff?: ServiceStaffAssignment[];
  translations?: ServiceTranslation[];
}

export interface ServicePackage {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  companyId: string;
  services: string[]; // service IDs
  totalPrice: number;
  discount?: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
  active: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ServiceFilters {
  categoryId?: string;
  branchId?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  active?: boolean;
  onlineBookingOnly?: boolean;
  searchTerm?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  staffId?: string;
  hasImages?: boolean;
  sortBy?: 'name' | 'price' | 'duration' | 'createdAt' | 'order' | 'category';
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
  status?: ServiceStatus;
  pricing: Omit<ServicePricing, 'customPricing'>;
  duration: ServiceDuration;
  onlineBooking?: Partial<OnlineBookingSettings>;
  color?: string;
  branchIds?: string[];
  invoiceName?: string;
  taxSystem?: string;
  vat?: number;
  followUpDays?: number;
  autoDeduction?: boolean;
  apiId?: string;
  active?: boolean;
  order?: number;
  translations?: ServiceTranslation[];
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
  branchId?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface BulkImportServiceDto {
  services: CreateServiceDto[];
  categoryMapping?: { [key: string]: string }; // Original category name -> category ID
  defaultCategoryId?: string;
  updateExisting?: boolean;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    service: string;
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

// ======================= SERVICE API CLASS =======================

export class ServiceApiService {
  
  // ==================== Service CRUD Operations ====================
  
  /**
   * Get all services with filtering and pagination
   */
  async getServices(
    filters?: ServiceFilters,
    pagination?: ServicePaginationOptions
  ): Promise<PaginatedResponse<ExpressService>> {
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    
    // Add filter parameters
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.onlineBookingOnly !== undefined) params.append('onlineBookingOnly', filters.onlineBookingOnly.toString());
    if (filters?.searchTerm) params.append('search', filters.searchTerm);
    if (filters?.priceRange?.min !== undefined) params.append('minPrice', filters.priceRange.min.toString());
    if (filters?.priceRange?.max !== undefined) params.append('maxPrice', filters.priceRange.max.toString());
    if (filters?.staffId) params.append('staffId', filters.staffId);
    if (filters?.hasImages !== undefined) params.append('hasImages', filters.hasImages.toString());
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
   * Get a single service by ID with full details
   */
  async getServiceById(id: string, includeStaff = true): Promise<ExpressService> {
    const params = new URLSearchParams();
    if (includeStaff) params.append('includeStaff', 'true');

    const response = await apiClient.get<ApiResponse<ExpressService>>(`/services/${id}?${params.toString()}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Service not found');
    }
    
    return response.data.data;
  }

  /**
   * Create a new service
   */
  async createService(data: CreateServiceDto): Promise<ExpressService> {
    const response = await apiClient.post<ApiResponse<ExpressService>>('/services', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create service');
    }
    
    return response.data.data;
  }

  /**
   * Update an existing service
   */
  async updateService(id: string, data: UpdateServiceDto): Promise<ExpressService> {
    const response = await apiClient.put<ApiResponse<ExpressService>>(`/services/${id}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update service');
    }
    
    return response.data.data;
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
   * Duplicate a service
   */
  async duplicateService(id: string, newName?: string): Promise<ExpressService> {
    const response = await apiClient.post<ApiResponse<ExpressService>>(`/services/${id}/duplicate`, {
      name: newName
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to duplicate service');
    }
    
    return response.data.data;
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
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<ServiceCategory> {
    const response = await apiClient.get<ApiResponse<ServiceCategory>>(`/services/categories/${id}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Category not found');
    }
    
    return response.data.data;
  }

  /**
   * Create a new service category
   */
  async createCategory(data: CreateCategoryDto): Promise<ServiceCategory> {
    const response = await apiClient.post<ApiResponse<ServiceCategory>>('/services/categories', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create category');
    }
    
    return response.data.data;
  }

  /**
   * Update a service category
   */
  async updateCategory(id: string, data: UpdateCategoryDto): Promise<ServiceCategory> {
    const response = await apiClient.put<ApiResponse<ServiceCategory>>(`/services/categories/${id}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update category');
    }
    
    return response.data.data;
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

  /**
   * Reorder categories
   */
  async reorderCategories(categoryOrders: { categoryId: string; order: number }[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/services/categories/reorder', { 
      categories: categoryOrders 
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reorder categories');
    }
  }

  // ==================== Staff Assignment ====================

  /**
   * Assign staff to service
   */
  async assignStaffToService(
    serviceId: string,
    staffAssignments: Omit<ServiceStaffAssignment, 'id' | 'assignedAt'>[]
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

  /**
   * Update staff assignment for service
   */
  async updateServiceStaff(
    serviceId: string,
    staffId: string,
    updates: Partial<ServiceStaffAssignment>
  ): Promise<void> {
    const response = await apiClient.put<ApiResponse<void>>(
      `/services/${serviceId}/staff/${staffId}`,
      updates
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update staff assignment');
    }
  }

  /**
   * Remove staff from service
   */
  async removeStaffFromService(serviceId: string, staffId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/services/${serviceId}/staff/${staffId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to remove staff from service');
    }
  }

  // ==================== Images Management ====================

  /**
   * Upload service image
   */
  async uploadServiceImage(serviceId: string, file: File, isDefault = false): Promise<ServiceImage> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('isDefault', isDefault.toString());

    const response = await apiClient.post<ApiResponse<ServiceImage>>(
      `/services/${serviceId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to upload image');
    }
    
    return response.data.data;
  }

  /**
   * Get service images
   */
  async getServiceImages(serviceId: string): Promise<ServiceImage[]> {
    const response = await apiClient.get<ApiResponse<ServiceImage[]>>(`/services/${serviceId}/images`);
    return response.data.data || [];
  }

  /**
   * Update image details
   */
  async updateServiceImage(
    serviceId: string,
    imageId: string,
    updates: Partial<ServiceImage>
  ): Promise<ServiceImage> {
    const response = await apiClient.put<ApiResponse<ServiceImage>>(
      `/services/${serviceId}/images/${imageId}`,
      updates
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update image');
    }
    
    return response.data.data;
  }

  /**
   * Delete service image
   */
  async deleteServiceImage(serviceId: string, imageId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/services/${serviceId}/images/${imageId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete image');
    }
  }

  /**
   * Set default image
   */
  async setDefaultImage(serviceId: string, imageId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/services/${serviceId}/images/${imageId}/set-default`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to set default image');
    }
  }

  // ==================== Pricing Matrix ====================

  /**
   * Get pricing matrix for service (staff-specific pricing)
   */
  async getPricingMatrix(serviceId: string): Promise<{ staffId: string; price: number; staffName?: string }[]> {
    const response = await apiClient.get<ApiResponse<{ staffId: string; price: number; staffName?: string }[]>>(
      `/services/${serviceId}/pricing`
    );
    return response.data.data || [];
  }

  /**
   * Update pricing matrix
   */
  async updatePricingMatrix(
    serviceId: string,
    pricing: { staffId: string; price: number }[]
  ): Promise<void> {
    const response = await apiClient.put<ApiResponse<void>>(
      `/services/${serviceId}/pricing`,
      { pricing }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update pricing matrix');
    }
  }

  // ==================== Bulk Operations ====================

  /**
   * Bulk import services
   */
  async bulkImportServices(data: BulkImportServiceDto): Promise<ImportResult> {
    const response = await apiClient.post<ApiResponse<ImportResult>>('/services/bulk-import', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Bulk import failed');
    }
    
    return response.data.data;
  }

  /**
   * Export services to CSV/Excel
   */
  async exportServices(
    format: 'csv' | 'excel' = 'csv',
    filters?: ServiceFilters
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.active !== undefined) params.append('active', filters.active.toString());

    const response = await apiClient.get(`/services/export?${params.toString()}`, {
      responseType: 'blob',
    });
    
    return response.data;
  }

  /**
   * Bulk update services
   */
  async bulkUpdateServices(
    serviceIds: string[],
    updates: Partial<UpdateServiceDto>
  ): Promise<{ updated: number; failed: number; errors: any[] }> {
    const response = await apiClient.put<ApiResponse<{ updated: number; failed: number; errors: any[] }>>(
      '/services/bulk-update',
      {
        serviceIds,
        updates,
      }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Bulk update failed');
    }
    
    return response.data.data;
  }

  /**
   * Bulk delete services
   */
  async bulkDeleteServices(serviceIds: string[]): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>('/services/bulk-delete', {
      data: { serviceIds },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Bulk delete failed');
    }
  }

  // ==================== Service Organization ====================

  /**
   * Reorder services
   */
  async reorderServices(serviceOrders: { serviceId: string; order: number }[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/services/reorder', { 
      services: serviceOrders 
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reorder services');
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get all services without pagination (for autocomplete/dropdowns)
   */
  async getAllServices(filters?: Partial<ServiceFilters>): Promise<ExpressService[]> {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.onlineBookingOnly !== undefined) params.append('onlineBookingOnly', filters.onlineBookingOnly.toString());

    const response = await apiClient.get<ApiResponse<ExpressService[]>>(`/services/all?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Search services
   */
  async searchServices(
    searchTerm: string,
    filters?: Omit<ServiceFilters, 'searchTerm'>,
    pagination?: ServicePaginationOptions
  ): Promise<PaginatedResponse<ExpressService>> {
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

  // ==================== Static Helper Methods ====================

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
  static formatDuration(duration: ServiceDuration, language = 'ar'): string {
    const hoursLabel = language === 'ar' ? 'س' : 'h';
    const minutesLabel = language === 'ar' ? 'د' : 'm';
    
    if (duration.hours === 0) {
      return `${duration.minutes}${minutesLabel}`;
    } else if (duration.minutes === 0) {
      return `${duration.hours}${hoursLabel}`;
    } else {
      return `${duration.hours}${hoursLabel} ${duration.minutes}${minutesLabel}`;
    }
  }

  /**
   * Get service name in preferred language
   */
  static getServiceName(service: ExpressService, language = 'ar'): string {
    if (language === 'ar' && service.nameAr) {
      return service.nameAr;
    }
    
    if (service.translations && service.translations.length > 0) {
      const translation = service.translations.find(t => t.language === language);
      if (translation) {
        return translation.name;
      }
    }
    
    return service.name;
  }

  /**
   * Get service description in preferred language
   */
  static getServiceDescription(service: ExpressService, language = 'ar'): string | undefined {
    if (language === 'ar' && service.descriptionAr) {
      return service.descriptionAr;
    }
    
    if (service.translations && service.translations.length > 0) {
      const translation = service.translations.find(t => t.language === language);
      if (translation && translation.description) {
        return translation.description;
      }
    }
    
    return service.description;
  }

  /**
   * Calculate service end time
   */
  static calculateEndTime(startTime: Date, duration: ServiceDuration): Date {
    const totalMinutes = this.durationToMinutes(duration);
    return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
  }

  /**
   * Format price display
   */
  static formatPrice(price: number, currency = 'SAR'): string {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }

  /**
   * Generate service color based on category
   */
  static generateServiceColor(categoryName?: string): string {
    if (!categoryName) return '#3B82F6'; // Default blue
    
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
      '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
      '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
      '#EC4899', '#F43F5E'
    ];
    
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}

// Create and export singleton instance
export const serviceApiService = new ServiceApiService();
export default serviceApiService;

// Export types for use in other files
export type {
  ExpressService,
  ServiceCategory,
  ServiceFilters,
  ServicePaginationOptions,
  CreateServiceDto,
  UpdateServiceDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ServiceStaffAssignment,
  ServiceImage,
  BulkImportServiceDto,
  ImportResult,
  PaginatedResponse,
};