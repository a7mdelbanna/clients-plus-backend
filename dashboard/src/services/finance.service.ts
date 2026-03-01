import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  FinancialAccount,
  FinancialTransaction,
  FinancialReport,
  Budget,
  FinancialSettings,
  TransactionFilters,
  AccountSummary,
  TransactionType,
} from '../types/finance.types';

class FinanceService {
  private readonly endpoint = '/finance';

  // ==================== Financial Accounts ====================

  async createAccount(account: Omit<FinancialAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/accounts`, account);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create account');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating account:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create account');
    }
  }

  async updateAccount(companyId: string, accountId: string, updates: Partial<FinancialAccount>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/accounts/${accountId}`, updates);
    } catch (error: any) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  async deleteAccount(companyId: string, accountId: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.endpoint}/accounts/${accountId}`);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  async getAccounts(companyId: string, branchId?: string): Promise<FinancialAccount[]> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<FinancialAccount[]>>(`${this.endpoint}/accounts`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting accounts:', error);
      return [];
    }
  }

  async getAccount(companyId: string, accountId: string): Promise<FinancialAccount | null> {
    try {
      const response = await apiClient.get<ApiResponse<FinancialAccount>>(`${this.endpoint}/accounts/${accountId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getAccountBalance(companyId: string, accountId: string): Promise<number> {
    try {
      const response = await apiClient.get<ApiResponse<{ balance: number }>>(`${this.endpoint}/accounts/${accountId}/balance`);
      return response.data.data?.balance || 0;
    } catch (error) {
      console.error('Error getting account balance:', error);
      return 0;
    }
  }

  async getDefaultAccounts(companyId: string): Promise<FinancialAccount[]> {
    try {
      const response = await apiClient.get<ApiResponse<FinancialAccount[]>>(`${this.endpoint}/accounts/defaults`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting default accounts:', error);
      return [];
    }
  }

  // ==================== Transactions ====================

  async createTransaction(
    transaction: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt'> & {
      companyId: string;
      branchId: string;
      date: any;
      type: string;
      category: string;
      amount: number;
      vatAmount?: number;
      totalAmount: number;
      accountId: string;
      paymentMethod: string;
      description?: string;
      descriptionAr?: string;
      status: string;
      createdBy?: string;
      referenceType?: string;
      referenceId?: string;
      invoiceNumber?: string;
    }
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/transactions`, transaction);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create transaction');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create transaction');
    }
  }

  async getTransactions(
    companyId: string,
    filters?: TransactionFilters,
    pageSize?: number
  ): Promise<FinancialTransaction[]> {
    try {
      const params: any = {};
      if (filters?.accountId) params.accountId = filters.accountId;
      if (filters?.type) params.type = filters.type;
      if (filters?.category) params.category = filters.category;
      if (filters?.startDate) params.startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
      if (filters?.status) params.status = filters.status;
      if (filters?.branchId) params.branchId = filters.branchId;
      if (pageSize) params.limit = pageSize;

      const response = await apiClient.get<ApiResponse<FinancialTransaction[]>>(`${this.endpoint}/transactions`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async approveTransaction(companyId: string, transactionId: string): Promise<void> {
    await apiClient.post<ApiResponse<void>>(`${this.endpoint}/transactions/${transactionId}/approve`);
  }

  async rejectTransaction(companyId: string, transactionId: string): Promise<void> {
    await apiClient.post<ApiResponse<void>>(`${this.endpoint}/transactions/${transactionId}/reject`);
  }

  // ==================== Transfers ====================

  async createTransfer(transfer: {
    companyId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    date?: string;
  }): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/transfers`, transfer);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create transfer');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      throw error;
    }
  }

  async approveTransfer(companyId: string, transferId: string): Promise<void> {
    await apiClient.post<ApiResponse<void>>(`${this.endpoint}/transfers/${transferId}/approve`);
  }

  // ==================== Budgets ====================

  async createBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/budgets`, budget);
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating budget:', error);
      throw error;
    }
  }

  // ==================== Reports ====================

  async getProfitLossReport(companyId: string, startDate: Date, endDate: Date, branchId?: string): Promise<any> {
    try {
      const params: any = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/reports/profit-loss`, { params });
      return response.data.data || {};
    } catch (error) {
      console.error('Error getting P&L report:', error);
      return {};
    }
  }

  async getCashFlowReport(companyId: string, startDate: Date, endDate: Date, branchId?: string): Promise<any> {
    try {
      const params: any = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/reports/cash-flow`, { params });
      return response.data.data || {};
    } catch (error) {
      console.error('Error getting cash flow report:', error);
      return {};
    }
  }

  async getFinancialSummary(companyId: string, branchId?: string): Promise<any> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/summary`, { params });
      return response.data.data || {};
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return {};
    }
  }

  // ==================== Subscriptions (polling) ====================

  subscribeToAccounts(
    companyId: string,
    callback: (accounts: FinancialAccount[]) => void,
    errorCallback?: (error: Error) => void,
    branchId?: string
  ): () => void {
    this.getAccounts(companyId, branchId)
      .then(callback)
      .catch((error) => { if (errorCallback) errorCallback(error); });

    const interval = setInterval(() => {
      this.getAccounts(companyId, branchId)
        .then(callback)
        .catch((error) => { if (errorCallback) errorCallback(error); });
    }, 30000);

    return () => clearInterval(interval);
  }

  subscribeToTransactions(
    companyId: string,
    callback: (transactions: FinancialTransaction[]) => void,
    filters?: TransactionFilters,
    errorCallback?: (error: Error) => void
  ): () => void {
    this.getTransactions(companyId, filters)
      .then(callback)
      .catch((error) => { if (errorCallback) errorCallback(error); });

    const interval = setInterval(() => {
      this.getTransactions(companyId, filters)
        .then(callback)
        .catch((error) => { if (errorCallback) errorCallback(error); });
    }, 15000);

    return () => clearInterval(interval);
  }
}

export const financeService = new FinanceService();
