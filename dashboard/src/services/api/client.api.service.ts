import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// Re-export types from the main client service to maintain consistency
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
  PaginationOptions
} from '../client.service';

export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  gender?: 'male' | 'female' | 'other' | 'not_specified';
  dateOfBirth?: string; // ISO date string
  photo?: string;
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
  portalEnabled?: boolean;
  customFields?: Record<string, any>;
  branchId?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string;
}

export interface GetClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'prospect' | 'all';
  categoryId?: string;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'totalRevenue' | 'lastVisit' | 'totalVisits' | 'balance';
  sortDirection?: 'asc' | 'desc';
  branchId?: string;
  
  // Advanced filters
  ageMin?: number;
  ageMax?: number;
  gender?: string[];
  birthdayMonth?: number;
  birthdayUpcomingDays?: number;
  hasValidEmail?: boolean;
  hasValidPhone?: boolean;
  acceptsSMS?: boolean;
  acceptsEmail?: boolean;
  includeCategories?: string[];
  excludeCategories?: string[];
  quickFilter?: 'all' | 'new_this_month' | 'vip' | 'birthday_this_month' | 'with_balance' | 'inactive' | 'recent_visits';
}

export interface ClientApiResponse extends ApiResponse {
  data: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    preferredName?: string;
    gender?: 'male' | 'female' | 'other' | 'not_specified';
    dateOfBirth?: string;
    age?: number;
    photo?: string;
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
    // Legacy contact fields for backward compatibility
    phone?: string;
    email?: string;
    mobile?: string;
    name?: string; // firstName + lastName
    nameAr?: string;
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
      lastUpdated?: string;
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
    lastVisit?: string;
    nextVisit?: string;
    averageVisitFrequency?: number;
    favoriteService?: string;
    favoriteStaff?: string;
    totalRevenue?: number;
    averageTicket?: number;
    lifetimeValue?: number;
    projectsCount?: number;
    lastContactDate?: string;
    loyaltyPoints?: number;
    loyaltyTier?: string;
    memberSince?: string;
    companyId: string;
    branchId?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    importedFrom?: string;
    portalEnabled?: boolean;
    portalLastAccess?: string;
    customFields?: Record<string, any>;
  };
}

export interface ClientsListApiResponse extends ApiResponse {
  data: ClientApiResponse['data'][];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DuplicateCheckApiResponse extends ApiResponse {
  data: {
    hasDuplicates: boolean;
    matches: Array<{
      client: ClientApiResponse['data'];
      matchScore: number;
      matchedFields: string[];
      matchType: 'exact' | 'possible';
    }>;
    suggestedAction: 'block' | 'warn' | 'allow';
  };
}

export interface ClientSuggestionsApiResponse extends ApiResponse {
  data: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    totalRevenue?: number;
    lastVisit?: string;
  }>;
}

class ClientApiService {
  /**
   * Get all clients with optional filtering and pagination
   */
  async getClients(params: GetClientsParams = {}): Promise<ClientsListApiResponse> {
    const response = await apiClient.get<ClientsListApiResponse>('/clients', { params });
    return response.data;
  }

  /**
   * Get a specific client by ID
   */
  async getClient(clientId: string): Promise<ClientApiResponse> {
    const response = await apiClient.get<ClientApiResponse>(`/clients/${clientId}`);
    return response.data;
  }

  /**
   * Create a new client
   */
  async createClient(clientData: CreateClientRequest): Promise<ClientApiResponse> {
    const response = await apiClient.post<ClientApiResponse>('/clients', clientData);
    return response.data;
  }

  /**
   * Update an existing client
   */
  async updateClient(clientId: string, updates: Partial<CreateClientRequest>): Promise<ClientApiResponse> {
    const response = await apiClient.put<ClientApiResponse>(`/clients/${clientId}`, updates);
    return response.data;
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/clients/${clientId}`);
    return response.data;
  }

  /**
   * Get client suggestions for autocomplete
   */
  async getClientSuggestions(searchTerm?: string): Promise<ClientSuggestionsApiResponse> {
    const params = searchTerm ? { search: searchTerm } : {};
    const response = await apiClient.get<ClientSuggestionsApiResponse>('/clients/suggestions', { params });
    return response.data;
  }

  /**
   * Check for duplicate clients
   */
  async checkDuplicates(clientData: Partial<CreateClientRequest>): Promise<DuplicateCheckApiResponse> {
    const response = await apiClient.post<DuplicateCheckApiResponse>('/clients/check-duplicates', clientData);
    return response.data;
  }

  /**
   * Get client balance summary
   */
  async getClientBalanceSummary(clientId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>(`/clients/${clientId}/balance`);
    return response.data;
  }

  /**
   * Bulk operations on clients
   */
  async bulkOperation(operation: {
    type: 'update_category' | 'send_sms' | 'send_email' | 'add_tag' | 'remove_tag' | 'delete';
    clientIds: string[];
    data?: any;
  }): Promise<ApiResponse<{ success: number; failed: number; errors: any[] }>> {
    const response = await apiClient.post<ApiResponse<any>>('/clients/bulk', operation);
    return response.data;
  }

  /**
   * Export clients
   */
  async exportClients(options: {
    scope: 'all' | 'filtered' | 'selected';
    format: 'xlsx' | 'csv' | 'pdf';
    fields: string[];
    clientIds?: string[];
    filters?: GetClientsParams;
  }): Promise<Blob> {
    const response = await apiClient.post('/clients/export', options, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import clients
   */
  async importClients(formData: FormData): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>('/clients/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Get client visit history
   */
  async getClientVisits(clientId: string, params: { page?: number; limit?: number } = {}): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>(`/clients/${clientId}/visits`, { params });
    return response.data;
  }

  /**
   * Get client transaction history
   */
  async getClientTransactions(clientId: string, params: { page?: number; limit?: number } = {}): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>(`/clients/${clientId}/transactions`, { params });
    return response.data;
  }

  /**
   * Add client contact
   */
  async addClientContact(clientId: string, contact: {
    name: string;
    position?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    isPrimary?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(`/clients/${clientId}/contacts`, contact);
    return response.data;
  }

  /**
   * Get client contacts
   */
  async getClientContacts(clientId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>(`/clients/${clientId}/contacts`);
    return response.data;
  }

  /**
   * Upload client photo
   */
  async uploadClientPhoto(clientId: string, photo: File): Promise<ApiResponse<{ photoUrl: string }>> {
    const formData = new FormData();
    formData.append('photo', photo);
    
    const response = await apiClient.post<ApiResponse<{ photoUrl: string }>>(
      `/clients/${clientId}/photo`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Delete client photo
   */
  async deleteClientPhoto(clientId: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/clients/${clientId}/photo`);
    return response.data;
  }

  /**
   * Get saved filters
   */
  async getSavedFilters(): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>('/clients/saved-filters');
    return response.data;
  }

  /**
   * Save a filter
   */
  async saveFilter(filter: {
    name: string;
    description?: string;
    filters: GetClientsParams;
    isPublic: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>('/clients/saved-filters', filter);
    return response.data;
  }

  /**
   * Update client stats (called after project/invoice changes)
   */
  async updateClientStats(clientId: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/clients/${clientId}/update-stats`);
    return response.data;
  }
}

// Create and export singleton instance
export const clientApiService = new ClientApiService();

// Default export
export default clientApiService;