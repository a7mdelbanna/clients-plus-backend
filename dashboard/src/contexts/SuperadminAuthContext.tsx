import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

interface SuperadminUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'superadmin';
  lastLogin: Date;
}

interface SuperadminAuthContextType {
  currentSuperadmin: SuperadminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAccess: () => boolean;
}

const SuperadminAuthContext = createContext<SuperadminAuthContextType | undefined>(undefined);

// Session storage key
const SUPERADMIN_SESSION_KEY = 'superadmin_session';
const SUPERADMIN_TOKEN_KEY = 'superadmin_token';

export const useSuperadminAuth = () => {
  const context = useContext(SuperadminAuthContext);
  if (context === undefined) {
    throw new Error('useSuperadminAuth must be used within a SuperadminAuthProvider');
  }
  return context;
};

interface SuperadminAuthProviderProps {
  children: React.ReactNode;
}

export const SuperadminAuthProvider: React.FC<SuperadminAuthProviderProps> = ({ children }) => {
  const [currentSuperadmin, setCurrentSuperadmin] = useState<SuperadminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSession = localStorage.getItem(SUPERADMIN_SESSION_KEY);
        if (savedSession) {
          const session = JSON.parse(savedSession);

          // Verify session is still valid (less than 24 hours old)
          const sessionAge = Date.now() - session.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours

          if (sessionAge < maxAge) {
            // Verify the session with the backend
            try {
              const token = localStorage.getItem(SUPERADMIN_TOKEN_KEY);
              if (token) {
                const response = await apiClient.get<ApiResponse<{ valid: boolean; user: any }>>(
                  '/auth/superadmin/verify',
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.data.data?.valid) {
                  setCurrentSuperadmin(session.user);
                } else {
                  localStorage.removeItem(SUPERADMIN_SESSION_KEY);
                  localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
                }
              } else {
                localStorage.removeItem(SUPERADMIN_SESSION_KEY);
              }
            } catch (error) {
              console.error('Error verifying superadmin session:', error);
              localStorage.removeItem(SUPERADMIN_SESSION_KEY);
              localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
            }
          } else {
            // Session expired
            localStorage.removeItem(SUPERADMIN_SESSION_KEY);
            localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading superadmin session:', error);
      }
      setLoading(false);
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.post<ApiResponse<{
        token: string;
        user: {
          uid: string;
          email: string;
          displayName: string;
          role: string;
        };
      }>>('/auth/superadmin/login', { email, password });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Login failed');
      }

      const { token, user } = response.data.data;

      if (user.role !== 'superadmin') {
        throw new Error('Access denied. This account does not have superadmin privileges.');
      }

      // Create superadmin session
      const superadminUser: SuperadminUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Superadmin',
        role: 'superadmin',
        lastLogin: new Date(),
      };

      // Save token and session
      localStorage.setItem(SUPERADMIN_TOKEN_KEY, token);
      const session = {
        user: superadminUser,
        timestamp: Date.now(),
      };
      localStorage.setItem(SUPERADMIN_SESSION_KEY, JSON.stringify(session));

      // Update state
      setCurrentSuperadmin(superadminUser);
    } catch (error: any) {
      console.error('Superadmin sign in error:', error);

      const message = error.response?.data?.message || error.message;
      if (message?.includes('not found') || message?.includes('user-not-found')) {
        throw new Error('No account found with this email.');
      } else if (message?.includes('password') || message?.includes('wrong-password')) {
        throw new Error('Incorrect password.');
      } else if (message?.includes('invalid-email')) {
        throw new Error('Invalid email address.');
      } else if (message?.includes('too-many-requests')) {
        throw new Error('Too many failed attempts. Please try again later.');
      }

      throw new Error(message || 'Login failed. Please try again.');
    }
  };

  const signOut = async () => {
    try {
      // Call logout endpoint
      try {
        await apiClient.post('/auth/superadmin/logout');
      } catch {
        // Ignore logout API errors
      }

      // Clear session
      localStorage.removeItem(SUPERADMIN_SESSION_KEY);
      localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
      setCurrentSuperadmin(null);
    } catch (error) {
      console.error('Superadmin sign out error:', error);
      throw error;
    }
  };

  const checkAccess = () => {
    const urlHash = import.meta.env.VITE_SUPERADMIN_URL_HASH;
    const currentPath = window.location.pathname;
    const expectedPath = `/sa-${urlHash}`;

    return currentPath.startsWith(expectedPath) && currentSuperadmin !== null;
  };

  const value = {
    currentSuperadmin,
    loading,
    signIn,
    signOut,
    checkAccess,
  };

  return (
    <SuperadminAuthContext.Provider value={value}>
      {children}
    </SuperadminAuthContext.Provider>
  );
};
