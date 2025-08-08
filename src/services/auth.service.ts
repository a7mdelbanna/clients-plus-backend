import bcrypt from 'bcryptjs';
import { PrismaClient, User, UserRole } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  generateTokenPair,
  generateTokenId,
  verifyRefreshToken,
  blacklistAccessToken,
  blacklistRefreshToken,
  TokenPair,
  JWTPayload,
  RefreshTokenPayload,
} from '../utils/jwt.utils';

const prisma = new PrismaClient();

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyId: string;
  role?: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
  companyId?: string; // Optional if multi-tenant login
}

export interface AuthResult {
  user: Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry' | 'verificationToken' | 'verificationTokenExpiry'>;
  tokens: TokenPair;
}

export interface RefreshTokenResult {
  tokens: TokenPair;
  user: Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry' | 'verificationToken' | 'verificationTokenExpiry'>;
}

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Create user payload for JWT
   */
  private createUserPayload(user: User): Omit<JWTPayload, 'iat' | 'exp'> {
    return {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      permissions: user.permissions ? (user.permissions as string[]) : undefined,
    };
  }

  /**
   * Create refresh token payload
   */
  private createRefreshPayload(user: User): Omit<RefreshTokenPayload, 'iat' | 'exp'> {
    return {
      userId: user.id,
      companyId: user.companyId,
      tokenId: generateTokenId(),
    };
  }

  /**
   * Sanitize user object (remove sensitive data)
   */
  private sanitizeUser(user: User): Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry' | 'verificationToken' | 'verificationTokenExpiry'> {
    const { password, resetToken, resetTokenExpiry, verificationToken, verificationTokenExpiry, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterUserData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate company exists
      const company = await prisma.company.findUnique({
        where: { id: userData.companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      if (!company.isActive) {
        throw new Error('Company account is not active');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          companyId: userData.companyId,
          role: userData.role || UserRole.USER,
          isActive: true,
          isVerified: false, // Require email verification
        },
      });

      // Generate tokens
      const userPayload = this.createUserPayload(user);
      const refreshPayload = this.createRefreshPayload(user);
      const tokens = generateTokenPair(userPayload, refreshPayload);

      // Log successful registration
      logger.info(`User registered successfully: ${user.email} (Company: ${company.name})`);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user and return tokens
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Find user by email
      let user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: {
          company: true,
        },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // If companyId is provided, validate it matches
      if (credentials.companyId && user.companyId !== credentials.companyId) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Check if company is active
      if (!user.company.isActive) {
        throw new Error('Company account is not active');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(credentials.password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login timestamp
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { company: true },
      });

      // Generate tokens
      const userPayload = this.createUserPayload(user);
      const refreshPayload = this.createRefreshPayload(user);
      const tokens = generateTokenPair(userPayload, refreshPayload);

      // Log successful login
      logger.info(`User logged in: ${user.email} (Company: ${user.company.name})`);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    try {
      // Verify refresh token
      const refreshPayload = verifyRefreshToken(refreshToken);

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: refreshPayload.userId },
        include: { company: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Check if company is active
      if (!user.company.isActive) {
        throw new Error('Company account is not active');
      }

      // Validate company matches
      if (user.companyId !== refreshPayload.companyId) {
        throw new Error('Invalid refresh token');
      }

      // Generate new token pair
      const userPayload = this.createUserPayload(user);
      const newRefreshPayload = this.createRefreshPayload(user);
      const tokens = generateTokenPair(userPayload, newRefreshPayload);

      // Blacklist old refresh token
      blacklistRefreshToken(refreshToken);

      logger.info(`Token refreshed for user: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout user (blacklist tokens)
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      // Blacklist access token
      blacklistAccessToken(accessToken);

      // Blacklist refresh token if provided
      if (refreshToken) {
        blacklistRefreshToken(refreshToken);
      }

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with company information
   */
  async getUserById(userId: string, companyId: string): Promise<Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry' | 'verificationToken' | 'verificationTokenExpiry'> | null> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: companyId,
          isActive: true,
        },
        include: {
          company: true,
        },
      });

      if (!user) {
        return null;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, companyId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Find user
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: companyId,
          isActive: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Validate user permissions for a specific action
   */
  async validateUserAccess(userId: string, companyId: string, requiredRole?: UserRole, requiredPermissions?: string[]): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: companyId,
          isActive: true,
        },
        include: {
          company: true,
        },
      });

      if (!user || !user.company.isActive) {
        return false;
      }

      // Check role requirement
      if (requiredRole) {
        const roleHierarchy: Record<UserRole, number> = {
          SUPER_ADMIN: 6,
          ADMIN: 5,
          MANAGER: 4,
          USER: 3,
          STAFF: 2,
          RECEPTIONIST: 1,
        };

        if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
          return false;
        }
      }

      // Check permissions requirement
      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions = user.permissions ? (user.permissions as string[]) : [];
        const hasRequiredPermissions = requiredPermissions.every(permission =>
          userPermissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error validating user access:', error);
      return false;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate reset token (could use crypto.randomBytes for production)
      const resetToken = generateTokenId();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      logger.info(`Password reset token generated for user: ${email}`);
      return resetToken;
    } catch (error) {
      logger.error('Error generating password reset token:', error);
      throw error;
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          resetToken,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      logger.info(`Password reset completed for user: ${user.email}`);
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired tokens and user sessions
   */
  async cleanup(): Promise<void> {
    try {
      // Clear expired reset tokens
      await prisma.user.updateMany({
        where: {
          resetTokenExpiry: {
            lt: new Date(),
          },
        },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Clear expired verification tokens
      await prisma.user.updateMany({
        where: {
          verificationTokenExpiry: {
            lt: new Date(),
          },
        },
        data: {
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });

      logger.info('Auth service cleanup completed');
    } catch (error) {
      logger.error('Auth service cleanup failed:', error);
    }
  }
}

export const authService = new AuthService();