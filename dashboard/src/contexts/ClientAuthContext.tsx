import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

interface ClientSession {
  clientId: string;
  phoneNumber: string;
  name: string;
  token: string;
  expiresAt: Date;
}

interface ClientAuthContextType {
  session: ClientSession | null;
  loading: boolean;
  login: (phoneNumber: string) => Promise<{ success: boolean; message?: string }>;
  verifyOTP: (otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within ClientAuthProvider');
  }
  return context;
};

interface ClientAuthProviderProps {
  children: ReactNode;
}

const SESSION_KEY = 'clientPortalSession';

export const ClientAuthProvider: React.FC<ClientAuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState<string>('');
  const navigate = useNavigate();

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const expiresAt = new Date(parsed.expiresAt);

        // Check if session is still valid
        if (expiresAt > new Date()) {
          setSession(parsed);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.error('Error loading client session:', error);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (phoneNumber: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Store the phone number for OTP verification
      setPendingPhone(phoneNumber);

      const response = await apiClient.post<ApiResponse<{ sessionId: string }>>(
        '/auth/client/send-otp',
        { phoneNumber }
      );

      if (response.data.success && response.data.data?.sessionId) {
        sessionStorage.setItem('otpSessionId', response.data.data.sessionId);
        return { success: true };
      } else {
        return {
          success: false,
          message: response.data.message || 'فشل إرسال رمز التحقق',
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);

      const message = error.response?.data?.message;
      if (error.response?.status === 429) {
        return {
          success: false,
          message: 'تم تجاوز عدد المحاولات المسموح. حاول بعد 15 دقيقة.',
        };
      }

      return {
        success: false,
        message: message || 'فشل إرسال رمز التحقق. حاول مرة أخرى.',
      };
    }
  };

  const verifyOTP = async (otp: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const sessionId = sessionStorage.getItem('otpSessionId');

      const response = await apiClient.post<ApiResponse<{
        session: {
          clientId: string;
          phoneNumber: string;
          name: string;
          token: string;
          expiresAt: string;
        };
      }>>('/auth/client/verify-otp', {
        phoneNumber: pendingPhone,
        otp,
        sessionId,
      });

      if (response.data.success && response.data.data?.session) {
        const sessionData = response.data.data.session;
        const clientSession: ClientSession = {
          clientId: sessionData.clientId,
          phoneNumber: sessionData.phoneNumber,
          name: sessionData.name,
          token: sessionData.token,
          expiresAt: new Date(sessionData.expiresAt),
        };

        setSession(clientSession);
        localStorage.setItem(SESSION_KEY, JSON.stringify(clientSession));
        sessionStorage.removeItem('otpSessionId');

        return { success: true };
      } else {
        return {
          success: false,
          message: response.data.message || 'رمز التحقق غير صحيح',
        };
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);

      const message = error.response?.data?.message;
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'انتهت صلاحية رمز التحقق. اطلب رمز جديد.',
        };
      }

      if (error.response?.status === 403) {
        return {
          success: false,
          message: message || 'رمز التحقق غير صحيح',
        };
      }

      return {
        success: false,
        message: 'حدث خطأ في التحقق. حاول مرة أخرى.',
      };
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    navigate('/client/login');
  };

  const value: ClientAuthContextType = {
    session,
    loading,
    login,
    verifyOTP,
    logout,
    isAuthenticated: !!session,
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
};
