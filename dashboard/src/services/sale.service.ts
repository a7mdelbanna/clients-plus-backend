import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type { Sale, SaleFilters, SaleItem, SalePayment, DailySalesSummary } from '../types/sale.types';

class SaleService {
  private readonly endpoint = '/sales';

  async createSale(
    sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'saleNumber' | 'receiptNumber'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.endpoint, sale);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create sale');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating sale:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create sale');
    }
  }

  async completeSale(
    companyId: string,
    saleId: string,
    items: SaleItem[],
    payments: SalePayment[]
  ): Promise<void> {
    try {
      // The backend handles inventory updates, financial transactions, and register recording
      const response = await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${saleId}`, {
        status: 'completed',
        items,
        payments,
      });
      if (!response.data.success) throw new Error(response.data.message || 'Failed to complete sale');
    } catch (error: any) {
      console.error('Error completing sale:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to complete sale');
    }
  }

  async getSales(
    companyId: string,
    filters?: SaleFilters,
    pageSize: number = 50,
    _lastDoc?: any
  ): Promise<{ sales: Sale[]; lastDoc: any }> {
    try {
      const params: any = { limit: pageSize };
      if (filters?.startDate) params.startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
      if (filters?.status) params.status = filters.status;
      if (filters?.customerId) params.customerId = filters.customerId;
      if (filters?.staffId) params.staffId = filters.staffId;

      const response = await apiClient.get<ApiResponse<Sale[]>>(this.endpoint, { params });
      return {
        sales: response.data.data || [],
        lastDoc: null,
      };
    } catch (error) {
      console.error('Error getting sales:', error);
      throw error;
    }
  }

  async getSaleById(companyId: string, saleId: string): Promise<Sale | null> {
    try {
      const response = await apiClient.get<ApiResponse<Sale>>(`${this.endpoint}/${saleId}`);
      if (!response.data.success) return null;
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getDailySummary(
    companyId: string,
    date: Date,
    branchId?: string
  ): Promise<DailySalesSummary> {
    try {
      const params: any = { date: date.toISOString() };
      if (branchId) params.branchId = branchId;

      const response = await apiClient.get<ApiResponse<DailySalesSummary>>(
        `${this.endpoint}/daily-summary`, { params }
      );
      return response.data.data || this.getDefaultSummary(date);
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return this.getDefaultSummary(date);
    }
  }

  async voidSale(companyId: string, saleId: string, reason: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${saleId}/refund`, { reason });
    } catch (error: any) {
      console.error('Error voiding sale:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to void sale');
    }
  }

  async applyDiscount(companyId: string, saleId: string, discount: any): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/discount`, {
        saleId,
        ...discount,
      });
    } catch (error: any) {
      console.error('Error applying discount:', error);
      throw error;
    }
  }

  async generateReceipt(companyId: string, saleId: string): Promise<Blob> {
    try {
      const response = await apiClient.post(`${this.endpoint}/${saleId}/receipt`, {}, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      throw error;
    }
  }

  private getDefaultSummary(date: Date): DailySalesSummary {
    return {
      date,
      totalSales: 0,
      totalAmount: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalProfit: 0,
      paymentBreakdown: { cash: 0, card: 0, bank_transfer: 0, digital_wallet: 0 },
      topProducts: [],
    };
  }

  async generateSaleNumber(_companyId: string, _branchId: string): Promise<string> {
    // Sale numbers are now generated server-side
    return '';
  }

  async generateReceiptNumber(_companyId: string, _branchId: string): Promise<string> {
    // Receipt numbers are now generated server-side
    return '';
  }
}

export const saleService = new SaleService();
