import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UserRole } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  companyId: string;
  role: UserRole;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  companyId: string;
  tokenId: string; // Unique identifier for this refresh token
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

// In-memory token blacklist - In production, use Redis or database
const blacklistedTokens = new Set<string>();
const blacklistedRefreshTokens = new Set<string>();

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '15m', // 15 minutes for access token
      issuer: 'clients-plus-api',
      audience: 'clients-plus-frontend',
    });
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: '7d', // 7 days for refresh token
      issuer: 'clients-plus-api',
      audience: 'clients-plus-frontend',
    });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Generate token pair (access + refresh tokens)
 */
export const generateTokenPair = (
  userPayload: Omit<JWTPayload, 'iat' | 'exp'>,
  refreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'>
): TokenPair => {
  const accessToken = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken(refreshPayload);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
    refreshExpiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
  };
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    // Check if token is blacklisted
    if (blacklistedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'clients-plus-api',
      audience: 'clients-plus-frontend',
    }) as JWTPayload;

    return payload;
  } catch (error) {
    logger.warn('Invalid access token:', error);
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify JWT refresh token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    // Check if token is blacklisted
    if (blacklistedRefreshTokens.has(token)) {
      throw new Error('Refresh token has been revoked');
    }

    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'clients-plus-api',
      audience: 'clients-plus-frontend',
    }) as RefreshTokenPayload;

    return payload;
  } catch (error) {
    logger.warn('Invalid refresh token:', error);
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
};

/**
 * Decode JWT token without verification (for expired token inspection)
 */
export const decodeToken = (token: string): JWTPayload | RefreshTokenPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload | RefreshTokenPayload;
  } catch (error) {
    logger.warn('Error decoding token:', error);
    return null;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expirationDate = getTokenExpiration(token);
  if (!expirationDate) {
    return true;
  }
  return new Date() > expirationDate;
};

/**
 * Blacklist access token (for logout)
 */
export const blacklistAccessToken = (token: string): void => {
  blacklistedTokens.add(token);
  
  // Clean up expired tokens periodically
  setTimeout(() => {
    if (isTokenExpired(token)) {
      blacklistedTokens.delete(token);
    }
  }, 15 * 60 * 1000); // Clean up after 15 minutes
};

/**
 * Blacklist refresh token (for logout)
 */
export const blacklistRefreshToken = (token: string): void => {
  blacklistedRefreshTokens.add(token);
  
  // Clean up expired tokens periodically
  setTimeout(() => {
    if (isTokenExpired(token)) {
      blacklistedRefreshTokens.delete(token);
    }
  }, 7 * 24 * 60 * 60 * 1000); // Clean up after 7 days
};

/**
 * Generate unique token ID for refresh tokens
 */
export const generateTokenId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Validate token payload structure
 */
export const validateTokenPayload = (payload: any): payload is JWTPayload => {
  return (
    payload &&
    typeof payload.userId === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.companyId === 'string' &&
    typeof payload.role === 'string'
  );
};

/**
 * Check if user has required role
 */
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    SUPER_ADMIN: 6,
    ADMIN: 5,
    MANAGER: 4,
    USER: 3,
    STAFF: 2,
    RECEPTIONIST: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Check if user has any of the required roles
 */
export const hasAnyRole = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.some(role => hasRole(userRole, role));
};

/**
 * Clean up expired blacklisted tokens (should be called periodically)
 */
export const cleanupBlacklistedTokens = (): void => {
  // Clean up access tokens
  for (const token of blacklistedTokens) {
    if (isTokenExpired(token)) {
      blacklistedTokens.delete(token);
    }
  }
  
  // Clean up refresh tokens
  for (const token of blacklistedRefreshTokens) {
    if (isTokenExpired(token)) {
      blacklistedRefreshTokens.delete(token);
    }
  }
  
  logger.info(`Cleaned up expired blacklisted tokens. Access: ${blacklistedTokens.size}, Refresh: ${blacklistedRefreshTokens.size}`);
};

// Schedule cleanup every hour (only in non-test environment)
let cleanupInterval: NodeJS.Timeout | undefined;
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(cleanupBlacklistedTokens, 60 * 60 * 1000);
}

// Export cleanup function for testing
export const stopCleanupInterval = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = undefined;
  }
};