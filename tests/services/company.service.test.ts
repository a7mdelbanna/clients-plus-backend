import { CompanyService, companyService, CreateCompanyData, UpdateCompanyData } from '../../src/services/company.service';
import { ApiError } from '../../src/middleware/error.middleware';
import { prismaMock, createMockCompany, TestHttpStatus } from '../utils/test-helpers';
import { SubscriptionPlan, SubscriptionStatus, BillingCycle, Company } from '@prisma/client';

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(() => {
    service = new CompanyService();
    jest.clearAllMocks();
  });

  describe('createCompany', () => {
    it('should create a company successfully with default values', async () => {
      // Arrange
      const createData: CreateCompanyData = {
        name: 'Test Company',
        email: 'test@company.com',
        phone: '+1234567890',
        website: 'https://testcompany.com',
        businessType: 'Technology',
      };

      const mockCompany = createMockCompany();
      prismaMock.company.findUnique.mockResolvedValue(null); // No existing company
      prismaMock.company.create.mockResolvedValue(mockCompany);

      // Act
      const result = await service.createCompany(createData);

      // Assert
      expect(prismaMock.company.findUnique).toHaveBeenCalledWith({
        where: { email: createData.email },
      });
      expect(prismaMock.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createData.name,
          email: createData.email,
          phone: createData.phone,
          website: createData.website,
          businessType: createData.businessType,
          subscriptionPlan: SubscriptionPlan.BASIC,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'MM/dd/yyyy',
          timeFormat: '12h',
          isActive: true,
        }),
      });
      expect(result).toEqual(mockCompany);
    });

    it('should create a company with custom subscription plan', async () => {
      // Arrange
      const createData: CreateCompanyData = {
        name: 'Premium Company',
        email: 'premium@company.com',
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
        timezone: 'EST',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '24h',
      };

      const mockCompany = createMockCompany();
      prismaMock.company.findUnique.mockResolvedValue(null);
      prismaMock.company.create.mockResolvedValue(mockCompany);

      // Act
      await service.createCompany(createData);

      // Assert
      expect(prismaMock.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
          timezone: 'EST',
          currency: 'EUR',
          dateFormat: 'dd/MM/yyyy',
          timeFormat: '24h',
        }),
      });
    });

    it('should throw error when company email already exists', async () => {
      // Arrange
      const createData: CreateCompanyData = {
        name: 'Test Company',
        email: 'existing@company.com',
      };

      const existingCompany = createMockCompany();
      prismaMock.company.findUnique.mockResolvedValue(existingCompany);

      // Act & Assert
      await expect(service.createCompany(createData)).rejects.toThrow(ApiError);
      await expect(service.createCompany(createData)).rejects.toThrow('Company with this email already exists');
      
      const error = await service.createCompany(createData).catch(e => e);
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('COMPANY_EXISTS');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const createData: CreateCompanyData = {
        name: 'Test Company',
        email: 'test@company.com',
      };

      prismaMock.company.findUnique.mockResolvedValue(null);
      prismaMock.company.create.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.createCompany(createData)).rejects.toThrow(ApiError);
      await expect(service.createCompany(createData)).rejects.toThrow('Failed to create company');

      const error = await service.createCompany(createData).catch(e => e);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('COMPANY_CREATE_ERROR');
    });
  });

  describe('getCompanyById', () => {
    it('should return company with counts when found', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockCompany = {
        ...createMockCompany(),
        _count: {
          users: 5,
          branches: 2,
          clients: 10,
          staff: 3,
        },
      };

      prismaMock.company.findUnique.mockResolvedValue(mockCompany);

      // Act
      const result = await service.getCompanyById(companyId);

      // Assert
      expect(prismaMock.company.findUnique).toHaveBeenCalledWith({
        where: { id: companyId },
        include: {
          _count: {
            select: {
              users: true,
              branches: true,
              clients: true,
              staff: true,
            },
          },
        },
      });
      expect(result).toEqual(mockCompany);
    });

    it('should return null when company not found', async () => {
      // Arrange
      const companyId = 'non-existent-id';
      prismaMock.company.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getCompanyById(companyId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const companyId = 'company-id-123';
      prismaMock.company.findUnique.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getCompanyById(companyId)).rejects.toThrow(ApiError);
      await expect(service.getCompanyById(companyId)).rejects.toThrow('Failed to fetch company');

      const error = await service.getCompanyById(companyId).catch(e => e);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('COMPANY_FETCH_ERROR');
    });
  });

  describe('updateCompany', () => {
    it('should update company successfully', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const updateData: UpdateCompanyData = {
        name: 'Updated Company Name',
        phone: '+1987654321',
        isActive: false,
      };

      const existingCompany = createMockCompany();
      const updatedCompany = { ...existingCompany, ...updateData };

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existingCompany);
      prismaMock.company.update.mockResolvedValue(updatedCompany);

      // Act
      const result = await service.updateCompany(companyId, updateData);

      // Assert
      expect(service.getCompanyById).toHaveBeenCalledWith(companyId);
      expect(prismaMock.company.update).toHaveBeenCalledWith({
        where: { id: companyId },
        data: expect.objectContaining({
          ...updateData,
          updatedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual(updatedCompany);
    });

    it('should throw error when company not found', async () => {
      // Arrange
      const companyId = 'non-existent-id';
      const updateData: UpdateCompanyData = { name: 'Updated Name' };

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateCompany(companyId, updateData)).rejects.toThrow(ApiError);
      await expect(service.updateCompany(companyId, updateData)).rejects.toThrow('Company not found');

      const error = await service.updateCompany(companyId, updateData).catch(e => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('COMPANY_NOT_FOUND');
    });

    it('should check for email duplicates when updating email', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const updateData: UpdateCompanyData = {
        email: 'new@email.com',
      };

      const existingCompany = createMockCompany();
      existingCompany.email = 'old@email.com';

      const duplicateCompany = createMockCompany();
      duplicateCompany.email = 'new@email.com';

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existingCompany);
      prismaMock.company.findUnique.mockResolvedValue(duplicateCompany);

      // Act & Assert
      await expect(service.updateCompany(companyId, updateData)).rejects.toThrow(ApiError);
      await expect(service.updateCompany(companyId, updateData)).rejects.toThrow('Email already in use');

      const error = await service.updateCompany(companyId, updateData).catch(e => e);
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('EMAIL_EXISTS');
    });

    it('should allow keeping the same email', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const sameEmail = 'same@email.com';
      const updateData: UpdateCompanyData = {
        email: sameEmail,
        name: 'Updated Name',
      };

      const existingCompany = createMockCompany();
      existingCompany.email = sameEmail;

      const updatedCompany = { ...existingCompany, ...updateData };

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existingCompany);
      prismaMock.company.update.mockResolvedValue(updatedCompany);

      // Act
      const result = await service.updateCompany(companyId, updateData);

      // Assert
      expect(prismaMock.company.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(updatedCompany);
    });
  });

  describe('listCompanies', () => {
    it('should list companies with pagination', async () => {
      // Arrange
      const params = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };

      const mockCompanies = [createMockCompany(), createMockCompany(), createMockCompany()];
      const totalCount = 25;

      prismaMock.company.findMany.mockResolvedValue(mockCompanies);
      prismaMock.company.count.mockResolvedValue(totalCount);

      // Act
      const result = await service.listCompanies(params);

      // Assert
      expect(prismaMock.company.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              users: true,
              branches: true,
              clients: true,
              staff: true,
            },
          },
        },
      });
      expect(prismaMock.company.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        companies: mockCompanies,
        total: totalCount,
      });
    });

    it('should search companies by name and email', async () => {
      // Arrange
      const params = {
        page: 1,
        limit: 10,
        search: 'test search',
      };

      const mockCompanies = [createMockCompany()];
      prismaMock.company.findMany.mockResolvedValue(mockCompanies);
      prismaMock.company.count.mockResolvedValue(1);

      // Act
      await service.listCompanies(params);

      // Assert
      expect(prismaMock.company.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test search', mode: 'insensitive' } },
            { email: { contains: 'test search', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle different page and limit values', async () => {
      // Arrange
      const params = {
        page: 3,
        limit: 5,
      };

      prismaMock.company.findMany.mockResolvedValue([]);
      prismaMock.company.count.mockResolvedValue(0);

      // Act
      await service.listCompanies(params);

      // Assert
      expect(prismaMock.company.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10, // (3-1) * 5
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('deleteCompany', () => {
    it('should soft delete company and deactivate users', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockCompany = createMockCompany();

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(mockCompany);
      prismaMock.company.update.mockResolvedValue({ ...mockCompany, isActive: false });
      prismaMock.user.updateMany.mockResolvedValue({ count: 5 });

      // Act
      await service.deleteCompany(companyId);

      // Assert
      expect(service.getCompanyById).toHaveBeenCalledWith(companyId);
      expect(prismaMock.company.update).toHaveBeenCalledWith({
        where: { id: companyId },
        data: {
          isActive: false,
          subscriptionStatus: SubscriptionStatus.CANCELLED,
          updatedAt: expect.any(Date),
        },
      });
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { companyId },
        data: { isActive: false },
      });
    });

    it('should throw error when company not found', async () => {
      // Arrange
      const companyId = 'non-existent-id';
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteCompany(companyId)).rejects.toThrow(ApiError);
      await expect(service.deleteCompany(companyId)).rejects.toThrow('Company not found');

      const error = await service.deleteCompany(companyId).catch(e => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('COMPANY_NOT_FOUND');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription for monthly billing', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const plan = SubscriptionPlan.PROFESSIONAL;
      const billingCycle = BillingCycle.MONTHLY;
      const mockCompany = createMockCompany();
      const updatedCompany = { ...mockCompany, subscriptionPlan: plan };

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(mockCompany);
      prismaMock.company.update.mockResolvedValue(updatedCompany);

      // Act
      const result = await service.updateSubscription(companyId, plan, billingCycle);

      // Assert
      expect(prismaMock.company.update).toHaveBeenCalledWith({
        where: { id: companyId },
        data: {
          subscriptionPlan: plan,
          billingCycle: billingCycle,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionStartDate: expect.any(Date),
          subscriptionEndDate: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedCompany);
    });

    it('should calculate correct end date for yearly billing', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const plan = SubscriptionPlan.ENTERPRISE;
      const billingCycle = BillingCycle.YEARLY;
      const mockCompany = createMockCompany();

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(mockCompany);

      const mockUpdate = jest.fn().mockImplementation((data) => {
        const startDate = data.data.subscriptionStartDate;
        const endDate = data.data.subscriptionEndDate;
        const expectedEndDate = new Date(startDate);
        expectedEndDate.setFullYear(expectedEndDate.getFullYear() + 1);
        
        // Verify the end date is 1 year from start
        expect(endDate.getTime()).toBeCloseTo(expectedEndDate.getTime(), -3); // Within 1000ms

        return Promise.resolve({ ...mockCompany, subscriptionPlan: plan });
      });

      prismaMock.company.update.mockImplementation(mockUpdate);

      // Act
      await service.updateSubscription(companyId, plan, billingCycle);

      // Assert
      expect(mockUpdate).toHaveBeenCalled();
    });


    it('should throw error when company not found', async () => {
      // Arrange
      const companyId = 'non-existent-id';
      const plan = SubscriptionPlan.PROFESSIONAL;
      const billingCycle = BillingCycle.MONTHLY;

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateSubscription(companyId, plan, billingCycle)).rejects.toThrow(ApiError);
      await expect(service.updateSubscription(companyId, plan, billingCycle)).rejects.toThrow('Company not found');
    });
  });

  describe('getCompanyStats', () => {
    it('should return comprehensive company statistics', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockCompany = createMockCompany();
      mockCompany.subscriptionPlan = SubscriptionPlan.PROFESSIONAL;
      mockCompany.subscriptionStatus = SubscriptionStatus.ACTIVE;
      mockCompany.subscriptionEndDate = new Date('2024-12-31');

      jest.spyOn(service, 'getCompanyById').mockResolvedValue(mockCompany);

      // Mock all the count queries
      prismaMock.user.count.mockResolvedValue(15);
      prismaMock.branch.count.mockResolvedValue(3);
      prismaMock.client.count.mockResolvedValue(50);
      prismaMock.staff.count.mockResolvedValue(8);
      prismaMock.appointment.count.mockResolvedValue(200);
      prismaMock.invoice.count.mockResolvedValue(75);

      // Act
      const result = await service.getCompanyStats(companyId);

      // Assert
      expect(result).toEqual({
        users: 15,
        branches: 3,
        clients: 50,
        staff: 8,
        appointments: 200,
        invoices: 75,
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionEndDate: mockCompany.subscriptionEndDate,
      });

      // Verify all queries were called with correct parameters
      expect(prismaMock.user.count).toHaveBeenCalledWith({ where: { companyId, isActive: true } });
      expect(prismaMock.branch.count).toHaveBeenCalledWith({ where: { companyId, isActive: true } });
      expect(prismaMock.client.count).toHaveBeenCalledWith({ where: { companyId, isActive: true } });
      expect(prismaMock.staff.count).toHaveBeenCalledWith({ where: { companyId, isActive: true } });
      expect(prismaMock.appointment.count).toHaveBeenCalledWith({ where: { companyId } });
      expect(prismaMock.invoice.count).toHaveBeenCalledWith({ where: { companyId } });
    });

    it('should throw error when company not found', async () => {
      // Arrange
      const companyId = 'non-existent-id';
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCompanyStats(companyId)).rejects.toThrow(ApiError);
      await expect(service.getCompanyStats(companyId)).rejects.toThrow('Company not found');

      const error = await service.getCompanyStats(companyId).catch(e => e);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('COMPANY_NOT_FOUND');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const companyId = 'company-id-123';
      const mockCompany = createMockCompany();
      
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(mockCompany);
      prismaMock.user.count.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getCompanyStats(companyId)).rejects.toThrow(ApiError);
      await expect(service.getCompanyStats(companyId)).rejects.toThrow('Failed to fetch company statistics');

      const error = await service.getCompanyStats(companyId).catch(e => e);
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('STATS_FETCH_ERROR');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid subscription plan', async () => {
      // This would typically be caught by TypeScript, but test runtime behavior
      const createData = {
        name: 'Test Company',
        email: 'test@company.com',
        subscriptionPlan: 'INVALID_PLAN' as any,
      };

      prismaMock.company.findUnique.mockResolvedValue(null);
      prismaMock.company.create.mockRejectedValue(new Error('Invalid subscription plan'));

      await expect(service.createCompany(createData)).rejects.toThrow(ApiError);
    });

    it('should handle null/undefined input gracefully', async () => {
      await expect(service.createCompany(null as any)).rejects.toThrow();
      await expect(service.updateCompany('', null as any)).rejects.toThrow();
    });

    it('should handle empty search strings', async () => {
      const params = { page: 1, limit: 10, search: '' };
      prismaMock.company.findMany.mockResolvedValue([]);
      prismaMock.company.count.mockResolvedValue(0);

      const result = await service.listCompanies(params);

      expect(prismaMock.company.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });
});