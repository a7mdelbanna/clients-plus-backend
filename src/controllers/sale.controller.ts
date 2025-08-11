import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { SaleService } from '../services/sale.service';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

export interface SaleFilters {
  search?: string;
  staffId?: string;
  clientId?: string;
  branchId?: string;
  paymentMethod?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateSaleRequest {
  branchId: string;
  staffId?: string;
  clientId?: string;
  items: {
    type: 'PRODUCT' | 'SERVICE' | 'CUSTOM';
    productId?: string;
    serviceId?: string;
    name: string;
    description?: string;
    unitPrice: number;
    quantity: number;
    discount?: number;
    taxRate?: number;
  }[];
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  paymentMethod: string;
  amountPaid: number;
  notes?: string;
  internalNotes?: string;
}

export class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  // ==================== Sale CRUD ====================

  /**
   * Create a new sale transaction
   */
  async createSale(req: Request, res: Response): Promise<void> {
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

      const saleData: CreateSaleRequest = req.body;
      const result = await this.saleService.createSale(req.user.companyId, saleData);

      res.status(201).json({
        success: true,
        message: 'Sale created successfully',
        data: result,
      });

    } catch (error) {
      logger.error('Error creating sale:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          res.status(409).json({
            success: false,
            message: 'Sale with this number already exists',
          });
          return;
        }
        if (error.code === 'P2025') {
          res.status(404).json({
            success: false,
            message: 'Referenced item not found',
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
   * Get all sales with filtering and pagination
   */
  async getSales(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const filters: SaleFilters = {
        search: req.query.search as string,
        staffId: req.query.staffId as string,
        clientId: req.query.clientId as string,
        branchId: req.query.branchId as string,
        paymentMethod: req.query.paymentMethod as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.saleService.getSales(req.user.companyId, filters);

      res.json({
        success: true,
        message: 'Sales retrieved successfully',
        data: result.data,
        meta: result.meta,
      });

    } catch (error) {
      logger.error('Error fetching sales:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Get sale by ID
   */
  async getSaleById(req: Request, res: Response): Promise<void> {
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
      const sale = await this.saleService.getSaleById(req.user.companyId, id);

      if (!sale) {
        res.status(404).json({
          success: false,
          message: 'Sale not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Sale retrieved successfully',
        data: sale,
      });

    } catch (error) {
      logger.error('Error fetching sale:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Process a refund for a sale
   */
  async processRefund(req: Request, res: Response): Promise<void> {
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
      const { amount, reason, refundItems, refundMethod } = req.body;

      const refund = await this.saleService.processRefund(req.user.companyId, id, {
        amount,
        reason,
        refundItems,
        refundMethod: refundMethod || 'CASH',
        processedBy: req.user.userId,
      });

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: refund,
      });

    } catch (error) {
      logger.error('Error processing refund:', error);
      
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
   * Generate receipt for a sale
   */
  async generateReceipt(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const { format = 'json', template = 'standard' } = req.query;

      const receipt = await this.saleService.generateReceipt(req.user.companyId, id, {
        format: format as string,
        template: template as string,
      });

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="receipt-${id}.pdf"`);
        res.send(receipt);
      } else {
        res.json({
          success: true,
          message: 'Receipt generated successfully',
          data: receipt,
        });
      }

    } catch (error) {
      logger.error('Error generating receipt:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
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
   * Get daily sales summary
   */
  async getDailySummary(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { date, branchId } = req.query;

      const summary = await this.saleService.getDailySummary(req.user.companyId, {
        date: date as string,
        branchId: branchId as string,
      });

      res.json({
        success: true,
        message: 'Daily summary retrieved successfully',
        data: summary,
      });

    } catch (error) {
      logger.error('Error fetching daily summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' }),
      });
    }
  }

  /**
   * Apply discount to a sale
   */
  async applyDiscount(req: Request, res: Response): Promise<void> {
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

      const { discountType, discountValue, saleId } = req.body;

      const updatedSale = await this.saleService.applyDiscount(req.user.companyId, saleId, {
        discountType,
        discountValue,
        appliedBy: req.user.userId,
      });

      res.json({
        success: true,
        message: 'Discount applied successfully',
        data: updatedSale,
      });

    } catch (error) {
      logger.error('Error applying discount:', error);
      
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
}

export const saleController = new SaleController();