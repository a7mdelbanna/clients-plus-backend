import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

export interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  location?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  companyId?: string;
  role?: string;
  preferences?: UserPreferences;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  language: 'en' | 'ar';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    appointments: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'company' | 'private';
    showLastSeen: boolean;
    showPhoneNumber: boolean;
  };
  display: {
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    timezone: string;
    currency: 'EGP' | 'USD' | 'EUR';
  };
}

export const defaultUserPreferences: UserPreferences = {
  language: 'ar',
  theme: 'system',
  notifications: {
    email: true,
    sms: true,
    push: true,
    appointments: true,
    reminders: true,
    marketing: false,
  },
  privacy: {
    profileVisibility: 'company',
    showLastSeen: true,
    showPhoneNumber: false,
  },
  display: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
  },
};

class UserService {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const response = await apiClient.get<ApiResponse<UserProfile>>(`/users/${uid}`);
      if (!response.data.success) return null;
      return response.data.data ? { uid, ...response.data.data } : null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`/users/${uid}`, profileData);
    } catch (error: any) {
      // If user doesn't exist yet, create via auth profile
      if (error.response?.status === 404) {
        await apiClient.put<ApiResponse<void>>('/auth/profile', {
          ...profileData,
          preferences: profileData.preferences || defaultUserPreferences,
        });
        return;
      }
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async updateUserPreferences(uid: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      // Get current profile to merge preferences
      const currentProfile = await this.getUserProfile(uid);
      const currentPreferences = currentProfile?.preferences || defaultUserPreferences;

      const updatedPreferences: UserPreferences = {
        ...currentPreferences,
        ...preferences,
        notifications: {
          ...currentPreferences.notifications,
          ...preferences.notifications,
        },
        privacy: {
          ...currentPreferences.privacy,
          ...preferences.privacy,
        },
        display: {
          ...currentPreferences.display,
          ...preferences.display,
        },
      };

      await apiClient.put<ApiResponse<void>>(`/users/${uid}`, {
        preferences: updatedPreferences,
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  async updateLastLogin(uid: string): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`/users/${uid}`, {
        lastLoginAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw - non-critical
    }
  }

  async updatePhotoURL(uid: string, photoURL: string): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`/users/${uid}`, { photoURL });
    } catch (error) {
      console.error('Error updating photo URL:', error);
      throw error;
    }
  }

  async deleteUserData(uid: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`/users/${uid}`);
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  async searchUsers(searchQuery: string, companyId?: string): Promise<UserProfile[]> {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (companyId) params.companyId = companyId;

      const response = await apiClient.get<ApiResponse<UserProfile[]>>('/users', { params });
      if (!response.data.success) return [];
      return response.data.data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async getUsersByCompany(companyId: string): Promise<UserProfile[]> {
    try {
      const response = await apiClient.get<ApiResponse<UserProfile[]>>(
        `/users/companies/${companyId}/users`
      );
      if (!response.data.success) return [];
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting users by company:', error);
      return [];
    }
  }
}

export const userService = new UserService();
