import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import { authService, RegisterUserData, RegisterWithCompanyData, LoginCredentials } from '../services/auth.service';
import { extractTokenFromHeader, generateTokenPair, generateTokenId } from '../utils/jwt.utils';
import { logger } from '../config/logger';
import firebaseService from '../config/firebase';
import { prisma } from '../config/database';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        companyId,
        role,
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !companyId) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: email, password, firstName, lastName, companyId',
          error: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      const userData: RegisterUserData = {
        email,
        password,
        firstName,
        lastName,
        phone,
        companyId,
        role: role as UserRole || UserRole.USER,
      };

      const result = await authService.register(userData);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      
      let statusCode = 500;
      let errorCode = 'REGISTRATION_FAILED';
      let message = 'Registration failed';

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          statusCode = 409;
          errorCode = 'USER_EXISTS';
          message = 'User with this email already exists';
        } else if (error.message.includes('Company not found')) {
          statusCode = 400;
          errorCode = 'COMPANY_NOT_FOUND';
          message = 'Company not found';
        } else if (error.message.includes('Company account is not active')) {
          statusCode = 400;
          errorCode = 'COMPANY_INACTIVE';
          message = 'Company account is not active';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Register a new user with a new company
   */
  async registerWithCompany(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        companyName,
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: email, password, firstName, lastName',
          error: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      const userData: RegisterWithCompanyData = {
        email,
        password,
        firstName,
        lastName,
        phone,
        companyName,
      };

      const result = await authService.registerWithCompany(userData);

      res.status(201).json({
        success: true,
        message: 'User and company registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      logger.error('Registration with company error:', error);
      
      let statusCode = 500;
      let errorCode = 'REGISTRATION_FAILED';
      let message = 'Registration failed';

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          statusCode = 409;
          errorCode = 'USER_EXISTS';
          message = 'User with this email already exists';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { email, password, companyId } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
          error: 'MISSING_CREDENTIALS',
        });
        return;
      }

      const credentials: LoginCredentials = {
        email,
        password,
        companyId,
      };

      const result = await authService.login(credentials);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      
      let statusCode = 500;
      let errorCode = 'LOGIN_FAILED';
      let message = 'Login failed';

      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          statusCode = 401;
          errorCode = 'INVALID_CREDENTIALS';
          message = 'Invalid email or password';
        } else if (error.message.includes('User account is deactivated')) {
          statusCode = 401;
          errorCode = 'ACCOUNT_DEACTIVATED';
          message = 'User account is deactivated';
        } else if (error.message.includes('Company account is not active')) {
          statusCode = 401;
          errorCode = 'COMPANY_INACTIVE';
          message = 'Company account is not active';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          error: 'MISSING_REFRESH_TOKEN',
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      let statusCode = 401;
      let errorCode = 'REFRESH_FAILED';
      let message = 'Token refresh failed';

      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          errorCode = 'INVALID_REFRESH_TOKEN';
          message = 'Invalid or expired refresh token';
        } else if (error.message.includes('User not found')) {
          errorCode = 'USER_NOT_FOUND';
          message = 'User not found';
        } else if (error.message.includes('User account is deactivated')) {
          errorCode = 'ACCOUNT_DEACTIVATED';
          message = 'User account is deactivated';
        } else if (error.message.includes('Company account is not active')) {
          errorCode = 'COMPANY_INACTIVE';
          message = 'Company account is not active';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = extractTokenFromHeader(authHeader);
      const { refreshToken } = req.body;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          message: 'Access token is required',
          error: 'MISSING_ACCESS_TOKEN',
        });
        return;
      }

      await authService.logout(accessToken, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: 'LOGOUT_FAILED',
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const user = await authService.getUserById(req.user.userId, req.user.companyId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user,
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        error: 'PROFILE_RETRIEVAL_FAILED',
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
          error: 'MISSING_PASSWORDS',
        });
        return;
      }

      // Validate password strength (basic validation)
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long',
          error: 'PASSWORD_TOO_SHORT',
        });
        return;
      }

      await authService.changePassword(
        req.user.userId,
        req.user.companyId,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      
      let statusCode = 500;
      let errorCode = 'PASSWORD_CHANGE_FAILED';
      let message = 'Password change failed';

      if (error instanceof Error) {
        if (error.message.includes('User not found')) {
          statusCode = 404;
          errorCode = 'USER_NOT_FOUND';
          message = 'User not found';
        } else if (error.message.includes('Current password is incorrect')) {
          statusCode = 400;
          errorCode = 'INVALID_CURRENT_PASSWORD';
          message = 'Current password is incorrect';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL',
        });
        return;
      }

      // Always return success to prevent email enumeration attacks
      try {
        const resetToken = await authService.generatePasswordResetToken(email);
        
        // In production, send email with reset token
        // For now, we'll log it (remove this in production)
        logger.info(`Password reset token for ${email}: ${resetToken}`);
        
      } catch (error) {
        // Don't reveal if user exists or not
        logger.warn('Password reset request for non-existent user:', email);
      }

      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent',
      });
    } catch (error) {
      logger.error('Request password reset error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Password reset request failed',
        error: 'RESET_REQUEST_FAILED',
      });
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body;

      // Validate required fields
      if (!resetToken || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Reset token and new password are required',
          error: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Validate password strength
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long',
          error: 'PASSWORD_TOO_SHORT',
        });
        return;
      }

      await authService.resetPassword(resetToken, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      
      let statusCode = 500;
      let errorCode = 'PASSWORD_RESET_FAILED';
      let message = 'Password reset failed';

      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired reset token')) {
          statusCode = 400;
          errorCode = 'INVALID_RESET_TOKEN';
          message = 'Invalid or expired reset token';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Verify token (for testing purposes)
   */
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            userId: req.user.userId,
            email: req.user.email,
            companyId: req.user.companyId,
            role: req.user.role,
            permissions: req.user.permissions,
          },
        },
      });
    } catch (error) {
      logger.error('Token verification error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Token verification failed',
        error: 'VERIFICATION_FAILED',
      });
    }
  }

  /**
   * Verify Firebase ID token and create Express session
   * This endpoint bridges Firebase authentication with Express JWT tokens
   */
  async verifyFirebaseToken(req: Request, res: Response): Promise<void> {
    try {
      const { firebaseToken, companyId } = req.body;

      if (!firebaseToken) {
        res.status(400).json({
          success: false,
          message: 'Firebase ID token is required',
          error: 'MISSING_FIREBASE_TOKEN',
        });
        return;
      }

      // Check if Firebase is available
      if (!firebaseService.isAvailable()) {
        res.status(503).json({
          success: false,
          message: 'Firebase service is not available',
          error: 'FIREBASE_UNAVAILABLE',
        });
        return;
      }

      // Verify Firebase ID token
      const decodedToken = await firebaseService.verifyIdToken(firebaseToken);
      if (!decodedToken) {
        res.status(401).json({
          success: false,
          message: 'Invalid Firebase ID token',
          error: 'INVALID_FIREBASE_TOKEN',
        });
        return;
      }

      // Extract phone number from Firebase token
      const phoneNumber = decodedToken.phone_number;
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number not found in Firebase token',
          error: 'MISSING_PHONE_NUMBER',
        });
        return;
      }

      // Get client data from Firebase
      const clientData = await firebaseService.getClientByPhone(phoneNumber, companyId);
      if (!clientData) {
        res.status(404).json({
          success: false,
          message: 'Client not found',
          error: 'CLIENT_NOT_FOUND',
        });
        return;
      }

      // Generate Express JWT tokens for this client session
      const userPayload = {
        userId: clientData.id,
        email: clientData.email || `${clientData.phone}@client.local`,
        companyId: clientData.companyId,
        role: 'USER' as UserRole, // Client sessions use USER role
      };

      const refreshPayload = {
        userId: clientData.id,
        companyId: clientData.companyId,
        tokenId: generateTokenId(),
      };

      const tokens = generateTokenPair(userPayload, refreshPayload);

      // Log successful authentication bridge
      logger.info('Firebase-Express authentication bridge successful', {
        clientId: clientData.id,
        phoneNumber: clientData.phone,
        companyId: clientData.companyId,
        firebaseUid: decodedToken.uid,
      });

      res.status(200).json({
        success: true,
        message: 'Firebase token verified and Express session created',
        data: {
          client: {
            id: clientData.id,
            name: clientData.name,
            phone: clientData.phone,
            email: clientData.email,
            companyId: clientData.companyId,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            refreshExpiresIn: tokens.refreshExpiresIn,
          },
          firebaseUid: decodedToken.uid,
        },
      });
    } catch (error) {
      logger.error('Firebase token verification error:', error);
      
      let statusCode = 500;
      let errorCode = 'FIREBASE_VERIFICATION_FAILED';
      let message = 'Firebase token verification failed';

      if (error instanceof Error) {
        if (error.message.includes('Firebase Admin SDK not initialized')) {
          statusCode = 503;
          errorCode = 'FIREBASE_UNAVAILABLE';
          message = 'Firebase service is not available';
        } else if (error.message.includes('Invalid token')) {
          statusCode = 401;
          errorCode = 'INVALID_FIREBASE_TOKEN';
          message = 'Invalid Firebase ID token';
        }
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: errorCode,
      });
    }
  }

  /**
   * Health check for auth service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const firebaseAvailable = firebaseService.isAvailable();
      
      res.status(200).json({
        success: true,
        message: 'Auth service is healthy',
        timestamp: new Date().toISOString(),
        service: 'authentication',
        integrations: {
          firebase: firebaseAvailable ? 'available' : 'unavailable'
        },
      });
    } catch (error) {
      logger.error('Auth health check error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Auth service health check failed',
        error: 'HEALTH_CHECK_FAILED',
      });
    }
  }

  /**
   * Update current user's profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { firstName, lastName, phone, avatar } = req.body;
      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(avatar !== undefined && { avatar }),
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
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      logger.error('Update profile error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: 'PROFILE_UPDATE_FAILED',
      });
    }
  }
}

export const authController = new AuthController();