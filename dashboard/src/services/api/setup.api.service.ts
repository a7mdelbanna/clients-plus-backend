import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// Setup API interfaces
export interface SetupStatus {
  isCompleted: boolean;
  currentStep: number;
  completedSteps: number[];
  lastUpdated: string;
  companyId: string;
}

export interface SetupProgress {
  step: number;
  totalSteps: number;
  currentStepName: string;
  percentageComplete: number;
  data?: Partial<SetupData>;
  lastSaved?: string;
}

export interface BusinessInfo {
  businessName: string;
  businessType: string;
  businessCategory: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  businessHours?: BusinessHours;
  languages?: string[];
  currency?: string;
  timezone?: string;
}

export interface BusinessHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    breakStart?: string;
    breakEnd?: string;
  };
}

export interface Branch {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  isMain: boolean;
  businessHours?: BusinessHours;
  services?: string[];
  staff?: string[];
  capacity?: number;
  amenities?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TeamMember {
  id?: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  phone?: string;
  branchIds?: string[];
  services?: string[];
  workSchedule?: WorkSchedule;
  avatar?: string;
  specializations?: string[];
  experience?: number;
  languages?: string[];
  isActive: boolean;
}

export interface WorkSchedule {
  [key: string]: {
    isWorking: boolean;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  };
}

export interface TeamInfo {
  teamSize?: string;  // '1-5', '6-20', '21-50', '51-100', '100+'
  members: TeamMember[];
  roles: {
    id: string;
    name: string;
    permissions: string[];
    description?: string;
  }[];
  invitations?: {
    email: string;
    role: string;
    branchIds?: string[];
    sentAt: string;
    status: 'pending' | 'accepted' | 'expired';
  }[];
}

export interface ThemeConfig {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  isDark?: boolean;
  customCss?: string;
  logo?: string;
  favicon?: string;
  fonts?: {
    primary: string;
    secondary?: string;
  };
}

export interface SetupData {
  businessInfo: BusinessInfo;
  branches: Branch[];
  teamInfo: TeamInfo;
  theme: ThemeConfig;
}

export interface SetupStatusResponse extends ApiResponse<SetupStatus> {}
export interface SetupProgressResponse extends ApiResponse<SetupProgress> {}
export interface BusinessInfoResponse extends ApiResponse<BusinessInfo> {}
export interface BranchesResponse extends ApiResponse<Branch[]> {}
export interface TeamInfoResponse extends ApiResponse<TeamInfo> {}
export interface ThemeResponse extends ApiResponse<ThemeConfig> {}
export interface SetupCompleteResponse extends ApiResponse<{
  success: boolean;
  companyId: string;
  redirectUrl?: string;
}> {}

// Available business types for setup
export interface BusinessType {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  services: string[];
  requiredFeatures: string[];
  recommendedAddons?: string[];
}

export interface AvailableTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  primaryColor: string;
  secondaryColor: string;
  preview?: string;
  isPremium?: boolean;
  description?: string;
}

/**
 * Setup API Service
 * Handles all setup wizard related API calls
 */
class SetupApiService {
  private readonly basePath = '/setup';

  /**
   * Get setup status for current company
   */
  async getSetupStatus(): Promise<SetupStatus> {
    try {
      const response = await apiClient.get<SetupStatusResponse>(`${this.basePath}/status`);
      console.log('Setup status API response:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get setup status');
      }

      // The backend returns { isCompleted, progress, data }
      // We need to transform it to match our SetupStatus interface
      const backendStatus = response.data.data;
      
      if (backendStatus && typeof backendStatus === 'object') {
        return {
          isCompleted: backendStatus.isCompleted || false,
          currentStep: backendStatus.currentStep || 5,
          completedSteps: backendStatus.completedSteps || ['business-info', 'branches', 'team-info', 'theme'],
          lastUpdated: backendStatus.lastUpdated || new Date().toISOString(),
          companyId: backendStatus.companyId || ''
        };
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('Get setup status error:', error.response || error);
      
      // If there's a 401, 403, or token error, just return that setup is complete
      // to avoid redirect loops
      if (error.response?.status === 401 || error.response?.status === 403 || 
          error.response?.data?.error === 'TOKEN_EXPIRED') {
        console.log('Auth error when checking setup, assuming setup is complete');
        return {
          isCompleted: true,
          currentStep: 5,
          completedSteps: ['business-info', 'branches', 'team-info', 'theme'],
          lastUpdated: new Date().toISOString(),
          companyId: ''
        };
      }
      
      if (error.response?.status === 404) {
        // Setup not started yet, return default status
        return {
          isCompleted: false,
          currentStep: 1,
          completedSteps: [],
          lastUpdated: new Date().toISOString(),
          companyId: ''
        };
      }
      
      // For any other error, assume setup is complete to avoid redirect loops
      console.log('Unknown error checking setup status, assuming complete');
      return {
        isCompleted: true,
        currentStep: 5,
        completedSteps: ['business-info', 'branches', 'team-info', 'theme'],
        lastUpdated: new Date().toISOString(),
        companyId: ''
      };
    }
  }

  /**
   * Get setup progress with saved data
   */
  async getSetupProgress(): Promise<SetupProgress> {
    try {
      const response = await apiClient.get<SetupProgressResponse>(`${this.basePath}/progress`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get setup progress');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get setup progress error:', error);
      
      if (error.response?.status === 404) {
        // No progress saved yet, return default
        return {
          step: 1,
          totalSteps: 5,
          currentStepName: 'Business Information',
          percentageComplete: 0,
        };
      }
      
      throw new Error(error.message || 'Failed to get setup progress');
    }
  }

  /**
   * Save business information
   */
  async saveBusinessInfo(businessInfo: BusinessInfo): Promise<BusinessInfo> {
    try {
      const response = await apiClient.post<BusinessInfoResponse>(
        `${this.basePath}/business-info`,
        businessInfo
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save business information');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Save business info error:', error);
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.errors 
          ? Object.values(error.response.data.errors).flat().join(', ')
          : 'Invalid business information';
        throw new Error(errorMessage);
      }
      
      throw new Error(error.message || 'Failed to save business information');
    }
  }

  /**
   * Save branches configuration
   */
  async saveBranches(branches: Branch[]): Promise<Branch[]> {
    try {
      if (!branches || branches.length === 0) {
        throw new Error('At least one branch is required');
      }

      // Validate that one branch is marked as main
      const mainBranches = branches.filter(branch => branch.isMain);
      if (mainBranches.length === 0) {
        throw new Error('One branch must be marked as main');
      }
      if (mainBranches.length > 1) {
        throw new Error('Only one branch can be marked as main');
      }

      const response = await apiClient.post<BranchesResponse>(
        `${this.basePath}/branches`,
        { branches }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save branches');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Save branches error:', error);
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.errors 
          ? Object.values(error.response.data.errors).flat().join(', ')
          : 'Invalid branch information';
        throw new Error(errorMessage);
      }
      
      throw new Error(error.message || 'Failed to save branches');
    }
  }

  /**
   * Save team information and send invitations
   */
  async saveTeamInfo(teamInfo: TeamInfo): Promise<TeamInfo> {
    try {
      const response = await apiClient.post<TeamInfoResponse>(
        `${this.basePath}/team-info`,
        teamInfo
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save team information');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Save team info error:', error);
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.errors 
          ? Object.values(error.response.data.errors).flat().join(', ')
          : 'Invalid team information';
        throw new Error(errorMessage);
      }
      
      if (error.response?.status === 409) {
        throw new Error('Some team members already exist or have conflicts');
      }
      
      throw new Error(error.message || 'Failed to save team information');
    }
  }

  /**
   * Save theme configuration
   */
  async saveTheme(themeId: string, customizations?: Partial<ThemeConfig>): Promise<ThemeConfig> {
    try {
      const payload = {
        themeId,
        ...customizations
      };

      const response = await apiClient.post<ThemeResponse>(
        `${this.basePath}/theme`,
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save theme');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Save theme error:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid theme configuration');
      }
      
      if (error.response?.status === 404) {
        throw new Error('Theme not found');
      }
      
      throw new Error(error.message || 'Failed to save theme');
    }
  }

  /**
   * Complete the setup process
   */
  async completeSetup(): Promise<{ success: boolean; companyId: string; redirectUrl?: string }> {
    try {
      const response = await apiClient.post<SetupCompleteResponse>(`${this.basePath}/complete`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to complete setup');
      }

      // Clear any cached setup data
      sessionStorage.removeItem('setupProgress');
      sessionStorage.removeItem('setupData');
      
      // Emit setup completed event
      window.dispatchEvent(new CustomEvent('setup:completed', {
        detail: response.data.data
      }));

      // Return the expected structure
      return {
        success: true,
        companyId: response.data.data?.id || response.data.data?.companyId || '',
        redirectUrl: response.data.data?.redirectUrl || '/dashboard'
      };
    } catch (error: any) {
      console.error('Complete setup error:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Setup validation failed. Please review all steps.');
      }
      
      if (error.response?.status === 409) {
        throw new Error('Setup already completed');
      }
      
      throw new Error(error.message || 'Failed to complete setup');
    }
  }

  /**
   * Save progress for a specific step (draft save)
   */
  async saveStepProgress(step: number, data: any): Promise<void> {
    try {
      await apiClient.post(`${this.basePath}/progress`, {
        step,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Save step progress error (non-critical):', error);
      // Don't throw - this is optional functionality
    }
  }

  /**
   * Get available business types for setup
   */
  async getBusinessTypes(): Promise<BusinessType[]> {
    try {
      const response = await apiClient.get<ApiResponse<BusinessType[]>>(`${this.basePath}/business-types`);
      
      if (!response.data.success) {
        throw new Error('Failed to get business types');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get business types error:', error);
      
      // Return default business types if API fails
      return [
        {
          id: 'barbershop',
          name: 'Barbershop',
          nameAr: 'صالون حلاقة رجالي',
          category: 'beauty',
          services: ['haircut', 'beard', 'shave'],
          requiredFeatures: ['appointments', 'staff', 'services']
        },
        {
          id: 'beauty-salon',
          name: 'Beauty Salon',
          nameAr: 'صالون تجميل',
          category: 'beauty',
          services: ['hair-style', 'makeup', 'manicure'],
          requiredFeatures: ['appointments', 'staff', 'services', 'inventory']
        }
      ];
    }
  }

  /**
   * Get available themes for setup
   */
  async getAvailableThemes(): Promise<AvailableTheme[]> {
    try {
      const response = await apiClient.get<ApiResponse<AvailableTheme[]>>(`${this.basePath}/themes`);
      
      if (!response.data.success) {
        throw new Error('Failed to get themes');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get themes error:', error);
      
      // Return default themes if API fails
      return [
        {
          id: 'modern-blue',
          name: 'Modern Blue',
          nameAr: 'أزرق عصري',
          category: 'modern',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF'
        },
        {
          id: 'elegant-purple',
          name: 'Elegant Purple',
          nameAr: 'بنفسجي أنيق',
          category: 'elegant',
          primaryColor: '#8B5CF6',
          secondaryColor: '#7C3AED'
        }
      ];
    }
  }

  /**
   * Validate setup data before completion
   */
  async validateSetupData(): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const response = await apiClient.post<ApiResponse<{ isValid: boolean; errors: string[] }>>(
        `${this.basePath}/validate`
      );
      
      if (!response.data.success) {
        return {
          isValid: false,
          errors: [response.data.message || 'Validation failed']
        };
      }

      return response.data.data || { isValid: false, errors: ['Unknown validation error'] };
    } catch (error: any) {
      console.error('Validate setup data error:', error);
      
      if (error.response?.status === 400) {
        return {
          isValid: false,
          errors: error.response.data?.errors || ['Validation failed']
        };
      }
      
      return {
        isValid: false,
        errors: [error.message || 'Validation failed']
      };
    }
  }

  /**
   * Skip setup (for testing or later completion)
   */
  async skipSetup(): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(`${this.basePath}/skip`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to skip setup');
      }

      // Clear cached data
      sessionStorage.removeItem('setupProgress');
      sessionStorage.removeItem('setupData');
      
      // Emit setup skipped event
      window.dispatchEvent(new CustomEvent('setup:skipped'));
    } catch (error: any) {
      console.error('Skip setup error:', error);
      throw new Error(error.message || 'Failed to skip setup');
    }
  }

  /**
   * Reset setup to start over
   */
  async resetSetup(): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(`${this.basePath}/reset`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to reset setup');
      }

      // Clear cached data
      sessionStorage.removeItem('setupProgress');
      sessionStorage.removeItem('setupData');
      localStorage.removeItem('setupDraft');
      
      // Emit setup reset event
      window.dispatchEvent(new CustomEvent('setup:reset'));
    } catch (error: any) {
      console.error('Reset setup error:', error);
      throw new Error(error.message || 'Failed to reset setup');
    }
  }

  /**
   * Get setup summary for review
   */
  async getSetupSummary(): Promise<SetupData> {
    try {
      const response = await apiClient.get<ApiResponse<SetupData>>(`${this.basePath}/summary`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get setup summary');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get setup summary error:', error);
      throw new Error(error.message || 'Failed to get setup summary');
    }
  }

  /**
   * Check if company name is available
   */
  async checkBusinessNameAvailability(businessName: string): Promise<{ available: boolean; suggestions?: string[] }> {
    try {
      const response = await apiClient.post<ApiResponse<{ available: boolean; suggestions?: string[] }>>(
        `${this.basePath}/check-business-name`,
        { businessName }
      );
      
      if (!response.data.success) {
        throw new Error('Failed to check business name availability');
      }

      return response.data.data || { available: false };
    } catch (error: any) {
      console.error('Check business name availability error:', error);
      
      // Return available by default if check fails
      return { available: true };
    }
  }

  /**
   * Upload business logo
   */
  async uploadLogo(file: File): Promise<{ url: string; thumbnailUrl?: string }> {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await apiClient.post<ApiResponse<{ url: string; thumbnailUrl?: string }>>(
        `${this.basePath}/upload-logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to upload logo');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Upload logo error:', error);
      
      if (error.response?.status === 413) {
        throw new Error('File too large. Please choose a smaller image.');
      }
      
      if (error.response?.status === 415) {
        throw new Error('Invalid file type. Please upload a PNG, JPG, or SVG image.');
      }
      
      throw new Error(error.message || 'Failed to upload logo');
    }
  }

  /**
   * Cache setup data locally for offline access
   */
  cacheSetupData(data: Partial<SetupData>): void {
    try {
      const cached = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem('setupDraft', JSON.stringify(cached));
    } catch (error) {
      console.error('Error caching setup data:', error);
    }
  }

  /**
   * Get cached setup data
   */
  getCachedSetupData(): Partial<SetupData> | null {
    try {
      const cached = localStorage.getItem('setupDraft');
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      
      // Check if cache is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem('setupDraft');
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Error reading cached setup data:', error);
      localStorage.removeItem('setupDraft');
      return null;
    }
  }

  /**
   * Clear cached setup data
   */
  clearCache(): void {
    localStorage.removeItem('setupDraft');
    sessionStorage.removeItem('setupProgress');
    sessionStorage.removeItem('setupData');
  }
}

// Create and export singleton instance
export const setupApiService = new SetupApiService();

export default setupApiService;