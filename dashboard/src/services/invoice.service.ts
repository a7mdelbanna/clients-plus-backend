import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  Invoice,
  InvoicePayment,
  InvoiceTemplate,
  InvoiceSettings,
  InvoiceFilters,
  InvoiceSummary,
  InvoiceStatus,
  PaymentStatus,
} from '../types/invoice.types';

class InvoiceService {
  private readonly endpoint = '/invoices';

  async createInvoice(
    invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.endpoint, invoice);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create invoice');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create invoice');
    }
  }

  async updateInvoice(
    companyId: string,
    invoiceId: string,
    updates: Partial<Invoice>
  ): Promise<void> {
    try {
      const response = await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${invoiceId}`, updates);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to update invoice');
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update invoice');
    }
  }

  async getInvoice(companyId: string, invoiceId: string): Promise<Invoice | null> {
    try {
      const response = await apiClient.get<ApiResponse<Invoice>>(`${this.endpoint}/${invoiceId}`);
      if (!response.data.success) return null;
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting invoice:', error);
      return null;
    }
  }

  async getInvoices(
    companyId: string,
    filters?: InvoiceFilters,
    pageSize: number = 50,
    _lastDoc?: any
  ): Promise<{ invoices: Invoice[]; lastDoc: any }> {
    try {
      const params: any = { limit: pageSize };
      if (filters?.status) {
        params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
      }
      if (filters?.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters?.clientId) params.clientId = filters.clientId;
      if (filters?.branchId) params.branchId = filters.branchId;
      if (filters?.startDate) params.startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
      if (filters?.search) params.search = filters.search;
      if (filters?.isOverdue) params.overdue = true;
      if (filters?.minAmount) params.minAmount = filters.minAmount;
      if (filters?.maxAmount) params.maxAmount = filters.maxAmount;

      const response = await apiClient.get<ApiResponse<Invoice[]>>(this.endpoint, { params });
      return {
        invoices: response.data.data || [],
        lastDoc: null,
      };
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  subscribeToInvoices(
    companyId: string,
    callback: (invoices: Invoice[]) => void,
    filters?: InvoiceFilters
  ): () => void {
    // Initial fetch
    this.getInvoices(companyId, filters)
      .then(({ invoices }) => callback(invoices))
      .catch(console.error);

    const interval = setInterval(() => {
      this.getInvoices(companyId, filters)
        .then(({ invoices }) => callback(invoices))
        .catch(console.error);
    }, 15000);

    return () => clearInterval(interval);
  }

  async recordPayment(
    companyId: string,
    invoiceId: string,
    payment: Omit<InvoicePayment, 'id' | 'recordedAt'>
  ): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/${invoiceId}/payments`, payment
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to record payment');
    } catch (error: any) {
      console.error('Error recording payment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to record payment');
    }
  }

  async sendInvoice(companyId: string, invoiceId: string, email?: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${invoiceId}/send`, { email });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to send invoice');
    }
  }

  async markAsViewed(companyId: string, invoiceId: string): Promise<void> {
    try {
      await this.updateInvoice(companyId, invoiceId, { status: 'viewed' as InvoiceStatus });
    } catch (error) {
      console.error('Error marking invoice as viewed:', error);
    }
  }

  async cancelInvoice(companyId: string, invoiceId: string, reason?: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${invoiceId}/cancel`, { reason });
    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to cancel invoice');
    }
  }

  async markAsPaid(companyId: string, invoiceId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${invoiceId}/mark-paid`);
    } catch (error: any) {
      console.error('Error marking invoice as paid:', error);
      throw error;
    }
  }

  async generatePdf(companyId: string, invoiceId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`${this.endpoint}/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to generate PDF');
    }
  }

  async duplicateInvoice(companyId: string, invoiceId: string, _createdBy: string): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${invoiceId}/duplicate`
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to duplicate');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error duplicating invoice:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to duplicate invoice');
    }
  }

  async processRefund(companyId: string, invoiceId: string, amount: number, reason?: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${invoiceId}/refund`, { amount, reason });
    } catch (error: any) {
      console.error('Error processing refund:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to process refund');
    }
  }

  // Summary & Analytics
  async getInvoiceSummary(companyId: string, branchId?: string): Promise<InvoiceSummary> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<InvoiceSummary>>(`${this.endpoint}/summary`, { params });
      return response.data.data || this.getDefaultSummary();
    } catch (error) {
      console.error('Error getting invoice summary:', error);
      return this.getDefaultSummary();
    }
  }

  async getOutstandingInvoices(companyId: string): Promise<Invoice[]> {
    try {
      const response = await apiClient.get<ApiResponse<Invoice[]>>(`${this.endpoint}/outstanding`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting outstanding invoices:', error);
      return [];
    }
  }

  async getOverdueInvoices(companyId: string): Promise<Invoice[]> {
    try {
      const response = await apiClient.get<ApiResponse<Invoice[]>>(`${this.endpoint}/overdue`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting overdue invoices:', error);
      return [];
    }
  }

  async getAnalytics(companyId: string): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/analytics`);
      return response.data.data || {};
    } catch (error) {
      console.error('Error getting invoice analytics:', error);
      return {};
    }
  }

  // Templates
  async createTemplate(template: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/templates`, template);
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async getTemplates(companyId: string): Promise<InvoiceTemplate[]> {
    try {
      const response = await apiClient.get<ApiResponse<InvoiceTemplate[]>>(`${this.endpoint}/templates`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  }

  // Settings
  async getSettings(companyId: string): Promise<InvoiceSettings> {
    try {
      const response = await apiClient.get<ApiResponse<InvoiceSettings>>(`${this.endpoint}/settings`);
      return response.data.data || this.getDefaultSettings(companyId);
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.getDefaultSettings(companyId);
    }
  }

  async updateSettings(companyId: string, settings: Partial<InvoiceSettings>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/settings`, settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  private getDefaultSettings(companyId: string): InvoiceSettings {
    return {
      companyId,
      invoicePrefix: 'INV',
      nextInvoiceNumber: 1,
      defaultDueDays: 30,
      defaultVatRate: 14,
      showVatBreakdown: true,
      showLogo: true,
      logoPosition: 'left',
      paperSize: 'A4',
    };
  }

  private getDefaultSummary(): InvoiceSummary {
    return {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      overdueAmount: 0,
      draftCount: 0,
      sentCount: 0,
      paidCount: 0,
      overdueCount: 0,
      currentMonthTotal: 0,
      lastMonthTotal: 0,
      growthPercentage: 0,
      topClients: [],
    };
  }

  async generateFromAppointment(
    companyId: string,
    appointmentId: string,
    createdBy: string
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        this.endpoint,
        { appointmentId, createdBy, source: 'appointment' }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error generating invoice from appointment:', error);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();
