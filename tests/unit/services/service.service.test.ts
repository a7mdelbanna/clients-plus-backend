import { prismaMock } from '../../setup';
import { ServiceService } from '../../../src/services/service.service';
import { TestDataFactory } from '../../helpers/factories';
import { AuthTestHelper } from '../../helpers/auth';

describe('ServiceService', () => {
  let serviceService: ServiceService;
  let mockUser: any;
  let mockCompanyId: string;

  beforeEach(() => {
    serviceService = new ServiceService(prismaMock as any);
    mockCompanyId = 'test-company-id';
    mockUser = AuthTestHelper.createMockUser({ companyId: mockCompanyId });
  });

  describe('create', () => {
    it('should create a new service successfully', async () => {
      const serviceData = TestDataFactory.createService(mockCompanyId);
      const expectedService = { ...serviceData, createdAt: new Date(), updatedAt: new Date() };

      prismaMock.service.create.mockResolvedValueOnce(expectedService as any);

      const result = await serviceService.create(serviceData, mockUser);

      expect(prismaMock.service.create).toHaveBeenCalledWith({
        data: serviceData,
      });
      expect(result).toEqual(expectedService);
    });

    it('should throw error for invalid service data', async () => {
      const invalidServiceData = {
        name: '', // Invalid: empty name
        price: -10, // Invalid: negative price
        duration: 0, // Invalid: zero duration
        companyId: mockCompanyId,
      };

      await expect(serviceService.create(invalidServiceData as any, mockUser))
        .rejects.toThrow();
    });

    it('should enforce multi-tenant isolation on creation', async () => {
      const serviceData = TestDataFactory.createService('different-company-id');

      await expect(serviceService.create(serviceData, mockUser))
        .rejects.toThrow('Access denied');
    });
  });

  describe('findById', () => {
    it('should return service by ID when found and accessible', async () => {
      const serviceId = 'service-1';
      const mockService = TestDataFactory.createService(mockCompanyId, { id: serviceId });

      prismaMock.service.findUnique.mockResolvedValueOnce(mockService as any);

      const result = await serviceService.findById(serviceId, mockUser);

      expect(prismaMock.service.findUnique).toHaveBeenCalledWith({
        where: { 
          id: serviceId,
          companyId: mockCompanyId 
        },
        include: {
          branches: true,
          staff: true,
        },
      });
      expect(result).toEqual(mockService);
    });

    it('should return null when service not found', async () => {
      const serviceId = 'non-existent-service';

      prismaMock.service.findUnique.mockResolvedValueOnce(null);

      const result = await serviceService.findById(serviceId, mockUser);

      expect(result).toBeNull();
    });

    it('should enforce multi-tenant isolation', async () => {
      const serviceId = 'service-1';

      prismaMock.service.findUnique.mockResolvedValueOnce(null);

      const result = await serviceService.findById(serviceId, mockUser);

      expect(prismaMock.service.findUnique).toHaveBeenCalledWith({
        where: { 
          id: serviceId,
          companyId: mockCompanyId 
        },
        include: {
          branches: true,
          staff: true,
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all services for company with default pagination', async () => {
      const mockServices = [
        TestDataFactory.createService(mockCompanyId),
        TestDataFactory.createService(mockCompanyId),
        TestDataFactory.createService(mockCompanyId),
      ];

      prismaMock.service.findMany.mockResolvedValueOnce(mockServices as any);
      prismaMock.service.count.mockResolvedValueOnce(3);

      const result = await serviceService.findAll(mockUser);

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        include: {
          branches: true,
          staff: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(prismaMock.service.count).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
      });
      expect(result).toEqual({
        data: mockServices,
        total: 3,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        category: 'Massage',
        isActive: true,
        minPrice: 50,
        maxPrice: 100,
      };

      prismaMock.service.findMany.mockResolvedValueOnce([]);
      prismaMock.service.count.mockResolvedValueOnce(0);

      await serviceService.findAll(mockUser, { filters });

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          category: 'Massage',
          isActive: true,
          price: {
            gte: 50,
            lte: 100,
          },
        },
        include: {
          branches: true,
          staff: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should apply pagination correctly', async () => {
      const pagination = { page: 2, limit: 10 };

      prismaMock.service.findMany.mockResolvedValueOnce([]);
      prismaMock.service.count.mockResolvedValueOnce(0);

      await serviceService.findAll(mockUser, { pagination });

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        include: {
          branches: true,
          staff: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: 10, // (page - 1) * limit
        take: 10,
      });
    });
  });

  describe('update', () => {
    it('should update service successfully', async () => {
      const serviceId = 'service-1';
      const updateData = {
        name: 'Updated Service Name',
        price: 99.99,
        duration: 90,
      };
      const existingService = TestDataFactory.createService(mockCompanyId, { id: serviceId });
      const updatedService = { ...existingService, ...updateData, updatedAt: new Date() };

      prismaMock.service.findUnique.mockResolvedValueOnce(existingService as any);
      prismaMock.service.update.mockResolvedValueOnce(updatedService as any);

      const result = await serviceService.update(serviceId, updateData, mockUser);

      expect(prismaMock.service.update).toHaveBeenCalledWith({
        where: { id: serviceId },
        data: updateData,
        include: {
          branches: true,
          staff: true,
        },
      });
      expect(result).toEqual(updatedService);
    });

    it('should throw error when service not found', async () => {
      const serviceId = 'non-existent-service';
      const updateData = { name: 'Updated Name' };

      prismaMock.service.findUnique.mockResolvedValueOnce(null);

      await expect(serviceService.update(serviceId, updateData, mockUser))
        .rejects.toThrow('Service not found');
    });

    it('should enforce multi-tenant isolation on update', async () => {
      const serviceId = 'service-1';
      const updateData = { name: 'Updated Name' };

      prismaMock.service.findUnique.mockResolvedValueOnce(null);

      await expect(serviceService.update(serviceId, updateData, mockUser))
        .rejects.toThrow('Service not found');
    });
  });

  describe('delete', () => {
    it('should soft delete service successfully', async () => {
      const serviceId = 'service-1';
      const existingService = TestDataFactory.createService(mockCompanyId, { id: serviceId });
      const deletedService = { ...existingService, isActive: false, updatedAt: new Date() };

      prismaMock.service.findUnique.mockResolvedValueOnce(existingService as any);
      prismaMock.service.update.mockResolvedValueOnce(deletedService as any);

      const result = await serviceService.delete(serviceId, mockUser);

      expect(prismaMock.service.update).toHaveBeenCalledWith({
        where: { id: serviceId },
        data: { isActive: false },
      });
      expect(result).toEqual(deletedService);
    });

    it('should throw error when service not found', async () => {
      const serviceId = 'non-existent-service';

      prismaMock.service.findUnique.mockResolvedValueOnce(null);

      await expect(serviceService.delete(serviceId, mockUser))
        .rejects.toThrow('Service not found');
    });

    it('should prevent deletion if service has active appointments', async () => {
      const serviceId = 'service-1';
      const existingService = TestDataFactory.createService(mockCompanyId, { id: serviceId });

      prismaMock.service.findUnique.mockResolvedValueOnce(existingService as any);
      prismaMock.appointment.count.mockResolvedValueOnce(5); // Has active appointments

      await expect(serviceService.delete(serviceId, mockUser))
        .rejects.toThrow('Cannot delete service with active appointments');
    });
  });

  describe('assignToStaff', () => {
    it('should assign service to staff member successfully', async () => {
      const serviceId = 'service-1';
      const staffId = 'staff-1';
      const customPrice = 75.00;

      const mockStaffService = {
        id: 'staff-service-1',
        staffId,
        serviceId,
        customPrice,
        isActive: true,
      };

      prismaMock.service.findUnique.mockResolvedValueOnce(
        TestDataFactory.createService(mockCompanyId, { id: serviceId }) as any
      );
      prismaMock.staff.findUnique.mockResolvedValueOnce(
        TestDataFactory.createStaff(mockCompanyId, 'branch-1', { id: staffId }) as any
      );
      prismaMock.staffService.create.mockResolvedValueOnce(mockStaffService as any);

      const result = await serviceService.assignToStaff(serviceId, staffId, mockUser, customPrice);

      expect(prismaMock.staffService.create).toHaveBeenCalledWith({
        data: {
          serviceId,
          staffId,
          customPrice,
          isActive: true,
        },
      });
      expect(result).toEqual(mockStaffService);
    });

    it('should throw error if service or staff not found', async () => {
      const serviceId = 'service-1';
      const staffId = 'non-existent-staff';

      prismaMock.service.findUnique.mockResolvedValueOnce(
        TestDataFactory.createService(mockCompanyId, { id: serviceId }) as any
      );
      prismaMock.staff.findUnique.mockResolvedValueOnce(null);

      await expect(serviceService.assignToStaff(serviceId, staffId, mockUser))
        .rejects.toThrow('Staff member not found');
    });
  });

  describe('assignToBranch', () => {
    it('should assign service to branch successfully', async () => {
      const serviceId = 'service-1';
      const branchId = 'branch-1';

      const mockServiceBranch = {
        id: 'service-branch-1',
        serviceId,
        branchId,
        isActive: true,
      };

      prismaMock.service.findUnique.mockResolvedValueOnce(
        TestDataFactory.createService(mockCompanyId, { id: serviceId }) as any
      );
      prismaMock.branch.findUnique.mockResolvedValueOnce(
        TestDataFactory.createBranch(mockCompanyId, { id: branchId }) as any
      );
      prismaMock.serviceBranch.create.mockResolvedValueOnce(mockServiceBranch as any);

      const result = await serviceService.assignToBranch(serviceId, branchId, mockUser);

      expect(prismaMock.serviceBranch.create).toHaveBeenCalledWith({
        data: {
          serviceId,
          branchId,
          isActive: true,
        },
      });
      expect(result).toEqual(mockServiceBranch);
    });
  });

  describe('getServiceAvailability', () => {
    it('should return available time slots for service', async () => {
      const serviceId = 'service-1';
      const date = '2024-01-15';
      const branchId = 'branch-1';

      const mockService = TestDataFactory.createService(mockCompanyId, { 
        id: serviceId, 
        duration: 60 
      });

      prismaMock.service.findUnique.mockResolvedValueOnce(mockService as any);
      
      // Mock staff assignments
      prismaMock.staffService.findMany.mockResolvedValueOnce([
        { staffId: 'staff-1', staff: { workSchedule: {} } },
        { staffId: 'staff-2', staff: { workSchedule: {} } },
      ] as any);

      // Mock existing appointments
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);

      const result = await serviceService.getServiceAvailability(
        serviceId, 
        date, 
        mockUser, 
        branchId
      );

      expect(result).toHaveProperty('availableSlots');
      expect(result).toHaveProperty('service');
      expect(Array.isArray(result.availableSlots)).toBe(true);
    });
  });

  describe('searchServices', () => {
    it('should search services by name and description', async () => {
      const searchTerm = 'massage';
      const mockServices = [
        TestDataFactory.createService(mockCompanyId, { name: 'Relaxation Massage' }),
        TestDataFactory.createService(mockCompanyId, { description: 'Deep tissue massage therapy' }),
      ];

      prismaMock.service.findMany.mockResolvedValueOnce(mockServices as any);

      const result = await serviceService.searchServices(searchTerm, mockUser);

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          isActive: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { category: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          branches: true,
          staff: true,
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockServices);
    });
  });

  describe('getServiceCategories', () => {
    it('should return unique service categories for company', async () => {
      const mockCategories = [
        { category: 'Massage' },
        { category: 'Facial' },
        { category: 'Hair' },
      ];

      prismaMock.service.findMany.mockResolvedValueOnce(mockCategories as any);

      const result = await serviceService.getServiceCategories(mockUser);

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          isActive: true,
          category: { not: null },
        },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });
      expect(result).toEqual(['Massage', 'Facial', 'Hair']);
    });
  });

  describe('validateServiceData', () => {
    it('should validate service data successfully', () => {
      const validServiceData = TestDataFactory.createService(mockCompanyId);

      expect(() => serviceService.validateServiceData(validServiceData))
        .not.toThrow();
    });

    it('should throw error for invalid price', () => {
      const invalidServiceData = TestDataFactory.createService(mockCompanyId, { 
        price: -10 
      });

      expect(() => serviceService.validateServiceData(invalidServiceData))
        .toThrow('Price must be a positive number');
    });

    it('should throw error for invalid duration', () => {
      const invalidServiceData = TestDataFactory.createService(mockCompanyId, { 
        duration: 0 
      });

      expect(() => serviceService.validateServiceData(invalidServiceData))
        .toThrow('Duration must be a positive number');
    });
  });
});