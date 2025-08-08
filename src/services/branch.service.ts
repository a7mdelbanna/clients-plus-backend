import { PrismaClient, Branch, BranchType, BranchStatus } from '@prisma/client';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';
import { QueryParams } from '../types';

const prisma = new PrismaClient();

// Interface definitions based on Firebase implementation
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

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Contact {
  phones: PhoneNumber[];
  email?: string;
}

export interface OperatingHours {
  [day: string]: DaySchedule;
}

export interface CreateBranchData {
  name: string;
  type: BranchType;
  status?: BranchStatus;
  address: Address;
  phone?: string;
  email?: string;
  contact?: Contact;
  coordinates?: Coordinates;
  operatingHours?: OperatingHours;
  services?: string[];
  resources?: string[];
  staffIds?: string[];
  settings?: BranchSettings;
}

export interface UpdateBranchData extends Partial<CreateBranchData> {
  isActive?: boolean; // For legacy compatibility
}

export interface BranchQueryParams extends QueryParams {
  includeInactive?: boolean;
  type?: BranchType;
  status?: BranchStatus;
}

export class BranchService {
  /**
   * Create a new branch
   */
  async createBranch(companyId: string, data: CreateBranchData): Promise<Branch> {
    try {
      // Check if company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      // If this is being set as main branch, unset other main branches
      if (data.type === BranchType.MAIN) {
        await this.unsetMainBranches(companyId);
      }

      // Prepare contact data with legacy compatibility
      const legacyPhone = data.contact?.phones?.[0] 
        ? `${data.contact.phones[0].countryCode}${data.contact.phones[0].number}`
        : data.phone;

      const branch = await prisma.branch.create({
        data: {
          companyId,
          name: data.name,
          type: data.type,
          status: data.status || BranchStatus.ACTIVE,
          address: data.address as any,
          phone: legacyPhone,
          email: data.email || data.contact?.email,
          contact: data.contact as any,
          coordinates: data.coordinates as any,
          operatingHours: data.operatingHours as any,
          services: data.services || [],
          resources: data.resources || [],
          staffIds: data.staffIds || [],
          settings: data.settings as any,
          // Legacy fields for compatibility
          isMain: data.type === BranchType.MAIN,
          isActive: data.status !== BranchStatus.INACTIVE,
        },
      });

      logger.info(`Branch created: ${branch.name} (${branch.id}) for company ${companyId}`);
      return branch;
    } catch (error) {
      logger.error('Error creating branch:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create branch', 'BRANCH_CREATE_ERROR');
    }
  }

  /**
   * Get branch by ID
   */
  async getBranchById(companyId: string, branchId: string): Promise<Branch | null> {
    try {
      const branch = await prisma.branch.findFirst({
        where: { 
          id: branchId,
          companyId,
        },
        include: {
          _count: {
            select: {
              appointments: true,
              serviceBranches: true,
            },
          },
        },
      });

      return branch;
    } catch (error) {
      logger.error('Error fetching branch:', error);
      throw new ApiError(500, 'Failed to fetch branch', 'BRANCH_FETCH_ERROR');
    }
  }

  /**
   * Update branch
   */
  async updateBranch(companyId: string, branchId: string, data: UpdateBranchData): Promise<Branch> {
    try {
      // Check if branch exists
      const existingBranch = await this.getBranchById(companyId, branchId);
      if (!existingBranch) {
        throw new ApiError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
      }

      // If updating to main branch, unset other main branches
      if (data.type === BranchType.MAIN) {
        await this.unsetMainBranches(companyId, branchId);
      }

      // Prepare update data with legacy compatibility
      const updateData: any = { ...data };
      
      // Update legacy fields if new fields are being updated
      if (data.contact?.phones?.[0]) {
        updateData.phone = `${data.contact.phones[0].countryCode}${data.contact.phones[0].number}`;
      }
      if (data.type !== undefined) {
        updateData.isMain = data.type === BranchType.MAIN;
      }
      if (data.status !== undefined) {
        updateData.isActive = data.status === BranchStatus.ACTIVE;
      }

      const branch = await prisma.branch.update({
        where: { id: branchId },
        data: {
          ...updateData,
          // Cast JSON fields to any for Prisma compatibility
          address: updateData.address ? updateData.address as any : undefined,
          contact: updateData.contact ? updateData.contact as any : undefined,
          coordinates: updateData.coordinates ? updateData.coordinates as any : undefined,
          operatingHours: updateData.operatingHours ? updateData.operatingHours as any : undefined,
          settings: updateData.settings ? updateData.settings as any : undefined,
          updatedAt: new Date(),
        },
      });

      logger.info(`Branch updated: ${branch.name} (${branch.id})`);
      return branch;
    } catch (error) {
      logger.error('Error updating branch:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update branch', 'BRANCH_UPDATE_ERROR');
    }
  }

  /**
   * Delete branch (soft delete)
   */
  async deleteBranch(companyId: string, branchId: string): Promise<void> {
    try {
      const branch = await this.getBranchById(companyId, branchId);
      if (!branch) {
        throw new ApiError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
      }

      // Check if this is the main branch
      if (branch.type === BranchType.MAIN || branch.isMain) {
        throw new ApiError(400, 'Cannot delete the main branch', 'CANNOT_DELETE_MAIN_BRANCH');
      }

      // Soft delete by setting status to inactive
      await prisma.branch.update({
        where: { id: branchId },
        data: {
          status: BranchStatus.INACTIVE,
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info(`Branch deleted: ${branch.name} (${branch.id})`);
    } catch (error) {
      logger.error('Error deleting branch:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete branch', 'BRANCH_DELETE_ERROR');
    }
  }

  /**
   * List branches for a company
   */
  async getBranches(companyId: string, params: BranchQueryParams = {}): Promise<{ branches: Branch[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        includeInactive = false,
        type,
        status,
        sortBy = 'createdAt',
        sortOrder = 'asc',
      } = params;

      const skip = (page - 1) * limit;

      const where: any = { companyId };

      // Filter by status/activity
      if (!includeInactive) {
        where.AND = [
          { OR: [{ status: BranchStatus.ACTIVE }, { isActive: true }] }
        ];
      }

      // Filter by type
      if (type) {
        where.type = type;
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Search functionality
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [branches, total] = await Promise.all([
        prisma.branch.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            // Main branch always comes first
            { type: 'desc' }, // MAIN comes before SECONDARY in enum order
            { [sortBy]: sortOrder },
          ],
          include: {
            _count: {
              select: {
                appointments: true,
                serviceBranches: true,
              },
            },
          },
        }),
        prisma.branch.count({ where }),
      ]);

      return { branches, total };
    } catch (error) {
      logger.error('Error listing branches:', error);
      throw new ApiError(500, 'Failed to list branches', 'BRANCH_LIST_ERROR');
    }
  }

  /**
   * Set branch as default/main
   */
  async setDefaultBranch(companyId: string, branchId: string): Promise<Branch> {
    try {
      const branch = await this.getBranchById(companyId, branchId);
      if (!branch) {
        throw new ApiError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
      }

      // Unset other main branches first
      await this.unsetMainBranches(companyId, branchId);

      // Set this branch as main
      const updatedBranch = await prisma.branch.update({
        where: { id: branchId },
        data: {
          type: BranchType.MAIN,
          isMain: true,
          updatedAt: new Date(),
        },
      });

      logger.info(`Branch set as default: ${updatedBranch.name} (${updatedBranch.id})`);
      return updatedBranch;
    } catch (error) {
      logger.error('Error setting default branch:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to set default branch', 'SET_DEFAULT_BRANCH_ERROR');
    }
  }

  /**
   * Update operating hours
   */
  async updateOperatingHours(
    companyId: string, 
    branchId: string, 
    operatingHours: OperatingHours
  ): Promise<Branch> {
    try {
      const branch = await this.getBranchById(companyId, branchId);
      if (!branch) {
        throw new ApiError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
      }

      const updatedBranch = await prisma.branch.update({
        where: { id: branchId },
        data: {
          operatingHours: operatingHours as any,
          updatedAt: new Date(),
        },
      });

      logger.info(`Operating hours updated for branch: ${updatedBranch.name} (${updatedBranch.id})`);
      return updatedBranch;
    } catch (error) {
      logger.error('Error updating operating hours:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update operating hours', 'UPDATE_OPERATING_HOURS_ERROR');
    }
  }

  /**
   * Assign staff to a branch
   */
  async assignStaffToBranch(companyId: string, branchId: string, staffIds: string[]): Promise<Branch> {
    try {
      const branch = await this.getBranchById(companyId, branchId);
      if (!branch) {
        throw new ApiError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
      }

      // Use transaction to manage staff-branch assignments
      await prisma.$transaction(async (tx) => {
        // Remove existing staff-branch assignments for this branch
        await tx.staffBranch.deleteMany({
          where: { branchId },
        });

        // Create new staff-branch assignments
        if (staffIds.length > 0) {
          const staffBranchData = staffIds.map(staffId => ({
            staffId,
            branchId,
            companyId,
            isActive: true,
          }));

          await tx.staffBranch.createMany({
            data: staffBranchData,
          });
        }

        // Update branch with staff IDs for compatibility
        await tx.branch.update({
          where: { id: branchId },
          data: {
            staffIds,
            updatedAt: new Date(),
          },
        });
      });

      const updatedBranch = await this.getBranchById(companyId, branchId);
      logger.info(`Staff assigned to branch: ${updatedBranch?.name} (${updatedBranch?.id})`);
      return updatedBranch!;
    } catch (error) {
      logger.error('Error assigning staff to branch:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to assign staff to branch', 'ASSIGN_STAFF_ERROR');
    }
  }

  /**
   * Assign services to a branch
   */
  async assignServicesToBranch(companyId: string, branchId: string, serviceIds: string[]): Promise<Branch> {
    try {
      const branch = await this.getBranchById(companyId, branchId);
      if (!branch) {
        throw new ApiError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
      }

      const updatedBranch = await prisma.branch.update({
        where: { id: branchId },
        data: {
          services: serviceIds,
          updatedAt: new Date(),
        },
      });

      logger.info(`Services assigned to branch: ${updatedBranch.name} (${updatedBranch.id})`);
      return updatedBranch;
    } catch (error) {
      logger.error('Error assigning services to branch:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to assign services to branch', 'ASSIGN_SERVICES_ERROR');
    }
  }

  /**
   * Assign resources to a branch
   */
  async assignResourcesToBranch(companyId: string, branchId: string, resourceIds: string[]): Promise<Branch> {
    try {
      const branch = await this.getBranchById(companyId, branchId);
      if (!branch) {
        throw new ApiError(404, 'Branch not found', 'BRANCH_NOT_FOUND');
      }

      const updatedBranch = await prisma.branch.update({
        where: { id: branchId },
        data: {
          resources: resourceIds,
          updatedAt: new Date(),
        },
      });

      logger.info(`Resources assigned to branch: ${updatedBranch.name} (${updatedBranch.id})`);
      return updatedBranch;
    } catch (error) {
      logger.error('Error assigning resources to branch:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to assign resources to branch', 'ASSIGN_RESOURCES_ERROR');
    }
  }

  /**
   * Get branch count for a company
   */
  async getBranchCount(companyId: string): Promise<number> {
    try {
      return await prisma.branch.count({
        where: { 
          companyId, 
          OR: [
            { status: BranchStatus.ACTIVE },
            { isActive: true }
          ]
        },
      });
    } catch (error) {
      logger.error('Error getting branch count:', error);
      throw new ApiError(500, 'Failed to get branch count', 'BRANCH_COUNT_ERROR');
    }
  }

  /**
   * Check if company can add more branches based on plan
   */
  async canAddBranch(companyId: string, planType: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM' = 'BASIC'): Promise<boolean> {
    try {
      const currentCount = await this.getBranchCount(companyId);
      
      const limits = {
        BASIC: 3,
        PROFESSIONAL: 5,
        ENTERPRISE: Infinity,
        CUSTOM: Infinity,
      };
      
      return currentCount < limits[planType];
    } catch (error) {
      logger.error('Error checking branch limit:', error);
      throw new ApiError(500, 'Failed to check branch limit', 'BRANCH_LIMIT_CHECK_ERROR');
    }
  }

  /**
   * Private method to unset main branches
   */
  private async unsetMainBranches(companyId: string, excludeBranchId?: string): Promise<void> {
    const where: any = { 
      companyId,
      OR: [
        { type: BranchType.MAIN },
        { isMain: true }
      ]
    };

    if (excludeBranchId) {
      where.id = { not: excludeBranchId };
    }

    await prisma.branch.updateMany({
      where,
      data: {
        type: BranchType.SECONDARY,
        isMain: false,
        updatedAt: new Date(),
      },
    });
  }
}

export const branchService = new BranchService();