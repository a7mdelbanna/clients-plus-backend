import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { setupService, BusinessInfoData, BranchData, TeamInfoData, ThemeData } from '../services/setup.service';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';
import { ApiResponse } from '../types';

export class SetupController {
  /**
   * Get setup completion status
   * GET /api/v1/setup/status
   */
  async getSetupStatus(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const setupStatus = await setupService.getSetupStatus(companyId);

      res.status(200).json({
        success: true,
        data: setupStatus,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get setup status error:', error);
      
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
        message: 'Failed to fetch setup status',
        error: 'SETUP_STATUS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current setup progress and next step
   * GET /api/v1/setup/progress
   */
  async getSetupProgress(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const progress = await setupService.getSetupProgress(companyId);

      res.status(200).json({
        success: true,
        data: progress,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get setup progress error:', error);
      
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
        message: 'Failed to fetch setup progress',
        error: 'SETUP_PROGRESS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Save step progress (draft save)
   * POST /api/v1/setup/progress
   */
  async saveStepProgress(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { step, data, timestamp } = req.body;
      await setupService.saveStepProgress(companyId, step, data, timestamp);

      res.status(200).json({
        success: true,
        message: 'Step progress saved successfully',
        data: {
          step,
          timestamp: timestamp || new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Save step progress error:', error);
      
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
        message: 'Failed to save step progress',
        error: 'STEP_PROGRESS_SAVE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Save business information step
   * POST /api/v1/setup/business-info
   */
  async saveBusinessInfo(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const businessInfo: BusinessInfoData = req.body;
      const updatedCompany = await setupService.saveBusinessInfo(companyId, businessInfo);

      res.status(200).json({
        success: true,
        message: 'Business information saved successfully',
        data: {
          id: updatedCompany.id,
          name: updatedCompany.name,
          businessType: updatedCompany.businessType,
          phone: updatedCompany.phone,
          website: updatedCompany.website,
          address: updatedCompany.address,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Save business info error:', error);
      
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
        message: 'Failed to save business information',
        error: 'BUSINESS_INFO_SAVE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Save branches step
   * POST /api/v1/setup/branches
   */
  async saveBranches(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Enhanced error logging for debugging
        logger.error('Branch validation failed:', {
          errors: errors.array(),
          requestBody: JSON.stringify(req.body, null, 2),
          companyId: req.user?.companyId,
          timestamp: new Date().toISOString(),
        });
        
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { branches } = req.body;
      
      if (!Array.isArray(branches) || branches.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one branch is required',
          error: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Ensure at least one main branch
      const hasMainBranch = branches.some((branch: BranchData) => branch.isMain);
      if (!hasMainBranch) {
        res.status(400).json({
          success: false,
          message: 'At least one branch must be marked as main',
          error: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const createdBranches = await setupService.saveBranches(companyId, branches);

      res.status(201).json({
        success: true,
        message: 'Branches saved successfully',
        data: createdBranches,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Save branches error:', error);
      
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
        message: 'Failed to save branches',
        error: 'BRANCHES_SAVE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Save team information step
   * POST /api/v1/setup/team-info
   */
  async saveTeamInfo(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const teamInfo: TeamInfoData = req.body;
      const updatedCompany = await setupService.saveTeamInfo(companyId, teamInfo);

      res.status(200).json({
        success: true,
        message: 'Team information saved successfully',
        data: {
          id: updatedCompany.id,
          teamSize: updatedCompany.teamSize,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Save team info error:', error);
      
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
        message: 'Failed to save team information',
        error: 'TEAM_INFO_SAVE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Save theme selection step
   * POST /api/v1/setup/theme
   */
  async saveTheme(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const themeData: ThemeData = req.body;
      const updatedCompany = await setupService.saveTheme(companyId, themeData);

      res.status(200).json({
        success: true,
        message: 'Theme saved successfully',
        data: {
          id: updatedCompany.id,
          selectedTheme: updatedCompany.selectedTheme,
          logo: updatedCompany.logo,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Save theme error:', error);
      
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
        message: 'Failed to save theme',
        error: 'THEME_SAVE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Complete setup wizard
   * POST /api/v1/setup/complete
   */
  async completeSetup(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedCompany = await setupService.completeSetup(companyId);

      res.status(200).json({
        success: true,
        message: 'Setup completed successfully',
        data: {
          id: updatedCompany.id,
          setupCompleted: updatedCompany.setupCompleted,
          name: updatedCompany.name,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Complete setup error:', error);
      
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
        message: 'Failed to complete setup',
        error: 'SETUP_COMPLETE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Reset setup wizard (admin only, for testing)
   * DELETE /api/v1/setup/reset
   */
  async resetSetup(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;
      
      if (!companyId) {
        res.status(401).json({
          success: false,
          message: 'Company ID not found in token',
          error: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Only allow admins or super admins to reset setup
      if (!userRole || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.',
          error: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedCompany = await setupService.resetSetup(companyId);

      res.status(200).json({
        success: true,
        message: 'Setup reset successfully',
        data: {
          id: updatedCompany.id,
          setupCompleted: updatedCompany.setupCompleted,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Reset setup error:', error);
      
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
        message: 'Failed to reset setup',
        error: 'SETUP_RESET_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const setupController = new SetupController();