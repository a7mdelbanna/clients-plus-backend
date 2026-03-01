import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

// API Configuration constants
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Token storage keys
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
} as const;

// Token management utilities
export class TokenManager {
  static setTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
    
    if (expiresIn) {
      const expiry = Date.now() + expiresIn * 1000;
      localStorage.setItem(TOKEN_KEYS.TOKEN_EXPIRY, expiry.toString());
    }
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
  }

  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(TOKEN_KEYS.TOKEN_EXPIRY);
    if (!expiry) return false;
    return Date.now() > parseInt(expiry);
  }

  static clearTokens(): void {
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.TOKEN_EXPIRY);
  }

  static hasValidToken(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isTokenExpired();
  }
}

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

// Create axios instance with base configuration
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config: any) => {
      const token = TokenManager.getAccessToken();
      
      if (token && TokenManager.hasValidToken()) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }

      // Add request timestamp for debugging
      (config as any).metadata = { startTime: new Date() };
      
      return config;
    },
    (error: AxiosError) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling and token refresh
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response time for debugging
      const endTime = new Date();
      const startTime = (response.config as any).metadata?.startTime || endTime;
      const duration = endTime.getTime() - startTime.getTime();
      
      if (import.meta.env.DEV) {
        console.log(`API Call: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized errors
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Attempt to refresh token
          const refreshToken = TokenManager.getRefreshToken();
          if (refreshToken) {
            const refreshResponse = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            if (refreshResponse.data.success) {
              const { accessToken, refreshToken: newRefreshToken, expiresIn } = refreshResponse.data.data;
              
              TokenManager.setTokens(accessToken, newRefreshToken, expiresIn);
              
              // Retry the original request with new token
              originalRequest.headers = {
                ...originalRequest.headers,
                Authorization: `Bearer ${accessToken}`,
              };
              
              return instance(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          
          // Clear invalid tokens and redirect to login
          TokenManager.clearTokens();
          
          // Emit custom event for auth failure
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
          
          return Promise.reject(refreshError);
        }
      }

      // Handle network errors with retry logic
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        return handleRetry(instance, originalRequest, error);
      }

      // Handle other HTTP errors
      if (error.response) {
        const apiError: ApiError = {
          success: false,
          message: (error.response.data as any)?.message || 'An error occurred',
          error: (error.response.data as any)?.error || 'API_ERROR',
          errors: (error.response.data as any)?.errors,
        };
        
        console.error('API Error:', apiError);
        return Promise.reject(apiError);
      }

      // Handle request setup errors
      if (error.request) {
        const networkError: ApiError = {
          success: false,
          message: 'Network error - please check your connection',
          error: 'NETWORK_ERROR',
        };
        
        console.error('Network Error:', error);
        return Promise.reject(networkError);
      }

      // Handle other errors
      const unknownError: ApiError = {
        success: false,
        message: error.message || 'An unknown error occurred',
        error: 'UNKNOWN_ERROR',
      };
      
      console.error('Unknown Error:', error);
      return Promise.reject(unknownError);
    }
  );

  return instance;
};

// Retry logic for failed requests
const handleRetry = async (
  instance: AxiosInstance, 
  config: AxiosRequestConfig, 
  error: AxiosError
): Promise<AxiosResponse> => {
  const retryConfig = config as AxiosRequestConfig & { _retryCount?: number };
  retryConfig._retryCount = retryConfig._retryCount || 0;

  if (retryConfig._retryCount < API_CONFIG.RETRY_ATTEMPTS) {
    retryConfig._retryCount++;
    
    // Exponential backoff
    const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, retryConfig._retryCount - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`Retrying request (${retryConfig._retryCount}/${API_CONFIG.RETRY_ATTEMPTS}):`, config.url);
    
    return instance(retryConfig);
  }

  return Promise.reject(error);
};

// Create and export the configured axios instance
export const apiClient = createAxiosInstance();

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

// Request/Response logging (development only)
if (import.meta.env.DEV) {
  // Add request logging
  apiClient.interceptors.request.use(
    (config) => {
      console.group(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Headers:', config.headers);
      if (config.data) {
        console.log('Data:', config.data);
      }
      if (config.params) {
        console.log('Params:', config.params);
      }
      console.groupEnd();
      return config;
    }
  );

  // Add response logging
  apiClient.interceptors.response.use(
    (response) => {
      console.group(`✅ API Response: ${response.status} ${response.config.url}`);
      console.log('Data:', response.data);
      console.groupEnd();
      return response;
    },
    (error) => {
      console.group(`❌ API Error: ${error.config?.url}`);
      console.error('Error:', error);
      if (error.response) {
        console.log('Response:', error.response.data);
      }
      console.groupEnd();
      return Promise.reject(error);
    }
  );
}

// Export utility functions
export { createAxiosInstance };

// Default export
export default apiClient;