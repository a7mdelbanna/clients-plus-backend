import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import { AuthController } from '../../src/controllers/auth.controller';
import * as authService from '../../src/services/auth.service';
import {
  createMockUser,
  createMockReq,
  createMockRes,
  TestErrors,
  TestHttpStatus,
  resetAllMocks,
} from '../utils/test-helpers';

// Mock the auth service
jest.mock('../../src/services/auth.service');

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

// Mock JWT utils
jest.mock('../../src/utils/jwt.utils', () => ({
  extractTokenFromHeader: jest.fn().mockReturnValue('valid.token'),
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('AuthController', () => {
  let authController: AuthController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  const mockUser = createMockUser();
  const mockAuthResult = {
    user: mockUser,
    tokens: {
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
      expiresIn: 900,
      refreshExpiresIn: 604800,
    },
  };

  beforeEach(() => {
    authController = new AuthController();
    mockReq = createMockReq();
    mockRes = createMockRes();
    mockNext = jest.fn();
    resetAllMocks();

    // Mock validation to pass by default
    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      companyId: 'company-123',
      role: UserRole.USER,
    };

    beforeEach(() => {
      mockReq.body = registerData;
      (authService.authService.register as jest.Mock).mockResolvedValue(mockAuthResult);
    });

    it('should successfully register a user', async () => {
      await authController.register(mockReq, mockRes);

      expect(authService.authService.register).toHaveBeenCalledWith(registerData);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: mockAuthResult,
      });
    });

    it('should return validation errors', async () => {
      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { type: 'field', path: 'email', msg: 'Invalid email', value: 'invalid-email' },
          { type: 'field', path: 'password', msg: 'Password too short', value: '123' },
        ],
      });

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email', value: 'invalid-email' },
          { field: 'password', message: 'Password too short', value: '123' },
        ],
      });
    });

    it('should return error for missing required fields', async () => {
      mockReq.body = { email: 'test@example.com' }; // Missing required fields

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields: email, password, firstName, lastName, companyId',
        error: 'MISSING_REQUIRED_FIELDS',
      });
    });

    it('should handle user already exists error', async () => {
      (authService.authService.register as jest.Mock).mockRejectedValue(
        new Error('User with this email already exists')
      );

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.CONFLICT);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists',
        error: 'USER_EXISTS',
      });
    });

    it('should handle company not found error', async () => {
      (authService.authService.register as jest.Mock).mockRejectedValue(
        new Error('Company not found')
      );

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
      });
    });

    it('should handle company inactive error', async () => {
      (authService.authService.register as jest.Mock).mockRejectedValue(
        new Error('Company account is not active')
      );

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company account is not active',
        error: 'COMPANY_INACTIVE',
      });
    });

    it('should handle generic errors', async () => {
      (authService.authService.register as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Registration failed',
        error: 'REGISTRATION_FAILED',
      });
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
      companyId: 'company-123',
    };

    beforeEach(() => {
      mockReq.body = loginData;
      (authService.authService.login as jest.Mock).mockResolvedValue(mockAuthResult);
    });

    it('should successfully login a user', async () => {
      await authController.login(mockReq, mockRes);

      expect(authService.authService.login).toHaveBeenCalledWith(loginData);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: mockAuthResult,
      });
    });

    it('should return validation errors', async () => {
      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { type: 'field', path: 'email', msg: 'Invalid email', value: 'invalid-email' },
        ],
      });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email', value: 'invalid-email' },
        ],
      });
    });

    it('should return error for missing credentials', async () => {
      mockReq.body = { email: 'test@example.com' }; // Missing password

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required',
        error: 'MISSING_CREDENTIALS',
      });
    });

    it('should handle invalid credentials error', async () => {
      (authService.authService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid email or password')
      );

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
        error: 'INVALID_CREDENTIALS',
      });
    });

    it('should handle deactivated account error', async () => {
      (authService.authService.login as jest.Mock).mockRejectedValue(
        new Error('User account is deactivated')
      );

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User account is deactivated',
        error: 'ACCOUNT_DEACTIVATED',
      });
    });
  });

  describe('refreshToken', () => {
    const refreshTokenData = {
      refreshToken: 'valid.refresh.token',
    };

    beforeEach(() => {
      mockReq.body = refreshTokenData;
      (authService.authService.refreshToken as jest.Mock).mockResolvedValue(mockAuthResult);
    });

    it('should successfully refresh tokens', async () => {
      await authController.refreshToken(mockReq, mockRes);

      expect(authService.authService.refreshToken).toHaveBeenCalledWith(refreshTokenData.refreshToken);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: mockAuthResult,
      });
    });

    it('should return error for missing refresh token', async () => {
      mockReq.body = {};

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token is required',
        error: 'MISSING_REFRESH_TOKEN',
      });
    });

    it('should handle invalid refresh token error', async () => {
      (authService.authService.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired refresh token')
      );

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired refresh token',
        error: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('should handle user not found error', async () => {
      (authService.authService.refreshToken as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      });
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockReq.headers = { authorization: 'Bearer valid.access.token' };
      mockReq.body = { refreshToken: 'valid.refresh.token' };
      (authService.authService.logout as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully logout user', async () => {
      await authController.logout(mockReq, mockRes);

      expect(authService.authService.logout).toHaveBeenCalledWith('valid.token', 'valid.refresh.token');
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should return error for missing access token', async () => {
      const { extractTokenFromHeader } = require('../../src/utils/jwt.utils');
      extractTokenFromHeader.mockReturnValue(null);

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_ACCESS_TOKEN',
      });
    });

    it('should handle logout service errors', async () => {
      (authService.authService.logout as jest.Mock).mockRejectedValue(
        new Error('Logout service error')
      );

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Logout failed',
        error: 'LOGOUT_FAILED',
      });
    });
  });

  describe('getProfile', () => {
    beforeEach(() => {
      mockReq.user = {
        userId: mockUser.id,
        email: mockUser.email,
        companyId: mockUser.companyId,
        role: mockUser.role,
      };
      (authService.authService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    });

    it('should successfully get user profile', async () => {
      await authController.getProfile(mockReq, mockRes);

      expect(authService.authService.getUserById).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId
      );
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user: mockUser },
      });
    });

    it('should return error if user not authenticated', async () => {
      mockReq.user = undefined;

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    });

    it('should return error if user not found', async () => {
      (authService.authService.getUserById as jest.Mock).mockResolvedValue(null);

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      });
    });
  });

  describe('changePassword', () => {
    const changePasswordData = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    };

    beforeEach(() => {
      mockReq.user = {
        userId: mockUser.id,
        email: mockUser.email,
        companyId: mockUser.companyId,
        role: mockUser.role,
      };
      mockReq.body = changePasswordData;
      (authService.authService.changePassword as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully change password', async () => {
      await authController.changePassword(mockReq, mockRes);

      expect(authService.authService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
        changePasswordData.currentPassword,
        changePasswordData.newPassword
      );
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should return error if user not authenticated', async () => {
      mockReq.user = undefined;

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    });

    it('should return error for missing passwords', async () => {
      mockReq.body = { currentPassword: 'oldPassword123' }; // Missing newPassword

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password and new password are required',
        error: 'MISSING_PASSWORDS',
      });
    });

    it('should validate new password length', async () => {
      mockReq.body = {
        currentPassword: 'oldPassword123',
        newPassword: '1234567', // Too short
      };

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'New password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT',
      });
    });

    it('should handle incorrect current password error', async () => {
      (authService.authService.changePassword as jest.Mock).mockRejectedValue(
        new Error('Current password is incorrect')
      );

      await authController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password is incorrect',
        error: 'INVALID_CURRENT_PASSWORD',
      });
    });
  });

  describe('requestPasswordReset', () => {
    const resetData = {
      email: 'test@example.com',
    };

    beforeEach(() => {
      mockReq.body = resetData;
      (authService.authService.generatePasswordResetToken as jest.Mock).mockResolvedValue('reset-token-123');
    });

    it('should successfully request password reset', async () => {
      await authController.requestPasswordReset(mockReq, mockRes);

      expect(authService.authService.generatePasswordResetToken).toHaveBeenCalledWith(resetData.email);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent',
      });
    });

    it('should return error for missing email', async () => {
      mockReq.body = {};

      await authController.requestPasswordReset(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email is required',
        error: 'MISSING_EMAIL',
      });
    });

    it('should handle non-existent user gracefully', async () => {
      (authService.authService.generatePasswordResetToken as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      await authController.requestPasswordReset(mockReq, mockRes);

      // Should still return success to prevent email enumeration
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent',
      });
    });
  });

  describe('resetPassword', () => {
    const resetData = {
      resetToken: 'valid-reset-token',
      newPassword: 'newPassword123',
    };

    beforeEach(() => {
      mockReq.body = resetData;
      (authService.authService.resetPassword as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully reset password', async () => {
      await authController.resetPassword(mockReq, mockRes);

      expect(authService.authService.resetPassword).toHaveBeenCalledWith(
        resetData.resetToken,
        resetData.newPassword
      );
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });

    it('should return error for missing fields', async () => {
      mockReq.body = { resetToken: 'valid-token' }; // Missing newPassword

      await authController.resetPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Reset token and new password are required',
        error: 'MISSING_REQUIRED_FIELDS',
      });
    });

    it('should validate new password length', async () => {
      mockReq.body = {
        resetToken: 'valid-token',
        newPassword: '1234567', // Too short
      };

      await authController.resetPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'New password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT',
      });
    });

    it('should handle invalid reset token error', async () => {
      (authService.authService.resetPassword as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired reset token')
      );

      await authController.resetPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset token',
        error: 'INVALID_RESET_TOKEN',
      });
    });
  });

  describe('verifyToken', () => {
    beforeEach(() => {
      mockReq.user = {
        userId: mockUser.id,
        email: mockUser.email,
        companyId: mockUser.companyId,
        role: mockUser.role,
        permissions: ['read', 'write'],
      };
    });

    it('should successfully verify token', async () => {
      await authController.verifyToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token is valid',
        data: {
          user: mockReq.user,
        },
      });
    });

    it('should return error for invalid token', async () => {
      mockReq.user = undefined;

      await authController.verifyToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN',
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      await authController.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auth service is healthy',
        timestamp: expect.any(String),
        service: 'authentication',
      });
    });

    it('should handle health check errors', async () => {
      // Simulate an error by making res.json throw
      mockRes.json.mockImplementation(() => {
        throw new Error('Response error');
      });

      await authController.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});