import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

export interface PhoneNumber {
  countryCode: string;
  number: string;
  type?: 'main' | 'mobile' | 'whatsapp';
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface Break {
  start: string;
  end: string;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: Break[];
}

export interface BranchSettings {
  allowOnlineBooking: boolean;
  autoConfirmAppointments: boolean;
  requireDepositForBooking: boolean;
  depositAmount?: number;
  cancellationHours?: number;
}

export interface Branch {
  id?: string;
  name: string;
  type: 'main' | 'secondary';
  status: 'active' | 'inactive';
  address: Address;
  contact: {
    phones: PhoneNumber[];
    email?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  operatingHours: {
    [day: string]: DaySchedule;
  };
  services?: string[];
  resources?: string[];
  staff?: string[];
  settings?: BranchSettings;
  createdAt?: string | any;
  updatedAt?: string | any;
  phone?: string;
  isMain?: boolean;
  active?: boolean;
}

class BranchService {
  private getEndpoint(companyId: string): string {
    return `/companies/${companyId}/branches`;
  }

  async createBranch(companyId: string, branchData: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        this.getEndpoint(companyId), branchData
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create branch');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating branch:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create branch');
    }
  }

  async updateBranch(companyId: string, branchId: string, updates: Partial<Branch>): Promise<void> {
    try {
      const response = await apiClient.put<ApiResponse<void>>(
        `${this.getEndpoint(companyId)}/${branchId}`, updates
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to update branch');
    } catch (error: any) {
      console.error('Error updating branch:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update branch');
    }
  }

  async deleteBranch(companyId: string, branchId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `${this.getEndpoint(companyId)}/${branchId}`
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to delete branch');
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete branch');
    }
  }

  async getBranches(companyId: string, includeInactive = false): Promise<Branch[]> {
    try {
      const params: any = {};
      if (!includeInactive) params.active = true;
      const response = await apiClient.get<ApiResponse<Branch[]>>(
        this.getEndpoint(companyId), { params }
      );
      if (!response.data.success) return [];

      const branches = (response.data.data || []).map(b => ({
        ...b,
        type: b.type || (b.isMain ? 'main' as const : 'secondary' as const),
        status: b.status || (b.active !== false ? 'active' as const : 'inactive' as const),
      }));

      // Sort: main first, then by creation
      branches.sort((a, b) => {
        if (a.type === 'main' || a.isMain) return -1;
        if (b.type === 'main' || b.isMain) return 1;
        return 0;
      });

      return branches;
    } catch (error: any) {
      console.error('Error getting branches:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch branches');
    }
  }

  async getBranch(companyId: string, branchId: string): Promise<Branch | null> {
    try {
      const response = await apiClient.get<ApiResponse<Branch>>(
        `${this.getEndpoint(companyId)}/${branchId}`
      );
      if (!response.data.success) return null;
      const data = response.data.data;
      if (!data) return null;
      return {
        ...data,
        type: data.type || (data.isMain ? 'main' : 'secondary'),
        status: data.status || (data.active !== false ? 'active' : 'inactive'),
      };
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async assignStaffToBranch(companyId: string, branchId: string, staffIds: string[]): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(
        `${this.getEndpoint(companyId)}/${branchId}/staff`,
        { staffIds }
      );
    } catch (error: any) {
      console.error('Error assigning staff:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to assign staff');
    }
  }

  async assignServicesToBranch(companyId: string, branchId: string, serviceIds: string[]): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(
        `${this.getEndpoint(companyId)}/${branchId}/services`,
        { serviceIds }
      );
    } catch (error: any) {
      console.error('Error assigning services:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to assign services');
    }
  }

  async assignResourcesToBranch(companyId: string, branchId: string, resourceIds: string[]): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(
        `${this.getEndpoint(companyId)}/${branchId}/resources`,
        { resourceIds }
      );
    } catch (error: any) {
      console.error('Error assigning resources:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to assign resources');
    }
  }

  async getBranchCount(companyId: string): Promise<number> {
    try {
      const response = await apiClient.get<ApiResponse<{ count: number }>>(
        `${this.getEndpoint(companyId)}/count`
      );
      return response.data.data?.count || 0;
    } catch (error) {
      console.error('Error getting branch count:', error);
      const branches = await this.getBranches(companyId);
      return branches.length;
    }
  }

  async canAddBranch(companyId: string, planType: 'trial' | 'basic' | 'pro' | 'enterprise' = 'trial'): Promise<boolean> {
    const currentCount = await this.getBranchCount(companyId);
    const limits = { trial: 2, basic: 3, pro: 5, enterprise: Infinity };
    return currentCount < limits[planType];
  }

  async setDefaultBranch(companyId: string, branchId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.getEndpoint(companyId)}/${branchId}/set-default`
      );
    } catch (error: any) {
      console.error('Error setting default branch:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to set default branch');
    }
  }

  async getOperatingHours(companyId: string, branchId: string): Promise<{ [day: string]: DaySchedule }> {
    try {
      const response = await apiClient.get<ApiResponse<{ [day: string]: DaySchedule }>>(
        `${this.getEndpoint(companyId)}/${branchId}/operating-hours`
      );
      return response.data.data || {};
    } catch (error) {
      console.error('Error getting operating hours:', error);
      return {};
    }
  }

  async updateOperatingHours(
    companyId: string,
    branchId: string,
    hours: { [day: string]: DaySchedule }
  ): Promise<void> {
    await apiClient.put<ApiResponse<void>>(
      `${this.getEndpoint(companyId)}/${branchId}/operating-hours`,
      hours
    );
  }
}

export const branchService = new BranchService();
