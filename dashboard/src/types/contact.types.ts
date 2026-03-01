// Contact types enum
export enum ContactType {
  CLIENT = 'client',
  VENDOR = 'vendor',
  EMPLOYEE = 'employee',
  SUPPLIER = 'supplier',
  PARTNER = 'partner',
  CONTRACTOR = 'contractor',
  OTHER = 'other'
}

// Contact status
export type ContactStatus = 'active' | 'inactive' | 'blocked' | 'archived';

// Phone type
export interface ContactPhone {
  number: string;
  type: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
  isVerified?: boolean;
  countryCode?: string;
  extension?: string;
}

// Email type
export interface ContactEmail {
  email: string;
  type: 'personal' | 'work' | 'other';
  isPrimary: boolean;
  isVerified?: boolean;
}

// Address type
export interface ContactAddress {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  type: 'home' | 'work' | 'billing' | 'shipping' | 'other';
  isPrimary: boolean;
}

// Social media
export interface ContactSocialMedia {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'whatsapp' | 'other';
  handle: string;
  url?: string;
}

// Bank account for vendors/partners
export interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  currency: string;
}

// Contact person for organizations
export interface ContactPerson {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

// Financial info
export interface ContactFinancialInfo {
  creditLimit?: number;
  creditDays?: number;
  currentBalance?: number;
  totalTransactions?: number;
  totalAmount?: number;
  paymentTerms?: string;
  defaultPaymentMethod?: string;
  bankAccounts?: BankAccount[];
}

// Main Contact interface
export interface Contact {
  // System fields
  id?: string;
  companyId: string;
  branchIds?: string[]; // Multi-branch support
  
  // Identity
  type: ContactType;
  code?: string; // Auto-generated unique code
  status: ContactStatus;
  
  // Basic Info
  firstName?: string;
  lastName?: string;
  displayName: string; // Required display name
  nameAr?: string; // Arabic name
  companyName?: string; // For vendors/partners
  companyNameAr?: string;
  
  // Contact Info
  phones: ContactPhone[];
  emails: ContactEmail[];
  addresses: ContactAddress[];
  socialMedia?: ContactSocialMedia[];
  website?: string;
  
  // Business Info
  taxNumber?: string;
  commercialRegister?: string;
  industry?: string;
  businessType?: string;
  
  // Additional Info
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: any;
  nationality?: string;
  language?: string;
  
  // For organizations
  contactPersons?: ContactPerson[];
  
  // Financial
  financial?: ContactFinancialInfo;
  
  // Employment (for employees)
  positionId?: string;
  employmentDate?: any;
  departmentId?: string;
  managerId?: string;
  
  // Categorization
  categoryId?: string;
  tags: string[];
  
  // Notes
  notes?: string;
  internalNotes?: string;
  
  // Related entity IDs (for migration/sync)
  relatedEntities?: {
    clientId?: string;
    staffId?: string;
    vendorId?: string;
    userId?: string;
  };
  
  // Custom fields
  customFields?: Record<string, any>;
  
  // System
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  updatedBy?: string;
  
  // Stats
  lastInteractionDate?: any;
  totalInteractions?: number;
  rating?: number;
}

// Contact category
export interface ContactCategory {
  id?: string;
  companyId: string;
  type: ContactType;
  name: string;
  nameAr: string;
  description?: string;
  color: string;
  icon?: string;
  isActive: boolean;
  contactCount?: number;
  createdAt: any;
  updatedAt: any;
}

// Contact filter options
export interface ContactFilters {
  search?: string;
  types?: ContactType[];
  status?: ContactStatus[];
  categoryIds?: string[];
  tags?: string[];
  branchIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Contact import/export
export interface ContactImportData {
  displayName: string;
  type: ContactType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
  tags?: string;
}

// Contact merge request
export interface ContactMergeRequest {
  primaryContactId: string;
  secondaryContactIds: string[];
  fieldsToKeep?: Record<string, 'primary' | 'secondary'>;
}

// Contact activity
export interface ContactActivity {
  id?: string;
  contactId: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'appointment' | 'invoice' | 'payment' | 'other';
  description: string;
  date: any;
  userId: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

// Quick create contact (minimal fields)
export interface QuickCreateContact {
  displayName: string;
  type: ContactType;
  phone?: string;
  email?: string;
  companyId: string;
}