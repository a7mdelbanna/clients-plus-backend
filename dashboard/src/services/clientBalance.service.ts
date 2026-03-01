import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  ClientTransaction,
  ClientPackage,
  ClientMembership,
  ClientBalanceSummary
} from './client.service';

// Balance configuration interface
export interface BalanceConfig {
  allowNegativeBalance: boolean;
  defaultCreditLimit: number;
  lowBalanceThreshold: number;
  autoChargeEnabled: boolean;
  autoChargeThreshold: number;
  currency: string;
  currencySymbol: string;
}

// Payment method interface
export interface PaymentMethod {
  id?: string;
  clientId: string;
  type: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  details?: {
    last4?: string;
    cardBrand?: string;
    bankName?: string;
    checkNumber?: string;
  };
  isDefault: boolean;
  createdAt?: string;
}

// Loyalty configuration
export interface LoyaltyConfig {
  pointsPerCurrency: number;
  redemptionRate: number;
  expiryMonths?: number;
  bonusPointsEvents: {
    firstVisit?: number;
    birthday?: number;
    referral?: number;
    review?: number;
  };
}

// Loyalty transaction
export interface LoyaltyTransaction {
  id?: string;
  clientId: string;
  date: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment';
  points: number;
  description: string;
  reference?: string;
  expiryDate?: string;
  createdAt?: string;
}

// Gift card interface
export interface GiftCard {
  id?: string;
  code: string;
  clientId?: string;
  purchasedBy: string;
  purchaseDate: string;
  originalAmount: number;
  currentBalance: number;
  expiryDate?: string;
  status: 'active' | 'depleted' | 'expired';
  usageHistory: {
    date: string;
    amount: number;
    transactionId: string;
  }[];
  createdAt?: string;
}

class ClientBalanceService {
  private readonly endpoint = '/client-balance';

  // Create a new transaction
  async createTransaction(
    transaction: Omit<ClientTransaction, 'id' | 'createdAt'>,
    updateClientBalance: boolean = true
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/transactions`,
        { ...transaction, updateClientBalance }
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create transaction');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create transaction');
    }
  }

  // Get current balance for a client
  async getCurrentBalance(clientId: string): Promise<number> {
    try {
      const response = await apiClient.get<ApiResponse<{ balance: number }>>(
        `${this.endpoint}/${clientId}/balance`
      );
      return response.data.data?.balance || 0;
    } catch (error) {
      console.error('Error getting current balance:', error);
      return 0;
    }
  }

  // Calculate balance from all transactions
  async calculateBalanceFromTransactions(clientId: string): Promise<number> {
    try {
      const response = await apiClient.get<ApiResponse<{ balance: number }>>(
        `${this.endpoint}/${clientId}/calculated-balance`
      );
      return response.data.data?.balance || 0;
    } catch (error) {
      console.error('Error calculating balance:', error);
      return 0;
    }
  }

  // Get transaction history
  async getTransactionHistory(
    clientId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ClientTransaction['type'];
    }
  ): Promise<ClientTransaction[]> {
    try {
      const params: any = {};
      if (options?.limit) params.limit = options.limit;
      if (options?.startDate) params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();
      if (options?.type) params.type = options.type;

      const response = await apiClient.get<ApiResponse<ClientTransaction[]>>(
        `${this.endpoint}/${clientId}/transactions`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  // Subscribe to balance changes (polling)
  subscribeToBalance(
    clientId: string,
    callback: (balance: number) => void
  ): () => void {
    this.getCurrentBalance(clientId)
      .then(callback)
      .catch(error => console.error('Error in balance subscription:', error));

    const interval = setInterval(() => {
      this.getCurrentBalance(clientId)
        .then(callback)
        .catch(error => console.error('Error in balance subscription:', error));
    }, 15000);

    return () => clearInterval(interval);
  }

  // Subscribe to transactions (polling)
  subscribeToTransactions(
    clientId: string,
    callback: (transactions: ClientTransaction[]) => void
  ): () => void {
    this.getTransactionHistory(clientId, { limit: 50 })
      .then(callback)
      .catch(error => console.error('Error in transaction subscription:', error));

    const interval = setInterval(() => {
      this.getTransactionHistory(clientId, { limit: 50 })
        .then(callback)
        .catch(error => console.error('Error in transaction subscription:', error));
    }, 15000);

    return () => clearInterval(interval);
  }

  // Process payment
  async processPayment(
    clientId: string,
    amount: number,
    method: string,
    reference?: string,
    notes?: string
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${clientId}/payment`,
        { amount, method, reference, notes }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error processing payment:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to process payment');
    }
  }

  // Apply charge
  async applyCharge(
    clientId: string,
    amount: number,
    description: string,
    reference?: string
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${clientId}/charge`,
        { amount, description, reference }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error applying charge:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to apply charge');
    }
  }

  // Process refund
  async processRefund(
    clientId: string,
    amount: number,
    reason: string,
    originalTransactionId?: string
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${clientId}/refund`,
        { amount, reason, originalTransactionId }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error processing refund:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to process refund');
    }
  }

  // Package Management
  async createPackage(packageData: Omit<ClientPackage, 'id' | 'createdAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/packages`,
        packageData
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating package:', error);
      throw error;
    }
  }

  // Get active packages
  async getActivePackages(clientId: string): Promise<ClientPackage[]> {
    try {
      const response = await apiClient.get<ApiResponse<ClientPackage[]>>(
        `${this.endpoint}/${clientId}/packages`,
        { params: { status: 'active' } }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting active packages:', error);
      return [];
    }
  }

  // Use package value
  async usePackageValue(packageId: string, amount: number, serviceId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/packages/${packageId}/use`,
        { amount, serviceId }
      );
    } catch (error: any) {
      console.error('Error using package value:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to use package value');
    }
  }

  // Membership Management
  async createMembership(membershipData: Omit<ClientMembership, 'id' | 'createdAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/memberships`,
        membershipData
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating membership:', error);
      throw error;
    }
  }

  // Get active membership
  async getActiveMembership(clientId: string): Promise<ClientMembership | null> {
    try {
      const response = await apiClient.get<ApiResponse<ClientMembership>>(
        `${this.endpoint}/${clientId}/membership`
      );
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting active membership:', error);
      return null;
    }
  }

  // Loyalty Points Management
  async addLoyaltyPoints(
    clientId: string,
    points: number,
    description: string,
    reference?: string
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/${clientId}/loyalty/add`,
        { points, description, reference }
      );
    } catch (error: any) {
      console.error('Error adding loyalty points:', error);
      throw error;
    }
  }

  // Redeem loyalty points
  async redeemLoyaltyPoints(
    clientId: string,
    points: number,
    description: string
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/${clientId}/loyalty/redeem`,
        { points, description }
      );
    } catch (error: any) {
      console.error('Error redeeming loyalty points:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to redeem loyalty points');
    }
  }

  // Get balance summary
  async getBalanceSummary(clientId: string): Promise<ClientBalanceSummary> {
    try {
      const response = await apiClient.get<ApiResponse<ClientBalanceSummary>>(
        `${this.endpoint}/${clientId}/summary`
      );
      return response.data.data || {
        currentBalance: 0,
        totalLifetimeSpend: 0,
        averageTicket: 0,
        outstandingInvoices: 0,
        creditLimit: 0,
        packages: 0,
        memberships: 0,
        loyaltyPoints: 0,
      };
    } catch (error) {
      console.error('Error getting balance summary:', error);
      throw error;
    }
  }

  // Gift Card Management
  async createGiftCard(
    purchasedBy: string,
    amount: number,
    recipientId?: string,
    expiryMonths: number = 12
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/gift-cards`,
        { purchasedBy, amount, recipientId, expiryMonths }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating gift card:', error);
      throw error;
    }
  }

  // Use gift card
  async useGiftCard(
    code: string,
    amount: number,
    transactionId: string
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/gift-cards/use`,
        { code, amount, transactionId }
      );
    } catch (error: any) {
      console.error('Error using gift card:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to use gift card');
    }
  }

  // Batch operations for performance
  async batchUpdateBalances(
    updates: { clientId: string; adjustment: number; reason: string }[]
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/batch-update`,
        { updates }
      );
    } catch (error: any) {
      console.error('Error batch updating balances:', error);
      throw error;
    }
  }
}

export const clientBalanceService = new ClientBalanceService();
