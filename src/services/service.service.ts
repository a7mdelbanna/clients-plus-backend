import { PrismaClient, Service, ServiceCategory, StaffService, Prisma, ServiceType } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

// Enhanced interfaces to match Firebase functionality
export interface ServiceDuration {
  hours: number;
  minutes: number;
}

export interface ServicePriceRange {
  min: number;
  max: number;
}

export interface ServiceTranslations {
  en?: string;
  fr?: string;
  [key: string]: string | undefined;
}

export interface ServiceOnlineBooking {
  enabled: boolean;
  displayName?: string;
  description?: string;
  translations?: ServiceTranslations;
  prepaymentRequired?: boolean;
  membershipRequired?: boolean;
  availabilityPeriod?: number; // days
}

export interface ServiceImage {
  url: string;
  isDefault: boolean;
  uploadedAt: string;
  name?: string;
}

export interface ExtendedService {
  id?: string;
  companyId: string;
  categoryId?: string;
  
  // Basic information - Enhanced to match Firebase
  name: string; // Primary name (Arabic)
  nameAr?: string; // Deprecated - kept for backward compatibility
  description?: string;
  descriptionAr?: string;
  
  // Multi-language support
  translations?: ServiceTranslations;
  
  // Branch assignments - Enhanced multi-branch support
  branchId?: string; // Deprecated - kept for backward compatibility
  branchIds?: string[]; // Multiple branch assignments
  
  // Pricing - Enhanced pricing structure
  startingPrice: number; // Base price
  priceRange?: ServicePriceRange;
  
  // Duration - Enhanced structure
  duration: ServiceDuration;
  
  // Service type and API integration
  type: ServiceType;
  apiId?: string; // External API integration
  
  // Online booking settings - Enhanced
  onlineBooking: ServiceOnlineBooking;
  
  // Images and media
  images?: ServiceImage[];
  
  // Advanced service options
  invoiceName?: string; // Custom invoice name
  taxSystem?: string; // Tax system configuration
  vat?: number; // VAT rate
  followUpDays?: number; // Follow-up period in days
  autoDeduction?: boolean; // Automatic inventory deduction
  
  // Display and ordering
  color?: string; // For calendar and UI display
  order?: number; // Display order
  
  // Status
  active: boolean;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string; // User who created the service
}

export interface ExtendedServiceCategory {
  id?: string;
  companyId: string;
  
  // Branch assignment for multi-branch support
  branchId?: string;
  
  // Basic information
  name: string;
  nameAr?: string;
  
  // Online booking customization
  useOnlineBookingName?: boolean;
  onlineBookingName?: string;
  
  // Category metadata
  servicesCount?: number; // Cached count
  description?: string;
  color?: string; // For UI display
  icon?: string; // Icon identifier
  order?: number; // Display order
  
  // Status
  active: boolean;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string; // User who created the category
}

export interface ServiceStaffAssignment {
  staffId: string;
  price?: number; // Override service price
  duration?: ServiceDuration; // Override service duration
  billOfMaterials?: string;
}

export interface ServiceFilter {
  categoryId?: string;
  branchId?: string;
  type?: ServiceType;
  active?: boolean;
  onlineBookingOnly?: boolean;
  searchTerm?: string;
  priceRange?: { min?: number; max?: number };
  sortBy?: 'name' | 'createdAt' | 'price' | 'order';
  sortDirection?: 'asc' | 'desc';
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ServiceService {
  /**
   * Helper function to get service name in preferred language
   */
  getServiceName(service: ExtendedService, language: string = 'ar'): string {
    if (language === 'ar') {
      return service.name;
    }
    
    // Check translations
    if (service.translations && service.translations[language]) {
      return service.translations[language]!;
    }
    
    // Fallback to Arabic name
    return service.name;
  }

  /**
   * Helper function to get service description in preferred language
   */
  getServiceDescription(service: ExtendedService, language: string = 'ar'): string | undefined {
    if (language === 'ar') {
      return service.onlineBooking.description;
    }
    
    // Check translations
    if (service.onlineBooking.translations && service.onlineBooking.translations[language]) {
      return service.onlineBooking.translations[language];
    }
    
    // Fallback to Arabic description
    return service.onlineBooking.description;
  }

  /**
   * Convert Prisma service to extended service
   */
  private convertToExtendedService(prismaService: Service & { category?: ServiceCategory | null }): ExtendedService {
    return {
      id: prismaService.id,
      companyId: prismaService.companyId,
      categoryId: prismaService.categoryId || undefined,
      name: prismaService.name,
      nameAr: prismaService.nameAr || undefined,
      description: prismaService.description || undefined,
      descriptionAr: prismaService.descriptionAr || undefined,
      translations: prismaService.translations ? prismaService.translations as unknown as ServiceTranslations : undefined,
      branchId: prismaService.branchId || undefined,
      branchIds: prismaService.branchIds,
      startingPrice: parseFloat(prismaService.startingPrice.toString()),
      priceRange: prismaService.priceRange ? prismaService.priceRange as unknown as ServicePriceRange : undefined,
      duration: prismaService.duration as unknown as ServiceDuration,
      type: prismaService.type,
      apiId: prismaService.apiId || undefined,
      onlineBooking: prismaService.onlineBooking as unknown as ServiceOnlineBooking,
      images: prismaService.images ? prismaService.images as unknown as ServiceImage[] : undefined,
      invoiceName: prismaService.invoiceName || undefined,
      taxSystem: prismaService.taxSystem || undefined,
      vat: prismaService.vat ? parseFloat(prismaService.vat.toString()) : undefined,
      followUpDays: prismaService.followUpDays || undefined,
      autoDeduction: prismaService.autoDeduction,
      color: prismaService.color || undefined,
      order: prismaService.order,
      active: prismaService.active,
      createdAt: prismaService.createdAt,
      updatedAt: prismaService.updatedAt,
      createdBy: prismaService.createdBy || undefined,
    };
  }

  /**
   * Convert extended service to Prisma data
   */
  private convertToPrismaServiceData(serviceData: Partial<ExtendedService>): Prisma.ServiceCreateInput | Prisma.ServiceUpdateInput {
    const data: any = {
      name: serviceData.name,
      nameAr: serviceData.nameAr || null,
      description: serviceData.description || null,
      descriptionAr: serviceData.descriptionAr || null,
      translations: serviceData.translations || null,
      branchId: serviceData.branchId || null,
      branchIds: serviceData.branchIds || [],
      startingPrice: serviceData.startingPrice,
      priceRange: serviceData.priceRange || null,
      duration: serviceData.duration,
      type: serviceData.type || ServiceType.APPOINTMENT,
      apiId: serviceData.apiId || null,
      onlineBooking: serviceData.onlineBooking,
      images: serviceData.images || null,
      invoiceName: serviceData.invoiceName || null,
      taxSystem: serviceData.taxSystem || null,
      vat: serviceData.vat || null,
      followUpDays: serviceData.followUpDays || null,
      autoDeduction: serviceData.autoDeduction || false,
      color: serviceData.color || null,
      order: serviceData.order || 0,
      active: serviceData.active !== undefined ? serviceData.active : true,
      createdBy: serviceData.createdBy || null,
    };

    return data;
  }

  /**
   * Convert Prisma category to extended category
   */
  private convertToExtendedCategory(prismaCategory: ServiceCategory): ExtendedServiceCategory {
    return {
      id: prismaCategory.id,
      companyId: prismaCategory.companyId,
      branchId: prismaCategory.branchId || undefined,
      name: prismaCategory.name,
      nameAr: prismaCategory.nameAr || undefined,
      useOnlineBookingName: prismaCategory.useOnlineBookingName,
      onlineBookingName: prismaCategory.onlineBookingName || undefined,
      servicesCount: prismaCategory.servicesCount,
      description: prismaCategory.description || undefined,
      color: prismaCategory.color || undefined,
      icon: prismaCategory.icon || undefined,
      order: prismaCategory.order,
      active: prismaCategory.active,
      createdAt: prismaCategory.createdAt,
      updatedAt: prismaCategory.updatedAt,
      createdBy: prismaCategory.createdBy || undefined,
    };
  }

  /**
   * Convert extended category to Prisma data
   */
  private convertToPrismaCategoryData(categoryData: Partial<ExtendedServiceCategory>): Prisma.ServiceCategoryCreateInput | Prisma.ServiceCategoryUpdateInput {
    const data: any = {
      name: categoryData.name,
      nameAr: categoryData.nameAr || null,
      branchId: categoryData.branchId || null,
      useOnlineBookingName: categoryData.useOnlineBookingName || false,
      onlineBookingName: categoryData.onlineBookingName || null,
      servicesCount: categoryData.servicesCount || 0,
      description: categoryData.description || null,
      color: categoryData.color || null,
      icon: categoryData.icon || null,
      order: categoryData.order || 0,
      active: categoryData.active !== undefined ? categoryData.active : true,
      createdBy: categoryData.createdBy || null,
    };

    return data;
  }

  /**
   * Create a service category
   */
  async createCategory(categoryData: Omit<ExtendedServiceCategory, 'id'>, userId: string): Promise<string> {
    try {
      const prismaData = this.convertToPrismaCategoryData({
        ...categoryData,
        servicesCount: 0,
        createdBy: userId,
      }) as Prisma.ServiceCategoryCreateInput;

      prismaData.company = { connect: { id: categoryData.companyId } };

      const category = await prisma.serviceCategory.create({
        data: prismaData,
      });

      logger.info(`Service category created successfully: ${category.id}`);
      return category.id;
    } catch (error) {
      logger.error('Error creating service category:', error);
      throw error;
    }
  }

  /**
   * Get service categories
   */
  async getCategories(companyId: string, branchId?: string): Promise<ExtendedServiceCategory[]> {
    try {
      const where: Prisma.ServiceCategoryWhereInput = {
        companyId,
        active: true,
      };

      if (branchId) {
        where.OR = [
          { branchId },
          { branchId: null }, // Include company-wide categories
        ];
      }

      const categories = await prisma.serviceCategory.findMany({
        where,
        orderBy: [
          { order: 'asc' },
          { name: 'asc' },
        ],
      });

      return categories.map(category => this.convertToExtendedCategory(category));
    } catch (error) {
      logger.error('Error getting service categories:', error);
      throw error;
    }
  }

  /**
   * Update service category
   */
  async updateCategory(categoryId: string, updates: Partial<ExtendedServiceCategory>, companyId: string): Promise<void> {
    try {
      const prismaData = this.convertToPrismaCategoryData(updates) as Prisma.ServiceCategoryUpdateInput;

      await prisma.serviceCategory.updateMany({
        where: {
          id: categoryId,
          companyId,
        },
        data: prismaData,
      });

      logger.info(`Service category updated successfully: ${categoryId}`);
    } catch (error) {
      logger.error('Error updating service category:', error);
      throw error;
    }
  }

  /**
   * Delete service category (soft delete)
   */
  async deleteCategory(categoryId: string, companyId: string): Promise<void> {
    try {
      await prisma.serviceCategory.updateMany({
        where: {
          id: categoryId,
          companyId,
        },
        data: {
          active: false,
        },
      });

      logger.info(`Service category soft deleted successfully: ${categoryId}`);
    } catch (error) {
      logger.error('Error deleting service category:', error);
      throw error;
    }
  }

  /**
   * Create a service
   */
  async createService(serviceData: Omit<ExtendedService, 'id'>, userId: string, branchId?: string): Promise<string> {
    try {
      const prismaData = this.convertToPrismaServiceData({
        ...serviceData,
        branchId: branchId || serviceData.branchId,
        createdBy: userId,
      }) as Prisma.ServiceCreateInput;

      prismaData.company = { connect: { id: serviceData.companyId } };

      if (serviceData.categoryId) {
        prismaData.category = { connect: { id: serviceData.categoryId } };
      }

      const service = await prisma.service.create({
        data: prismaData,
      });

      // Update category service count
      if (serviceData.categoryId) {
        await this.updateCategoryServiceCount(serviceData.categoryId, 1);
      }

      logger.info(`Service created successfully: ${service.id}`);
      return service.id;
    } catch (error) {
      logger.error('Error creating service:', error);
      throw error;
    }
  }

  /**
   * Get services with filtering and pagination
   */
  async getServices(
    companyId: string, 
    filter?: ServiceFilter, 
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ExtendedService>> {
    try {
      const page = pagination?.page || 1;
      const limit = Math.min(pagination?.limit || 10, 100);
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ServiceWhereInput = {
        companyId,
        active: filter?.active !== undefined ? filter.active : true,
      };

      // Category filter
      if (filter?.categoryId) {
        where.categoryId = filter.categoryId;
      }

      // Type filter
      if (filter?.type) {
        where.type = filter.type;
      }

      // Search filter
      if (filter?.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { invoiceName: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      // Price range filter
      if (filter?.priceRange) {
        where.startingPrice = {};
        if (filter.priceRange.min !== undefined) {
          where.startingPrice.gte = filter.priceRange.min;
        }
        if (filter.priceRange.max !== undefined) {
          where.startingPrice.lte = filter.priceRange.max;
        }
      }

      // Online booking filter
      if (filter?.onlineBookingOnly) {
        // This would need to be implemented as a JSON query
        // For now, we'll filter client-side
      }

      // Build orderBy
      const orderBy: Prisma.ServiceOrderByWithRelationInput[] = [];
      
      if (filter?.sortBy) {
        switch (filter.sortBy) {
          case 'name':
            orderBy.push({ name: filter.sortDirection || 'asc' });
            break;
          case 'createdAt':
            orderBy.push({ createdAt: filter.sortDirection || 'desc' });
            break;
          case 'price':
            orderBy.push({ startingPrice: filter.sortDirection || 'asc' });
            break;
          case 'order':
            orderBy.push({ order: filter.sortDirection || 'asc' });
            break;
          default:
            orderBy.push({ order: 'asc' }, { name: 'asc' });
        }
      } else {
        orderBy.push({ order: 'asc' }, { name: 'asc' });
      }

      // Execute queries
      const [services, total] = await Promise.all([
        prisma.service.findMany({
          where,
          include: {
            category: true,
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.service.count({ where }),
      ]);

      let extendedServices = services.map(service => this.convertToExtendedService(service));

      // Apply client-side filters
      if (filter) {
        // Branch filter (client-side to handle both legacy and new data)
        if (filter.branchId) {
          extendedServices = extendedServices.filter(s => {
            // Check new branchIds array first
            if (s.branchIds && s.branchIds.length > 0) {
              return s.branchIds.includes(filter.branchId!);
            }
            // Fall back to legacy single branchId
            if (s.branchId) {
              return s.branchId === filter.branchId;
            }
            // Include services with no branch assignment (company-wide services)
            return !s.branchId && (!s.branchIds || s.branchIds.length === 0);
          });
        }

        // Online booking filter
        if (filter.onlineBookingOnly) {
          extendedServices = extendedServices.filter(s => s.onlineBooking.enabled);
        }
      }

      const pages = Math.ceil(total / limit);
      const hasNext = page < pages;
      const hasPrev = page > 1;

      return {
        data: extendedServices,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      logger.error('Error getting services:', error);
      throw error;
    }
  }

  /**
   * Get a single service
   */
  async getService(serviceId: string, companyId: string): Promise<ExtendedService | null> {
    try {
      const service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          companyId,
        },
        include: {
          category: true,
        },
      });

      if (!service) {
        return null;
      }

      return this.convertToExtendedService(service);
    } catch (error) {
      logger.error('Error getting service:', error);
      throw error;
    }
  }

  /**
   * Update service
   */
  async updateService(serviceId: string, updates: Partial<ExtendedService>, companyId: string): Promise<void> {
    try {
      const prismaData = this.convertToPrismaServiceData(updates) as Prisma.ServiceUpdateInput;

      // Handle category change
      if (updates.categoryId !== undefined) {
        const currentService = await this.getService(serviceId, companyId);
        
        if (currentService) {
          // Decrement old category count
          if (currentService.categoryId) {
            await this.updateCategoryServiceCount(currentService.categoryId, -1);
          }
          
          // Increment new category count
          if (updates.categoryId) {
            await this.updateCategoryServiceCount(updates.categoryId, 1);
            prismaData.category = { connect: { id: updates.categoryId } };
          } else {
            prismaData.category = { disconnect: true };
          }
        }
      }

      await prisma.service.updateMany({
        where: {
          id: serviceId,
          companyId,
        },
        data: prismaData,
      });

      logger.info(`Service updated successfully: ${serviceId}`);
    } catch (error) {
      logger.error('Error updating service:', error);
      throw error;
    }
  }

  /**
   * Delete service (soft delete)
   */
  async deleteService(serviceId: string, companyId: string): Promise<void> {
    try {
      const service = await this.getService(serviceId, companyId);
      
      if (service) {
        await prisma.service.updateMany({
          where: {
            id: serviceId,
            companyId,
          },
          data: {
            active: false,
          },
        });

        // Update category service count
        if (service.categoryId) {
          await this.updateCategoryServiceCount(service.categoryId, -1);
        }
      }

      logger.info(`Service soft deleted successfully: ${serviceId}`);
    } catch (error) {
      logger.error('Error deleting service:', error);
      throw error;
    }
  }

  /**
   * Assign staff to service
   */
  async assignStaffToService(serviceId: string, companyId: string, staff: ServiceStaffAssignment[]): Promise<void> {
    try {
      // Verify service exists
      const service = await this.getService(serviceId, companyId);
      if (!service) {
        throw new Error('Service not found');
      }

      // Delete existing staff assignments
      await prisma.staffService.deleteMany({
        where: { serviceId },
      });

      // Add new staff assignments
      const staffAssignments: any[] = staff.map(s => ({
        serviceId,
        staffId: s.staffId,
        price: s.price || null,
        duration: s.duration || null,
        billOfMaterials: s.billOfMaterials || null,
      }));

      if (staffAssignments.length > 0) {
        await prisma.staffService.createMany({
          data: staffAssignments,
        });
      }

      logger.info(`Staff assigned to service successfully: ${serviceId}`);
    } catch (error) {
      logger.error('Error assigning staff to service:', error);
      throw error;
    }
  }

  /**
   * Get service staff assignments
   */
  async getServiceStaff(serviceId: string, companyId: string): Promise<ServiceStaffAssignment[]> {
    try {
      // Verify service exists
      const service = await this.getService(serviceId, companyId);
      if (!service) {
        throw new Error('Service not found');
      }

      const staffAssignments = await prisma.staffService.findMany({
        where: {
          serviceId,
          isActive: true,
        },
        include: {
          staff: true,
        },
      });

      return staffAssignments.map(assignment => ({
        staffId: assignment.staffId,
        price: assignment.price ? parseFloat(assignment.price.toString()) : undefined,
        duration: assignment.duration ? assignment.duration as unknown as ServiceDuration : undefined,
        billOfMaterials: assignment.billOfMaterials || undefined,
      }));
    } catch (error) {
      logger.error('Error getting service staff:', error);
      throw error;
    }
  }

  /**
   * Get services by staff member
   */
  async getServicesByStaff(staffId: string, companyId: string): Promise<ExtendedService[]> {
    try {
      const staffServices = await prisma.staffService.findMany({
        where: {
          staffId,
          isActive: true,
          service: {
            companyId,
            active: true,
          },
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
      });

      return staffServices.map(ss => this.convertToExtendedService(ss.service));
    } catch (error) {
      logger.error('Error getting services by staff:', error);
      throw error;
    }
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(categoryId: string, companyId: string): Promise<ExtendedService[]> {
    try {
      const services = await prisma.service.findMany({
        where: {
          categoryId,
          companyId,
          active: true,
        },
        include: {
          category: true,
        },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' },
        ],
      });

      return services.map(service => this.convertToExtendedService(service));
    } catch (error) {
      logger.error('Error getting services by category:', error);
      throw error;
    }
  }

  /**
   * Get online bookable services
   */
  async getOnlineBookableServices(companyId: string, branchId?: string): Promise<ExtendedService[]> {
    try {
      const result = await this.getServices(companyId, {
        active: true,
        onlineBookingOnly: true,
        branchId,
      });

      return result.data;
    } catch (error) {
      logger.error('Error getting online bookable services:', error);
      throw error;
    }
  }

  /**
   * Reorder services
   */
  async reorderServices(serviceIds: string[], companyId: string): Promise<void> {
    try {
      const updates = serviceIds.map((serviceId, index) => 
        prisma.service.updateMany({
          where: {
            id: serviceId,
            companyId,
          },
          data: {
            order: index,
          },
        })
      );

      await Promise.all(updates);

      logger.info('Services reordered successfully');
    } catch (error) {
      logger.error('Error reordering services:', error);
      throw error;
    }
  }

  /**
   * Update category service count (helper method)
   */
  private async updateCategoryServiceCount(categoryId: string, change: number): Promise<void> {
    try {
      const category = await prisma.serviceCategory.findUnique({
        where: { id: categoryId },
      });

      if (category) {
        const newCount = Math.max(0, category.servicesCount + change);
        await prisma.serviceCategory.update({
          where: { id: categoryId },
          data: { servicesCount: newCount },
        });
      }
    } catch (error) {
      logger.error('Error updating category service count:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get all services for a company (for autocomplete)
   */
  async getAllServices(companyId: string): Promise<ExtendedService[]> {
    try {
      const result = await this.getServices(companyId, { active: true }, { limit: 1000 });
      return result.data;
    } catch (error) {
      logger.error('Error getting all services:', error);
      throw error;
    }
  }

  /**
   * Search services
   */
  async searchServices(
    companyId: string,
    searchTerm: string,
    filter?: Omit<ServiceFilter, 'searchTerm'>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ExtendedService>> {
    const combinedFilter: ServiceFilter = {
      ...filter,
      searchTerm,
    };

    return this.getServices(companyId, combinedFilter, pagination);
  }
}

export const serviceService = new ServiceService();