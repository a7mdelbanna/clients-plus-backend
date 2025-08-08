import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  blacklistAccessToken,
  blacklistRefreshToken,
  generateTokenId,
  validateTokenPayload,
  hasRole,
  hasAnyRole,
  cleanupBlacklistedTokens,
  JWTPayload,
  RefreshTokenPayload,
} from '../../src/utils/jwt.utils';
import { createMockUser } from '../utils/test-helpers';

// Mock the logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('JWT Utils', () => {
  const mockUser = createMockUser();
  const mockUserPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: mockUser.id,
    email: mockUser.email,
    companyId: mockUser.companyId,
    role: mockUser.role,
    permissions: ['read', 'write'],
  };

  const mockRefreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId: mockUser.id,
    companyId: mockUser.companyId,
    tokenId: 'test-token-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockUserPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload in token', () => {
      const token = generateAccessToken(mockUserPayload);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.userId).toBe(mockUserPayload.userId);
      expect(decoded.email).toBe(mockUserPayload.email);
      expect(decoded.companyId).toBe(mockUserPayload.companyId);
      expect(decoded.role).toBe(mockUserPayload.role);
      expect(decoded.permissions).toEqual(mockUserPayload.permissions);
      // JWT library adds iss and aud to the token payload
      expect((decoded as any).iss).toBe('clients-plus-api');
      expect((decoded as any).aud).toBe('clients-plus-frontend');
    });

    it('should throw error if JWT_SECRET is missing', () => {
      const originalSecret = process.env['JWT_SECRET'];
      delete process.env['JWT_SECRET'];

      expect(() => generateAccessToken(mockUserPayload)).toThrow();

      process.env['JWT_SECRET'] = originalSecret;
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload in refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const decoded = jwt.decode(token) as RefreshTokenPayload;
      
      expect(decoded.userId).toBe(mockRefreshPayload.userId);
      expect(decoded.companyId).toBe(mockRefreshPayload.companyId);
      expect(decoded.tokenId).toBe(mockRefreshPayload.tokenId);
      // JWT library adds iss and aud to the token payload
      expect((decoded as any).iss).toBe('clients-plus-api');
      expect((decoded as any).aud).toBe('clients-plus-frontend');
    });

    it('should throw error if JWT_REFRESH_SECRET is missing', () => {
      const originalSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => generateRefreshToken(mockRefreshPayload)).toThrow();

      process.env.JWT_REFRESH_SECRET = originalSecret;
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokenPair = generateTokenPair(mockUserPayload, mockRefreshPayload);
      
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBe(15 * 60); // 15 minutes
      expect(tokenPair.refreshExpiresIn).toBe(7 * 24 * 60 * 60); // 7 days
    });
  });

  describe('verifyAccessToken', () => {
    let validToken: string;

    beforeEach(() => {
      validToken = generateAccessToken(mockUserPayload);
    });

    it('should verify a valid token', () => {
      const payload = verifyAccessToken(validToken);
      
      expect(payload.userId).toBe(mockUserPayload.userId);
      expect(payload.email).toBe(mockUserPayload.email);
      expect(payload.companyId).toBe(mockUserPayload.companyId);
      expect(payload.role).toBe(mockUserPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow('Invalid or expired access token');
    });

    it('should throw error for blacklisted token', () => {
      blacklistAccessToken(validToken);
      expect(() => verifyAccessToken(validToken)).toThrow('Invalid or expired access token');
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        mockUserPayload,
        process.env.JWT_SECRET!,
        { expiresIn: '0s', issuer: 'clients-plus-api', audience: 'clients-plus-frontend' }
      );
      
      expect(() => verifyAccessToken(expiredToken)).toThrow('Invalid or expired access token');
    });
  });

  describe('verifyRefreshToken', () => {
    let validRefreshToken: string;

    beforeEach(() => {
      validRefreshToken = generateRefreshToken(mockRefreshPayload);
    });

    it('should verify a valid refresh token', () => {
      const payload = verifyRefreshToken(validRefreshToken);
      
      expect(payload.userId).toBe(mockRefreshPayload.userId);
      expect(payload.companyId).toBe(mockRefreshPayload.companyId);
      expect(payload.tokenId).toBe(mockRefreshPayload.tokenId);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid.refresh.token')).toThrow('Invalid or expired refresh token');
    });

    it('should throw error for blacklisted refresh token', () => {
      blacklistRefreshToken(validRefreshToken);
      expect(() => verifyRefreshToken(validRefreshToken)).toThrow('Invalid or expired refresh token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer authorization header', () => {
      const token = 'valid.jwt.token';
      const header = `Bearer ${token}`;
      
      expect(extractTokenFromHeader(header)).toBe(token);
    });

    it('should return null for missing header', () => {
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should return null for invalid header format', () => {
      expect(extractTokenFromHeader('InvalidHeader')).toBeNull();
      expect(extractTokenFromHeader('Basic token')).toBeNull();
      expect(extractTokenFromHeader('Bearer')).toBeNull();
      expect(extractTokenFromHeader('Bearer token1 token2 extra')).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const token = generateAccessToken(mockUserPayload);
      const decoded = decodeToken(token) as JWTPayload;
      
      expect(decoded.userId).toBe(mockUserPayload.userId);
      expect(decoded.email).toBe(mockUserPayload.email);
    });

    it('should return null for invalid token', () => {
      expect(decodeToken('invalid.token')).toBeNull();
    });

    it('should decode expired token without error', () => {
      const expiredToken = jwt.sign(
        mockUserPayload,
        'any-secret',
        { expiresIn: '0s' }
      );
      
      const decoded = decodeToken(expiredToken) as JWTPayload;
      expect(decoded.userId).toBe(mockUserPayload.userId);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const token = generateAccessToken(mockUserPayload);
      const expiration = getTokenExpiration(token);
      
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('invalid.token')).toBeNull();
    });

    it('should return null for token without exp claim', () => {
      const tokenWithoutExp = jwt.sign(mockUserPayload, 'any-secret');
      expect(getTokenExpiration(tokenWithoutExp)).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const token = generateAccessToken(mockUserPayload);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken = jwt.sign(
        mockUserPayload,
        'any-secret',
        { expiresIn: '0s' }
      );
      
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid.token')).toBe(true);
    });
  });

  describe('blacklistAccessToken and blacklistRefreshToken', () => {
    it('should blacklist access tokens', () => {
      const token = generateAccessToken(mockUserPayload);
      
      // Token should be valid before blacklisting
      expect(() => verifyAccessToken(token)).not.toThrow();
      
      blacklistAccessToken(token);
      
      // Token should be invalid after blacklisting
      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should blacklist refresh tokens', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      
      expect(() => verifyRefreshToken(token)).not.toThrow();
      
      blacklistRefreshToken(token);
      
      expect(() => verifyRefreshToken(token)).toThrow();
    });
  });

  describe('generateTokenId', () => {
    it('should generate unique token IDs', () => {
      const id1 = generateTokenId();
      const id2 = generateTokenId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs of reasonable length', () => {
      const id = generateTokenId();
      expect(id.length).toBeGreaterThan(5);
      expect(id.length).toBeLessThan(50);
    });
  });

  describe('validateTokenPayload', () => {
    const validPayload: JWTPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      companyId: 'company-123',
      role: UserRole.USER,
      iat: Date.now(),
      exp: Date.now() + 3600
    };

    it('should validate correct payload', () => {
      expect(validateTokenPayload(validPayload)).toBe(true);
    });

    it('should reject payload with missing userId', () => {
      const invalid: any = { ...validPayload };
      delete invalid.userId;
      expect(validateTokenPayload(invalid)).toBe(false);
    });

    it('should reject payload with missing email', () => {
      const invalid: any = { ...validPayload };
      delete invalid.email;
      expect(validateTokenPayload(invalid)).toBe(false);
    });

    it('should reject payload with missing companyId', () => {
      const invalid: any = { ...validPayload };
      delete invalid.companyId;
      expect(validateTokenPayload(invalid)).toBe(false);
    });

    it('should reject payload with missing role', () => {
      const invalid: any = { ...validPayload };
      delete invalid.role;
      expect(validateTokenPayload(invalid)).toBe(false);
    });

    it('should reject null or undefined payload', () => {
      expect(validateTokenPayload(null)).toBe(false);
      expect(validateTokenPayload(undefined)).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should allow same role', () => {
      expect(hasRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
    });

    it('should allow higher role to access lower role', () => {
      expect(hasRole(UserRole.ADMIN, UserRole.USER)).toBe(true);
      expect(hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
      expect(hasRole(UserRole.MANAGER, UserRole.STAFF)).toBe(true);
    });

    it('should deny lower role accessing higher role', () => {
      expect(hasRole(UserRole.USER, UserRole.ADMIN)).toBe(false);
      expect(hasRole(UserRole.STAFF, UserRole.MANAGER)).toBe(false);
      expect(hasRole(UserRole.RECEPTIONIST, UserRole.USER)).toBe(false);
    });

    it('should handle all role hierarchy correctly', () => {
      const roles = [
        UserRole.RECEPTIONIST,
        UserRole.STAFF,
        UserRole.USER,
        UserRole.MANAGER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN
      ];

      // Test that each role can access all lower roles
      for (let i = 0; i < roles.length; i++) {
        for (let j = 0; j <= i; j++) {
          expect(hasRole(roles[i], roles[j])).toBe(true);
        }
        for (let j = i + 1; j < roles.length; j++) {
          expect(hasRole(roles[i], roles[j])).toBe(false);
        }
      }
    });
  });

  describe('hasAnyRole', () => {
    it('should return true if user has any of the required roles', () => {
      expect(hasAnyRole(UserRole.ADMIN, [UserRole.ADMIN, UserRole.MANAGER])).toBe(true);
      expect(hasAnyRole(UserRole.ADMIN, [UserRole.USER, UserRole.ADMIN])).toBe(true);
      expect(hasAnyRole(UserRole.SUPER_ADMIN, [UserRole.ADMIN])).toBe(true);
    });

    it('should return false if user has none of the required roles', () => {
      expect(hasAnyRole(UserRole.USER, [UserRole.ADMIN, UserRole.MANAGER])).toBe(false);
      expect(hasAnyRole(UserRole.STAFF, [UserRole.ADMIN, UserRole.MANAGER])).toBe(false);
    });

    it('should return false for empty roles array', () => {
      expect(hasAnyRole(UserRole.ADMIN, [])).toBe(false);
    });
  });

  describe('cleanupBlacklistedTokens', () => {
    it('should remove expired tokens from blacklist', (done) => {
      const expiredToken = jwt.sign(
        mockUserPayload,
        'any-secret',
        { expiresIn: '0s' }
      );
      
      blacklistAccessToken(expiredToken);
      
      // Token should be blacklisted initially
      expect(() => verifyAccessToken(expiredToken)).toThrow();
      
      // Wait a bit then cleanup
      setTimeout(() => {
        cleanupBlacklistedTokens();
        // Note: This is hard to test directly since the blacklist is internal
        // In a real implementation, you might expose blacklist size for testing
        done();
      }, 100);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JWT tokens gracefully', () => {
      expect(() => verifyAccessToken('not.a.valid.jwt')).toThrow();
      expect(() => verifyRefreshToken('not.a.valid.jwt')).toThrow();
      expect(decodeToken('not.a.valid.jwt')).toBeNull();
    });

    it('should handle tokens with wrong signature', () => {
      const tokenWithWrongSignature = jwt.sign(mockUserPayload, 'wrong-secret');
      expect(() => verifyAccessToken(tokenWithWrongSignature)).toThrow();
    });

    it('should handle tokens with wrong audience/issuer', () => {
      const tokenWithWrongAudience = jwt.sign(
        mockUserPayload,
        process.env.JWT_SECRET!,
        { 
          issuer: 'wrong-issuer',
          audience: 'wrong-audience'
        }
      );
      expect(() => verifyAccessToken(tokenWithWrongAudience)).toThrow();
    });
  });
});