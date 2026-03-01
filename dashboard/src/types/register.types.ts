// ==================== Core Shift Management ====================

// Represents a single employee shift session
export interface ShiftSession {
  id?: string;
  companyId: string;
  branchId: string;
  registerId: string; // Physical register/station identifier
  
  // Employee tracking
  employeeId: string;
  employeeName: string;
  employeeRole?: string;
  
  // Shift timing
  openedAt: any;
  closedAt?: any;
  scheduledEnd?: any; // When shift was supposed to end
  
  // Opening declaration
  declaredOpeningCash: DenominationCount;
  openingCashTotal: number;
  openingNotes?: string;
  
  // Multi-account balance tracking
  accountBalances?: {
    [accountId: string]: AccountBalance;
  };
  linkedAccounts?: string[]; // IDs of all accounts tracked in this shift
  
  // Closing reconciliation
  declaredClosingCash?: DenominationCount;
  closingCashTotal?: number;
  closingNotes?: string;
  
  // Expected vs Actual tracking
  expectedCash?: number;
  cashVariance?: number;
  varianceNotes?: string;
  varianceCategory?: 'over' | 'short' | 'exact';
  
  // Transaction summary
  totalSales: number;
  totalRefunds: number;
  totalPayIns: number;
  totalPayOuts: number;
  totalCashDrops: number;
  netCashFlow: number;
  
  // Payment method breakdown
  paymentMethodTotals?: {
    cash: number;
    card: number;
    bankTransfer: number;
    digitalWallet: number;
    other: number;
  };
  
  // Status tracking
  status: 'active' | 'closing' | 'closed' | 'suspended' | 'abandoned';
  suspendedAt?: any;
  suspendReason?: string;
  
  // Manager oversight
  openingApprovedBy?: string;
  openingApprovedAt?: any;
  closingApprovedBy?: string;
  closingApprovedAt?: any;
  requiresReview?: boolean;
  reviewNotes?: string;
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

// Account balance tracking for shifts
export interface AccountBalance {
  accountId: string;
  accountName: string;
  accountType: string;
  openingExpected: number;
  openingActual: number;
  openingVariance: number;
  currentBalance: number;
  closingExpected?: number;
  closingActual?: number;
  closingVariance?: number;
  lastUpdated?: any;
}

// Account movement tracking
export interface AccountMovement {
  id?: string;
  shiftId: string;
  accountId: string;
  accountName: string;
  movementType: 'sale' | 'refund' | 'transfer' | 'fee' | 'adjustment' | 'cash_drop';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  description?: string;
  timestamp: any;
  performedBy: string;
}

// ==================== Cash Denomination Tracking ====================

// Detailed cash denomination counting
export interface DenominationCount {
  bills: {
    200: number;
    100: number;
    50: number;
    20: number;
    10: number;
    5: number;
    1: number;
  };
  coins: {
    1: number;
    0.5: number;
    0.25: number;
  };
  rolls?: CashRoll[];
  foreignCurrency?: ForeignCurrency[];
  total: number; // Calculated total
}

// Cash roll tracking (for bulk coins)
export interface CashRoll {
  denomination: number;
  count: number;
  value: number;
}

// Foreign currency tracking
export interface ForeignCurrency {
  currency: string;
  amount: number;
  exchangeRate: number;
  valueInLocal: number;
}

// ==================== Transaction Tracking ====================

// Individual register transaction
export interface RegisterTransaction {
  id?: string;
  shiftId: string;
  registerId: string;
  
  // Transaction classification
  type: 'sale' | 'refund' | 'pay_in' | 'pay_out' | 'cash_drop' | 'loan' | 'adjustment';
  category: 'appointment' | 'product' | 'service' | 'expense' | 'transfer' | 'other';
  
  // Payment method breakdown
  paymentMethods: PaymentBreakdown;
  
  // Amount tracking
  subtotal: number;
  tax?: number;
  discount?: number;
  tip?: number;
  totalAmount: number;
  
  // References
  referenceType?: 'appointment' | 'sale' | 'invoice' | 'expense';
  referenceId?: string;
  referenceNumber?: string;
  
  // Customer info (if applicable)
  customerId?: string;
  customerName?: string;
  
  // Metadata
  timestamp: any;
  performedBy: string;
  performedByName?: string;
  notes?: string;
  
  // Void tracking
  isVoided?: boolean;
  voidedAt?: any;
  voidedBy?: string;
  voidReason?: string;
  voidApprovedBy?: string;
}

// Payment method breakdown for a transaction
export interface PaymentBreakdown {
  cash?: number;
  card?: CardPayment[];
  bankTransfer?: number;
  digitalWallet?: DigitalPayment[];
  giftCard?: GiftCardPayment[];
  loyalty?: number;
  credit?: number;
  other?: OtherPayment[];
}

// Card payment details
export interface CardPayment {
  amount: number;
  cardType?: 'visa' | 'mastercard' | 'amex' | 'other';
  lastFourDigits?: string;
  authorizationCode?: string;
  processorFee?: number;
}

// Digital wallet payment
export interface DigitalPayment {
  amount: number;
  walletType: string; // e.g., 'vodafone_cash', 'instapay'
  transactionRef?: string;
  fee?: number;
}

// Gift card payment
export interface GiftCardPayment {
  amount: number;
  cardNumber: string;
  remainingBalance?: number;
}

// Other payment methods
export interface OtherPayment {
  amount: number;
  method: string;
  reference?: string;
}

// ==================== Cash Management Operations ====================

// Cash drop operation (moving cash to safe)
export interface CashDrop {
  id?: string;
  shiftId: string;
  
  amount: number;
  denominations?: DenominationCount;
  
  droppedAt: any;
  droppedBy: string;
  
  safeId?: string;
  safeName?: string;
  
  witnessed?: boolean;
  witnessedBy?: string;
  
  notes?: string;
  envelopeNumber?: string;
}

// Pay in/out operations
export interface CashAdjustment {
  id?: string;
  shiftId: string;
  
  type: 'pay_in' | 'pay_out' | 'loan' | 'adjustment';
  amount: number;
  
  reason: string;
  reasonCategory?: string;
  
  authorizedBy: string;
  performedAt: any;
  
  accountId?: string; // Financial account affected
  receiptNumber?: string;
  attachments?: string[];
  
  notes?: string;
}

// ==================== Daily Register Summary ====================

// Daily summary for a register (across all shifts)
export interface DailyRegisterSummary {
  id?: string;
  companyId: string;
  branchId: string;
  registerId: string;
  
  date: Date;
  
  // Shift information
  shifts: ShiftSummary[];
  totalShifts: number;
  
  // Financial summary
  openingBalance: number;
  closingBalance: number;
  
  totalSales: number;
  totalRefunds: number;
  totalNet: number;
  
  // Payment method breakdown
  paymentMethodTotals: {
    cash: number;
    card: number;
    bankTransfer: number;
    digitalWallet: number;
    giftCard: number;
    loyalty: number;
    credit: number;
    other: number;
  };
  
  // Cash management
  totalCashDrops: number;
  totalPayIns: number;
  totalPayOuts: number;
  
  // Variance tracking
  totalExpected: number;
  totalActual: number;
  totalVariance: number;
  
  // Performance metrics
  transactionCount: number;
  averageTransactionValue: number;
  voidCount: number;
  voidValue: number;
  
  // Manager sign-off
  reviewedBy?: string;
  reviewedAt?: any;
  approvedBy?: string;
  approvedAt?: any;
  
  // Status
  status: 'open' | 'closed' | 'reviewed' | 'approved';
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

// Individual shift summary within daily report
export interface ShiftSummary {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  
  startTime: any;
  endTime?: any;
  duration?: number; // in minutes
  
  openingCash: number;
  closingCash: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  
  totalTransactions: number;
  totalSales: number;
  totalRefunds: number;
  
  status: 'active' | 'closed' | 'flagged';
  flagReason?: string;
}

// ==================== Register Configuration ====================

// Physical register/station configuration
export interface RegisterConfig {
  id?: string;
  companyId: string;
  branchId: string;
  
  registerNumber: string;
  registerName: string;
  
  // Location
  location?: string;
  department?: string;
  
  // Hardware
  hardwareId?: string;
  printerConnected?: boolean;
  scannerConnected?: boolean;
  
  // Settings
  requireOpeningCount: boolean;
  requireClosingCount: boolean;
  maxCashLimit?: number;
  cashDropThreshold?: number;
  
  // Access control
  allowedRoles?: string[];
  allowedEmployees?: string[];
  
  // Status
  isActive: boolean;
  maintenanceMode?: boolean;
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

// ==================== Audit & Compliance ====================

// Audit log for register operations
export interface RegisterAuditLog {
  id?: string;
  companyId: string;
  branchId: string;
  registerId: string;
  shiftId?: string;
  
  action: RegisterAction;
  performedBy: string;
  performedAt: any;
  
  details: any; // Action-specific data
  
  ipAddress?: string;
  deviceId?: string;
  
  flagged?: boolean;
  flagReason?: string;
}

// Possible register actions for audit
export type RegisterAction = 
  | 'shift_open'
  | 'shift_close'
  | 'shift_suspend'
  | 'shift_resume'
  | 'transaction_create'
  | 'transaction_void'
  | 'cash_drop'
  | 'pay_in'
  | 'pay_out'
  | 'count_update'
  | 'variance_noted'
  | 'manager_override'
  | 'report_generated'
  | 'emergency_close';

// ==================== Reports & Analytics ====================

// Register performance analytics
export interface RegisterAnalytics {
  registerId: string;
  period: 'daily' | 'weekly' | 'monthly';
  
  // Financial metrics
  totalRevenue: number;
  averageTransactionValue: number;
  transactionVolume: number;
  
  // Operational metrics
  averageShiftDuration: number;
  shiftsPerDay: number;
  
  // Accuracy metrics
  varianceFrequency: number;
  averageVariance: number;
  perfectCloseRate: number; // % of shifts with zero variance
  
  // Employee performance
  topPerformers: EmployeeMetric[];
  
  // Trends
  revenueGrowth: number;
  volumeGrowth: number;
}

// Employee performance metric
export interface EmployeeMetric {
  employeeId: string;
  employeeName: string;
  
  shiftsWorked: number;
  totalSales: number;
  averageSale: number;
  
  varianceCount: number;
  totalVariance: number;
  
  performanceScore?: number;
}

// ==================== Integration Interfaces ====================

// Interface for POS integration
export interface POSIntegration {
  registerSessionId: string;
  posTransactionId: string;
  syncedAt: any;
  syncStatus: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

// Interface for accounting system integration
export interface AccountingIntegration {
  shiftId: string;
  journalEntryId?: string;
  exportedAt?: any;
  exportedBy?: string;
  accountingSystem?: string;
  syncStatus: 'pending' | 'exported' | 'posted' | 'failed';
}

// ==================== Helper Types ====================

// Register status
export type RegisterStatus = 'available' | 'in_use' | 'closing' | 'maintenance' | 'offline';

// Shift status
export type ShiftStatus = 'active' | 'closing' | 'closed' | 'suspended' | 'abandoned';

// Variance category
export type VarianceCategory = 'over' | 'short' | 'exact';

// Payment method
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'gift_card' | 'loyalty' | 'credit' | 'other';