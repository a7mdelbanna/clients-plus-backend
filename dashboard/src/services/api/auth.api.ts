import apiClient, { TokenManager } from '../../config/api';
import type { ApiResponse } from '../../config/api';

// Authentication interfaces
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  companyId: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  email?: string;
  phone?: string;
  preferences?: Record<string, any>;
}

/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */
class AuthApiService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthUser> {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }

      const { user, accessToken, refreshToken, expiresIn } = response.data.data!;
      
      // Store tokens
      TokenManager.setTokens(accessToken, refreshToken, expiresIn);
      
      // Store user data in session storage for persistence across tabs
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific auth errors
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Account is suspended or inactive');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      
      if (refreshToken) {
        // Notify backend about logout
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout API error (non-critical):', error);
      // Don't throw error for logout API failures - still clear local tokens
    } finally {
      // Always clear local storage
      TokenManager.clearTokens();
      sessionStorage.removeItem('currentUser');
      
      // Clear any cached data
      localStorage.removeItem('app_cache');
      
      // Emit logout event
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
        '/auth/refresh', 
        { refreshToken }
      );
      
      if (!response.data.success) {
        throw new Error('Token refresh failed');
      }

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.data!;
      
      // Update stored tokens
      TokenManager.setTokens(accessToken, newRefreshToken, expiresIn);
      
      return accessToken;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      
      // Clear tokens on refresh failure
      TokenManager.clearTokens();
      sessionStorage.removeItem('currentUser');
      
      // Emit token expired event
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
      
      throw new Error('Session expired. Please login again.');
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<AuthUser> {
    try {
      // Try to get from session storage first
      const cachedUser = sessionStorage.getItem('currentUser');
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }

      // Fetch from API if not cached
      const response = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
      
      if (!response.data.success) {
        throw new Error('Failed to get user info');
      }

      const user = response.data.data!;
      
      // Cache user data
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      console.error('Get current user error:', error);
      
      if (error.response?.status === 401) {
        // Token is invalid, clear storage
        TokenManager.clearTokens();
        sessionStorage.removeItem('currentUser');
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
      }
      
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>('/auth/change-password', request);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Password change failed');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Current password is incorrect');
      }
      
      throw new Error(error.message || 'Password change failed');
    }
  }

  /**
   * Send forgot password email
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>('/auth/forgot-password', request);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>('/auth/reset-password', request);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired reset token');
      }
      
      throw new Error(error.message || 'Password reset failed');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(request: UpdateProfileRequest): Promise<AuthUser> {
    try {
      const response = await apiClient.put<ApiResponse<AuthUser>>('/auth/profile', request);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Profile update failed');
      }

      const updatedUser = response.data.data!;
      
      // Update cached user data
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Profile update failed');
    }
  }

  /**
   * Verify if current session is valid
   */
  async verifySession(): Promise<boolean> {
    try {
      const hasToken = TokenManager.hasValidToken();
      
      if (!hasToken) {
        return false;
      }

      // Verify with backend
      const response = await apiClient.get<ApiResponse<{ valid: boolean }>>('/auth/verify');
      
      return response.data.success && response.data.data?.valid === true;
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated locally
   */
  isAuthenticated(): boolean {
    return TokenManager.hasValidToken() && !!sessionStorage.getItem('currentUser');
  }

  /**
   * Get stored user without API call
   */
  getStoredUser(): AuthUser | null {
    try {
      const cachedUser = sessionStorage.getItem('currentUser');
      return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh(): void {
    const refreshInterval = 15 * 60 * 1000; // 15 minutes
    
    setInterval(async () => {
      if (this.isAuthenticated() && TokenManager.isTokenExpired()) {
        try {
          await this.refreshToken();
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          // Let the user continue, error will be handled on next API call
        }
      }
    }, refreshInterval);
  }

  /**
   * Initialize auth service
   */
  initialize(): void {
    // Setup automatic token refresh
    this.setupTokenRefresh();
    
    // Listen for storage changes (logout in other tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'access_token' && !e.newValue) {
        // Token was cleared in another tab
        sessionStorage.removeItem('currentUser');
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    });
    
    // Listen for tab visibility change to refresh token if needed
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.isAuthenticated() && TokenManager.isTokenExpired()) {
        try {
          await this.refreshToken();
        } catch (error) {
          console.error('Token refresh on visibility change failed:', error);
        }
      }
    });
  }
}

// Create and export singleton instance
export const authApiService = new AuthApiService();

// Initialize on import
authApiService.initialize();

export default authApiService;