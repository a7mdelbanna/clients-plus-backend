import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  ExpenseCategory,
  Vendor,
  ExpenseTransaction,
  ExpenseReceipt,
  ApprovalWorkflow,
  RecurringExpenseDetails,
  PurchaseOrder,
  Budget,
  ExpenseSettings,
} from '../types/expense.types';

class ExpenseService {
  private readonly expenseEndpoint = '/finance/expenses';
  private readonly categoryEndpoint = '/finance/expense-categories';

  // Default expense categories for beauty businesses
  private defaultCategories: Omit<ExpenseCategory, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Rent & Utilities', nameAr: 'الإيجار والمرافق', icon: 'Business', color: '#1976d2', order: 1, requiresReceipt: true, allowRecurring: true, isActive: true, isSystem: true },
    { name: 'Salaries & Benefits', nameAr: 'الرواتب والمزايا', icon: 'AccountBalance', color: '#388e3c', order: 2, requiresReceipt: true, allowRecurring: true, isActive: true, isSystem: true },
    { name: 'Products & Supplies', nameAr: 'المنتجات والمستلزمات', icon: 'LocalShipping', color: '#7b1fa2', order: 3, requiresReceipt: true, allowRecurring: false, isActive: true, isSystem: true },
    { name: 'Marketing & Advertising', nameAr: 'التسويق والإعلان', icon: 'Campaign', color: '#d32f2f', order: 4, requiresReceipt: true, allowRecurring: false, isActive: true, isSystem: true },
    { name: 'Equipment & Maintenance', nameAr: 'المعدات والصيانة', icon: 'Build', color: '#f57c00', order: 5, requiresReceipt: true, allowRecurring: false, isActive: true, isSystem: true },
    { name: 'Insurance', nameAr: 'التأمين', icon: 'Security', color: '#0097a7', order: 6, requiresReceipt: true, allowRecurring: true, isActive: true, isSystem: true },
    { name: 'Training & Education', nameAr: 'التدريب والتعليم', icon: 'School', color: '#5c6bc0', order: 7, requiresReceipt: false, allowRecurring: false, isActive: true, isSystem: true },
    { name: 'Travel & Transportation', nameAr: 'السفر والمواصلات', icon: 'Flight', color: '#26a69a', order: 8, requiresReceipt: true, allowRecurring: false, isActive: true, isSystem: true },
    { name: 'Taxes & Licenses', nameAr: 'الضرائب والتراخيص', icon: 'Receipt', color: '#8d6e63', order: 9, requiresReceipt: true, allowRecurring: true, isActive: true, isSystem: true },
    { name: 'Miscellaneous', nameAr: 'متنوعة', icon: 'MoreHoriz', color: '#78909c', order: 10, requiresReceipt: false, allowRecurring: false, isActive: true, isSystem: true },
  ];

  // Category Management
  async getCategories(companyId: string): Promise<ExpenseCategory[]> {
    try {
      const response = await apiClient.get<ApiResponse<ExpenseCategory[]>>(this.categoryEndpoint);
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting expense categories:', error);
      return [];
    }
  }

  async createCategory(category: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.categoryEndpoint, category);
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating expense category:', error);
      throw error;
    }
  }

  async initializeDefaultCategories(companyId: string): Promise<void> {
    try {
      const existing = await this.getCategories(companyId);
      if (existing.length > 0) return;

      for (const cat of this.defaultCategories) {
        await this.createCategory({ ...cat, companyId });
      }
    } catch (error) {
      console.error('Error initializing default categories:', error);
    }
  }

  // Expense CRUD
  async createExpense(expense: Omit<ExpenseTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.expenseEndpoint, expense);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create expense');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating expense:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create expense');
    }
  }

  async getExpenses(
    companyId: string,
    filters?: {
      categoryId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      branchId?: string;
      search?: string;
    },
    pageSize?: number
  ): Promise<ExpenseTransaction[]> {
    try {
      const params: any = {};
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      if (filters?.startDate) params.startDate = filters.startDate.toISOString();
      if (filters?.endDate) params.endDate = filters.endDate.toISOString();
      if (filters?.status) params.status = filters.status;
      if (filters?.branchId) params.branchId = filters.branchId;
      if (filters?.search) params.search = filters.search;
      if (pageSize) params.limit = pageSize;

      const response = await apiClient.get<ApiResponse<ExpenseTransaction[]>>(this.expenseEndpoint, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  async updateExpense(companyId: string, expenseId: string, updates: Partial<ExpenseTransaction>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.expenseEndpoint}/${expenseId}`, updates);
    } catch (error: any) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  async submitExpense(companyId: string, expenseId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.expenseEndpoint}/${expenseId}/submit`);
    } catch (error: any) {
      console.error('Error submitting expense:', error);
      throw error;
    }
  }

  async approveExpense(companyId: string, expenseId: string, approverId: string, notes?: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.expenseEndpoint}/${expenseId}/approve`, {
        approverId, notes,
      });
    } catch (error: any) {
      console.error('Error approving expense:', error);
      throw error;
    }
  }

  // Receipt upload
  async uploadReceipt(companyId: string, expenseId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('expenseId', expenseId);

      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        '/upload/receipt',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data!.url;
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      throw error;
    }
  }

  // Subscribe to expenses
  subscribeToExpenses(
    companyId: string,
    callback: (expenses: ExpenseTransaction[]) => void,
    filters?: any,
    errorCallback?: (error: Error) => void
  ): () => void {
    this.getExpenses(companyId, filters)
      .then(callback)
      .catch((error) => {
        if (errorCallback) errorCallback(error);
      });

    const interval = setInterval(() => {
      this.getExpenses(companyId, filters)
        .then(callback)
        .catch((error) => {
          if (errorCallback) errorCallback(error);
        });
    }, 30000);

    return () => clearInterval(interval);
  }

  getDefaultCategories() {
    return this.defaultCategories;
  }
}

export const expenseService = new ExpenseService();
