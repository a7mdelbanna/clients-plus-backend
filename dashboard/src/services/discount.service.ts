import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  DiscountRule,
  DiscountFilters,
  DiscountValidationResult,
  DiscountCalculationResult,
  AppliedDiscount,
  DiscountUsageStats,
  DiscountType,
  DiscountAppliesTo,
} from '../types/discount.types';
import type { SaleItem } from '../types/sale.types';

class DiscountService {
  private readonly endpoint = '/discounts';

  // Create a new discount rule
  async createDiscount(discount: Omit<DiscountRule, 'id' | 'createdAt' | 'updatedAt' | 'currentUses'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.endpoint, discount);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create discount');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating discount:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create discount');
    }
  }

  // Update an existing discount rule
  async updateDiscount(discountId: string, updates: Partial<DiscountRule>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${discountId}`, updates);
    } catch (error: any) {
      console.error('Error updating discount:', error);
      throw error;
    }
  }

  // Get a discount rule by ID
  async getDiscount(discountId: string): Promise<DiscountRule | null> {
    try {
      const response = await apiClient.get<ApiResponse<DiscountRule>>(`${this.endpoint}/${discountId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  // Get discount rules with filters
  async getDiscounts(
    companyId: string,
    filters: DiscountFilters = {},
    limitCount = 50
  ): Promise<{
    discounts: DiscountRule[];
    lastDoc: any;
  }> {
    try {
      const params: any = { limit: limitCount };
      if (filters.isActive !== undefined) params.isActive = filters.isActive;
      if (filters.discountType) params.discountType = filters.discountType;
      if (filters.appliesTo) params.appliesTo = filters.appliesTo;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate.toISOString();
      if (filters.endDate) params.endDate = filters.endDate.toISOString();

      const response = await apiClient.get<ApiResponse<DiscountRule[]>>(this.endpoint, { params });
      return {
        discounts: response.data.data || [],
        lastDoc: null,
      };
    } catch (error) {
      console.error('Error getting discounts:', error);
      return { discounts: [], lastDoc: null };
    }
  }

  // Subscribe to discount rules changes (polling)
  subscribeToDiscounts(
    companyId: string,
    filters: DiscountFilters = {},
    callback: (discounts: DiscountRule[]) => void
  ): () => void {
    this.getDiscounts(companyId, filters)
      .then(result => callback(result.discounts))
      .catch(error => console.error('Error in discount subscription:', error));

    const interval = setInterval(() => {
      this.getDiscounts(companyId, filters)
        .then(result => callback(result.discounts))
        .catch(error => console.error('Error in discount subscription:', error));
    }, 30000);

    return () => clearInterval(interval);
  }

  // Delete a discount rule
  async deleteDiscount(discountId: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${discountId}`);
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      throw error;
    }
  }

  // Validate discount rules for a sale
  async validateDiscount(
    discountId: string,
    customerId: string | undefined,
    items: SaleItem[],
    subtotal: number,
    branchId: string,
    currentDate: Date = new Date()
  ): Promise<DiscountValidationResult> {
    try {
      const response = await apiClient.post<ApiResponse<DiscountValidationResult>>(
        `${this.endpoint}/${discountId}/validate`,
        { customerId, items, subtotal, branchId, currentDate: currentDate.toISOString() }
      );
      return response.data.data || { isValid: false, errors: ['Validation failed'], warnings: [] };
    } catch (error: any) {
      console.error('Error validating discount:', error);
      return { isValid: false, errors: [error.message || 'Validation failed'], warnings: [] };
    }
  }

  // Calculate discount amount for items
  calculateDiscount(
    discount: DiscountRule,
    items: SaleItem[],
    subtotal: number
  ): DiscountCalculationResult {
    let discountAmount = 0;
    const appliedDiscounts: AppliedDiscount[] = [];
    const itemIds: string[] = [];

    switch (discount.appliesTo) {
      case 'order':
        if (discount.discountType === 'percentage') {
          discountAmount = (subtotal * discount.discountValue) / 100;
        } else {
          discountAmount = discount.discountValue;
        }
        if (discount.maximumDiscountAmount && discountAmount > discount.maximumDiscountAmount) {
          discountAmount = discount.maximumDiscountAmount;
        }
        discountAmount = Math.min(discountAmount, subtotal);
        break;

      case 'product':
        if (discount.productIds) {
          const eligibleItems = items.filter(item => discount.productIds?.includes(item.productId));
          const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.subtotal, 0);
          if (discount.discountType === 'percentage') {
            discountAmount = (eligibleSubtotal * discount.discountValue) / 100;
          } else {
            discountAmount = Math.min(discount.discountValue, eligibleSubtotal);
          }
          itemIds.push(...eligibleItems.map(item => item.productId));
        }
        break;

      case 'category':
        break;
    }

    discountAmount = Math.max(0, discountAmount || 0);

    const appliedDiscount: AppliedDiscount = {
      discountId: discount.id!,
      discountName: discount.name,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      appliedAmount: discountAmount,
      appliesTo: discount.appliesTo,
      itemIds: itemIds.length > 0 ? itemIds : undefined,
      appliedAt: new Date().toISOString() as any,
    };

    appliedDiscounts.push(appliedDiscount);

    return {
      originalAmount: subtotal,
      discountAmount,
      finalAmount: subtotal - discountAmount,
      appliedDiscounts,
      savings: discountAmount,
    };
  }

  // Apply multiple discounts with combination rules
  async applyMultipleDiscounts(
    discountIds: string[],
    items: SaleItem[],
    subtotal: number,
    customerId?: string,
    branchId?: string
  ): Promise<DiscountCalculationResult> {
    try {
      const response = await apiClient.post<ApiResponse<DiscountCalculationResult>>(
        `${this.endpoint}/apply-multiple`,
        { discountIds, items, subtotal, customerId, branchId }
      );
      return response.data.data || {
        originalAmount: subtotal,
        discountAmount: 0,
        finalAmount: subtotal,
        appliedDiscounts: [],
        savings: 0,
      };
    } catch (error) {
      console.error('Error applying multiple discounts:', error);
      return {
        originalAmount: subtotal,
        discountAmount: 0,
        finalAmount: subtotal,
        appliedDiscounts: [],
        savings: 0,
      };
    }
  }

  // Record discount usage
  async recordDiscountUsage(discountId: string, saleId: string, amount: number): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/${discountId}/usage`, { saleId, amount });
    } catch (error) {
      console.error('Error recording discount usage:', error);
    }
  }

  // Get discount usage statistics
  async getDiscountStats(discountId: string): Promise<DiscountUsageStats | null> {
    try {
      const response = await apiClient.get<ApiResponse<DiscountUsageStats>>(`${this.endpoint}/${discountId}/stats`);
      return response.data.data || null;
    } catch (error) {
      console.error('Error getting discount stats:', error);
      return null;
    }
  }

  // Get active discounts for POS
  async getActiveDiscountsForPOS(
    companyId: string,
    branchId: string,
    customerId?: string
  ): Promise<DiscountRule[]> {
    try {
      const params: any = { branchId, active: true };
      if (customerId) params.customerId = customerId;

      const response = await apiClient.get<ApiResponse<DiscountRule[]>>(`${this.endpoint}/active`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting active discounts for POS:', error);
      return [];
    }
  }
}

export const discountService = new DiscountService();
