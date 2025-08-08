import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermissions,
  requireAnyRole,
  requireSameCompany,
  requireActiveCompany,
  authenticate,
  authenticateWithRole,
  authenticateWithPermissions,
  authenticateWithCompany,
} from '../../src/middleware/auth.middleware';
import * as jwtUtils from '../../src/utils/jwt.utils';
import * as authService from '../../src/services/auth.service';
import {
  createMockUser,
  createMockReq,
  createMockRes,
  createMockNext,
  TestHttpStatus,
  resetAllMocks,
} from '../utils/test-helpers';

// Mock JWT utils
jest.mock('../../src/utils/jwt.utils');

// Mock auth service
jest.mock('../../src/services/auth.service');

// Mock logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  
  const mockUser = createMockUser();
  const mockJWTPayload = {
    userId: mockUser.id,
    email: mockUser.email,
    companyId: mockUser.companyId,
    role: mockUser.role,
    permissions: ['read', 'write'],
  };

  beforeEach(() => {
    mockReq = createMockReq();
    mockRes = createMockRes();
    mockNext = createMockNext();
    resetAllMocks();

    // Default mock implementations
    (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('valid.token');
    (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockJWTPayload);
    (authService.authService.getUserById as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('authenticateToken', () => {
    it('should authenticate user with valid token', async () => {
      mockReq.headers = { authorization: 'Bearer valid.token' };

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(jwtUtils.extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid.token');
      expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid.token');
      expect(authService.authService.getUserById).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId
      );
      expect(mockReq.user).toEqual(mockJWTPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error for missing authorization header', async () => {
      (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for invalid token', async () => {
      (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for expired token', async () => {
      (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token has expired',
        error: 'TOKEN_EXPIRED',
      });
    });

    it('should return error for revoked token', async () => {
      (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token has been revoked');
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token has been revoked',
        error: 'TOKEN_REVOKED',
      });
    });

    it('should return error if user not found', async () => {
      (authService.authService.getUserById as jest.Mock).mockResolvedValue(null);

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found or inactive',
        error: 'USER_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate user when valid token provided', async () => {
      mockReq.headers = { authorization: 'Bearer valid.token' };

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockJWTPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      (jwtUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when user not found', async () => {
      (authService.authService.getUserById as jest.Mock).mockResolvedValue(null);

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (jwtUtils.extractTokenFromHeader as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      mockReq.user = { ...mockJWTPayload, role: UserRole.ADMIN };
      const middleware = requireRole(UserRole.ADMIN);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow user with higher role', () => {
      mockReq.user = { ...mockJWTPayload, role: UserRole.SUPER_ADMIN };
      const middleware = requireRole(UserRole.ADMIN);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user with lower role', () => {
      mockReq.user = { ...mockJWTPayload, role: UserRole.USER };
      const middleware = requireRole(UserRole.ADMIN);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_ROLE',
        required: UserRole.ADMIN,
        current: UserRole.USER,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated user', () => {
      mockReq.user = undefined;
      const middleware = requireRole(UserRole.USER);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle role hierarchy correctly', () => {
      const testCases = [
        { userRole: UserRole.SUPER_ADMIN, requiredRole: UserRole.ADMIN, shouldPass: true },
        { userRole: UserRole.ADMIN, requiredRole: UserRole.MANAGER, shouldPass: true },
        { userRole: UserRole.MANAGER, requiredRole: UserRole.USER, shouldPass: true },
        { userRole: UserRole.USER, requiredRole: UserRole.STAFF, shouldPass: true },
        { userRole: UserRole.STAFF, requiredRole: UserRole.RECEPTIONIST, shouldPass: true },
        { userRole: UserRole.RECEPTIONIST, requiredRole: UserRole.STAFF, shouldPass: false },
        { userRole: UserRole.USER, requiredRole: UserRole.ADMIN, shouldPass: false },
      ];

      testCases.forEach(({ userRole, requiredRole, shouldPass }) => {
        const newMockReq = createMockReq();
        const newMockRes = createMockRes();
        const newMockNext = createMockNext();

        newMockReq.user = { ...mockJWTPayload, role: userRole };
        const middleware = requireRole(requiredRole);

        middleware(newMockReq, newMockRes as any, newMockNext);

        if (shouldPass) {
          expect(newMockNext).toHaveBeenCalled();
        } else {
          expect(newMockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
          expect(newMockNext).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('requirePermissions', () => {
    it('should allow user with all required permissions', () => {
      mockReq.user = { ...mockJWTPayload, permissions: ['read', 'write', 'delete'] };
      const middleware = requirePermissions(['read', 'write']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user missing some permissions', () => {
      mockReq.user = { ...mockJWTPayload, permissions: ['read'] };
      const middleware = requirePermissions(['read', 'write', 'delete']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: ['read', 'write', 'delete'],
        current: ['read'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user with no permissions', () => {
      mockReq.user = { ...mockJWTPayload, permissions: undefined };
      const middleware = requirePermissions(['read']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: ['read'],
        current: [],
      });
    });

    it('should deny unauthenticated user', () => {
      mockReq.user = undefined;
      const middleware = requirePermissions(['read']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    });

    it('should allow empty permissions array', () => {
      mockReq.user = { ...mockJWTPayload, permissions: [] };
      const middleware = requirePermissions([]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAnyRole', () => {
    it('should allow user with one of the required roles', () => {
      mockReq.user = { ...mockJWTPayload, role: UserRole.ADMIN };
      const middleware = requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow user with higher role than any required', () => {
      mockReq.user = { ...mockJWTPayload, role: UserRole.SUPER_ADMIN };
      const middleware = requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user with none of the required roles', () => {
      mockReq.user = { ...mockJWTPayload, role: UserRole.RECEPTIONIST };
      const middleware = requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_ROLE',
        required: [UserRole.ADMIN, UserRole.MANAGER],
        current: UserRole.RECEPTIONIST,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated user', () => {
      mockReq.user = undefined;
      const middleware = requireAnyRole([UserRole.ADMIN]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireSameCompany', () => {
    beforeEach(() => {
      mockReq.user = mockJWTPayload;
    });

    it('should allow access when no company ID in request', () => {
      requireSameCompany(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when company IDs match (params)', () => {
      mockReq.params = { companyId: mockUser.companyId };

      requireSameCompany(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when company IDs match (query)', () => {
      mockReq.query = { companyId: mockUser.companyId };

      requireSameCompany(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when company IDs match (body)', () => {
      mockReq.body = { companyId: mockUser.companyId };

      requireSameCompany(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when company IDs do not match', () => {
      mockReq.params = { companyId: 'different-company-id' };

      requireSameCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied: Company isolation violation',
        error: 'COMPANY_ACCESS_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated user', () => {
      mockReq.user = undefined;

      requireSameCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireActiveCompany', () => {
    beforeEach(() => {
      mockReq.user = mockJWTPayload;
      (authService.authService.validateUserAccess as jest.Mock).mockResolvedValue(true);
    });

    it('should allow access for active company', async () => {
      await requireActiveCompany(mockReq, mockRes, mockNext);

      expect(authService.authService.validateUserAccess).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for inactive company', async () => {
      (authService.authService.validateUserAccess as jest.Mock).mockResolvedValue(false);

      await requireActiveCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company account is not active',
        error: 'COMPANY_INACTIVE',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated user', async () => {
      mockReq.user = undefined;

      await requireActiveCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      (authService.authService.validateUserAccess as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await requireActiveCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error validating access',
        error: 'VALIDATION_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Combined middleware arrays', () => {
    beforeEach(() => {
      mockReq.headers = { authorization: 'Bearer valid.token' };
      mockReq.user = mockJWTPayload;
      (authService.authService.validateUserAccess as jest.Mock).mockResolvedValue(true);
    });

    describe('authenticate', () => {
      it('should combine authenticateToken and requireActiveCompany', async () => {
        const middlewares = authenticate;
        
        expect(middlewares).toHaveLength(2);
        
        // Test first middleware (authenticateToken)
        await middlewares[0](mockReq, mockRes, mockNext);
        expect(mockReq.user).toBeDefined();
        
        // Test second middleware (requireActiveCompany)
        await middlewares[1](mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(2);
      });
    });

    describe('authenticateWithRole', () => {
      it('should combine authentication with role requirement', async () => {
        const middlewares = authenticateWithRole(UserRole.ADMIN);
        
        expect(middlewares).toHaveLength(3);
        
        // Set user with admin role for testing
        mockReq.user = { ...mockJWTPayload, role: UserRole.ADMIN };
        
        // Test all middlewares
        for (const middleware of middlewares) {
          await middleware(mockReq, mockRes, mockNext);
        }
        
        expect(mockNext).toHaveBeenCalledTimes(3);
      });
    });

    describe('authenticateWithPermissions', () => {
      it('should combine authentication with permission requirement', async () => {
        const middlewares = authenticateWithPermissions(['read', 'write']);
        
        expect(middlewares).toHaveLength(3);
        
        // Set user with required permissions
        mockReq.user = { ...mockJWTPayload, permissions: ['read', 'write', 'delete'] };
        
        // Test all middlewares
        for (const middleware of middlewares) {
          await middleware(mockReq, mockRes, mockNext);
        }
        
        expect(mockNext).toHaveBeenCalledTimes(3);
      });
    });

    describe('authenticateWithCompany', () => {
      it('should combine authentication with company isolation', async () => {
        const middlewares = authenticateWithCompany;
        
        expect(middlewares).toHaveLength(3);
        
        // Test all middlewares
        for (const middleware of middlewares) {
          await middleware(mockReq, mockRes, mockNext);
        }
        
        expect(mockNext).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle malformed JWT payload', async () => {
      (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(null);

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      (authService.authService.getUserById as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing role in user object', () => {
      mockReq.user = { ...mockJWTPayload, role: undefined };
      const middleware = requireRole(UserRole.USER);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});