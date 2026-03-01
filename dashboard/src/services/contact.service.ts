import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  Contact,
  ContactStatus,
  ContactFilters,
  ContactActivity,
  QuickCreateContact,
  ContactCategory,
  ContactMergeRequest,
} from '../types/contact.types';
import { ContactType } from '../types/contact.types';

class ContactService {
  private readonly endpoint = '/contacts';
  private readonly categoriesEndpoint = '/contacts/categories';

  // ==================== CONTACT CRUD ====================

  // Create contact
  async createContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'code'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.endpoint, contact);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create contact');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating contact:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create contact');
    }
  }

  // Quick create contact (minimal fields)
  async quickCreateContact(data: QuickCreateContact): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/quick`, data);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create contact');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error quick creating contact:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create contact');
    }
  }

  // Update contact
  async updateContact(companyId: string, contactId: string, updates: Partial<Contact>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${contactId}`, updates);
    } catch (error: any) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  // Get single contact
  async getContact(companyId: string, contactId: string): Promise<Contact | null> {
    try {
      const response = await apiClient.get<ApiResponse<Contact>>(`${this.endpoint}/${contactId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting contact:', error);
      throw error;
    }
  }

  // Get contacts with filters
  async getContacts(
    companyId: string,
    filters: ContactFilters = {},
    pageSize: number = 20,
    _lastDoc?: any
  ): Promise<{ contacts: Contact[]; lastDoc: any }> {
    try {
      const params: any = { limit: pageSize };
      if (filters.types && filters.types.length > 0) params.types = filters.types.join(',');
      if (filters.status && filters.status.length > 0) params.status = filters.status.join(',');
      if (filters.categoryIds && filters.categoryIds.length > 0) params.categoryIds = filters.categoryIds.join(',');
      if (filters.branchIds && filters.branchIds.length > 0) params.branchIds = filters.branchIds.join(',');
      if (filters.search) params.search = filters.search;
      if (filters.tags && filters.tags.length > 0) params.tags = filters.tags.join(',');
      if (filters.dateRange) {
        params.startDate = filters.dateRange.start.toISOString();
        params.endDate = filters.dateRange.end.toISOString();
      }

      const response = await apiClient.get<ApiResponse<Contact[]>>(this.endpoint, { params });
      return {
        contacts: response.data.data || [],
        lastDoc: null,
      };
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  // Subscribe to contacts (polling)
  subscribeToContacts(
    companyId: string,
    filters: ContactFilters = {},
    callback: (contacts: Contact[]) => void
  ): () => void {
    this.getContacts(companyId, filters)
      .then(result => callback(result.contacts))
      .catch(error => console.error('Error in contact subscription:', error));

    const interval = setInterval(() => {
      this.getContacts(companyId, filters)
        .then(result => callback(result.contacts))
        .catch(error => console.error('Error in contact subscription:', error));
    }, 30000);

    return () => clearInterval(interval);
  }

  // Delete contact
  async deleteContact(companyId: string, contactId: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${contactId}`);
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  // Archive contact (soft delete)
  async archiveContact(companyId: string, contactId: string): Promise<void> {
    try {
      await this.updateContact(companyId, contactId, { status: 'archived' });
    } catch (error) {
      console.error('Error archiving contact:', error);
      throw error;
    }
  }

  // ==================== CONTACT MERGING ====================

  async mergeContacts(companyId: string, mergeRequest: ContactMergeRequest): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.endpoint}/merge`, mergeRequest);
    } catch (error: any) {
      console.error('Error merging contacts:', error);
      throw error;
    }
  }

  // ==================== CONTACT CATEGORIES ====================

  async createCategory(companyId: string, category: Omit<ContactCategory, 'id' | 'createdAt' | 'updatedAt' | 'contactCount'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.categoriesEndpoint, category);
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating contact category:', error);
      throw error;
    }
  }

  async getCategories(companyId: string, type?: ContactType): Promise<ContactCategory[]> {
    try {
      const params: any = {};
      if (type) params.type = type;
      const response = await apiClient.get<ApiResponse<ContactCategory[]>>(this.categoriesEndpoint, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting contact categories:', error);
      throw error;
    }
  }

  // ==================== CONTACT ACTIVITIES ====================

  async logActivity(companyId: string, activity: Omit<ContactActivity, 'id'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${activity.contactId}/activities`,
        activity
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error logging contact activity:', error);
      throw error;
    }
  }

  async getActivities(companyId: string, contactId: string, pageSize: number = 50): Promise<ContactActivity[]> {
    try {
      const response = await apiClient.get<ApiResponse<ContactActivity[]>>(
        `${this.endpoint}/${contactId}/activities`,
        { params: { limit: pageSize } }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting contact activities:', error);
      throw error;
    }
  }

  // ==================== MIGRATION HELPERS ====================

  async findContactByRelatedEntity(
    companyId: string,
    entityType: 'clientId' | 'staffId' | 'vendorId' | 'userId',
    entityId: string
  ): Promise<Contact | null> {
    try {
      const response = await apiClient.get<ApiResponse<Contact>>(
        `${this.endpoint}/by-entity`,
        { params: { entityType, entityId } }
      );
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error finding contact by related entity:', error);
      throw error;
    }
  }

  async createContactFromClient(companyId: string, client: any, createdBy: string): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/from-client`,
        { client, createdBy }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating contact from client:', error);
      throw error;
    }
  }

  async createContactFromStaff(companyId: string, staff: any, createdBy: string): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/from-staff`,
        { staff, createdBy }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating contact from staff:', error);
      throw error;
    }
  }

  async createContactFromVendor(companyId: string, vendor: any, createdBy: string): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/from-vendor`,
        { vendor, createdBy }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating contact from vendor:', error);
      throw error;
    }
  }
}

export const contactService = new ContactService();
