import { authAPI } from '../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified: boolean;
  companyId?: string;
  role?: string;
  permissions?: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileUpdate {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  photoURL?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (error) {
      console.error('Register service error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await authAPI.me();
      return response.data.user;
    } catch (error) {
      console.error('Get current user service error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(profileData: UserProfileUpdate): Promise<AuthUser> {
    try {
      const response = await authAPI.updateProfile(profileData);
      return response.data.user;
    } catch (error) {
      console.error('Update profile service error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(passwordData: PasswordChangeData): Promise<void> {
    try {
      await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
    } catch (error) {
      console.error('Change password service error:', error);
      throw error;
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    try {
      await authAPI.forgotPassword(email);
    } catch (error) {
      console.error('Forgot password service error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await authAPI.resetPassword(token, newPassword);
    } catch (error) {
      console.error('Reset password service error:', error);
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      await authAPI.verifyEmail(token);
    } catch (error) {
      console.error('Verify email service error:', error);
      throw error;
    }
  }

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await authAPI.resendVerification(email);
    } catch (error) {
      console.error('Resend verification service error:', error);
      throw error;
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await authAPI.refreshToken(refreshToken);
      return response.data;
    } catch (error) {
      console.error('Refresh token service error:', error);
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout service error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();