import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

// Phone number interface
export interface ClientPhone {
  number: string;
  type: 'mobile' | 'home' | 'work';
  isPrimary: boolean;
  isVerified?: boolean;
  canReceiveSMS?: boolean;
  notes?: string;
}

// Email interface
export interface ClientEmail {
  address: string;
  type: 'personal' | 'work';
  isPrimary: boolean;
  isVerified?: boolean;
  canReceiveEmails?: boolean;
  bounced?: boolean;
}

// Address interface
export interface ClientAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

// Social media interface
export interface ClientSocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
}

// Emergency contact interface
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// Client preferences interface
export interface ClientPreferences {
  // Service preferences
  preferredStaff?: string[]; // Staff IDs
  preferredDays?: string[]; // Day names
  preferredTimes?: string[]; // Time ranges
  roomPreferences?: string;
  
  // Communication preferences
  communicationLanguage?: string;
  communicationStyle?: 'silent' | 'minimal' | 'chatty' | 'very_social';
  
  // Lifestyle preferences
  favoriteDrinks?: string[]; // Coffee, Tea, Juice, etc.
  musicPreferences?: {
    genres?: string[]; // Pop, Classical, Jazz, etc.
    artists?: string[]; // Favorite artists
    volume?: 'quiet' | 'moderate' | 'loud';
    preference?: 'no_music' | 'background' | 'engaged';
  };
  
  // Comfort preferences
  temperaturePreference?: 'cold' | 'cool' | 'moderate' | 'warm' | 'hot';
  aromatherapy?: string[]; // Preferred scents
  refreshments?: {
    beverageTemperature?: 'ice_cold' | 'cold' | 'room_temp' | 'warm' | 'hot';
    snackPreferences?: string[];
  };
  
  // Special requests
  specialRequests?: string;
}

// Medical information interface
export interface ClientMedical {
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  notes?: string;
  lastUpdated?: Timestamp;
}

// Marketing preferences interface
export interface ClientMarketing {
  acceptsSMS: boolean;
  acceptsEmail: boolean;
  acceptsPromotions: boolean;
  acceptsPushNotifications?: boolean;
}

// Complete Client interface
export interface Client {
  id?: string;
  
  // Basic Information
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  gender?: 'male' | 'female' | 'other' | 'not_specified';
  dateOfBirth?: Timestamp;
  age?: number; // Auto-calculated
  photo?: string; // URL to photo in storage
  
  // Legacy name fields (for backward compatibility)
  name?: string; // Will be firstName + lastName
  nameAr?: string;
  
  // Contact Information
  phones?: ClientPhone[];
  emails?: ClientEmail[];
  address?: ClientAddress;
  socialMedia?: ClientSocialMedia;
  
  // Legacy contact fields (for backward compatibility)
  phone?: string; // Primary phone
  email?: string; // Primary email
  mobile?: string;
  
  // Additional Information
  nationality?: string;
  idNumber?: string; // National ID or Iqama number
  occupation?: string;
  employer?: string;
  referralSource?: string;
  referredBy?: string; // Client ID if referred by another client
  emergencyContact?: EmergencyContact;
  
  // Preferences
  preferences?: ClientPreferences;
  medical?: ClientMedical;
  marketing?: ClientMarketing;
  
  // Business Information
  website?: string;
  industry?: string;
  taxNumber?: string;
  
  // Status and Categories
  status: 'active' | 'inactive' | 'prospect';
  categoryId?: string; // Client category (VIP, Regular, etc.)
  tags?: string[];
  notes?: string;
  
  // Financial Information
  currentBalance?: number;
  creditLimit?: number;
  paymentTerms?: number; // Days
  
  // Statistics (calculated fields)
  totalVisits?: number;
  completedVisits?: number;
  cancelledVisits?: number;
  noShows?: number;
  noShowRate?: number; // Percentage
  lastVisit?: Timestamp;
  nextVisit?: Timestamp;
  averageVisitFrequency?: number; // Days between visits
  favoriteService?: string;
  favoriteStaff?: string;
  totalRevenue?: number;
  averageTicket?: number;
  lifetimeValue?: number;
  projectsCount?: number;
  lastContactDate?: Timestamp;
  
  // Loyalty
  loyaltyPoints?: number;
  loyaltyTier?: string;
  memberSince?: Timestamp;
  
  // System Information
  companyId: string;
  branchId?: string; // Branch assignment for multi-branch support
  createdBy?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  importedFrom?: string; // Source of import (Excel, API, etc.)
  
  // Portal Access
  portalEnabled?: boolean;
  portalLastAccess?: Timestamp;
  
  // Custom Fields (dynamic based on company settings)
  customFields?: Record<string, any>;
}

// Client Visit interface
export interface ClientVisit {
  id?: string;
  clientId: string;
  date: Timestamp;
  status: 'completed' | 'cancelled' | 'no-show' | 'rescheduled';
  services: {
    id: string;
    name: string;
    staffId: string;
    staffName: string;
    duration: number; // minutes
    price: number;
  }[];
  products?: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod?: string;
  notes?: string;
  feedback?: {
    rating: number;
    comment: string;
    date: Timestamp;
  };
  photos?: {
    before: string[];
    after: string[];
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Client Transaction interface
export interface ClientTransaction {
  id?: string;
  clientId: string;
  date: Timestamp;
  type: 'sale' | 'payment' | 'refund' | 'adjustment' | 'deposit';
  description: string;
  debit?: number;  // Amount owed by client
  credit?: number; // Amount paid by client
  balance: number; // Running balance after this transaction
  reference?: string; // Invoice or appointment ID
  staffId?: string;
  staffName?: string;
  paymentMethod?: string;
  notes?: string;
  voidedAt?: Timestamp;
  voidReason?: string;
  createdAt?: Timestamp;
  createdBy?: string;
}

// Client Package interface
export interface ClientPackage {
  id?: string;
  clientId: string;
  packageId: string;
  name: string;
  purchaseDate: Timestamp;
  expiryDate?: Timestamp;
  originalValue: number;
  remainingValue: number;
  sessions?: {
    total: number;
    used: number;
    remaining: number;
  };
  services: string[]; // Service IDs this package applies to
  transferable: boolean;
  status: 'active' | 'expired' | 'depleted';
  notes?: string;
  createdAt?: Timestamp;
}

// Client Membership interface
export interface ClientMembership {
  id?: string;
  clientId: string;
  membershipId: string;
  type: string;
  startDate: Timestamp;
  renewalDate: Timestamp;
  endDate?: Timestamp;
  fee: number;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  benefits: string[];
  discountPercentage?: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  autoRenew: boolean;
  paymentMethod?: string;
  cancelReason?: string;
  createdAt?: Timestamp;
}

// Client Communication interface
export interface ClientCommunication {
  id?: string;
  clientId: string;
  date: Timestamp;
  type: 'sms' | 'email' | 'phone' | 'whatsapp' | 'letter' | 'in-person';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  staffId?: string;
  staffName?: string;
  status: 'sent' | 'delivered' | 'read' | 'bounced' | 'failed';
  attachments?: string[];
  relatedTo?: string; // Appointment ID, campaign ID, etc.
  templateId?: string;
  campaignId?: string;
  createdAt?: Timestamp;
}

// Client Activity Log interface
export interface ClientActivity {
  id?: string;
  clientId: string;
  timestamp: Timestamp;
  event: string; // 'profile_created', 'profile_updated', 'appointment_booked', etc.
  details: Record<string, any>;
  performedBy: string; // User ID, 'system', or 'client'
  performedByName?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

// Client Category interface (extended from base category)
export interface ClientCategoryAssignment {
  clientId: string;
  categoryId: string;
  assignedAt: Timestamp;
  assignedBy: string;
  reason?: string;
  autoAssigned: boolean;
}

// Client Balance Summary
export interface ClientBalanceSummary {
  currentBalance: number;
  totalLifetimeSpend: number;
  averageTicket: number;
  lastPayment?: {
    date: Timestamp;
    amount: number;
    method: string;
  };
  outstandingInvoices: number;
  creditLimit?: number;
  packages?: number; // Active packages count
  memberships?: number; // Active memberships count
  loyaltyPoints?: number;
}

export interface ClientContact {
  id?: string;
  name: string;
  nameAr?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
  createdAt?: Timestamp;
}

// Advanced filter interface
export interface ClientsFilter {
  // Quick filters
  quickFilter?: 'all' | 'new_this_month' | 'vip' | 'birthday_this_month' | 'with_balance' | 'inactive' | 'recent_visits';
  
  // Basic filters
  status?: 'active' | 'inactive' | 'prospect' | 'all';
  searchTerm?: string;
  tags?: string[];
  
  // Personal info filters
  ageRange?: { min?: number; max?: number };
  gender?: ('male' | 'female' | 'other' | 'not_specified')[];
  birthday?: {
    month?: number;
    upcomingDays?: number;
  };
  location?: {
    city?: string;
    zipCode?: string;
    radius?: number;
  };
  
  // Visit history filters
  lastVisitDate?: { from?: Timestamp; to?: Timestamp };
  visitCount?: { min?: number; max?: number };
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'rarely';
  specificService?: string[];
  specificStaff?: string[];
  noShowRate?: { min?: number; max?: number };
  
  // Financial filters
  currentBalance?: { min?: number; max?: number };
  lifetimeSpend?: { min?: number; max?: number };
  averageTicket?: { min?: number; max?: number };
  hasPackages?: boolean;
  hasMembership?: boolean;
  hasDebt?: boolean;
  
  // Category filters
  includeCategories?: string[];
  excludeCategories?: string[];
  
  // Communication filters
  acceptsSMS?: boolean;
  acceptsEmail?: boolean;
  hasValidEmail?: boolean;
  hasValidPhone?: boolean;
  lastContactDate?: { from?: Timestamp; to?: Timestamp };
  
  // Source filters
  referralSource?: string[];
  referredByClient?: boolean;
  registrationDate?: { from?: Timestamp; to?: Timestamp };
  registrationMethod?: 'online' | 'in-person' | 'phone' | 'import';
  
  // Branch filters
  branchId?: string;
  
  // Sorting
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'totalRevenue' | 'lastVisit' | 'totalVisits' | 'balance';
  sortDirection?: 'asc' | 'desc';
  
  // Custom field filters (dynamic)
  customFields?: Record<string, any>;
}

// Saved filter interface
export interface SavedFilter {
  id?: string;
  name: string;
  description?: string;
  filters: ClientsFilter;
  createdBy: string;
  createdByName?: string;
  isPublic: boolean;
  usageCount?: number;
  lastUsed?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Duplicate detection interface
export interface DuplicateMatch {
  client: Client;
  matchScore: number; // 0-100
  matchedFields: string[];
  matchType: 'exact' | 'possible';
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
  suggestedAction: 'block' | 'warn' | 'allow';
}

// Import/Export interfaces
export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
  isRequired: boolean;
  transform?: (value: any) => any;
}

export interface ImportValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'error' | 'warning';
  action?: 'skip' | 'fix' | 'ignore';
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicates: number;
  newClients: number;
  preview: any[]; // First 10 rows
  errors: ImportValidationError[];
  mapping: ImportMapping[];
}

export interface ImportOptions {
  duplicateHandling: 'skip' | 'update' | 'create_new';
  categoryAssignment: 'from_file' | 'default_new' | 'none';
  sendWelcomeMessage: boolean;
  assignToStaff?: string;
  defaultValues?: Partial<Client>;
  validatePhones: boolean;
  validateEmails: boolean;
  normalizeNames: boolean;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  duration: number; // milliseconds
  detailedLog: {
    row: number;
    action: 'created' | 'updated' | 'skipped' | 'failed';
    clientId?: string;
    reason?: string;
  }[];
}

export interface ExportOptions {
  scope: 'all' | 'filtered' | 'selected';
  format: 'xlsx' | 'csv' | 'pdf';
  fields: string[]; // Field names to include
  includeVisitHistory?: boolean;
  includeBalance?: boolean;
  includeNotes?: boolean;
  includeCustomFields?: boolean;
  dateFormat?: string;
  timezone?: string;
}

// Bulk operation interfaces
export interface BulkOperation {
  type: 'update_category' | 'send_sms' | 'send_email' | 'add_tag' | 'remove_tag' | 'delete';
  clientIds: string[];
  data?: any;
  scheduled?: boolean;
  scheduledAt?: Timestamp;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: {
    clientId: string;
    error: string;
  }[];
}

export interface PaginationOptions {
  pageSize: number;
  lastDoc?: DocumentSnapshot;
}

class ClientService {
  private clientsCollection = 'clients';

  // Helper method to ensure backward compatibility
  private ensureBackwardCompatibility(clientData: Partial<Client>): Partial<Client> {
    const data = { ...clientData };
    
    // If using new structure, create legacy fields
    if (data.firstName || data.lastName) {
      data.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
    
    // If using legacy structure, create new fields
    if (data.name && !data.firstName && !data.lastName) {
      const parts = data.name.split(' ');
      data.firstName = parts[0] || '';
      data.lastName = parts.slice(1).join(' ');
    }
    
    // Handle primary phone/email
    if (data.phones && data.phones.length > 0) {
      const primary = data.phones.find(p => p.isPrimary) || data.phones[0];
      data.phone = primary.number;
    }
    
    if (data.emails && data.emails.length > 0) {
      const primary = data.emails.find(e => e.isPrimary) || data.emails[0];
      data.email = primary.address;
    }
    
    // Calculate age if DOB is provided
    if (data.dateOfBirth) {
      const dob = data.dateOfBirth instanceof Timestamp ? data.dateOfBirth.toDate() : data.dateOfBirth;
      const age = Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      data.age = age;
    }
    
    return data;
  }

  // Create a new client
  async createClient(clientData: Omit<Client, 'id'>, userId: string, branchId?: string): Promise<string> {
    try {
      // Ensure backward compatibility
      const compatibleData = this.ensureBackwardCompatibility(clientData);
      
      const newClient: any = {
        ...compatibleData,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: clientData.status || 'active',
        // Initialize statistics
        totalRevenue: 0,
        projectsCount: 0,
        totalVisits: 0,
        completedVisits: 0,
        cancelledVisits: 0,
        noShows: 0,
        noShowRate: 0,
        currentBalance: 0,
        loyaltyPoints: 0,
        // Set default marketing preferences if not provided
        marketing: clientData.marketing || {
          acceptsSMS: true,
          acceptsEmail: true,
          acceptsPromotions: true,
        },
        memberSince: serverTimestamp(),
      };

      // Only add branchId if it has a value
      const finalBranchId = branchId || clientData.branchId;
      if (finalBranchId) {
        newClient.branchId = finalBranchId;
      }

      // Clean up undefined values before saving
      const cleanedClient = Object.entries(newClient).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const docRef = await addDoc(collection(db, this.clientsCollection), cleanedClient);
      
      // Check for duplicates after creation
      this.checkForDuplicates(newClient).then(result => {
        if (result.hasDuplicates && result.suggestedAction === 'warn') {
          console.warn('Possible duplicate client created:', result.matches);
        }
      }).catch(console.error);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  // Get a single client by ID
  async getClient(clientId: string): Promise<Client | null> {
    try {
      const docRef = doc(db, this.clientsCollection, clientId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Client;
      }
      return null;
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  }

  // Update a client
  async updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
    try {
      const docRef = doc(db, this.clientsCollection, clientId);
      
      // Remove id from updates if present
      const { id, ...updateData } = updates;
      
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  // Delete a client
  async deleteClient(clientId: string): Promise<void> {
    try {
      const docRef = doc(db, this.clientsCollection, clientId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Get clients with filtering and pagination
  async getClients(
    companyId: string,
    filter?: ClientsFilter,
    pagination?: PaginationOptions,
    branchId?: string
  ): Promise<{ clients: Client[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const constraints: QueryConstraint[] = [
        where('companyId', '==', companyId)
      ];

      // Add branch filtering if branchId is provided
      if (branchId) {
        constraints.push(where('branchId', '==', branchId));
      }

      // Apply status filter
      if (filter?.status && filter.status !== 'all') {
        constraints.push(where('status', '==', filter.status));
      }

      // Apply sorting
      const sortField = filter?.sortBy || 'createdAt';
      const sortDirection = filter?.sortDirection || 'desc';
      constraints.push(orderBy(sortField, sortDirection));

      // Apply pagination
      if (pagination?.pageSize) {
        constraints.push(limit(pagination.pageSize));
      }

      if (pagination?.lastDoc) {
        constraints.push(startAfter(pagination.lastDoc));
      }

      const q = query(collection(db, this.clientsCollection), ...constraints);
      const querySnapshot = await getDocs(q);

      const clients: Client[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        clients.push({
          id: doc.id,
          ...data,
        } as Client);
      });

      // Apply client-side search filter
      let filteredClients = clients;
      if (filter?.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        filteredClients = clients.filter((client) => {
          // Search in name fields
          const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
          const legacyName = client.name?.toLowerCase() || '';
          const nameAr = client.nameAr?.toLowerCase() || '';
          
          // Search in contact fields
          const email = client.email?.toLowerCase() || '';
          const phone = client.phone || '';
          const mobile = client.mobile || '';
          
          // Check all phone numbers if available
          const hasPhoneMatch = client.phones?.some(p => 
            p.number.includes(filter.searchTerm!)
          ) || false;
          
          // Check all emails if available
          const hasEmailMatch = client.emails?.some(e => 
            e.address.toLowerCase().includes(searchLower)
          ) || false;
          
          return fullName.includes(searchLower) ||
                 legacyName.includes(searchLower) ||
                 nameAr.includes(searchLower) ||
                 email.includes(searchLower) ||
                 phone.includes(filter.searchTerm!) ||
                 mobile.includes(filter.searchTerm!) ||
                 hasPhoneMatch ||
                 hasEmailMatch;
        });
      }

      // Apply tags filter
      if (filter?.tags && filter.tags.length > 0) {
        filteredClients = filteredClients.filter((client) =>
          client.tags?.some((tag) => filter.tags?.includes(tag))
        );
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return {
        clients: filteredClients,
        lastDoc,
      };
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }

  // Get all clients for a company (no pagination)
  async getAllClients(companyId: string): Promise<Client[]> {
    try {
      const q = query(
        collection(db, this.clientsCollection),
        where('companyId', '==', companyId),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const clients: Client[] = [];

      querySnapshot.forEach((doc) => {
        clients.push({
          id: doc.id,
          ...doc.data(),
        } as Client);
      });

      return clients;
    } catch (error) {
      console.error('Error getting all clients:', error);
      throw error;
    }
  }

  // Subscribe to real-time client updates
  subscribeToClients(
    companyId: string,
    callback: (clients: Client[]) => void,
    filter?: ClientsFilter,
    branchId?: string
  ): Unsubscribe {
    const constraints: QueryConstraint[] = [
      where('companyId', '==', companyId)
    ];

    // Add branch filtering if branchId is provided
    if (branchId) {
      constraints.push(where('branchId', '==', branchId));
    }

    if (filter?.status && filter.status !== 'all') {
      constraints.push(where('status', '==', filter.status));
    }

    const sortField = filter?.sortBy || 'createdAt';
    const sortDirection = filter?.sortDirection || 'desc';
    constraints.push(orderBy(sortField, sortDirection));

    const q = query(collection(db, this.clientsCollection), ...constraints);

    return onSnapshot(q, (snapshot) => {
      const clients: Client[] = [];
      snapshot.forEach((doc) => {
        clients.push({
          id: doc.id,
          ...doc.data(),
        } as Client);
      });

      // Apply client-side filters
      let filteredClients = clients;
      if (filter?.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        filteredClients = clients.filter((client) => {
          const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
          const legacyName = client.name?.toLowerCase() || '';
          const email = client.email?.toLowerCase() || '';
          const phone = client.phone || '';
          
          return fullName.includes(searchLower) ||
                 legacyName.includes(searchLower) ||
                 email.includes(searchLower) ||
                 phone.includes(filter.searchTerm!);
        });
      }

      callback(filteredClients);
    });
  }

  // Get client contacts
  async getClientContacts(clientId: string): Promise<ClientContact[]> {
    try {
      const contactsRef = collection(db, this.clientsCollection, clientId, 'contacts');
      const q = query(contactsRef, orderBy('isPrimary', 'desc'), orderBy('name'));
      const querySnapshot = await getDocs(q);

      const contacts: ClientContact[] = [];
      querySnapshot.forEach((doc) => {
        contacts.push({
          id: doc.id,
          ...doc.data(),
        } as ClientContact);
      });

      return contacts;
    } catch (error) {
      console.error('Error getting client contacts:', error);
      throw error;
    }
  }

  // Add client contact
  async addClientContact(clientId: string, contact: Omit<ClientContact, 'id'>): Promise<string> {
    try {
      const contactsRef = collection(db, this.clientsCollection, clientId, 'contacts');
      const newContact = {
        ...contact,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(contactsRef, newContact);
      return docRef.id;
    } catch (error) {
      console.error('Error adding client contact:', error);
      throw error;
    }
  }

  // Update client stats (called after project/invoice changes)
  async updateClientStats(clientId: string, companyId: string): Promise<void> {
    try {
      // Get projects count
      const projectsQuery = query(
        collection(db, 'projects'),
        where('clientId', '==', clientId),
        where('companyId', '==', companyId)
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsCount = projectsSnapshot.size;

      // Get total revenue from paid invoices
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('clientId', '==', clientId),
        where('companyId', '==', companyId),
        where('status', '==', 'paid')
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      let totalRevenue = 0;
      invoicesSnapshot.forEach((doc) => {
        const invoice = doc.data();
        totalRevenue += invoice.amount || 0;
      });

      // Update client document
      await this.updateClient(clientId, {
        projectsCount,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error updating client stats:', error);
      // Don't throw - this is a background operation
    }
  }

  // Get client suggestions for autocomplete
  async getClientSuggestions(companyId: string, searchTerm: string): Promise<Client[]> {
    try {
      const clients = await this.getAllClients(companyId);
      
      if (!searchTerm) return clients.slice(0, 10);

      const searchLower = searchTerm.toLowerCase();
      return clients
        .filter((client) => {
          const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
          const legacyName = client.name?.toLowerCase() || '';
          const email = client.email?.toLowerCase() || '';
          const phone = client.phone || '';
          
          return fullName.includes(searchLower) ||
                 legacyName.includes(searchLower) ||
                 email.includes(searchLower) ||
                 phone.includes(searchTerm);
        })
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting client suggestions:', error);
      return [];
    }
  }

  // Check for duplicate clients
  async checkForDuplicates(clientData: Partial<Client>): Promise<DuplicateCheckResult> {
    try {
      const { companyId } = clientData;
      if (!companyId) {
        return { hasDuplicates: false, matches: [], suggestedAction: 'allow' };
      }

      const matches: DuplicateMatch[] = [];
      
      // Get all clients for comparison
      const allClients = await this.getAllClients(companyId);
      
      for (const existingClient of allClients) {
        // Skip if it's the same client (during update)
        if (clientData.id && clientData.id === existingClient.id) continue;
        
        let matchScore = 0;
        const matchedFields: string[] = [];
        
        // Check phone match (exact)
        if (clientData.phone && existingClient.phone) {
          const normalizedNew = this.normalizePhone(clientData.phone);
          const normalizedExisting = this.normalizePhone(existingClient.phone);
          if (normalizedNew === normalizedExisting) {
            matchScore += 40;
            matchedFields.push('phone');
          }
        }
        
        // Check email match (exact, case-insensitive)
        if (clientData.email && existingClient.email) {
          if (clientData.email.toLowerCase() === existingClient.email.toLowerCase()) {
            matchScore += 30;
            matchedFields.push('email');
          }
        }
        
        // Check name match (fuzzy)
        const newName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
        const existingName = `${existingClient.firstName || ''} ${existingClient.lastName || ''}`.trim();
        if (newName && existingName) {
          const nameSimilarity = this.calculateStringSimilarity(newName, existingName);
          if (nameSimilarity > 0.8) {
            matchScore += 20;
            matchedFields.push('name');
          }
        }
        
        // Check DOB match
        if (clientData.dateOfBirth && existingClient.dateOfBirth) {
          const newDOB = clientData.dateOfBirth instanceof Timestamp ? 
            clientData.dateOfBirth.toDate() : clientData.dateOfBirth;
          const existingDOB = existingClient.dateOfBirth instanceof Timestamp ? 
            existingClient.dateOfBirth.toDate() : existingClient.dateOfBirth;
          
          if (newDOB.getTime() === existingDOB.getTime()) {
            matchScore += 10;
            matchedFields.push('dateOfBirth');
          }
        }
        
        // If score is high enough, it's a match
        if (matchScore >= 40) {
          matches.push({
            client: existingClient,
            matchScore,
            matchedFields,
            matchType: matchScore >= 70 ? 'exact' : 'possible'
          });
        }
      }
      
      // Determine suggested action
      let suggestedAction: 'block' | 'warn' | 'allow' = 'allow';
      if (matches.some(m => m.matchType === 'exact')) {
        suggestedAction = 'block';
      } else if (matches.length > 0) {
        suggestedAction = 'warn';
      }
      
      return {
        hasDuplicates: matches.length > 0,
        matches,
        suggestedAction
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { hasDuplicates: false, matches: [], suggestedAction: 'allow' };
    }
  }

  // Normalize phone number for comparison
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }

  // Calculate string similarity (Levenshtein distance)
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Get client balance summary
  async getClientBalanceSummary(clientId: string): Promise<ClientBalanceSummary> {
    try {
      // This will be implemented when we create the balance service
      // For now, return a placeholder
      return {
        currentBalance: 0,
        totalLifetimeSpend: 0,
        averageTicket: 0,
        outstandingInvoices: 0,
      };
    } catch (error) {
      console.error('Error getting client balance summary:', error);
      throw error;
    }
  }

  // Apply advanced filters
  async getClientsWithAdvancedFilters(
    companyId: string,
    filter: ClientsFilter,
    pagination?: PaginationOptions,
    branchId?: string
  ): Promise<{ clients: Client[]; lastDoc: DocumentSnapshot | null; totalCount: number }> {
    try {
      // Start with basic filtering
      const result = await this.getClients(companyId, filter, pagination, branchId);
      let { clients } = result;
      
      // Apply additional client-side filters that can't be done in Firestore
      
      // Age range filter
      if (filter.ageRange?.min !== undefined || filter.ageRange?.max !== undefined) {
        clients = clients.filter(client => {
          if (!client.age) return false;
          if (filter.ageRange!.min !== undefined && client.age < filter.ageRange!.min) return false;
          if (filter.ageRange!.max !== undefined && client.age > filter.ageRange!.max) return false;
          return true;
        });
      }
      
      // Gender filter
      if (filter.gender && filter.gender.length > 0) {
        clients = clients.filter(client => 
          filter.gender!.includes(client.gender || 'not_specified')
        );
      }
      
      // Birthday filter
      if (filter.birthday) {
        const now = new Date();
        clients = clients.filter(client => {
          if (!client.dateOfBirth) return false;
          
          const dob = client.dateOfBirth instanceof Timestamp ? 
            client.dateOfBirth.toDate() : client.dateOfBirth;
          
          if (filter.birthday!.month !== undefined) {
            return dob.getMonth() === filter.birthday!.month - 1;
          }
          
          if (filter.birthday!.upcomingDays !== undefined) {
            const dayOfYear = Math.floor((dob.getTime() - new Date(dob.getFullYear(), 0, 0).getTime()) / 86400000);
            const todayDayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
            const daysUntil = (dayOfYear - todayDayOfYear + 365) % 365;
            return daysUntil <= filter.birthday!.upcomingDays;
          }
          
          return true;
        });
      }
      
      // Communication preferences filter
      if (filter.acceptsSMS !== undefined) {
        clients = clients.filter(client => 
          client.marketing?.acceptsSMS === filter.acceptsSMS
        );
      }
      
      if (filter.acceptsEmail !== undefined) {
        clients = clients.filter(client => 
          client.marketing?.acceptsEmail === filter.acceptsEmail
        );
      }
      
      // Has valid email/phone filters
      if (filter.hasValidEmail !== undefined) {
        clients = clients.filter(client => {
          const hasEmail = !!client.email || (client.emails && client.emails.length > 0);
          return hasEmail === filter.hasValidEmail;
        });
      }
      
      if (filter.hasValidPhone !== undefined) {
        clients = clients.filter(client => {
          const hasPhone = !!client.phone || (client.phones && client.phones.length > 0);
          return hasPhone === filter.hasValidPhone;
        });
      }
      
      // Category filters
      if (filter.includeCategories && filter.includeCategories.length > 0) {
        clients = clients.filter(client => 
          client.categoryId && filter.includeCategories!.includes(client.categoryId)
        );
      }
      
      if (filter.excludeCategories && filter.excludeCategories.length > 0) {
        clients = clients.filter(client => 
          !client.categoryId || !filter.excludeCategories!.includes(client.categoryId)
        );
      }
      
      // Quick filters
      if (filter.quickFilter) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        switch (filter.quickFilter) {
          case 'new_this_month':
            clients = clients.filter(client => {
              if (!client.createdAt) return false;
              const createdDate = client.createdAt instanceof Timestamp ? 
                client.createdAt.toDate() : client.createdAt;
              return createdDate >= monthStart;
            });
            break;
            
          case 'vip':
            // This will be implemented with category rules
            clients = clients.filter(client => client.categoryId === 'vip');
            break;
            
          case 'birthday_this_month':
            clients = clients.filter(client => {
              if (!client.dateOfBirth) return false;
              const dob = client.dateOfBirth instanceof Timestamp ? 
                client.dateOfBirth.toDate() : client.dateOfBirth;
              return dob.getMonth() === now.getMonth();
            });
            break;
            
          case 'with_balance':
            clients = clients.filter(client => 
              client.currentBalance !== undefined && client.currentBalance !== 0
            );
            break;
            
          case 'inactive':
            clients = clients.filter(client => client.status === 'inactive');
            break;
            
          case 'recent_visits':
            // This will be implemented when we have visit tracking
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            clients = clients.filter(client => {
              if (!client.lastVisit) return false;
              const lastVisitDate = client.lastVisit instanceof Timestamp ? 
                client.lastVisit.toDate() : client.lastVisit;
              return lastVisitDate >= thirtyDaysAgo;
            });
            break;
        }
      }
      
      return {
        clients,
        lastDoc: result.lastDoc,
        totalCount: clients.length
      };
    } catch (error) {
      console.error('Error applying advanced filters:', error);
      throw error;
    }
  }
}

export const clientService = new ClientService();