import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import {
  extractCompanyId,
  tenantIsolation,
  validateCompanyMembership,
  applyTenantFilter,
  autoTenantFilter,
  validateBranchAccess,
  validateStaffAccess,
  validateClientAccess,
  sanitizeTenantData,
  autoSanitizeResponse,
} from '../../src/middleware/tenant.middleware';
import { prismaMock } from '../setup';
import {
  createMockUser,
  createMockCompany,
  createMockReq,
  createMockRes,
  createMockNext,
  TestHttpStatus,
  resetAllMocks,
} from '../utils/test-helpers';

// Mock logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Tenant Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  
  const mockCompany = createMockCompany();
  const mockUser = createMockUser({ companyId: mockCompany.id });

  beforeEach(() => {
    mockReq = createMockReq();
    mockRes = createMockRes();
    mockNext = createMockNext();
    resetAllMocks();
  });

  describe('extractCompanyId', () => {
    it('should extract company ID from authenticated user first', () => {
      mockReq.user = { companyId: 'user-company-123' };
      mockReq.params = { companyId: 'param-company-456' };
      mockReq.query = { companyId: 'query-company-789' };

      const result = extractCompanyId(mockReq);

      expect(result).toBe('user-company-123');
    });

    it('should extract company ID from params when no user', () => {
      mockReq.params = { companyId: 'param-company-456' };
      mockReq.query = { companyId: 'query-company-789' };

      const result = extractCompanyId(mockReq);

      expect(result).toBe('param-company-456');
    });

    it('should extract company ID from query when no user or params', () => {
      mockReq.query = { companyId: 'query-company-789' };
      mockReq.body = { companyId: 'body-company-000' };

      const result = extractCompanyId(mockReq);

      expect(result).toBe('query-company-789');
    });

    it('should extract company ID from body when no other sources', () => {
      mockReq.body = { companyId: 'body-company-000' };
      mockReq.headers = { 'x-company-id': 'header-company-111' };

      const result = extractCompanyId(mockReq);

      expect(result).toBe('body-company-000');
    });

    it('should extract company ID from header when no other sources', () => {
      mockReq.headers = { 'x-company-id': 'header-company-111' };

      const result = extractCompanyId(mockReq);

      expect(result).toBe('header-company-111');
    });

    it('should return undefined when no company ID found', () => {
      const result = extractCompanyId(mockReq);

      expect(result).toBeUndefined();
    });

    it('should handle array headers correctly', () => {
      mockReq.headers = { 'x-company-id': ['header-company-111', 'another'] };

      const result = extractCompanyId(mockReq);

      expect(result).toBeUndefined(); // Should reject array headers
    });
  });

  describe('tenantIsolation', () => {
    beforeEach(() => {
      mockReq.params = { companyId: mockCompany.id };
      prismaMock.company.findUnique.mockResolvedValue(mockCompany);
    });

    it('should allow access for valid active company', async () => {
      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(prismaMock.company.findUnique).toHaveBeenCalledWith({
        where: { id: mockCompany.id },
      });
      expect(mockReq.company).toEqual(mockCompany);
      expect(mockReq.companyId).toBe(mockCompany.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error when company ID is missing', async () => {
      mockReq.params = {};

      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error when company not found', async () => {
      prismaMock.company.findUnique.mockResolvedValue(null);

      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error when company is inactive', async () => {
      const inactiveCompany = { ...mockCompany, isActive: false };
      prismaMock.company.findUnique.mockResolvedValue(inactiveCompany);

      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company account is not active',
        error: 'COMPANY_INACTIVE',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate authenticated user belongs to company', async () => {
      mockReq.user = { companyId: 'different-company-id' };

      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied: Company mismatch',
        error: 'COMPANY_MISMATCH',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow authenticated user from same company', async () => {
      mockReq.user = { companyId: mockCompany.id };

      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      prismaMock.company.findUnique.mockRejectedValue(new Error('Database error'));

      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Tenant validation failed',
        error: 'TENANT_VALIDATION_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateCompanyMembership', () => {
    beforeEach(() => {
      mockReq.user = { companyId: mockCompany.id };
    });

    it('should use user company ID when no company ID in request', async () => {
      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockReq.companyId).toBe(mockCompany.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow same company ID', async () => {
      mockReq.params = { companyId: mockCompany.id };

      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockReq.companyId).toBe(mockCompany.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access to different company for regular user', async () => {
      mockReq.user = { companyId: mockCompany.id, role: UserRole.USER };
      mockReq.params = { companyId: 'different-company-id' };

      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied: You cannot access this company\'s data',
        error: 'COMPANY_ACCESS_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow super admin to access any company', async () => {
      mockReq.user = { companyId: mockCompany.id, role: UserRole.SUPER_ADMIN };
      mockReq.params = { companyId: 'different-company-id' };

      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockReq.companyId).toBe('different-company-id');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error for unauthenticated user', async () => {
      mockReq.user = undefined;

      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      // Simulate an error by making the middleware throw
      mockReq.user = null; // This will cause an error when trying to access properties

      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company validation failed',
        error: 'COMPANY_VALIDATION_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('applyTenantFilter', () => {
    it('should create correct tenant filter', () => {
      const companyId = 'test-company-123';
      const filter = applyTenantFilter(companyId);

      expect(filter).toEqual({
        where: {
          companyId: 'test-company-123',
        },
      });
    });
  });

  describe('autoTenantFilter', () => {
    it('should add tenant filter from request companyId', () => {
      mockReq.companyId = mockCompany.id;

      autoTenantFilter(mockReq, mockRes, mockNext);

      expect(mockReq.tenantFilter).toEqual({
        where: {
          companyId: mockCompany.id,
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should add tenant filter from user companyId', () => {
      mockReq.user = { companyId: mockCompany.id };

      autoTenantFilter(mockReq, mockRes, mockNext);

      expect(mockReq.tenantFilter).toEqual({
        where: {
          companyId: mockCompany.id,
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without filter if no company ID', () => {
      autoTenantFilter(mockReq, mockRes, mockNext);

      expect(mockReq.tenantFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize request companyId over user companyId', () => {
      mockReq.companyId = 'request-company';
      mockReq.user = { companyId: 'user-company' };

      autoTenantFilter(mockReq, mockRes, mockNext);

      expect(mockReq.tenantFilter.where.companyId).toBe('request-company');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateBranchAccess', () => {
    const mockBranch = {
      id: 'branch-123',
      companyId: mockCompany.id,
      name: 'Test Branch',
      isActive: true,
    };

    beforeEach(() => {
      mockReq.params = { branchId: mockBranch.id };
      mockReq.companyId = mockCompany.id;
      prismaMock.branch.findFirst.mockResolvedValue(mockBranch as any);
    });

    it('should allow access to valid branch', async () => {
      await validateBranchAccess(mockReq, mockRes, mockNext);

      expect(prismaMock.branch.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockBranch.id,
          companyId: mockCompany.id,
        },
      });
      expect(mockReq.branch).toEqual(mockBranch);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when no branch ID provided', async () => {
      mockReq.params = {};

      await validateBranchAccess(mockReq, mockRes, mockNext);

      expect(prismaMock.branch.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error when company ID missing', async () => {
      mockReq.companyId = undefined;

      await validateBranchAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company ID is required',
        error: 'MISSING_COMPANY_ID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error when branch not found', async () => {
      prismaMock.branch.findFirst.mockResolvedValue(null);

      await validateBranchAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Branch not found or access denied',
        error: 'BRANCH_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should check branch ID from body', async () => {
      mockReq.params = {};
      mockReq.body = { branchId: mockBranch.id };

      await validateBranchAccess(mockReq, mockRes, mockNext);

      expect(prismaMock.branch.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockBranch.id,
          companyId: mockCompany.id,
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      prismaMock.branch.findFirst.mockRejectedValue(new Error('Database error'));

      await validateBranchAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Branch validation failed',
        error: 'BRANCH_VALIDATION_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateStaffAccess', () => {
    const mockStaff = {
      id: 'staff-123',
      companyId: mockCompany.id,
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockReq.params = { staffId: mockStaff.id };
      mockReq.companyId = mockCompany.id;
      prismaMock.staff.findFirst.mockResolvedValue(mockStaff as any);
    });

    it('should allow access to valid staff', async () => {
      await validateStaffAccess(mockReq, mockRes, mockNext);

      expect(prismaMock.staff.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockStaff.id,
          companyId: mockCompany.id,
        },
      });
      expect(mockReq.staff).toEqual(mockStaff);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when no staff ID provided', async () => {
      mockReq.params = {};

      await validateStaffAccess(mockReq, mockRes, mockNext);

      expect(prismaMock.staff.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error when staff not found', async () => {
      prismaMock.staff.findFirst.mockResolvedValue(null);

      await validateStaffAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff member not found or access denied',
        error: 'STAFF_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateClientAccess', () => {
    const mockClient = {
      id: 'client-123',
      companyId: mockCompany.id,
      firstName: 'Jane',
      lastName: 'Smith',
    };

    beforeEach(() => {
      mockReq.params = { clientId: mockClient.id };
      mockReq.companyId = mockCompany.id;
      prismaMock.client.findFirst.mockResolvedValue(mockClient as any);
    });

    it('should allow access to valid client', async () => {
      await validateClientAccess(mockReq, mockRes, mockNext);

      expect(prismaMock.client.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockClient.id,
          companyId: mockCompany.id,
        },
      });
      expect(mockReq.client).toEqual(mockClient);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when no client ID provided', async () => {
      mockReq.params = {};

      await validateClientAccess(mockReq, mockRes, mockNext);

      expect(prismaMock.client.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error when client not found', async () => {
      prismaMock.client.findFirst.mockResolvedValue(null);

      await validateClientAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Client not found or access denied',
        error: 'CLIENT_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeTenantData', () => {
    const companyId = 'company-123';

    it('should return null for null/undefined data', () => {
      expect(sanitizeTenantData(null, companyId)).toBeNull();
      expect(sanitizeTenantData(undefined, companyId)).toBeUndefined();
    });

    it('should filter array data by company ID', () => {
      const data = [
        { id: '1', companyId: 'company-123', name: 'Item 1' },
        { id: '2', companyId: 'company-456', name: 'Item 2' },
        { id: '3', companyId: 'company-123', name: 'Item 3' },
        { id: '4', name: 'Item 4' }, // No companyId
      ];

      const result = sanitizeTenantData(data, companyId);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('4');
    });

    it('should return null for object with wrong company ID', () => {
      const data = { id: '1', companyId: 'company-456', name: 'Item 1' };

      const result = sanitizeTenantData(data, companyId);

      expect(result).toBeNull();
    });

    it('should return object with matching company ID', () => {
      const data = { id: '1', companyId: 'company-123', name: 'Item 1' };

      const result = sanitizeTenantData(data, companyId);

      expect(result).toEqual(data);
    });

    it('should return object without company ID', () => {
      const data = { id: '1', name: 'Item 1' };

      const result = sanitizeTenantData(data, companyId);

      expect(result).toEqual(data);
    });

    it('should handle primitive types', () => {
      expect(sanitizeTenantData('string', companyId)).toBe('string');
      expect(sanitizeTenantData(123, companyId)).toBe(123);
      expect(sanitizeTenantData(true, companyId)).toBe(true);
    });
  });

  describe('autoSanitizeResponse', () => {
    it('should sanitize response data automatically', () => {
      const companyId = 'company-123';
      mockReq.companyId = companyId;

      const originalData = [
        { id: '1', companyId: 'company-123', name: 'Item 1' },
        { id: '2', companyId: 'company-456', name: 'Item 2' },
      ];

      autoSanitizeResponse(mockReq, mockRes, mockNext);

      // Simulate calling res.json with data
      mockRes.json({
        success: true,
        data: originalData,
      });

      expect(mockNext).toHaveBeenCalled();
      
      // Verify that res.json was called with sanitized data
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.data).toHaveLength(1);
      expect(jsonCall.data[0].id).toBe('1');
    });

    it('should continue without sanitization when no company ID', () => {
      autoSanitizeResponse(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      
      // Original res.json should be preserved
      const originalData = { test: 'data' };
      mockRes.json(originalData);
      
      expect(mockRes.json).toHaveBeenCalledWith(originalData);
    });

    it('should not modify response without data property', () => {
      const companyId = 'company-123';
      mockReq.companyId = companyId;

      autoSanitizeResponse(mockReq, mockRes, mockNext);

      const responseWithoutData = { success: true, message: 'OK' };
      mockRes.json(responseWithoutData);

      expect(mockRes.json).toHaveBeenCalledWith(responseWithoutData);
    });

    it('should get company ID from user if not in request', () => {
      mockReq.user = { companyId: 'user-company-123' };

      const originalData = [
        { id: '1', companyId: 'user-company-123', name: 'Item 1' },
        { id: '2', companyId: 'other-company', name: 'Item 2' },
      ];

      autoSanitizeResponse(mockReq, mockRes, mockNext);

      mockRes.json({
        success: true,
        data: originalData,
      });

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.data).toHaveLength(1);
      expect(jsonCall.data[0].companyId).toBe('user-company-123');
    });
  });

  describe('Integration tests', () => {
    it('should handle complete tenant isolation flow', async () => {
      // Setup: user requesting access to their company's data
      mockReq.user = { companyId: mockCompany.id, role: UserRole.USER };
      mockReq.params = { companyId: mockCompany.id };
      prismaMock.company.findUnique.mockResolvedValue(mockCompany);

      // Run tenant isolation middleware
      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.company).toEqual(mockCompany);
      expect(mockReq.companyId).toBe(mockCompany.id);

      // Run company membership validation
      resetAllMocks();
      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.companyId).toBe(mockCompany.id);
    });

    it('should block cross-tenant access attempt', async () => {
      // Setup: user trying to access different company's data
      mockReq.user = { companyId: 'user-company', role: UserRole.USER };
      mockReq.params = { companyId: 'different-company' };
      
      const differentCompany = { ...mockCompany, id: 'different-company' };
      prismaMock.company.findUnique.mockResolvedValue(differentCompany);

      // Run tenant isolation middleware
      await tenantIsolation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied: Company mismatch',
        error: 'COMPANY_MISMATCH',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow super admin cross-tenant access', async () => {
      // Setup: super admin accessing different company
      mockReq.user = { companyId: 'admin-company', role: UserRole.SUPER_ADMIN };
      mockReq.params = { companyId: 'target-company' };

      // Run company membership validation (skipping tenant isolation for this test)
      await validateCompanyMembership(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.companyId).toBe('target-company');
    });
  });
});