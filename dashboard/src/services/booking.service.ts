import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type { BookingLink } from './bookingLink.service';

export interface Branch {
  id: string;
  name: string;
  type: 'main' | 'branch';
  status: 'active' | 'inactive';
  address?: string;
  phone?: string;
  email?: string;
  operatingHours?: Record<string, any>;
  onlineBooking?: {
    enabled: boolean;
    autoConfirm: boolean;
  };
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  companyId: string;
  branchIds?: string[];
  duration: {
    hours: number;
    minutes: number;
  };
  startingPrice: number;
  active: boolean;
  onlineBooking?: {
    enabled: boolean;
    displayName?: string;
  };
}

export interface Staff {
  id: string;
  name: string;
  companyId: string;
  branchIds?: string[];
  services: string[];
  active: boolean;
  status: 'active' | 'inactive';
  onlineBooking?: {
    enabled: boolean;
  };
  schedule?: {
    workingHours?: Record<string, any>;
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
}

export interface Appointment {
  id?: string;
  companyId: string;
  branchId?: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  services: any[];
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalPrice: number;
  status: string;
  source: string;
  bookingLinkId?: string;
  createdAt?: string;
  updatedAt?: string;
}

class BookingService {
  // Get public booking link by company and link slugs
  async getPublicBookingLink(companySlug: string, linkSlug: string): Promise<BookingLink | null> {
    try {
      const response = await apiClient.get<ApiResponse<BookingLink>>(
        `/public/booking/${companySlug}/${linkSlug}`
      );
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting public booking link:', error);
      throw error;
    }
  }

  // Track link view
  async trackLinkView(linkId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`/public/booking/${linkId}/view`);
    } catch (error) {
      console.error('Error tracking link view:', error);
      // Don't throw - tracking shouldn't break the app
    }
  }

  // Get branches for booking
  async getBranchesForBooking(companyId: string, branchIds?: string[]): Promise<Branch[]> {
    try {
      const params: any = { status: 'active' };
      if (branchIds && branchIds.length > 0) {
        params.branchIds = branchIds.join(',');
      }

      const response = await apiClient.get<ApiResponse<Branch[]>>(
        `/public/booking/${companyId}/branches`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting branches:', error);
      throw error;
    }
  }

  // Get services for booking
  async getServicesForBooking(companyId: string, branchId: string): Promise<Service[]> {
    try {
      const response = await apiClient.get<ApiResponse<Service[]>>(
        `/public/booking/${companyId}/services`,
        { params: { branchId } }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  }

  // Get staff for booking
  async getStaffForBooking(companyId: string, branchId: string, serviceId?: string): Promise<Staff[]> {
    try {
      const params: any = { branchId };
      if (serviceId) params.serviceId = serviceId;

      const response = await apiClient.get<ApiResponse<Staff[]>>(
        `/public/booking/${companyId}/staff`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting staff:', error);
      throw error;
    }
  }

  // Create appointment
  async createAppointment(appointmentData: Partial<Appointment>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `/public/booking/${appointmentData.companyId}/appointments`,
        {
          branchId: appointmentData.branchId,
          clientName: appointmentData.clientName,
          clientPhone: appointmentData.clientPhone,
          clientEmail: appointmentData.clientEmail,
          services: appointmentData.services,
          staffId: appointmentData.staffId,
          staffName: appointmentData.staffName,
          date: appointmentData.date,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          duration: appointmentData.duration,
          totalPrice: appointmentData.totalPrice,
          bookingLinkId: appointmentData.bookingLinkId,
          source: 'online',
        }
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create appointment');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create appointment');
    }
  }
}

export const bookingService = new BookingService();
