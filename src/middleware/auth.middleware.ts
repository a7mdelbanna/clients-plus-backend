import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt.utils';
import { authService } from '../services/auth.service';
import { logger } from '../config/logger';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        companyId: string;
        role: UserRole;
        permissions?: string[];
      };
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN',
      });
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Validate user still exists and is active
    const user = await authService.getUserById(payload.userId, payload.companyId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        error: 'USER_NOT_FOUND',
      });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      companyId: payload.companyId,
      role: payload.role,
      permissions: payload.permissions,
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    
    let errorMessage = 'Invalid or expired token';
    let errorCode = 'INVALID_TOKEN';
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorMessage = 'Token has expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (error.message.includes('revoked')) {
        errorMessage = 'Token has been revoked';
        errorCode = 'TOKEN_REVOKED';
      }
    }

    res.status(401).json({
      success: false,
      message: errorMessage,
      error: errorCode,
    });
  }
};

/**
 * Optional authentication middleware - continues even if no token is provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        const user = await authService.getUserById(payload.userId, payload.companyId);
        
        if (user) {
          req.user = {
            userId: payload.userId,
            email: payload.email,
            companyId: payload.companyId,
            role: payload.role,
            permissions: payload.permissions,
          };
        }
      } catch (error) {
        // Token is invalid, but we continue without authentication
        logger.warn('Optional auth failed:', error);
      }
    }

    next();
  } catch (error) {
    // Continue without authentication on any error
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const roleHierarchy: Record<UserRole, number> = {
      SUPER_ADMIN: 6,
      ADMIN: 5,
      MANAGER: 4,
      USER: 3,
      STAFF: 2,
      RECEPTIONIST: 1,
    };

    const userRoleLevel = roleHierarchy[req.user.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_ROLE',
        required: requiredRole,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
        current: userPermissions,
      });
      return;
    }

    next();
  };
};

/**
 * Multiple roles authorization middleware (user must have ANY of the specified roles)
 */
export const requireAnyRole = (requiredRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const roleHierarchy: Record<UserRole, number> = {
      SUPER_ADMIN: 6,
      ADMIN: 5,
      MANAGER: 4,
      USER: 3,
      STAFF: 2,
      RECEPTIONIST: 1,
    };

    const userRoleLevel = roleHierarchy[req.user.role];
    const hasRequiredRole = requiredRoles.some(role => 
      userRoleLevel >= roleHierarchy[role]
    );

    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_ROLE',
        required: requiredRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};

/**
 * Company isolation middleware - ensures user can only access their company's data
 */
export const requireSameCompany = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED',
    });
    return;
  }

  // Check if companyId is provided in request (params, query, or body)
  const requestCompanyId = req.params.companyId || req.query.companyId || req.body.companyId;
  
  if (requestCompanyId && requestCompanyId !== req.user.companyId) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Company isolation violation',
      error: 'COMPANY_ACCESS_DENIED',
    });
    return;
  }

  next();
};

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Admin or super admin middleware
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Manager or higher middleware
 */
export const requireManager = requireRole(UserRole.MANAGER);

/**
 * Staff or higher middleware
 */
export const requireStaff = requireRole(UserRole.STAFF);

/**
 * Rate limiting middleware for sensitive operations
 */
export const rateLimitSensitive = (req: Request, res: Response, next: NextFunction): void => {
  // This is a placeholder - in production, you'd use Redis-based rate limiting
  // For now, we'll track attempts in memory (not recommended for production)
  const key = `${req.ip}:${req.path}`;
  
  // Simple rate limiting logic would go here
  // For production, use express-rate-limit with Redis store
  next();
};

/**
 * Middleware to validate company is active
 */
export const requireActiveCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Validate company access
    const hasAccess = await authService.validateUserAccess(
      req.user.userId,
      req.user.companyId
    );

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Company account is not active',
        error: 'COMPANY_INACTIVE',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating company access:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating access',
      error: 'VALIDATION_ERROR',
    });
  }
};

/**
 * Combined authentication and company validation middleware
 */
export const authenticate = [authenticateToken, requireActiveCompany];

/**
 * Authentication with role requirement
 */
export const authenticateWithRole = (role: UserRole) => [
  authenticateToken,
  requireActiveCompany,
  requireRole(role),
];

/**
 * Authentication with permissions requirement
 */
export const authenticateWithPermissions = (permissions: string[]) => [
  authenticateToken,
  requireActiveCompany,
  requirePermissions(permissions),
];

/**
 * Full authentication with company isolation
 */
export const authenticateWithCompany = [
  authenticateToken,
  requireActiveCompany,
  requireSameCompany,
];