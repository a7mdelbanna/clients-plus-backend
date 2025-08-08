import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { userService } from '../services/user.service';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';
import { PaginatedResponse, ApiResponse } from '../types';
import { UserRole } from '@prisma/client';

export class UserController {
  /**
   * Create a new user
   */
  async createUser(req: Request, res: Response): Promise<void> {
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

      // Use the company ID from the authenticated user or from params (for super admin)
      const companyId = req.user?.role === 'SUPER_ADMIN' && req.body.companyId
        ? req.body.companyId
        : req.user?.companyId;

      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID is required',
          error: 'MISSING_COMPANY_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = await userService.createUser({
        ...req.body,
        companyId,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Create user error:', error);
      
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
        message: 'Failed to create user',
        error: 'CREATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // For non-super-admins, enforce company isolation
      const companyId = req.user?.role === 'SUPER_ADMIN' ? undefined : req.user?.companyId;

      const user = await userService.getUserById(userId, companyId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get user error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: 'FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update user
   */
  async updateUser(req: Request, res: Response): Promise<void> {
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

      const { userId } = req.params;
      
      // For non-super-admins, enforce company isolation
      const companyId = req.user?.role === 'SUPER_ADMIN' 
        ? (await userService.getUserById(userId))?.companyId || ''
        : req.user?.companyId || '';

      const user = await userService.updateUser(userId, companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update user error:', error);
      
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
        message: 'Failed to update user',
        error: 'UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * List users
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = (req.query.sortOrder as string || 'desc') as 'asc' | 'desc';

      // Get company ID from params or user context
      const companyId = req.params.companyId || req.user?.companyId;

      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID is required',
          error: 'MISSING_COMPANY_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { users, total } = await userService.listUsers(companyId, {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });

      const pages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: users,
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
      logger.error('List users error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to list users',
        error: 'LIST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete user
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // For non-super-admins, enforce company isolation
      const companyId = req.user?.role === 'SUPER_ADMIN'
        ? (await userService.getUserById(userId))?.companyId || ''
        : req.user?.companyId || '';

      await userService.deleteUser(userId, companyId);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Delete user error:', error);
      
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
        message: 'Failed to delete user',
        error: 'DELETE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(req: Request, res: Response): Promise<void> {
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

      const { userId } = req.params;
      const { role } = req.body;
      
      // For non-super-admins, enforce company isolation
      const companyId = req.user?.role === 'SUPER_ADMIN'
        ? (await userService.getUserById(userId))?.companyId || ''
        : req.user?.companyId || '';

      const user = await userService.updateUserRole(userId, companyId, role as UserRole);

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: user,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update user role error:', error);
      
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
        message: 'Failed to update user role',
        error: 'ROLE_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = await userService.getUserById(req.user.userId, req.user.companyId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get current user error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch current user',
        error: 'FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.params.companyId || req.user?.companyId;

      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID is required',
          error: 'MISSING_COMPANY_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // For non-super-admins, ensure they can only access their own company stats
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const stats = await userService.getUserStats(companyId);

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get user stats error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics',
        error: 'STATS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const userController = new UserController();