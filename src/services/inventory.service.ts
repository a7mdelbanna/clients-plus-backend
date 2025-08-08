import { PrismaClient, Inventory, InventoryMovement, InventoryMovementType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface InventoryLevel {
  productId: string;
  productName: string;
  productSku?: string;
  branchId: string;
  branchName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold?: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastRestocked?: Date;
  lastCountDate?: Date;
}

export interface StockAdjustmentData {
  productId: string;
  branchId: string;
  newQuantity: number;
  reason: string;
  notes?: string;
  performedBy?: string;
}

export interface StockTransferData {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
  performedBy?: string;
}

export interface InventoryMovementFilters {
  productId?: string;
  branchId?: string;
  type?: InventoryMovementType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class InventoryService {

  // ==================== Inventory Levels ====================

  async getInventoryLevels(
    companyId: string, 
    branchId?: string,
    lowStockOnly = false
  ): Promise<InventoryLevel[]> {
    try {
      const where: Prisma.InventoryWhereInput = {
        product: {
          companyId,
          active: true,
          trackInventory: true,
        },
      };

      if (branchId) {
        where.branchId = branchId;
      }

      const inventories = await prisma.inventory.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              lowStockThreshold: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { quantity: 'asc' }, // Show low stock first
          { product: { name: 'asc' } },
        ],
      });

      const levels: InventoryLevel[] = inventories.map(inv => {
        const availableQuantity = inv.quantity - inv.reservedQuantity;
        const isOutOfStock = availableQuantity <= 0;
        const isLowStock = inv.product.lowStockThreshold 
          ? availableQuantity <= inv.product.lowStockThreshold 
          : false;

        return {
          productId: inv.productId,
          productName: inv.product.name,
          productSku: inv.product.sku || undefined,
          branchId: inv.branchId,
          branchName: inv.branch.name,
          quantity: inv.quantity,
          reservedQuantity: inv.reservedQuantity,
          availableQuantity,
          lowStockThreshold: inv.product.lowStockThreshold || undefined,
          isLowStock,
          isOutOfStock,
          lastRestocked: inv.lastRestocked || undefined,
          lastCountDate: inv.lastCountDate || undefined,
        };
      });

      if (lowStockOnly) {
        return levels.filter(level => level.isLowStock || level.isOutOfStock);
      }

      return levels;
    } catch (error) {
      console.error('Error getting inventory levels:', error);
      throw error;
    }
  }

  async getProductInventory(companyId: string, productId: string): Promise<InventoryLevel[]> {
    try {
      // Verify product belongs to company
      const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      return this.getInventoryLevels(companyId, undefined, false).then(levels =>
        levels.filter(level => level.productId === productId)
      );
    } catch (error) {
      console.error('Error getting product inventory:', error);
      throw error;
    }
  }

  // ==================== Stock Adjustments ====================

  async adjustStock(companyId: string, data: StockAdjustmentData): Promise<InventoryMovement> {
    try {
      // Verify product belongs to company
      const product = await prisma.product.findFirst({
        where: { id: data.productId, companyId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Verify branch belongs to company
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId },
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      return prisma.$transaction(async (tx) => {
        // Get or create inventory record
        let inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.branchId,
            },
          },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId: data.productId,
              branchId: data.branchId,
              quantity: 0,
              reservedQuantity: 0,
            },
          });
        }

        const currentQuantity = inventory.quantity;
        const quantityDifference = data.newQuantity - currentQuantity;

        // Update inventory quantity
        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.branchId,
            },
          },
          data: {
            quantity: data.newQuantity,
            lastCountDate: new Date(),
          },
        });

        // Create inventory movement record
        const movement = await tx.inventoryMovement.create({
          data: {
            productId: data.productId,
            branchId: data.branchId,
            type: 'ADJUSTMENT',
            quantity: quantityDifference,
            reference: `ADJ-${Date.now()}`,
            referenceType: 'adjustment',
            notes: `${data.reason}. Previous: ${currentQuantity}, New: ${data.newQuantity}. ${data.notes || ''}`,
            performedBy: data.performedBy,
          },
          include: {
            product: {
              select: { name: true, sku: true },
            },
            branch: {
              select: { name: true },
            },
          },
        });

        // Update product total stock
        await this.updateProductTotalStock(tx, data.productId);

        return movement;
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

  async transferStock(companyId: string, data: StockTransferData): Promise<{
    outMovement: InventoryMovement;
    inMovement: InventoryMovement;
  }> {
    try {
      // Verify product belongs to company
      const product = await prisma.product.findFirst({
        where: { id: data.productId, companyId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Verify branches belong to company
      const [fromBranch, toBranch] = await Promise.all([
        prisma.branch.findFirst({ where: { id: data.fromBranchId, companyId } }),
        prisma.branch.findFirst({ where: { id: data.toBranchId, companyId } }),
      ]);

      if (!fromBranch) {
        throw new Error('Source branch not found');
      }
      if (!toBranch) {
        throw new Error('Destination branch not found');
      }

      if (data.fromBranchId === data.toBranchId) {
        throw new Error('Cannot transfer to the same branch');
      }

      return prisma.$transaction(async (tx) => {
        // Check source inventory
        const sourceInventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.fromBranchId,
            },
          },
        });

        if (!sourceInventory || sourceInventory.quantity < data.quantity) {
          throw new Error('Insufficient stock in source branch');
        }

        // Get or create destination inventory
        let destInventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.toBranchId,
            },
          },
        });

        if (!destInventory) {
          destInventory = await tx.inventory.create({
            data: {
              productId: data.productId,
              branchId: data.toBranchId,
              quantity: 0,
              reservedQuantity: 0,
            },
          });
        }

        const transferReference = `TRF-${Date.now()}`;

        // Update source inventory (subtract)
        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.fromBranchId,
            },
          },
          data: {
            quantity: sourceInventory.quantity - data.quantity,
          },
        });

        // Update destination inventory (add)
        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.toBranchId,
            },
          },
          data: {
            quantity: destInventory.quantity + data.quantity,
            lastRestocked: new Date(),
          },
        });

        // Create outbound movement
        const outMovement = await tx.inventoryMovement.create({
          data: {
            productId: data.productId,
            branchId: data.fromBranchId,
            type: 'TRANSFER',
            quantity: -data.quantity,
            reference: transferReference,
            referenceType: 'transfer_out',
            notes: `Transfer to ${toBranch.name}. ${data.notes || ''}`,
            performedBy: data.performedBy,
          },
          include: {
            product: { select: { name: true, sku: true } },
            branch: { select: { name: true } },
          },
        });

        // Create inbound movement
        const inMovement = await tx.inventoryMovement.create({
          data: {
            productId: data.productId,
            branchId: data.toBranchId,
            type: 'TRANSFER',
            quantity: data.quantity,
            reference: transferReference,
            referenceType: 'transfer_in',
            notes: `Transfer from ${fromBranch.name}. ${data.notes || ''}`,
            performedBy: data.performedBy,
          },
          include: {
            product: { select: { name: true, sku: true } },
            branch: { select: { name: true } },
          },
        });

        return {
          outMovement,
          inMovement,
        };
      });
    } catch (error) {
      console.error('Error transferring stock:', error);
      throw error;
    }
  }

  // ==================== Stock Movements ====================

  async addStock(
    companyId: string,
    productId: string,
    branchId: string,
    quantity: number,
    unitCost?: number,
    reference?: string,
    notes?: string,
    performedBy?: string
  ): Promise<InventoryMovement> {
    try {
      return this.recordMovement({
        companyId,
        productId,
        branchId,
        type: 'IN',
        quantity,
        unitCost,
        reference,
        referenceType: 'purchase',
        notes,
        performedBy,
      });
    } catch (error) {
      console.error('Error adding stock:', error);
      throw error;
    }
  }

  async removeStock(
    companyId: string,
    productId: string,
    branchId: string,
    quantity: number,
    reference?: string,
    notes?: string,
    performedBy?: string
  ): Promise<InventoryMovement> {
    try {
      return this.recordMovement({
        companyId,
        productId,
        branchId,
        type: 'OUT',
        quantity: -quantity,
        reference,
        referenceType: 'sale',
        notes,
        performedBy,
      });
    } catch (error) {
      console.error('Error removing stock:', error);
      throw error;
    }
  }

  async recordMovement(data: {
    companyId: string;
    productId: string;
    branchId: string;
    type: InventoryMovementType;
    quantity: number;
    unitCost?: number;
    reference?: string;
    referenceType?: string;
    notes?: string;
    performedBy?: string;
  }): Promise<InventoryMovement> {
    try {
      return prisma.$transaction(async (tx) => {
        // Verify product and branch
        const [product, branch] = await Promise.all([
          tx.product.findFirst({ where: { id: data.productId, companyId: data.companyId } }),
          tx.branch.findFirst({ where: { id: data.branchId, companyId: data.companyId } }),
        ]);

        if (!product) throw new Error('Product not found');
        if (!branch) throw new Error('Branch not found');

        // Get or create inventory record
        let inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.branchId,
            },
          },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId: data.productId,
              branchId: data.branchId,
              quantity: 0,
              reservedQuantity: 0,
            },
          });
        }

        // Check for sufficient stock on outbound movements
        if (data.quantity < 0 && Math.abs(data.quantity) > inventory.quantity) {
          throw new Error('Insufficient stock for this operation');
        }

        // Update inventory quantity
        const newQuantity = inventory.quantity + data.quantity;
        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: data.branchId,
            },
          },
          data: {
            quantity: newQuantity,
            lastRestocked: data.quantity > 0 ? new Date() : inventory.lastRestocked,
          },
        });

        // Create movement record
        const movement = await tx.inventoryMovement.create({
          data: {
            productId: data.productId,
            branchId: data.branchId,
            type: data.type,
            quantity: data.quantity,
            unitCost: data.unitCost ? new Prisma.Decimal(data.unitCost) : null,
            reference: data.reference,
            referenceType: data.referenceType,
            notes: data.notes,
            performedBy: data.performedBy,
          },
          include: {
            product: {
              select: { name: true, sku: true },
            },
            branch: {
              select: { name: true },
            },
          },
        });

        // Update product total stock
        await this.updateProductTotalStock(tx, data.productId);

        return movement;
      });
    } catch (error) {
      console.error('Error recording movement:', error);
      throw error;
    }
  }

  async getMovements(
    companyId: string,
    filters: InventoryMovementFilters = {}
  ): Promise<{
    movements: InventoryMovement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 50));
      const skip = (page - 1) * limit;

      const where: Prisma.InventoryMovementWhereInput = {
        product: { companyId },
      };

      if (filters.productId) {
        where.productId = filters.productId;
      }

      if (filters.branchId) {
        where.branchId = filters.branchId;
      }

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      const [movements, total] = await Promise.all([
        prisma.inventoryMovement.findMany({
          where,
          include: {
            product: {
              select: { name: true, sku: true },
            },
            branch: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.inventoryMovement.count({ where }),
      ]);

      return {
        movements,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error getting movements:', error);
      throw error;
    }
  }

  // ==================== Stock Reservations ====================

  async reserveStock(
    companyId: string,
    productId: string,
    branchId: string,
    quantity: number,
    reference?: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId,
              branchId,
            },
          },
        });

        if (!inventory) {
          throw new Error('Inventory record not found');
        }

        const availableQuantity = inventory.quantity - inventory.reservedQuantity;
        if (availableQuantity < quantity) {
          throw new Error('Insufficient available stock for reservation');
        }

        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId,
              branchId,
            },
          },
          data: {
            reservedQuantity: inventory.reservedQuantity + quantity,
          },
        });
      });
    } catch (error) {
      console.error('Error reserving stock:', error);
      throw error;
    }
  }

  async releaseReservation(
    companyId: string,
    productId: string,
    branchId: string,
    quantity: number
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId,
              branchId,
            },
          },
        });

        if (!inventory) {
          throw new Error('Inventory record not found');
        }

        const newReservedQuantity = Math.max(0, inventory.reservedQuantity - quantity);

        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId,
              branchId,
            },
          },
          data: {
            reservedQuantity: newReservedQuantity,
          },
        });
      });
    } catch (error) {
      console.error('Error releasing reservation:', error);
      throw error;
    }
  }

  // ==================== Utility Methods ====================

  private async updateProductTotalStock(
    tx: Prisma.TransactionClient,
    productId: string
  ): Promise<void> {
    const inventories = await tx.inventory.findMany({
      where: { productId },
      select: { quantity: true },
    });

    const totalStock = inventories.reduce((sum, inv) => sum + inv.quantity, 0);

    await tx.product.update({
      where: { id: productId },
      data: { stock: totalStock },
    });
  }

  async getLowStockAlerts(companyId: string, branchId?: string): Promise<InventoryLevel[]> {
    return this.getInventoryLevels(companyId, branchId, true);
  }

  async getInventoryValuation(companyId: string, branchId?: string): Promise<{
    totalValue: number;
    totalQuantity: number;
    averageCostPerUnit: number;
    itemsCount: number;
  }> {
    try {
      const where: Prisma.InventoryWhereInput = {
        product: {
          companyId,
          active: true,
          trackInventory: true,
        },
      };

      if (branchId) {
        where.branchId = branchId;
      }

      const inventories = await prisma.inventory.findMany({
        where,
        include: {
          product: {
            select: {
              price: true,
              cost: true,
            },
          },
        },
      });

      let totalValue = 0;
      let totalQuantity = 0;
      let totalCost = 0;

      inventories.forEach(inv => {
        const quantity = inv.quantity;
        const costPrice = Number(inv.product.cost || inv.product.price);
        
        totalQuantity += quantity;
        totalValue += quantity * costPrice;
        totalCost += costPrice;
      });

      return {
        totalValue,
        totalQuantity,
        averageCostPerUnit: inventories.length > 0 ? totalCost / inventories.length : 0,
        itemsCount: inventories.length,
      };
    } catch (error) {
      console.error('Error calculating inventory valuation:', error);
      throw error;
    }
  }

  async checkAvailability(
    companyId: string,
    productId: string,
    branchId: string,
    requestedQuantity: number
  ): Promise<{
    available: boolean;
    currentStock: number;
    reservedQuantity: number;
    availableQuantity: number;
    message?: string;
  }> {
    try {
      const inventory = await prisma.inventory.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId,
          },
        },
        include: {
          product: {
            select: { trackInventory: true, name: true },
          },
        },
      });

      if (!inventory) {
        return {
          available: false,
          currentStock: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          message: 'Product not found in this branch',
        };
      }

      if (!inventory.product.trackInventory) {
        return {
          available: true,
          currentStock: -1, // Unlimited
          reservedQuantity: 0,
          availableQuantity: -1, // Unlimited
        };
      }

      const availableQuantity = inventory.quantity - inventory.reservedQuantity;
      const available = availableQuantity >= requestedQuantity;

      return {
        available,
        currentStock: inventory.quantity,
        reservedQuantity: inventory.reservedQuantity,
        availableQuantity,
        message: !available 
          ? `Only ${availableQuantity} units available (${inventory.reservedQuantity} reserved)`
          : undefined,
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }
}

export const inventoryService = new InventoryService();