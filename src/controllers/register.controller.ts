import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { RegisterService } from '../services/register.service';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

export interface OpenRegisterRequest {
  branchId: string;
  accountId: string;
  openingBalance: number;
  date?: string;
}

export interface CloseRegisterRequest {
  expectedCashAmount?: number;
  actualCashAmount: number;
  notes?: string;
}

export interface CashDropRequest {
  amount: number;
  reason: string;
  notes?: string;
}

export interface AdjustmentRequest {
  amount: number;
  type: 'IN' | 'OUT';
  reason: string;
  notes?: string;
}

export class RegisterController {
  private registerService: RegisterService;

  constructor() {
    this.registerService = new RegisterService();
  }

  // ==================== Register Operations ====================

  /**
   * Open daily register
   */
  async openRegister(req: Request, res: Response): Promise<void> {
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

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const registerData: OpenRegisterRequest = req.body;
      const register = await this.registerService.openRegister(req.user.companyId, {
        ...registerData,
        openedBy: req.user.userId,
      });

      res.status(201).json({
        success: true,
        message: 'Register opened successfully',
        data: register,
      });

    } catch (error) {
      logger.error('Error opening register:', error);
      
      if (error instanceof Error && error.message.includes('already open')) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          res.status(409).json({
            success: false,
            message: 'Register already open for this date and branch',
          });
          return;
        }
        if (error.code === 'P2025') {
          res.status(404).json({
            success: false,
            message: 'Branch or account not found',
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Close and reconcile register
   */
  async closeRegister(req: Request, res: Response): Promise<void> {
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

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const closeData: CloseRegisterRequest = req.body;
      
      const register = await this.registerService.closeRegister(req.user.companyId, id, {
        ...closeData,
        closedBy: req.user.userId,
      });

      res.json({
        success: true,
        message: 'Register closed successfully',
        data: register,
      });

    } catch (error) {
      logger.error('Error closing register:', error);
      
      if (error instanceof Error && (
        error.message.includes('not found') || 
        error.message.includes('already closed') ||
        error.message.includes('cannot close')
      )) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Get current register shift
   */
  async getCurrentShift(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { branchId } = req.query;

      if (!branchId) {
        res.status(400).json({
          success: false,
          message: 'Branch ID is required',
        });
        return;
      }

      const currentShift = await this.registerService.getCurrentShift(
        req.user.companyId, 
        branchId as string
      );

      if (!currentShift) {
        res.status(404).json({
          success: false,
          message: 'No active register shift found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Current shift retrieved successfully',
        data: currentShift,
      });

    } catch (error) {
      logger.error('Error getting current shift:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Record cash drop
   */
  async recordCashDrop(req: Request, res: Response): Promise<void> {
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

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const cashDropData: CashDropRequest = req.body;

      const updatedRegister = await this.registerService.recordCashDrop(
        req.user.companyId,
        id,
        {
          ...cashDropData,
          recordedBy: req.user.userId,
        }
      );

      res.json({
        success: true,
        message: 'Cash drop recorded successfully',
        data: updatedRegister,
      });

    } catch (error) {
      logger.error('Error recording cash drop:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('cannot')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Record adjustment
   */
  async recordAdjustment(req: Request, res: Response): Promise<void> {
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

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const adjustmentData: AdjustmentRequest = req.body;

      const updatedRegister = await this.registerService.recordAdjustment(
        req.user.companyId,
        id,
        {
          ...adjustmentData,
          adjustedBy: req.user.userId,
        }
      );

      res.json({
        success: true,
        message: 'Adjustment recorded successfully',
        data: updatedRegister,
      });

    } catch (error) {
      logger.error('Error recording adjustment:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('cannot')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Get register history
   */
  async getRegisterHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { branchId, startDate, endDate, page = 1, limit = 20 } = req.query;

      const filters = {
        branchId: branchId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const history = await this.registerService.getRegisterHistory(req.user.companyId, filters);

      res.json({
        success: true,
        message: 'Register history retrieved successfully',
        data: history.data,
        meta: history.meta,
      });

    } catch (error) {
      logger.error('Error getting register history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Get register summary
   */
  async getRegisterSummary(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;

      const summary = await this.registerService.getRegisterSummary(req.user.companyId, id);

      if (!summary) {
        res.status(404).json({
          success: false,
          message: 'Register not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Register summary retrieved successfully',
        data: summary,
      });

    } catch (error) {
      logger.error('Error getting register summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Reconcile register
   */
  async reconcileRegister(req: Request, res: Response): Promise<void> {
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

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const { notes } = req.body;

      const reconciledRegister = await this.registerService.reconcileRegister(
        req.user.companyId,
        id,
        {
          reconciledBy: req.user.userId,
          notes,
        }
      );

      res.json({
        success: true,
        message: 'Register reconciled successfully',
        data: reconciledRegister,
      });

    } catch (error) {
      logger.error('Error reconciling register:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('cannot reconcile')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }
}

export const registerController = new RegisterController();