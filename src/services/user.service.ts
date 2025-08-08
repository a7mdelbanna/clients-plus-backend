import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/error.middleware';
import { QueryParams } from '../types';
import { env } from '../config/env';

const prisma = new PrismaClient();

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  companyId: string;
  role?: UserRole;
  permissions?: string[];
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
  permissions?: string[];
  isActive?: boolean;
}

export class UserService {
  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<Omit<User, 'password'>> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ApiError(409, 'User with this email already exists', 'USER_EXISTS');
      }

      // Validate company exists and is active
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
      });

      if (!company) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }

      if (!company.isActive) {
        throw new ApiError(400, 'Company is not active', 'COMPANY_INACTIVE');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
          role: data.role || UserRole.USER,
          permissions: data.permissions || undefined,
          isActive: true,
          isVerified: false,
        },
        select: {
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
          resetToken: true,
          resetTokenExpiry: true,
          verificationToken: true,
          verificationTokenExpiry: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info(`User created: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create user', 'USER_CREATE_ERROR');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string, companyId?: string): Promise<Omit<User, 'password'> | null> {
    try {
      const where: any = { id: userId };
      if (companyId) {
        where.companyId = companyId;
      }

      const user = await prisma.user.findFirst({
        where,
        select: {
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
          resetToken: true,
          resetTokenExpiry: true,
          verificationToken: true,
          verificationTokenExpiry: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return user;
    } catch (error) {
      logger.error('Error fetching user:', error);
      throw new ApiError(500, 'Failed to fetch user', 'USER_FETCH_ERROR');
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    companyId: string,
    data: UpdateUserData
  ): Promise<Omit<User, 'password'>> {
    try {
      // Check if user exists
      const existingUser = await this.getUserById(userId, companyId);
      if (!existingUser) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: data.email },
        });
        if (emailExists) {
          throw new ApiError(409, 'Email already in use', 'EMAIL_EXISTS');
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        select: {
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
          resetToken: true,
          resetTokenExpiry: true,
          verificationToken: true,
          verificationTokenExpiry: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info(`User updated: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update user', 'USER_UPDATE_ERROR');
    }
  }

  /**
   * List users for a company
   */
  async listUsers(
    companyId: string,
    params: QueryParams
  ): Promise<{ users: Omit<User, 'password'>[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const skip = (page - 1) * limit;

      const where: any = { companyId };
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
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
            resetToken: true,
            resetTokenExpiry: true,
            verificationToken: true,
            verificationTokenExpiry: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      return { users, total };
    } catch (error) {
      logger.error('Error listing users:', error);
      throw new ApiError(500, 'Failed to list users', 'USER_LIST_ERROR');
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, companyId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId, companyId);
      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Prevent deleting the last admin
      if (user.role === UserRole.ADMIN) {
        const adminCount = await prisma.user.count({
          where: {
            companyId,
            role: UserRole.ADMIN,
            isActive: true,
          },
        });

        if (adminCount <= 1) {
          throw new ApiError(400, 'Cannot delete the last admin user', 'LAST_ADMIN');
        }
      }

      // Soft delete by setting isActive to false
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info(`User deleted: ${user.email} (${user.id})`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete user', 'USER_DELETE_ERROR');
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(
    userId: string,
    companyId: string,
    newRole: UserRole
  ): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.getUserById(userId, companyId);
      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Check if changing from admin role
      if (user.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
        const adminCount = await prisma.user.count({
          where: {
            companyId,
            role: UserRole.ADMIN,
            isActive: true,
          },
        });

        if (adminCount <= 1) {
          throw new ApiError(400, 'Cannot remove the last admin role', 'LAST_ADMIN');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          role: newRole,
          updatedAt: new Date(),
        },
        select: {
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
          resetToken: true,
          resetTokenExpiry: true,
          verificationToken: true,
          verificationTokenExpiry: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info(`User role updated: ${user.email} from ${user.role} to ${newRole}`);
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user role:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update user role', 'ROLE_UPDATE_ERROR');
    }
  }

  /**
   * Verify user email
   */
  async verifyUser(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          updatedAt: new Date(),
        },
      });

      logger.info(`User verified: ${userId}`);
    } catch (error) {
      logger.error('Error verifying user:', error);
      throw new ApiError(500, 'Failed to verify user', 'VERIFY_ERROR');
    }
  }

  /**
   * Get user statistics for a company
   */
  async getUserStats(companyId: string): Promise<any> {
    try {
      const [total, active, verified, byRole] = await Promise.all([
        prisma.user.count({ where: { companyId } }),
        prisma.user.count({ where: { companyId, isActive: true } }),
        prisma.user.count({ where: { companyId, isVerified: true } }),
        prisma.user.groupBy({
          by: ['role'],
          where: { companyId, isActive: true },
          _count: true,
        }),
      ]);

      const roleStats = byRole.reduce((acc, item) => {
        acc[item.role] = item._count;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        active,
        inactive: total - active,
        verified,
        unverified: total - verified,
        byRole: roleStats,
      };
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      throw new ApiError(500, 'Failed to fetch user statistics', 'STATS_FETCH_ERROR');
    }
  }
}

export const userService = new UserService();