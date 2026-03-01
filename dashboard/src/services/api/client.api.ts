import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// Import types from Firebase client service for compatibility
import type { 
  Client,
  ClientsFilter,
  PaginationOptions,
  DuplicateCheckResult,
  ClientContact,
  ClientBalanceSummary,
  BulkOperationResult,
  SavedFilter,
  ImportPreview,
  ImportOptions,
  ImportResult,
  ExportOptions
} from '../client.service';

// Express API specific interfaces
export interface ExpressClient {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  phones?: ClientPhone[];
  emails?: ClientEmail[];
  address?: ClientAddress;
  notes?: string;
  tags?: string[];
  companyId: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  // Statistics
  totalRevenue?: number;
  projectsCount?: number;
  totalVisits?: number;
  completedVisits?: number;
  cancelledVisits?: number;
  noShows?: number;
  noShowRate?: number;
  currentBalance?: number;
  loyaltyPoints?: number;
  lastVisit?: string;
  nextVisit?: string;
  averageVisitFrequency?: number;
  favoriteService?: string;
  favoriteStaff?: string;
  averageTicket?: number;
  lifetimeValue?: number;
  lastContactDate?: string;
}

export interface ClientPhone {
  number: string;
  type: 'mobile' | 'home' | 'work';
  isPrimary: boolean;
  isVerified?: boolean;
  canReceiveSMS?: boolean;
  notes?: string;
}

export interface ClientEmail {
  address: string;
  type: 'personal' | 'work';
  isPrimary: boolean;
  isVerified?: boolean;
  canReceiveEmails?: boolean;
  bounced?: boolean;
}

export interface ClientAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

export interface ClientsResponse {
  data: ExpressClient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ClientStatsResponse {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  archived: number;
  newThisMonth: number;
  totalRevenue: number;
  averageTicket: number;
  topCategories: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  recentActivity: number;
  birthdaysThisMonth: number;
}

export interface BulkUpdateRequest {
  clientIds: string[];
  updates: Partial<ExpressClient>;
}

export interface ExpressPaginationOptions {
  page?: number;
  limit?: number;
}

export interface ExpressClientsFilter {
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'all';
  search?: string;
  tags?: string[];
  gender?: ('MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY')[];
  quickFilter?: 'all' | 'new_this_month' | 'vip' | 'birthday_this_month' | 'with_balance' | 'inactive' | 'recent_visits';
  minAge?: number;
  maxAge?: number;
  birthdayMonth?: number;
  upcomingBirthdays?: number;
  acceptsSMS?: boolean;
  acceptsEmail?: boolean;
  hasValidEmail?: boolean;
  hasValidPhone?: boolean;
  branchId?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'totalRevenue' | 'lastVisit' | 'totalVisits' | 'balance';
  sortDirection?: 'asc' | 'desc';
  registrationFrom?: string;
  registrationTo?: string;
  minBalance?: number;
  maxBalance?: number;
  minLifetimeSpend?: number;
  maxLifetimeSpend?: number;
}

/**
 * Client API Service
 * Handles all client-related API calls to Express backend
 */
class ClientApiService {
  private readonly endpoint = '/clients';

  /**
   * Get clients with filtering and pagination
   */
  async getClients(
    filter?: ExpressClientsFilter, 
    pagination?: ExpressPaginationOptions
  ): Promise<ClientsResponse> {
    try {
      const params = new URLSearchParams();

      // Add pagination parameters
      if (pagination?.page) params.set('page', pagination.page.toString());
      if (pagination?.limit) params.set('limit', pagination.limit.toString());

      // Add filter parameters
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.set(key, value.toString());
            }
          }
        });
      }

      const response = await apiClient.get<ApiResponse<ClientsResponse['data']>>(
        `${this.endpoint}?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch clients');
      }

      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (error: any) {
      console.error('Get clients error:', error);
      throw new Error(error.message || 'Failed to fetch clients');
    }
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: string): Promise<ExpressClient> {
    try {
      const response = await apiClient.get<ApiResponse<{ client: ExpressClient }>>(
        `${this.endpoint}/${clientId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Client not found');
      }

      return response.data.data!.client;
    } catch (error: any) {
      console.error('Get client by ID error:', error);
      throw new Error(error.message || 'Failed to fetch client');
    }
  }

  /**
   * Create a new client
   */
  async createClient(clientData: Omit<ExpressClient, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>): Promise<ExpressClient> {
    try {
      const response = await apiClient.post<ApiResponse<{ client: ExpressClient }>>(
        this.endpoint,
        clientData
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create client');
      }

      return response.data.data!.client;
    } catch (error: any) {
      console.error('Create client error:', error);
      
      if (error.response?.status === 409) {
        throw new Error('Client with this email or phone already exists');
      }
      
      throw new Error(error.message || 'Failed to create client');
    }
  }

  /**
   * Update an existing client
   */
  async updateClient(clientId: string, updates: Partial<ExpressClient>): Promise<ExpressClient> {
    try {
      const response = await apiClient.put<ApiResponse<{ client: ExpressClient }>>(
        `${this.endpoint}/${clientId}`,
        updates
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update client');
      }

      return response.data.data!.client;
    } catch (error: any) {
      console.error('Update client error:', error);
      
      if (error.response?.status === 409) {
        throw new Error('Update would create duplicate client');
      }
      
      throw new Error(error.message || 'Failed to update client');
    }
  }

  /**
   * Delete a client (soft delete)
   */
  async deleteClient(clientId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `${this.endpoint}/${clientId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete client');
      }
    } catch (error: any) {
      console.error('Delete client error:', error);
      throw new Error(error.message || 'Failed to delete client');
    }
  }

  /**
   * Search clients
   */
  async searchClients(
    searchTerm: string, 
    filter?: Omit<ExpressClientsFilter, 'search'>, 
    pagination?: ExpressPaginationOptions
  ): Promise<ClientsResponse> {
    try {
      const params = new URLSearchParams();
      params.set('q', searchTerm);

      // Add pagination parameters
      if (pagination?.page) params.set('page', pagination.page.toString());
      if (pagination?.limit) params.set('limit', pagination.limit.toString());

      // Add filter parameters
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.set(key, value.toString());
            }
          }
        });
      }

      const response = await apiClient.get<ApiResponse<ClientsResponse['data']>>(
        `${this.endpoint}/search?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Search failed');
      }

      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (error: any) {
      console.error('Search clients error:', error);
      throw new Error(error.message || 'Failed to search clients');
    }
  }

  /**
   * Get client statistics
   */
  async getClientStats(branchId?: string): Promise<ClientStatsResponse> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);

      const response = await apiClient.get<ApiResponse<ClientStatsResponse>>(
        `${this.endpoint}/stats?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch statistics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get client stats error:', error);
      throw new Error(error.message || 'Failed to fetch client statistics');
    }
  }

  /**
   * Get all clients (for dropdown/autocomplete)
   */
  async getAllClients(): Promise<ExpressClient[]> {
    try {
      const response = await apiClient.get<ApiResponse<ExpressClient[]>>(
        `${this.endpoint}/all`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch clients');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get all clients error:', error);
      throw new Error(error.message || 'Failed to fetch clients');
    }
  }

  /**
   * Get client suggestions for autocomplete
   */
  async getClientSuggestions(searchTerm: string): Promise<ExpressClient[]> {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);

      const response = await apiClient.get<ApiResponse<ExpressClient[]>>(
        `${this.endpoint}/suggestions?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch suggestions');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get client suggestions error:', error);
      throw new Error(error.message || 'Failed to fetch client suggestions');
    }
  }

  /**
   * Check for duplicate clients
   */
  async checkDuplicates(clientData: Partial<ExpressClient>): Promise<DuplicateCheckResult> {
    try {
      const response = await apiClient.post<ApiResponse<DuplicateCheckResult>>(
        `${this.endpoint}/check-duplicates`,
        clientData
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Duplicate check failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Check duplicates error:', error);
      throw new Error(error.message || 'Failed to check for duplicates');
    }
  }

  /**
   * Bulk update clients
   */
  async bulkUpdateClients(request: BulkUpdateRequest): Promise<BulkOperationResult> {
    try {
      const response = await apiClient.post<ApiResponse<BulkOperationResult>>(
        `${this.endpoint}/bulk-update`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Bulk update failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Bulk update clients error:', error);
      throw new Error(error.message || 'Failed to update clients');
    }
  }

  /**
   * Update client statistics
   */
  async updateClientStats(clientId: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/${clientId}/update-stats`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update statistics');
      }
    } catch (error: any) {
      console.error('Update client stats error:', error);
      throw new Error(error.message || 'Failed to update client statistics');
    }
  }

  /**
   * Get client contacts (if supported by backend)
   */
  async getClientContacts(clientId: string): Promise<ClientContact[]> {
    try {
      const response = await apiClient.get<ApiResponse<ClientContact[]>>(
        `${this.endpoint}/${clientId}/contacts`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch contacts');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get client contacts error:', error);
      // Return empty array if endpoint doesn't exist
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(error.message || 'Failed to fetch client contacts');
    }
  }

  /**
   * Add client contact (if supported by backend)
   */
  async addClientContact(clientId: string, contact: Omit<ClientContact, 'id'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${clientId}/contacts`,
        contact
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to add contact');
      }

      return response.data.data!.id;
    } catch (error: any) {
      console.error('Add client contact error:', error);
      throw new Error(error.message || 'Failed to add client contact');
    }
  }

  /**
   * Get client balance summary (if supported by backend)
   */
  async getClientBalanceSummary(clientId: string): Promise<ClientBalanceSummary> {
    try {
      const response = await apiClient.get<ApiResponse<ClientBalanceSummary>>(
        `${this.endpoint}/${clientId}/balance`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch balance');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get client balance error:', error);
      // Return default balance if endpoint doesn't exist
      if (error.response?.status === 404) {
        return {
          currentBalance: 0,
          totalLifetimeSpend: 0,
          averageTicket: 0,
          outstandingInvoices: 0,
        };
      }
      throw new Error(error.message || 'Failed to fetch client balance');
    }
  }

  /**
   * Health check for client service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `${this.endpoint}/health`
      );
      return response.data.success;
    } catch (error) {
      console.error('Client service health check failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const clientApiService = new ClientApiService();

export default clientApiService;