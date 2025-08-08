import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError, body, param, query } from 'express-validator';
import {
  handleValidationErrors,
  validators,
  paginationValidation,
  idParamValidation,
  companyIdValidation,
  validate,
  sanitizeInput,
  validateContentType,
  requireJsonContent,
} from '../../src/middleware/validation.middleware';
import {
  createMockReq,
  createMockRes,
  createMockNext,
  TestHttpStatus,
  resetAllMocks,
} from '../utils/test-helpers';

// Mock express-validator
jest.mock('express-validator', () => {
  const actual = jest.requireActual('express-validator');
  return {
    ...actual,
    validationResult: jest.fn(),
  };
});

// Mock logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Validation Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = createMockReq();
    mockRes = createMockRes();
    mockNext = createMockNext();
    resetAllMocks();
  });

  describe('handleValidationErrors', () => {
    it('should continue when no validation errors', () => {
      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      handleValidationErrors(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return formatted validation errors', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'email',
          msg: 'Invalid email format',
          value: 'invalid-email',
        },
        {
          type: 'field',
          path: 'password',
          msg: 'Password too short',
          value: '123',
        },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          {
            field: 'email',
            message: 'Invalid email format',
            value: 'invalid-email',
          },
          {
            field: 'password',
            message: 'Password too short',
            value: '123',
          },
        ],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle validation errors with unknown type', () => {
      const mockErrors = [
        {
          type: 'unknown',
          msg: 'Some error',
          value: 'test',
        },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          {
            field: 'unknown',
            message: 'Some error',
            value: 'test',
          },
        ],
      });
    });
  });

  describe('validators', () => {
    describe('isUUID', () => {
      it('should create UUID validator for body field', () => {
        const validator = validators.isUUID('id');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isEmail', () => {
      it('should create email validator', () => {
        const validator = validators.isEmail('email');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isPassword', () => {
      it('should create password validator with strength requirements', () => {
        const validator = validators.isPassword('password');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isPhone', () => {
      it('should create phone validator', () => {
        const validator = validators.isPhone('phone');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isString', () => {
      it('should create string validator with length constraints', () => {
        const validator = validators.isString('name', 2, 50);
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create string validator with default length constraints', () => {
        const validator = validators.isString('name');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isNumber', () => {
      it('should create number validator without constraints', () => {
        const validator = validators.isNumber('age');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create number validator with min constraint', () => {
        const validator = validators.isNumber('price', 0);
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create number validator with min and max constraints', () => {
        const validator = validators.isNumber('rating', 1, 5);
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isBoolean', () => {
      it('should create boolean validator', () => {
        const validator = validators.isBoolean('isActive');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isDate', () => {
      it('should create date validator', () => {
        const validator = validators.isDate('birthDate');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isArray', () => {
      it('should create array validator with minimum length', () => {
        const validator = validators.isArray('items', 1);
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create array validator with default minimum length', () => {
        const validator = validators.isArray('items');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('isEnum', () => {
      it('should create enum validator', () => {
        const validator = validators.isEnum('status', ['active', 'inactive']);
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });

    describe('optional validators', () => {
      it('should create optional string validator', () => {
        const validator = validators.optionalString('description');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create optional number validator', () => {
        const validator = validators.optionalNumber('count', 0, 100);
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create optional boolean validator', () => {
        const validator = validators.optionalBoolean('enabled');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create optional date validator', () => {
        const validator = validators.optionalDate('createdAt');
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });

      it('should create optional enum validator', () => {
        const validator = validators.optionalEnum('type', ['A', 'B', 'C']);
        expect(validator).toBeDefined();
        expect(typeof validator).toBe('object');
      });
    });
  });

  describe('paginationValidation', () => {
    it('should be an array of validation middlewares', () => {
      expect(Array.isArray(paginationValidation)).toBe(true);
      expect(paginationValidation.length).toBeGreaterThan(0);
    });

    it('should include validation error handler as last middleware', () => {
      const lastMiddleware = paginationValidation[paginationValidation.length - 1];
      expect(lastMiddleware).toBe(handleValidationErrors);
    });
  });

  describe('idParamValidation', () => {
    it('should be an array of validation middlewares', () => {
      expect(Array.isArray(idParamValidation)).toBe(true);
      expect(idParamValidation.length).toBe(2);
    });

    it('should include validation error handler', () => {
      expect(idParamValidation).toContain(handleValidationErrors);
    });
  });

  describe('companyIdValidation', () => {
    it('should be an array of validation middlewares', () => {
      expect(Array.isArray(companyIdValidation)).toBe(true);
      expect(companyIdValidation.length).toBeGreaterThan(0);
    });

    it('should include validation error handler', () => {
      const lastMiddleware = companyIdValidation[companyIdValidation.length - 1];
      expect(lastMiddleware).toBe(handleValidationErrors);
    });
  });

  describe('validate', () => {
    it('should run validations and continue when no errors', async () => {
      const mockValidation = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      const middleware = validate([mockValidation as any]);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockValidation.run).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return validation errors when validation fails', async () => {
      const mockValidation = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const mockErrors = [
        {
          type: 'field',
          path: 'email',
          msg: 'Invalid email',
          value: 'invalid',
        },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      const middleware = validate([mockValidation as any]);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          {
            field: 'email',
            message: 'Invalid email',
            value: 'invalid',
          },
        ],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle multiple validations', async () => {
      const mockValidation1 = {
        run: jest.fn().mockResolvedValue(undefined),
      };
      const mockValidation2 = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      const middleware = validate([mockValidation1 as any, mockValidation2 as any]);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockValidation1.run).toHaveBeenCalledWith(mockReq);
      expect(mockValidation2.run).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle validation run errors', async () => {
      const mockValidation = {
        run: jest.fn().mockRejectedValue(new Error('Validation error')),
      };

      const middleware = validate([mockValidation as any]);

      await expect(middleware(mockReq, mockRes, mockNext)).rejects.toThrow('Validation error');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize request body', () => {
      mockReq.body = {
        name: '  Test Name  ',
        email: 'test@example.com\0',
        $dangerous: 'should be removed',
        __proto__: 'should be removed',
        nested: {
          value: '  nested value  ',
          $bad: 'should be removed',
        },
        array: ['  item1  ', '  item2  '],
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body).toEqual({
        name: 'Test Name',
        email: 'test@example.com',
        nested: {
          value: 'nested value',
        },
        array: ['item1', 'item2'],
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize request query', () => {
      mockReq.query = {
        search: '  search term  ',
        $dangerous: 'should be removed',
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.query).toEqual({
        search: 'search term',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null and undefined values', () => {
      mockReq.body = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zeroValue: 0,
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body).toEqual({
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zeroValue: 0,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-object body and query', () => {
      mockReq.body = 'string body';
      mockReq.query = 123;

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body).toBe('string body');
      expect(mockReq.query).toBe(123);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing body and query', () => {
      delete mockReq.body;
      delete mockReq.query;

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle arrays in body', () => {
      mockReq.body = [
        { name: '  item1  ', $bad: 'removed' },
        { name: '  item2  ', value: 123 },
      ];

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body).toEqual([
        { name: 'item1' },
        { name: 'item2', value: 123 },
      ]);
    });
  });

  describe('validateContentType', () => {
    it('should allow valid content type', () => {
      mockReq.get = jest.fn().mockReturnValue('application/json; charset=utf-8');
      const middleware = validateContentType(['application/json']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow any of the valid content types', () => {
      mockReq.get = jest.fn().mockReturnValue('application/xml');
      const middleware = validateContentType(['application/json', 'application/xml']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error for missing content type', () => {
      mockReq.get = jest.fn().mockReturnValue(null);
      const middleware = validateContentType(['application/json']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Content-Type header is required',
        error: 'MISSING_CONTENT_TYPE',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for invalid content type', () => {
      mockReq.get = jest.fn().mockReturnValue('text/plain');
      const middleware = validateContentType(['application/json']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unsupported content type. Allowed types: application/json',
        error: 'UNSUPPORTED_CONTENT_TYPE',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should be case insensitive', () => {
      mockReq.get = jest.fn().mockReturnValue('APPLICATION/JSON');
      const middleware = validateContentType(['application/json']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireJsonContent', () => {
    it('should allow POST request with JSON content type', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('application/json');

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow PUT request with JSON content type', () => {
      mockReq.method = 'PUT';
      mockReq.get = jest.fn().mockReturnValue('application/json; charset=utf-8');

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow PATCH request with JSON content type', () => {
      mockReq.method = 'PATCH';
      mockReq.get = jest.fn().mockReturnValue('application/json');

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow GET request without checking content type', () => {
      mockReq.method = 'GET';
      mockReq.get = jest.fn().mockReturnValue('text/html');

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.get).not.toHaveBeenCalled();
    });

    it('should allow DELETE request without checking content type', () => {
      mockReq.method = 'DELETE';
      mockReq.get = jest.fn().mockReturnValue('text/plain');

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.get).not.toHaveBeenCalled();
    });

    it('should return error for POST request without JSON content type', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('text/plain');

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Content-Type must be application/json',
        error: 'INVALID_CONTENT_TYPE',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for PUT request without content type', () => {
      mockReq.method = 'PUT';
      mockReq.get = jest.fn().mockReturnValue(null);

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Content-Type must be application/json',
        error: 'INVALID_CONTENT_TYPE',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for PATCH request with wrong content type', () => {
      mockReq.method = 'PATCH';
      mockReq.get = jest.fn().mockReturnValue('application/xml');

      requireJsonContent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    it('should chain validation middlewares correctly', async () => {
      // Test a complete validation flow
      const mockValidations = [
        {
          run: jest.fn().mockResolvedValue(undefined),
        },
        {
          run: jest.fn().mockResolvedValue(undefined),
        },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      // First sanitize input
      mockReq.body = {
        name: '  Test  ',
        $bad: 'removed',
      };

      sanitizeInput(mockReq, mockRes, mockNext);
      expect(mockReq.body.name).toBe('Test');
      expect(mockReq.body.$bad).toBeUndefined();

      // Reset mock to test next middleware
      mockNext.mockReset();

      // Then validate
      const validateMiddleware = validate(mockValidations as any);
      await validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockValidations[0].run).toHaveBeenCalled();
      expect(mockValidations[1].run).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should stop at first validation failure', async () => {
      const mockValidations = [
        {
          run: jest.fn().mockResolvedValue(undefined),
        },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            type: 'field',
            path: 'email',
            msg: 'Invalid email',
            value: 'invalid',
          },
        ],
      });

      const validateMiddleware = validate(mockValidations as any);
      await validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle circular references in sanitization', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      mockReq.body = circular;

      // Should not throw an error
      expect(() => {
        sanitizeInput(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle very deep nested objects', () => {
      let deepObj: any = {};
      let current = deepObj;
      
      // Create a deep nested object
      for (let i = 0; i < 10; i++) {
        current.nested = { value: `level${i}  ` };
        current = current.nested;
      }

      mockReq.body = deepObj;

      sanitizeInput(mockReq, mockRes, mockNext);

      // Check that deeply nested values are sanitized
      let check = mockReq.body;
      for (let i = 0; i < 9; i++) {
        check = check.nested;
      }
      expect(check.value).toBe('level9');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-string values in sanitization', () => {
      mockReq.body = {
        number: 123,
        boolean: true,
        date: new Date(),
        null: null,
        undefined: undefined,
        array: [1, 2, 3],
        object: { key: 'value' },
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.number).toBe(123);
      expect(mockReq.body.boolean).toBe(true);
      expect(mockReq.body.date).toBeInstanceOf(Date);
      expect(mockReq.body.null).toBeNull();
      expect(mockReq.body.undefined).toBeUndefined();
      expect(Array.isArray(mockReq.body.array)).toBe(true);
      expect(typeof mockReq.body.object).toBe('object');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});