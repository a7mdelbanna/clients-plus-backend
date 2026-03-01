import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Booking Link Types
export type BookingLinkType = 'company' | 'general' | 'employee';
export type BookingFlow = 'stepByStep' | 'shortStep' | 'menu';
export type GroupEventsDisplay = 'allOnPage' | 'byDays';
export type MapType = 'google' | 'osm';

export interface BookingLinkSettings {
  defaultLanguage: string;
  mapType: MapType;
  chain?: string;
  bookingFlow: BookingFlow;
  stepsOrder: string[];
  theme: 'light' | 'dark';
  primaryColor: string;
  coverImage?: string;
  logoUrl?: string;
  allowMultipleBookings: boolean;
  maxBookingsPerSession: number;
  showGroupEvents: boolean;
  groupEventsDisplay: GroupEventsDisplay;
  serviceDisplay: 'horizontal' | 'vertical';
  showServiceCategories: boolean;
  showServicePrices: boolean;
  showServiceDuration: boolean;
  showEmployeePhotos: boolean;
  showEmployeeRatings: boolean;
  allowAnyEmployee: boolean;
  timeSlotInterval: number;
  showMorningSlots: boolean;
  showAfternoonSlots: boolean;
  showEveningSlots: boolean;
}

export interface BookingLinkAnalytics {
  views: number;
  uniqueViews: number;
  bookings: number;
  conversionRate: number;
  lastViewedAt?: string;
  viewsByDate: Record<string, number>;
  bookingsByDate: Record<string, number>;
}

export interface BookingLinkBranchSettings {
  mode: 'single' | 'multi';
  allowedBranches: string[];
  defaultBranch?: string;
}

export interface BookingLink {
  id?: string;
  companyId: string;
  branchId?: string;
  name: string;
  slug: string;
  type: BookingLinkType;
  employeeId?: string;
  serviceId?: string;
  description?: string;
  isMain: boolean;
  isActive: boolean;
  branchSettings?: BookingLinkBranchSettings;
  fullUrl?: string;
  shortUrl?: string;
  settings: BookingLinkSettings;
  analytics: BookingLinkAnalytics;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

class BookingLinkService {
  private readonly endpoint = '/booking-links';

  // Create a new booking link
  async createBookingLink(
    companyId: string,
    linkData: Omit<BookingLink, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'analytics'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.endpoint, linkData);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create booking link');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating booking link:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create booking link');
    }
  }

  // Get all booking links for a company
  async getCompanyBookingLinks(companyId: string, branchId?: string): Promise<BookingLink[]> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<BookingLink[]>>(this.endpoint, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting booking links:', error);
      throw error;
    }
  }

  // Get a single booking link by ID
  async getBookingLink(linkId: string): Promise<BookingLink | null> {
    try {
      const response = await apiClient.get<ApiResponse<BookingLink>>(`${this.endpoint}/${linkId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting booking link:', error);
      throw error;
    }
  }

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

  // Update a booking link
  async updateBookingLink(linkId: string, updates: Partial<BookingLink>): Promise<void> {
    try {
      const { id, ...updateData } = updates;
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${linkId}`, updateData);
    } catch (error: any) {
      console.error('Error updating booking link:', error);
      throw error;
    }
  }

  // Delete a booking link
  async deleteBookingLink(linkId: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${linkId}`);
    } catch (error: any) {
      console.error('Error deleting booking link:', error);
      throw error;
    }
  }

  // Toggle link active status
  async toggleLinkStatus(linkId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${linkId}/toggle`);
    } catch (error: any) {
      console.error('Error toggling link status:', error);
      throw error;
    }
  }

  // Generate unique slug within company
  async generateUniqueSlug(companyId: string, baseName: string): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ slug: string }>>(
        `${this.endpoint}/generate-slug`,
        { baseName }
      );
      return response.data.data!.slug;
    } catch (error) {
      // Fallback: generate client-side
      let slug = baseName.toLowerCase()
        .replace(/[أ-ي]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (slug.length < 3) slug = `link-${slug || 'new'}`;
      return slug;
    }
  }

  // Track link view (for analytics)
  async trackLinkView(linkId: string, uniqueView: boolean = false): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${linkId}/view`, { uniqueView });
    } catch (error) {
      console.error('Error tracking link view:', error);
    }
  }

  // Track booking (for analytics)
  async trackBooking(linkId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${linkId}/booking`);
    } catch (error) {
      console.error('Error tracking booking:', error);
    }
  }

  // Subscribe to real-time updates for company booking links (polling)
  subscribeToBookingLinks(
    companyId: string,
    callback: (links: BookingLink[]) => void,
    branchId?: string
  ): () => void {
    this.getCompanyBookingLinks(companyId, branchId)
      .then(callback)
      .catch(error => console.error('Error in booking links subscription:', error));

    const interval = setInterval(() => {
      this.getCompanyBookingLinks(companyId, branchId)
        .then(callback)
        .catch(error => console.error('Error in booking links subscription:', error));
    }, 30000);

    return () => clearInterval(interval);
  }

  // Get default settings for a new booking link
  getDefaultSettings(): BookingLinkSettings {
    return {
      defaultLanguage: 'ar',
      mapType: 'google',
      bookingFlow: 'stepByStep',
      stepsOrder: ['service', 'employee', 'datetime'],
      theme: 'light',
      primaryColor: '#FF6B00',
      allowMultipleBookings: false,
      maxBookingsPerSession: 1,
      showGroupEvents: false,
      groupEventsDisplay: 'allOnPage',
      serviceDisplay: 'vertical',
      showServiceCategories: true,
      showServicePrices: true,
      showServiceDuration: true,
      showEmployeePhotos: true,
      showEmployeeRatings: false,
      allowAnyEmployee: true,
      timeSlotInterval: 30,
      showMorningSlots: true,
      showAfternoonSlots: true,
      showEveningSlots: true,
    };
  }
}

export const bookingLinkService = new BookingLinkService();
