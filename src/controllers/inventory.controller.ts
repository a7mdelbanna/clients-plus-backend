import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { InventoryMovementType } from '@prisma/client';
import { 
  inventoryService, 
  InventoryLevel, 
  StockAdjustmentData, 
  StockTransferData,
  InventoryMovementFilters 
} from '../services/inventory.service';
import { logger } from '../config/logger';

export class InventoryController {
  
  // ==================== Inventory Levels ====================
  
  /**
   * Get inventory levels with optional filtering
   */
  async getInventoryLevels(req: Request, res: Response): Promise<void> {
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

      const { branchId, lowStockOnly } = req.query;
      
      const levels = await inventoryService.getInventoryLevels(
        req.user.companyId,
        branchId as string | undefined,
        lowStockOnly === 'true'
      );

      res.json({
        success: true,
        data: levels,
        message: 'Inventory levels retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting inventory levels:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve inventory levels',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get inventory for a specific product
   */
  async getProductInventory(req: Request, res: Response): Promise<void> {
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

      const { productId } = req.params;
      
      const levels = await inventoryService.getProductInventory(
        req.user.companyId,
        productId
      );

      res.json({
        success: true,
        data: levels,
        message: 'Product inventory retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting product inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product inventory',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check product availability
   */
  async checkAvailability(req: Request, res: Response): Promise<void> {
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

      const { productId, branchId } = req.params;
      const { quantity } = req.query;

      if (!quantity || isNaN(Number(quantity))) {
        res.status(400).json({
          success: false,
          message: 'Valid quantity parameter is required',
        });
        return;
      }

      const availability = await inventoryService.checkAvailability(
        req.user.companyId,
        productId,
        branchId,
        Number(quantity)
      );

      res.json({
        success: true,
        data: availability,
        message: 'Availability checked successfully',
      });
    } catch (error) {
      logger.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check availability',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Stock Adjustments ====================
  
  /**
   * Adjust stock levels
   */
  async adjustStock(req: Request, res: Response): Promise<void> {
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

      const adjustmentData: StockAdjustmentData = {
        ...req.body,
        performedBy: req.user.userId,
      };

      const movement = await inventoryService.adjustStock(
        req.user.companyId,
        adjustmentData
      );

      res.status(201).json({
        success: true,
        data: movement,
        message: 'Stock adjusted successfully',
      });
    } catch (error) {
      logger.error('Error adjusting stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to adjust stock',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Transfer stock between branches
   */
  async transferStock(req: Request, res: Response): Promise<void> {
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

      const transferData: StockTransferData = {
        ...req.body,
        performedBy: req.user.userId,
      };

      const result = await inventoryService.transferStock(
        req.user.companyId,
        transferData
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Stock transferred successfully',
      });
    } catch (error) {
      logger.error('Error transferring stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to transfer stock',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Stock Operations ====================
  
  /**
   * Add stock (receive inventory)
   */
  async addStock(req: Request, res: Response): Promise<void> {
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

      const { productId, branchId, quantity, unitCost, reference, notes } = req.body;

      const movement = await inventoryService.addStock(
        req.user.companyId,
        productId,
        branchId,
        quantity,
        unitCost,
        reference,
        notes,
        req.user.userId
      );

      res.status(201).json({
        success: true,
        data: movement,
        message: 'Stock added successfully',
      });
    } catch (error) {
      logger.error('Error adding stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add stock',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Remove stock (consume/sell inventory)
   */
  async removeStock(req: Request, res: Response): Promise<void> {
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

      const { productId, branchId, quantity, reference, notes } = req.body;

      const movement = await inventoryService.removeStock(
        req.user.companyId,
        productId,
        branchId,
        quantity,
        reference,
        notes,
        req.user.userId
      );

      res.status(201).json({
        success: true,
        data: movement,
        message: 'Stock removed successfully',
      });
    } catch (error) {
      logger.error('Error removing stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove stock',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Stock Movements & History ====================
  
  /**
   * Get stock movements with filtering
   */
  async getMovements(req: Request, res: Response): Promise<void> {
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

      const filters: InventoryMovementFilters = {
        productId: req.query.productId as string,
        branchId: req.query.branchId as string,
        type: req.query.type as InventoryMovementType,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await inventoryService.getMovements(
        req.user.companyId,
        filters
      );

      res.json({
        success: true,
        data: result.movements,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        message: 'Stock movements retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting movements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock movements',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Stock Reservations ====================
  
  /**
   * Reserve stock for orders/appointments
   */
  async reserveStock(req: Request, res: Response): Promise<void> {
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

      const { productId, branchId, quantity, reference } = req.body;

      await inventoryService.reserveStock(
        req.user.companyId,
        productId,
        branchId,
        quantity,
        reference
      );

      res.json({
        success: true,
        message: 'Stock reserved successfully',
      });
    } catch (error) {
      logger.error('Error reserving stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reserve stock',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Release stock reservation
   */
  async releaseReservation(req: Request, res: Response): Promise<void> {
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

      const { productId, branchId, quantity } = req.body;

      await inventoryService.releaseReservation(
        req.user.companyId,
        productId,
        branchId,
        quantity
      );

      res.json({
        success: true,
        message: 'Stock reservation released successfully',
      });
    } catch (error) {
      logger.error('Error releasing reservation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to release stock reservation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Alerts & Reports ====================
  
  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(req: Request, res: Response): Promise<void> {
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

      const { branchId } = req.query;

      const alerts = await inventoryService.getLowStockAlerts(
        req.user.companyId,
        branchId as string | undefined
      );

      res.json({
        success: true,
        data: alerts,
        message: 'Low stock alerts retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting low stock alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve low stock alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get inventory valuation
   */
  async getInventoryValuation(req: Request, res: Response): Promise<void> {
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

      const { branchId } = req.query;

      const valuation = await inventoryService.getInventoryValuation(
        req.user.companyId,
        branchId as string | undefined
      );

      res.json({
        success: true,
        data: valuation,
        message: 'Inventory valuation calculated successfully',
      });
    } catch (error) {
      logger.error('Error calculating inventory valuation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate inventory valuation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const inventoryController = new InventoryController();