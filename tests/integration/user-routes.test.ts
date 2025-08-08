import request from 'supertest';
import express from 'express';
import { Express } from 'express';
import userRoutes from '../../src/routes/user.routes';
import { userService } from '../../src/services/user.service';
import { ApiError } from '../../src/middleware/error.middleware';
import {
  createMockUser,
  TestHttpStatus,
  prismaMock,
} from '../utils/test-helpers';
import { UserRole } from '@prisma/client';

// Mock the service
jest.mock('../../src/services/user.service');
const mockUserService = userService as jest.Mocked<typeof userService>;

describe('User Routes Integration Tests', () => {
  let app: Express;
  let superAdminTokens: any;
  let adminTokens: any;
  let managerTokens: any;
  let userTokens: any;

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware by adding user to request
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Simple token-to-user mapping for tests
        if (token === 'super-admin-token') {
          req.user = {
            userId: 'super-admin-id',
            email: 'superadmin@system.com',
            companyId: 'system-company-id',
            role: UserRole.SUPER_ADMIN,
          };
        } else if (token === 'admin-token') {
          req.user = {
            userId: 'admin-id',
            email: 'admin@company.com',
            companyId: 'company-id-123',
            role: UserRole.ADMIN,
          };
        } else if (token === 'manager-token') {
          req.user = {
            userId: 'manager-id',
            email: 'manager@company.com',
            companyId: 'company-id-123',
            role: UserRole.MANAGER,
          };
        } else if (token === 'user-token') {
          req.user = {
            userId: 'user-id',
            email: 'user@company.com',
            companyId: 'company-id-123',
            role: UserRole.USER,
          };
        }
      }
      next();
    });
    
    app.use('/api/v1/users', userRoutes);

    // Setup test tokens
    superAdminTokens = { accessToken: 'super-admin-token' };
    adminTokens = { accessToken: 'admin-token' };
    managerTokens = { accessToken: 'manager-token' };
    userTokens = { accessToken: 'user-token' };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current user profile', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 'user-id',
        email: 'user@company.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
      });

      mockUserService.getUserById.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        id: 'user-id',
        email: 'user@company.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
      }));
      expect(mockUserService.getUserById).toHaveBeenCalledWith('user-id', 'company-id-123');
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      const response = await request(app).get('/api/v1/users/me');

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not authenticated');
    });

    it('should return 404 when current user not found', async () => {
      // Arrange
      mockUserService.getUserById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('POST /api/v1/users', () => {
    const validUserData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1234567890',
      role: UserRole.USER,
    };

    it('should create user successfully (manager)', async () => {
      // Arrange
      const mockUser = createMockUser(validUserData);
      mockUserService.createUser.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .send(validUserData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data).toEqual(expect.objectContaining({
        email: validUserData.email,
        firstName: validUserData.firstName,
        lastName: validUserData.lastName,
      }));
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...validUserData,
        companyId: 'company-id-123',
      });
    });

    it('should create user successfully (admin)', async () => {
      // Arrange
      const mockUser = createMockUser(validUserData);
      mockUserService.createUser.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(validUserData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CREATED);
      expect(response.body.success).toBe(true);
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...validUserData,
        companyId: 'company-id-123',
      });
    });

    it('should allow super admin to create user with specified company', async () => {
      // Arrange
      const userDataWithCompany = {
        ...validUserData,
        companyId: 'target-company-id',
        role: UserRole.ADMIN,
      };
      const mockUser = createMockUser(userDataWithCompany);
      mockUserService.createUser.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(userDataWithCompany);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CREATED);
      expect(mockUserService.createUser).toHaveBeenCalledWith(userDataWithCompany);
    });

    it('should return validation errors for invalid data', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        password: '123', // Too weak password
        firstName: '', // Empty name
      };

      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should return 409 when user email already exists', async () => {
      // Arrange
      const apiError = new ApiError(409, 'User with this email already exists', 'USER_EXISTS');
      mockUserService.createUser.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .send(validUserData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CONFLICT);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email already exists');
      expect(response.body.error).toBe('USER_EXISTS');
    });

    it('should deny access to regular users', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(validUserData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .send(validUserData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should list users with pagination (manager)', async () => {
      // Arrange
      const mockUsers = [
        createMockUser({ firstName: 'Alice', lastName: 'Johnson' }),
        createMockUser({ firstName: 'Bob', lastName: 'Smith' }),
        createMockUser({ firstName: 'Charlie', lastName: 'Brown' }),
      ];
      const totalCount = 25;

      mockUserService.listUsers.mockResolvedValue({
        users: mockUsers,
        total: totalCount,
      });

      // Act
      const response = await request(app)
        .get('/api/v1/users?page=2&limit=5&search=alice&sortBy=firstName&sortOrder=asc')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: totalCount,
        pages: Math.ceil(totalCount / 5),
        hasNext: true,
        hasPrev: true,
      });

      expect(mockUserService.listUsers).toHaveBeenCalledWith('company-id-123', {
        page: 2,
        limit: 5,
        search: 'alice',
        sortBy: 'firstName',
        sortOrder: 'asc',
      });
    });

    it('should use default pagination parameters', async () => {
      // Arrange
      mockUserService.listUsers.mockResolvedValue({
        users: [],
        total: 0,
      });

      // Act
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(mockUserService.listUsers).toHaveBeenCalledWith('company-id-123', {
        page: 1,
        limit: 10,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should deny access to regular users', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(mockUserService.listUsers).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app).get('/api/v1/users');

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/users/:userId', () => {
    const userId = 'user-id-123';

    it('should return user (manager can access company users)', async () => {
      // Arrange
      const mockUser = createMockUser({ id: userId });
      mockUserService.getUserById.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId, 'company-id-123');
    });

    it('should return user (super admin can access any user)', async () => {
      // Arrange
      const mockUser = createMockUser({ id: userId });
      mockUserService.getUserById.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId, undefined);
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockUserService.getUserById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return validation error for invalid user ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/users/invalid-id')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app).get(`/api/v1/users/${userId}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('PUT /api/v1/users/:userId', () => {
    const userId = 'user-id-123';
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+1987654321',
    };

    it('should update user successfully (admin)', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId });
      const updatedUser = { ...existingUser, ...updateData };

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.data.firstName).toBe('Updated');
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, 'company-id-123', updateData);
    });

    it('should allow super admin to update any user', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId, companyId: 'different-company' });
      const updatedUser = { ...existingUser, ...updateData };

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, 'different-company', updateData);
    });

    it('should return validation errors for invalid data', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        firstName: '', // Empty name
      };

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      // Arrange
      const existingUser = createMockUser();
      const apiError = new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      
      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUser.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
      expect(response.body.error).toBe('USER_NOT_FOUND');
    });

    it('should handle email already exists error', async () => {
      // Arrange
      const dataWithEmail = { ...updateData, email: 'existing@example.com' };
      const existingUser = createMockUser();
      const apiError = new ApiError(409, 'Email already in use', 'EMAIL_EXISTS');

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUser.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(dataWithEmail);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CONFLICT);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already in use');
      expect(response.body.error).toBe('EMAIL_EXISTS');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /api/v1/users/:userId', () => {
    const userId = 'user-id-123';

    it('should delete user successfully (admin)', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId, role: UserRole.USER });
      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.deleteUser.mockResolvedValue();

      // Act
      const response = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId, 'company-id-123');
    });

    it('should allow super admin to delete any user', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId, companyId: 'different-company' });
      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.deleteUser.mockResolvedValue();

      // Act
      const response = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId, 'different-company');
    });

    it('should handle last admin deletion error', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId, role: UserRole.ADMIN });
      const apiError = new ApiError(400, 'Cannot delete the last admin user', 'LAST_ADMIN');

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.deleteUser.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete the last admin user');
      expect(response.body.error).toBe('LAST_ADMIN');
    });

    it('should deny access to non-admin users', async () => {
      // Act
      const managerResponse = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      const userResponse = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      // Assert
      expect(managerResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(userResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(mockUserService.deleteUser).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app).delete(`/api/v1/users/${userId}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('PUT /api/v1/users/:userId/role', () => {
    const userId = 'user-id-123';

    it('should update user role successfully (admin)', async () => {
      // Arrange
      const roleData = { role: UserRole.MANAGER };
      const existingUser = createMockUser({ id: userId, role: UserRole.USER });
      const updatedUser = { ...existingUser, role: UserRole.MANAGER };

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUserRole.mockResolvedValue(updatedUser);

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(roleData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User role updated successfully');
      expect(response.body.data.role).toBe(UserRole.MANAGER);
      expect(mockUserService.updateUserRole).toHaveBeenCalledWith(userId, 'company-id-123', UserRole.MANAGER);
    });

    it('should return validation errors for invalid role', async () => {
      // Arrange
      const invalidRoleData = { role: 'INVALID_ROLE' };

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(invalidRoleData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(mockUserService.updateUserRole).not.toHaveBeenCalled();
    });

    it('should handle last admin role change error', async () => {
      // Arrange
      const roleData = { role: UserRole.USER };
      const existingUser = createMockUser({ id: userId, role: UserRole.ADMIN });
      const apiError = new ApiError(400, 'Cannot remove the last admin role', 'LAST_ADMIN');

      mockUserService.getUserById.mockResolvedValue(existingUser);
      mockUserService.updateUserRole.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(roleData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot remove the last admin role');
      expect(response.body.error).toBe('LAST_ADMIN');
    });

    it('should deny access to non-admin users', async () => {
      // Arrange
      const roleData = { role: UserRole.MANAGER };

      // Act
      const managerResponse = await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .send(roleData);

      const userResponse = await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(roleData);

      // Assert
      expect(managerResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(userResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(mockUserService.updateUserRole).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .send({ role: UserRole.MANAGER });

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/companies/:companyId/users', () => {
    const companyId = 'target-company-id';

    it('should list users for specific company (super admin)', async () => {
      // Arrange
      const mockUsers = [createMockUser(), createMockUser()];
      mockUserService.listUsers.mockResolvedValue({
        users: mockUsers,
        total: 2,
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/users/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockUserService.listUsers).toHaveBeenCalledWith(companyId, expect.any(Object));
    });

    it('should allow company admin to access own company users', async () => {
      // Arrange
      const ownCompanyId = 'company-id-123';
      const mockUsers = [createMockUser()];
      mockUserService.listUsers.mockResolvedValue({
        users: mockUsers,
        total: 1,
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/users/companies/${ownCompanyId}/users`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(mockUserService.listUsers).toHaveBeenCalledWith(ownCompanyId, expect.any(Object));
    });

    it('should return validation error for invalid company ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/users/companies/invalid-id/users')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/companies/:companyId/users/stats', () => {
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
        [UserRole.STAFF]: 5,
      },
    };

    it('should return user statistics for company (manager)', async () => {
      // Arrange
      mockUserService.getUserStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get(`/api/v1/users/companies/${companyId}/users/stats`)
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        total: 25,
        active: 20,
        inactive: 5,
        verified: 18,
        unverified: 7,
        byRole: expect.objectContaining({
          [UserRole.ADMIN]: 2,
          [UserRole.MANAGER]: 3,
          [UserRole.USER]: 15,
          [UserRole.STAFF]: 5,
        }),
      }));
      expect(mockUserService.getUserStats).toHaveBeenCalledWith(companyId);
    });

    it('should deny access to different company stats for regular users', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/users/companies/different-company-id/users/stats')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
      expect(mockUserService.getUserStats).not.toHaveBeenCalled();
    });

    it('should allow super admin to access any company stats', async () => {
      // Arrange
      mockUserService.getUserStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get('/api/v1/users/companies/any-company-id/users/stats')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(mockUserService.getUserStats).toHaveBeenCalledWith('any-company-id');
    });

    it('should return validation error for invalid company ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/users/companies/invalid-id/users/stats')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .get(`/api/v1/users/companies/${companyId}/users/stats`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle internal server errors gracefully', async () => {
      // Arrange
      mockUserService.listUsers.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to list users');
    });

    it('should handle malformed JSON in request body', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .set('Content-Type', 'application/json')
        .send('{ "invalid": json }');

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
    });

    it('should handle missing required fields', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .send({}); // Empty body

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle invalid UUID parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/users/not-a-uuid')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle concurrent operations gracefully', async () => {
      // Arrange - Simulate concurrent requests
      const mockUser = createMockUser();
      mockUserService.getUserById.mockResolvedValue(mockUser);

      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get(`/api/v1/users/${mockUser.id}`)
          .set('Authorization', `Bearer ${managerTokens.accessToken}`)
      );

      // Act
      const responses = await Promise.all(requests);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(TestHttpStatus.OK);
        expect(response.body.success).toBe(true);
      });

      expect(mockUserService.getUserById).toHaveBeenCalledTimes(5);
    });
  });

  describe('Role-Based Access Control', () => {
    const userId = 'test-user-id';

    it('should enforce role hierarchy for user creation', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
      };

      // Manager can create users
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .send(userData)
        .expect(TestHttpStatus.CREATED);

      // Admin can create users
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(userData)
        .expect(TestHttpStatus.CREATED);

      // Regular user cannot create users
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(userData)
        .expect(TestHttpStatus.FORBIDDEN);
    });

    it('should enforce role hierarchy for user listing', async () => {
      mockUserService.listUsers.mockResolvedValue({ users: [], total: 0 });

      // Manager can list users
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .expect(TestHttpStatus.OK);

      // Admin can list users
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(TestHttpStatus.OK);

      // Regular user cannot list users
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(TestHttpStatus.FORBIDDEN);
    });

    it('should enforce role hierarchy for user deletion', async () => {
      const mockUser = createMockUser();
      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.deleteUser.mockResolvedValue();

      // Admin can delete users
      await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(TestHttpStatus.OK);

      // Manager cannot delete users
      await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .expect(TestHttpStatus.FORBIDDEN);

      // Regular user cannot delete users
      await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(TestHttpStatus.FORBIDDEN);
    });

    it('should enforce role hierarchy for role updates', async () => {
      const roleData = { role: UserRole.MANAGER };
      const mockUser = createMockUser();
      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.updateUserRole.mockResolvedValue({ ...mockUser, role: UserRole.MANAGER });

      // Admin can update roles
      await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(roleData)
        .expect(TestHttpStatus.OK);

      // Manager cannot update roles
      await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${managerTokens.accessToken}`)
        .send(roleData)
        .expect(TestHttpStatus.FORBIDDEN);

      // Regular user cannot update roles
      await request(app)
        .put(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(roleData)
        .expect(TestHttpStatus.FORBIDDEN);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should enforce company isolation for regular users', async () => {
      // Regular admin can only access users from their own company
      const mockUser = createMockUser({ companyId: 'company-id-123' });
      mockUserService.getUserById.mockResolvedValue(mockUser);

      // Should work for own company
      await request(app)
        .get(`/api/v1/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(TestHttpStatus.OK);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUser.id, 'company-id-123');
    });

    it('should allow super admin to access any company users', async () => {
      const mockUser = createMockUser({ companyId: 'any-company-id' });
      mockUserService.getUserById.mockResolvedValue(mockUser);

      await request(app)
        .get(`/api/v1/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .expect(TestHttpStatus.OK);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUser.id, undefined);
    });

    it('should validate company ownership in user operations', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      // Admin creates user in their own company
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(userData)
        .expect(TestHttpStatus.CREATED);

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...userData,
        companyId: 'company-id-123',
      });
    });
  });
});