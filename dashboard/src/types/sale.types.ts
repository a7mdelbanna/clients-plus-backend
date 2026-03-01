import type { PaymentMethod } from './finance.types';

export interface SaleItem {
  productId: string;
  productName: string;
  productNameAr?: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  subtotal: number;
  cost?: number; // Product cost for profit calculation
}

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
  reference?: string; // For card/digital wallet transactions
  accountId?: string; // The financial account this payment goes to
}

export interface Sale {
  id?: string;
  
  // Company and branch info
  companyId: string;
  branchId: string;
  
  // Sale identification
  saleNumber: string; // e.g., "POS-2024-0001"
  receiptNumber: string; // e.g., "RCP-2024-0001"
  
  // Timestamps
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
  voidedAt?: any;
  
  // Customer info
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  
  // Items
  items: SaleItem[];
  
  // Totals
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  
  // Payments
  payments: SalePayment[];
  totalPaid: number;
  change: number;
  
  // Status
  status: 'draft' | 'completed' | 'voided' | 'refunded';
  
  // Staff info
  staffId: string;
  staffName: string;
  
  // Additional info
  notes?: string;
  source: 'pos' | 'online' | 'phone' | 'walk-in';
  
  // Financial tracking
  profitMargin?: number;
  totalCost?: number;
  
  // For returns/refunds
  originalSaleId?: string;
  refundReason?: string;
}

export interface SaleFilters {
  startDate?: Date;
  endDate?: Date;
  status?: Sale['status'];
  customerId?: string;
  staffId?: string;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  search?: string; // Search in receipt number, customer name, etc.
}

export interface DailySalesSummary {
  date: Date;
  totalSales: number;
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  totalProfit: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    bank_transfer: number;
    digital_wallet: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}