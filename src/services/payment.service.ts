import { PrismaClient, Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreatePaymentData {
  companyId: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  transactionId?: string;
  paymentGateway?: string;
  paymentDate?: Date;
}

interface UpdatePaymentData {
  amount?: number;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
  status?: PaymentStatus;
  transactionId?: string;
  paymentGateway?: string;
  processedAt?: Date;
}

interface PaymentFilters {
  companyId: string;
  invoiceId?: string;
  clientId?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface RefundData {
  amount: number;
  reason?: string;
  refundReference?: string;
}

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new payment
   */
  async createPayment(data: CreatePaymentData, createdById: string) {
    // Verify the invoice exists and belongs to the company
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: data.invoiceId,
        companyId: data.companyId
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Verify the client matches the invoice
    if (invoice.clientId !== data.clientId) {
      throw new Error('Client does not match invoice');
    }

    // Check if payment amount exceeds outstanding balance
    const outstandingBalance = invoice.balanceAmount;
    if (new Decimal(data.amount).greaterThan(outstandingBalance)) {
      throw new Error(`Payment amount (${data.amount}) exceeds outstanding balance (${outstandingBalance})`);
    }

    // Create the payment
    const payment = await this.prisma.payment.create({
      data: {
        companyId: data.companyId,
        invoiceId: data.invoiceId,
        clientId: data.clientId,
        amount: new Decimal(data.amount),
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        notes: data.notes,
        transactionId: data.transactionId,
        paymentGateway: data.paymentGateway,
        paymentDate: data.paymentDate || new Date(),
        status: PaymentStatus.COMPLETED, // Default to completed for manual payments
        processedAt: new Date(),
        createdById
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paidAmount: true,
            balanceAmount: true
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Update invoice payment status after creating payment
    const { InvoiceService } = await import('./invoice.service');
    const invoiceService = new InvoiceService(this.prisma);
    await invoiceService.updateInvoicePaymentStatus(data.invoiceId);

    return payment;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string, companyId: string) {
    return await this.prisma.payment.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            client: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Get payments with filters and pagination
   */
  async getPayments(filters: PaymentFilters, pagination: PaginationOptions) {
    const { 
      companyId, 
      invoiceId, 
      clientId, 
      status, 
      paymentMethod, 
      startDate, 
      endDate, 
      search 
    } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      companyId,
      ...(invoiceId && { invoiceId }),
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(paymentMethod && { paymentMethod }),
      ...(startDate && endDate && {
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      }),
      ...(search && {
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { transactionId: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { invoice: { 
            invoiceNumber: { contains: search, mode: 'insensitive' }
          }},
          { client: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }}
        ]
      })
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true
            }
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      this.prisma.payment.count({ where })
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get payments for a specific invoice
   */
  async getInvoicePayments(invoiceId: string, companyId: string) {
    return await this.prisma.payment.findMany({
      where: {
        invoiceId,
        companyId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Update payment
   */
  async updatePayment(id: string, data: UpdatePaymentData, companyId: string) {
    const existingPayment = await this.prisma.payment.findFirst({
      where: { id, companyId }
    });

    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    // Check if payment can be updated
    if (existingPayment.status === PaymentStatus.REFUNDED) {
      throw new Error('Cannot update refunded payment');
    }

    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        ...data,
        ...(data.amount && { amount: new Decimal(data.amount) }),
        updatedAt: new Date()
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Update invoice payment status if amount or status changed
    if (data.amount !== undefined || data.status !== undefined) {
      const { InvoiceService } = await import('./invoice.service');
      const invoiceService = new InvoiceService(this.prisma);
      await invoiceService.updateInvoicePaymentStatus(existingPayment.invoiceId);
    }

    return payment;
  }

  /**
   * Process refund
   */
  async processRefund(
    id: string, 
    refundData: RefundData, 
    companyId: string, 
    processedById: string
  ) {
    const existingPayment = await this.prisma.payment.findFirst({
      where: { id, companyId },
      include: { invoice: true }
    });

    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    if (existingPayment.status === PaymentStatus.REFUNDED) {
      throw new Error('Payment already refunded');
    }

    if (existingPayment.status !== PaymentStatus.COMPLETED && existingPayment.status !== PaymentStatus.PAID) {
      throw new Error('Cannot refund non-completed payment');
    }

    // Check refund amount
    const refundAmount = new Decimal(refundData.amount);
    if (refundAmount.greaterThan(existingPayment.amount)) {
      throw new Error(`Refund amount (${refundData.amount}) cannot exceed payment amount (${existingPayment.amount})`);
    }

    let refundPayment;

    if (refundAmount.equals(existingPayment.amount)) {
      // Full refund - update existing payment
      refundPayment = await this.prisma.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REFUNDED,
          notes: refundData.reason 
            ? `${existingPayment.notes || ''}\nRefund reason: ${refundData.reason}`
            : existingPayment.notes,
          reference: refundData.refundReference || existingPayment.reference,
          processedAt: new Date()
        }
      });
    } else {
      // Partial refund - create negative payment entry
      refundPayment = await this.prisma.payment.create({
        data: {
          companyId: existingPayment.companyId,
          invoiceId: existingPayment.invoiceId,
          clientId: existingPayment.clientId,
          amount: refundAmount.negated(), // Negative amount for refund
          paymentMethod: existingPayment.paymentMethod,
          reference: refundData.refundReference || `REFUND-${existingPayment.reference || existingPayment.id}`,
          notes: `Partial refund for payment ${existingPayment.id}. ${refundData.reason || ''}`,
          status: PaymentStatus.REFUNDED,
          transactionId: existingPayment.transactionId,
          paymentGateway: existingPayment.paymentGateway,
          processedAt: new Date(),
          createdById: processedById
        }
      });
    }

    // Update invoice payment status after refund
    const { InvoiceService } = await import('./invoice.service');
    const invoiceService = new InvoiceService(this.prisma);
    await invoiceService.updateInvoicePaymentStatus(existingPayment.invoiceId);

    return refundPayment;
  }

  /**
   * Cancel payment (only if pending)
   */
  async cancelPayment(id: string, companyId: string, reason?: string) {
    const existingPayment = await this.prisma.payment.findFirst({
      where: { id, companyId }
    });

    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    if (existingPayment.status !== PaymentStatus.PENDING) {
      throw new Error('Only pending payments can be cancelled');
    }

    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.CANCELLED,
        notes: reason 
          ? `${existingPayment.notes || ''}\nCancellation reason: ${reason}`
          : existingPayment.notes,
        processedAt: new Date()
      }
    });

    // Update invoice payment status
    const { InvoiceService } = await import('./invoice.service');
    const invoiceService = new InvoiceService(this.prisma);
    await invoiceService.updateInvoicePaymentStatus(existingPayment.invoiceId);

    return payment;
  }

  /**
   * Get payment summary for a company
   */
  async getPaymentSummary(companyId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.PaymentWhereInput = {
      companyId,
      status: { in: [PaymentStatus.COMPLETED, PaymentStatus.PAID] },
      ...(startDate && endDate && {
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    const [summary, methodCounts] = await Promise.all([
      this.prisma.payment.aggregate({
        where,
        _sum: {
          amount: true
        },
        _count: true
      }),
      this.prisma.payment.groupBy({
        where,
        by: ['paymentMethod'],
        _sum: {
          amount: true
        },
        _count: true
      })
    ]);

    return {
      totalPayments: summary._count,
      totalAmount: summary._sum.amount || 0,
      methodBreakdown: methodCounts.map(item => ({
        method: item.paymentMethod,
        count: item._count,
        amount: item._sum.amount || 0
      }))
    };
  }

  /**
   * Get recent payments
   */
  async getRecentPayments(companyId: string, limit: number = 10) {
    return await this.prisma.payment.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        invoice: {
          select: {
            invoiceNumber: true
          }
        },
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(companyId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payments = await this.prisma.payment.findMany({
      where: {
        companyId,
        paymentDate: {
          gte: startDate
        },
        status: { in: [PaymentStatus.COMPLETED, PaymentStatus.PAID] }
      },
      select: {
        amount: true,
        paymentDate: true,
        paymentMethod: true
      }
    });

    // Group by date
    const dailyTotals = payments.reduce((acc, payment) => {
      const date = payment.paymentDate.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, amount: new Decimal(0), count: 0 };
      }
      acc[date].amount = acc[date].amount.add(payment.amount);
      acc[date].count++;
      return acc;
    }, {} as Record<string, { date: string; amount: Decimal; count: number }>);

    // Group by method
    const methodTotals = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod;
      if (!acc[method]) {
        acc[method] = { method, amount: new Decimal(0), count: 0 };
      }
      acc[method].amount = acc[method].amount.add(payment.amount);
      acc[method].count++;
      return acc;
    }, {} as Record<string, { method: string; amount: Decimal; count: number }>);

    return {
      dailyTotals: Object.values(dailyTotals).map(item => ({
        ...item,
        amount: item.amount.toNumber()
      })),
      methodTotals: Object.values(methodTotals).map(item => ({
        ...item,
        amount: item.amount.toNumber()
      })),
      totalAmount: payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0)).toNumber(),
      totalCount: payments.length
    };
  }

  /**
   * Validate payment data
   */
  validatePaymentData(data: CreatePaymentData | UpdatePaymentData): string[] {
    const errors: string[] = [];

    if ('amount' in data && data.amount !== undefined) {
      if (data.amount <= 0) {
        errors.push('Payment amount must be greater than 0');
      }
    }

    if ('paymentMethod' in data && data.paymentMethod !== undefined) {
      const validMethods = Object.values(PaymentMethod);
      if (!validMethods.includes(data.paymentMethod)) {
        errors.push('Invalid payment method');
      }
    }

    return errors;
  }

  /**
   * Delete payment (only if pending or failed)
   */
  async deletePayment(id: string, companyId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, companyId }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (![PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.CANCELLED].includes(payment.status)) {
      throw new Error('Only pending, failed, or cancelled payments can be deleted');
    }

    const result = await this.prisma.payment.delete({
      where: { id }
    });

    // Update invoice payment status
    const { InvoiceService } = await import('./invoice.service');
    const invoiceService = new InvoiceService(this.prisma);
    await invoiceService.updateInvoicePaymentStatus(payment.invoiceId);

    return result;
  }

  /**
   * Retry failed payment
   */
  async retryPayment(id: string, companyId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, companyId }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.FAILED) {
      throw new Error('Only failed payments can be retried');
    }

    return await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.PENDING,
        processedAt: null,
        updatedAt: new Date()
      }
    });
  }
}