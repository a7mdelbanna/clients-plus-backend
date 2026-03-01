// Invoice status types
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

// Invoice item interface
export interface InvoiceItem {
  id?: string;
  type: 'service' | 'product' | 'custom';
  serviceId?: string;
  productId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  vatAmount?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  total: number;
  totalWithVat: number;
}

// Invoice payment record
export interface InvoicePayment {
  id?: string;
  date: any;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'check' | 'other';
  digitalWalletType?: string;
  reference?: string;
  notes?: string;
  recordedBy: string;
  recordedAt: any;
}

// Invoice interface
export interface Invoice {
  id?: string;
  companyId: string;
  branchId?: string;
  
  // Invoice details
  invoiceNumber: string;
  invoiceDate: any;
  dueDate: any;
  
  // Client information
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTaxNumber?: string;
  
  // Business information (denormalized for PDF generation)
  businessName: string;
  businessNameAr?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessTaxNumber?: string;
  businessLogo?: string;
  
  // Items
  items: InvoiceItem[];
  
  // Totals
  subtotal: number;
  vatAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  
  // Status
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  
  // Payment details
  payments: InvoicePayment[];
  paymentTerms?: string;
  paymentTermsAr?: string;
  
  // Notes
  notes?: string;
  notesAr?: string;
  termsAndConditions?: string;
  termsAndConditionsAr?: string;
  
  // Related documents
  appointmentId?: string;
  relatedInvoices?: string[]; // For credit notes, refunds
  parentInvoiceId?: string; // For credit notes
  
  // Tracking
  sentAt?: any;
  viewedAt?: any;
  lastReminderAt?: any;
  reminderCount?: number;
  
  // Metadata
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
  
  // Additional fields
  currency?: string; // Default: EGP
  exchangeRate?: number; // For foreign currency
  isRecurring?: boolean;
  recurringSchedule?: RecurringSchedule;
}

// Recurring invoice schedule
export interface RecurringSchedule {
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number; // e.g., every 2 months
  startDate: any;
  endDate?: any;
  nextInvoiceDate: any;
  lastGeneratedDate?: any;
  occurrences?: number; // Total number of invoices to generate
  generatedCount?: number;
  isActive: boolean;
}

// Invoice template for recurring invoices
export interface InvoiceTemplate {
  id?: string;
  companyId: string;
  name: string;
  nameAr?: string;
  description?: string;
  
  // Default values
  defaultItems: InvoiceItem[];
  defaultPaymentTerms?: string;
  defaultPaymentTermsAr?: string;
  defaultNotes?: string;
  defaultNotesAr?: string;
  defaultTermsAndConditions?: string;
  defaultTermsAndConditionsAr?: string;
  
  // Settings
  isActive: boolean;
  usageCount?: number;
  lastUsedAt?: any;
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

// Invoice settings
export interface InvoiceSettings {
  companyId: string;
  
  // Number format
  invoicePrefix: string;
  nextInvoiceNumber: number;
  invoiceNumberFormat?: string; // e.g., "INV-{YYYY}-{0000}"
  
  // Default values
  defaultPaymentTerms?: string;
  defaultPaymentTermsAr?: string;
  defaultDueDays?: number; // Days after invoice date
  defaultNotes?: string;
  defaultNotesAr?: string;
  defaultTermsAndConditions?: string;
  defaultTermsAndConditionsAr?: string;
  
  // Tax settings
  defaultVatRate?: number;
  showVatBreakdown?: boolean;
  
  // Email settings
  autoSendInvoice?: boolean;
  sendReminders?: boolean;
  reminderDays?: number[]; // e.g., [3, 7, 14] days before/after due date
  
  // Branding
  showLogo?: boolean;
  logoPosition?: 'left' | 'center' | 'right';
  primaryColor?: string;
  
  // PDF settings
  paperSize?: 'A4' | 'Letter';
  showWatermark?: boolean;
  watermarkText?: string;
  
  // Metadata
  updatedAt?: any;
  updatedBy?: string;
}

// Invoice filters for queries
export interface InvoiceFilters {
  status?: InvoiceStatus | InvoiceStatus[];
  paymentStatus?: PaymentStatus;
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  isOverdue?: boolean;
  branchId?: string;
}

// Invoice summary for dashboard
export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  overdueAmount: number;
  
  // By status
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
  
  // By period
  currentMonthTotal: number;
  lastMonthTotal: number;
  growthPercentage: number;
  
  // Top clients
  topClients: {
    clientId: string;
    clientName: string;
    totalAmount: number;
    invoiceCount: number;
  }[];
}