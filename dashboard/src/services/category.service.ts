import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Base category interface
export interface BaseCategory {
  id?: string;
  companyId: string;
  branchId?: string;
  name: string;
  nameAr?: string;
  color: string;
  icon: string;
  description?: string;
  descriptionAr?: string;
  itemCount?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Specific category types
export interface ClientCategory extends BaseCategory {
  type: 'client';
}

export interface AppointmentCategory extends BaseCategory {
  type: 'appointment';
}

export interface EventCategory extends BaseCategory {
  type: 'event';
}

export type Category = ClientCategory | AppointmentCategory | EventCategory;

// Predefined colors for categories
export const CATEGORY_COLORS = [
  '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899',
  '#EF4444', '#14B8A6', '#84CC16', '#F97316', '#6366F1',
];

// Predefined icons for each category type
export const CATEGORY_ICONS = {
  client: [
    'People', 'Person', 'Groups', 'BusinessCenter', 'Star',
    'Favorite', 'WorkspacePremium', 'Verified', 'AccountCircle', 'Badge',
  ],
  appointment: [
    'CalendarToday', 'Schedule', 'EventNote', 'AccessTime', 'Today',
    'DateRange', 'MoreTime', 'Alarm', 'EventAvailable', 'BookOnline',
  ],
  event: [
    'Event', 'Celebration', 'Group', 'Stadium', 'TheaterComedy',
    'SportsEsports', 'MusicNote', 'Restaurant', 'School', 'FitnessCenter',
  ],
};

class CategoryService {
  private getEndpoint(type: 'client' | 'appointment' | 'event'): string {
    switch (type) {
      case 'client':
        return '/client-categories';
      case 'appointment':
      case 'event':
        return '/services/categories';
    }
  }

  async createCategory<T extends Category>(
    category: Omit<T, 'id'>,
    type: 'client' | 'appointment' | 'event'
  ): Promise<string> {
    try {
      const endpoint = this.getEndpoint(type);
      const response = await apiClient.post<ApiResponse<{ id: string }>>(endpoint, {
        ...category,
        type,
        itemCount: 0,
        active: true,
      });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create category');
      }
      return response.data.data!.id;
    } catch (error: any) {
      console.error(`Error creating ${type} category:`, error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create category');
    }
  }

  async getCategories<T extends Category>(
    companyId: string,
    type: 'client' | 'appointment' | 'event',
    branchId?: string
  ): Promise<T[]> {
    try {
      const endpoint = this.getEndpoint(type);
      const params: any = { active: 'true' };
      if (branchId) params.branchId = branchId;

      const response = await apiClient.get<ApiResponse<any[]>>(endpoint, { params });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch categories');
      }

      let categories = (response.data.data || []).map((c: any) => ({ ...c, type })) as T[];

      // Filter by branch (include categories without branchId as shared)
      if (branchId) {
        categories = categories.filter(c => !c.branchId || c.branchId === branchId);
      }

      return categories;
    } catch (error: any) {
      console.error(`Error getting ${type} categories:`, error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch categories');
    }
  }

  async getCategory<T extends Category>(
    categoryId: string,
    type: 'client' | 'appointment' | 'event'
  ): Promise<T | null> {
    try {
      const endpoint = this.getEndpoint(type);
      const response = await apiClient.get<ApiResponse<any>>(`${endpoint}/${categoryId}`);
      if (!response.data.success) return null;
      return response.data.data ? { ...response.data.data, type } as T : null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error(`Error getting ${type} category:`, error);
      throw error;
    }
  }

  async updateCategory(
    categoryId: string,
    updates: Partial<BaseCategory>,
    type: 'client' | 'appointment' | 'event'
  ): Promise<void> {
    try {
      const endpoint = this.getEndpoint(type);
      const response = await apiClient.put<ApiResponse<void>>(`${endpoint}/${categoryId}`, updates);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update category');
      }
    } catch (error: any) {
      console.error(`Error updating ${type} category:`, error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update category');
    }
  }

  async deleteCategory(
    categoryId: string,
    type: 'client' | 'appointment' | 'event'
  ): Promise<void> {
    try {
      const endpoint = this.getEndpoint(type);
      const response = await apiClient.delete<ApiResponse<void>>(`${endpoint}/${categoryId}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete category');
      }
    } catch (error: any) {
      console.error(`Error deleting ${type} category:`, error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete category');
    }
  }

  subscribeToCategories<T extends Category>(
    companyId: string,
    type: 'client' | 'appointment' | 'event',
    onUpdate: (categories: T[]) => void,
    onError?: (error: Error) => void,
    branchId?: string
  ): () => void {
    // Initial fetch
    this.getCategories<T>(companyId, type, branchId)
      .then(onUpdate)
      .catch((error) => {
        console.error(`Error fetching ${type} categories:`, error);
        if (onError) onError(error);
      });

    // Poll every 30 seconds for low-frequency data
    const interval = setInterval(() => {
      this.getCategories<T>(companyId, type, branchId)
        .then(onUpdate)
        .catch((error) => {
          console.error(`Error polling ${type} categories:`, error);
          if (onError) onError(error);
        });
    }, 30000);

    return () => clearInterval(interval);
  }

  async getCategoryCounts(companyId: string, branchId?: string): Promise<{
    client: number;
    appointment: number;
    event: number;
  }> {
    try {
      const counts = await Promise.all([
        this.getCategories(companyId, 'client', branchId),
        this.getCategories(companyId, 'appointment', branchId),
        this.getCategories(companyId, 'event', branchId),
      ]);
      return {
        client: counts[0].length,
        appointment: counts[1].length,
        event: counts[2].length,
      };
    } catch (error) {
      console.error('Error getting category counts:', error);
      return { client: 0, appointment: 0, event: 0 };
    }
  }

  async updateCategoryItemCount(
    categoryId: string,
    type: 'client' | 'appointment' | 'event',
    increment: boolean = true
  ): Promise<void> {
    try {
      const category = await this.getCategory(categoryId, type);
      if (category) {
        const currentCount = category.itemCount || 0;
        const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
        await this.updateCategory(categoryId, { itemCount: newCount }, type);
      }
    } catch (error) {
      console.error('Error updating category item count:', error);
      // Non-critical operation
    }
  }
}

export const categoryService = new CategoryService();
