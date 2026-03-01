import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Appointment Types
export type AppointmentStatus = 'pending' | 'confirmed' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
export type AppointmentSource = 'dashboard' | 'online' | 'phone' | 'walk_in';
export type PaymentStatus = 'none' | 'partial' | 'full' | 'refunded';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface AppointmentService {
  serviceId: string;
  serviceName: string;
  duration: number;
  price: number;
  staffId?: string;
}

export interface AppointmentResource {
  resourceId: string;
  resourceName: string;
  resourceType: 'chair' | 'room' | 'equipment';
}

export interface AppointmentNotification {
  type: 'confirmation' | 'reminder' | 'follow_up';
  method: ('whatsapp' | 'sms' | 'email' | 'push')[];
  timing?: number;
  sent: boolean;
  sentAt?: string;
}

export interface AppointmentRepeat {
  type: RepeatType;
  interval: number;
  endDate?: string;
  maxOccurrences?: number;
  excludeDates?: string[];
}

export interface Appointment {
  id?: string;
  companyId: string;
  branchId?: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  isNewClient?: boolean;
  services: AppointmentService[];
  categoryId?: string;
  totalDuration: number;
  totalPrice: number;
  staffId: string;
  staffName: string;
  date: string | any;
  startTime: string;
  endTime: string;
  resources?: AppointmentResource[];
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  prepaidAmount?: number;
  notes?: string;
  internalNotes?: string;
  color?: string;
  source: AppointmentSource;
  bookingLinkId?: string;
  cancelledBy?: 'client' | 'staff' | 'system';
  cancelledAt?: string | any;
  cancellationReason?: string;
  rescheduledTo?: string;
  rescheduledAt?: string | any;
  notifications?: AppointmentNotification[];
  repeat?: AppointmentRepeat;
  parentAppointmentId?: string;
  checkedInAt?: string | any;
  startedAt?: string | any;
  completedAt?: string | any;
  actualDuration?: number;
  rating?: number;
  feedback?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
  createdBy?: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus | AppointmentStatus[];
  staffId?: string;
  clientId?: string;
  branchId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  source?: AppointmentSource;
  search?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  staffId: string;
  clientName: string;
  color?: string;
  appointment: Appointment;
}

export interface AppointmentConflict {
  appointmentId: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  conflictType: 'overlap' | 'double_booking' | 'outside_hours';
}

class AppointmentServiceClass {
  private readonly endpoint = '/appointments';

  async createAppointment(
    appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string; appointment: Appointment }>>(
        this.endpoint, appointment
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create appointment');
      return response.data.data!.id || response.data.data!.appointment?.id || '';
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create appointment');
    }
  }

  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<void> {
    try {
      const response = await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${appointmentId}`, updates);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to update appointment');
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update appointment');
    }
  }

  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    try {
      const response = await apiClient.get<ApiResponse<Appointment>>(`${this.endpoint}/${appointmentId}`);
      if (!response.data.success) return null;
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getAppointments(
    companyId: string,
    filters?: AppointmentFilters,
    page?: number,
    pageSize?: number
  ): Promise<Appointment[]> {
    try {
      const params: any = {};
      if (filters?.status) {
        params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
      }
      if (filters?.staffId) params.staffId = filters.staffId;
      if (filters?.clientId) params.clientId = filters.clientId;
      if (filters?.branchId) params.branchId = filters.branchId;
      if (filters?.startDate) params.startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
      if (filters?.source) params.source = filters.source;
      if (filters?.search) params.search = filters.search;
      if (page) params.page = page;
      if (pageSize) params.limit = pageSize;

      const response = await apiClient.get<ApiResponse<Appointment[]>>(this.endpoint, { params });
      if (!response.data.success) return [];
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error getting appointments:', error);
      return [];
    }
  }

  async cancelAppointment(
    appointmentId: string,
    cancelledBy: 'client' | 'staff' | 'system',
    reason?: string
  ): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${appointmentId}`, {
        data: { cancelledBy, reason },
      });
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to cancel appointment');
    }
  }

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    staffId?: string
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${appointmentId}/reschedule`,
        { date: newDate, startTime: newStartTime, endTime: newEndTime, staffId }
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to reschedule');
      return response.data.data?.id || appointmentId;
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to reschedule appointment');
    }
  }

  async confirmAppointment(appointmentId: string): Promise<void> {
    await apiClient.post(`${this.endpoint}/${appointmentId}/confirm`);
  }

  async checkInAppointment(appointmentId: string): Promise<void> {
    await apiClient.post(`${this.endpoint}/${appointmentId}/check-in`);
  }

  async startAppointment(appointmentId: string): Promise<void> {
    await apiClient.post(`${this.endpoint}/${appointmentId}/start`);
  }

  async completeAppointment(appointmentId: string, actualDuration?: number): Promise<void> {
    await apiClient.post(`${this.endpoint}/${appointmentId}/complete`, { actualDuration });
  }

  async markNoShow(appointmentId: string): Promise<void> {
    await apiClient.post(`${this.endpoint}/${appointmentId}/no-show`);
  }

  async updateNotes(appointmentId: string, notes: string, internalNotes?: string): Promise<void> {
    await apiClient.put(`${this.endpoint}/${appointmentId}/notes`, { notes, internalNotes });
  }

  // Calendar & Availability
  async getCalendarAppointments(
    companyId: string,
    startDate: Date,
    endDate: Date,
    staffId?: string,
    branchId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const params: any = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      if (staffId) params.staffId = staffId;
      if (branchId) params.branchId = branchId;

      const response = await apiClient.get<ApiResponse<any[]>>(`${this.endpoint}/calendar`, { params });
      if (!response.data.success) return [];

      return (response.data.data || []).map(event => ({
        id: event.id,
        title: `${event.clientName} - ${event.services?.[0]?.serviceName || ''}`,
        start: new Date(event.startTime || event.date),
        end: new Date(event.endTime || event.date),
        status: event.status,
        staffId: event.staffId,
        clientName: event.clientName,
        color: event.color,
        appointment: event,
      }));
    } catch (error) {
      console.error('Error getting calendar appointments:', error);
      return [];
    }
  }

  async getAvailableSlots(
    companyId: string,
    date: string,
    serviceId: string,
    staffId?: string,
    branchId?: string,
    duration?: number
  ): Promise<TimeSlot[]> {
    try {
      const params: any = { date, serviceId };
      if (staffId) params.staffId = staffId;
      if (branchId) params.branchId = branchId;
      if (duration) params.duration = duration;

      const response = await apiClient.get<ApiResponse<TimeSlot[]>>(`${this.endpoint}/availability`, { params });
      if (!response.data.success) return [];
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  async checkSlotAvailability(
    companyId: string,
    date: string,
    startTime: string,
    endTime: string,
    staffId: string,
    branchId?: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      const response = await apiClient.post<ApiResponse<{ available: boolean }>>(
        `${this.endpoint}/availability/check`,
        { date, startTime, endTime, staffId, branchId, excludeAppointmentId }
      );
      return response.data.data?.available ?? false;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  // Conflicts & Analytics
  async getConflicts(companyId: string, branchId?: string): Promise<AppointmentConflict[]> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<AppointmentConflict[]>>(`${this.endpoint}/conflicts`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting conflicts:', error);
      return [];
    }
  }

  async getAnalytics(companyId: string, startDate?: Date, endDate?: Date, branchId?: string): Promise<any> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/analytics`, { params });
      return response.data.data || {};
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {};
    }
  }

  async getClientAppointmentHistory(clientId: string): Promise<Appointment[]> {
    try {
      const response = await apiClient.get<ApiResponse<Appointment[]>>(
        `${this.endpoint}/clients/${clientId}/history`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting client history:', error);
      return [];
    }
  }

  async getStaffSchedule(staffId: string, date?: string): Promise<Appointment[]> {
    try {
      const params: any = {};
      if (date) params.date = date;
      const response = await apiClient.get<ApiResponse<Appointment[]>>(
        `${this.endpoint}/staff/${staffId}/schedule`, { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting staff schedule:', error);
      return [];
    }
  }

  async getNoShowStatistics(companyId: string): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/statistics/no-shows`);
      return response.data.data || {};
    } catch (error) {
      console.error('Error getting no-show statistics:', error);
      return {};
    }
  }

  // Bulk operations
  async bulkCreateAppointments(appointments: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    try {
      const response = await apiClient.post<ApiResponse<{ ids: string[] }>>(`${this.endpoint}/bulk`, {
        operation: 'create',
        appointments,
      });
      return response.data.data?.ids || [];
    } catch (error: any) {
      console.error('Error bulk creating appointments:', error);
      throw new Error(error.response?.data?.message || error.message || 'Bulk create failed');
    }
  }

  // Real-time replacement with polling
  subscribeToAppointments(
    companyId: string,
    callback: (appointments: Appointment[]) => void,
    filters?: AppointmentFilters,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Initial fetch
    this.getAppointments(companyId, filters)
      .then(callback)
      .catch((error) => {
        if (errorCallback) errorCallback(error);
      });

    // Poll every 10 seconds for appointment data (high frequency)
    const interval = setInterval(() => {
      this.getAppointments(companyId, filters)
        .then(callback)
        .catch((error) => {
          if (errorCallback) errorCallback(error);
        });
    }, 10000);

    return () => clearInterval(interval);
  }
}

export const appointmentService = new AppointmentServiceClass();
