import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  details?: any;

  constructor(statusCode: number, message: string, errorCode?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || 'API_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Prisma errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): ApiError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(', ') || 'field';
      return new ApiError(409, `Duplicate value for ${field}`, 'DUPLICATE_ENTRY', error.meta);
    
    case 'P2003':
      // Foreign key constraint violation
      return new ApiError(400, 'Referenced record not found', 'FOREIGN_KEY_ERROR', error.meta);
    
    case 'P2025':
      // Record not found
      return new ApiError(404, 'Record not found', 'NOT_FOUND', error.meta);
    
    case 'P2014':
      // Relation violation
      return new ApiError(400, 'Invalid relation data', 'RELATION_ERROR', error.meta);
    
    case 'P2016':
      // Query interpretation error
      return new ApiError(400, 'Invalid query', 'QUERY_ERROR', error.meta);
    
    default:
      return new ApiError(500, 'Database error', 'DATABASE_ERROR', { code: error.code });
  }
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error('Error caught by handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    user: req.user?.userId,
  });

  // Handle known error types
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.errorCode,
      details: env.NODE_ENV === 'development' ? err.details : undefined,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const apiError = handlePrismaError(err);
    res.status(apiError.statusCode).json({
      success: false,
      message: apiError.message,
      error: apiError.errorCode,
      details: env.NODE_ENV === 'development' ? apiError.details : undefined,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: env.NODE_ENV === 'development' ? err : undefined,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle syntax errors (e.g., invalid JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON payload',
      error: 'INVALID_JSON',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    error: 'INTERNAL_ERROR',
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Not found handler (404)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async error wrapper
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized error responses
 */
export const errorResponses = {
  badRequest: (message = 'Bad request', details?: any) => 
    new ApiError(400, message, 'BAD_REQUEST', details),
  
  unauthorized: (message = 'Unauthorized') => 
    new ApiError(401, message, 'UNAUTHORIZED'),
  
  forbidden: (message = 'Forbidden') => 
    new ApiError(403, message, 'FORBIDDEN'),
  
  notFound: (resource = 'Resource') => 
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),
  
  conflict: (message = 'Resource conflict', details?: any) => 
    new ApiError(409, message, 'CONFLICT', details),
  
  validationError: (message = 'Validation failed', errors?: any) => 
    new ApiError(422, message, 'VALIDATION_ERROR', errors),
  
  tooManyRequests: (message = 'Too many requests') => 
    new ApiError(429, message, 'TOO_MANY_REQUESTS'),
  
  internalError: (message = 'Internal server error') => 
    new ApiError(500, message, 'INTERNAL_ERROR'),
  
  serviceUnavailable: (message = 'Service temporarily unavailable') => 
    new ApiError(503, message, 'SERVICE_UNAVAILABLE'),
};

/**
 * Validate error middleware order
 */
export const validateErrorMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // This should be one of the last middleware
  // Log a warning if response was already sent
  if (res.headersSent) {
    logger.warn('Response already sent before error middleware', {
      path: req.path,
      method: req.method,
    });
  }
  next();
};

/**
 * Handle uncaught exceptions and unhandled rejections
 */
export const setupErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    // Give time to log before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection:', { reason, promise });
    // Give time to log before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};