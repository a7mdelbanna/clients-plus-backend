import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// =========================== INTERFACES ===========================

export interface ServiceDuration {
  hours: number;
  minutes: number;
}

export interface AppointmentService {
  id: string;
  name: string;
  duration: ServiceDuration;
  price: number;
}

export interface AppointmentClient {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface AppointmentStaff {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
}

export interface ExpressAppointment {
  id: string;
  clientId: string;
  client?: AppointmentClient;
  staffId: string;
  staff?: AppointmentStaff;
  branchId?: string;
  serviceId: string;
  service?: AppointmentService;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
  appointmentType: 'WALK_IN' | 'SCHEDULED' | 'ONLINE' | 'PHONE' | 'RECURRING';
  price: number;
  duration: number; // in minutes
  notes?: string;
  internalNotes?: string;
  reminderSent?: boolean;
  followUpSent?: boolean;
  noShowCount?: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';
  paymentAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Recurring appointment fields
  isRecurring?: boolean;
  recurringGroupId?: string;
  recurringPattern?: RecurringPattern;
  recurringEndDate?: string;
  
  // Online booking fields
  bookingSource?: 'ADMIN' | 'STAFF' | 'CLIENT' | 'ONLINE' | 'API';
  confirmationCode?: string;
  clientNotes?: string;
  
  // Time-based fields
  checkedInAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface RecurringPattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number; // every X days/weeks/months/years
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly
  dayOfMonth?: number; // 1-31 for monthly
  endType: 'NEVER' | 'COUNT' | 'DATE';
  endDate?: string;
  occurrenceCount?: number;
}

export interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: ('SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED')[];
  appointmentType?: ('WALK_IN' | 'SCHEDULED' | 'ONLINE' | 'PHONE' | 'RECURRING')[];
  clientId?: string;
  staffId?: string;
  serviceId?: string;
  branchId?: string;
  paymentStatus?: ('PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED')[];
  bookingSource?: ('ADMIN' | 'STAFF' | 'CLIENT' | 'ONLINE' | 'API')[];
  search?: string;
  sortBy?: 'startTime' | 'createdAt' | 'updatedAt' | 'status' | 'totalAmount';
  sortDirection?: 'asc' | 'desc';
}

export interface AppointmentPaginationOptions {
  page?: number;
  limit?: number;
}

export interface CreateAppointmentDto {
  clientId: string;
  staffId: string;
  serviceId: string;
  branchId?: string;
  startTime: string;
  appointmentType?: 'WALK_IN' | 'SCHEDULED' | 'ONLINE' | 'PHONE' | 'RECURRING';
  notes?: string;
  internalNotes?: string;
  clientNotes?: string;
  price?: number;
  discountAmount?: number;
  
  // Recurring fields
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  
  // Auto-confirm for staff bookings
  autoConfirm?: boolean;
}

export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';
  paymentAmount?: number;
  cancellationReason?: string;
}

export interface RescheduleAppointmentDto {
  newStartTime: string;
  newStaffId?: string;
  newServiceId?: string;
  reason?: string;
  notifyClient?: boolean;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
  available: boolean;
  duration: number;
}

export interface AvailabilityRequest {
  date: string;
  serviceId: string;
  staffId?: string;
  branchId?: string;
  duration?: number;
}

export interface BulkAvailabilityRequest {
  startDate: string;
  endDate: string;
  serviceId: string;
  staffId?: string;
  branchId?: string;
}

export interface PublicBookingRequest {
  clientInfo: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone: string;
  };
  serviceId: string;
  staffId: string;
  startTime: string;
  notes?: string;
}

export interface AppointmentStats {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShows: number;
  revenue: number;
  averageTicket: number;
  utilizationRate: number;
}

export interface PaginatedAppointmentResponse {
  data: ExpressAppointment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =========================== APPOINTMENT API CLASS ===========================

export class AppointmentAPI {
  private readonly endpoint = '/appointments';

  // ==================== CRUD Operations ====================

  /**
   * Get appointments with filtering and pagination
   */
  async getAppointments(
    filters?: AppointmentFilters,
    pagination?: AppointmentPaginationOptions
  ): Promise<PaginatedAppointmentResponse> {
    try {
      const params = new URLSearchParams();

      // Add pagination parameters
      if (pagination?.page) params.set('page', pagination.page.toString());
      if (pagination?.limit) params.set('limit', pagination.limit.toString());

      // Add filter parameters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.set(key, value.toString());
            }
          }
        });
      }

      const response = await apiClient.get<ApiResponse<ExpressAppointment[]>>(
        `${this.endpoint}?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch appointments');
      }

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
    } catch (error: any) {
      console.error('Get appointments error:', error);
      throw new Error(error.message || 'Failed to fetch appointments');
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.get<ApiResponse<{ appointment: ExpressAppointment }>>(
        `${this.endpoint}/${appointmentId}`
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error('Appointment not found');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Get appointment by ID error:', error);
      throw new Error(error.message || 'Failed to fetch appointment');
    }
  }

  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData: CreateAppointmentDto): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.post<ApiResponse<{ appointment: ExpressAppointment }>>(
        this.endpoint,
        appointmentData
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error(response.data.message || 'Failed to create appointment');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Create appointment error:', error);
      
      if (error.response?.status === 409) {
        throw new Error('Time slot is not available');
      }
      
      throw new Error(error.message || 'Failed to create appointment');
    }
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(appointmentId: string, updates: UpdateAppointmentDto): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.put<ApiResponse<{ appointment: ExpressAppointment }>>(
        `${this.endpoint}/${appointmentId}`,
        updates
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error(response.data.message || 'Failed to update appointment');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Update appointment error:', error);
      throw new Error(error.message || 'Failed to update appointment');
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `${this.endpoint}/${appointmentId}/cancel`,
        { data: { reason } }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to cancel appointment');
      }
    } catch (error: any) {
      console.error('Cancel appointment error:', error);
      throw new Error(error.message || 'Failed to cancel appointment');
    }
  }

  // ==================== Status Management ====================

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(appointmentId: string, rescheduleData: RescheduleAppointmentDto): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.post<ApiResponse<{ appointment: ExpressAppointment }>>(
        `${this.endpoint}/${appointmentId}/reschedule`,
        rescheduleData
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error(response.data.message || 'Failed to reschedule appointment');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Reschedule appointment error:', error);
      throw new Error(error.message || 'Failed to reschedule appointment');
    }
  }

  /**
   * Check in an appointment
   */
  async checkInAppointment(appointmentId: string): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.post<ApiResponse<{ appointment: ExpressAppointment }>>(
        `${this.endpoint}/${appointmentId}/check-in`
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error(response.data.message || 'Failed to check in appointment');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Check in appointment error:', error);
      throw new Error(error.message || 'Failed to check in appointment');
    }
  }

  /**
   * Start an appointment
   */
  async startAppointment(appointmentId: string): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.post<ApiResponse<{ appointment: ExpressAppointment }>>(
        `${this.endpoint}/${appointmentId}/start`
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error(response.data.message || 'Failed to start appointment');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Start appointment error:', error);
      throw new Error(error.message || 'Failed to start appointment');
    }
  }

  /**
   * Complete an appointment
   */
  async completeAppointment(appointmentId: string): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.post<ApiResponse<{ appointment: ExpressAppointment }>>(
        `${this.endpoint}/${appointmentId}/complete`
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error(response.data.message || 'Failed to complete appointment');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Complete appointment error:', error);
      throw new Error(error.message || 'Failed to complete appointment');
    }
  }

  /**
   * Mark appointment as no-show
   */
  async markNoShow(appointmentId: string): Promise<ExpressAppointment> {
    try {
      const response = await apiClient.post<ApiResponse<{ appointment: ExpressAppointment }>>(
        `${this.endpoint}/${appointmentId}/no-show`
      );

      if (!response.data.success || !response.data.data?.appointment) {
        throw new Error(response.data.message || 'Failed to mark as no-show');
      }

      return response.data.data.appointment;
    } catch (error: any) {
      console.error('Mark no-show error:', error);
      throw new Error(error.message || 'Failed to mark as no-show');
    }
  }

  // ==================== Availability Management ====================

  /**
   * Get available time slots
   */
  async getAvailableSlots(availabilityRequest: AvailabilityRequest): Promise<AvailableSlot[]> {
    try {
      const params = new URLSearchParams();
      Object.entries(availabilityRequest).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.get<ApiResponse<AvailableSlot[]>>(
        `/availability/slots?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch available slots');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get available slots error:', error);
      throw new Error(error.message || 'Failed to fetch available slots');
    }
  }

  /**
   * Check if a specific slot is available
   */
  async checkSlotAvailability(
    startTime: string, 
    serviceId: string, 
    staffId: string, 
    appointmentId?: string
  ): Promise<boolean> {
    try {
      const response = await apiClient.post<ApiResponse<{ available: boolean }>>(
        '/availability/check',
        {
          startTime,
          serviceId,
          staffId,
          excludeAppointmentId: appointmentId
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to check availability');
      }

      return response.data.data?.available || false;
    } catch (error: any) {
      console.error('Check slot availability error:', error);
      return false;
    }
  }

  /**
   * Get bulk availability for calendar view
   */
  async getBulkAvailability(request: BulkAvailabilityRequest): Promise<Record<string, AvailableSlot[]>> {
    try {
      const response = await apiClient.post<ApiResponse<Record<string, AvailableSlot[]>>>(
        '/availability/bulk',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch bulk availability');
      }

      return response.data.data || {};
    } catch (error: any) {
      console.error('Get bulk availability error:', error);
      throw new Error(error.message || 'Failed to fetch bulk availability');
    }
  }

  // ==================== Public Booking ====================

  /**
   * Get public availability for a company
   */
  async getPublicAvailability(companyId: string, request: AvailabilityRequest): Promise<AvailableSlot[]> {
    try {
      const response = await apiClient.post<ApiResponse<AvailableSlot[]>>(
        `/booking/${companyId}/availability`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch availability');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get public availability error:', error);
      throw new Error(error.message || 'Failed to fetch availability');
    }
  }

  /**
   * Create a public booking
   */
  async createPublicBooking(companyId: string, bookingData: PublicBookingRequest): Promise<{ appointmentId: string; confirmationCode: string }> {
    try {
      const response = await apiClient.post<ApiResponse<{ appointmentId: string; confirmationCode: string }>>(
        `/booking/${companyId}/book`,
        bookingData
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to create booking');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Create public booking error:', error);
      throw new Error(error.message || 'Failed to create booking');
    }
  }

  /**
   * Get client bookings by phone
   */
  async getClientBookings(companyId: string, phone: string): Promise<ExpressAppointment[]> {
    try {
      const params = new URLSearchParams();
      params.set('phone', phone);

      const response = await apiClient.get<ApiResponse<ExpressAppointment[]>>(
        `/booking/${companyId}/my-bookings?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch bookings');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get client bookings error:', error);
      throw new Error(error.message || 'Failed to fetch bookings');
    }
  }

  /**
   * Cancel a public booking
   */
  async cancelPublicBooking(appointmentId: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `/booking/cancel/${appointmentId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      console.error('Cancel public booking error:', error);
      throw new Error(error.message || 'Failed to cancel booking');
    }
  }

  // ==================== Statistics and Analytics ====================

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(branchId?: string, startDate?: string, endDate?: string): Promise<AppointmentStats> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await apiClient.get<ApiResponse<AppointmentStats>>(
        `${this.endpoint}/stats?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch statistics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get appointment stats error:', error);
      throw new Error(error.message || 'Failed to fetch appointment statistics');
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/health`);
      return response.data.success;
    } catch (error) {
      console.error('Appointment API health check failed:', error);
      return false;
    }
  }

  /**
   * Calculate appointment duration in minutes
   */
  static calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Format duration for display
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  /**
   * Check if appointment can be cancelled
   */
  static canCancel(appointment: ExpressAppointment): boolean {
    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilStart > 2 && 
           !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status);
  }

  /**
   * Check if appointment can be rescheduled
   */
  static canReschedule(appointment: ExpressAppointment): boolean {
    return !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status);
  }
}

// Create and export singleton instance
export const appointmentAPI = new AppointmentAPI();
export default appointmentAPI;