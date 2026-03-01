import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI, tokenUtils } from '../config/api';
import { type AxiosError } from 'axios';

interface AuthUser {
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
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;

}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, displayName: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (profileData: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Normalize user object from API response
const enrichUser = (user: any): AuthUser => ({
  ...user,
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Clean up any invalid tokens first
        const accessToken = tokenUtils.getAccessToken();
        const refreshToken = tokenUtils.getRefreshToken();
        
        if (accessToken && !tokenUtils.isValidToken(accessToken)) {
          console.warn('Invalid access token detected on init, clearing tokens');
          tokenUtils.clearTokens();
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        if (refreshToken && !tokenUtils.isValidToken(refreshToken)) {
          console.warn('Invalid refresh token detected on init, clearing tokens');
          tokenUtils.clearTokens();
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        if (tokenUtils.isTokenValid()) {
          // Get current user data from API
          const response = await authAPI.me();
          setCurrentUser(enrichUser(response.data.user));
        } else {
          // Try to refresh token if available
          if (refreshToken && tokenUtils.isValidToken(refreshToken)) {
            try {
              const response = await authAPI.refreshToken(refreshToken);
              // The backend returns { success, message, data: { user, tokens } }
              const { user, tokens } = response.data.data;
              const { accessToken, refreshToken: newRefreshToken, expiresIn } = tokens;
              const rememberMe = tokenUtils.getRememberMe();
              tokenUtils.setTokens(accessToken, newRefreshToken, expiresIn, rememberMe);
              setCurrentUser(enrichUser(user));
            } catch (refreshError) {
              // Refresh failed, clear tokens
              tokenUtils.clearTokens();
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        tokenUtils.clearTokens();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for token expiration events
    const handleTokenExpired = () => {
      setCurrentUser(null);
      tokenUtils.clearTokens();
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await authAPI.login({ email, password, rememberMe });
      
      // The backend returns { success, message, data: { user, tokens } }
      const { user, tokens } = response.data.data;
      const { accessToken, refreshToken, expiresIn } = tokens;
      
      // Store tokens
      tokenUtils.setTokens(accessToken, refreshToken, expiresIn, rememberMe);
      
      // Set current user
      setCurrentUser(enrichUser(user));

      return { user, tokens };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    displayName: string, 
    firstName?: string, 
    lastName?: string
  ) => {
    try {
      // Use the new register-with-company endpoint that creates both user and company
      const response = await authAPI.registerWithCompany({
        email,
        password,
        firstName: firstName || displayName.split(' ')[0] || 'User',
        lastName: lastName || displayName.split(' ').slice(1).join(' ') || 'User',
        companyName: `${displayName}'s Company`
      });
      
      // The backend returns { success, message, data: { user, tokens } }
      const { user, tokens } = response.data.data;
      const { accessToken, refreshToken, expiresIn } = tokens;
      
      // Store tokens
      tokenUtils.setTokens(accessToken, refreshToken, expiresIn, false);
      
      // Set current user
      setCurrentUser(enrichUser(user));

      return { user, tokens };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout API to invalidate tokens on server
      await authAPI.logout();
    } catch (error) {
      // Even if API call fails, clear local tokens
      console.error('Logout API error:', error);
    } finally {
      // Clear tokens and user state
      tokenUtils.clearTokens();
      setCurrentUser(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authAPI.forgotPassword(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      setCurrentUser(enrichUser(response.data.user));
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData: Partial<AuthUser>) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setCurrentUser(enrichUser(response.data.user));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    refreshUser,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};