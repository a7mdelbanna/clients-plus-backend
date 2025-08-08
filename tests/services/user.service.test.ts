import { UserService, userService, CreateUserData, UpdateUserData } from '../../src/services/user.service';
import { ApiError } from '../../src/middleware/error.middleware';
import { prismaMock, createMockUser, createMockCompany, TestHttpStatus } from '../utils/test-helpers';
import { UserRole, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
  });

  describe('createUser', () => {
    it('should create a user successfully with default role', async () => {
      // Arrange
      const mockCompany = createMockCompany();
      const createData: CreateUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        companyId: mockCompany.id,
      };

      const expectedUser = {
        id: 'user-id-123',
        email: createData.email,
        firstName: createData.firstName,
        lastName: createData.lastName,
        phone: createData.phone || null,
        avatar: null,
        password: 'hashedPassword123',
        companyId: mockCompany.id,
        role: UserRole.USER,
        permissions: null,
        isActive: true,
        isVerified: false,
        lastLoginAt: null,
        resetToken: null,
        resetTokenExpiry: null,
        verificationToken: null,
        verificationTokenExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
      prismaMock.company.findUnique.mockResolvedValue(mockCompany);
      prismaMock.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createUser(createData);

      // Assert
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: createData.email },
      });
      expect(prismaMock.company.findUnique).toHaveBeenCalledWith({
        where: { id: mockCompany.id },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createData.password, expect.any(Number));
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createData.email,
          password: 'hashedPassword123',
          firstName: createData.firstName,
          lastName: createData.lastName,
          phone: createData.phone,
          companyId: mockCompany.id,
          role: UserRole.USER,
          isActive: true,
          isVerified: false,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(expectedUser);
    });

    it('should create a user with specified role and permissions', async () => {
      // Arrange
      const mockCompany = createMockCompany();
      const createData: CreateUserData = {
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        companyId: mockCompany.id,
        role: UserRole.ADMIN,
        permissions: ['users.read', 'users.write', 'companies.read'],
      };

      const expectedUser = createMockUser({ role: UserRole.ADMIN });

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.company.findUnique.mockResolvedValue(mockCompany);
      prismaMock.user.create.mockResolvedValue(expectedUser);

      // Act
      await service.createUser(createData);

      // Assert
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: UserRole.ADMIN,
          permissions: createData.permissions,
        }),
        select: expect.any(Object),
      });
    });

    it('should throw error when user email already exists', async () => {
      // Arrange
      const createData: CreateUserData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        companyId: 'company-id-123',
      };

      const existingUser = createMockUser();
      prismaMock.user.findUnique.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.createUser(createData)).rejects.toThrow(ApiError);
      await expect(service.createUser(createData)).rejects.toThrow('User with this email already exists');

      const error = await service.createUser(createData).catch(e => e);
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('USER_EXISTS');
    });

    it('should throw error when company not found', async () => {
      // Arrange
      const createData: CreateUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        companyId: 'non-existent-company',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.company.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createUser(createData)).rejects.toThrow(ApiError);
      await expect(service.createUser(createData)).rejects.toThrow('Company not found');

      const error = await service.createUser(createData).catch(e => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('COMPANY_NOT_FOUND');
    });

    it('should throw error when company is not active', async () => {
      // Arrange
      const createData: CreateUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        companyId: 'inactive-company-id',
      };

      const inactiveCompany = createMockCompany();
      inactiveCompany.isActive = false;

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.company.findUnique.mockResolvedValue(inactiveCompany);

      // Act & Assert
      await expect(service.createUser(createData)).rejects.toThrow(ApiError);
      await expect(service.createUser(createData)).rejects.toThrow('Company is not active');

      const error = await service.createUser(createData).catch(e => e);
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('COMPANY_INACTIVE');
    });
  });

  describe('getUserById', () => {
    it('should return user with company data when found', async () => {
      // Arrange
      const userId = 'user-id-123';
      const companyId = 'company-id-123';
      const mockUser = {
        ...createMockUser(),
        company: {
          id: companyId,
          name: 'Test Company',
          email: 'test@company.com',
        },
      };

      prismaMock.user.findFirst.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserById(userId, companyId);

      // Assert
      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: userId, companyId },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          companyId: true,
          role: true,
          permissions: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should return user without company filter when companyId not provided', async () => {
      // Arrange
      const userId = 'user-id-123';
      const mockUser = createMockUser();

      prismaMock.user.findFirst.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserById(userId);

      // Assert
      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const companyId = 'company-id-123';

      prismaMock.user.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getUserById(userId, companyId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-id-123';
      prismaMock.user.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getUserById(userId)).rejects.toThrow(ApiError);
      await expect(service.getUserById(userId)).rejects.toThrow('Failed to fetch user');

      const error = await service.getUserById(userId).catch(e => e);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('USER_FETCH_ERROR');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const userId = 'user-id-123';
      const companyId = 'company-id-123';
      const updateData: UpdateUserData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1987654321',
        isActive: false,
      };

      const existingUser = createMockUser();
      const updatedUser = { ...existingUser, ...updateData };

      jest.spyOn(service, 'getUserById').mockResolvedValue(existingUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUser(userId, companyId, updateData);

      // Assert
      expect(service.getUserById).toHaveBeenCalledWith(userId, companyId);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          ...updateData,
          updatedAt: expect.any(Date),
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const companyId = 'company-id-123';
      const updateData: UpdateUserData = { firstName: 'Updated' };

      jest.spyOn(service, 'getUserById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUser(userId, companyId, updateData)).rejects.toThrow(ApiError);
      await expect(service.updateUser(userId, companyId, updateData)).rejects.toThrow('User not found');

      const error = await service.updateUser(userId, companyId, updateData).catch(e => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('USER_NOT_FOUND');
    });

    it('should check for email duplicates when updating email', async () => {
      // Arrange
      const userId = 'user-id-123';
      const companyId = 'company-id-123';
      const updateData: UpdateUserData = {
        email: 'new@email.com',
      };

      const existingUser = createMockUser();
      existingUser.email = 'old@email.com';

      const duplicateUser = createMockUser();
      duplicateUser.email = 'new@email.com';

      jest.spyOn(service, 'getUserById').mockResolvedValue(existingUser);
      prismaMock.user.findUnique.mockResolvedValue(duplicateUser);

      // Act & Assert
      await expect(service.updateUser(userId, companyId, updateData)).rejects.toThrow(ApiError);
      await expect(service.updateUser(userId, companyId, updateData)).rejects.toThrow('Email already in use');

      const error = await service.updateUser(userId, companyId, updateData).catch(e => e);
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('EMAIL_EXISTS');
    });

    it('should allow keeping the same email', async () => {
      // Arrange
      const userId = 'user-id-123';
      const companyId = 'company-id-123';
      const sameEmail = 'same@email.com';
      const updateData: UpdateUserData = {
        email: sameEmail,
        firstName: 'Updated',
      };

      const existingUser = createMockUser();
      existingUser.email = sameEmail;

      const updatedUser = { ...existingUser, ...updateData };

      jest.spyOn(service, 'getUserById').mockResolvedValue(existingUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUser(userId, companyId, updateData);

      // Assert
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const params = {
        page: 1,
        limit: 10,
        sortBy: 'lastName',
        sortOrder: 'asc' as const,
      };

      const mockUsers = [
        createMockUser({ firstName: 'Alice', lastName: 'Smith' }),
        createMockUser({ firstName: 'Bob', lastName: 'Johnson' }),
        createMockUser({ firstName: 'Charlie', lastName: 'Brown' }),
      ];
      const totalCount = 25;

      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.user.count.mockResolvedValue(totalCount);

      // Act
      const result = await service.listUsers(companyId, params);

      // Assert
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { companyId },
        skip: 0,
        take: 10,
        orderBy: { lastName: 'asc' },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          companyId: true,
          role: true,
          permissions: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        }),
      });
      expect(prismaMock.user.count).toHaveBeenCalledWith({ where: { companyId } });
      expect(result).toEqual({
        users: mockUsers,
        total: totalCount,
      });
    });

    it('should search users by email, firstName, and lastName', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const params = {
        page: 1,
        limit: 10,
        search: 'john',
      };

      const mockUsers = [createMockUser({ firstName: 'John', lastName: 'Doe' })];
      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.user.count.mockResolvedValue(1);

      // Act
      await service.listUsers(companyId, params);

      // Assert
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          companyId,
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should handle different page and limit values', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const params = {
        page: 3,
        limit: 5,
      };

      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      // Act
      await service.listUsers(companyId, params);

      // Assert
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { companyId },
        skip: 10, // (3-1) * 5
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      // Arrange
      const userId = 'user-id-123';
      const companyId = 'company-id-123';
      const mockUser = createMockUser({ role: UserRole.USER });

      jest.spyOn(service, 'getUserById').mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      // Act
      await service.deleteUser(userId, companyId);

      // Assert
      expect(service.getUserById).toHaveBeenCalledWith(userId, companyId);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const companyId = 'company-id-123';

      jest.spyOn(service, 'getUserById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteUser(userId, companyId)).rejects.toThrow(ApiError);
      await expect(service.deleteUser(userId, companyId)).rejects.toThrow('User not found');

      const error = await service.deleteUser(userId, companyId).catch(e => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('USER_NOT_FOUND');
    });

    it('should prevent deleting the last admin', async () => {
      // Arrange
      const userId = 'admin-user-id';
      const companyId = 'company-id-123';
      const adminUser = createMockUser({ role: UserRole.ADMIN });

      jest.spyOn(service, 'getUserById').mockResolvedValue(adminUser);
      prismaMock.user.count.mockResolvedValue(1); // Only 1 admin remaining

      // Act & Assert
      await expect(service.deleteUser(userId, companyId)).rejects.toThrow(ApiError);
      await expect(service.deleteUser(userId, companyId)).rejects.toThrow('Cannot delete the last admin user');

      const error = await service.deleteUser(userId, companyId).catch(e => e);
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('LAST_ADMIN');

      expect(prismaMock.user.count).toHaveBeenCalledWith({
        where: {
          companyId,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });
    });

    it('should allow deleting admin when multiple admins exist', async () => {
      // Arrange
      const userId = 'admin-user-id';
      const companyId = 'company-id-123';
      const adminUser = createMockUser({ role: UserRole.ADMIN });

      jest.spyOn(service, 'getUserById').mockResolvedValue(adminUser);
      prismaMock.user.count.mockResolvedValue(3); // Multiple admins
      prismaMock.user.update.mockResolvedValue({ ...adminUser, isActive: false });

      // Act
      await service.deleteUser(userId, companyId);

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should allow deleting non-admin users without count check', async () => {
      // Arrange
      const userId = 'regular-user-id';
      const companyId = 'company-id-123';
      const regularUser = createMockUser({ role: UserRole.USER });

      jest.spyOn(service, 'getUserById').mockResolvedValue(regularUser);
      prismaMock.user.update.mockResolvedValue({ ...regularUser, isActive: false });

      // Act
      await service.deleteUser(userId, companyId);

      // Assert
      expect(prismaMock.user.count).not.toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalled();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const userId = 'user-id-123';
      const companyId = 'company-id-123';
      const newRole = UserRole.MANAGER;
      const mockUser = createMockUser({ role: UserRole.USER });
      const updatedUser = { ...mockUser, role: newRole };

      jest.spyOn(service, 'getUserById').mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUserRole(userId, companyId, newRole);

      // Assert
      expect(service.getUserById).toHaveBeenCalledWith(userId, companyId);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          role: newRole,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const companyId = 'company-id-123';
      const newRole = UserRole.MANAGER;

      jest.spyOn(service, 'getUserById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUserRole(userId, companyId, newRole)).rejects.toThrow(ApiError);
      await expect(service.updateUserRole(userId, companyId, newRole)).rejects.toThrow('User not found');

      const error = await service.updateUserRole(userId, companyId, newRole).catch(e => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('USER_NOT_FOUND');
    });

    it('should prevent removing the last admin role', async () => {
      // Arrange
      const userId = 'admin-user-id';
      const companyId = 'company-id-123';
      const newRole = UserRole.USER;
      const adminUser = createMockUser({ role: UserRole.ADMIN });

      jest.spyOn(service, 'getUserById').mockResolvedValue(adminUser);
      prismaMock.user.count.mockResolvedValue(1); // Only 1 admin remaining

      // Act & Assert
      await expect(service.updateUserRole(userId, companyId, newRole)).rejects.toThrow(ApiError);
      await expect(service.updateUserRole(userId, companyId, newRole)).rejects.toThrow('Cannot remove the last admin role');

      const error = await service.updateUserRole(userId, companyId, newRole).catch(e => e);
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('LAST_ADMIN');
    });

    it('should allow changing admin to admin (same role)', async () => {
      // Arrange
      const userId = 'admin-user-id';
      const companyId = 'company-id-123';
      const newRole = UserRole.ADMIN;
      const adminUser = createMockUser({ role: UserRole.ADMIN });

      jest.spyOn(service, 'getUserById').mockResolvedValue(adminUser);
      prismaMock.user.update.mockResolvedValue(adminUser);

      // Act
      const result = await service.updateUserRole(userId, companyId, newRole);

      // Assert
      expect(prismaMock.user.count).not.toHaveBeenCalled(); // No need to check admin count
      expect(result).toEqual(adminUser);
    });

    it('should allow promoting user to admin role', async () => {
      // Arrange
      const userId = 'user-id-123';
      const companyId = 'company-id-123';
      const newRole = UserRole.ADMIN;
      const regularUser = createMockUser({ role: UserRole.USER });
      const promotedUser = { ...regularUser, role: UserRole.ADMIN };

      jest.spyOn(service, 'getUserById').mockResolvedValue(regularUser);
      prismaMock.user.update.mockResolvedValue(promotedUser);

      // Act
      const result = await service.updateUserRole(userId, companyId, newRole);

      // Assert
      expect(prismaMock.user.count).not.toHaveBeenCalled(); // No need to check when promoting TO admin
      expect(result).toEqual(promotedUser);
    });
  });

  describe('verifyUser', () => {
    it('should verify user successfully', async () => {
      // Arrange
      const userId = 'user-id-123';
      const mockUser = createMockUser({ isVerified: false });

      prismaMock.user.update.mockResolvedValue({ ...mockUser, isVerified: true });

      // Act
      await service.verifyUser(userId);

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-id-123';
      prismaMock.user.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.verifyUser(userId)).rejects.toThrow(ApiError);
      await expect(service.verifyUser(userId)).rejects.toThrow('Failed to verify user');

      const error = await service.verifyUser(userId).catch(e => e);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('VERIFY_ERROR');
    });
  });

  describe('getUserStats', () => {
    it('should return comprehensive user statistics', async () => {
      // Arrange
      const companyId = 'company-id-123';

      // Mock the count queries
      prismaMock.user.count
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(20) // active
        .mockResolvedValueOnce(18); // verified

      // Mock the role groupBy query
      prismaMock.user.groupBy.mockResolvedValue([
        { role: UserRole.ADMIN, _count: 2 },
        { role: UserRole.MANAGER, _count: 3 },
        { role: UserRole.USER, _count: 15 },
        { role: UserRole.STAFF, _count: 5 },
      ] as any);

      // Act
      const result = await service.getUserStats(companyId);

      // Assert
      expect(result).toEqual({
        total: 25,
        active: 20,
        inactive: 5, // total - active
        verified: 18,
        unverified: 7, // total - verified
        byRole: {
          [UserRole.ADMIN]: 2,
          [UserRole.MANAGER]: 3,
          [UserRole.USER]: 15,
          [UserRole.STAFF]: 5,
        },
      });

      // Verify all queries were called with correct parameters
      expect(prismaMock.user.count).toHaveBeenNthCalledWith(1, { where: { companyId } });
      expect(prismaMock.user.count).toHaveBeenNthCalledWith(2, { where: { companyId, isActive: true } });
      expect(prismaMock.user.count).toHaveBeenNthCalledWith(3, { where: { companyId, isVerified: true } });
      expect(prismaMock.user.groupBy).toHaveBeenCalledWith({
        by: ['role'],
        where: { companyId, isActive: true },
        _count: true,
      });
    });

    it('should handle empty role statistics', async () => {
      // Arrange
      const companyId = 'company-id-123';

      prismaMock.user.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // active
        .mockResolvedValueOnce(0); // verified

      prismaMock.user.groupBy.mockResolvedValue([]);

      // Act
      const result = await service.getUserStats(companyId);

      // Assert
      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        verified: 0,
        unverified: 0,
        byRole: {},
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const companyId = 'company-id-123';
      prismaMock.user.count.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getUserStats(companyId)).rejects.toThrow(ApiError);
      await expect(service.getUserStats(companyId)).rejects.toThrow('Failed to fetch user statistics');

      const error = await service.getUserStats(companyId).catch(e => e);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('STATS_FETCH_ERROR');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined input gracefully', async () => {
      await expect(service.createUser(null as any)).rejects.toThrow();
      await expect(service.updateUser('', '', null as any)).rejects.toThrow();
    });

    it('should handle invalid role values', async () => {
      const createData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyId: 'company-id-123',
        role: 'INVALID_ROLE' as any,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.company.findUnique.mockResolvedValue(createMockCompany());
      prismaMock.user.create.mockRejectedValue(new Error('Invalid role'));

      await expect(service.createUser(createData)).rejects.toThrow(ApiError);
    });

    it('should handle bcrypt errors', async () => {
      const createData: CreateUserData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyId: 'company-id-123',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.company.findUnique.mockResolvedValue(createMockCompany());
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash failed'));

      await expect(service.createUser(createData)).rejects.toThrow(ApiError);
    });

    it('should handle empty search strings in listUsers', async () => {
      const companyId = 'company-id-123';
      const params = { page: 1, limit: 10, search: '' };
      
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const result = await service.listUsers(companyId, params);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { companyId },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should handle concurrent admin role changes', async () => {
      // This tests the scenario where two admins are being removed simultaneously
      const userId = 'admin-user-id';
      const companyId = 'company-id-123';
      const newRole = UserRole.USER;
      const adminUser = createMockUser({ role: UserRole.ADMIN });

      jest.spyOn(service, 'getUserById').mockResolvedValue(adminUser);
      prismaMock.user.count.mockResolvedValue(2); // 2 admins initially
      prismaMock.user.update.mockRejectedValue(new Error('Concurrent modification'));

      await expect(service.updateUserRole(userId, companyId, newRole)).rejects.toThrow(ApiError);

      const error = await service.updateUserRole(userId, companyId, newRole).catch(e => e);
      expect(error.errorCode).toBe('ROLE_UPDATE_ERROR');
    });
  });
});