import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Resource interface
export interface Resource {
  id?: string;
  companyId: string;
  branchId?: string;
  name: string;
  description?: string;
  services: string[];
  capacity: number;
  workingHours?: {
    [day: string]: {
      isWorking: boolean;
      start?: string;
      end?: string;
      breaks?: Array<{
        start: string;
        end: string;
      }>;
    };
  };
  status: 'active' | 'inactive';
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

class ResourceService {
  private readonly endpoint = '/resources';

  // Create a new resource
  async createResource(resource: Omit<Resource, 'id'>, companyId: string, branchId?: string): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.endpoint, {
        ...resource,
        companyId,
        branchId: branchId || resource.branchId,
        capacity: resource.capacity || 1,
        status: resource.status || 'active',
        active: true,
        services: resource.services || [],
      });
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create resource');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating resource:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create resource');
    }
  }

  // Get all resources for a company
  async getResources(companyId: string, branchId?: string): Promise<Resource[]> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<Resource[]>>(this.endpoint, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting resources:', error);
      throw error;
    }
  }

  // Get resources by service ID
  async getResourcesByService(companyId: string, serviceId: string, branchId?: string): Promise<Resource[]> {
    try {
      const params: any = { serviceId };
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<Resource[]>>(`${this.endpoint}/by-service`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting resources by service:', error);
      throw error;
    }
  }

  // Get a single resource
  async getResource(resourceId: string): Promise<Resource | null> {
    try {
      const response = await apiClient.get<ApiResponse<Resource>>(`${this.endpoint}/${resourceId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting resource:', error);
      throw error;
    }
  }

  // Update a resource
  async updateResource(resourceId: string, updates: Partial<Resource>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${resourceId}`, updates);
    } catch (error: any) {
      console.error('Error updating resource:', error);
      throw error;
    }
  }

  // Delete a resource (soft delete)
  async deleteResource(resourceId: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${resourceId}`);
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }

  // Subscribe to resources changes (polling)
  subscribeToResources(
    companyId: string,
    onUpdate: (resources: Resource[]) => void,
    onError?: (error: Error) => void,
    branchId?: string
  ): () => void {
    this.getResources(companyId, branchId)
      .then(onUpdate)
      .catch(error => { if (onError) onError(error); });

    const interval = setInterval(() => {
      this.getResources(companyId, branchId)
        .then(onUpdate)
        .catch(error => { if (onError) onError(error); });
    }, 30000);

    return () => clearInterval(interval);
  }

  // Check resource availability for a specific time slot
  async checkResourceAvailability(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<{ available: boolean }>>(
        `${this.endpoint}/${resourceId}/availability`,
        { params: { date: date.toISOString(), startTime, endTime } }
      );
      return response.data.data?.available || false;
    } catch (error) {
      console.error('Error checking resource availability:', error);
      return false;
    }
  }
}

export const resourceService = new ResourceService();
