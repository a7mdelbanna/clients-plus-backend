import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  ShiftSession,
  DenominationCount,
  RegisterTransaction,
  PaymentBreakdown,
  CashDrop,
  CashAdjustment,
  DailyRegisterSummary,
  ShiftSummary,
  RegisterConfig,
  AccountBalance,
} from '../types/register.types';

class RegisterService {
  private readonly endpoint = '/register';

  async openShift(
    companyId: string,
    branchId: string,
    registerId: string,
    employeeId: string,
    employeeName: string,
    openingCash: DenominationCount,
    notes?: string,
    accountBalances?: Record<string, AccountBalance>,
    linkedAccounts?: string[]
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/open`, {
        companyId, branchId, registerId, employeeId, employeeName,
        openingCash, notes, accountBalances, linkedAccounts,
      });
      if (!response.data.success) throw new Error(response.data.message || 'Failed to open shift');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error opening shift:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to open shift');
    }
  }

  async closeShift(
    companyId: string,
    shiftId: string,
    closingCash: DenominationCount,
    notes?: string,
    closingAccountBalances?: Record<string, AccountBalance>
  ): Promise<ShiftSummary> {
    try {
      const response = await apiClient.post<ApiResponse<ShiftSummary>>(
        `${this.endpoint}/${shiftId}/close`,
        { closingCash, notes, closingAccountBalances }
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to close shift');
      return response.data.data!;
    } catch (error: any) {
      console.error('Error closing shift:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to close shift');
    }
  }

  async getCurrentShift(companyId: string, employeeId?: string): Promise<ShiftSession | null> {
    try {
      const params: any = {};
      if (employeeId) params.employeeId = employeeId;
      const response = await apiClient.get<ApiResponse<ShiftSession>>(`${this.endpoint}/current`, { params });
      if (!response.data.success) return null;
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      return null;
    }
  }

  async recordCashDrop(
    companyId: string,
    shiftId: string,
    cashDrop: Omit<CashDrop, 'id' | 'createdAt'>
  ): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/${shiftId}/cash-drop`, cashDrop
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to record cash drop');
    } catch (error: any) {
      console.error('Error recording cash drop:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to record cash drop');
    }
  }

  async recordAdjustment(
    companyId: string,
    shiftId: string,
    adjustment: Omit<CashAdjustment, 'id' | 'createdAt'>
  ): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/${shiftId}/adjustment`, adjustment
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to record adjustment');
    } catch (error: any) {
      console.error('Error recording adjustment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to record adjustment');
    }
  }

  async getShiftHistory(
    companyId: string,
    branchId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ShiftSession[]> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();
      const response = await apiClient.get<ApiResponse<ShiftSession[]>>(`${this.endpoint}/history`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting shift history:', error);
      return [];
    }
  }

  async getShiftSummary(companyId: string, shiftId: string): Promise<ShiftSummary | null> {
    try {
      const response = await apiClient.get<ApiResponse<ShiftSummary>>(`${this.endpoint}/${shiftId}/summary`);
      if (!response.data.success) return null;
      return response.data.data || null;
    } catch (error) {
      console.error('Error getting shift summary:', error);
      return null;
    }
  }

  async reconcileRegister(companyId: string, shiftId: string, data: any): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${shiftId}/reconcile`, data);
    } catch (error: any) {
      console.error('Error reconciling register:', error);
      throw error;
    }
  }

  // Helper methods
  async getActiveShiftsForRegister(companyId: string, branchId: string, registerId: string): Promise<ShiftSession[]> {
    try {
      const params = { branchId, registerId, status: 'active' };
      const response = await apiClient.get<ApiResponse<ShiftSession[]>>(`${this.endpoint}/history`, { params });
      return (response.data.data || []).filter(s => s.status === 'active');
    } catch (error) {
      return [];
    }
  }

  async getActiveShiftsForEmployee(companyId: string, employeeId: string): Promise<ShiftSession[]> {
    try {
      const params = { employeeId, status: 'active' };
      const response = await apiClient.get<ApiResponse<ShiftSession[]>>(`${this.endpoint}/history`, { params });
      return (response.data.data || []).filter(s => s.status === 'active');
    } catch (error) {
      return [];
    }
  }

  async recordTransaction(
    companyId: string,
    shiftId: string,
    transaction: Omit<RegisterTransaction, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${shiftId}/adjustment`,
        { ...transaction, type: 'transaction' }
      );
      return response.data.data?.id || '';
    } catch (error: any) {
      console.error('Error recording transaction:', error);
      throw error;
    }
  }

  calculateDenominationTotal(denominations: DenominationCount): number {
    if (!denominations) return 0;
    let total = 0;
    Object.entries(denominations).forEach(([denomination, count]) => {
      total += parseFloat(denomination) * (count as number);
    });
    return total;
  }

  subscribeToCurrentShift(
    companyId: string,
    employeeId: string,
    callback: (shift: ShiftSession | null) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Initial fetch
    this.getCurrentShift(companyId, employeeId)
      .then(callback)
      .catch((error) => {
        if (errorCallback) errorCallback(error);
      });

    const interval = setInterval(() => {
      this.getCurrentShift(companyId, employeeId)
        .then(callback)
        .catch((error) => {
          if (errorCallback) errorCallback(error);
        });
    }, 15000);

    return () => clearInterval(interval);
  }
}

export const registerService = new RegisterService();
