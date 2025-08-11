import { PrismaClient, Company, SubscriptionPlan, SubscriptionStatus, BillingCycle, Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';
import { QueryParams } from '../types';

const prisma = new PrismaClient();

export interface CreateCompanyData {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  address?: any;
  logo?: string;
  businessType?: string;
  taxId?: string;
  registrationNumber?: string;
  subscriptionPlan?: SubscriptionPlan;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {
  subscriptionStatus?: SubscriptionStatus;
  billingCycle?: BillingCycle;
  isActive?: boolean;
}

export class CompanyService {
  /**
   * Create a new company
   */
  async createCompany(data: CreateCompanyData): Promise<Company> {
    try {
      // Check if company with email already exists
      const existingCompany = await prisma.company.findUnique({
        where: { email: data.email },
      });

      if (existingCompany) {
        throw new ApiError(409, 'Company with this email already exists', 'COMPANY_EXISTS');
      }

      const company = await prisma.company.create({
        data: {
          ...data,
          subscriptionPlan: data.subscriptionPlan || SubscriptionPlan.BASIC,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionStartDate: new Date(),
          billingCycle: BillingCycle.MONTHLY,
          timezone: data.timezone || 'UTC',
          currency: data.currency || 'USD',
          dateFormat: data.dateFormat || 'MM/dd/yyyy',
          timeFormat: data.timeFormat || '12h',
          isActive: true,
        },
      });

      logger.info(`Company created: ${company.name} (${company.id})`);
      return company;
    } catch (error) {
      logger.error('Error creating company:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create company', 'COMPANY_CREATE_ERROR');
    }
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: string): Promise<Company | null> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          _count: {
            select: {
              users: true,
              branches: true,
              clients: true,
              staff: true,
            },
          },
        },
      });

      return company;
    } catch (error) {
      logger.error('Error fetching company:', error);
      throw new ApiError(500, 'Failed to fetch company', 'COMPANY_FETCH_ERROR');
    }
  }

  /**
   * Update company
   */
  async updateCompany(companyId: string, data: UpdateCompanyData): Promise<Company> {
    try {
      // Check if company exists
      const existingCompany = await this.getCompanyById(companyId);
      if (!existingCompany) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingCompany.email) {
        const emailExists = await prisma.company.findUnique({
          where: { email: data.email },
        });
        if (emailExists) {
          throw new ApiError(409, 'Email already in use', 'EMAIL_EXISTS');
        }
      }

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.info(`Company updated: ${company.name} (${company.id})`);
      return company;
    } catch (error) {
      logger.error('Error updating company:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update company', 'COMPANY_UPDATE_ERROR');
    }
  }

  /**
   * List all companies (super admin only)
   */
  async listCompanies(params: QueryParams): Promise<{ companies: Company[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                users: true,
                branches: true,
                clients: true,
                staff: true,
              },
            },
          },
        }),
        prisma.company.count({ where }),
      ]);

      return { companies, total };
    } catch (error) {
      logger.error('Error listing companies:', error);
      throw new ApiError(500, 'Failed to list companies', 'COMPANY_LIST_ERROR');
    }
  }

  /**
   * Delete company (soft delete)
   */
  async deleteCompany(companyId: string): Promise<void> {
    try {
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // Soft delete by setting isActive to false
      await prisma.company.update({
        where: { id: companyId },
        data: {
          isActive: false,
          subscriptionStatus: SubscriptionStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });

      // Also deactivate all users
      await prisma.user.updateMany({
        where: { companyId },
        data: { isActive: false },
      });

      logger.info(`Company deleted: ${company.name} (${company.id})`);
    } catch (error) {
      logger.error('Error deleting company:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete company', 'COMPANY_DELETE_ERROR');
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    companyId: string,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle
  ): Promise<Company> {
    try {
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const endDate = new Date();
      if (billingCycle === BillingCycle.MONTHLY) {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (billingCycle === BillingCycle.YEARLY) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionPlan: plan,
          billingCycle,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: endDate,
          updatedAt: new Date(),
        },
      });

      logger.info(`Subscription updated for company: ${company.name} (${company.id})`);
      return updatedCompany;
    } catch (error) {
      logger.error('Error updating subscription:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update subscription', 'SUBSCRIPTION_UPDATE_ERROR');
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(companyId: string): Promise<any> {
    try {
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const [users, branches, clients, staff, appointments, invoices] = await Promise.all([
        prisma.user.count({ where: { companyId, isActive: true } }),
        prisma.branch.count({ where: { companyId, isActive: true } }),
        prisma.client.count({ where: { companyId, isActive: true } }),
        prisma.staff.count({ where: { companyId, isActive: true } }),
        prisma.appointment.count({ where: { companyId } }),
        prisma.invoice.count({ where: { companyId } }),
      ]);

      return {
        users,
        branches,
        clients,
        staff,
        appointments,
        invoices,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionEndDate: company.subscriptionEndDate,
      };
    } catch (error) {
      logger.error('Error fetching company stats:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch company statistics', 'STATS_FETCH_ERROR');
    }
  }

  /**
   * Get company settings
   */
  async getCompanySettings(companyId: string): Promise<any> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          timezone: true,
          currency: true,
          dateFormat: true,
          timeFormat: true,
          businessType: true,
          setupCompleted: true,
          setupProgress: true,
          teamSize: true,
          selectedTheme: true,
        },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // Get company settings from CompanySetting model
      const settings = await prisma.companySetting.findMany({
        where: { companyId },
      });

      // Convert settings array to object
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as any);

      return {
        ...company,
        settings: settingsMap,
      };
    } catch (error) {
      logger.error('Error fetching company settings:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch company settings', 'SETTINGS_FETCH_ERROR');
    }
  }

  /**
   * Update company settings
   */
  async updateCompanySettings(companyId: string, data: any): Promise<any> {
    try {
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // Update basic company fields
      const companyUpdateData: any = {};
      if (data.timezone) companyUpdateData.timezone = data.timezone;
      if (data.currency) companyUpdateData.currency = data.currency;
      if (data.dateFormat) companyUpdateData.dateFormat = data.dateFormat;
      if (data.timeFormat) companyUpdateData.timeFormat = data.timeFormat;
      if (data.businessType) companyUpdateData.businessType = data.businessType;
      if (data.teamSize) companyUpdateData.teamSize = data.teamSize;
      if (data.selectedTheme) companyUpdateData.selectedTheme = data.selectedTheme;

      // Update company if there are basic fields to update
      if (Object.keys(companyUpdateData).length > 0) {
        await prisma.company.update({
          where: { id: companyId },
          data: {
            ...companyUpdateData,
            updatedAt: new Date(),
          },
        });
      }

      // Update settings in CompanySetting model
      if (data.settings) {
        for (const [key, value] of Object.entries(data.settings)) {
          await prisma.companySetting.upsert({
            where: {
              companyId_key: {
                companyId,
                key,
              },
            },
            update: {
              value: value as Prisma.InputJsonValue,
              updatedAt: new Date(),
            },
            create: {
              companyId,
              key,
              value: value as Prisma.InputJsonValue,
            },
          });
        }
      }

      return await this.getCompanySettings(companyId);
    } catch (error) {
      logger.error('Error updating company settings:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update company settings', 'SETTINGS_UPDATE_ERROR');
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(companyId: string): Promise<any> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          website: true,
          address: true,
          logo: true,
          businessType: true,
          taxId: true,
          registrationNumber: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      return company;
    } catch (error) {
      logger.error('Error fetching company profile:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch company profile', 'PROFILE_FETCH_ERROR');
    }
  }

  /**
   * Update company profile
   */
  async updateCompanyProfile(companyId: string, data: any): Promise<any> {
    try {
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // Check if email is being updated and ensure uniqueness
      if (data.email && data.email !== company.email) {
        const emailExists = await prisma.company.findUnique({
          where: { email: data.email },
        });
        if (emailExists) {
          throw new ApiError(409, 'Email already in use', 'EMAIL_EXISTS');
        }
      }

      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          businessType: data.businessType,
          taxId: data.taxId,
          registrationNumber: data.registrationNumber,
          updatedAt: new Date(),
        },
      });

      return await this.getCompanyProfile(companyId);
    } catch (error) {
      logger.error('Error updating company profile:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update company profile', 'PROFILE_UPDATE_ERROR');
    }
  }

  /**
   * Upload company logo
   */
  async uploadCompanyLogo(companyId: string, file: Express.Multer.File): Promise<string> {
    try {
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // Here you would implement actual file upload logic
      // For now, we'll simulate a file path
      const logoUrl = `/uploads/companies/${companyId}/logo-${Date.now()}-${file.originalname}`;

      // Update company with new logo URL
      await prisma.company.update({
        where: { id: companyId },
        data: {
          logo: logoUrl,
          updatedAt: new Date(),
        },
      });

      logger.info(`Company logo updated: ${company.name} (${company.id})`);
      return logoUrl;
    } catch (error) {
      logger.error('Error uploading company logo:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to upload company logo', 'LOGO_UPLOAD_ERROR');
    }
  }

  /**
   * Get company subscription details
   */
  async getCompanySubscription(companyId: string): Promise<any> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionStartDate: true,
          subscriptionEndDate: true,
          billingCycle: true,
        },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      return company;
    } catch (error) {
      logger.error('Error fetching company subscription:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch company subscription', 'SUBSCRIPTION_FETCH_ERROR');
    }
  }

  /**
   * Update company subscription details
   */
  async updateCompanySubscription(companyId: string, data: any): Promise<any> {
    try {
      const company = await this.getCompanyById(companyId);
      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      const updateData: any = {};
      if (data.subscriptionPlan) updateData.subscriptionPlan = data.subscriptionPlan;
      if (data.subscriptionStatus) updateData.subscriptionStatus = data.subscriptionStatus;
      if (data.billingCycle) updateData.billingCycle = data.billingCycle;

      // Calculate end date based on billing cycle
      if (data.billingCycle) {
        const endDate = new Date();
        if (data.billingCycle === BillingCycle.MONTHLY) {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (data.billingCycle === BillingCycle.YEARLY) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        updateData.subscriptionEndDate = endDate;
        updateData.subscriptionStartDate = new Date();
      }

      await prisma.company.update({
        where: { id: companyId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      return await this.getCompanySubscription(companyId);
    } catch (error) {
      logger.error('Error updating company subscription:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update company subscription', 'SUBSCRIPTION_UPDATE_ERROR');
    }
  }
}

export const companyService = new CompanyService();