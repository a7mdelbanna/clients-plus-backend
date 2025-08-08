import request from 'supertest';
import express from 'express';
import { Express } from 'express';
import companyRoutes from '../../src/routes/company.routes';
import { companyService } from '../../src/services/company.service';
import { ApiError } from '../../src/middleware/error.middleware';
import {
  createMockCompany,
  createTestTokens,
  TestHttpStatus,
  prismaMock,
} from '../utils/test-helpers';
import { SubscriptionPlan, BillingCycle, UserRole } from '@prisma/client';

// Mock the service
jest.mock('../../src/services/company.service');
const mockCompanyService = companyService as jest.Mocked<typeof companyService>;

describe('Company Routes Integration Tests', () => {
  let app: Express;
  let superAdminTokens: any;
  let adminTokens: any;
  let userTokens: any;

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware by adding user to request
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Simple token-to-user mapping for tests
        if (token === 'super-admin-token') {
          req.user = {
            userId: 'super-admin-id',
            email: 'superadmin@system.com',
            companyId: 'system-company-id',
            role: UserRole.SUPER_ADMIN,
          };
        } else if (token === 'admin-token') {
          req.user = {
            userId: 'admin-id',
            email: 'admin@company.com',
            companyId: 'company-id-123',
            role: UserRole.ADMIN,
          };
        } else if (token === 'user-token') {
          req.user = {
            userId: 'user-id',
            email: 'user@company.com',
            companyId: 'company-id-123',
            role: UserRole.USER,
          };
        }
      }
      next();
    });
    
    app.use('/api/v1/companies', companyRoutes);

    // Setup test tokens
    superAdminTokens = { accessToken: 'super-admin-token' };
    adminTokens = { accessToken: 'admin-token' };
    userTokens = { accessToken: 'user-token' };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/companies', () => {
    const validCompanyData = {
      name: 'Test Company',
      email: 'test@company.com',
      phone: '+1234567890',
      website: 'https://testcompany.com',
      businessType: 'Technology',
      subscriptionPlan: SubscriptionPlan.BASIC,
    };

    it('should create company successfully (super admin)', async () => {
      // Arrange
      const mockCompany = createMockCompany();
      mockCompanyService.createCompany.mockResolvedValue(mockCompany);

      // Act
      const response = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(validCompanyData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CREATED);
      expect(response.body).toEqual({
        success: true,
        message: 'Company created successfully',
        data: expect.objectContaining({
          id: mockCompany.id,
          name: mockCompany.name,
          email: mockCompany.email,
        }),
        timestamp: expect.any(String),
      });
      expect(mockCompanyService.createCompany).toHaveBeenCalledWith(validCompanyData);
    });

    it('should return validation errors for invalid data', async () => {
      // Arrange
      const invalidData = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email
      };

      // Act
      const response = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(mockCompanyService.createCompany).not.toHaveBeenCalled();
    });

    it('should return 409 when company email already exists', async () => {
      // Arrange
      const apiError = new ApiError(409, 'Company with this email already exists', 'COMPANY_EXISTS');
      mockCompanyService.createCompany.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(validCompanyData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CONFLICT);
      expect(response.body).toEqual({
        success: false,
        message: 'Company with this email already exists',
        error: 'COMPANY_EXISTS',
        timestamp: expect.any(String),
      });
    });

    it('should deny access to non-super-admin users', async () => {
      // Act
      const adminResponse = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(validCompanyData);

      const userResponse = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(validCompanyData);

      // Assert
      expect(adminResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(userResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(mockCompanyService.createCompany).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/companies')
        .send(validCompanyData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/companies', () => {
    it('should list companies with pagination (super admin)', async () => {
      // Arrange
      const mockCompanies = [createMockCompany(), createMockCompany(), createMockCompany()];
      const totalCount = 15;
      
      mockCompanyService.listCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: totalCount,
      });

      // Act
      const response = await request(app)
        .get('/api/v1/companies?page=1&limit=10&search=test&sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: totalCount,
        pages: Math.ceil(totalCount / 10),
        hasNext: true,
        hasPrev: false,
      });

      expect(mockCompanyService.listCompanies).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'test',
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('should use default pagination parameters', async () => {
      // Arrange
      mockCompanyService.listCompanies.mockResolvedValue({
        companies: [],
        total: 0,
      });

      // Act
      const response = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(mockCompanyService.listCompanies).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should deny access to non-super-admin users', async () => {
      // Act
      const adminResponse = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      const userResponse = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      // Assert
      expect(adminResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(userResponse.status).toBe(TestHttpStatus.FORBIDDEN);
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app).get('/api/v1/companies');

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/companies/:companyId', () => {
    const companyId = 'company-id-123';

    it('should return company (super admin can access any company)', async () => {
      // Arrange
      const mockCompany = createMockCompany();
      mockCompany.id = companyId;
      mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

      // Act
      const response = await request(app)
        .get(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(companyId);
      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith(companyId);
    });

    it('should return company (admin can access own company)', async () => {
      // Arrange
      const mockCompany = createMockCompany();
      mockCompany.id = companyId;
      mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

      // Act
      const response = await request(app)
        .get(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(companyId);
    });

    it('should deny access to different company for regular users', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/companies/different-company-id')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
      expect(mockCompanyService.getCompanyById).not.toHaveBeenCalled();
    });

    it('should return 404 when company not found', async () => {
      // Arrange
      mockCompanyService.getCompanyById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });

    it('should return validation error for invalid company ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/companies/invalid-id')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app).get(`/api/v1/companies/${companyId}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('PUT /api/v1/companies/:companyId', () => {
    const companyId = 'company-id-123';
    const updateData = {
      name: 'Updated Company Name',
      phone: '+1987654321',
      website: 'https://updated.com',
    };

    it('should update company successfully (admin of company)', async () => {
      // Arrange
      const updatedCompany = { ...createMockCompany(), ...updateData };
      mockCompanyService.updateCompany.mockResolvedValue(updatedCompany);

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Company updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith(companyId, updateData);
    });

    it('should update company successfully (super admin)', async () => {
      // Arrange
      const updatedCompany = { ...createMockCompany(), ...updateData };
      mockCompanyService.updateCompany.mockResolvedValue(updatedCompany);

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith(companyId, updateData);
    });

    it('should return validation errors for invalid data', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        isActive: 'not-boolean', // Should be boolean
      };

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(mockCompanyService.updateCompany).not.toHaveBeenCalled();
    });

    it('should deny access to different company', async () => {
      // Act
      const response = await request(app)
        .put('/api/v1/companies/different-company-id')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });

    it('should handle company not found error', async () => {
      // Arrange
      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.updateCompany.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
      expect(response.body.error).toBe('COMPANY_NOT_FOUND');
    });

    it('should handle email already exists error', async () => {
      // Arrange
      const dataWithEmail = { ...updateData, email: 'existing@company.com' };
      const apiError = new ApiError(409, 'Email already in use', 'EMAIL_EXISTS');
      mockCompanyService.updateCompany.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(dataWithEmail);

      // Assert
      expect(response.status).toBe(TestHttpStatus.CONFLICT);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already in use');
      expect(response.body.error).toBe('EMAIL_EXISTS');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /api/v1/companies/:companyId', () => {
    const companyId = 'company-id-123';

    it('should delete company successfully (super admin)', async () => {
      // Arrange
      mockCompanyService.deleteCompany.mockResolvedValue();

      // Act
      const response = await request(app)
        .delete(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Company deleted successfully');
      expect(mockCompanyService.deleteCompany).toHaveBeenCalledWith(companyId);
    });

    it('should deny access to non-super-admin users', async () => {
      // Act
      const adminResponse = await request(app)
        .delete(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      const userResponse = await request(app)
        .delete(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      // Assert
      expect(adminResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(userResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(mockCompanyService.deleteCompany).not.toHaveBeenCalled();
    });

    it('should handle company not found error', async () => {
      // Arrange
      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.deleteCompany.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .delete(`/api/v1/companies/${companyId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });

    it('should return validation error for invalid company ID', async () => {
      // Act
      const response = await request(app)
        .delete('/api/v1/companies/invalid-id')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app).delete(`/api/v1/companies/${companyId}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('PUT /api/v1/companies/:companyId/subscription', () => {
    const companyId = 'company-id-123';
    const subscriptionData = {
      plan: SubscriptionPlan.PROFESSIONAL,
      billingCycle: BillingCycle.YEARLY,
    };

    it('should update subscription successfully (super admin)', async () => {
      // Arrange
      const updatedCompany = { ...createMockCompany(), ...subscriptionData };
      mockCompanyService.updateSubscription.mockResolvedValue(updatedCompany);

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}/subscription`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(subscriptionData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription updated successfully');
      expect(response.body.data.subscriptionPlan).toBe(SubscriptionPlan.PROFESSIONAL);
      expect(mockCompanyService.updateSubscription).toHaveBeenCalledWith(
        companyId,
        SubscriptionPlan.PROFESSIONAL,
        BillingCycle.YEARLY
      );
    });

    it('should return validation errors for invalid subscription data', async () => {
      // Arrange
      const invalidData = {
        plan: 'INVALID_PLAN',
        billingCycle: 'INVALID_CYCLE',
      };

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}/subscription`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(mockCompanyService.updateSubscription).not.toHaveBeenCalled();
    });

    it('should deny access to non-super-admin users', async () => {
      // Act
      const adminResponse = await request(app)
        .put(`/api/v1/companies/${companyId}/subscription`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(subscriptionData);

      const userResponse = await request(app)
        .put(`/api/v1/companies/${companyId}/subscription`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(subscriptionData);

      // Assert
      expect(adminResponse.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(userResponse.status).toBe(TestHttpStatus.FORBIDDEN);
    });

    it('should handle company not found error', async () => {
      // Arrange
      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.updateSubscription.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}/subscription`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send(subscriptionData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${companyId}/subscription`)
        .send(subscriptionData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/companies/:companyId/stats', () => {
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

    it('should return company statistics (admin of company)', async () => {
      // Arrange
      mockCompanyService.getCompanyStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get(`/api/v1/companies/${companyId}/stats`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        users: 15,
        branches: 3,
        clients: 50,
        staff: 8,
        appointments: 200,
        invoices: 75,
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
        subscriptionStatus: 'ACTIVE',
      }));
      expect(mockCompanyService.getCompanyStats).toHaveBeenCalledWith(companyId);
    });

    it('should return company statistics (super admin)', async () => {
      // Arrange
      mockCompanyService.getCompanyStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get(`/api/v1/companies/${companyId}/stats`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining(mockStats));
    });

    it('should deny access to different company stats for regular users', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/companies/different-company-id/stats')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
      expect(mockCompanyService.getCompanyStats).not.toHaveBeenCalled();
    });

    it('should handle company not found error', async () => {
      // Arrange
      const apiError = new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      mockCompanyService.getCompanyStats.mockRejectedValue(apiError);

      // Act
      const response = await request(app)
        .get(`/api/v1/companies/${companyId}/stats`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Company not found');
    });

    it('should return validation error for invalid company ID', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/companies/invalid-id/stats')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app).get(`/api/v1/companies/${companyId}/stats`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.UNAUTHORIZED);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle internal server errors gracefully', async () => {
      // Arrange
      mockCompanyService.listCompanies.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const response = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to list companies');
    });

    it('should handle malformed JSON in request body', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .set('Content-Type', 'application/json')
        .send('{ "invalid": json }');

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
    });

    it('should handle missing required fields', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send({}); // Empty body

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle invalid UUID parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/companies/not-a-uuid')
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle concurrent operations gracefully', async () => {
      // Arrange - Simulate concurrent requests
      const mockCompany = createMockCompany();
      mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get(`/api/v1/companies/${mockCompany.id}`)
          .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
      );

      // Act
      const responses = await Promise.all(requests);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(TestHttpStatus.OK);
        expect(response.body.success).toBe(true);
      });

      expect(mockCompanyService.getCompanyById).toHaveBeenCalledTimes(5);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should enforce company isolation for admins', async () => {
      // Arrange
      const otherCompanyId = 'other-company-id';

      // Act - Admin tries to access different company
      const response = await request(app)
        .get(`/api/v1/companies/${otherCompanyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(response.body.message).toBe('Access denied');
    });

    it('should allow super admin to access any company', async () => {
      // Arrange
      const anyCompanyId = 'any-company-id';
      const mockCompany = createMockCompany();
      mockCompany.id = anyCompanyId;
      mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

      // Act
      const response = await request(app)
        .get(`/api/v1/companies/${anyCompanyId}`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`);

      // Assert
      expect(response.status).toBe(TestHttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(anyCompanyId);
    });

    it('should validate company ownership in update operations', async () => {
      // Arrange
      const unauthorizedCompanyId = 'unauthorized-company-id';
      const updateData = { name: 'Unauthorized Update' };

      // Act
      const response = await request(app)
        .put(`/api/v1/companies/${unauthorizedCompanyId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(TestHttpStatus.FORBIDDEN);
      expect(response.body.message).toBe('Access denied');
      expect(mockCompanyService.updateCompany).not.toHaveBeenCalled();
    });
  });
});