import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ServiceType } from '@prisma/client';
import { 
  serviceService, 
  ExtendedService, 
  ExtendedServiceCategory,
  ServiceFilter, 
  PaginationOptions,
  ServiceStaffAssignment 
} from '../services/service.service';
import { logger } from '../config/logger';

export class ServiceController {
  /**
   * Create a new service
   */
  async createService(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const serviceData: Omit<ExtendedService, 'id'> = {
        ...req.body,
        companyId: req.user.companyId,
        active: req.body.active !== undefined ? req.body.active : true,
        type: req.body.type || ServiceType.APPOINTMENT,
      };

      // Validate required fields
      if (!serviceData.name || !serviceData.startingPrice || !serviceData.duration || !serviceData.onlineBooking) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, startingPrice, duration, onlineBooking are required',
          error: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Validate duration structure
      if (typeof serviceData.duration !== 'object' || 
          typeof serviceData.duration.hours !== 'number' || 
          typeof serviceData.duration.minutes !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Duration must be an object with hours and minutes numbers',
          error: 'INVALID_DURATION_FORMAT',
        });
        return;
      }

      const branchId = req.body.branchId;
      const serviceId = await serviceService.createService(serviceData, req.user.userId, branchId);
      const newService = await serviceService.getService(serviceId, req.user.companyId);

      res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: {
          service: newService,
        },
      });
    } catch (error) {
      logger.error('Create service error:', error);
      
      let statusCode = 500;
      let errorCode = 'SERVICE_CREATION_FAILED';
      let message = 'Failed to create service';

      if (error instanceof Error) {
        if (error.message.includes('category')) {
          statusCode = 400;
          errorCode = 'INVALID_CATEGORY';
          message = 'Invalid service category';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Get service by ID
   */
  async getService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Service ID is required',
          error: 'MISSING_SERVICE_ID',
        });
        return;
      }

      const service = await serviceService.getService(id, req.user.companyId);

      if (!service) {
        res.status(404).json({
          success: false,
          message: 'Service not found',
          error: 'SERVICE_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Service retrieved successfully',
        data: {
          service,
        },
      });
    } catch (error) {
      logger.error('Get service error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve service',
        error: 'SERVICE_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Update service
   */
  async updateService(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Service ID is required',
          error: 'MISSING_SERVICE_ID',
        });
        return;
      }

      // Check if service exists
      const existingService = await serviceService.getService(id, req.user.companyId);
      if (!existingService) {
        res.status(404).json({
          success: false,
          message: 'Service not found',
          error: 'SERVICE_NOT_FOUND',
        });
        return;
      }

      const updates: Partial<ExtendedService> = { ...req.body };
      delete updates.id;
      delete updates.companyId;
      delete updates.createdAt;
      delete updates.createdBy;

      // Validate duration if provided
      if (updates.duration) {
        if (typeof updates.duration !== 'object' || 
            typeof updates.duration.hours !== 'number' || 
            typeof updates.duration.minutes !== 'number') {
          res.status(400).json({
            success: false,
            message: 'Duration must be an object with hours and minutes numbers',
            error: 'INVALID_DURATION_FORMAT',
          });
          return;
        }
      }

      await serviceService.updateService(id, updates, req.user.companyId);
      const updatedService = await serviceService.getService(id, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data: {
          service: updatedService,
        },
      });
    } catch (error) {
      logger.error('Update service error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update service',
        error: 'SERVICE_UPDATE_FAILED',
      });
    }
  }

  /**
   * Delete service (soft delete)
   */
  async deleteService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Service ID is required',
          error: 'MISSING_SERVICE_ID',
        });
        return;
      }

      // Check if service exists
      const existingService = await serviceService.getService(id, req.user.companyId);
      if (!existingService) {
        res.status(404).json({
          success: false,
          message: 'Service not found',
          error: 'SERVICE_NOT_FOUND',
        });
        return;
      }

      await serviceService.deleteService(id, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      logger.error('Delete service error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete service',
        error: 'SERVICE_DELETION_FAILED',
      });
    }
  }

  /**
   * Get services with filtering and pagination
   */
  async getServices(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // Parse pagination parameters
      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 10, 100),
      };

      // Parse filter parameters
      const filter: ServiceFilter = {};

      if (req.query.categoryId) {
        filter.categoryId = req.query.categoryId as string;
      }

      if (req.query.branchId) {
        filter.branchId = req.query.branchId as string;
      }

      if (req.query.type) {
        filter.type = req.query.type as ServiceType;
      }

      if (req.query.active !== undefined) {
        filter.active = req.query.active === 'true';
      }

      if (req.query.onlineBookingOnly !== undefined) {
        filter.onlineBookingOnly = req.query.onlineBookingOnly === 'true';
      }

      if (req.query.search) {
        filter.searchTerm = req.query.search as string;
      }

      // Price range filter
      if (req.query.minPrice || req.query.maxPrice) {
        filter.priceRange = {
          min: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
          max: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        };
      }

      // Sorting
      if (req.query.sortBy) {
        filter.sortBy = req.query.sortBy as any;
      }

      if (req.query.sortDirection) {
        filter.sortDirection = req.query.sortDirection as 'asc' | 'desc';
      }

      const result = await serviceService.getServices(req.user.companyId, filter, pagination);

      res.status(200).json({
        success: true,
        message: 'Services retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get services error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve services',
        error: 'SERVICES_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Create service category
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const categoryData: Omit<ExtendedServiceCategory, 'id'> = {
        ...req.body,
        companyId: req.user.companyId,
        active: req.body.active !== undefined ? req.body.active : true,
      };

      if (!categoryData.name) {
        res.status(400).json({
          success: false,
          message: 'Category name is required',
          error: 'MISSING_CATEGORY_NAME',
        });
        return;
      }

      const categoryId = await serviceService.createCategory(categoryData, req.user.userId);

      res.status(201).json({
        success: true,
        message: 'Service category created successfully',
        data: {
          categoryId,
        },
      });
    } catch (error) {
      logger.error('Create service category error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to create service category',
        error: 'CATEGORY_CREATION_FAILED',
      });
    }
  }

  /**
   * Get service categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const branchId = req.query.branchId as string;
      const categories = await serviceService.getCategories(req.user.companyId, branchId);

      res.status(200).json({
        success: true,
        message: 'Service categories retrieved successfully',
        data: categories,
      });
    } catch (error) {
      logger.error('Get service categories error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve service categories',
        error: 'CATEGORIES_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Update service category
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Category ID is required',
          error: 'MISSING_CATEGORY_ID',
        });
        return;
      }

      const updates: Partial<ExtendedServiceCategory> = { ...req.body };
      delete updates.id;
      delete updates.companyId;
      delete updates.createdAt;
      delete updates.createdBy;
      delete updates.servicesCount; // This is calculated automatically

      await serviceService.updateCategory(id, updates, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Service category updated successfully',
      });
    } catch (error) {
      logger.error('Update service category error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update service category',
        error: 'CATEGORY_UPDATE_FAILED',
      });
    }
  }

  /**
   * Delete service category (soft delete)
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Category ID is required',
          error: 'MISSING_CATEGORY_ID',
        });
        return;
      }

      await serviceService.deleteCategory(id, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Service category deleted successfully',
      });
    } catch (error) {
      logger.error('Delete service category error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete service category',
        error: 'CATEGORY_DELETION_FAILED',
      });
    }
  }

  /**
   * Get services by staff member
   */
  async getServicesByStaff(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { staffId } = req.params;
      
      if (!staffId) {
        res.status(400).json({
          success: false,
          message: 'Staff ID is required',
          error: 'MISSING_STAFF_ID',
        });
        return;
      }

      const services = await serviceService.getServicesByStaff(staffId, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Services by staff retrieved successfully',
        data: services,
      });
    } catch (error) {
      logger.error('Get services by staff error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve services by staff',
        error: 'SERVICES_BY_STAFF_FAILED',
      });
    }
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { categoryId } = req.params;
      
      if (!categoryId) {
        res.status(400).json({
          success: false,
          message: 'Category ID is required',
          error: 'MISSING_CATEGORY_ID',
        });
        return;
      }

      const services = await serviceService.getServicesByCategory(categoryId, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Services by category retrieved successfully',
        data: services,
      });
    } catch (error) {
      logger.error('Get services by category error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve services by category',
        error: 'SERVICES_BY_CATEGORY_FAILED',
      });
    }
  }

  /**
   * Get online bookable services
   */
  async getOnlineBookableServices(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const branchId = req.query.branchId as string;
      const services = await serviceService.getOnlineBookableServices(req.user.companyId, branchId);

      res.status(200).json({
        success: true,
        message: 'Online bookable services retrieved successfully',
        data: services,
      });
    } catch (error) {
      logger.error('Get online bookable services error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve online bookable services',
        error: 'ONLINE_SERVICES_FAILED',
      });
    }
  }

  /**
   * Reorder services
   */
  async reorderServices(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { serviceIds } = req.body;

      if (!serviceIds || !Array.isArray(serviceIds)) {
        res.status(400).json({
          success: false,
          message: 'Service IDs array is required',
          error: 'MISSING_SERVICE_IDS',
        });
        return;
      }

      await serviceService.reorderServices(serviceIds, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Services reordered successfully',
      });
    } catch (error) {
      logger.error('Reorder services error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to reorder services',
        error: 'REORDER_SERVICES_FAILED',
      });
    }
  }

  /**
   * Assign staff to service
   */
  async assignStaffToService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { id } = req.params;
      const { staff } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Service ID is required',
          error: 'MISSING_SERVICE_ID',
        });
        return;
      }

      if (!staff || !Array.isArray(staff)) {
        res.status(400).json({
          success: false,
          message: 'Staff assignments array is required',
          error: 'MISSING_STAFF_ASSIGNMENTS',
        });
        return;
      }

      await serviceService.assignStaffToService(id, req.user.companyId, staff);

      res.status(200).json({
        success: true,
        message: 'Staff assigned to service successfully',
      });
    } catch (error) {
      logger.error('Assign staff to service error:', error);
      
      let statusCode = 500;
      let errorCode = 'STAFF_ASSIGNMENT_FAILED';
      let message = 'Failed to assign staff to service';

      if (error instanceof Error && error.message === 'Service not found') {
        statusCode = 404;
        errorCode = 'SERVICE_NOT_FOUND';
        message = 'Service not found';
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Get service staff assignments
   */
  async getServiceStaff(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Service ID is required',
          error: 'MISSING_SERVICE_ID',
        });
        return;
      }

      const staff = await serviceService.getServiceStaff(id, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Service staff retrieved successfully',
        data: staff,
      });
    } catch (error) {
      logger.error('Get service staff error:', error);
      
      let statusCode = 500;
      let errorCode = 'SERVICE_STAFF_FAILED';
      let message = 'Failed to retrieve service staff';

      if (error instanceof Error && error.message === 'Service not found') {
        statusCode = 404;
        errorCode = 'SERVICE_NOT_FOUND';
        message = 'Service not found';
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Search services
   */
  async searchServices(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const searchTerm = req.query.q as string;
      
      if (!searchTerm) {
        res.status(400).json({
          success: false,
          message: 'Search term is required',
          error: 'MISSING_SEARCH_TERM',
        });
        return;
      }

      // Parse pagination parameters
      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 10, 100),
      };

      // Parse additional filters (excluding searchTerm)
      const filter: Omit<ServiceFilter, 'searchTerm'> = {};
      
      if (req.query.categoryId) {
        filter.categoryId = req.query.categoryId as string;
      }

      if (req.query.branchId) {
        filter.branchId = req.query.branchId as string;
      }

      if (req.query.type) {
        filter.type = req.query.type as ServiceType;
      }

      const result = await serviceService.searchServices(
        req.user.companyId,
        searchTerm,
        filter,
        pagination
      );

      res.status(200).json({
        success: true,
        message: 'Service search completed successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Search services error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to search services',
        error: 'SERVICE_SEARCH_FAILED',
      });
    }
  }

  /**
   * Get all services (for autocomplete)
   */
  async getAllServices(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const services = await serviceService.getAllServices(req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'All services retrieved successfully',
        data: services,
      });
    } catch (error) {
      logger.error('Get all services error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve all services',
        error: 'ALL_SERVICES_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Health check for service service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Service service is healthy',
        timestamp: new Date().toISOString(),
        service: 'service-management',
      });
    } catch (error) {
      logger.error('Service health check error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Service service health check failed',
        error: 'HEALTH_CHECK_FAILED',
      });
    }
  }
}

export const serviceController = new ServiceController();