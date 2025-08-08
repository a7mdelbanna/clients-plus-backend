import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthService } from '../../src/services/auth.service';
import { prismaMock } from '../setup';
import {
  createMockUser,
  createMockCompany,
  hashPassword,
  TestErrors,
  resetAllMocks,
} from '../utils/test-helpers';

// Mock the JWT utils
jest.mock('../../src/utils/jwt.utils', () => ({
  generateTokenPair: jest.fn().mockReturnValue({
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    expiresIn: 900,
    refreshExpiresIn: 604800,
  }),
  verifyRefreshToken: jest.fn().mockReturnValue({
    userId: 'user-123',
    companyId: 'company-123',
    tokenId: 'token-123',
  }),
  blacklistAccessToken: jest.fn(),
  blacklistRefreshToken: jest.fn(),
  generateTokenId: jest.fn().mockReturnValue('unique-token-id'),
}));

// Mock the logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  const mockCompany = createMockCompany();
  const mockUser = createMockUser({ companyId: mockCompany.id });

  beforeEach(() => {
    authService = new AuthService();
    resetAllMocks();
    
    // Reset bcrypt mocks
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  describe('register', () => {
    const registerData = {
      email: mockUser.email,
      password: 'password123',
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      phone: mockUser.phone || undefined,
      companyId: mockCompany.id,
      role: UserRole.USER,
    };

    beforeEach(() => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.company.findUnique.mockResolvedValue(mockCompany);
      prismaMock.user.create.mockResolvedValue(mockUser);
    });

    it('should successfully register a new user', async () => {
      const result = await authService.register(registerData);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.user.email).toBe(registerData.email);
      expect(result.tokens.accessToken).toBe('mock.access.token');
      expect(result.tokens.refreshToken).toBe('mock.refresh.token');
      
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(prismaMock.company.findUnique).toHaveBeenCalledWith({
        where: { id: registerData.companyId },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.register(registerData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should throw error if company not found', async () => {
      prismaMock.company.findUnique.mockResolvedValue(null);

      await expect(authService.register(registerData))
        .rejects.toThrow('Company not found');
    });

    it('should throw error if company is not active', async () => {
      const inactiveCompany = { ...mockCompany, isActive: false };
      prismaMock.company.findUnique.mockResolvedValue(inactiveCompany);

      await expect(authService.register(registerData))
        .rejects.toThrow('Company account is not active');
    });

    it('should hash password during registration', async () => {
      await authService.register(registerData);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
    });

    it('should create user with correct default values', async () => {
      await authService.register(registerData);

      const createCall = prismaMock.user.create.mock.calls[0][0];
      expect(createCall.data.isActive).toBe(true);
      expect(createCall.data.isVerified).toBe(false);
      expect(createCall.data.role).toBe(UserRole.USER);
    });

    it('should handle password hashing errors', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash failed'));

      await expect(authService.register(registerData))
        .rejects.toThrow('Failed to hash password');
    });
  });

  describe('login', () => {
    const loginData = {
      email: mockUser.email,
      password: 'password123',
    };

    beforeEach(() => {
      const userWithCompany = { ...mockUser, company: mockCompany };
      prismaMock.user.findUnique.mockResolvedValue(userWithCompany);
      prismaMock.user.update.mockResolvedValue(userWithCompany);
    });

    it('should successfully login with valid credentials', async () => {
      const result = await authService.login(loginData);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
      expect(result.tokens.accessToken).toBe('mock.access.token');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
        include: { company: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
        include: { company: true },
      });
    });

    it('should throw error for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false, company: mockCompany };
      prismaMock.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(authService.login(loginData))
        .rejects.toThrow('User account is deactivated');
    });

    it('should throw error for inactive company', async () => {
      const inactiveCompany = { ...mockCompany, isActive: false };
      const userWithInactiveCompany = { ...mockUser, company: inactiveCompany };
      prismaMock.user.findUnique.mockResolvedValue(userWithInactiveCompany);

      await expect(authService.login(loginData))
        .rejects.toThrow('Company account is not active');
    });

    it('should validate company match when provided', async () => {
      const loginWithCompany = { ...loginData, companyId: 'different-company' };
      
      await expect(authService.login(loginWithCompany))
        .rejects.toThrow('Invalid email or password');
    });

    it('should handle password verification errors', async () => {
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Compare failed'));

      const result = await authService.login(loginData);
      // Should continue without throwing since compare error is caught
      expect(result).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid.refresh.token';

    beforeEach(() => {
      const userWithCompany = { ...mockUser, company: mockCompany };
      prismaMock.user.findUnique.mockResolvedValue(userWithCompany);
    });

    it('should successfully refresh tokens', async () => {
      const result = await authService.refreshToken(mockRefreshToken);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('mock.access.token');
      expect(result.tokens.refreshToken).toBe('mock.refresh.token');
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken(mockRefreshToken))
        .rejects.toThrow('User not found');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false, company: mockCompany };
      prismaMock.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(authService.refreshToken(mockRefreshToken))
        .rejects.toThrow('User account is deactivated');
    });

    it('should throw error for inactive company', async () => {
      const inactiveCompany = { ...mockCompany, isActive: false };
      const userWithInactiveCompany = { ...mockUser, company: inactiveCompany };
      prismaMock.user.findUnique.mockResolvedValue(userWithInactiveCompany);

      await expect(authService.refreshToken(mockRefreshToken))
        .rejects.toThrow('Company account is not active');
    });

    it('should validate company ID matches token', async () => {
      const { verifyRefreshToken } = require('../../src/utils/jwt.utils');
      verifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        companyId: 'different-company',
        tokenId: 'token-123',
      });

      await expect(authService.refreshToken(mockRefreshToken))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    const mockAccessToken = 'valid.access.token';
    const mockRefreshToken = 'valid.refresh.token';

    it('should blacklist access token', async () => {
      const { blacklistAccessToken } = require('../../src/utils/jwt.utils');
      
      await authService.logout(mockAccessToken);

      expect(blacklistAccessToken).toHaveBeenCalledWith(mockAccessToken);
    });

    it('should blacklist both tokens when refresh token provided', async () => {
      const { blacklistAccessToken, blacklistRefreshToken } = require('../../src/utils/jwt.utils');
      
      await authService.logout(mockAccessToken, mockRefreshToken);

      expect(blacklistAccessToken).toHaveBeenCalledWith(mockAccessToken);
      expect(blacklistRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should not throw error on logout failure', async () => {
      const { blacklistAccessToken } = require('../../src/utils/jwt.utils');
      blacklistAccessToken.mockImplementation(() => {
        throw new Error('Blacklist failed');
      });

      await expect(authService.logout(mockAccessToken)).resolves.not.toThrow();
    });
  });

  describe('getUserById', () => {
    beforeEach(() => {
      const userWithCompany = { ...mockUser, company: mockCompany };
      prismaMock.user.findFirst.mockResolvedValue(userWithCompany);
    });

    it('should return user when found', async () => {
      const result = await authService.getUserById(mockUser.id, mockCompany.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(mockUser.id);
      expect(result!.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUser.id,
          companyId: mockCompany.id,
          isActive: true,
        },
        include: { company: true },
      });
    });

    it('should return null when user not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      const result = await authService.getUserById('non-existent', mockCompany.id);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.user.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await authService.getUserById(mockUser.id, mockCompany.id);

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    const currentPassword = 'oldPassword123';
    const newPassword = 'newPassword456';

    beforeEach(() => {
      prismaMock.user.findFirst.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);
    });

    it('should successfully change password', async () => {
      await authService.changePassword(mockUser.id, mockCompany.id, currentPassword, newPassword);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUser.id,
          companyId: mockCompany.id,
          isActive: true,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'hashed-password' },
      });
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(authService.changePassword(mockUser.id, mockCompany.id, currentPassword, newPassword))
        .rejects.toThrow('User not found');
    });

    it('should throw error if current password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword(mockUser.id, mockCompany.id, currentPassword, newPassword))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  describe('validateUserAccess', () => {
    beforeEach(() => {
      const userWithCompany = { ...mockUser, company: mockCompany };
      prismaMock.user.findFirst.mockResolvedValue(userWithCompany);
    });

    it('should return true for valid user with active company', async () => {
      const result = await authService.validateUserAccess(mockUser.id, mockCompany.id);

      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      const result = await authService.validateUserAccess('non-existent', mockCompany.id);

      expect(result).toBe(false);
    });

    it('should return false for inactive company', async () => {
      const inactiveCompany = { ...mockCompany, isActive: false };
      const userWithInactiveCompany = { ...mockUser, company: inactiveCompany };
      prismaMock.user.findFirst.mockResolvedValue(userWithInactiveCompany);

      const result = await authService.validateUserAccess(mockUser.id, mockCompany.id);

      expect(result).toBe(false);
    });

    it('should validate role requirements', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN, company: mockCompany };
      prismaMock.user.findFirst.mockResolvedValue(adminUser);

      // Should pass for same or lower role
      expect(await authService.validateUserAccess(mockUser.id, mockCompany.id, UserRole.ADMIN)).toBe(true);
      expect(await authService.validateUserAccess(mockUser.id, mockCompany.id, UserRole.USER)).toBe(true);

      // Should fail for higher role
      const userWithLowerRole = { ...mockUser, role: UserRole.USER, company: mockCompany };
      prismaMock.user.findFirst.mockResolvedValue(userWithLowerRole);
      expect(await authService.validateUserAccess(mockUser.id, mockCompany.id, UserRole.ADMIN)).toBe(false);
    });

    it('should validate permission requirements', async () => {
      const userWithPermissions = {
        ...mockUser,
        permissions: ['read', 'write', 'delete'],
        company: mockCompany
      };
      prismaMock.user.findFirst.mockResolvedValue(userWithPermissions);

      // Should pass if user has all required permissions
      expect(await authService.validateUserAccess(
        mockUser.id, 
        mockCompany.id, 
        undefined, 
        ['read', 'write']
      )).toBe(true);

      // Should fail if user lacks required permissions
      expect(await authService.validateUserAccess(
        mockUser.id,
        mockCompany.id,
        undefined,
        ['read', 'admin']
      )).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.user.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await authService.validateUserAccess(mockUser.id, mockCompany.id);

      expect(result).toBe(false);
    });
  });

  describe('generatePasswordResetToken', () => {
    beforeEach(() => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);
    });

    it('should generate reset token for valid user', async () => {
      const result = await authService.generatePasswordResetToken(mockUser.email);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          resetToken: expect.any(String),
          resetTokenExpiry: expect.any(Date),
        },
      });
    });

    it('should throw error for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.generatePasswordResetToken('nonexistent@example.com'))
        .rejects.toThrow('User not found');
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const newPassword = 'newPassword123';

    beforeEach(() => {
      prismaMock.user.findFirst.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(mockUser);
    });

    it('should reset password with valid token', async () => {
      await authService.resetPassword(resetToken, newPassword);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken,
          resetTokenExpiry: {
            gt: expect.any(Date),
          },
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          password: 'hashed-password',
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    });

    it('should throw error for invalid or expired token', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(authService.resetPassword('invalid-token', newPassword))
        .rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('cleanup', () => {
    it('should clean up expired tokens', async () => {
      prismaMock.user.updateMany.mockResolvedValue({ count: 2 });

      await authService.cleanup();

      expect(prismaMock.user.updateMany).toHaveBeenCalledTimes(2);
      
      // Check reset tokens cleanup
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: {
          resetTokenExpiry: {
            lt: expect.any(Date),
          },
        },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Check verification tokens cleanup
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: {
          verificationTokenExpiry: {
            lt: expect.any(Date),
          },
        },
        data: {
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      prismaMock.user.updateMany.mockRejectedValue(new Error('Database error'));

      await expect(authService.cleanup()).resolves.not.toThrow();
    });
  });
});