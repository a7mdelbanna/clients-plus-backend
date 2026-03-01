import { useState, useEffect, useCallback } from 'react';
import { tokenUtils } from '../config/api';
import { authService } from '../services/auth.service';

interface TokenManagerState {
  isTokenValid: boolean;
  isRefreshing: boolean;
  tokenExpiry: number | null;
  timeUntilExpiry: number;
}

export const useTokenManager = () => {
  const [state, setState] = useState<TokenManagerState>({
    isTokenValid: false,
    isRefreshing: false,
    tokenExpiry: null,
    timeUntilExpiry: 0,
  });

  const updateTokenState = useCallback(() => {
    const expiry = tokenUtils.getTokenExpiry();
    const isValid = tokenUtils.isTokenValid();
    const timeUntilExpiry = expiry ? Math.max(0, expiry - Date.now()) : 0;

    setState(prev => ({
      ...prev,
      isTokenValid: isValid,
      tokenExpiry: expiry,
      timeUntilExpiry,
    }));
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = tokenUtils.getRefreshToken();
    
    if (!refreshTokenValue) {
      return false;
    }

    setState(prev => ({ ...prev, isRefreshing: true }));

    try {
      const response = await authService.refreshToken(refreshTokenValue);
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response;
      const rememberMe = tokenUtils.getRememberMe();

      tokenUtils.setTokens(accessToken, newRefreshToken, expiresIn, rememberMe);
      updateTokenState();
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      tokenUtils.clearTokens();
      updateTokenState();
      
      // Dispatch custom event for logout
      window.dispatchEvent(new CustomEvent('auth:token-refresh-failed'));
      
      return false;
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [updateTokenState]);

  const clearTokens = useCallback(() => {
    tokenUtils.clearTokens();
    updateTokenState();
  }, [updateTokenState]);

  const getTimeUntilExpiry = useCallback((): number => {
    const expiry = tokenUtils.getTokenExpiry();
    return expiry ? Math.max(0, expiry - Date.now()) : 0;
  }, []);

  const getMinutesUntilExpiry = useCallback((): number => {
    return Math.floor(getTimeUntilExpiry() / (1000 * 60));
  }, [getTimeUntilExpiry]);

  const shouldRefreshToken = useCallback((): boolean => {
    const minutesLeft = getMinutesUntilExpiry();
    return minutesLeft <= 5 && minutesLeft > 0; // Refresh when 5 minutes or less remaining
  }, [getMinutesUntilExpiry]);

  // Auto-refresh token when needed
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      if (shouldRefreshToken() && !state.isRefreshing) {
        console.log('Auto-refreshing token...');
        await refreshToken();
      }
    };

    const interval = setInterval(() => {
      updateTokenState();
      checkAndRefreshToken();
    }, 60000); // Check every minute

    // Initial check
    updateTokenState();
    checkAndRefreshToken();

    return () => clearInterval(interval);
  }, [shouldRefreshToken, refreshToken, updateTokenState, state.isRefreshing]);

  // Listen for visibility change to refresh token when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTokenState();
        if (shouldRefreshToken() && !state.isRefreshing) {
          refreshToken();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [shouldRefreshToken, refreshToken, updateTokenState, state.isRefreshing]);

  return {
    ...state,
    refreshToken,
    clearTokens,
    updateTokenState,
    getTimeUntilExpiry,
    getMinutesUntilExpiry,
    shouldRefreshToken,
  };
};