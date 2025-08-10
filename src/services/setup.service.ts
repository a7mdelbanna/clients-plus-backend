import { PrismaClient, Company } from '@prisma/client';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export interface SetupProgress {
  businessInfo: boolean;
  branches: boolean;
  teamInfo: boolean;
  theme: boolean;
}

export interface BusinessInfoData {
  // Support both frontend and backend field names
  name?: string;
  businessName?: string;
  businessType?: string;
  businessCategory?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  // Support both string and object address formats
  address?: string | {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  businessHours?: any;
  languages?: string[];
  currency?: string;
  timezone?: string;
}

export interface BranchData {
  id?: string;
  name: string;
  // Support both string and object address formats
  address: string | {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  isMain: boolean;
  businessHours?: any;
  services?: string[];
  staff?: string[];
  capacity?: number;
  amenities?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TeamInfoData {
  teamSize: string; // '1-5', '6-20', '21-50', '50+', etc.
  departments?: string[];
  roles?: string[];
}

export interface ThemeData {
  // Support both field names from frontend
  theme?: string;
  themeId?: string;
  id?: string;
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  logo?: string;
  favicon?: string;
  isDark?: boolean;
  customCss?: string;
  fonts?: {
    primary: string;
    secondary?: string;
  };
}

export class SetupService {
  /**
   * Get setup status and progress for a company
   */
  async getSetupStatus(companyId: string): Promise<{
    isCompleted: boolean;
    progress: SetupProgress;
    data?: any;
  }> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          setupCompleted: true,
          setupProgress: true,
          setupData: true,
        },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const progress: SetupProgress = {
        businessInfo: false,
        branches: false,
        teamInfo: false,
        theme: false,
        ...(company.setupProgress as any || {}),
      };

      return {
        isCompleted: company.setupCompleted,
        progress,
        data: company.setupData,
      };
    } catch (error) {
      logger.error('Error fetching setup status:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch setup status', 'SETUP_STATUS_ERROR');
    }
  }

  /**
   * Get current setup progress step
   */
  async getSetupProgress(companyId: string): Promise<{
    currentStep: string;
    completedSteps: string[];
    totalSteps: number;
    progressPercentage: number;
  }> {
    try {
      const { progress } = await this.getSetupStatus(companyId);
      
      const steps = ['businessInfo', 'branches', 'teamInfo', 'theme'];
      const completedSteps = steps.filter(step => progress[step as keyof SetupProgress]);
      const totalSteps = steps.length;
      const progressPercentage = (completedSteps.length / totalSteps) * 100;
      
      let currentStep = 'businessInfo';
      if (progress.businessInfo && !progress.branches) currentStep = 'branches';
      else if (progress.branches && !progress.teamInfo) currentStep = 'teamInfo';
      else if (progress.teamInfo && !progress.theme) currentStep = 'theme';
      else if (progress.theme) currentStep = 'complete';

      return {
        currentStep,
        completedSteps,
        totalSteps,
        progressPercentage,
      };
    } catch (error) {
      logger.error('Error fetching setup progress:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch setup progress', 'SETUP_PROGRESS_ERROR');
    }
  }

  /**
   * Save business information step
   */
  async saveBusinessInfo(companyId: string, data: BusinessInfoData): Promise<Company> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { setupProgress: true, setupData: true },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const currentProgress = company.setupProgress as any || {};
      const currentData = company.setupData as any || {};

      const updatedProgress = {
        ...currentProgress,
        businessInfo: true,
      };

      const updatedData = {
        ...currentData,
        businessInfo: data,
      };

      // Update the company record with business info
      const updateData: any = {
        setupProgress: updatedProgress,
        setupData: updatedData,
      };

      // Update actual company fields if provided (normalize field names)
      const businessName = data.businessName || data.name;
      if (businessName) updateData.name = businessName;
      if (data.businessType) updateData.businessType = data.businessType;
      if (data.phone) updateData.phone = data.phone;
      if (data.website) updateData.website = data.website;
      
      // Handle address - normalize to object format for database
      if (data.address) {
        if (typeof data.address === 'string') {
          // Convert string address to object format
          updateData.address = {
            street: data.address,
            city: '',
            state: '',
            zipCode: '',
            country: 'Egypt'
          };
        } else {
          updateData.address = data.address;
        }
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: updateData,
      });

      logger.info(`Business info saved for company: ${companyId}`);
      return updatedCompany;
    } catch (error) {
      logger.error('Error saving business info:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to save business information', 'BUSINESS_INFO_SAVE_ERROR');
    }
  }

  /**
   * Save branches information step
   * Handles both creation of new branches and updates to existing default branch
   */
  async saveBranches(companyId: string, branches: BranchData[]): Promise<any[]> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { setupProgress: true, setupData: true },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // Check if a default branch already exists (created during registration)
      const existingBranches = await prisma.branch.findMany({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
      });

      let resultBranches: any[] = [];

      // If we have one existing branch and only one branch in the wizard,
      // update the existing branch instead of creating a new one
      if (existingBranches.length === 1 && branches.length === 1) {
        const existingBranch = existingBranches[0];
        const branchData = branches[0];
        
        // Normalize address format for database
        let normalizedAddress = branchData.address;
        if (typeof branchData.address === 'string') {
          normalizedAddress = {
            street: branchData.address,
            city: '',
            state: '',
            zipCode: '',
            country: 'Egypt'
          };
        }

        // Update the existing default branch with setup wizard data
        const updatedBranch = await prisma.branch.update({
          where: { id: existingBranch.id },
          data: {
            name: branchData.name,
            address: normalizedAddress,
            phone: branchData.phone || existingBranch.phone,
            email: branchData.email || existingBranch.email,
            type: branchData.isMain ? 'MAIN' : 'SECONDARY',
            isMain: branchData.isMain,
            status: 'ACTIVE',
            // Preserve existing settings but allow updates
            contact: {
              email: branchData.email || (existingBranch.contact as any)?.email,
              phones: (existingBranch.contact as any)?.phones || [],
            },
          },
        });
        
        logger.info(`Updated existing default branch: ${updatedBranch.id} for company: ${companyId}`);
        resultBranches = [updatedBranch];
      } else {
        // Multiple branches or no existing branches - replace all
        // This handles the case where user wants to create multiple branches
        
        // Delete existing branches if any (they're being replaced)
        if (existingBranches.length > 0) {
          await prisma.branch.deleteMany({
            where: { companyId },
          });
          logger.info(`Deleted ${existingBranches.length} existing branches for company: ${companyId}`);
        }

        // Create new branches
        resultBranches = await Promise.all(
          branches.map(async (branchData) => {
            // Normalize address format for database
            let normalizedAddress = branchData.address;
            if (typeof branchData.address === 'string') {
              normalizedAddress = {
                street: branchData.address,
                city: '',
                state: '',
                zipCode: '',
                country: 'Egypt'
              };
            }

            return await prisma.branch.create({
              data: {
                companyId,
                name: branchData.name,
                address: normalizedAddress,
                phone: branchData.phone,
                email: branchData.email,
                type: branchData.isMain ? 'MAIN' : 'SECONDARY',
                isMain: branchData.isMain, // Legacy field
                status: 'ACTIVE',
                // Add minimal required fields for new branches
                contact: {
                  email: branchData.email,
                  phones: [],
                },
                operatingHours: {
                  monday: { open: '09:00', close: '18:00', closed: false },
                  tuesday: { open: '09:00', close: '18:00', closed: false },
                  wednesday: { open: '09:00', close: '18:00', closed: false },
                  thursday: { open: '09:00', close: '18:00', closed: false },
                  friday: { open: '09:00', close: '18:00', closed: false },
                  saturday: { open: '09:00', close: '18:00', closed: true },
                  sunday: { open: '09:00', close: '18:00', closed: true },
                },
                settings: {
                  timezone: 'Africa/Cairo',
                  currency: 'EGP',
                  language: 'ar',
                  allowOnlineBooking: false,
                  autoConfirmAppointments: false,
                  requireDepositForBooking: false,
                },
              },
            });
          })
        );
        
        logger.info(`Created ${resultBranches.length} new branches for company: ${companyId}`);
      }

      // Update setup progress
      const currentProgress = company.setupProgress as any || {};
      const currentData = company.setupData as any || {};

      const updatedProgress = {
        ...currentProgress,
        branches: true,
      };

      const updatedData = {
        ...currentData,
        branches,
      };

      await prisma.company.update({
        where: { id: companyId },
        data: {
          setupProgress: updatedProgress,
          setupData: updatedData,
        },
      });

      logger.info(`Branches saved for company: ${companyId}, count: ${resultBranches.length}`);
      return resultBranches;
    } catch (error) {
      logger.error('Error saving branches:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to save branches', 'BRANCHES_SAVE_ERROR');
    }
  }

  /**
   * Save team information step
   */
  async saveTeamInfo(companyId: string, data: TeamInfoData): Promise<Company> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { setupProgress: true, setupData: true },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const currentProgress = company.setupProgress as any || {};
      const currentData = company.setupData as any || {};

      const updatedProgress = {
        ...currentProgress,
        teamInfo: true,
      };

      const updatedData = {
        ...currentData,
        teamInfo: data,
      };

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          setupProgress: updatedProgress,
          setupData: updatedData,
          teamSize: data.teamSize,
        },
      });

      logger.info(`Team info saved for company: ${companyId}`);
      return updatedCompany;
    } catch (error) {
      logger.error('Error saving team info:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to save team information', 'TEAM_INFO_SAVE_ERROR');
    }
  }

  /**
   * Save theme selection step
   */
  async saveTheme(companyId: string, data: ThemeData): Promise<Company> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { setupProgress: true, setupData: true },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const currentProgress = company.setupProgress as any || {};
      const currentData = company.setupData as any || {};

      const updatedProgress = {
        ...currentProgress,
        theme: true,
      };

      const updatedData = {
        ...currentData,
        theme: data,
      };

      // Normalize theme field names (support both themeId and theme)
      const themeId = data.themeId || data.theme || data.id;

      const updateCompanyData: any = {
        setupProgress: updatedProgress,
        setupData: updatedData,
        selectedTheme: themeId,
      };

      // Update logo if provided
      if (data.logo) {
        updateCompanyData.logo = data.logo;
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: updateCompanyData,
      });

      logger.info(`Theme saved for company: ${companyId}`);
      return updatedCompany;
    } catch (error) {
      logger.error('Error saving theme:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to save theme', 'THEME_SAVE_ERROR');
    }
  }

  /**
   * Complete setup wizard
   */
  async completeSetup(companyId: string): Promise<Company> {
    try {
      const { progress } = await this.getSetupStatus(companyId);
      
      // Check if all steps are completed
      const allStepsCompleted = progress.businessInfo && 
                               progress.branches && 
                               progress.teamInfo && 
                               progress.theme;

      if (!allStepsCompleted) {
        throw new ApiError(400, 'Cannot complete setup: not all steps are finished', 'SETUP_INCOMPLETE');
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          setupCompleted: true,
          // Clear temporary setup data after completion
          setupData: {},
        },
      });

      logger.info(`Setup completed for company: ${companyId}`);
      return updatedCompany;
    } catch (error) {
      logger.error('Error completing setup:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to complete setup', 'SETUP_COMPLETE_ERROR');
    }
  }

  /**
   * Reset setup wizard (for testing or re-setup)
   */
  async resetSetup(companyId: string): Promise<Company> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          setupCompleted: false,
          setupProgress: {
            businessInfo: false,
            branches: false,
            teamInfo: false,
            theme: false,
          },
          setupData: {},
          teamSize: null,
          selectedTheme: null,
        },
      });

      logger.info(`Setup reset for company: ${companyId}`);
      return updatedCompany;
    } catch (error) {
      logger.error('Error resetting setup:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to reset setup', 'SETUP_RESET_ERROR');
    }
  }

  /**
   * Save step progress (draft save)
   * Saves partial progress for any setup step without validation
   */
  async saveStepProgress(companyId: string, step: number, data: any, timestamp?: string): Promise<void> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { setupData: true },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // Get existing setup data or initialize empty object
      const existingData = (company.setupData as any) || {};
      
      // Create step key based on step number
      const stepKeys = {
        1: 'businessInfo',
        2: 'branches', 
        3: 'teamInfo',
        4: 'theme',
      };
      
      const stepKey = stepKeys[step as keyof typeof stepKeys] || `step_${step}`;
      
      // Store the draft data with timestamp
      const updatedData = {
        ...existingData,
        [`${stepKey}_draft`]: {
          data,
          timestamp: timestamp || new Date().toISOString(),
          step,
        },
      };

      // Update the company's setup data
      await prisma.company.update({
        where: { id: companyId },
        data: { setupData: updatedData },
      });

      logger.info(`Step ${step} progress saved for company: ${companyId}`);
    } catch (error) {
      logger.error('Error saving step progress:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to save step progress', 'STEP_PROGRESS_SAVE_ERROR');
    }
  }
}

export const setupService = new SetupService();