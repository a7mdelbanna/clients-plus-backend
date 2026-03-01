export type DiscountType = 'percentage' | 'fixed';
export type DiscountAppliesTo = 'order' | 'product' | 'category';
export type DiscountUsageLimit = 'unlimited' | 'limited';

export interface DiscountRule {
  id?: string;
  
  // Company and branch info
  companyId: string;
  branchId?: string; // If null, applies to all branches
  
  // Basic info
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  
  // Discount configuration
  discountType: DiscountType;
  discountValue: number; // Percentage (0-100) or fixed amount
  
  // What this discount applies to
  appliesTo: DiscountAppliesTo;
  productIds?: string[]; // If appliesTo = 'product'
  categoryIds?: string[]; // If appliesTo = 'category'
  
  // Conditions
  minimumOrderAmount?: number;
  minimumQuantity?: number;
  maximumDiscountAmount?: number; // Cap for percentage discounts
  
  // Validity
  startDate?: any;
  endDate?: any;
  isActive: boolean;
  
  // Usage limits
  usageLimit: DiscountUsageLimit;
  maxUses?: number; // If usageLimit = 'limited'
  maxUsesPerCustomer?: number;
  currentUses: number;
  
  // Customer restrictions
  allowedCustomerIds?: string[]; // If set, only these customers can use it
  excludedCustomerIds?: string[]; // If set, these customers cannot use it
  newCustomersOnly?: boolean;
  
  // Time restrictions
  validDays?: number[]; // 0-6 (Sunday-Saturday)
  validHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  
  // Staff permissions
  requiresManagerApproval?: boolean;
  staffIds?: string[]; // Staff who can apply this discount
  
  // Combination rules
  canCombineWithOthers?: boolean;
  excludedDiscountIds?: string[]; // Cannot be used with these discounts
  
  // Tracking
  createdAt: any;
  updatedAt: any;
  createdBy: string; // Staff ID
  lastUsedAt?: any;
}

export interface AppliedDiscount {
  discountId: string;
  discountName: string;
  discountType: DiscountType;
  discountValue: number;
  appliedAmount: number;
  appliesTo: DiscountAppliesTo;
  itemIds?: string[]; // Which sale items this was applied to
  approvedBy?: string; // Staff ID if manual approval was required
  appliedAt: any;
}

export interface DiscountValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  maxDiscountAmount?: number;
}

export interface DiscountCalculationResult {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedDiscounts: AppliedDiscount[];
  savings: number;
}

export interface DiscountFilters {
  isActive?: boolean;
  discountType?: DiscountType;
  appliesTo?: DiscountAppliesTo;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  branchId?: string;
  createdBy?: string;
}

export interface DiscountUsageStats {
  discountId: string;
  discountName: string;
  totalUses: number;
  totalSavings: number;
  averageOrderValue: number;
  conversionRate: number; // Percentage of applicable orders that used this discount
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    uses: number;
    totalSavings: number;
  }>;
  usageByDate: Array<{
    date: string;
    uses: number;
    savings: number;
  }>;
}

// Enhanced sale types with discount support
export interface SaleWithDiscounts {
  // ... existing Sale fields
  
  // Enhanced discount tracking
  appliedDiscounts: AppliedDiscount[];
  totalDiscountAmount: number;
  discountBreakdown: {
    orderLevel: number;
    itemLevel: number;
  };
  
  // Discount approval tracking
  discountApprovals?: Array<{
    discountId: string;
    approvedBy: string;
    approvedAt: any;
    reason?: string;
  }>;
}