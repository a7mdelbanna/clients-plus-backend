import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import {
  generateAccessToken,
  verifyAccessToken,
  extractTokenFromHeader,
  hasRole,
  hasAnyRole,
} from '../src/utils/jwt.utils';

// Mock the logger
jest.mock('../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('JWT Utils - Simple Tests', () => {
  const mockUserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    companyId: 'company-123',
    role: UserRole.USER,
    permissions: ['read', 'write'],
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
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const token = generateAccessToken(mockUserPayload);
      const payload = verifyAccessToken(token);
      
      expect(payload.userId).toBe(mockUserPayload.userId);
      expect(payload.email).toBe(mockUserPayload.email);
      expect(payload.companyId).toBe(mockUserPayload.companyId);
      expect(payload.role).toBe(mockUserPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow('Invalid or expired access token');
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
    });
  });

  describe('hasRole', () => {
    it('should allow same role', () => {
      expect(hasRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
    });

    it('should allow higher role to access lower role', () => {
      expect(hasRole(UserRole.ADMIN, UserRole.USER)).toBe(true);
    });

    it('should deny lower role accessing higher role', () => {
      expect(hasRole(UserRole.USER, UserRole.ADMIN)).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true if user has any of the required roles', () => {
      expect(hasAnyRole(UserRole.ADMIN, [UserRole.ADMIN, UserRole.USER])).toBe(true);
    });

    it('should return false if user has none of the required roles', () => {
      expect(hasAnyRole(UserRole.USER, [UserRole.ADMIN])).toBe(false);
    });
  });
});