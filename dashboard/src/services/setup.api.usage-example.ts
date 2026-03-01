/**
 * Setup API Service Usage Examples
 * This file demonstrates how to use the new setup API service
 */

import { setupApiService } from './api/setup.api.service';
import type {
  BusinessInfo,
  Branch,
  TeamInfo,
  TeamMember,
  SetupData,
} from './api/setup.api.service';

/**
 * Example: Complete Setup Wizard Flow
 */
export class SetupWizardExample {
  
  /**
   * Step 1: Check setup status
   */
  async checkSetupStatus() {
    try {
      const status = await setupApiService.getSetupStatus();
      console.log('Setup Status:', {
        isCompleted: status.isCompleted,
        currentStep: status.currentStep,
        completedSteps: status.completedSteps
      });
      return status;
    } catch (error) {
      console.error('Failed to check setup status:', error);
      throw error;
    }
  }

  /**
   * Step 2: Save business information
   */
  async saveBusinessInfo() {
    try {
      const businessInfo: BusinessInfo = {
        businessName: 'Elite Beauty Salon',
        businessType: 'beauty-salon',
        businessCategory: 'beauty',
        description: 'Premium beauty salon offering comprehensive beauty services',
        email: 'info@elitebeauty.com',
        phone: '+1234567890',
        website: 'https://elitebeauty.com',
        address: '123 Beauty Street, City, State',
        currency: 'USD',
        timezone: 'America/New_York',
        languages: ['en', 'ar'],
        businessHours: {
          sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
          monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
          tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
          wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
          thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
          friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
          saturday: { isOpen: true, openTime: '08:00', closeTime: '22:00' },
        }
      };

      const savedBusinessInfo = await setupApiService.saveBusinessInfo(businessInfo);
      console.log('Business info saved:', savedBusinessInfo);
      return savedBusinessInfo;
    } catch (error) {
      console.error('Failed to save business info:', error);
      throw error;
    }
  }

  /**
   * Step 3: Save branches
   */
  async saveBranches() {
    try {
      const branches: Branch[] = [
        {
          name: 'Main Branch',
          address: '123 Beauty Street, City, State',
          phone: '+1234567890',
          email: 'main@elitebeauty.com',
          isMain: true,
          businessHours: {
            sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
            monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
            saturday: { isOpen: true, openTime: '08:00', closeTime: '22:00' },
          },
          services: ['haircut', 'styling', 'coloring', 'treatment'],
          capacity: 20,
          amenities: ['wifi', 'parking', 'refreshments', 'magazines'],
          coordinates: {
            lat: 40.7128,
            lng: -74.0060
          }
        },
        {
          name: 'Downtown Branch',
          address: '456 Downtown Ave, City, State',
          phone: '+1234567891',
          email: 'downtown@elitebeauty.com',
          isMain: false,
          businessHours: {
            sunday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
            monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
            friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
            saturday: { isOpen: true, openTime: '08:00', closeTime: '22:00' },
          },
          services: ['haircut', 'styling', 'manicure', 'pedicure'],
          capacity: 15,
          amenities: ['wifi', 'refreshments'],
          coordinates: {
            lat: 40.7589,
            lng: -73.9851
          }
        }
      ];

      const savedBranches = await setupApiService.saveBranches(branches);
      console.log('Branches saved:', savedBranches);
      return savedBranches;
    } catch (error) {
      console.error('Failed to save branches:', error);
      throw error;
    }
  }

  /**
   * Step 4: Save team information
   */
  async saveTeamInfo() {
    try {
      const teamMembers: TeamMember[] = [
        {
          name: 'Sarah Johnson',
          email: 'sarah@elitebeauty.com',
          role: 'manager',
          phone: '+1234567892',
          permissions: ['manage_appointments', 'manage_staff', 'view_reports'],
          branchIds: ['main-branch-id'],
          services: ['haircut', 'styling', 'coloring'],
          workSchedule: {
            sunday: { isWorking: false, startTime: '09:00', endTime: '18:00' },
            monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            saturday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
          },
          specializations: ['Hair Coloring', 'Hair Styling'],
          experience: 8,
          languages: ['en', 'es'],
          isActive: true
        },
        {
          name: 'Maria Garcia',
          email: 'maria@elitebeauty.com',
          role: 'stylist',
          phone: '+1234567893',
          permissions: ['manage_appointments', 'view_clients'],
          branchIds: ['main-branch-id', 'downtown-branch-id'],
          services: ['haircut', 'styling', 'treatment'],
          workSchedule: {
            sunday: { isWorking: true, startTime: '10:00', endTime: '18:00' },
            monday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
            thursday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            friday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
            saturday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
          },
          specializations: ['Hair Treatment', 'Scalp Care'],
          experience: 5,
          languages: ['en', 'ar'],
          isActive: true
        }
      ];

      const teamInfo: TeamInfo = {
        members: teamMembers,
        roles: [
          {
            id: 'manager',
            name: 'Manager',
            permissions: ['manage_all'],
            description: 'Full access to all features and settings'
          },
          {
            id: 'stylist',
            name: 'Stylist',
            permissions: ['manage_appointments', 'view_clients', 'manage_services'],
            description: 'Can manage appointments and client services'
          },
          {
            id: 'receptionist',
            name: 'Receptionist',
            permissions: ['manage_appointments', 'view_clients'],
            description: 'Can manage appointments and view client information'
          }
        ],
        invitations: [
          {
            email: 'john@elitebeauty.com',
            role: 'stylist',
            branchIds: ['downtown-branch-id'],
            sentAt: new Date().toISOString(),
            status: 'pending'
          }
        ]
      };

      const savedTeamInfo = await setupApiService.saveTeamInfo(teamInfo);
      console.log('Team info saved:', savedTeamInfo);
      return savedTeamInfo;
    } catch (error) {
      console.error('Failed to save team info:', error);
      throw error;
    }
  }

  /**
   * Step 5: Save theme
   */
  async saveTheme() {
    try {
      const savedTheme = await setupApiService.saveTheme('elegant-purple', {
        primaryColor: '#8B5CF6',
        secondaryColor: '#7C3AED',
        accentColor: '#F3E8FF',
        customCss: `
          .brand-header {
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
          }
        `
      });
      
      console.log('Theme saved:', savedTheme);
      return savedTheme;
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw error;
    }
  }

  /**
   * Step 6: Complete setup
   */
  async completeSetup() {
    try {
      const result = await setupApiService.completeSetup();
      console.log('Setup completed:', result);
      
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to complete setup:', error);
      throw error;
    }
  }

  /**
   * Run complete setup flow
   */
  async runCompleteSetup() {
    try {
      console.log('Starting setup process...');
      
      // Check current status
      const status = await this.checkSetupStatus();
      
      if (status.isCompleted) {
        console.log('Setup already completed');
        return;
      }
      
      // Step 1: Business Info
      console.log('Step 1: Saving business information...');
      await this.saveBusinessInfo();
      
      // Step 2: Branches
      console.log('Step 2: Saving branches...');
      await this.saveBranches();
      
      // Step 3: Team Info
      console.log('Step 3: Saving team information...');
      await this.saveTeamInfo();
      
      // Step 4: Theme
      console.log('Step 4: Saving theme...');
      await this.saveTheme();
      
      // Step 5: Complete
      console.log('Step 5: Completing setup...');
      await this.completeSetup();
      
      console.log('Setup completed successfully!');
      
    } catch (error) {
      console.error('Setup process failed:', error);
      throw error;
    }
  }
}

/**
 * Example: Individual API calls
 */
export class SetupApiExamples {
  
  /**
   * Check business name availability
   */
  async checkBusinessNameAvailability() {
    try {
      const result = await setupApiService.checkBusinessNameAvailability('Elite Beauty Salon');
      console.log('Business name availability:', result);
      
      if (!result.available && result.suggestions) {
        console.log('Suggested names:', result.suggestions);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to check business name availability:', error);
    }
  }
  
  /**
   * Upload business logo
   */
  async uploadLogo(logoFile: File) {
    try {
      const result = await setupApiService.uploadLogo(logoFile);
      console.log('Logo uploaded:', result);
      
      // Use the logo URL in business info
      return result.url;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      throw error;
    }
  }
  
  /**
   * Get available business types
   */
  async getBusinessTypes() {
    try {
      const businessTypes = await setupApiService.getBusinessTypes();
      console.log('Available business types:', businessTypes);
      return businessTypes;
    } catch (error) {
      console.error('Failed to get business types:', error);
    }
  }
  
  /**
   * Get available themes
   */
  async getAvailableThemes() {
    try {
      const themes = await setupApiService.getAvailableThemes();
      console.log('Available themes:', themes);
      return themes;
    } catch (error) {
      console.error('Failed to get themes:', error);
    }
  }
  
  /**
   * Validate setup data
   */
  async validateSetupData() {
    try {
      const validation = await setupApiService.validateSetupData();
      console.log('Setup validation:', validation);
      
      if (!validation.isValid) {
        console.error('Validation errors:', validation.errors);
      }
      
      return validation;
    } catch (error) {
      console.error('Failed to validate setup data:', error);
    }
  }
  
  /**
   * Get setup summary
   */
  async getSetupSummary() {
    try {
      const summary = await setupApiService.getSetupSummary();
      console.log('Setup summary:', summary);
      return summary;
    } catch (error) {
      console.error('Failed to get setup summary:', error);
    }
  }
  
  /**
   * Save setup progress (draft)
   */
  async saveProgress() {
    try {
      await setupApiService.saveStepProgress(2, {
        branches: [
          {
            name: 'Main Branch',
            address: '123 Beauty Street',
            phone: '+1234567890',
            isMain: true
          }
        ]
      });
      
      console.log('Progress saved');
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }
  
  /**
   * Get cached setup data
   */
  getCachedData() {
    const cachedData = setupApiService.getCachedSetupData();
    console.log('Cached setup data:', cachedData);
    return cachedData;
  }
  
  /**
   * Cache setup data locally
   */
  cacheSetupData(data: Partial<SetupData>) {
    setupApiService.cacheSetupData(data);
    console.log('Setup data cached locally');
  }
  
  /**
   * Clear all cached data
   */
  clearCache() {
    setupApiService.clearCache();
    console.log('Cache cleared');
  }
  
  /**
   * Reset setup to start over
   */
  async resetSetup() {
    try {
      await setupApiService.resetSetup();
      console.log('Setup reset successfully');
    } catch (error) {
      console.error('Failed to reset setup:', error);
    }
  }
  
  /**
   * Skip setup for now
   */
  async skipSetup() {
    try {
      await setupApiService.skipSetup();
      console.log('Setup skipped');
    } catch (error) {
      console.error('Failed to skip setup:', error);
    }
  }
}

/**
 * Example: React Hook Usage (pseudo-code)
 */
export const useSetupWizard = () => {
  // This would be implemented as a React hook
  // const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  // const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  
  const loadSetupStatus = async () => {
    // setIsLoading(true);
    // setError(null);
    try {
      const status = await setupApiService.getSetupStatus();
      // setSetupStatus(status);
      return status;
    } catch (error: any) {
      // setError(error.message);
      console.error('Failed to load setup status:', error);
    } finally {
      // setIsLoading(false);
    }
  };
  
  const saveBusinessInfo = async (businessInfo: BusinessInfo) => {
    try {
      const result = await setupApiService.saveBusinessInfo(businessInfo);
      // Update local state
      return result;
    } catch (error: any) {
      console.error('Failed to save business info:', error);
      throw error;
    }
  };
  
  return {
    loadSetupStatus,
    saveBusinessInfo,
    // ... other methods
  };
};

// Event listeners for setup events
window.addEventListener('setup:completed', (event: any) => {
  console.log('Setup completed event:', event.detail);
  // Handle setup completion (redirect, show success message, etc.)
});

window.addEventListener('setup:skipped', () => {
  console.log('Setup skipped event');
  // Handle setup skip
});

window.addEventListener('setup:reset', () => {
  console.log('Setup reset event');
  // Handle setup reset
});

// Export examples for use in components
export default {
  SetupWizardExample,
  SetupApiExamples,
  useSetupWizard,
};