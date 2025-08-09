import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ClientStatus, Gender } from '@prisma/client';
import { 
  clientService, 
  ExtendedClient, 
  ClientsFilter, 
  PaginationOptions,
  DuplicateCheckResult 
} from '../services/client.service';
import { logger } from '../config/logger';
import { PaginationService, extractPagination, extractFieldSelection } from '../utils/pagination.utils';

export class ClientController {
  /**
   * Create a new client
   */
  async createClient(req: Request, res: Response): Promise<void> {
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

      const clientData: Omit<ExtendedClient, 'id'> = {
        ...req.body,
        companyId: req.user.companyId,
        status: req.body.status || ClientStatus.ACTIVE,
      };

      // Validate required fields
      if (!clientData.firstName) {
        res.status(400).json({
          success: false,
          message: 'First name is required',
          error: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Check for duplicates before creating
      if (req.body.checkDuplicates !== false) {
        const duplicateCheck = await clientService.checkForDuplicates(clientData);
        
        if (duplicateCheck.hasDuplicates && duplicateCheck.suggestedAction === 'block') {
          res.status(409).json({
            success: false,
            message: 'Duplicate client detected',
            error: 'DUPLICATE_CLIENT',
            data: {
              duplicates: duplicateCheck.matches,
            },
          });
          return;
        }
        
        if (duplicateCheck.hasDuplicates && duplicateCheck.suggestedAction === 'warn') {
          // Include warning in response but proceed with creation
          const clientId = await clientService.createClient(clientData, req.user.userId);
          const newClient = await clientService.getClient(clientId, req.user.companyId);
          
          res.status(201).json({
            success: true,
            message: 'Client created successfully with duplicate warning',
            data: {
              client: newClient,
              duplicateWarning: duplicateCheck.matches,
            },
          });
          return;
        }
      }

      const clientId = await clientService.createClient(clientData, req.user.userId);
      const newClient = await clientService.getClient(clientId, req.user.companyId);

      res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: {
          client: newClient,
        },
      });
    } catch (error) {
      logger.error('Create client error:', error);
      
      let statusCode = 500;
      let errorCode = 'CLIENT_CREATION_FAILED';
      let message = 'Failed to create client';

      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          statusCode = 409;
          errorCode = 'DUPLICATE_CLIENT';
          message = 'Client with this email or phone already exists';
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
   * Get client by ID
   */
  async getClient(req: Request, res: Response): Promise<void> {
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
          message: 'Client ID is required',
          error: 'MISSING_CLIENT_ID',
        });
        return;
      }

      const client = await clientService.getClient(id, req.user.companyId);

      if (!client) {
        res.status(404).json({
          success: false,
          message: 'Client not found',
          error: 'CLIENT_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Client retrieved successfully',
        data: {
          client,
        },
      });
    } catch (error) {
      logger.error('Get client error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve client',
        error: 'CLIENT_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Update client
   */
  async updateClient(req: Request, res: Response): Promise<void> {
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
          message: 'Client ID is required',
          error: 'MISSING_CLIENT_ID',
        });
        return;
      }

      // Check if client exists
      const existingClient = await clientService.getClient(id, req.user.companyId);
      if (!existingClient) {
        res.status(404).json({
          success: false,
          message: 'Client not found',
          error: 'CLIENT_NOT_FOUND',
        });
        return;
      }

      const updates: Partial<ExtendedClient> = { ...req.body };
      delete updates.id;
      delete updates.companyId;
      delete updates.createdAt;
      delete updates.createdById;

      // Check for duplicates if contact info is being updated
      if ((updates.email || updates.phone) && req.body.checkDuplicates !== false) {
        const duplicateCheck = await clientService.checkForDuplicates({
          ...existingClient,
          ...updates,
        });
        
        if (duplicateCheck.hasDuplicates && duplicateCheck.suggestedAction === 'block') {
          res.status(409).json({
            success: false,
            message: 'Update would create duplicate client',
            error: 'DUPLICATE_CLIENT',
            data: {
              duplicates: duplicateCheck.matches,
            },
          });
          return;
        }
      }

      await clientService.updateClient(id, updates, req.user.companyId);
      const updatedClient = await clientService.getClient(id, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Client updated successfully',
        data: {
          client: updatedClient,
        },
      });
    } catch (error) {
      logger.error('Update client error:', error);
      
      let statusCode = 500;
      let errorCode = 'CLIENT_UPDATE_FAILED';
      let message = 'Failed to update client';

      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          statusCode = 409;
          errorCode = 'DUPLICATE_CLIENT';
          message = 'Client with this email or phone already exists';
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
   * Delete client (soft delete)
   */
  async deleteClient(req: Request, res: Response): Promise<void> {
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
          message: 'Client ID is required',
          error: 'MISSING_CLIENT_ID',
        });
        return;
      }

      // Check if client exists
      const existingClient = await clientService.getClient(id, req.user.companyId);
      if (!existingClient) {
        res.status(404).json({
          success: false,
          message: 'Client not found',
          error: 'CLIENT_NOT_FOUND',
        });
        return;
      }

      await clientService.deleteClient(id, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Client deleted successfully',
      });
    } catch (error) {
      logger.error('Delete client error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete client',
        error: 'CLIENT_DELETION_FAILED',
      });
    }
  }

  /**
   * Get clients with filtering and pagination
   */
  async getClients(req: Request, res: Response): Promise<void> {
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
      const filter: ClientsFilter = {};

      // Basic filters
      if (req.query.status && req.query.status !== 'all') {
        filter.status = req.query.status as ClientStatus;
      }

      if (req.query.search) {
        filter.searchTerm = req.query.search as string;
      }

      if (req.query.tags) {
        const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
        filter.tags = tags as string[];
      }

      if (req.query.gender) {
        const genders = Array.isArray(req.query.gender) ? req.query.gender : [req.query.gender];
        filter.gender = genders as Gender[];
      }

      // Quick filters
      if (req.query.quickFilter) {
        filter.quickFilter = req.query.quickFilter as any;
      }

      // Age range filter
      if (req.query.minAge || req.query.maxAge) {
        filter.ageRange = {
          min: req.query.minAge ? parseInt(req.query.minAge as string) : undefined,
          max: req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined,
        };
      }

      // Birthday filters
      if (req.query.birthdayMonth) {
        filter.birthday = {
          month: parseInt(req.query.birthdayMonth as string),
        };
      }

      if (req.query.upcomingBirthdays) {
        filter.birthday = {
          upcomingDays: parseInt(req.query.upcomingBirthdays as string),
        };
      }

      // Date range filters
      if (req.query.registrationFrom || req.query.registrationTo) {
        filter.registrationDate = {};
        if (req.query.registrationFrom) {
          filter.registrationDate.from = new Date(req.query.registrationFrom as string);
        }
        if (req.query.registrationTo) {
          filter.registrationDate.to = new Date(req.query.registrationTo as string);
        }
      }

      // Communication filters
      if (req.query.acceptsSMS !== undefined) {
        filter.acceptsSMS = req.query.acceptsSMS === 'true';
      }

      if (req.query.acceptsEmail !== undefined) {
        filter.acceptsEmail = req.query.acceptsEmail === 'true';
      }

      if (req.query.hasValidEmail !== undefined) {
        filter.hasValidEmail = req.query.hasValidEmail === 'true';
      }

      if (req.query.hasValidPhone !== undefined) {
        filter.hasValidPhone = req.query.hasValidPhone === 'true';
      }

      // Financial filters
      if (req.query.minBalance || req.query.maxBalance) {
        filter.currentBalance = {
          min: req.query.minBalance ? parseFloat(req.query.minBalance as string) : undefined,
          max: req.query.maxBalance ? parseFloat(req.query.maxBalance as string) : undefined,
        };
      }

      if (req.query.minLifetimeSpend || req.query.maxLifetimeSpend) {
        filter.lifetimeSpend = {
          min: req.query.minLifetimeSpend ? parseFloat(req.query.minLifetimeSpend as string) : undefined,
          max: req.query.maxLifetimeSpend ? parseFloat(req.query.maxLifetimeSpend as string) : undefined,
        };
      }

      // Branch filter
      if (req.query.branchId) {
        filter.branchId = req.query.branchId as string;
      }

      // Sorting
      if (req.query.sortBy) {
        filter.sortBy = req.query.sortBy as any;
      }

      if (req.query.sortDirection) {
        filter.sortDirection = req.query.sortDirection as 'asc' | 'desc';
      }

      const result = await clientService.getClients(req.user.companyId, filter, pagination);

      res.status(200).json({
        success: true,
        message: 'Clients retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get clients error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve clients',
        error: 'CLIENTS_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Get all clients with pagination, filtering, and field selection
   */
  async getAllClients(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // Extract pagination and field selection parameters
      const { page, limit } = extractPagination(req);
      const { select } = extractFieldSelection(req);
      
      // Build filters from query parameters
      const filters: any = {
        companyId: req.user.companyId,
        isActive: true
      };

      // Add optional filters
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.search) {
        const searchTerm = req.query.search as string;
        filters.OR = [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
      if (req.query.gender) {
        filters.gender = req.query.gender;
      }

      // Build query options
      const queryOptions: any = {
        where: filters,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      };

      // Add field selection if specified
      if (select && Object.keys(select).length > 0) {
        queryOptions.select = select;
      } else {
        // Default fields to return for performance
        queryOptions.select = {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          gender: true,
          createdAt: true,
          updatedAt: true
        };
      }

      // Execute queries in parallel for better performance
      const [clients, totalCount] = await Promise.all([
        clientService.findManyClients(queryOptions),
        clientService.countClients(filters)
      ]);

      const result = PaginationService.paginate(clients, totalCount, page, limit);

      res.status(200).json({
        success: true,
        message: 'Clients retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all clients error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve clients',
        error: 'CLIENTS_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Get client suggestions for autocomplete
   */
  async getClientSuggestions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const searchTerm = req.query.q as string || '';
      const suggestions = await clientService.getClientSuggestions(req.user.companyId, searchTerm);

      res.status(200).json({
        success: true,
        message: 'Client suggestions retrieved successfully',
        data: suggestions,
      });
    } catch (error) {
      logger.error('Get client suggestions error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve client suggestions',
        error: 'CLIENT_SUGGESTIONS_FAILED',
      });
    }
  }

  /**
   * Check for duplicate clients
   */
  async checkDuplicates(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const clientData: Partial<ExtendedClient> = {
        ...req.body,
        companyId: req.user.companyId,
      };

      const result = await clientService.checkForDuplicates(clientData);

      res.status(200).json({
        success: true,
        message: 'Duplicate check completed',
        data: result,
      });
    } catch (error) {
      logger.error('Check duplicates error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to check for duplicates',
        error: 'DUPLICATE_CHECK_FAILED',
      });
    }
  }

  /**
   * Get client statistics
   */
  async getClientStats(req: Request, res: Response): Promise<void> {
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
      const stats = await clientService.getClientStats(req.user.companyId, branchId);

      res.status(200).json({
        success: true,
        message: 'Client statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      logger.error('Get client stats error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve client statistics',
        error: 'CLIENT_STATS_FAILED',
      });
    }
  }

  /**
   * Search clients
   */
  async searchClients(req: Request, res: Response): Promise<void> {
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
      const filter: Omit<ClientsFilter, 'searchTerm'> = {};
      
      if (req.query.status && req.query.status !== 'all') {
        filter.status = req.query.status as ClientStatus;
      }

      if (req.query.tags) {
        const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
        filter.tags = tags as string[];
      }

      if (req.query.branchId) {
        filter.branchId = req.query.branchId as string;
      }

      const result = await clientService.searchClients(
        req.user.companyId,
        searchTerm,
        filter,
        pagination
      );

      res.status(200).json({
        success: true,
        message: 'Client search completed successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Search clients error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to search clients',
        error: 'CLIENT_SEARCH_FAILED',
      });
    }
  }

  /**
   * Bulk update clients
   */
  async bulkUpdateClients(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { clientIds, updates } = req.body;

      if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Client IDs array is required',
          error: 'MISSING_CLIENT_IDS',
        });
        return;
      }

      if (!updates || typeof updates !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Updates object is required',
          error: 'MISSING_UPDATES',
        });
        return;
      }

      // Remove sensitive fields from updates
      delete updates.id;
      delete updates.companyId;
      delete updates.createdAt;
      delete updates.createdById;

      const result = await clientService.bulkUpdateClients(
        clientIds,
        updates,
        req.user.companyId
      );

      res.status(200).json({
        success: true,
        message: `Bulk update completed: ${result.updated} updated, ${result.failed} failed`,
        data: result,
      });
    } catch (error) {
      logger.error('Bulk update clients error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error: 'BULK_UPDATE_FAILED',
      });
    }
  }

  /**
   * Update client statistics
   */
  async updateClientStats(req: Request, res: Response): Promise<void> {
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
          message: 'Client ID is required',
          error: 'MISSING_CLIENT_ID',
        });
        return;
      }

      // Check if client exists
      const existingClient = await clientService.getClient(id, req.user.companyId);
      if (!existingClient) {
        res.status(404).json({
          success: false,
          message: 'Client not found',
          error: 'CLIENT_NOT_FOUND',
        });
        return;
      }

      await clientService.updateClientStats(id, req.user.companyId);

      res.status(200).json({
        success: true,
        message: 'Client statistics updated successfully',
      });
    } catch (error) {
      logger.error('Update client stats error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update client statistics',
        error: 'CLIENT_STATS_UPDATE_FAILED',
      });
    }
  }

  /**
   * Health check for client service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Client service is healthy',
        timestamp: new Date().toISOString(),
        service: 'client-management',
      });
    } catch (error) {
      logger.error('Client health check error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Client service health check failed',
        error: 'HEALTH_CHECK_FAILED',
      });
    }
  }
}

export const clientController = new ClientController();