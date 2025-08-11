import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ResponseHelper } from './response';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : error.type,
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));
    
    ResponseHelper.validationError(res, formattedErrors);
    return;
  }
  
  next();
};

/**
 * Create validation middleware from validation chains
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    handleValidationErrors(req, res, next);
  };
};

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  mongoId: /^[0-9a-fA-F]{24}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

/**
 * Custom validation functions
 */
export const CustomValidators = {
  isValidEmail: (value: string): boolean => {
    return ValidationPatterns.email.test(value);
  },
  
  isValidPhone: (value: string): boolean => {
    return ValidationPatterns.phone.test(value);
  },
  
  isStrongPassword: (value: string): boolean => {
    return ValidationPatterns.password.test(value);
  },
  
  isValidId: (value: string): boolean => {
    return ValidationPatterns.uuid.test(value);
  },
  
  isValidDate: (value: string): boolean => {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  },
  
  isValidEnum: (value: string, enumValues: string[]): boolean => {
    return enumValues.includes(value);
  },
};

/**
 * Validate request using Zod schema (middleware factory)
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const formattedErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input,
        }));
        ResponseHelper.validationError(res, formattedErrors);
        return;
      }
      ResponseHelper.serverError(res, 'Validation failed');
      return;
    }
  };
};

/**
 * Validate data using Zod schema (synchronous validation)
 */
export const validateData = (schema: any, data: any) => {
  try {
    return schema.parse(data);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const formattedErrors = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.input,
      }));
      throw new Error(`Validation failed: ${JSON.stringify(formattedErrors)}`);
    }
    throw error;
  }
};