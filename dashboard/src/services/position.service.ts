import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Position interface
export interface Position {
  id?: string;
  companyId: string;
  name: string;
  description?: string;
  translations?: {
    [key: string]: {
      name: string;
      description?: string;
    };
  };
  active: boolean;
  staffCount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Helper function to get position name in preferred language
export function getPositionName(position: Position, language: string = 'ar'): string {
  if (language === 'ar') {
    return position.name;
  }
  if (position.translations && position.translations[language]) {
    return position.translations[language].name;
  }
  return position.name;
}

// Helper function to get position description in preferred language
export function getPositionDescription(position: Position, language: string = 'ar'): string | undefined {
  if (language === 'ar') {
    return position.description;
  }
  if (position.translations && position.translations[language]) {
    return position.translations[language].description;
  }
  return position.description;
}

class PositionService {
  private readonly endpoint = '/staff/positions';

  async createPosition(
    position: Omit<Position, 'id' | 'createdAt' | 'updatedAt' | 'staffCount'>,
    _userId: string
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.endpoint, position);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create position');
      }
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating position:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create position');
    }
  }

  async getPositions(companyId: string): Promise<Position[]> {
    try {
      const response = await apiClient.get<ApiResponse<Position[]>>(this.endpoint);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch positions');
      }
      const positions = response.data.data || [];
      return positions
        .filter(p => p.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: any) {
      console.error('Error getting positions:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch positions');
    }
  }

  async getPosition(positionId: string): Promise<Position | null> {
    try {
      const response = await apiClient.get<ApiResponse<Position>>(`${this.endpoint}/${positionId}`);
      if (!response.data.success) return null;
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting position:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch position');
    }
  }

  async updatePosition(positionId: string, updates: Partial<Position>): Promise<void> {
    try {
      const response = await apiClient.put<ApiResponse<void>>(`${this.endpoint}/${positionId}`, updates);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update position');
      }
    } catch (error: any) {
      console.error('Error updating position:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update position');
    }
  }

  async deletePosition(positionId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${positionId}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete position');
      }
    } catch (error: any) {
      console.error('Error deleting position:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete position');
    }
  }

  subscribeToPositions(
    companyId: string,
    callback: (positions: Position[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Initial fetch
    this.getPositions(companyId)
      .then(callback)
      .catch((error) => {
        console.error('Error fetching positions:', error);
        if (errorCallback) errorCallback(error);
      });

    // Poll every 30 seconds for low-frequency data
    const interval = setInterval(() => {
      this.getPositions(companyId)
        .then(callback)
        .catch((error) => {
          console.error('Error polling positions:', error);
          if (errorCallback) errorCallback(error);
        });
    }, 30000);

    return () => clearInterval(interval);
  }

  async checkPositionNameExists(
    companyId: string,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const positions = await this.getPositions(companyId);
      return positions.some(p => p.name === name && p.id !== excludeId);
    } catch (error) {
      console.error('Error checking position name:', error);
      return false;
    }
  }
}

export const positionService = new PositionService();
