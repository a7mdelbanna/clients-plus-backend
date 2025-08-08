import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { InvoiceService } from '../services/invoice.service';
import { PaymentService } from '../services/payment.service';
import { PDFService } from '../services/pdf.service';
import { ApiResponse } from '../utils/response';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();
const invoiceService = new InvoiceService(prisma);
const paymentService = new PaymentService(prisma);
const pdfService = new PDFService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
  };
}

export class InvoiceController {
  
  /**
   * Create a new invoice
   * POST /api/v1/invoices
   */
  async createInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', errors.array())
        );
      }

      const { companyId, id: userId } = req.user!;
      
      const {
        branchId,
        clientId,
        appointmentId,
        dueDate,
        currency,
        items,
        notes,
        internalNotes,
        terms,
        termsConditions,
        discountType,
        discountValue,
        taxRate
      } = req.body;

      // Validate branch belongs to company
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, companyId }
      });

      if (!branch) {
        return res.status(400).json(
          ApiResponse.error('Invalid branch for this company')
        );
      }

      // Validate client belongs to company
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId }
      });

      if (!client) {
        return res.status(400).json(
          ApiResponse.error('Invalid client for this company')
        );
      }

      // Validate appointment if provided
      if (appointmentId) {
        const appointment = await prisma.appointment.findFirst({
          where: { id: appointmentId, companyId }
        });

        if (!appointment) {
          return res.status(400).json(
            ApiResponse.error('Invalid appointment for this company')
          );
        }
      }

      const invoice = await invoiceService.createInvoice(
        {
          companyId,
          branchId,
          clientId,
          appointmentId,
          dueDate: new Date(dueDate),
          currency,
          items,
          notes,
          internalNotes,
          terms,
          termsConditions,
          discountType,
          discountValue,
          taxRate
        },
        userId
      );

      res.status(201).json(
        ApiResponse.success('Invoice created successfully', invoice)
      );
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to create invoice', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get all invoices with filters and pagination
   * GET /api/v1/invoices
   */
  async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      
      const {
        page = 1,
        limit = 10,
        branchId,
        clientId,
        status,
        paymentStatus,
        startDate,
        endDate,
        search
      } = req.query;

      const filters = {
        companyId,
        ...(branchId && { branchId: branchId as string }),
        ...(clientId && { clientId: clientId as string }),
        ...(status && { status: status as any }),
        ...(paymentStatus && { paymentStatus: paymentStatus as any }),
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(search && { search: search as string })
      };

      const pagination = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100) // Max 100 items per page
      };

      const result = await invoiceService.getInvoices(filters, pagination);

      res.json(
        ApiResponse.success('Invoices retrieved successfully', result)
      );
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to retrieve invoices', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get invoice by ID
   * GET /api/v1/invoices/:id
   */
  async getInvoiceById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      const invoice = await invoiceService.getInvoiceById(id, companyId);

      if (!invoice) {
        return res.status(404).json(
          ApiResponse.error('Invoice not found')
        );
      }

      res.json(
        ApiResponse.success('Invoice retrieved successfully', invoice)
      );
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to retrieve invoice', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Update invoice
   * PUT /api/v1/invoices/:id
   */
  async updateInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', errors.array())
        );
      }

      const { id } = req.params;
      const { companyId, id: userId } = req.user!;

      const {
        dueDate,
        items,
        notes,
        internalNotes,
        terms,
        termsConditions,
        discountType,
        discountValue,
        taxRate,
        status
      } = req.body;

      const updateData: any = {};
      
      if (dueDate) updateData.dueDate = new Date(dueDate);
      if (items) updateData.items = items;
      if (notes !== undefined) updateData.notes = notes;
      if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
      if (terms !== undefined) updateData.terms = terms;
      if (termsConditions !== undefined) updateData.termsConditions = termsConditions;
      if (discountType !== undefined) updateData.discountType = discountType;
      if (discountValue !== undefined) updateData.discountValue = discountValue;
      if (taxRate !== undefined) updateData.taxRate = taxRate;
      if (status !== undefined) updateData.status = status;

      const invoice = await invoiceService.updateInvoice(id, updateData, companyId, userId);

      res.json(
        ApiResponse.success('Invoice updated successfully', invoice)
      );
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to update invoice', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Delete invoice
   * DELETE /api/v1/invoices/:id
   */
  async deleteInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      await invoiceService.deleteInvoice(id, companyId);

      res.json(
        ApiResponse.success('Invoice deleted successfully')
      );
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to delete invoice', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Send invoice to client
   * POST /api/v1/invoices/:id/send
   */
  async sendInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      const invoice = await invoiceService.sendInvoice(id, companyId);

      // TODO: Implement email sending logic here
      // await emailService.sendInvoice(invoice);

      res.json(
        ApiResponse.success('Invoice sent successfully', invoice)
      );
    } catch (error) {
      console.error('Send invoice error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to send invoice', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Mark invoice as paid
   * POST /api/v1/invoices/:id/mark-paid
   */
  async markInvoiceAsPaid(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      const invoice = await invoiceService.markInvoiceAsPaid(id, companyId);

      res.json(
        ApiResponse.success('Invoice marked as paid', invoice)
      );
    } catch (error) {
      console.error('Mark invoice as paid error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to mark invoice as paid', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Generate invoice PDF
   * GET /api/v1/invoices/:id/pdf
   */
  async generateInvoicePDF(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;
      const { template, language, includePaymentQR, watermark, download } = req.query;

      const invoice = await invoiceService.getInvoiceById(id, companyId);

      if (!invoice) {
        return res.status(404).json(
          ApiResponse.error('Invoice not found')
        );
      }

      const pdfOptions = {
        template: template as any || 'standard',
        language: language as any || 'en',
        includePaymentQR: includePaymentQR === 'true',
        watermark: watermark as string,
        showPayments: true
      };

      const pdfBuffer = await pdfService.generateInvoicePDF(invoice as any, pdfOptions);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      if (download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      }

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Generate PDF error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to generate PDF', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Duplicate invoice
   * POST /api/v1/invoices/:id/duplicate
   */
  async duplicateInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId, id: userId } = req.user!;

      const invoice = await invoiceService.duplicateInvoice(id, companyId, userId);

      res.status(201).json(
        ApiResponse.success('Invoice duplicated successfully', invoice)
      );
    } catch (error) {
      console.error('Duplicate invoice error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to duplicate invoice', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Cancel invoice
   * POST /api/v1/invoices/:id/cancel
   */
  async cancelInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;
      const { reason } = req.body;

      const invoice = await invoiceService.cancelInvoice(id, companyId, reason);

      res.json(
        ApiResponse.success('Invoice cancelled successfully', invoice)
      );
    } catch (error) {
      console.error('Cancel invoice error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to cancel invoice', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get invoice summary
   * GET /api/v1/invoices/summary
   */
  async getInvoiceSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      const { startDate, endDate } = req.query;

      const summary = await invoiceService.getInvoiceSummary(
        companyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(
        ApiResponse.success('Invoice summary retrieved successfully', summary)
      );
    } catch (error) {
      console.error('Get invoice summary error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to retrieve invoice summary', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get outstanding invoices
   * GET /api/v1/invoices/outstanding
   */
  async getOutstandingInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      const { branchId } = req.query;

      const invoices = await invoiceService.getOutstandingInvoices(
        companyId,
        branchId as string
      );

      res.json(
        ApiResponse.success('Outstanding invoices retrieved successfully', invoices)
      );
    } catch (error) {
      console.error('Get outstanding invoices error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to retrieve outstanding invoices', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get overdue invoices
   * GET /api/v1/invoices/overdue
   */
  async getOverdueInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      const { branchId } = req.query;

      const invoices = await invoiceService.getOverdueInvoices(
        companyId,
        branchId as string
      );

      res.json(
        ApiResponse.success('Overdue invoices retrieved successfully', invoices)
      );
    } catch (error) {
      console.error('Get overdue invoices error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to retrieve overdue invoices', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Record payment for invoice
   * POST /api/v1/invoices/:id/payments
   */
  async recordPayment(req: AuthenticatedRequest, res: Response) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', errors.array())
        );
      }

      const { id: invoiceId } = req.params;
      const { companyId, id: userId } = req.user!;

      const {
        amount,
        paymentMethod,
        reference,
        notes,
        transactionId,
        paymentGateway,
        paymentDate
      } = req.body;

      // Validate the invoice exists and belongs to the company
      const invoice = await invoiceService.getInvoiceById(invoiceId, companyId);
      if (!invoice) {
        return res.status(404).json(
          ApiResponse.error('Invoice not found')
        );
      }

      const payment = await paymentService.createPayment(
        {
          companyId,
          invoiceId,
          clientId: invoice.client.id,
          amount,
          paymentMethod,
          reference,
          notes,
          transactionId,
          paymentGateway,
          paymentDate: paymentDate ? new Date(paymentDate) : undefined
        },
        userId
      );

      res.status(201).json(
        ApiResponse.success('Payment recorded successfully', payment)
      );
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to record payment', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get payment history for invoice
   * GET /api/v1/invoices/:id/payments
   */
  async getInvoicePayments(req: AuthenticatedRequest, res: Response) {
    try {
      const { id: invoiceId } = req.params;
      const { companyId } = req.user!;

      const payments = await paymentService.getInvoicePayments(invoiceId, companyId);

      res.json(
        ApiResponse.success('Payment history retrieved successfully', payments)
      );
    } catch (error) {
      console.error('Get invoice payments error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to retrieve payment history', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Process refund for invoice
   * POST /api/v1/invoices/:id/refund
   */
  async processRefund(req: AuthenticatedRequest, res: Response) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', errors.array())
        );
      }

      const { id: invoiceId } = req.params;
      const { companyId, id: userId } = req.user!;
      const { paymentId, amount, reason, refundReference } = req.body;

      // Validate the invoice exists
      const invoice = await invoiceService.getInvoiceById(invoiceId, companyId);
      if (!invoice) {
        return res.status(404).json(
          ApiResponse.error('Invoice not found')
        );
      }

      const refund = await paymentService.processRefund(
        paymentId,
        { amount, reason, refundReference },
        companyId,
        userId
      );

      res.json(
        ApiResponse.success('Refund processed successfully', refund)
      );
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to process refund', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get invoice analytics/reporting
   * GET /api/v1/invoices/analytics
   */
  async getInvoiceAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      const { days = 30, startDate, endDate } = req.query;

      // Get invoice summary
      const summary = await invoiceService.getInvoiceSummary(
        companyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      // Get payment analytics
      const paymentAnalytics = await paymentService.getPaymentAnalytics(
        companyId,
        parseInt(days as string)
      );

      // Get overdue count
      const overdueInvoices = await invoiceService.getOverdueInvoices(companyId);

      const analytics = {
        ...summary,
        paymentAnalytics,
        overdueCount: overdueInvoices.length,
        overdueAmount: overdueInvoices.reduce((sum, inv) => sum + Number(inv.balanceAmount), 0)
      };

      res.json(
        ApiResponse.success('Invoice analytics retrieved successfully', analytics)
      );
    } catch (error) {
      console.error('Get invoice analytics error:', error);
      res.status(500).json(
        ApiResponse.error('Failed to retrieve invoice analytics', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }
}

// Create and export controller instance
export const invoiceController = new InvoiceController();