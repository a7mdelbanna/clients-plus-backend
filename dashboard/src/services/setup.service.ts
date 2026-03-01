import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type { CompanySetupData, Branch } from '../types/index';

interface CompanyData {
  id: string;
  name: string;
  businessType?: string;
  mainServices?: string[];
  ownerPosition?: string;
  employeeCount?: number;
  theme?: {
    id: string;
    primary: string;
    secondary: string;
  };
  setupCompleted?: boolean;
  setupCompletedAt?: any;
  branches?: Branch[];
}

export const setupService = {
  // Get user's company ID
  async getUserCompanyId(userId: string): Promise<string | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ companyId: string }>>(`/users/${userId}`);
      return response.data.data?.companyId || null;
    } catch (error) {
      console.log('User document not found, this is expected for new users');
      return null;
    }
  },

  // Get user document
  async getUserDoc(userId: string): Promise<any | null> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/users/${userId}`);
      return response.data.data || null;
    } catch (error) {
      console.log('User document not found, this is expected for new users');
      return null;
    }
  },

  // Create a new company for a user who just signed up
  async createCompanyForUser(userId: string, userEmail: string, userName: string): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>('/setup/company', {
        userId,
        userEmail,
        userName,
      });
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create company');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating company for user:', error);
      throw new Error(error.response?.data?.message || 'فشل في إنشاء الشركة. يرجى المحاولة مرة أخرى.');
    }
  },

  // Check if company setup is completed
  async checkSetupStatus(companyId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<{ setupCompleted: boolean }>>(`/setup/status`);
      return response.data.data?.setupCompleted || false;
    } catch (error) {
      console.error('Error checking setup status:', error);
      return false;
    }
  },

  // Get company data
  async getCompanyData(companyId: string): Promise<CompanyData | null> {
    try {
      const response = await apiClient.get<ApiResponse<CompanyData>>(`/company/profile`);
      return response.data.data || null;
    } catch (error) {
      console.error('[setupService] Error fetching company data:', error);
      return null;
    }
  },

  // Complete company setup
  async completeSetup(companyId: string, setupData: CompanySetupData): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>('/setup/complete', {
        businessName: setupData.businessName,
        businessType: setupData.businessType,
        mainServices: setupData.mainServices,
        ownerPosition: setupData.ownerPosition,
        employeeCount: setupData.employeeCount,
        themeId: setupData.themeId,
        branches: setupData.branches,
      });
      if (!response.data.success) throw new Error(response.data.message || 'Failed to complete setup');
    } catch (error: any) {
      console.error('[setupService] Error completing setup:', error);
      throw new Error(error.response?.data?.message || 'فشل في حفظ البيانات. يرجى المحاولة مرة أخرى.');
    }
  },

  // Save setup progress (optional - for saving draft)
  async saveSetupProgress(companyId: string, step: number, data: Partial<CompanySetupData>): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>('/setup/progress', { step, data });
    } catch (error) {
      console.error('Error saving setup progress:', error);
      // Don't throw - this is optional functionality
    }
  },

  // Get setup progress (optional - for resuming setup)
  async getSetupProgress(companyId: string): Promise<{ step: number; data: Partial<CompanySetupData> } | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ step: number; data: Partial<CompanySetupData> }>>('/setup/progress');
      return response.data.data || null;
    } catch (error) {
      console.error('Error fetching setup progress:', error);
      return null;
    }
  }
};
