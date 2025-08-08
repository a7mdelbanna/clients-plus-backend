import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { logger } from '../config/logger';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: (error as any).value,
    }));

    logger.warn('Validation failed:', { errors: formattedErrors, path: req.path });

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }
  
  next();
};

/**
 * Common validation rules
 */
export const validators = {
  // UUID validation
  isUUID: (field: string): ValidationChain => 
    body(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  isUUIDParam: (field: string): ValidationChain => 
    param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  isUUIDQuery: (field: string): ValidationChain => 
    query(field).optional().isUUID().withMessage(`${field} must be a valid UUID`),

  // Email validation
  isEmail: (field: string): ValidationChain => 
    body(field).isEmail().normalizeEmail().withMessage('Invalid email address'),

  // Password validation
  isPassword: (field: string): ValidationChain => 
    body(field)
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  // Phone validation
  isPhone: (field: string): ValidationChain => 
    body(field)
      .optional()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/)
      .withMessage('Invalid phone number format'),

  // String validation
  isString: (field: string, minLength = 1, maxLength = 255): ValidationChain => 
    body(field)
      .isString()
      .withMessage(`${field} must be a string`)
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`),

  // Number validation
  isNumber: (field: string, min?: number, max?: number): ValidationChain => {
    let validation = body(field).isNumeric().withMessage(`${field} must be a number`);
    if (min !== undefined) {
      validation = validation.custom(value => value >= min).withMessage(`${field} must be at least ${min}`);
    }
    if (max !== undefined) {
      validation = validation.custom(value => value <= max).withMessage(`${field} must be at most ${max}`);
    }
    return validation;
  },

  // Boolean validation
  isBoolean: (field: string): ValidationChain => 
    body(field).isBoolean().withMessage(`${field} must be a boolean`),

  // Date validation
  isDate: (field: string): ValidationChain => 
    body(field).isISO8601().withMessage(`${field} must be a valid date`),

  // Array validation
  isArray: (field: string, minLength = 0): ValidationChain => 
    body(field)
      .isArray({ min: minLength })
      .withMessage(`${field} must be an array with at least ${minLength} items`),

  // Enum validation
  isEnum: (field: string, values: string[]): ValidationChain => 
    body(field)
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`),

  // Optional field validators
  optionalString: (field: string, maxLength = 255): ValidationChain => 
    body(field)
      .optional()
      .isString()
      .withMessage(`${field} must be a string`)
      .isLength({ max: maxLength })
      .withMessage(`${field} must be at most ${maxLength} characters`),

  optionalNumber: (field: string, min?: number, max?: number): ValidationChain => {
    let validation = body(field).optional().isNumeric().withMessage(`${field} must be a number`);
    if (min !== undefined) {
      validation = validation.custom(value => !value || value >= min).withMessage(`${field} must be at least ${min}`);
    }
    if (max !== undefined) {
      validation = validation.custom(value => !value || value <= max).withMessage(`${field} must be at most ${max}`);
    }
    return validation;
  },

  optionalBoolean: (field: string): ValidationChain => 
    body(field).optional().isBoolean().withMessage(`${field} must be a boolean`),

  optionalDate: (field: string): ValidationChain => 
    body(field).optional().isISO8601().withMessage(`${field} must be a valid date`),

  optionalEnum: (field: string, values: string[]): ValidationChain => 
    body(field)
      .optional()
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`),
};

/**
 * Pagination validation
 */
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isString()
    .withMessage('Sort field must be a string'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
  query('search')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search query must be at most 100 characters'),
  handleValidationErrors,
];

/**
 * ID parameter validation
 */
export const idParamValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
  handleValidationErrors,
];

/**
 * Company ID validation
 */
export const companyIdValidation = [
  param('companyId').optional().isUUID().withMessage('Invalid company ID format'),
  query('companyId').optional().isUUID().withMessage('Invalid company ID format'),
  body('companyId').optional().isUUID().withMessage('Invalid company ID format'),
  handleValidationErrors,
];

/**
 * Custom validation middleware factory
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: (error as any).value,
      }));

      logger.warn('Validation failed:', { errors: formattedErrors, path: req.path });

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
      });
      return;
    }
    
    next();
  };
};

/**
 * Sanitize input data
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as any;
  }
  
  next();
};

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Remove potentially dangerous keys
        if (key.startsWith('$') || key.startsWith('__')) {
          continue;
        }
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    // Trim whitespace and remove null bytes
    return obj.trim().replace(/\0/g, '');
  }
  
  return obj;
}

/**
 * Validate request content type
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('content-type');
    
    if (!contentType) {
      res.status(400).json({
        success: false,
        message: 'Content-Type header is required',
        error: 'MISSING_CONTENT_TYPE',
      });
      return;
    }
    
    const hasValidType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!hasValidType) {
      res.status(415).json({
        success: false,
        message: `Unsupported content type. Allowed types: ${allowedTypes.join(', ')}`,
        error: 'UNSUPPORTED_CONTENT_TYPE',
      });
      return;
    }
    
    next();
  };
};

/**
 * Validate JSON content type for POST/PUT/PATCH requests
 */
export const requireJsonContent = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      res.status(415).json({
        success: false,
        message: 'Content-Type must be application/json',
        error: 'INVALID_CONTENT_TYPE',
      });
      return;
    }
  }
  
  next();
};