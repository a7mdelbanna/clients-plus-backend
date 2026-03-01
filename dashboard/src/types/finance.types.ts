// Account types
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'digital_wallet' | 'petty_cash';
export type AccountStatus = 'active' | 'inactive' | 'closed';

// Digital wallet types specific to Egypt
export type DigitalWalletType = 
  | 'instapay' 
  | 'vodafone_cash' 
  | 'orange_cash' 
  | 'etisalat_cash' 
  | 'fawry' 
  | 'we_pay' 
  | 'halan' 
  | 'bm_wallet' 
  | 'shahry' 
  | 'phone_cash' 
  | 'meeza'
  | 'other';

// Transaction types
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'reconciled';

// Payment methods
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'check' | 'other';

// Financial account interface
export interface FinancialAccount {
  id?: string;
  companyId: string;
  branchId?: string; // null for company-wide accounts
  
  // Basic info
  name: string;
  nameAr: string;
  type: AccountType;
  
  // Digital Wallet Specific Fields
  digitalWalletType?: DigitalWalletType;
  digitalWalletDetails?: DigitalWalletDetails;
  
  // Bank details (for bank accounts)
  bankDetails?: BankDetails;
  
  // Balance tracking
  currentBalance: number;
  openingBalance: number;
  openingDate: any;
  
  // Settings
  isDefault: boolean;
  allowNegativeBalance: boolean;
  lowBalanceThreshold?: number;
  
  // For digital wallets - track fees
  monthlyFeeTotal?: number;
  lastFeeResetDate?: any;
  
  // Reconciliation
  lastReconciliationDate?: any;
  reconciledBalance?: number;
  
  // Metadata
  status: AccountStatus;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
  closedAt?: any;
  closedBy?: string;
}

// Digital wallet details
export interface DigitalWalletDetails {
  phoneNumber?: string;      // Associated phone number
  accountId?: string;        // Wallet account ID/number
  merchantCode?: string;     // For business accounts
  qrCode?: string;          // QR code for payments
  qrCodeImage?: string;     // QR code image URL
  
  // Transfer fees configuration
  transferFees?: {
    sameWallet: number;      // e.g., 1 EGP for Vodafone to Vodafone
    sameWalletPercentage?: number;
    otherWallet: number;     // e.g., 0.5% max 15 EGP
    otherWalletPercentage?: number;
    otherWalletMax?: number;
    freeTransferLimit?: number; // e.g., first 2000 EGP free monthly
    freeTransferCount?: number; // e.g., first transfer free
  };
  
  // Additional settings
  dailyLimit?: number;
  monthlyLimit?: number;
  requiresOTP?: boolean;
}

// Bank details
export interface BankDetails {
  bankName: string;
  bankNameAr?: string;
  accountNumber: string;
  accountHolder?: string;
  iban?: string;
  swiftCode?: string;
  branchName?: string;
  branchCode?: string;
}

// Financial transaction interface
export interface FinancialTransaction {
  id?: string;
  companyId: string;
  branchId: string;
  
  // Transaction details
  date: any;
  type: TransactionType;
  category: string; // predefined categories
  subcategory?: string;
  
  // Amounts
  amount: number;
  vatAmount?: number;
  totalAmount: number;
  currency?: string; // Default: EGP
  
  // Account info
  accountId: string;
  accountName?: string; // Denormalized for performance
  paymentMethod: PaymentMethod;
  
  // For transfers
  isTransfer?: boolean;
  transferAccountId?: string;
  transferDirection?: 'from' | 'to';
  
  // Digital wallet specific
  digitalWalletPayment?: DigitalWalletPayment;
  
  // References
  referenceType?: 'appointment' | 'product_sale' | 'expense' | 'salary' | 'purchase' | 'other';
  referenceId?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  
  // Details
  description: string;
  descriptionAr?: string;
  notes?: string;
  attachments?: string[];
  
  // Staff tracking
  createdBy: string;
  approvedBy?: string;
  
  // Status
  status: TransactionStatus;
  reconciledAt?: any;
  voidedAt?: any;
  voidReason?: string;
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

// Digital wallet payment details
export interface DigitalWalletPayment {
  walletType: DigitalWalletType;
  
  // Reference number from the wallet provider
  walletTransactionId?: string;
  
  // Customer's wallet details
  senderWalletType?: DigitalWalletType;
  senderPhoneNumber?: string;
  senderName?: string;
  
  // Transaction fees (if any)
  grossAmount: number;
  walletFee?: number;
  netAmount: number;
  
  // Confirmation method
  confirmationMethod: 'manual' | 'sms' | 'app_notification' | 'api' | 'qr_scan';
  confirmationScreenshot?: string; // URL for manual confirmations
  confirmedBy?: string; // Staff who confirmed
  confirmedAt?: any;
}

// Payment method amounts (kept for general use in reports)
export interface PaymentMethodAmounts {
  cash: number;
  card: number;
  bankTransfer: number;
  digitalWallet: number;
  check: number;
  total: number;
  
  // Digital wallet breakdown
  digitalWalletBreakdown?: {
    [key in DigitalWalletType]?: number;
  };
}

// Expense categories
export interface ExpenseCategory {
  id?: string;
  companyId: string;
  
  name: string;
  nameAr: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Hierarchy
  parentId?: string;
  isSystemCategory?: boolean; // Cannot be deleted
  
  // Budgeting
  monthlyBudget?: number;
  yearlyBudget?: number;
  
  // Settings
  requiresApproval?: boolean;
  approvalThreshold?: number;
  requiresReceipt?: boolean;
  
  // Status
  isActive: boolean;
  sortOrder?: number;
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

// Financial report types
export type ReportType = 
  | 'daily_cash'
  | 'cash_flow'
  | 'profit_loss'
  | 'balance_sheet'
  | 'sales_summary'
  | 'expense_summary'
  | 'tax_report'
  | 'digital_wallet_summary';

// Financial report interface
export interface FinancialReport {
  id?: string;
  companyId: string;
  branchId?: string; // null for company-wide reports
  
  // Report details
  type: ReportType;
  name: string;
  nameAr: string;
  
  // Period
  startDate: any;
  endDate: any;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  
  // Generated data
  data: any; // Report-specific data structure
  summary: ReportSummary;
  
  // Status
  status: 'generating' | 'ready' | 'failed';
  
  // File exports
  pdfUrl?: string;
  excelUrl?: string;
  
  // Metadata
  generatedBy: string;
  generatedAt: any;
  expiresAt?: any;
}

// Report summary
export interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  
  // By payment method
  incomeByMethod: PaymentMethodAmounts;
  
  // By category
  expensesByCategory?: { [categoryId: string]: number };
  
  // Comparisons
  previousPeriodIncome?: number;
  previousPeriodExpenses?: number;
  incomeGrowth?: number;
  expenseGrowth?: number;
}

// Budget interface
export interface Budget {
  id?: string;
  companyId: string;
  branchId?: string;
  
  // Budget details
  name: string;
  nameAr: string;
  year: number;
  month?: number; // For monthly budgets
  
  // Budget items
  items: BudgetItem[];
  
  // Totals
  totalBudgeted: number;
  totalActual?: number;
  variance?: number;
  
  // Status
  status: 'draft' | 'active' | 'closed';
  
  // Metadata
  createdBy: string;
  approvedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Budget item
export interface BudgetItem {
  categoryId: string;
  categoryName?: string;
  budgetedAmount: number;
  actualAmount?: number;
  variance?: number;
  variancePercentage?: number;
  notes?: string;
}

// Financial settings
export interface FinancialSettings {
  companyId: string;
  
  // Currency
  defaultCurrency: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  
  // Fiscal year
  fiscalYearStart: number; // Month (1-12)
  
  // Tax settings
  defaultVatRate: number;
  taxNumber?: string;
  
  // Invoice settings
  invoicePrefix?: string;
  nextInvoiceNumber: number;
  
  // Payment terms
  defaultPaymentTerms?: string;
  
  // Digital wallet settings
  enableDigitalWallets: boolean;
  defaultDigitalWallet?: DigitalWalletType;
  autoReconcileDigitalWallets?: boolean;
  
  // Approval settings
  expenseApprovalRequired: boolean;
  expenseApprovalThreshold?: number;
  
  // Notifications
  lowBalanceAlerts: boolean;
  dailyCashReportEmail?: string;
  
  // Metadata
  updatedAt?: any;
  updatedBy?: string;
}

// Transaction filters
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  category?: string;
  paymentMethod?: PaymentMethod;
  digitalWalletType?: DigitalWalletType;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  branchId?: string;
}

// Account summary
export interface AccountSummary {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  currentBalance: number;
  
  // Period stats
  periodIncome: number;
  periodExpenses: number;
  periodNet: number;
  
  // Transaction counts
  transactionCount: number;
  pendingTransactions: number;
  
  // Last activity
  lastTransactionDate?: any;
  lastTransactionAmount?: number;
  lastTransactionType?: TransactionType;
}