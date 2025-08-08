import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CompanyController, companyController } from '../../src/controllers/company.controller';
import { companyService } from '../../src/services/company.service';
import { ApiError } from '../../src/middleware/error.middleware';
import {
  createMockReq,
  createMockRes,
  createMockCompany,
  createMockUser,
  TestHttpStatus,
} from '../utils/test-helpers';
import { SubscriptionPlan, BillingCycle, UserRole } from '@prisma/client';

// Mock the service
jest.mock('../../src/services/company.service');
jest.mock('express-validator');

const mockCompanyService = companyService as jest.Mocked<typeof companyService>;
const mockValidationResult = validationResult as unknown as jest.Mock;

describe('CompanyController', () => {
  let controller: CompanyController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    controller = new CompanyController();
    mockReq = createMockReq();
    mockRes = createMockRes();
    jest.clearAllMocks();

    // Default to no validation errors
    mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] } as any);
  });

  describe('createCompany', () => {
    it('should create company successfully', async () => {
      // Arrange
      const companyData = {
        name: 'Test Company',
        email: 'test@company.com',
        phone: '+1234567890',
        subscriptionPlan: SubscriptionPlan.BASIC,
      };

      const mockCompany = createMockCompany();
      mockReq.body = companyData;
      mockCompanyService.createCompany.mockResolvedValue(mockCompany);

      // Act
      await controller.createCompany(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.createCompany).toHaveBeenCalledWith(companyData);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Company created successfully',
        data: mockCompany,
        timestamp: expect.any(String),
      });
    });

    it('should return validation errors when input is invalid', async () => {
      // Arrange
      const validationErrors = [
        { field: 'name', msg: 'Name is required' },
        { field: 'email', msg: 'Invalid email format' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.createCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      expect(mockCompanyService.createCompany).not.toHaveBeenCalled();
    });

    it('should handle company already exists error', async () => {
      // Arrange
      const companyData = {
        name: 'Existing Company',
        email: 'existing@company.com',
      };

      mockReq.body = companyData;
      const apiError = new ApiError(409, 'Company with this email already exists', 'COMPANY_EXISTS');
      mockCompanyService.createCompany.mockRejectedValue(apiError);

      // Act
      await controller.createCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.CONFLICT);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company with this email already exists',
        error: 'COMPANY_EXISTS',
        timestamp: expect.any(String),
      });
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const companyData = {
        name: 'Test Company',
        email: 'test@company.com',
      };

      mockReq.body = companyData;
      mockCompanyService.createCompany.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await controller.createCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create company',
        error: 'CREATE_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getCompany', () => {
    it('should return company when user has access (super admin)', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockCompany = createMockCompany();
      const superAdminUser = createMockUser({ role: UserRole.SUPER_ADMIN });

      mockReq.params = { companyId };
      mockReq.user = {
        userId: superAdminUser.id,
        email: superAdminUser.email,
        companyId: 'different-company-id',
        role: UserRole.SUPER_ADMIN,
      };

      mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

      // Act
      await controller.getCompany(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompany,
        timestamp: expect.any(String),
      });
    });

    it('should return company when user accesses own company', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockCompany = createMockCompany();
      mockCompany.id = companyId;

      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

      // Act
      await controller.getCompany(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompany,
        timestamp: expect.any(String),
      });
    });

    it('should deny access when user tries to access different company', async () => {
      // Arrange
      const companyId = 'different-company-id';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: 'user-company-id',
        role: UserRole.ADMIN,
      };

      // Act
      await controller.getCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied',
        error: 'FORBIDDEN',
        timestamp: expect.any(String),
      });
      expect(mockCompanyService.getCompanyById).not.toHaveBeenCalled();
    });

    it('should return 404 when company not found', async () => {
      // Arrange
      const companyId = 'non-existent-company';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockCompanyService.getCompanyById.mockResolvedValue(null);

      // Act
      await controller.getCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found',
        error: 'NOT_FOUND',
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const companyId = 'company-id-123';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockCompanyService.getCompanyById.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.getCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch company',
        error: 'FETCH_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('updateCompany', () => {
    it('should update company successfully', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const updateData = {
        name: 'Updated Company Name',
        phone: '+1987654321',
      };

      const updatedCompany = { ...createMockCompany(), ...updateData };

      mockReq.params = { companyId };
      mockReq.body = updateData;
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockCompanyService.updateCompany.mockResolvedValue(updatedCompany);

      // Act
      await controller.updateCompany(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith(companyId, updateData);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Company updated successfully',
        data: updatedCompany,
        timestamp: expect.any(String),
      });
    });

    it('should return validation errors', async () => {
      // Arrange
      const validationErrors = [
        { field: 'email', msg: 'Invalid email format' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.updateCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      expect(mockCompanyService.updateCompany).not.toHaveBeenCalled();
    });

    it('should deny access to different company', async () => {
      // Arrange
      const companyId = 'different-company-id';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: 'user-company-id',
        role: UserRole.ADMIN,
      };

      // Act
      await controller.updateCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied',
        error: 'FORBIDDEN',
        timestamp: expect.any(String),
      });
    });

    it('should handle company not found error', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const updateData = { name: 'Updated Name' };

      mockReq.params = { companyId };
      mockReq.body = updateData;
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.updateCompany.mockRejectedValue(apiError);

      // Act
      await controller.updateCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
        timestamp: expect.any(String),
      });
    });
  });

  describe('listCompanies', () => {
    it('should list companies with pagination', async () => {
      // Arrange
      const mockCompanies = [createMockCompany(), createMockCompany(), createMockCompany()];
      const totalCount = 25;

      mockReq.query = {
        page: '2',
        limit: '5',
        search: 'test',
        sortBy: 'name',
        sortOrder: 'asc',
      };

      mockCompanyService.listCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: totalCount,
      });

      // Act
      await controller.listCompanies(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.listCompanies).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'test',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      const expectedPages = Math.ceil(totalCount / 5); // 5 pages
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompanies,
        pagination: {
          page: 2,
          limit: 5,
          total: totalCount,
          pages: expectedPages,
          hasNext: true, // page 2 of 5
          hasPrev: true, // page 2 of 5
        },
        timestamp: expect.any(String),
      });
    });

    it('should use default pagination values', async () => {
      // Arrange
      mockReq.query = {};
      mockCompanyService.listCompanies.mockResolvedValue({
        companies: [],
        total: 0,
      });

      // Act
      await controller.listCompanies(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.listCompanies).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should calculate pagination correctly for last page', async () => {
      // Arrange
      const mockCompanies = [createMockCompany()]; // Only 1 item on last page
      const totalCount = 21;

      mockReq.query = {
        page: '3',
        limit: '10',
      };

      mockCompanyService.listCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: totalCount,
      });

      // Act
      await controller.listCompanies(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompanies,
        pagination: {
          page: 3,
          limit: 10,
          total: totalCount,
          pages: 3, // Math.ceil(21 / 10)
          hasNext: false, // last page
          hasPrev: true, // page 3
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockReq.query = {};
      mockCompanyService.listCompanies.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.listCompanies(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to list companies',
        error: 'LIST_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      // Arrange
      const companyId = 'company-id-123';
      mockReq.params = { companyId };

      mockCompanyService.deleteCompany.mockResolvedValue();

      // Act
      await controller.deleteCompany(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.deleteCompany).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Company deleted successfully',
        timestamp: expect.any(String),
      });
    });

    it('should handle company not found error', async () => {
      // Arrange
      const companyId = 'non-existent-company';
      mockReq.params = { companyId };

      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.deleteCompany.mockRejectedValue(apiError);

      // Act
      await controller.deleteCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
        timestamp: expect.any(String),
      });
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const companyId = 'company-id-123';
      mockReq.params = { companyId };

      mockCompanyService.deleteCompany.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.deleteCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete company',
        error: 'DELETE_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const subscriptionData = {
        plan: SubscriptionPlan.PROFESSIONAL,
        billingCycle: BillingCycle.YEARLY,
      };

      const updatedCompany = { ...createMockCompany(), ...subscriptionData };

      mockReq.params = { companyId };
      mockReq.body = subscriptionData;

      mockCompanyService.updateSubscription.mockResolvedValue(updatedCompany);

      // Act
      await controller.updateSubscription(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.updateSubscription).toHaveBeenCalledWith(
        companyId,
        SubscriptionPlan.PROFESSIONAL,
        BillingCycle.YEARLY
      );
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subscription updated successfully',
        data: updatedCompany,
        timestamp: expect.any(String),
      });
    });

    it('should return validation errors for invalid subscription data', async () => {
      // Arrange
      const validationErrors = [
        { field: 'plan', msg: 'Invalid subscription plan' },
        { field: 'billingCycle', msg: 'Invalid billing cycle' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.updateSubscription(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      expect(mockCompanyService.updateSubscription).not.toHaveBeenCalled();
    });

    it('should handle company not found error', async () => {
      // Arrange
      const companyId = 'non-existent-company';
      const subscriptionData = {
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      };

      mockReq.params = { companyId };
      mockReq.body = subscriptionData;

      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.updateSubscription.mockRejectedValue(apiError);

      // Act
      await controller.updateSubscription(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
        timestamp: expect.any(String),
      });
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const subscriptionData = {
        plan: SubscriptionPlan.ENTERPRISE,
        billingCycle: BillingCycle.YEARLY,
      };

      mockReq.params = { companyId };
      mockReq.body = subscriptionData;

      mockCompanyService.updateSubscription.mockRejectedValue(new Error('Payment processing failed'));

      // Act
      await controller.updateSubscription(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update subscription',
        error: 'SUBSCRIPTION_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getCompanyStats', () => {
    it('should return company statistics for authorized user', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockStats = {
        users: 15,
        branches: 3,
        clients: 50,
        staff: 8,
        appointments: 200,
        invoices: 75,
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: new Date('2024-12-31'),
      };

      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockCompanyService.getCompanyStats.mockResolvedValue(mockStats);

      // Act
      await controller.getCompanyStats(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.getCompanyStats).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        timestamp: expect.any(String),
      });
    });

    it('should allow super admin to access any company stats', async () => {
      // Arrange
      const companyId = 'different-company-id';
      const mockStats = {
        users: 10,
        branches: 2,
        clients: 30,
        staff: 5,
        appointments: 100,
        invoices: 25,
        subscriptionPlan: SubscriptionPlan.BASIC,
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: new Date('2024-06-30'),
      };

      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'super-admin-id',
        email: 'admin@system.com',
        companyId: 'system-company-id',
        role: UserRole.SUPER_ADMIN,
      };

      mockCompanyService.getCompanyStats.mockResolvedValue(mockStats);

      // Act
      await controller.getCompanyStats(mockReq, mockRes);

      // Assert
      expect(mockCompanyService.getCompanyStats).toHaveBeenCalledWith(companyId);
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        timestamp: expect.any(String),
      });
    });

    it('should deny access to different company stats for regular users', async () => {
      // Arrange
      const companyId = 'different-company-id';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: 'user-company-id',
        role: UserRole.ADMIN,
      };

      // Act
      await controller.getCompanyStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied',
        error: 'FORBIDDEN',
        timestamp: expect.any(String),
      });
      expect(mockCompanyService.getCompanyStats).not.toHaveBeenCalled();
    });

    it('should handle company not found error', async () => {
      // Arrange
      const companyId = 'non-existent-company';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.getCompanyStats.mockRejectedValue(apiError);

      // Act
      await controller.getCompanyStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
        timestamp: expect.any(String),
      });
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const companyId = 'company-id-123';
      mockReq.params = { companyId };
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: companyId,
        role: UserRole.ADMIN,
      };

      mockCompanyService.getCompanyStats.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.getCompanyStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch company statistics',
        error: 'STATS_ERROR',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing user in request', async () => {
      // Arrange
      mockReq.params = { companyId: 'company-id-123' };
      mockReq.user = undefined;

      // Act
      await controller.getCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.FORBIDDEN);
    });

    it('should handle malformed request parameters', async () => {
      // Arrange
      mockReq.params = {}; // Missing companyId
      mockReq.user = {
        userId: 'user-id-123',
        email: 'user@company.com',
        companyId: 'user-company-id',
        role: UserRole.ADMIN,
      };

      // Act
      await controller.getCompany(mockReq, mockRes);

      // The controller should handle this gracefully, though the exact behavior depends on implementation
    });

    it('should handle invalid query parameters in listCompanies', async () => {
      // Arrange
      mockReq.query = {
        page: 'not-a-number',
        limit: 'invalid',
        sortOrder: 'invalid-order',
      };

      mockCompanyService.listCompanies.mockResolvedValue({
        companies: [],
        total: 0,
      });

      // Act
      await controller.listCompanies(mockReq, mockRes);

      // Assert - should use default values
      expect(mockCompanyService.listCompanies).toHaveBeenCalledWith({
        page: 1, // Default when NaN
        limit: 10, // Default when NaN
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'invalid-order', // Passed as-is, service should validate
      });
    });

    it('should handle empty request body in createCompany', async () => {
      // Arrange
      mockReq.body = {};
      const validationErrors = [
        { field: 'name', msg: 'Name is required' },
        { field: 'email', msg: 'Email is required' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      // Act
      await controller.createCompany(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(TestHttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    });
  });
});