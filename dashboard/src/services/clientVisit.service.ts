import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type { ClientVisit } from './client.service';

// Visit statistics interface
export interface VisitStatistics {
  totalVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  noShows: number;
  noShowRate: number;
  lastVisit?: Date;
  nextVisit?: Date;
  averageFrequency?: number;
  favoriteService?: {
    id: string;
    name: string;
    count: number;
  };
  favoriteStaff?: {
    id: string;
    name: string;
    count: number;
  };
  totalSpent: number;
  averageSpent: number;
}

// Visit preferences interface
export interface VisitPreferences {
  typicalServices: string[];
  typicalInterval: number;
  preferredDayOfWeek: string[];
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening';
}

// Appointment request interface
export interface AppointmentRequest {
  clientId: string;
  requestedDate: Date;
  requestedTime: string;
  services: string[];
  preferredStaff?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    endDate?: Date;
  };
}

class ClientVisitService {
  private readonly endpoint = '/clients';

  // Create a new visit record
  async createVisit(visitData: Omit<ClientVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${visitData.clientId}/visits`,
        visitData
      );
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create visit');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating visit:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create visit');
    }
  }

  // Update visit status
  async updateVisitStatus(
    visitId: string,
    status: ClientVisit['status'],
    notes?: string
  ): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(
        `${this.endpoint}/visits/${visitId}/status`,
        { status, notes }
      );
    } catch (error: any) {
      console.error('Error updating visit status:', error);
      throw error;
    }
  }

  // Add feedback to visit
  async addVisitFeedback(
    visitId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/visits/${visitId}/feedback`,
        { rating, comment }
      );
    } catch (error: any) {
      console.error('Error adding visit feedback:', error);
      throw error;
    }
  }

  // Add photos to visit
  async addVisitPhotos(
    visitId: string,
    photos: { before?: string[]; after?: string[] }
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/visits/${visitId}/photos`,
        photos
      );
    } catch (error: any) {
      console.error('Error adding visit photos:', error);
      throw error;
    }
  }

  // Get visit history
  async getVisitHistory(
    clientId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      status?: ClientVisit['status'];
    }
  ): Promise<ClientVisit[]> {
    try {
      const params: any = {};
      if (options?.limit) params.limit = options.limit;
      if (options?.startDate) params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();
      if (options?.status) params.status = options.status;

      const response = await apiClient.get<ApiResponse<ClientVisit[]>>(
        `${this.endpoint}/${clientId}/visits`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting visit history:', error);
      throw error;
    }
  }

  // Subscribe to visit updates (polling)
  subscribeToVisits(
    clientId: string,
    callback: (visits: ClientVisit[]) => void
  ): () => void {
    this.getVisitHistory(clientId, { limit: 20 })
      .then(callback)
      .catch(error => console.error('Error in visit subscription:', error));

    const interval = setInterval(() => {
      this.getVisitHistory(clientId, { limit: 20 })
        .then(callback)
        .catch(error => console.error('Error in visit subscription:', error));
    }, 15000);

    return () => clearInterval(interval);
  }

  // Get visit statistics
  async getVisitStatistics(clientId: string): Promise<VisitStatistics> {
    try {
      const response = await apiClient.get<ApiResponse<VisitStatistics>>(
        `${this.endpoint}/${clientId}/visit-stats`
      );
      return response.data.data || {
        totalVisits: 0,
        completedVisits: 0,
        cancelledVisits: 0,
        noShows: 0,
        noShowRate: 0,
        totalSpent: 0,
        averageSpent: 0,
      };
    } catch (error) {
      console.error('Error getting visit statistics:', error);
      throw error;
    }
  }

  // Get appointment preferences
  async getAppointmentPreferences(clientId: string): Promise<VisitPreferences> {
    try {
      const response = await apiClient.get<ApiResponse<VisitPreferences>>(
        `${this.endpoint}/${clientId}/visit-preferences`
      );
      return response.data.data || {
        typicalServices: [],
        typicalInterval: 30,
        preferredDayOfWeek: [],
        preferredTimeOfDay: 'morning',
      };
    } catch (error) {
      console.error('Error getting appointment preferences:', error);
      throw error;
    }
  }

  // Check for upcoming visits
  async getUpcomingVisits(
    clientId: string,
    days: number = 7
  ): Promise<ClientVisit[]> {
    try {
      const response = await apiClient.get<ApiResponse<ClientVisit[]>>(
        `${this.endpoint}/${clientId}/visits/upcoming`,
        { params: { days } }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting upcoming visits:', error);
      return [];
    }
  }

  // Create appointment request
  async createAppointmentRequest(request: AppointmentRequest): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${request.clientId}/appointment-requests`,
        {
          ...request,
          requestedDate: request.requestedDate.toISOString(),
          recurringPattern: request.recurringPattern ? {
            ...request.recurringPattern,
            endDate: request.recurringPattern.endDate?.toISOString(),
          } : undefined,
        }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating appointment request:', error);
      throw error;
    }
  }

  // Get visit recommendations
  async getVisitRecommendations(clientId: string): Promise<{
    nextRecommendedDate: Date;
    recommendedServices: string[];
    message: string;
  }> {
    try {
      const response = await apiClient.get<ApiResponse<{
        nextRecommendedDate: string;
        recommendedServices: string[];
        message: string;
      }>>(
        `${this.endpoint}/${clientId}/visit-recommendations`
      );
      const data = response.data.data;
      return {
        nextRecommendedDate: data ? new Date(data.nextRecommendedDate) : new Date(),
        recommendedServices: data?.recommendedServices || [],
        message: data?.message || 'Welcome! Book your first appointment today.',
      };
    } catch (error) {
      console.error('Error getting visit recommendations:', error);
      throw error;
    }
  }
}

export const clientVisitService = new ClientVisitService();
