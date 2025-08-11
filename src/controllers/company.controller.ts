import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { companyService } from '../services/company.service';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';
import { PaginatedResponse, ApiResponse } from '../types';

export class CompanyController {
  /**
   * Create a new company
   */
  async createCompany(req: Request, res: Response): Promise<void> {
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

      const company = await companyService.createCompany(req.body);

      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: company,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Create company error:', error);
      
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
        message: 'Failed to create company',
        error: 'CREATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get company by ID
   */
  async getCompany(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      // For non-super-admins, ensure they can only access their own company
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const company = await companyService.getCompanyById(companyId);

      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company not found',
          error: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: company,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get company error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch company',
        error: 'FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update company
   */
  async updateCompany(req: Request, res: Response): Promise<void> {
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

      // For non-super-admins, ensure they can only update their own company
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.companyId !== companyId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const company = await companyService.updateCompany(companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: company,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update company error:', error);
      
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
        message: 'Failed to update company',
        error: 'UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * List all companies (super admin only)
   */
  async listCompanies(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = (req.query.sortOrder as string || 'desc') as 'asc' | 'desc';

      const { companies, total } = await companyService.listCompanies({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });

      const pages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: companies,
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
      logger.error('List companies error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to list companies',
        error: 'LIST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete company
   */
  async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      await companyService.deleteCompany(companyId);

      res.status(200).json({
        success: true,
        message: 'Company deleted successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Delete company error:', error);
      
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
        message: 'Failed to delete company',
        error: 'DELETE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update company subscription
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
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
      const { plan, billingCycle } = req.body;

      const company = await companyService.updateSubscription(companyId, plan, billingCycle);

      res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        data: company,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update subscription error:', error);
      
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
        message: 'Failed to update subscription',
        error: 'SUBSCRIPTION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

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

      const stats = await companyService.getCompanyStats(companyId);

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get company stats error:', error);
      
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
        message: 'Failed to fetch company statistics',
        error: 'STATS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get company settings
   */
  async getCompanySettings(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID not found',
          error: 'COMPANY_ID_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const settings = await companyService.getCompanySettings(companyId);

      res.status(200).json({
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get company settings error:', error);
      
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
        message: 'Failed to fetch company settings',
        error: 'SETTINGS_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update company settings
   */
  async updateCompanySettings(req: Request, res: Response): Promise<void> {
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

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID not found',
          error: 'COMPANY_ID_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const settings = await companyService.updateCompanySettings(companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'Company settings updated successfully',
        data: settings,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update company settings error:', error);
      
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
        message: 'Failed to update company settings',
        error: 'SETTINGS_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID not found',
          error: 'COMPANY_ID_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const profile = await companyService.getCompanyProfile(companyId);

      res.status(200).json({
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get company profile error:', error);
      
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
        message: 'Failed to fetch company profile',
        error: 'PROFILE_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update company profile
   */
  async updateCompanyProfile(req: Request, res: Response): Promise<void> {
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

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID not found',
          error: 'COMPANY_ID_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const profile = await companyService.updateCompanyProfile(companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'Company profile updated successfully',
        data: profile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update company profile error:', error);
      
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
        message: 'Failed to update company profile',
        error: 'PROFILE_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Upload company logo
   */
  async uploadCompanyLogo(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID not found',
          error: 'COMPANY_ID_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No logo file provided',
          error: 'FILE_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const logoUrl = await companyService.uploadCompanyLogo(companyId, req.file);

      res.status(200).json({
        success: true,
        message: 'Company logo uploaded successfully',
        data: { logoUrl },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Upload company logo error:', error);
      
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
        message: 'Failed to upload company logo',
        error: 'LOGO_UPLOAD_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get company subscription details
   */
  async getCompanySubscription(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID not found',
          error: 'COMPANY_ID_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const subscription = await companyService.getCompanySubscription(companyId);

      res.status(200).json({
        success: true,
        data: subscription,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get company subscription error:', error);
      
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
        message: 'Failed to fetch company subscription',
        error: 'SUBSCRIPTION_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update company subscription
   */
  async updateCompanySubscription(req: Request, res: Response): Promise<void> {
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

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID not found',
          error: 'COMPANY_ID_MISSING',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const subscription = await companyService.updateCompanySubscription(companyId, req.body);

      res.status(200).json({
        success: true,
        message: 'Company subscription updated successfully',
        data: subscription,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Update company subscription error:', error);
      
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
        message: 'Failed to update company subscription',
        error: 'SUBSCRIPTION_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const companyController = new CompanyController();