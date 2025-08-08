import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

/**
 * Extract company ID from request
 */
export const extractCompanyId = (req: Request): string | undefined => {
  // Priority order: authenticated user > params > query > body > headers
  if (req.user?.companyId) {
    return req.user.companyId;
  }
  
  if (req.params.companyId) {
    return req.params.companyId;
  }
  
  if (req.query.companyId) {
    return req.query.companyId as string;
  }
  
  if (req.body?.companyId) {
    return req.body.companyId;
  }
  
  // Check for custom header (useful for API integrations)
  const headerCompanyId = req.headers['x-company-id'];
  if (headerCompanyId && typeof headerCompanyId === 'string') {
    return headerCompanyId;
  }
  
  return undefined;
};

/**
 * Tenant isolation middleware - ensures data isolation between companies
 */
export const tenantIsolation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = extractCompanyId(req);
    
    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
      });
      return;
    }

    // Validate company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    if (!company.isActive) {
      res.status(403).json({
        success: false,
        message: 'Company account is not active',
        error: 'COMPANY_INACTIVE',
      });
      return;
    }

    // If user is authenticated, verify they belong to the company
    if (req.user && req.user.companyId !== companyId) {
      res.status(403).json({
        success: false,
        message: 'Access denied: Company mismatch',
        error: 'COMPANY_MISMATCH',
      });
      return;
    }

    // Attach company info to request for downstream use
    (req as any).company = company;
    (req as any).companyId = companyId;

    next();
  } catch (error) {
    logger.error('Tenant isolation error:', error);
    res.status(500).json({
      success: false,
      message: 'Tenant validation failed',
      error: 'TENANT_VALIDATION_ERROR',
    });
  }
};

/**
 * Validate user belongs to company
 */
export const validateCompanyMembership = async (
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

    const companyId = extractCompanyId(req);
    
    if (!companyId) {
      // If no company ID specified, use user's company
      (req as any).companyId = req.user.companyId;
      next();
      return;
    }

    // Verify user belongs to the specified company
    if (req.user.companyId !== companyId) {
      // Allow super admins to access any company
      if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied: You cannot access this company\'s data',
          error: 'COMPANY_ACCESS_DENIED',
        });
        return;
      }
    }

    (req as any).companyId = companyId;
    next();
  } catch (error) {
    logger.error('Company membership validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Company validation failed',
      error: 'COMPANY_VALIDATION_ERROR',
    });
  }
};

/**
 * Apply tenant filter to Prisma queries
 */
export const applyTenantFilter = (companyId: string) => {
  return {
    where: {
      companyId,
    },
  };
};

/**
 * Middleware to add tenant filter to all database queries
 */
export const autoTenantFilter = (req: Request, res: Response, next: NextFunction): void => {
  const companyId = (req as any).companyId || req.user?.companyId;
  
  if (companyId) {
    // Store tenant filter in request for use in services
    (req as any).tenantFilter = applyTenantFilter(companyId);
  }
  
  next();
};

/**
 * Validate branch belongs to company
 */
export const validateBranchAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branchId = req.params.branchId || req.body.branchId;
    const companyId = (req as any).companyId || req.user?.companyId;

    if (!branchId) {
      next();
      return;
    }

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
      });
      return;
    }

    // Validate branch belongs to company
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId,
      },
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        message: 'Branch not found or access denied',
        error: 'BRANCH_NOT_FOUND',
      });
      return;
    }

    // Attach branch info to request
    (req as any).branch = branch;
    next();
  } catch (error) {
    logger.error('Branch validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Branch validation failed',
      error: 'BRANCH_VALIDATION_ERROR',
    });
  }
};

/**
 * Validate staff member belongs to company
 */
export const validateStaffAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staffId = req.params.staffId || req.body.staffId;
    const companyId = (req as any).companyId || req.user?.companyId;

    if (!staffId) {
      next();
      return;
    }

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
      });
      return;
    }

    // Validate staff belongs to company
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        companyId,
      },
    });

    if (!staff) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found or access denied',
        error: 'STAFF_NOT_FOUND',
      });
      return;
    }

    // Attach staff info to request
    (req as any).staff = staff;
    next();
  } catch (error) {
    logger.error('Staff validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Staff validation failed',
      error: 'STAFF_VALIDATION_ERROR',
    });
  }
};

/**
 * Validate client belongs to company
 */
export const validateClientAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.params.clientId || req.body.clientId;
    const companyId = (req as any).companyId || req.user?.companyId;

    if (!clientId) {
      next();
      return;
    }

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
      });
      return;
    }

    // Validate client belongs to company
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
      },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found or access denied',
        error: 'CLIENT_NOT_FOUND',
      });
      return;
    }

    // Attach client info to request
    (req as any).client = client;
    next();
  } catch (error) {
    logger.error('Client validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Client validation failed',
      error: 'CLIENT_VALIDATION_ERROR',
    });
  }
};

/**
 * Multi-tenant data sanitization
 * Ensures response data doesn't leak across tenants
 */
export const sanitizeTenantData = (data: any, companyId: string): any => {
  if (!data) return data;
  
  // If it's an array, sanitize each item
  if (Array.isArray(data)) {
    return data.filter(item => 
      !item.companyId || item.companyId === companyId
    );
  }
  
  // If it's an object with companyId, verify it matches
  if (data.companyId && data.companyId !== companyId) {
    return null;
  }
  
  return data;
};

/**
 * Middleware to automatically sanitize response data
 */
export const autoSanitizeResponse = (req: Request, res: Response, next: NextFunction): void => {
  const companyId = (req as any).companyId || req.user?.companyId;
  
  if (!companyId) {
    next();
    return;
  }
  
  // Override res.json to automatically sanitize data
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    if (data && data.data) {
      data.data = sanitizeTenantData(data.data, companyId);
    }
    return originalJson(data);
  };
  
  next();
};