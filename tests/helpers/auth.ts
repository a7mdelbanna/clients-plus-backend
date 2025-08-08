import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
}

export interface MockTokenPayload {
  sub: string;
  email: string;
  companyId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Authentication helper for testing
 */
export class AuthTestHelper {
  private static jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret';
  private static jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';

  /**
   * Create a mock user object for testing
   */
  static createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      companyId: 'test-company-id',
      role: UserRole.USER,
      isActive: true,
      isVerified: true,
      ...overrides,
    };
  }

  /**
   * Generate a valid JWT token for testing
   */
  static generateToken(user: Partial<MockUser> = {}, expiresIn = '15m'): string {
    const mockUser = this.createMockUser(user);
    const payload: MockTokenPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      companyId: mockUser.companyId,
      role: mockUser.role,
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  /**
   * Generate a valid refresh token for testing
   */
  static generateRefreshToken(user: Partial<MockUser> = {}, expiresIn = '7d'): string {
    const mockUser = this.createMockUser(user);
    const payload: MockTokenPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      companyId: mockUser.companyId,
      role: mockUser.role,
    };

    return jwt.sign(payload, this.jwtRefreshSecret, { expiresIn });
  }

  /**
   * Generate an expired token for testing
   */
  static generateExpiredToken(user: Partial<MockUser> = {}): string {
    const mockUser = this.createMockUser(user);
    const payload: MockTokenPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      companyId: mockUser.companyId,
      role: mockUser.role,
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Generate an invalid token for testing
   */
  static generateInvalidToken(): string {
    return jwt.sign({ invalid: 'payload' }, 'wrong-secret');
  }

  /**
   * Generate a malformed token for testing
   */
  static generateMalformedToken(): string {
    return 'invalid.jwt.token';
  }

  /**
   * Verify a token (for testing purposes)
   */
  static verifyToken(token: string): MockTokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as MockTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Create authorization header for requests
   */
  static createAuthHeader(token?: string, user: Partial<MockUser> = {}): { Authorization: string } {
    const authToken = token || this.generateToken(user);
    return { Authorization: `Bearer ${authToken}` };
  }

  /**
   * Create admin user token
   */
  static createAdminToken(companyId = 'test-company-id'): string {
    return this.generateToken({
      id: 'admin-user-id',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      companyId,
      role: UserRole.ADMIN,
    });
  }

  /**
   * Create manager user token
   */
  static createManagerToken(companyId = 'test-company-id'): string {
    return this.generateToken({
      id: 'manager-user-id',
      email: 'manager@example.com',
      firstName: 'Manager',
      lastName: 'User',
      companyId,
      role: UserRole.MANAGER,
    });
  }

  /**
   * Create staff user token
   */
  static createStaffToken(companyId = 'test-company-id'): string {
    return this.generateToken({
      id: 'staff-user-id',
      email: 'staff@example.com',
      firstName: 'Staff',
      lastName: 'User',
      companyId,
      role: UserRole.STAFF,
    });
  }

  /**
   * Create super admin token
   */
  static createSuperAdminToken(): string {
    return this.generateToken({
      id: 'super-admin-id',
      email: 'superadmin@example.com',
      firstName: 'Super',
      lastName: 'Admin',
      companyId: 'system',
      role: UserRole.SUPER_ADMIN,
    });
  }

  /**
   * Create multiple user tokens for different companies (for multi-tenant testing)
   */
  static createMultiTenantTokens() {
    return {
      company1Admin: this.generateToken({
        id: 'admin-1',
        email: 'admin1@example.com',
        companyId: 'test-company-1',
        role: UserRole.ADMIN,
      }),
      company2Admin: this.generateToken({
        id: 'admin-2',
        email: 'admin2@example.com',
        companyId: 'test-company-2',
        role: UserRole.ADMIN,
      }),
      company1Staff: this.generateToken({
        id: 'staff-1',
        email: 'staff1@example.com',
        companyId: 'test-company-1',
        role: UserRole.STAFF,
      }),
      company2Staff: this.generateToken({
        id: 'staff-2',
        email: 'staff2@example.com',
        companyId: 'test-company-2',
        role: UserRole.STAFF,
      }),
    };
  }

  /**
   * Extract user info from token without verification (for testing)
   */
  static decodeToken(token: string): MockTokenPayload | null {
    try {
      return jwt.decode(token) as MockTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Create a token with custom claims for edge case testing
   */
  static createCustomToken(customPayload: any, secret?: string): string {
    return jwt.sign(customPayload, secret || this.jwtSecret);
  }

  /**
   * Get mock request context for authenticated user
   */
  static getMockRequestContext(user: Partial<MockUser> = {}) {
    const mockUser = this.createMockUser(user);
    return {
      user: mockUser,
      companyId: mockUser.companyId,
      userId: mockUser.id,
      userRole: mockUser.role,
    };
  }
}