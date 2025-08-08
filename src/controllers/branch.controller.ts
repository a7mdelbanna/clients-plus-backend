import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { branchService } from '../services/branch.service';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';
import { PaginatedResponse, ApiResponse } from '../types';
import { BranchType, BranchStatus } from '@prisma/client';

export class BranchController {
  /**
   * Create a new branch
   */
  async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { companyId } = req.params;

      // Ensure user can only create branches for their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.createBranch(companyId, req.body);

      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Create branch error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create branch',
        error: 'CREATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get branch by ID
   */
  async getBranch(req: Request, res: Response): Promise<void> {
    try {
      const { companyId, branchId } = req.params;

      // Ensure user can only access branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.getBranchById(companyId, branchId);

      if (!branch) {
        res.status(404).json({
          success: false,
          message: 'Branch not found',
          error: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get branch error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch branch',
        error: 'FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update branch
   */
  async updateBranch(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { companyId, branchId } = req.params;

      // Ensure user can only update branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.updateBranch(companyId, branchId, req.body);

      res.status(200).json({
        success: true,
        message: 'Branch updated successfully',
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update branch error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update branch',
        error: 'UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete branch
   */
  async deleteBranch(req: Request, res: Response): Promise<void> {
    try {
      const { companyId, branchId } = req.params;

      // Ensure user can only delete branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await branchService.deleteBranch(companyId, branchId);

      res.status(200).json({
        success: true,
        message: 'Branch deleted successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Delete branch error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete branch',
        error: 'DELETE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * List branches for a company
   */
  async listBranches(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      // Ensure user can only list branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const includeInactive = req.query.includeInactive === 'true';
      const type = req.query.type as BranchType;
      const status = req.query.status as BranchStatus;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = (req.query.sortOrder as string || 'asc') as 'asc' | 'desc';

      const { branches, total } = await branchService.getBranches(companyId, {
        page,
        limit,
        search,
        includeInactive,
        type,
        status,
        sortBy,
        sortOrder,
      });

      const pages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: branches,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
        timestamp: new Date().toISOString(),
      } as PaginatedResponse);
    } catch (error) {
      logger.error('List branches error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to list branches',
        error: 'LIST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Set branch as default/main
   */
  async setDefaultBranch(req: Request, res: Response): Promise<void> {
    try {
      const { companyId, branchId } = req.params;

      // Ensure user can only modify branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.setDefaultBranch(companyId, branchId);

      res.status(200).json({
        success: true,
        message: 'Default branch set successfully',
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Set default branch error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to set default branch',
        error: 'SET_DEFAULT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get branch operating hours
   */
  async getOperatingHours(req: Request, res: Response): Promise<void> {
    try {
      const { companyId, branchId } = req.params;

      // Ensure user can only access branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.getBranchById(companyId, branchId);

      if (!branch) {
        res.status(404).json({
          success: false,
          message: 'Branch not found',
          error: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          operatingHours: branch.operatingHours,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get operating hours error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch operating hours',
        error: 'FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update branch operating hours
   */
  async updateOperatingHours(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { companyId, branchId } = req.params;
      const { operatingHours } = req.body;

      // Ensure user can only update branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.updateOperatingHours(companyId, branchId, operatingHours);

      res.status(200).json({
        success: true,
        message: 'Operating hours updated successfully',
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update operating hours error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update operating hours',
        error: 'UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Assign staff to branch
   */
  async assignStaff(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { companyId, branchId } = req.params;
      const { staffIds } = req.body;

      // Ensure user can only modify branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.assignStaffToBranch(companyId, branchId, staffIds);

      res.status(200).json({
        success: true,
        message: 'Staff assigned to branch successfully',
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Assign staff error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to assign staff',
        error: 'ASSIGN_STAFF_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Assign services to branch
   */
  async assignServices(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { companyId, branchId } = req.params;
      const { serviceIds } = req.body;

      // Ensure user can only modify branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.assignServicesToBranch(companyId, branchId, serviceIds);

      res.status(200).json({
        success: true,
        message: 'Services assigned to branch successfully',
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Assign services error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to assign services',
        error: 'ASSIGN_SERVICES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Assign resources to branch
   */
  async assignResources(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { companyId, branchId } = req.params;
      const { resourceIds } = req.body;

      // Ensure user can only modify branches from their own company
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const branch = await branchService.assignResourcesToBranch(companyId, branchId, resourceIds);

      res.status(200).json({
        success: true,
        message: 'Resources assigned to branch successfully',
        data: branch,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Assign resources error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to assign resources',
        error: 'ASSIGN_RESOURCES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get branch count for company
   */
  async getBranchCount(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      // Ensure user can only access their own company data
      if (req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const count = await branchService.getBranchCount(companyId);

      res.status(200).json({
        success: true,
        data: { count },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get branch count error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get branch count',
        error: 'COUNT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const branchController = new BranchController();