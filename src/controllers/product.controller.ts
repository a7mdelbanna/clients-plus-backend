import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  active?: boolean;
  trackInventory?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export class ProductController {
  
  // ==================== Product CRUD ====================

  /**
   * Create a new product
   */
  async createProduct(req: Request, res: Response): Promise<void> {
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

      const productData = {
        ...req.body,
        companyId: req.user.companyId,
        price: new Prisma.Decimal(req.body.price),
        cost: req.body.cost ? new Prisma.Decimal(req.body.cost) : null,
        taxRate: req.body.taxRate ? new Prisma.Decimal(req.body.taxRate) : new Prisma.Decimal(0),
      };

      // Check for duplicate SKU or barcode
      if (productData.sku || productData.barcode) {
        const existing = await prisma.product.findFirst({
          where: {
            companyId: req.user.companyId,
            OR: [
              productData.sku ? { sku: productData.sku } : {},
              productData.barcode ? { barcode: productData.barcode } : {},
            ].filter(condition => Object.keys(condition).length > 0),
          },
        });

        if (existing) {
          res.status(400).json({
            success: false,
            message: 'Product with this SKU or barcode already exists',
          });
          return;
        }
      }

      const product = await prisma.product.create({
        data: productData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      logger.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all products with filtering
   */
  async getProducts(req: Request, res: Response): Promise<void> {
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

      const filters: ProductFilters = {
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        active: req.query.active ? req.query.active === 'true' : undefined,
        trackInventory: req.query.trackInventory ? req.query.trackInventory === 'true' : undefined,
        lowStock: req.query.lowStock === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 50));
      const skip = (page - 1) * limit;

      const where: Prisma.ProductWhereInput = {
        companyId: req.user.companyId,
      };

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { nameAr: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { barcode: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.active !== undefined) {
        where.active = filters.active;
      }

      if (filters.trackInventory !== undefined) {
        where.trackInventory = filters.trackInventory;
      }

      // For low stock filter, we need to join with inventory
      if (filters.lowStock) {
        where.inventories = {
          some: {
            quantity: {
              lte: prisma.raw(`"Product"."lowStockThreshold"`),
            },
          },
        };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
            inventories: {
              select: {
                quantity: true,
                reservedQuantity: true,
                branch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                inventories: true,
              },
            },
          },
          orderBy: [
            { name: 'asc' },
          ],
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      // Calculate total stock and low stock status for each product
      const productsWithCalculations = products.map(product => {
        const totalStock = product.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalReserved = product.inventories.reduce((sum, inv) => sum + inv.reservedQuantity, 0);
        const availableStock = totalStock - totalReserved;
        const isLowStock = product.lowStockThreshold ? availableStock <= product.lowStockThreshold : false;
        const isOutOfStock = availableStock <= 0;

        return {
          ...product,
          totalStock,
          totalReserved,
          availableStock,
          isLowStock,
          isOutOfStock,
          branchCount: product.inventories.length,
        };
      });

      res.json({
        success: true,
        data: productsWithCalculations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        message: 'Products retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve products',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(req: Request, res: Response): Promise<void> {
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

      const product = await prisma.product.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          inventories: {
            include: {
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          movements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              branch: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      // Calculate totals
      const totalStock = product.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      const totalReserved = product.inventories.reduce((sum, inv) => sum + inv.reservedQuantity, 0);
      const availableStock = totalStock - totalReserved;

      res.json({
        success: true,
        data: {
          ...product,
          totalStock,
          totalReserved,
          availableStock,
          isLowStock: product.lowStockThreshold ? availableStock <= product.lowStockThreshold : false,
          isOutOfStock: availableStock <= 0,
        },
        message: 'Product retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update a product
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
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

      // Check if product exists and belongs to company
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
      });

      if (!existingProduct) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      const updateData: any = { ...req.body };

      // Convert decimal fields
      if (updateData.price !== undefined) {
        updateData.price = new Prisma.Decimal(updateData.price);
      }
      if (updateData.cost !== undefined) {
        updateData.cost = updateData.cost ? new Prisma.Decimal(updateData.cost) : null;
      }
      if (updateData.taxRate !== undefined) {
        updateData.taxRate = new Prisma.Decimal(updateData.taxRate);
      }

      // Check for duplicate SKU or barcode if being updated
      if (updateData.sku || updateData.barcode) {
        const duplicateCheck = await prisma.product.findFirst({
          where: {
            companyId: req.user.companyId,
            id: { not: id }, // Exclude current product
            OR: [
              updateData.sku && updateData.sku !== existingProduct.sku ? { sku: updateData.sku } : {},
              updateData.barcode && updateData.barcode !== existingProduct.barcode ? { barcode: updateData.barcode } : {},
            ].filter(condition => Object.keys(condition).length > 0),
          },
        });

        if (duplicateCheck) {
          res.status(400).json({
            success: false,
            message: 'Product with this SKU or barcode already exists',
          });
          return;
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      logger.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
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

      // Check if product exists and belongs to company
      const product = await prisma.product.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        include: {
          inventories: true,
          movements: true,
        },
      });

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      // Check if product has inventory or movements
      if (product.inventories.length > 0 || product.movements.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete product with existing inventory or movement history. Consider deactivating instead.',
        });
        return;
      }

      await prisma.product.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Barcode Management ====================

  /**
   * Search products by barcode
   */
  async searchByBarcode(req: Request, res: Response): Promise<void> {
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

      const { barcode } = req.params;

      const product = await prisma.product.findFirst({
        where: {
          barcode,
          companyId: req.user.companyId,
          active: true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          inventories: {
            include: {
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found with this barcode',
        });
        return;
      }

      // Calculate stock info
      const totalStock = product.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      const totalReserved = product.inventories.reduce((sum, inv) => sum + inv.reservedQuantity, 0);
      const availableStock = totalStock - totalReserved;

      res.json({
        success: true,
        data: {
          ...product,
          totalStock,
          totalReserved,
          availableStock,
          isLowStock: product.lowStockThreshold ? availableStock <= product.lowStockThreshold : false,
          isOutOfStock: availableStock <= 0,
        },
        message: 'Product found by barcode',
      });
    } catch (error) {
      logger.error('Error searching by barcode:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search by barcode',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Product Statistics ====================

  /**
   * Get product statistics
   */
  async getProductStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const [
        totalProducts,
        activeProducts,
        trackedProducts,
        categoriesCount,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
      ] = await Promise.all([
        prisma.product.count({
          where: { companyId: req.user.companyId },
        }),
        prisma.product.count({
          where: { companyId: req.user.companyId, active: true },
        }),
        prisma.product.count({
          where: { companyId: req.user.companyId, trackInventory: true },
        }),
        prisma.productCategory.count({
          where: { companyId: req.user.companyId, active: true },
        }),
        // Calculate total stock value
        prisma.product.aggregate({
          where: { companyId: req.user.companyId, active: true },
          _sum: { stock: true },
        }),
        // Products with low stock
        prisma.product.count({
          where: {
            companyId: req.user.companyId,
            active: true,
            trackInventory: true,
            stock: {
              lte: prisma.raw(`"lowStockThreshold"`),
            },
            lowStockThreshold: { not: null },
          },
        }),
        // Products out of stock
        prisma.product.count({
          where: {
            companyId: req.user.companyId,
            active: true,
            trackInventory: true,
            stock: { lte: 0 },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalProducts,
          activeProducts,
          inactiveProducts: totalProducts - activeProducts,
          trackedProducts,
          untrackedProducts: activeProducts - trackedProducts,
          categoriesCount,
          totalStockUnits: totalStockValue._sum.stock || 0,
          lowStockCount,
          outOfStockCount,
          stockHealthPercentage: trackedProducts > 0 
            ? Math.round(((trackedProducts - lowStockCount - outOfStockCount) / trackedProducts) * 100)
            : 100,
        },
        message: 'Product statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting product stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const productController = new ProductController();