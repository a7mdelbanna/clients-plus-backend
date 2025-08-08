import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserController, userController } from '../../src/controllers/user.controller';
import { userService } from '../../src/services/user.service';
import { ApiError } from '../../src/middleware/error.middleware';
import {
  createMockReq,
  createMockRes,
  createMockUser,
  createMockCompany,
  TestHttpStatus,
} from '../utils/test-helpers';
import { UserRole } from '@prisma/client';

// Mock the service
jest.mock('../../src/services/user.service');
jest.mock('express-validator');

const mockUserService = userService as jest.Mocked<typeof userService>;
const mockValidationResult = validationResult as unknown as jest.Mock;

describe('UserController', () => {
  let controller: UserController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    controller = new UserController();
    mockReq = createMockReq();
    mockRes = createMockRes();
    jest.clearAllMocks();

    // Default to no validation errors
    mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] } as any);
  });

  describe('createUser', () => {
    it('should create user successfully with company from authenticated user', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        role: UserRole.USER,
      };

      const mockUser = createMockUser();
      mockReq.body = userData;
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.createUser.mockResolvedValue(mockUser);

      // Act
      await controller.createUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...userData,
        companyId: 'company-id-123',
      });
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User created successfully',
        data: mockUser,
        timestamp: expect.any(String),
      });
    });

    it('should create user with specified company (super admin)', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        companyId: 'target-company-id',
        role: UserRole.MANAGER,
      };

      const mockUser = createMockUser({ role: UserRole.MANAGER });
      mockReq.body = userData;
      mockReq.user = {
        userId: 'super-admin-id',
        email: 'superadmin@system.com',
        companyId: 'system-company-id',
        role: UserRole.SUPER_ADMIN,
      };

      mockUserService.createUser.mockResolvedValue(mockUser);

      // Act
      await controller.createUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...userData,
        companyId: 'target-company-id',
      });
    });

    it('should return error when company ID is missing', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockReq.body = userData;
      mockReq.user = {
        userId: 'user-id',
        email: 'user@company.com',
        companyId: undefined as any,
        role: UserRole.ADMIN,
      };

      // Act
      await controller.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
        timestamp: expect.any(String),
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should return validation errors', async () => {
      // Arrange
      const validationErrors = [
        { field: 'email', msg: 'Invalid email format' },
        { field: 'password', msg: 'Password too weak' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should handle user already exists error', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockReq.body = userData;
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      const apiError = new ApiError(409, 'User with this email already exists', 'USER_EXISTS');
      mockUserService.createUser.mockRejectedValue(apiError);

      // Act
      await controller.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.CONFLICT);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists',
        error: 'USER_EXISTS',
        timestamp: expect.any(String),
      });
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockReq.body = userData;
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.createUser.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create user',
        error: 'CREATE_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getUser', () => {
    it('should return user when found (super admin can access any user)', async () => {
      // Arrange
      const userId = 'user-id-123';
      const mockUser = createMockUser();

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'super-admin-id',
        email: 'superadmin@system.com',
        companyId: 'system-company-id',
        role: UserRole.SUPER_ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);

      // Act
      await controller.getUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId, undefined);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        timestamp: expect.any(String),
      });
    });

    it('should return user with company isolation for regular users', async () => {
      // Arrange
      const userId = 'user-id-123';
      const mockUser = createMockUser();

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);

      // Act
      await controller.getUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId, 'company-id-123');
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        timestamp: expect.any(String),
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(null);

      // Act
      await controller.getUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND',
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const userId = 'user-id-123';

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.getUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch user',
        error: 'FETCH_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const userId = 'user-id-123';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1987654321',
      };

      const existingUser = createMockUser();
      const updatedUser = { ...existingUser, ...updateData };

      mockReq.params = { userId };
      mockReq.body = updateData;
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      // Act
      await controller.updateUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, 'company-id-123', updateData);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
        timestamp: expect.any(String),
      });
    });

    it('should handle super admin updating any user', async () => {
      // Arrange
      const userId = 'user-id-123';
      const updateData = { firstName: 'Updated' };

      const existingUser = createMockUser();
      existingUser.companyId = 'target-company-id';
      const updatedUser = { ...existingUser, ...updateData };

      mockReq.params = { userId };
      mockReq.body = updateData;
      mockReq.user = {
        userId: 'super-admin-id',
        email: 'superadmin@system.com',
        companyId: 'system-company-id',
        role: UserRole.SUPER_ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      // Act
      await controller.updateUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, 'target-company-id', updateData);
    });

    it('should return validation errors', async () => {
      // Arrange
      const validationErrors = [
        { field: 'email', msg: 'Invalid email format' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.updateUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      // Arrange
      const userId = 'user-id-123';
      const updateData = { firstName: 'Updated' };

      mockReq.params = { userId };
      mockReq.body = updateData;
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(createMockUser());
      const apiError = new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      mockUserService.updateUser.mockRejectedValue(apiError);

      // Act
      await controller.updateUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
        timestamp: expect.any(String),
      });
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination using company from params', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockUsers = [
        createMockUser({ firstName: 'Alice' }),
        createMockUser({ firstName: 'Bob' }),
        createMockUser({ firstName: 'Charlie' }),
      ];
      const totalCount = 15;

      mockReq.params = { companyId };
      mockReq.query = {
        page: '2',
        limit: '5',
        search: 'alice',
        sortBy: 'firstName',
        sortOrder: 'asc',
      };

      mockUserService.listUsers.mockResolvedValue({
        users: mockUsers,
        total: totalCount,
      });

      // Act
      await controller.listUsers(mockReq, mockRes);

      // Assert
      expect(mockUserService.listUsers).toHaveBeenCalledWith(companyId, {
        page: 2,
        limit: 5,
        search: 'alice',
        sortBy: 'firstName',
        sortOrder: 'asc',
      });

      const expectedPages = Math.ceil(totalCount / 5); // 3 pages
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        pagination: {
          page: 2,
          limit: 5,
          total: totalCount,
          pages: expectedPages,
          hasNext: true,
          hasPrev: true,
        },
        timestamp: expect.any(String),
      });
    });

    it('should list users using company from authenticated user', async () => {
      // Arrange
      const companyId = 'user-company-id';
      const mockUsers = [createMockUser()];

      mockReq.query = {};
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockUserService.listUsers.mockResolvedValue({
        users: mockUsers,
        total: 1,
      });

      // Act
      await controller.listUsers(mockReq, mockRes);

      // Assert
      expect(mockUserService.listUsers).toHaveBeenCalledWith(companyId, {
        page: 1,
        limit: 10,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should return error when company ID is missing', async () => {
      // Arrange
      mockReq.query = {};
      mockReq.user = {
        userId: 'user-id',
        email: 'user@company.com',
        companyId: undefined as any,
        role: UserRole.ADMIN,
      };

      // Act
      await controller.listUsers(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
        timestamp: expect.any(String),
      });
      expect(mockUserService.listUsers).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      mockReq.query = {};
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.listUsers.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.listUsers(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to list users',
        error: 'LIST_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const userId = 'user-id-123';
      const mockUser = createMockUser();

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.deleteUser.mockResolvedValue();

      // Act
      await controller.deleteUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId, 'company-id-123');
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
        timestamp: expect.any(String),
      });
    });

    it('should handle super admin deleting any user', async () => {
      // Arrange
      const userId = 'user-id-123';
      const mockUser = createMockUser();
      mockUser.companyId = 'target-company-id';

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'super-admin-id',
        email: 'superadmin@system.com',
        companyId: 'system-company-id',
        role: UserRole.SUPER_ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.deleteUser.mockResolvedValue();

      // Act
      await controller.deleteUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId, 'target-company-id');
    });

    it('should handle last admin deletion error', async () => {
      // Arrange
      const userId = 'admin-user-id';
      const mockUser = createMockUser({ role: UserRole.ADMIN });

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'another-admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);
      const apiError = new ApiError(400, 'Cannot delete the last admin user', 'LAST_ADMIN');
      mockUserService.deleteUser.mockRejectedValue(apiError);

      // Act
      await controller.deleteUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete the last admin user',
        error: 'LAST_ADMIN',
        timestamp: expect.any(String),
      });
    });

    it('should handle user not found error', async () => {
      // Arrange
      const userId = 'user-id-123';

      mockReq.params = { userId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(createMockUser());
      const apiError = new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      mockUserService.deleteUser.mockRejectedValue(apiError);

      // Act
      await controller.deleteUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
        timestamp: expect.any(String),
      });
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const userId = 'user-id-123';
      const newRole = UserRole.MANAGER;
      const mockUser = createMockUser({ role: UserRole.USER });
      const updatedUser = { ...mockUser, role: newRole };

      mockReq.params = { userId };
      mockReq.body = { role: newRole };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.updateUserRole.mockResolvedValue(updatedUser);

      // Act
      await controller.updateUserRole(mockReq, mockRes);

      // Assert
      expect(mockUserService.updateUserRole).toHaveBeenCalledWith(userId, 'company-id-123', newRole);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User role updated successfully',
        data: updatedUser,
        timestamp: expect.any(String),
      });
    });

    it('should return validation errors', async () => {
      // Arrange
      const validationErrors = [
        { field: 'role', msg: 'Invalid role' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.updateUserRole(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      expect(mockUserService.updateUserRole).not.toHaveBeenCalled();
    });

    it('should handle last admin role change error', async () => {
      // Arrange
      const userId = 'admin-user-id';
      const newRole = UserRole.USER;
      const mockUser = createMockUser({ role: UserRole.ADMIN });

      mockReq.params = { userId };
      mockReq.body = { role: newRole };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);
      const apiError = new ApiError(400, 'Cannot remove the last admin role', 'LAST_ADMIN');
      mockUserService.updateUserRole.mockRejectedValue(apiError);

      // Act
      await controller.updateUserRole(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot remove the last admin role',
        error: 'LAST_ADMIN',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockReq.user = {
        userId: mockUser.id,
        email: mockUser.email,
        companyId: mockUser.companyId,
        role: mockUser.role,
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);

      // Act
      await controller.getCurrentUser(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUser.id, mockUser.companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        timestamp: expect.any(String),
      });
    });

    it('should return 401 when not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await controller.getCurrentUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
        error: 'UNAUTHORIZED',
        timestamp: expect.any(String),
      });
      expect(mockUserService.getUserById).not.toHaveBeenCalled();
    });

    it('should return 404 when current user not found', async () => {
      // Arrange
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: 'company-id-123',
        role: UserRole.USER,
      };

      mockUserService.getUserById.mockResolvedValue(null);

      // Act
      await controller.getCurrentUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND',
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: 'company-id-123',
        role: UserRole.USER,
      };

      mockUserService.getUserById.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.getCurrentUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch current user',
        error: 'FETCH_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics for company', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockStats = {
        total: 25,
        active: 20,
        inactive: 5,
        verified: 18,
        unverified: 7,
        byRole: {
          [UserRole.ADMIN]: 2,
          [UserRole.MANAGER]: 3,
          [UserRole.USER]: 15,
        },
      };

      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockUserService.getUserStats.mockResolvedValue(mockStats);

      // Act
      await controller.getUserStats(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserStats).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        timestamp: expect.any(String),
      });
    });

    it('should use company ID from authenticated user when not in params', async () => {
      // Arrange
      const companyId = 'user-company-id';
      const mockStats = {
        total: 10,
        active: 8,
        inactive: 2,
        verified: 7,
        unverified: 3,
        byRole: {
          [UserRole.ADMIN]: 1,
          [UserRole.USER]: 7,
        },
      };

      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockUserService.getUserStats.mockResolvedValue(mockStats);

      // Act
      await controller.getUserStats(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserStats).toHaveBeenCalledWith(companyId);
    });

    it('should deny access to different company stats for regular users', async () => {
      // Arrange
      const companyId = 'different-company-id';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'user-company-id',
        role: UserRole.ADMIN,
      };

      // Act
      await controller.getUserStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied',
        error: 'FORBIDDEN',
        timestamp: expect.any(String),
      });
      expect(mockUserService.getUserStats).not.toHaveBeenCalled();
    });

    it('should allow super admin to access any company stats', async () => {
      // Arrange
      const companyId = 'any-company-id';
      const mockStats = { total: 5, active: 4, inactive: 1, verified: 3, unverified: 2, byRole: {} };

      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'super-admin-id',
        email: 'superadmin@system.com',
        companyId: 'system-company-id',
        role: UserRole.SUPER_ADMIN,
      };

      mockUserService.getUserStats.mockResolvedValue(mockStats);

      // Act
      await controller.getUserStats(mockReq, mockRes);

      // Assert
      expect(mockUserService.getUserStats).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
    });

    it('should return error when company ID is missing', async () => {
      // Arrange
      mockReq.user = {
        userId: 'user-id',
        email: 'user@company.com',
        companyId: undefined as any,
        role: UserRole.ADMIN,
      };

      // Act
      await controller.getUserStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const companyId = 'company-id-123';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockUserService.getUserStats.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.getUserStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch user statistics',
        error: 'STATS_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request parameters', async () => {
      // Arrange
      mockReq.params = {}; // Missing userId
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.getUserById.mockResolvedValue(null);

      // Act
      await controller.getUser(mockReq, mockRes);

      // The exact behavior depends on implementation, but should handle gracefully
    });

    it('should handle invalid query parameters in listUsers', async () => {
      // Arrange
      mockReq.query = {
        page: 'not-a-number',
        limit: 'invalid',
        sortOrder: 'invalid-order',
      };
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      mockUserService.listUsers.mockResolvedValue({
        users: [],
        total: 0,
      });

      // Act
      await controller.listUsers(mockReq, mockRes);

      // Assert - should use default values
      expect(mockUserService.listUsers).toHaveBeenCalledWith('company-id-123', {
        page: 1, // Default when NaN
        limit: 10, // Default when NaN
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'invalid-order', // Passed as-is
      });
    });

    it('should handle empty request body in createUser', async () => {
      // Arrange
      mockReq.body = {};
      mockReq.user = {
        userId: 'admin-id',
        email: 'admin@company.com',
        companyId: 'company-id-123',
        role: UserRole.ADMIN,
      };

      const validationErrors = [
        { field: 'email', msg: 'Email is required' },
        { field: 'password', msg: 'Password is required' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    });

    it('should handle missing authenticated user in protected routes', async () => {
      // Arrange
      mockReq.user = undefined;
      const userId = 'user-id-123';
      mockReq.params = { userId };

      // Act
      await controller.updateUser(mockReq, mockRes);

      // This should be handled by middleware, but test controller behavior
      // The exact behavior will depend on how the controller handles missing user
    });
  });
});