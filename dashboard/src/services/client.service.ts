// Modern client service that uses API instead of Firebase
// This file maintains backward compatibility while using the new API service underneath

import { clientApiService } from './api/client.api.service';
import type {
  CreateClientRequest,
  UpdateClientRequest,
  GetClientsParams,
  ClientApiResponse,
  ClientsListApiResponse
} from './api/client.api.service';

// Re-export types for backward compatibility
export type {
  Client,
  ClientPhone,
  ClientEmail,
  ClientAddress,
  ClientSocialMedia,
  EmergencyContact,
  ClientPreferences,
  ClientMedical,
  ClientMarketing,
  ClientContact,
  ClientsFilter,
  DuplicateCheckResult,
  DuplicateMatch,
  ClientBalanceSummary,
  PaginationOptions,
  ClientVisit,
  ClientTransaction,
  ClientPackage,
  ClientMembership,
  ClientCommunication,
  ClientActivity,
  ClientCategoryAssignment,
  SavedFilter,
  ImportMapping,
  ImportValidationError,
  ImportPreview,
  ImportOptions,
  ImportResult,
  ExportOptions,
  BulkOperation,
  BulkOperationResult
} from './api/client.api.service';

// Define legacy interfaces that may be used by existing code
export interface Client {
  id?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  gender?: 'male' | 'female' | 'other' | 'not_specified';
  dateOfBirth?: Date;
  age?: number;
  photo?: string;
  name?: string; // Legacy field
  nameAr?: string;
  phones?: Array<{
    number: string;
    type: 'mobile' | 'home' | 'work';
    isPrimary: boolean;
    isVerified?: boolean;
    canReceiveSMS?: boolean;
    notes?: string;
  }>;
  emails?: Array<{
    address: string;
    type: 'personal' | 'work';
    isPrimary: boolean;
    isVerified?: boolean;
    canReceiveEmails?: boolean;
    bounced?: boolean;
  }>;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    notes?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    whatsapp?: string;
  };
  phone?: string; // Legacy field
  email?: string; // Legacy field
  mobile?: string; // Legacy field
  nationality?: string;
  idNumber?: string;
  occupation?: string;
  employer?: string;
  referralSource?: string;
  referredBy?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences?: any;
  medical?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    notes?: string;
    lastUpdated?: Date;
  };
  marketing?: {
    acceptsSMS: boolean;
    acceptsEmail: boolean;
    acceptsPromotions: boolean;
    acceptsPushNotifications?: boolean;
  };
  website?: string;
  industry?: string;
  taxNumber?: string;
  status: 'active' | 'inactive' | 'prospect';
  categoryId?: string;
  tags?: string[];
  notes?: string;
  currentBalance?: number;
  creditLimit?: number;
  paymentTerms?: number;
  totalVisits?: number;
  completedVisits?: number;
  cancelledVisits?: number;
  noShows?: number;
  noShowRate?: number;
  lastVisit?: Date;
  nextVisit?: Date;
  averageVisitFrequency?: number;
  favoriteService?: string;
  favoriteStaff?: string;
  totalRevenue?: number;
  averageTicket?: number;
  lifetimeValue?: number;
  projectsCount?: number;
  lastContactDate?: Date;
  loyaltyPoints?: number;
  loyaltyTier?: string;
  memberSince?: Date;
  companyId: string;
  branchId?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  importedFrom?: string;
  portalEnabled?: boolean;
  portalLastAccess?: Date;
  customFields?: Record<string, any>;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matches: Array<{
    client: Client;
    matchScore: number;
    matchedFields: string[];
    matchType: 'exact' | 'possible';
  }>;
  suggestedAction: 'block' | 'warn' | 'allow';
}

export interface ClientsFilter {
  quickFilter?: 'all' | 'new_this_month' | 'vip' | 'birthday_this_month' | 'with_balance' | 'inactive' | 'recent_visits';
  status?: 'active' | 'inactive' | 'prospect' | 'all';
  searchTerm?: string;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'totalRevenue' | 'lastVisit' | 'totalVisits' | 'balance';
  sortDirection?: 'asc' | 'desc';
}

export interface PaginationOptions {
  pageSize: number;
  lastDoc?: any; // For backward compatibility, though not used with API
}

/**
 * Client service adapter that provides backward compatibility
 * while using the new API service underneath
 */
class ClientService {
  /**
   * Transform API client data to legacy format
   */
  private transformFromApi(apiClient: ClientApiResponse['data']): Client {
    return {
      ...apiClient,
      // Transform date strings back to Date objects for backward compatibility
      dateOfBirth: apiClient.dateOfBirth ? new Date(apiClient.dateOfBirth) : undefined,
      createdAt: apiClient.createdAt ? new Date(apiClient.createdAt) : undefined,
      updatedAt: apiClient.updatedAt ? new Date(apiClient.updatedAt) : undefined,
      lastVisit: apiClient.lastVisit ? new Date(apiClient.lastVisit) : undefined,
      nextVisit: apiClient.nextVisit ? new Date(apiClient.nextVisit) : undefined,
      lastContactDate: apiClient.lastContactDate ? new Date(apiClient.lastContactDate) : undefined,
      memberSince: apiClient.memberSince ? new Date(apiClient.memberSince) : undefined,
      portalLastAccess: apiClient.portalLastAccess ? new Date(apiClient.portalLastAccess) : undefined,
      medical: apiClient.medical ? {
        ...apiClient.medical,
        lastUpdated: apiClient.medical.lastUpdated ? new Date(apiClient.medical.lastUpdated) : undefined
      } : undefined
    };
  }

  /**
   * Transform legacy client data to API format
   */
  private transformToApi(client: Partial<Client>): Partial<CreateClientRequest> {
    return {
      ...client,
      // Transform Date objects to ISO strings for API
      dateOfBirth: client.dateOfBirth ? client.dateOfBirth.toISOString() : undefined,
      medical: client.medical ? {
        ...client.medical,
        lastUpdated: client.medical.lastUpdated ? client.medical.lastUpdated.toISOString() : undefined
      } : undefined
    };
  }

  /**
   * Create a new client
   */
  async createClient(
    clientData: Omit<Client, 'id'>, 
    userId: string, 
    branchId?: string
  ): Promise<string> {
    try {
      const apiData = this.transformToApi(clientData) as CreateClientRequest;
      if (branchId) {
        apiData.branchId = branchId;
      }
      
      const response = await clientApiService.createClient(apiData);
      
      if (response.success && response.data) {
        return response.data.id;
      }
      
      throw new Error(response.error || 'Failed to create client');
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<Client | null> {
    try {
      const response = await clientApiService.getClient(clientId);
      
      if (response.success && response.data) {
        return this.transformFromApi(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  }

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
    try {
      const apiUpdates = this.transformToApi(updates);
      const response = await clientApiService.updateClient(clientId, apiUpdates);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<void> {
    try {
      const response = await clientApiService.deleteClient(clientId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Get clients with filtering and pagination
   */
  async getClients(
    companyId: string,
    filter?: ClientsFilter,
    pagination?: PaginationOptions,
    branchId?: string
  ): Promise<{ clients: Client[]; lastDoc: any | null }> {
    try {
      const params: GetClientsParams = {
        page: 1, // API uses 1-based pagination
        limit: pagination?.pageSize || 10,
        search: filter?.searchTerm,
        status: filter?.status === 'all' ? undefined : filter?.status,
        sortBy: filter?.sortBy,
        sortDirection: filter?.sortDirection,
        branchId: branchId,
        quickFilter: filter?.quickFilter === 'all' ? undefined : filter?.quickFilter,
      };

      const response = await clientApiService.getClients(params);
      
      if (response.success && response.data) {
        const clients = response.data.map(client => this.transformFromApi(client));
        
        return {
          clients,
          lastDoc: null // Not used with API pagination
        };
      }
      
      throw new Error(response.error || 'Failed to get clients');
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }

  /**
   * Get all clients for a company (no pagination)
   */
  async getAllClients(companyId: string): Promise<Client[]> {
    try {
      const params: GetClientsParams = {
        page: 1,
        limit: 1000, // Large limit to get all clients
      };

      const response = await clientApiService.getClients(params);
      
      if (response.success && response.data) {
        return response.data.map(client => this.transformFromApi(client));
      }
      
      throw new Error(response.error || 'Failed to get all clients');
    } catch (error) {
      console.error('Error getting all clients:', error);
      throw error;
    }
  }

  /**
   * Get client suggestions for autocomplete
   */
  async getClientSuggestions(companyId: string, searchTerm: string): Promise<Client[]> {
    try {
      const response = await clientApiService.getClientSuggestions(searchTerm);
      
      if (response.success && response.data) {
        // Transform suggestion data to full client format for backward compatibility
        return response.data.map(suggestion => ({
          id: suggestion.id,
          firstName: suggestion.name?.split(' ')[0] || '',
          lastName: suggestion.name?.split(' ').slice(1).join(' ') || '',
          name: suggestion.name || '',
          email: suggestion.email,
          phone: suggestion.phone,
          totalRevenue: suggestion.totalRevenue,
          lastVisit: suggestion.lastVisit ? new Date(suggestion.lastVisit) : undefined,
          status: 'active' as const,
          companyId: companyId,
          marketing: {
            acceptsSMS: true,
            acceptsEmail: true,
            acceptsPromotions: true
          }
        } as Client));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting client suggestions:', error);
      return [];
    }
  }

  /**
   * Check for duplicate clients
   */
  async checkForDuplicates(clientData: Partial<Client>): Promise<DuplicateCheckResult> {
    try {
      const apiData = this.transformToApi(clientData);
      const response = await clientApiService.checkDuplicates(apiData);
      
      if (response.success && response.data) {
        return {
          hasDuplicates: response.data.hasDuplicates,
          matches: response.data.matches.map(match => ({
            client: this.transformFromApi(match.client),
            matchScore: match.matchScore,
            matchedFields: match.matchedFields,
            matchType: match.matchType
          })),
          suggestedAction: response.data.suggestedAction
        };
      }
      
      return { hasDuplicates: false, matches: [], suggestedAction: 'allow' };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { hasDuplicates: false, matches: [], suggestedAction: 'allow' };
    }
  }

  /**
   * Update client stats (called after project/invoice changes)
   */
  async updateClientStats(clientId: string, companyId: string): Promise<void> {
    try {
      const response = await clientApiService.updateClientStats(clientId);
      
      if (!response.success) {
        console.warn('Failed to update client stats:', response.error);
        // Don't throw - this is a background operation
      }
    } catch (error) {
      console.error('Error updating client stats:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get client contacts
   */
  async getClientContacts(clientId: string): Promise<any[]> {
    try {
      const response = await clientApiService.getClientContacts(clientId);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting client contacts:', error);
      throw error;
    }
  }

  /**
   * Add client contact
   */
  async addClientContact(clientId: string, contact: any): Promise<string> {
    try {
      const response = await clientApiService.addClientContact(clientId, contact);
      
      if (response.success && response.data) {
        return response.data.id;
      }
      
      throw new Error(response.error || 'Failed to add client contact');
    } catch (error) {
      console.error('Error adding client contact:', error);
      throw error;
    }
  }

  /**
   * Get client balance summary
   */
  async getClientBalanceSummary(clientId: string): Promise<any> {
    try {
      const response = await clientApiService.getClientBalanceSummary(clientId);
      
      if (response.success && response.data) {
        return response.data;
      }
      
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

  /**
   * Subscribe to real-time client updates
   * Note: This is not implemented with REST API, returns unsubscribe function that does nothing
   */
  subscribeToClients(
    companyId: string,
    callback: (clients: Client[]) => void,
    filter?: ClientsFilter,
    branchId?: string
  ): () => void {
    console.warn('Real-time subscriptions are not supported with REST API. Consider implementing polling or WebSocket support.');
    
    // Return a no-op unsubscribe function for backward compatibility
    return () => {};
  }

  /**
   * Get clients with advanced filters
   */
  async getClientsWithAdvancedFilters(
    companyId: string,
    filter: ClientsFilter,
    pagination?: PaginationOptions,
    branchId?: string
  ): Promise<{ clients: Client[]; lastDoc: any | null; totalCount: number }> {
    try {
      const result = await this.getClients(companyId, filter, pagination, branchId);
      return {
        clients: result.clients,
        lastDoc: result.lastDoc,
        totalCount: result.clients.length
      };
    } catch (error) {
      console.error('Error getting clients with advanced filters:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const clientService = new ClientService();

// Default export
export default clientService;