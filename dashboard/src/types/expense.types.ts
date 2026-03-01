import type { FinancialTransaction, PaymentMethod } from './finance.types';

// Expense Category Types
export interface ExpenseCategory {
  id?: string;
  companyId: string;
  parentCategoryId?: string; // For subcategories
  
  // Basic Info
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  order?: number;
  
  // Configuration
  requiresApproval: boolean;
  approvalThreshold?: number;
  requiresReceipt: boolean;
  allowRecurring: boolean;
  
  // Budget
  monthlyBudget?: number;
  yearlyBudget?: number;
  budgetAlertThreshold?: number; // Percentage
  
  // Metadata
  isActive: boolean;
  isSystem?: boolean; // System categories cannot be deleted
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// Vendor Types
export type VendorType = 'supplier' | 'service_provider' | 'contractor' | 'utility' | 'other';
export type VendorStatus = 'active' | 'inactive' | 'blocked';

export interface Vendor {
  id?: string;
  companyId: string;
  
  // Basic Info
  name: string;
  nameAr?: string;
  code?: string; // Vendor code for quick reference
  type: VendorType;
  
  // Contact Info
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    governorate?: string;
    postalCode?: string;
  };
  
  // Business Info
  taxNumber?: string;
  commercialRegister?: string;
  website?: string;
  
  // Categories
  categoryIds: string[]; // Which expense categories they provide
  
  // Payment Terms
  paymentTerms: {
    defaultMethod: PaymentMethod;
    creditDays?: number;
    creditLimit?: number;
    earlyPaymentDiscount?: number;
    bankAccount?: {
      bankName?: string;
      accountNumber?: string;
      iban?: string;
    };
  };
  
  // Performance
  rating?: number;
  totalTransactions: number;
  totalAmount: number;
  averageDeliveryTime?: number; // In days
  lastTransactionDate?: any;
  
  // Status
  status: VendorStatus;
  notes?: string;
  tags?: string[];
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// Receipt Management
export interface ExpenseReceipt {
  id: string;
  
  // File Info
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  
  // Extracted Data (OCR)
  extractedData?: {
    vendorName?: string;
    amount?: number;
    date?: Date;
    receiptNumber?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    taxNumber?: string;
    vatAmount?: number;
    totalAmount?: number;
  };
  
  // Processing Status
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  verificationStatus: 'unverified' | 'verified' | 'disputed';
  
  // Metadata
  uploadedAt: any;
  uploadedBy: string;
  processedAt?: any;
  verifiedAt?: any;
  verifiedBy?: string;
  notes?: string;
}

// Expense Transaction Extension
export interface ExpenseTransaction extends FinancialTransaction {
  // Expense-specific fields
  expenseDetails: {
    categoryId: string;
    subcategoryId?: string;
    vendorId?: string;
    
    // Receipt Management
    receipts: ExpenseReceipt[];
    
    // Approval Workflow
    approvalStatus: 'pending' | 'approved' | 'rejected' | 'not_required';
    approvalWorkflow?: ApprovalWorkflow;
    
    // Recurring Expense
    isRecurring: boolean;
    recurringDetails?: RecurringExpenseDetails;
    
    // Purchase Order
    purchaseOrderId?: string;
    
    // Additional Details
    billNumber?: string;
    taxInvoiceNumber?: string;
    vatAmount?: number;
    itemDetails?: ExpenseItem[];
    
    // Allocation
    costCenter?: string; // Branch, department, etc.
    project?: string;
    tags?: string[];
  };
}

// Expense Items
export interface ExpenseItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  categoryId?: string;
  notes?: string;
}

// Approval Workflow
export interface ApprovalWorkflow {
  id: string;
  transactionId: string;
  
  // Workflow Setup
  rules: ApprovalRule[];
  currentStep: number;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  
  // History
  approvalHistory: ApprovalAction[];
  
  // Timing
  initiatedAt: any;
  completedAt?: any;
  deadline?: any;
  
  // Notifications
  remindersSent: number;
  lastReminderAt?: any;
}

export interface ApprovalRule {
  step: number;
  name: string;
  approverRole?: string; // 'manager' | 'owner' | 'accountant'
  approverIds?: string[]; // Specific user IDs
  
  conditions: {
    minAmount?: number;
    maxAmount?: number;
    categories?: string[];
    requiresAllApprovers?: boolean; // For multiple approvers
  };
  
  autoApproveConditions?: {
    underAmount?: number;
    trustedVendors?: boolean;
    recurringExpense?: boolean;
  };
}

export interface ApprovalAction {
  approverId: string;
  approverName: string;
  approverRole?: string;
  action: 'approve' | 'reject' | 'request_info' | 'delegate';
  timestamp: any;
  comments?: string;
  attachments?: string[];
  delegatedTo?: string;
}

// Recurring Expenses
export interface RecurringExpenseDetails {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  customFrequency?: {
    interval: number;
    unit: 'days' | 'weeks' | 'months';
  };
  
  // Schedule
  startDate: Date;
  endDate?: Date;
  nextDueDate: Date;
  
  // Amount
  fixedAmount?: number;
  estimatedAmount?: number;
  allowVariableAmount: boolean;
  varianceThreshold?: number; // Percentage
  
  // Auto-creation
  autoCreate: boolean;
  daysBeforeDue: number; // Create X days before due
  autoApprove: boolean;
  
  // Notifications
  reminderDays: number[]; // Remind X days before
  notifyOnCreation: boolean;
  notifyOnApproval: boolean;
  
  // History
  occurrences: RecurringExpenseOccurrence[];
  totalPaid: number;
  averageAmount: number;
}

export interface RecurringExpenseOccurrence {
  dueDate: Date;
  transactionId?: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'skipped' | 'cancelled';
  paidDate?: Date;
  notes?: string;
}

// Purchase Orders
export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id?: string;
  companyId: string;
  branchId?: string;
  
  // Order Info
  orderNumber: string;
  vendorId: string;
  vendorName?: string; // Denormalized for performance
  
  // Items
  items: PurchaseOrderItem[];
  
  // Amounts
  subtotal: number;
  vatAmount: number;
  discountAmount?: number;
  shippingAmount?: number;
  totalAmount: number;
  currency: string;
  
  // Delivery
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveryAddress?: {
    name?: string;
    street?: string;
    city?: string;
    governorate?: string;
    phone?: string;
  };
  
  // Status
  status: PurchaseOrderStatus;
  
  // Approval
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: any;
  
  // Related Documents
  quotationId?: string;
  invoiceIds: string[];
  receiptIds: string[];
  expenseTransactionIds: string[];
  
  // Terms
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  internalNotes?: string;
  
  // Metadata
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  sentAt?: any;
  confirmedAt?: any;
  completedAt?: any;
}

export interface PurchaseOrderItem {
  id: string;
  productId?: string; // From inventory
  sku?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  vatRate?: number;
  vatAmount?: number;
  
  // Receiving
  receivedQuantity?: number;
  receivedDate?: Date;
  receivedBy?: string;
  
  // Category
  categoryId?: string;
  notes?: string;
}

// Budget Management
export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';
export type BudgetStatus = 'draft' | 'active' | 'closed';

export interface Budget {
  id?: string;
  companyId: string;
  branchId?: string; // null for company-wide budget
  
  // Period
  name: string;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  fiscalYear?: number;
  
  // Budget Lines
  categoryBudgets: CategoryBudget[];
  
  // Totals
  totalBudget: number;
  totalAllocated: number;
  unallocated: number;
  
  // Status
  status: BudgetStatus;
  
  // Comparison
  previousBudgetId?: string;
  baselineFromPrevious: boolean;
  
  // Metadata
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  approvedBy?: string;
  approvedAt?: any;
  closedAt?: any;
  notes?: string;
}

export interface CategoryBudget {
  categoryId: string;
  categoryName?: string; // Denormalized
  
  // Amounts
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number; // POs not yet received
  availableAmount: number;
  
  // Percentage
  percentageUsed: number;
  percentageCommitted: number;
  
  // Alerts
  alertThreshold: number; // Percentage
  alertSent: boolean;
  alertSentAt?: any;
  
  // Forecast
  forecastAmount?: number;
  lastYearAmount?: number;
  variance?: number;
  
  // Sub-budgets
  subCategoryBudgets?: CategoryBudget[];
}

// Expense Reports
export interface ExpenseReport {
  id?: string;
  companyId: string;
  
  // Report Info
  name: string;
  type: 'summary' | 'detailed' | 'category' | 'vendor' | 'approval' | 'budget';
  period: {
    startDate: Date;
    endDate: Date;
  };
  
  // Filters
  filters: {
    branchIds?: string[];
    categoryIds?: string[];
    vendorIds?: string[];
    status?: string[];
    minAmount?: number;
    maxAmount?: number;
    tags?: string[];
  };
  
  // Data
  data: any; // Report-specific data structure
  
  // Export
  exportUrl?: string;
  exportFormat?: 'pdf' | 'excel' | 'csv';
  
  // Metadata
  generatedAt: any;
  generatedBy: string;
  scheduledReport?: boolean;
  scheduleId?: string;
}

// Expense Settings
export interface ExpenseSettings {
  companyId: string;
  
  // General Settings
  requireReceiptAbove?: number;
  autoApproveBelow?: number;
  defaultPaymentMethod?: PaymentMethod;
  
  // Approval Settings
  approvalEnabled: boolean;
  approvalRules: ApprovalRule[];
  escalationDays?: number;
  
  // OCR Settings
  ocrEnabled: boolean;
  autoExtractData: boolean;
  requireVerification: boolean;
  
  // Recurring Settings
  recurringEnabled: boolean;
  reminderDays: number[];
  autoCreateDays: number;
  
  // Budget Settings
  budgetEnabled: boolean;
  budgetPeriod: BudgetPeriod;
  alertThresholds: number[]; // e.g., [70, 90, 100]
  restrictOverBudget: boolean;
  
  // VAT Settings
  vatRate: number;
  vatRegistrationNumber?: string;
  includeVatInReports: boolean;
  
  // Notifications
  notifyOnSubmission: boolean;
  notifyOnApproval: boolean;
  notifyOnRejection: boolean;
  notifyOnBudgetAlert: boolean;
  
  // Integration
  syncWithAccounting: boolean;
  accountingSystemId?: string;
  chartOfAccountsMapping?: Record<string, string>; // categoryId -> GL account
  
  // Metadata
  updatedAt?: any;
  updatedBy?: string;
}