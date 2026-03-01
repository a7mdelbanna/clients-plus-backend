import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
  errors?: any[];
}

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// API Configuration constants for compatibility with existing code
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Token storage keys
export const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
  REMEMBER_ME: 'remember_me'
};

// Backwards compatibility alias
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
};

// Token utilities
export const tokenUtils = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  },

  getTokenExpiry: (): number | null => {
    const expiry = localStorage.getItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  getRememberMe: (): boolean => {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.REMEMBER_ME) === 'true';
  },

  setTokens: (accessToken: string, refreshToken: string, expiresIn: number, rememberMe: boolean = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    storage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    storage.setItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY, (Date.now() + expiresIn * 1000).toString());
    localStorage.setItem(TOKEN_STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());

    // If not remember me, also store in localStorage for token refresh
    if (!rememberMe) {
      localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY, (Date.now() + expiresIn * 1000).toString());
    }
  },

  isValidToken: (token: string | null): boolean => {
    if (!token) return false;
    // Basic JWT format validation
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  },

  clearTokens: () => {
    // Clear from both localStorage and sessionStorage
    Object.values(TOKEN_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  isTokenExpired: (): boolean => {
    const expiry = tokenUtils.getTokenExpiry();
    if (!expiry) return true;
    
    // Check if token expires in the next 5 minutes
    return Date.now() > (expiry - 5 * 60 * 1000);
  },

  isTokenValid: (): boolean => {
    const token = tokenUtils.getAccessToken();
    return token !== null && !tokenUtils.isTokenExpired();
  }
};

// TokenManager class for backward compatibility with existing code
export class TokenManager {
  static setTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    const rememberMe = tokenUtils.getRememberMe();
    tokenUtils.setTokens(accessToken, refreshToken, expiresIn || 3600, rememberMe);
  }

  static getAccessToken(): string | null {
    return tokenUtils.getAccessToken();
  }

  static getRefreshToken(): string | null {
    return tokenUtils.getRefreshToken();
  }

  static isTokenExpired(): boolean {
    return tokenUtils.isTokenExpired();
  }

  static clearTokens(): void {
    tokenUtils.clearTokens();
  }

  static hasValidToken(): boolean {
    return tokenUtils.isTokenValid();
  }
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenUtils.getAccessToken();
    
    // Only add token if it's valid
    if (token && tokenUtils.isValidToken(token) && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token && !tokenUtils.isValidToken(token)) {
      // Clear invalid tokens
      console.warn('Invalid token detected, clearing tokens');
      tokenUtils.clearTokens();
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenUtils.getRefreshToken();
        if (!refreshToken || !tokenUtils.isValidToken(refreshToken)) {
          throw new Error('No valid refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
        const rememberMe = tokenUtils.getRememberMe();
        
        tokenUtils.setTokens(accessToken, newRefreshToken, expiresIn, rememberMe);
        
        // Update the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Clear tokens and redirect to login
        tokenUtils.clearTokens();
        
        // Dispatch custom event for auth context to handle
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      toast.error('ليس لديك صلاحية للوصول إلى هذا المورد');
    } else if (error.response?.status >= 500) {
      toast.error('خطأ في الخادم. يرجى المحاولة لاحقاً');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى');
    } else if (!error.response) {
      toast.error('خطأ في الاتصال بالشبكة');
    }

    return Promise.reject(error);
  }
);

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.data.success;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Factory function for creating new axios instances (for compatibility)
export const createAxiosInstance = (): AxiosInstance => {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export default apiClient;

// Auth API endpoints
export const authAPI = {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) =>
    apiClient.post('/auth/login', credentials),
    
  register: (userData: { 
    email: string; 
    password: string; 
    displayName: string;
    firstName?: string;
    lastName?: string;
    companyId?: string;
  }) =>
    apiClient.post('/auth/register', userData),
    
  registerWithCompany: (userData: { 
    email: string; 
    password: string; 
    firstName: string;
    lastName: string;
    phone?: string;
    companyName?: string;
  }) =>
    apiClient.post('/auth/register-with-company', userData),
    
  logout: () =>
    apiClient.post('/auth/logout', { refreshToken: tokenUtils.getRefreshToken() }),
    
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
    
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
    
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, password: newPassword }),
    
  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }),
    
  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }),
    
  me: () =>
    apiClient.get('/auth/me'),
    
  updateProfile: (profileData: any) =>
    apiClient.put('/auth/profile', profileData),
    
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/auth/change-password', { currentPassword, newPassword })
};