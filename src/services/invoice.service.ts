import { PrismaClient, Prisma, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateInvoiceData {
  companyId: string;
  branchId: string;
  clientId: string;
  appointmentId?: string;
  dueDate: Date;
  currency?: string;
  items: CreateInvoiceItemData[];
  notes?: string;
  internalNotes?: string;
  terms?: string;
  termsConditions?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  taxRate?: number;
}

interface CreateInvoiceItemData {
  type: 'SERVICE' | 'PRODUCT' | 'CUSTOM';
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

interface UpdateInvoiceData {
  dueDate?: Date;
  items?: CreateInvoiceItemData[];
  notes?: string;
  internalNotes?: string;
  terms?: string;
  termsConditions?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  taxRate?: number;
  status?: InvoiceStatus;
}

interface InvoiceFilters {
  companyId: string;
  branchId?: string;
  clientId?: string;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

export class InvoiceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate unique invoice number for a company
   */
  async generateInvoiceNumber(companyId: string): Promise<string> {
    // Get company settings for invoice numbering
    const companySetting = await this.prisma.companySetting.findUnique({
      where: {
        companyId_key: {
          companyId,
          key: 'invoice_numbering'
        }
      }
    });

    let prefix = 'INV';
    let nextNumber = 1;
    let padding = 4;

    if (companySetting?.value) {
      const settings = companySetting.value as any;
      prefix = settings.prefix || 'INV';
      padding = settings.padding || 4;
    }

    // Get the last invoice number
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true }
    });

    if (lastInvoice) {
      // Extract number from the last invoice (assuming format: PREFIX-000001)
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Format with padding
    const paddedNumber = nextNumber.toString().padStart(padding, '0');
    const invoiceNumber = `${prefix}-${paddedNumber}`;

    // Ensure uniqueness
    const existing = await this.prisma.invoice.findUnique({
      where: { companyId_invoiceNumber: { companyId, invoiceNumber } }
    });

    if (existing) {
      // If somehow duplicate, try with incremented number
      const nextPaddedNumber = (nextNumber + 1).toString().padStart(padding, '0');
      return `${prefix}-${nextPaddedNumber}`;
    }

    return invoiceNumber;
  }

  /**
   * Calculate tax amount based on subtotal and tax rate
   */
  private calculateTaxAmount(subtotal: Decimal, taxRate: Decimal): Decimal {
    return subtotal.mul(taxRate.div(100));
  }

  /**
   * Calculate discount amount based on subtotal, discount type and value
   */
  private calculateDiscountAmount(
    subtotal: Decimal,
    discountType: string | null,
    discountValue: Decimal | null
  ): Decimal {
    if (!discountType || !discountValue) {
      return new Decimal(0);
    }

    if (discountType === 'PERCENTAGE') {
      return subtotal.mul(discountValue.div(100));
    }

    // Fixed discount
    return discountValue;
  }

  /**
   * Calculate invoice totals
   */
  private calculateInvoiceTotals(
    items: CreateInvoiceItemData[],
    discountType?: string,
    discountValue?: number,
    taxRate?: number
  ) {
    let subtotal = new Decimal(0);

    // Calculate items total
    const calculatedItems = items.map(item => {
      const itemSubtotal = new Decimal(item.unitPrice).mul(new Decimal(item.quantity));
      const itemDiscount = new Decimal(item.discount || 0);
      const itemTaxRate = new Decimal(item.taxRate || 0);
      
      const itemAfterDiscount = itemSubtotal.sub(itemDiscount);
      const itemTax = itemAfterDiscount.mul(itemTaxRate.div(100));
      const itemTotal = itemAfterDiscount.add(itemTax);

      subtotal = subtotal.add(itemTotal);

      return {
        ...item,
        total: itemTotal.toNumber()
      };
    });

    // Apply invoice-level discount
    const discountAmount = this.calculateDiscountAmount(
      subtotal,
      discountType || null,
      discountValue ? new Decimal(discountValue) : null
    );

    const afterDiscount = subtotal.sub(discountAmount);

    // Apply invoice-level tax
    const taxAmount = taxRate 
      ? this.calculateTaxAmount(afterDiscount, new Decimal(taxRate))
      : new Decimal(0);

    const total = afterDiscount.add(taxAmount);

    return {
      subtotal: subtotal.toNumber(),
      discountAmount: discountAmount.toNumber(),
      taxAmount: taxAmount.toNumber(),
      total: total.toNumber(),
      calculatedItems
    };
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: CreateInvoiceData, createdById: string) {
    const invoiceNumber = await this.generateInvoiceNumber(data.companyId);
    
    // Calculate totals
    const {
      subtotal,
      discountAmount,
      taxAmount,
      total,
      calculatedItems
    } = this.calculateInvoiceTotals(
      data.items,
      data.discountType,
      data.discountValue,
      data.taxRate
    );

    return await this.prisma.invoice.create({
      data: {
        companyId: data.companyId,
        branchId: data.branchId,
        clientId: data.clientId,
        appointmentId: data.appointmentId,
        invoiceNumber,
        invoiceDate: new Date(),
        dueDate: data.dueDate,
        currency: data.currency || 'EGP',
        subtotal: new Decimal(subtotal),
        taxRate: new Decimal(data.taxRate || 0),
        taxAmount: new Decimal(taxAmount),
        discountAmount: new Decimal(discountAmount),
        discountType: data.discountType,
        discountValue: data.discountValue ? new Decimal(data.discountValue) : null,
        total: new Decimal(total),
        balanceAmount: new Decimal(total),
        status: InvoiceStatus.DRAFT,
        paymentStatus: PaymentStatus.PENDING,
        notes: data.notes,
        internalNotes: data.internalNotes,
        terms: data.terms,
        termsConditions: data.termsConditions,
        createdById,
        items: {
          create: calculatedItems.map((item, index) => ({
            type: item.type,
            itemId: item.itemId,
            description: item.description,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            discount: item.discount ? new Decimal(item.discount) : null,
            taxRate: item.taxRate ? new Decimal(item.taxRate) : null,
            total: new Decimal(item.total),
            order: index
          }))
        }
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true
          }
        },
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            title: true
          }
        },
        items: {
          orderBy: { order: 'asc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string, companyId: string) {
    return await this.prisma.invoice.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            logo: true,
            taxId: true
          }
        },
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            title: true,
            staff: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        items: {
          orderBy: { order: 'asc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get invoices with filters and pagination
   */
  async getInvoices(filters: InvoiceFilters, pagination: PaginationOptions) {
    const { companyId, branchId, clientId, status, paymentStatus, startDate, endDate, search } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(branchId && { branchId }),
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(startDate && endDate && {
        invoiceDate: {
          gte: startDate,
          lte: endDate
        }
      }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
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

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true
            }
          },
          items: {
            orderBy: { order: 'asc' }
          }
        }
      }),
      this.prisma.invoice.count({ where })
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, data: UpdateInvoiceData, companyId: string, updatedById: string) {
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: { items: true }
    });

    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }

    // Check if invoice can be updated
    if (existingInvoice.status === InvoiceStatus.PAID) {
      throw new Error('Cannot update paid invoice');
    }

    let updateData: any = {
      updatedAt: new Date()
    };

    // If items are being updated, recalculate totals
    if (data.items) {
      const {
        subtotal,
        discountAmount,
        taxAmount,
        total,
        calculatedItems
      } = this.calculateInvoiceTotals(
        data.items,
        data.discountType,
        data.discountValue,
        data.taxRate
      );

      updateData = {
        ...updateData,
        subtotal: new Decimal(subtotal),
        taxRate: new Decimal(data.taxRate || 0),
        taxAmount: new Decimal(taxAmount),
        discountAmount: new Decimal(discountAmount),
        discountType: data.discountType,
        discountValue: data.discountValue ? new Decimal(data.discountValue) : null,
        total: new Decimal(total),
        balanceAmount: new Decimal(total).sub(existingInvoice.paidAmount),
        items: {
          deleteMany: {},
          create: calculatedItems.map((item, index) => ({
            type: item.type,
            itemId: item.itemId,
            description: item.description,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            discount: item.discount ? new Decimal(item.discount) : null,
            taxRate: item.taxRate ? new Decimal(item.taxRate) : null,
            total: new Decimal(item.total),
            order: index
          }))
        }
      };
    }

    // Update other fields
    Object.keys(data).forEach(key => {
      if (key !== 'items' && data[key as keyof UpdateInvoiceData] !== undefined) {
        updateData[key] = data[key as keyof UpdateInvoiceData];
      }
    });

    return await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          orderBy: { order: 'asc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Send invoice to client
   */
  async sendInvoice(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be sent');
    }

    return await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.SENT,
        sentAt: new Date()
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paidAmount: invoice.total,
        balanceAmount: new Decimal(0),
        paidAt: new Date()
      }
    });
  }

  /**
   * Update invoice payment status based on payments
   */
  async updateInvoicePaymentStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: {
          where: { 
            status: { in: [PaymentStatus.COMPLETED, PaymentStatus.PAID] }
          }
        }
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const totalPaid = invoice.payments.reduce((sum, payment) => 
      sum.add(payment.amount), new Decimal(0)
    );

    const balanceAmount = invoice.total.sub(totalPaid);

    let paymentStatus = PaymentStatus.PENDING;
    let invoiceStatus = invoice.status;

    if (totalPaid.greaterThanOrEqualTo(invoice.total)) {
      paymentStatus = PaymentStatus.PAID;
      invoiceStatus = InvoiceStatus.PAID;
    } else if (totalPaid.greaterThan(0)) {
      paymentStatus = PaymentStatus.PARTIAL;
      invoiceStatus = InvoiceStatus.PARTIAL;
    }

    // Check if overdue
    if (new Date() > invoice.dueDate && paymentStatus !== PaymentStatus.PAID) {
      paymentStatus = PaymentStatus.OVERDUE;
      invoiceStatus = InvoiceStatus.OVERDUE;
    }

    return await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentStatus,
        status: invoiceStatus,
        paidAmount: totalPaid,
        balanceAmount,
        ...(paymentStatus === PaymentStatus.PAID && { paidAt: new Date() })
      }
    });
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: string, companyId: string, reason?: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Cannot cancel paid invoice');
    }

    return await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        paymentStatus: PaymentStatus.CANCELLED,
        cancelledAt: new Date(),
        notes: reason ? `${invoice.notes || ''}\nCancellation reason: ${reason}` : invoice.notes
      }
    });
  }

  /**
   * Duplicate invoice
   */
  async duplicateInvoice(id: string, companyId: string, createdById: string) {
    const originalInvoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: { items: { orderBy: { order: 'asc' } } }
    });

    if (!originalInvoice) {
      throw new Error('Invoice not found');
    }

    const invoiceNumber = await this.generateInvoiceNumber(companyId);
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 30); // 30 days from now

    return await this.prisma.invoice.create({
      data: {
        companyId: originalInvoice.companyId,
        branchId: originalInvoice.branchId,
        clientId: originalInvoice.clientId,
        appointmentId: originalInvoice.appointmentId,
        invoiceNumber,
        invoiceDate: new Date(),
        dueDate: newDueDate,
        currency: originalInvoice.currency,
        subtotal: originalInvoice.subtotal,
        taxRate: originalInvoice.taxRate,
        taxAmount: originalInvoice.taxAmount,
        discountAmount: originalInvoice.discountAmount,
        discountType: originalInvoice.discountType,
        discountValue: originalInvoice.discountValue,
        total: originalInvoice.total,
        balanceAmount: originalInvoice.total,
        status: InvoiceStatus.DRAFT,
        paymentStatus: PaymentStatus.PENDING,
        notes: originalInvoice.notes,
        internalNotes: originalInvoice.internalNotes,
        terms: originalInvoice.terms,
        termsConditions: originalInvoice.termsConditions,
        createdById,
        items: {
          create: originalInvoice.items.map(item => ({
            type: item.type,
            itemId: item.itemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            total: item.total,
            order: item.order
          }))
        }
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  /**
   * Get invoice summary for a company
   */
  async getInvoiceSummary(companyId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(startDate && endDate && {
        invoiceDate: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    const [summary, statusCounts] = await Promise.all([
      this.prisma.invoice.aggregate({
        where,
        _sum: {
          total: true,
          paidAmount: true,
          balanceAmount: true
        },
        _count: true
      }),
      this.prisma.invoice.groupBy({
        where,
        by: ['status'],
        _count: true
      })
    ]);

    return {
      totalInvoices: summary._count,
      totalAmount: summary._sum.total || 0,
      totalPaid: summary._sum.paidAmount || 0,
      totalOutstanding: summary._sum.balanceAmount || 0,
      statusBreakdown: statusCounts.map(item => ({
        status: item.status,
        count: item._count
      }))
    };
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(companyId: string, branchId?: string) {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(branchId && { branchId }),
      dueDate: {
        lt: new Date()
      },
      paymentStatus: {
        not: PaymentStatus.PAID
      }
    };

    return await this.prisma.invoice.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Get outstanding invoices (unpaid)
   */
  async getOutstandingInvoices(companyId: string, branchId?: string) {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(branchId && { branchId }),
      paymentStatus: {
        in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE]
      }
    };

    return await this.prisma.invoice.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Delete invoice (only if draft)
   */
  async deleteInvoice(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be deleted');
    }

    return await this.prisma.invoice.delete({
      where: { id }
    });
  }
}