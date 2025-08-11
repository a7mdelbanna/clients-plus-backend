import { prisma } from '../config/database';
import { Prisma, Sale, SaleItem, SaleRefund, PaymentMethod, DiscountType, SaleStatus, RefundStatus } from '@prisma/client';
import { logger } from '../config/logger';

export interface CreateSaleData {
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

export interface RefundData {
  amount: number;
  reason?: string;
  refundItems?: any[];
  refundMethod: string;
  processedBy: string;
}

export interface DiscountData {
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  appliedBy: string;
}

export class SaleService {

  /**
   * Generate unique sale number
   */
  private async generateSaleNumber(companyId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `SALE-${year}${month}${day}`;
    
    // Find the latest sale number for today
    const latestSale = await prisma.sale.findFirst({
      where: {
        companyId,
        saleNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        saleNumber: 'desc',
      },
    });

    if (!latestSale) {
      return `${prefix}-001`;
    }

    // Extract the sequence number and increment
    const sequenceMatch = latestSale.saleNumber.match(/-(\d{3})$/);
    const sequence = sequenceMatch ? parseInt(sequenceMatch[1], 10) + 1 : 1;
    
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Calculate line totals and sale totals
   */
  private calculateTotals(
    items: CreateSaleData['items'],
    discountType: DiscountType = DiscountType.FIXED,
    discountValue: number = 0
  ) {
    let subtotal = 0;
    let totalTax = 0;

    const processedItems = items.map(item => {
      const lineDiscount = item.discount || 0;
      const taxRate = (item.taxRate || 0) / 100;
      
      const lineSubtotal = (item.unitPrice * item.quantity) - lineDiscount;
      const taxAmount = lineSubtotal * taxRate;
      const lineTotal = lineSubtotal + taxAmount;
      
      subtotal += lineSubtotal;
      totalTax += taxAmount;
      
      return {
        ...item,
        discount: lineDiscount,
        taxAmount: new Prisma.Decimal(taxAmount),
        lineTotal: new Prisma.Decimal(lineTotal),
      };
    });

    // Apply overall discount
    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === DiscountType.PERCENTAGE) {
        discountAmount = subtotal * (discountValue / 100);
      } else {
        discountAmount = discountValue;
      }
    }

    const total = subtotal + totalTax - discountAmount;

    return {
      items: processedItems,
      subtotal: new Prisma.Decimal(subtotal),
      taxAmount: new Prisma.Decimal(totalTax),
      discountAmount: new Prisma.Decimal(discountAmount),
      total: new Prisma.Decimal(total),
    };
  }

  /**
   * Create a new sale transaction
   */
  async createSale(companyId: string, saleData: CreateSaleData) {
    return await prisma.$transaction(async (tx) => {
      try {
        // Generate sale number
        const saleNumber = await this.generateSaleNumber(companyId);

        // Calculate totals
        const calculations = this.calculateTotals(
          saleData.items,
          saleData.discountType as DiscountType || DiscountType.FIXED,
          saleData.discountValue || 0
        );

        // Calculate change due
        const changeDue = Math.max(0, saleData.amountPaid - calculations.total.toNumber());

        // Create the sale
        const sale = await tx.sale.create({
          data: {
            companyId,
            saleNumber,
            branchId: saleData.branchId,
            staffId: saleData.staffId,
            clientId: saleData.clientId,
            subtotal: calculations.subtotal,
            discountType: saleData.discountType as DiscountType || DiscountType.FIXED,
            discountValue: new Prisma.Decimal(saleData.discountValue || 0),
            discountAmount: calculations.discountAmount,
            taxAmount: calculations.taxAmount,
            total: calculations.total,
            paymentMethod: saleData.paymentMethod as PaymentMethod,
            amountPaid: new Prisma.Decimal(saleData.amountPaid),
            changeDue: new Prisma.Decimal(changeDue),
            status: SaleStatus.COMPLETED,
            notes: saleData.notes,
            internalNotes: saleData.internalNotes,
            receiptNumber: `RCP-${saleNumber}`,
          },
        });

        // Create sale items
        for (const item of calculations.items) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              type: item.type as any,
              productId: item.productId,
              serviceId: item.serviceId,
              name: item.name,
              description: item.description,
              sku: item.productId ? undefined : null, // Will be populated from product if exists
              unitPrice: new Prisma.Decimal(item.unitPrice),
              quantity: new Prisma.Decimal(item.quantity),
              discount: new Prisma.Decimal(item.discount),
              taxRate: new Prisma.Decimal(item.taxRate || 0),
              taxAmount: item.taxAmount,
              lineTotal: item.lineTotal,
            },
          });
        }

        // Update inventory for products
        for (const item of saleData.items) {
          if (item.type === 'PRODUCT' && item.productId) {
            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                branchId: saleData.branchId,
                type: 'OUT',
                quantity: typeof item.quantity === 'number' ? item.quantity : (item.quantity as any).toNumber(),
                unitCost: new Prisma.Decimal(0), // Will be updated based on product cost
                notes: `Sale: ${saleNumber}`,
              },
            });

            // Update inventory levels
            const inventory = await tx.inventory.findFirst({
              where: {
                productId: item.productId,
                branchId: saleData.branchId,
              },
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: {
                    decrement: item.quantity,
                  },
                },
              });
            }
          }
        }

        // Fetch complete sale with relations
        return await tx.sale.findUnique({
          where: { id: sale.id },
          include: {
            items: {
              include: {
                product: true,
                service: true,
              },
            },
            branch: true,
            staff: true,
            client: true,
          },
        });

      } catch (error) {
        logger.error('Error in createSale transaction:', error);
        throw error;
      }
    });
  }

  /**
   * Get sales with filtering and pagination
   */
  async getSales(companyId: string, filters: SaleFilters) {
    const {
      search,
      staffId,
      clientId,
      branchId,
      paymentMethod,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: Prisma.SaleWhereInput = {
      companyId,
      ...(staffId && { staffId }),
      ...(clientId && { clientId }),
      ...(branchId && { branchId }),
      ...(paymentMethod && { paymentMethod: paymentMethod as PaymentMethod }),
      ...(status && { status: status as SaleStatus }),
      ...(startDate || endDate) && {
        saleDate: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      },
      ...(search && {
        OR: [
          { saleNumber: { contains: search, mode: 'insensitive' } },
          { receiptNumber: { contains: search, mode: 'insensitive' } },
          { client: { firstName: { contains: search, mode: 'insensitive' } } },
          { client: { lastName: { contains: search, mode: 'insensitive' } } },
          { staff: { firstName: { contains: search, mode: 'insensitive' } } },
          { staff: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    // Get total count
    const total = await prisma.sale.count({ where });

    // Get paginated data
    const skip = (page - 1) * limit;
    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
        branch: true,
        staff: true,
        client: true,
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take: limit,
    });

    return {
      data: sales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get sale by ID
   */
  async getSaleById(companyId: string, saleId: string) {
    return await prisma.sale.findFirst({
      where: {
        id: saleId,
        companyId,
      },
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
        branch: true,
        staff: true,
        client: true,
        refunds: true,
        invoice: true,
      },
    });
  }

  /**
   * Process a refund for a sale
   */
  async processRefund(companyId: string, saleId: string, refundData: RefundData) {
    return await prisma.$transaction(async (tx) => {
      // Get the sale
      const sale = await tx.sale.findFirst({
        where: { id: saleId, companyId },
        include: { items: true, refunds: true },
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      if (sale.status === SaleStatus.CANCELLED) {
        throw new Error('Cannot refund a cancelled sale');
      }

      // Check if refund amount is valid
      const totalRefunded = sale.refunds.reduce((sum, refund) => sum + refund.amount.toNumber(), 0);
      const availableForRefund = sale.total.toNumber() - totalRefunded;

      if (refundData.amount > availableForRefund) {
        throw new Error('Refund amount exceeds available amount for refund');
      }

      // Generate refund number
      const refundNumber = `REF-${sale.saleNumber}-${String(sale.refunds.length + 1).padStart(3, '0')}`;

      // Create refund record
      const refund = await tx.saleRefund.create({
        data: {
          saleId,
          refundNumber,
          amount: new Prisma.Decimal(refundData.amount),
          reason: refundData.reason,
          refundItems: refundData.refundItems as any,
          refundMethod: refundData.refundMethod as PaymentMethod,
          status: RefundStatus.COMPLETED,
          processedBy: refundData.processedBy,
        },
      });

      // Update sale refund tracking
      const newTotalRefunded = totalRefunded + refundData.amount;
      const isFullyRefunded = newTotalRefunded >= sale.total.toNumber();

      await tx.sale.update({
        where: { id: saleId },
        data: {
          isRefunded: true,
          refundedAmount: new Prisma.Decimal(newTotalRefunded),
          status: isFullyRefunded ? SaleStatus.REFUNDED : SaleStatus.PARTIALLY_REFUNDED,
        },
      });

      // Handle inventory restoration if products were refunded
      if (refundData.refundItems) {
        for (const refundItem of refundData.refundItems) {
          const saleItem = sale.items.find(item => item.id === refundItem.itemId);
          if (saleItem && saleItem.productId) {
            // Create inventory movement for returned stock
            await tx.inventoryMovement.create({
              data: {
                productId: saleItem.productId,
                branchId: sale.branchId,
                type: 'IN',
                quantity: typeof refundItem.quantity === 'number' ? refundItem.quantity : (refundItem.quantity as any),
                unitCost: new Prisma.Decimal(0),
                notes: `Refund: ${refundNumber}`,
              },
            });

            // Update inventory levels
            const inventory = await tx.inventory.findFirst({
              where: {
                productId: saleItem.productId,
                branchId: sale.branchId,
              },
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: {
                    increment: refundItem.quantity,
                  },
                },
              });
            }
          }
        }
      }

      return refund;
    });
  }

  /**
   * Generate receipt for a sale
   */
  async generateReceipt(companyId: string, saleId: string, options: { format: string; template: string }) {
    const sale = await this.getSaleById(companyId, saleId);
    
    if (!sale) {
      throw new Error('Sale not found');
    }

    // For now, return JSON format. PDF generation would require additional libraries
    if (options.format === 'pdf') {
      // TODO: Implement PDF generation using libraries like puppeteer or pdfkit
      throw new Error('PDF generation not implemented yet');
    }

    return {
      saleNumber: sale.saleNumber,
      receiptNumber: sale.receiptNumber,
      date: sale.saleDate,
      branch: sale.branch.name,
      staff: sale.staff ? `${sale.staff.firstName} ${sale.staff.lastName}` : null,
      client: sale.client ? `${sale.client.firstName} ${sale.client.lastName}` : null,
      items: sale.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.lineTotal,
      })),
      subtotal: sale.subtotal,
      discount: sale.discountAmount,
      tax: sale.taxAmount,
      total: sale.total,
      amountPaid: sale.amountPaid,
      changeDue: sale.changeDue,
      paymentMethod: sale.paymentMethod,
    };
  }

  /**
   * Get daily sales summary
   */
  async getDailySummary(companyId: string, options: { date?: string; branchId?: string }) {
    const targetDate = options.date ? new Date(options.date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const where: Prisma.SaleWhereInput = {
      companyId,
      saleDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        not: SaleStatus.CANCELLED,
      },
      ...(options.branchId && { branchId: options.branchId }),
    };

    const [
      totalSales,
      salesCount,
      paymentMethodBreakdown,
      topItems,
    ] = await Promise.all([
      // Total sales amount
      prisma.sale.aggregate({
        where,
        _sum: { total: true },
      }),

      // Number of sales
      prisma.sale.count({ where }),

      // Payment method breakdown
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { total: true },
        _count: true,
      }),

      // Top selling items
      prisma.saleItem.groupBy({
        by: ['name'],
        where: {
          sale: where,
        },
        _sum: { quantity: true, lineTotal: true },
        _count: true,
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      date: targetDate,
      totalSales: totalSales._sum.total || 0,
      salesCount,
      averageSale: salesCount > 0 ? (totalSales._sum.total?.toNumber() || 0) / salesCount : 0,
      paymentMethodBreakdown: paymentMethodBreakdown.map(item => ({
        method: item.paymentMethod,
        amount: item._sum.total || 0,
        count: item._count,
      })),
      topItems: topItems.map(item => ({
        name: item.name,
        quantitySold: item._sum.quantity || 0,
        totalRevenue: item._sum.lineTotal || 0,
        timesSold: item._count,
      })),
    };
  }

  /**
   * Apply discount to a sale (for draft sales)
   */
  async applyDiscount(companyId: string, saleId: string, discountData: DiscountData) {
    return await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, companyId },
        include: { items: true },
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      if (sale.status !== SaleStatus.DRAFT) {
        throw new Error('Cannot modify discount on completed sale');
      }

      // Recalculate totals with new discount
      const itemData = sale.items.map(item => ({
        type: item.type,
        name: item.name,
        unitPrice: item.unitPrice.toNumber(),
        quantity: item.quantity.toNumber(),
        discount: item.discount.toNumber(),
        taxRate: item.taxRate.toNumber(),
      }));

      const calculations = this.calculateTotals(
        itemData,
        discountData.discountType as DiscountType,
        discountData.discountValue
      );

      // Update the sale
      return await tx.sale.update({
        where: { id: saleId },
        data: {
          discountType: discountData.discountType as DiscountType,
          discountValue: new Prisma.Decimal(discountData.discountValue),
          discountAmount: calculations.discountAmount,
          total: calculations.total,
        },
        include: {
          items: true,
          branch: true,
          staff: true,
          client: true,
        },
      });
    });
  }
}