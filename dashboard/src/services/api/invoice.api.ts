import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// =========================== INTERFACES ===========================

export interface InvoiceItem {
  type: 'SERVICE' | 'PRODUCT' | 'CUSTOM';
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  totalPrice?: number;
}

export interface ExpressInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  branchId: string;
  appointmentId?: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  issueDate: string;
  dueDate: string;
  currency: string;
  
  // Line items
  items: InvoiceItem[];
  
  // Amounts
  subtotal: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount: number;
  taxRate?: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  
  // Notes and terms
  notes?: string;
  internalNotes?: string;
  terms?: string;
  termsConditions?: string;
  
  // Client information (populated from relation)
  client?: {
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  
  // Branch information (populated from relation)
  branch?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // Appointment information (populated from relation)
  appointment?: {
    id: string;
    startTime: string;
    serviceName?: string;
    staffName?: string;
  };
  
  // Metadata
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  
  // PDF settings
  pdfTemplate?: 'standard' | 'modern' | 'minimal';
  includePaymentQR?: boolean;
  watermark?: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'SQUARE' | 'OTHER';
  reference?: string;
  notes?: string;
  transactionId?: string;
  paymentGateway?: string;
  paymentDate: string;
  createdAt: string;
  createdBy?: string;
}

export interface InvoiceRefund {
  id: string;
  invoiceId: string;
  paymentId: string;
  amount: number;
  reason?: string;
  refundReference?: string;
  refundDate: string;
  createdAt: string;
  createdBy?: string;
}

export interface InvoiceFilters {
  branchId?: string;
  clientId?: string;
  status?: ('DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED')[];
  paymentStatus?: ('PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED')[];
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'invoiceNumber' | 'issueDate' | 'dueDate' | 'totalAmount' | 'status' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface InvoicePaginationOptions {
  page?: number;
  limit?: number;
}

export interface CreateInvoiceDto {
  branchId: string;
  clientId: string;
  appointmentId?: string;
  dueDate: string;
  currency?: string;
  items: Omit<InvoiceItem, 'totalPrice'>[];
  notes?: string;
  internalNotes?: string;
  terms?: string;
  termsConditions?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  taxRate?: number;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  status?: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
}

export interface RecordPaymentDto {
  amount: number;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'SQUARE' | 'OTHER';
  reference?: string;
  notes?: string;
  transactionId?: string;
  paymentGateway?: string;
  paymentDate?: string;
}

export interface ProcessRefundDto {
  paymentId: string;
  amount: number;
  reason?: string;
  refundReference?: string;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  
  statusBreakdown: Record<string, number>;
  paymentStatusBreakdown: Record<string, number>;
  
  monthlyTotals: Array<{
    month: string;
    totalAmount: number;
    paidAmount: number;
    invoiceCount: number;
  }>;
  
  recentInvoices: ExpressInvoice[];
  overdueInvoices: ExpressInvoice[];
}

export interface InvoiceAnalytics {
  totalRevenue: number;
  averageInvoiceAmount: number;
  paymentCompletionRate: number;
  averagePaymentTime: number; // in days
  
  revenueGrowth: number; // percentage
  invoiceCountGrowth: number; // percentage
  
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalAmount: number;
    invoiceCount: number;
  }>;
  
  paymentMethodBreakdown: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    invoiceCount: number;
    averageAmount: number;
    completionRate: number;
  }>;
}

export interface PaginatedInvoiceResponse {
  data: ExpressInvoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PdfGenerationOptions {
  template?: 'standard' | 'modern' | 'minimal';
  language?: 'en' | 'ar';
  includePaymentQR?: boolean;
  watermark?: string;
  download?: boolean;
}

// =========================== INVOICE API CLASS ===========================

export class InvoiceAPI {
  private readonly endpoint = '/invoices';

  // ==================== CRUD Operations ====================

  /**
   * Get invoices with filtering and pagination
   */
  async getInvoices(
    filters?: InvoiceFilters,
    pagination?: InvoicePaginationOptions
  ): Promise<PaginatedInvoiceResponse> {
    try {
      const params = new URLSearchParams();

      // Add pagination parameters
      if (pagination?.page) params.set('page', pagination.page.toString());
      if (pagination?.limit) params.set('limit', pagination.limit.toString());

      // Add filter parameters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.set(key, value.toString());
            }
          }
        });
      }

      const response = await apiClient.get<ApiResponse<ExpressInvoice[]>>(
        `${this.endpoint}?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch invoices');
      }

      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (error: any) {
      console.error('Get invoices error:', error);
      throw new Error(error.message || 'Failed to fetch invoices');
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string): Promise<ExpressInvoice> {
    try {
      const response = await apiClient.get<ApiResponse<{ invoice: ExpressInvoice }>>(
        `${this.endpoint}/${invoiceId}`
      );

      if (!response.data.success || !response.data.data?.invoice) {
        throw new Error('Invoice not found');
      }

      return response.data.data.invoice;
    } catch (error: any) {
      console.error('Get invoice by ID error:', error);
      throw new Error(error.message || 'Failed to fetch invoice');
    }
  }

  /**
   * Create a new invoice
   */
  async createInvoice(invoiceData: CreateInvoiceDto): Promise<ExpressInvoice> {
    try {
      const response = await apiClient.post<ApiResponse<{ invoice: ExpressInvoice }>>(
        this.endpoint,
        invoiceData
      );

      if (!response.data.success || !response.data.data?.invoice) {
        throw new Error(response.data.message || 'Failed to create invoice');
      }

      return response.data.data.invoice;
    } catch (error: any) {
      console.error('Create invoice error:', error);
      throw new Error(error.message || 'Failed to create invoice');
    }
  }

  /**
   * Update an existing invoice
   */
  async updateInvoice(invoiceId: string, updates: UpdateInvoiceDto): Promise<ExpressInvoice> {
    try {
      const response = await apiClient.put<ApiResponse<{ invoice: ExpressInvoice }>>(
        `${this.endpoint}/${invoiceId}`,
        updates
      );

      if (!response.data.success || !response.data.data?.invoice) {
        throw new Error(response.data.message || 'Failed to update invoice');
      }

      return response.data.data.invoice;
    } catch (error: any) {
      console.error('Update invoice error:', error);
      throw new Error(error.message || 'Failed to update invoice');
    }
  }

  /**
   * Delete an invoice (only draft invoices)
   */
  async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `${this.endpoint}/${invoiceId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete invoice');
      }
    } catch (error: any) {
      console.error('Delete invoice error:', error);
      throw new Error(error.message || 'Failed to delete invoice');
    }
  }

  // ==================== Invoice Actions ====================

  /**
   * Send invoice to client via email
   */
  async sendInvoice(invoiceId: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/${invoiceId}/send`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send invoice');
      }
    } catch (error: any) {
      console.error('Send invoice error:', error);
      throw new Error(error.message || 'Failed to send invoice');
    }
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(invoiceId: string): Promise<ExpressInvoice> {
    try {
      const response = await apiClient.post<ApiResponse<{ invoice: ExpressInvoice }>>(
        `${this.endpoint}/${invoiceId}/mark-paid`
      );

      if (!response.data.success || !response.data.data?.invoice) {
        throw new Error(response.data.message || 'Failed to mark invoice as paid');
      }

      return response.data.data.invoice;
    } catch (error: any) {
      console.error('Mark invoice as paid error:', error);
      throw new Error(error.message || 'Failed to mark invoice as paid');
    }
  }

  /**
   * Generate and download invoice PDF
   */
  async generateInvoicePDF(invoiceId: string, options?: PdfGenerationOptions): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      
      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, value.toString());
          }
        });
      }

      const response = await apiClient.get(
        `${this.endpoint}/${invoiceId}/pdf?${params.toString()}`,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error: any) {
      console.error('Generate PDF error:', error);
      throw new Error(error.message || 'Failed to generate PDF');
    }
  }

  /**
   * Duplicate an existing invoice
   */
  async duplicateInvoice(invoiceId: string): Promise<ExpressInvoice> {
    try {
      const response = await apiClient.post<ApiResponse<{ invoice: ExpressInvoice }>>(
        `${this.endpoint}/${invoiceId}/duplicate`
      );

      if (!response.data.success || !response.data.data?.invoice) {
        throw new Error(response.data.message || 'Failed to duplicate invoice');
      }

      return response.data.data.invoice;
    } catch (error: any) {
      console.error('Duplicate invoice error:', error);
      throw new Error(error.message || 'Failed to duplicate invoice');
    }
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string, reason?: string): Promise<ExpressInvoice> {
    try {
      const response = await apiClient.post<ApiResponse<{ invoice: ExpressInvoice }>>(
        `${this.endpoint}/${invoiceId}/cancel`,
        { reason }
      );

      if (!response.data.success || !response.data.data?.invoice) {
        throw new Error(response.data.message || 'Failed to cancel invoice');
      }

      return response.data.data.invoice;
    } catch (error: any) {
      console.error('Cancel invoice error:', error);
      throw new Error(error.message || 'Failed to cancel invoice');
    }
  }

  // ==================== Payment Management ====================

  /**
   * Get payment history for invoice
   */
  async getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
    try {
      const response = await apiClient.get<ApiResponse<InvoicePayment[]>>(
        `${this.endpoint}/${invoiceId}/payments`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch payment history');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get invoice payments error:', error);
      throw new Error(error.message || 'Failed to fetch payment history');
    }
  }

  /**
   * Record a payment for invoice
   */
  async recordPayment(invoiceId: string, paymentData: RecordPaymentDto): Promise<InvoicePayment> {
    try {
      const response = await apiClient.post<ApiResponse<{ payment: InvoicePayment }>>(
        `${this.endpoint}/${invoiceId}/payments`,
        paymentData
      );

      if (!response.data.success || !response.data.data?.payment) {
        throw new Error(response.data.message || 'Failed to record payment');
      }

      return response.data.data.payment;
    } catch (error: any) {
      console.error('Record payment error:', error);
      throw new Error(error.message || 'Failed to record payment');
    }
  }

  /**
   * Process a refund for invoice payment
   */
  async processRefund(invoiceId: string, refundData: ProcessRefundDto): Promise<InvoiceRefund> {
    try {
      const response = await apiClient.post<ApiResponse<{ refund: InvoiceRefund }>>(
        `${this.endpoint}/${invoiceId}/refund`,
        refundData
      );

      if (!response.data.success || !response.data.data?.refund) {
        throw new Error(response.data.message || 'Failed to process refund');
      }

      return response.data.data.refund;
    } catch (error: any) {
      console.error('Process refund error:', error);
      throw new Error(error.message || 'Failed to process refund');
    }
  }

  // ==================== Special Endpoints ====================

  /**
   * Get invoice summary and statistics
   */
  async getInvoiceSummary(startDate?: string, endDate?: string): Promise<InvoiceSummary> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await apiClient.get<ApiResponse<InvoiceSummary>>(
        `${this.endpoint}/summary?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch invoice summary');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get invoice summary error:', error);
      throw new Error(error.message || 'Failed to fetch invoice summary');
    }
  }

  /**
   * Get outstanding invoices (unpaid)
   */
  async getOutstandingInvoices(branchId?: string): Promise<ExpressInvoice[]> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);

      const response = await apiClient.get<ApiResponse<ExpressInvoice[]>>(
        `${this.endpoint}/outstanding?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch outstanding invoices');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get outstanding invoices error:', error);
      throw new Error(error.message || 'Failed to fetch outstanding invoices');
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(branchId?: string): Promise<ExpressInvoice[]> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);

      const response = await apiClient.get<ApiResponse<ExpressInvoice[]>>(
        `${this.endpoint}/overdue?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch overdue invoices');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get overdue invoices error:', error);
      throw new Error(error.message || 'Failed to fetch overdue invoices');
    }
  }

  /**
   * Get invoice analytics and reporting data
   */
  async getInvoiceAnalytics(
    days = 30,
    startDate?: string,
    endDate?: string
  ): Promise<InvoiceAnalytics> {
    try {
      const params = new URLSearchParams();
      params.set('days', days.toString());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await apiClient.get<ApiResponse<InvoiceAnalytics>>(
        `${this.endpoint}/analytics?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch invoice analytics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get invoice analytics error:', error);
      throw new Error(error.message || 'Failed to fetch invoice analytics');
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Calculate invoice totals
   */
  static calculateInvoiceTotals(
    items: InvoiceItem[],
    discountType?: 'PERCENTAGE' | 'FIXED',
    discountValue?: number,
    taxRate?: number
  ): {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  } {
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      return sum + (itemTotal - itemDiscount);
    }, 0);

    // Calculate discount amount
    let discountAmount = 0;
    if (discountType && discountValue) {
      if (discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    // Calculate tax amount
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = taxRate ? (afterDiscount * taxRate) / 100 : 0;

    // Calculate total
    const totalAmount = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    };
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number, currency = 'EGP'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Check if invoice is overdue
   */
  static isOverdue(invoice: ExpressInvoice): boolean {
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    return dueDate < now && invoice.paymentStatus !== 'PAID';
  }

  /**
   * Get days until due date
   */
  static getDaysUntilDue(invoice: ExpressInvoice): number {
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/health`);
      return response.data.success;
    } catch (error) {
      console.error('Invoice API health check failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const invoiceAPI = new InvoiceAPI();
export default invoiceAPI;