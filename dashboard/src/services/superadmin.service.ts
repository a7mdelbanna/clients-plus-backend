import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Business status
export type BusinessStatus = 'active' | 'suspended' | 'pending' | 'cancelled';

// Company subscription info
export interface CompanySubscription {
  companyId: string;
  planId: string;
  status: BusinessStatus;
  pricing: {
    amount: number;
    currency: 'EGP';
    billingCycle: 'monthly' | 'yearly';
  };
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Business summary for list view
export interface BusinessSummary {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  plan: string;
  status: BusinessStatus;
  monthlyRevenue: number;
  totalUsers: number;
  totalBranches: number;
  createdAt: string;
  lastActivity?: string;
  subscription?: CompanySubscription;
}

// Detailed business info
export interface BusinessDetail extends BusinessSummary {
  ownerId: string;
  ownerName: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    country: string;
  };
  settings?: any;
  usage: {
    appointments: number;
    clients: number;
    staff: number;
    services: number;
    storage: number;
  };
  billing: {
    lastPayment?: string;
    nextPayment?: string;
    paymentMethod?: string;
    currency: 'EGP';
  };
}

// Analytics data
export interface PlatformAnalytics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  averageRevenuePerUser: number;
  churnRate: number;
  growthRate: number;
  planDistribution: Array<{
    plan: string;
    count: number;
    percentage: number;
  }>;
  revenueByPlan: Array<{
    plan: string;
    revenue: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    businesses: number;
    newBusinesses: number;
  }>;
}

// Search filters
export interface BusinessFilters {
  status?: BusinessStatus;
  plan?: string;
  searchTerm?: string;
  minRevenue?: number;
  maxRevenue?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  hasOverride?: boolean;
}

class SuperadminService {
  private readonly endpoint = '/superadmin';

  // Debug helper
  async debugSuperadminStatus(): Promise<void> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/debug`);
      console.log('Superadmin status:', response.data.data);
    } catch (error) {
      console.error('Debug test failed:', error);
    }
  }

  // Get paginated list of businesses
  async getBusinesses(
    filters: BusinessFilters = {},
    pageSize = 20,
    _lastDoc?: any
  ): Promise<{
    businesses: BusinessSummary[];
    lastDoc: any;
    hasMore: boolean;
  }> {
    try {
      const params: any = { limit: pageSize };
      if (filters.status) params.status = filters.status;
      if (filters.plan) params.plan = filters.plan;
      if (filters.searchTerm) params.search = filters.searchTerm;
      if (filters.minRevenue) params.minRevenue = filters.minRevenue;
      if (filters.maxRevenue) params.maxRevenue = filters.maxRevenue;
      if (filters.createdAfter) params.createdAfter = filters.createdAfter.toISOString();
      if (filters.createdBefore) params.createdBefore = filters.createdBefore.toISOString();
      if (filters.hasOverride !== undefined) params.hasOverride = filters.hasOverride;

      const response = await apiClient.get<ApiResponse<{
        businesses: BusinessSummary[];
        hasMore: boolean;
      }>>(`${this.endpoint}/businesses`, { params });

      return {
        businesses: response.data.data?.businesses || [],
        lastDoc: null,
        hasMore: response.data.data?.hasMore || false,
      };
    } catch (error) {
      console.error('Error getting businesses:', error);
      throw error;
    }
  }

  // Get detailed business information
  async getBusinessDetail(businessId: string): Promise<BusinessDetail | null> {
    try {
      const response = await apiClient.get<ApiResponse<BusinessDetail>>(
        `${this.endpoint}/businesses/${businessId}`
      );
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting business detail:', error);
      throw error;
    }
  }

  // Update business status
  async updateBusinessStatus(
    businessId: string,
    status: BusinessStatus,
    reason?: string
  ): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(
        `${this.endpoint}/businesses/${businessId}/status`,
        { status, reason }
      );
    } catch (error: any) {
      console.error('Error updating business status:', error);
      throw error;
    }
  }

  // Activate or deactivate a business
  async toggleBusinessActivation(
    businessId: string,
    activate: boolean,
    reason?: string
  ): Promise<void> {
    const newStatus = activate ? 'active' : 'suspended';
    await this.updateBusinessStatus(businessId, newStatus, reason);
  }

  // Update business plan
  async updateBusinessPlan(
    businessId: string,
    newPlanId: string,
    applyImmediately = false
  ): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(
        `${this.endpoint}/businesses/${businessId}/plan`,
        { planId: newPlanId, applyImmediately }
      );
    } catch (error: any) {
      console.error('Error updating business plan:', error);
      throw error;
    }
  }

  // Get platform analytics
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    try {
      const response = await apiClient.get<ApiResponse<PlatformAnalytics>>(
        `${this.endpoint}/analytics`
      );
      return response.data.data || {
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalUsers: 0,
        averageRevenuePerUser: 0,
        churnRate: 0,
        growthRate: 0,
        planDistribution: [],
        revenueByPlan: [],
        monthlyTrend: [],
      };
    } catch (error) {
      console.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  // Send announcement to businesses
  async sendAnnouncement(
    title: string,
    message: string,
    targetAudience: 'all' | 'active' | 'plan' | 'custom',
    filters?: {
      plans?: string[];
      businessIds?: string[];
    }
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/announcements`, {
        title,
        message,
        targetAudience,
        filters,
      });
    } catch (error: any) {
      console.error('Error sending announcement:', error);
      throw error;
    }
  }
}

export const superadminService = new SuperadminService();
