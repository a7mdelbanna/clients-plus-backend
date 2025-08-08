import { PrismaClient, Company, SubscriptionPlan, SubscriptionStatus, BillingCycle } from '@prisma/client';
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
}

export const companyService = new CompanyService();