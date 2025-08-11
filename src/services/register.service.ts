import { prisma } from '../config/database';
import { Prisma, CashRegisterDay, CashRegisterStatus } from '@prisma/client';
import { logger } from '../config/logger';

export interface OpenRegisterData {
  branchId: string;
  accountId: string;
  openingBalance: number;
  date?: string;
  openedBy: string;
}

export interface CloseRegisterData {
  expectedCashAmount?: number;
  actualCashAmount: number;
  notes?: string;
  closedBy: string;
}

export interface CashDropData {
  amount: number;
  reason: string;
  notes?: string;
  recordedBy: string;
}

export interface AdjustmentData {
  amount: number;
  type: 'IN' | 'OUT';
  reason: string;
  notes?: string;
  adjustedBy: string;
}

export interface RegisterFilters {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class RegisterService {

  /**
   * Open daily register
   */
  async openRegister(companyId: string, registerData: OpenRegisterData) {
    return await prisma.$transaction(async (tx) => {
      try {
        const targetDate = registerData.date ? new Date(registerData.date) : new Date();
        const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

        // Check if register is already open for this date and branch
        const existingRegister = await tx.cashRegisterDay.findFirst({
          where: {
            companyId,
            branchId: registerData.branchId,
            date: dateOnly,
            status: {
              in: [CashRegisterStatus.OPEN],
            },
          },
        });

        if (existingRegister) {
          throw new Error('Register is already open for this date and branch');
        }

        // Verify branch and account exist
        const [branch, account] = await Promise.all([
          tx.branch.findFirst({
            where: { id: registerData.branchId, companyId },
          }),
          tx.financialAccount.findFirst({
            where: { id: registerData.accountId, companyId },
          }),
        ]);

        if (!branch) {
          throw new Error('Branch not found');
        }

        if (!account) {
          throw new Error('Account not found');
        }

        // Create new register day
        const register = await tx.cashRegisterDay.create({
          data: {
            companyId,
            branchId: registerData.branchId,
            accountId: registerData.accountId,
            date: dateOnly,
            openingBalance: new Prisma.Decimal(registerData.openingBalance),
            openedBy: registerData.openedBy,
            openedAt: new Date(),
            status: CashRegisterStatus.OPEN,
          },
          include: {
            branch: true,
            account: true,
          },
        });

        return register;

      } catch (error) {
        logger.error('Error in openRegister transaction:', error);
        throw error;
      }
    });
  }

  /**
   * Close and reconcile register
   */
  async closeRegister(companyId: string, registerId: string, closeData: CloseRegisterData) {
    return await prisma.$transaction(async (tx) => {
      try {
        // Get the register
        const register = await tx.cashRegisterDay.findFirst({
          where: {
            id: registerId,
            companyId,
          },
          include: {
            sales: {
              where: {
                status: {
                  not: 'CANCELLED',
                },
              },
            },
          },
        });

        if (!register) {
          throw new Error('Register not found');
        }

        if (register.status === CashRegisterStatus.CLOSED) {
          throw new Error('Register is already closed');
        }

        // Calculate expected cash from sales
        const cashSalesTotal = register.sales
          .filter(sale => sale.paymentMethod === 'CASH')
          .reduce((sum, sale) => sum + sale.total.toNumber(), 0);

        const expectedCashAmount = register.openingBalance.toNumber() + 
                                   cashSalesTotal + 
                                   register.cashIn.toNumber() - 
                                   register.cashOut.toNumber();

        // Calculate variance
        const cashVariance = closeData.actualCashAmount - expectedCashAmount;

        // Update register
        const updatedRegister = await tx.cashRegisterDay.update({
          where: { id: registerId },
          data: {
            closingBalance: new Prisma.Decimal(closeData.actualCashAmount),
            expectedCashAmount: new Prisma.Decimal(expectedCashAmount),
            actualCashAmount: new Prisma.Decimal(closeData.actualCashAmount),
            cashVariance: new Prisma.Decimal(cashVariance),
            status: CashRegisterStatus.CLOSED,
            closedBy: closeData.closedBy,
            closedAt: new Date(),
            notes: closeData.notes,
          },
          include: {
            branch: true,
            account: true,
            sales: {
              include: {
                items: true,
              },
            },
          },
        });

        return updatedRegister;

      } catch (error) {
        logger.error('Error in closeRegister transaction:', error);
        throw error;
      }
    });
  }

  /**
   * Get current register shift for a branch
   */
  async getCurrentShift(companyId: string, branchId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return await prisma.cashRegisterDay.findFirst({
      where: {
        companyId,
        branchId,
        date: startOfDay,
        status: CashRegisterStatus.OPEN,
      },
      include: {
        branch: true,
        account: true,
        sales: {
          include: {
            items: true,
            client: true,
            staff: true,
          },
          orderBy: {
            saleDate: 'desc',
          },
        },
      },
    });
  }

  /**
   * Record cash drop
   */
  async recordCashDrop(companyId: string, registerId: string, cashDropData: CashDropData) {
    return await prisma.$transaction(async (tx) => {
      try {
        // Get the register
        const register = await tx.cashRegisterDay.findFirst({
          where: {
            id: registerId,
            companyId,
          },
        });

        if (!register) {
          throw new Error('Register not found');
        }

        if (register.status !== CashRegisterStatus.OPEN) {
          throw new Error('Cannot record cash drop on closed register');
        }

        // Update register with cash drop
        const updatedRegister = await tx.cashRegisterDay.update({
          where: { id: registerId },
          data: {
            cashOut: {
              increment: cashDropData.amount,
            },
            cashOutReason: register.cashOutReason 
              ? `${register.cashOutReason}; ${cashDropData.reason}` 
              : cashDropData.reason,
            updatedAt: new Date(),
          },
        });

        // Create financial transaction for cash drop
        await tx.financialTransaction.create({
          data: {
            companyId,
            branchId: register.branchId,
            accountId: register.accountId,
            type: 'WITHDRAWAL',
            amount: new Prisma.Decimal(cashDropData.amount),
            description: `Cash drop: ${cashDropData.reason}`,
            reference: `CD-${register.id}-${Date.now()}`,
            transactionDate: new Date(),
            status: 'COMPLETED',
            notes: cashDropData.notes,
            createdBy: cashDropData.recordedBy,
          },
        });

        return updatedRegister;

      } catch (error) {
        logger.error('Error in recordCashDrop transaction:', error);
        throw error;
      }
    });
  }

  /**
   * Record adjustment
   */
  async recordAdjustment(companyId: string, registerId: string, adjustmentData: AdjustmentData) {
    return await prisma.$transaction(async (tx) => {
      try {
        // Get the register
        const register = await tx.cashRegisterDay.findFirst({
          where: {
            id: registerId,
            companyId,
          },
        });

        if (!register) {
          throw new Error('Register not found');
        }

        if (register.status !== CashRegisterStatus.OPEN) {
          throw new Error('Cannot record adjustment on closed register');
        }

        // Update register with adjustment
        const updateData: any = {};
        
        if (adjustmentData.type === 'IN') {
          updateData.cashIn = { increment: adjustmentData.amount };
          updateData.cashInReason = register.cashInReason 
            ? `${register.cashInReason}; ${adjustmentData.reason}` 
            : adjustmentData.reason;
        } else {
          updateData.cashOut = { increment: adjustmentData.amount };
          updateData.cashOutReason = register.cashOutReason 
            ? `${register.cashOutReason}; ${adjustmentData.reason}` 
            : adjustmentData.reason;
        }

        updateData.updatedAt = new Date();

        const updatedRegister = await tx.cashRegisterDay.update({
          where: { id: registerId },
          data: updateData,
        });

        // Create financial transaction for adjustment
        await tx.financialTransaction.create({
          data: {
            companyId,
            branchId: register.branchId,
            accountId: register.accountId,
            type: adjustmentData.type === 'IN' ? 'DEPOSIT' : 'WITHDRAWAL',
            amount: new Prisma.Decimal(adjustmentData.amount),
            description: `Cash adjustment: ${adjustmentData.reason}`,
            reference: `ADJ-${register.id}-${Date.now()}`,
            transactionDate: new Date(),
            status: 'COMPLETED',
            notes: adjustmentData.notes,
            createdBy: adjustmentData.adjustedBy,
          },
        });

        return updatedRegister;

      } catch (error) {
        logger.error('Error in recordAdjustment transaction:', error);
        throw error;
      }
    });
  }

  /**
   * Get register history with filtering
   */
  async getRegisterHistory(companyId: string, filters: RegisterFilters) {
    const {
      branchId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: Prisma.CashRegisterDayWhereInput = {
      companyId,
      ...(branchId && { branchId }),
      ...(startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      },
    };

    // Get total count
    const total = await prisma.cashRegisterDay.count({ where });

    // Get paginated data
    const skip = (page - 1) * limit;
    const registers = await prisma.cashRegisterDay.findMany({
      where,
      include: {
        branch: true,
        account: true,
        sales: {
          select: {
            id: true,
            total: true,
            paymentMethod: true,
            saleDate: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    return {
      data: registers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed register summary
   */
  async getRegisterSummary(companyId: string, registerId: string) {
    const register = await prisma.cashRegisterDay.findFirst({
      where: {
        id: registerId,
        companyId,
      },
      include: {
        branch: true,
        account: true,
        sales: {
          include: {
            items: true,
            client: true,
            staff: true,
            refunds: true,
          },
        },
      },
    });

    if (!register) {
      return null;
    }

    // Calculate summary statistics
    const salesSummary = register.sales.reduce((acc, sale) => {
      if (sale.status === 'CANCELLED') return acc;

      acc.totalSales += sale.total.toNumber();
      acc.totalTransactions++;

      // Payment method breakdown
      const method = sale.paymentMethod;
      if (!acc.paymentMethods[method]) {
        acc.paymentMethods[method] = { count: 0, amount: 0 };
      }
      acc.paymentMethods[method].count++;
      acc.paymentMethods[method].amount += sale.total.toNumber();

      // Refunds
      const refundAmount = sale.refunds.reduce((sum, refund) => sum + refund.amount.toNumber(), 0);
      acc.totalRefunds += refundAmount;
      if (refundAmount > 0) acc.refundTransactions++;

      return acc;
    }, {
      totalSales: 0,
      totalTransactions: 0,
      totalRefunds: 0,
      refundTransactions: 0,
      paymentMethods: {} as Record<string, { count: number; amount: number }>,
    });

    // Item analysis
    const itemSummary = register.sales.flatMap(sale => sale.items).reduce((acc, item) => {
      const key = item.name;
      if (!acc[key]) {
        acc[key] = { quantity: 0, amount: 0, count: 0 };
      }
      acc[key].quantity += item.quantity.toNumber();
      acc[key].amount += item.lineTotal.toNumber();
      acc[key].count++;
      return acc;
    }, {} as Record<string, { quantity: number; amount: number; count: number }>);

    const topItems = Object.entries(itemSummary)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      register,
      summary: {
        ...salesSummary,
        netSales: salesSummary.totalSales - salesSummary.totalRefunds,
        averageTransaction: salesSummary.totalTransactions > 0 
          ? salesSummary.totalSales / salesSummary.totalTransactions 
          : 0,
      },
      topItems,
      cashFlow: {
        openingBalance: register.openingBalance.toNumber(),
        cashSales: salesSummary.paymentMethods['CASH']?.amount || 0,
        cashIn: register.cashIn.toNumber(),
        cashOut: register.cashOut.toNumber(),
        expectedClosing: register.openingBalance.toNumber() + 
                        (salesSummary.paymentMethods['CASH']?.amount || 0) + 
                        register.cashIn.toNumber() - 
                        register.cashOut.toNumber(),
        actualClosing: register.actualCashAmount?.toNumber() || null,
        variance: register.cashVariance?.toNumber() || null,
      },
    };
  }

  /**
   * Reconcile register
   */
  async reconcileRegister(companyId: string, registerId: string, reconcileData: { reconciledBy: string; notes?: string }) {
    return await prisma.$transaction(async (tx) => {
      try {
        // Get the register
        const register = await tx.cashRegisterDay.findFirst({
          where: {
            id: registerId,
            companyId,
          },
        });

        if (!register) {
          throw new Error('Register not found');
        }

        if (register.status !== CashRegisterStatus.CLOSED) {
          throw new Error('Cannot reconcile register that is not closed');
        }

        if (register.isReconciled) {
          throw new Error('Register is already reconciled');
        }

        // Update register as reconciled
        const updatedRegister = await tx.cashRegisterDay.update({
          where: { id: registerId },
          data: {
            isReconciled: true,
            reconciledBy: reconcileData.reconciledBy,
            reconciledAt: new Date(),
            status: CashRegisterStatus.RECONCILED,
            notes: reconcileData.notes 
              ? (register.notes ? `${register.notes}; ${reconcileData.notes}` : reconcileData.notes)
              : register.notes,
          },
          include: {
            branch: true,
            account: true,
          },
        });

        // If there's a cash variance, create an adjustment transaction
        if (register.cashVariance && register.cashVariance.toNumber() !== 0) {
          const variance = register.cashVariance.toNumber();
          
          await tx.financialTransaction.create({
            data: {
              companyId,
              branchId: register.branchId,
              accountId: register.accountId,
              type: variance > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
              amount: new Prisma.Decimal(Math.abs(variance)),
              description: `Cash variance reconciliation - ${variance > 0 ? 'Overage' : 'Shortage'}`,
              reference: `RECON-${register.id}`,
              transactionDate: new Date(),
              status: 'COMPLETED',
              notes: `Register reconciliation variance: ${variance}`,
              createdBy: reconcileData.reconciledBy,
            },
          });
        }

        return updatedRegister;

      } catch (error) {
        logger.error('Error in reconcileRegister transaction:', error);
        throw error;
      }
    });
  }

  /**
   * Get register performance analytics
   */
  async getRegisterAnalytics(companyId: string, filters: { branchId?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.CashRegisterDayWhereInput = {
      companyId,
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.startDate || filters.endDate) && {
        date: {
          ...(filters.startDate && { gte: new Date(filters.startDate) }),
          ...(filters.endDate && { lte: new Date(filters.endDate) }),
        },
      },
    };

    const [
      totalRegisters,
      avgDailySales,
      paymentMethodStats,
      branchPerformance,
    ] = await Promise.all([
      // Total number of register days
      prisma.cashRegisterDay.count({ where }),

      // Average daily sales
      prisma.cashRegisterDay.aggregate({
        where,
        _avg: { salesAmount: true },
      }),

      // Payment method statistics across all registers
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          registerDay: where,
        },
        _sum: { total: true },
        _count: true,
      }),

      // Branch performance
      prisma.cashRegisterDay.groupBy({
        by: ['branchId'],
        where,
        _sum: { salesAmount: true },
        _avg: { salesAmount: true },
        _count: true,
        orderBy: { _sum: { salesAmount: 'desc' } },
      }),
    ]);

    return {
      totalRegisterDays: totalRegisters,
      averageDailySales: avgDailySales._avg.salesAmount || 0,
      paymentMethodBreakdown: paymentMethodStats.map(stat => ({
        method: stat.paymentMethod,
        totalAmount: stat._sum.total || 0,
        transactionCount: stat._count,
      })),
      branchPerformance: branchPerformance.map(branch => ({
        branchId: branch.branchId,
        totalSales: branch._sum.salesAmount || 0,
        averageDailySales: branch._avg.salesAmount || 0,
        registerDays: branch._count,
      })),
    };
  }
}