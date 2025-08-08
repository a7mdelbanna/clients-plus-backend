import { prismaMock } from '../../setup';
import { StaffService } from '../../../src/services/staff.service';
import { TestDataFactory } from '../../helpers/factories';
import { AuthTestHelper } from '../../helpers/auth';
import { StaffStatus, UserRole } from '@prisma/client';

describe('StaffService', () => {
  let staffService: StaffService;
  let mockUser: any;
  let mockCompanyId: string;
  let mockBranchId: string;

  beforeEach(() => {
    staffService = new StaffService(prismaMock as any);
    mockCompanyId = 'test-company-id';
    mockBranchId = 'test-branch-id';
    mockUser = AuthTestHelper.createMockUser({ companyId: mockCompanyId });
  });

  describe('create', () => {
    it('should create a new staff member successfully', async () => {
      const staffData = TestDataFactory.createStaff(mockCompanyId, mockBranchId);
      const expectedStaff = { ...staffData, createdAt: new Date(), updatedAt: new Date() };

      prismaMock.branch.findUnique.mockResolvedValueOnce(
        TestDataFactory.createBranch(mockCompanyId, { id: mockBranchId }) as any
      );
      prismaMock.staff.create.mockResolvedValueOnce(expectedStaff as any);

      const result = await staffService.create(staffData, mockUser);

      expect(prismaMock.staff.create).toHaveBeenCalledWith({
        data: staffData,
        include: {
          branch: true,
          user: true,
          services: {
            include: { service: true },
          },
        },
      });
      expect(result).toEqual(expectedStaff);
    });

    it('should throw error if branch does not belong to company', async () => {
      const staffData = TestDataFactory.createStaff(mockCompanyId, 'different-branch-id');

      prismaMock.branch.findUnique.mockResolvedValueOnce(null);

      await expect(staffService.create(staffData, mockUser))
        .rejects.toThrow('Branch not found or does not belong to your company');
    });

    it('should validate email uniqueness within company', async () => {
      const staffData = TestDataFactory.createStaff(mockCompanyId, mockBranchId, {
        email: 'existing@example.com',
      });

      prismaMock.branch.findUnique.mockResolvedValueOnce(
        TestDataFactory.createBranch(mockCompanyId, { id: mockBranchId }) as any
      );
      prismaMock.staff.findFirst.mockResolvedValueOnce({
        id: 'existing-staff',
        email: 'existing@example.com',
      } as any);

      await expect(staffService.create(staffData, mockUser))
        .rejects.toThrow('Email already exists for another staff member');
    });

    it('should create staff with user account link', async () => {
      const userId = 'user-123';
      const staffData = TestDataFactory.createStaff(mockCompanyId, mockBranchId, { userId });

      prismaMock.branch.findUnique.mockResolvedValueOnce(
        TestDataFactory.createBranch(mockCompanyId, { id: mockBranchId }) as any
      );
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: userId,
        companyId: mockCompanyId,
      } as any);
      prismaMock.staff.create.mockResolvedValueOnce(staffData as any);

      const result = await staffService.create(staffData, mockUser);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return staff member by ID with full details', async () => {
      const staffId = 'staff-1';
      const mockStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId });

      prismaMock.staff.findUnique.mockResolvedValueOnce(mockStaff as any);

      const result = await staffService.findById(staffId, mockUser);

      expect(prismaMock.staff.findUnique).toHaveBeenCalledWith({
        where: { 
          id: staffId,
          companyId: mockCompanyId 
        },
        include: {
          branch: true,
          user: true,
          services: {
            include: { service: true },
          },
          appointments: {
            where: {
              startTime: { gte: expect.any(Date) },
            },
            orderBy: { startTime: 'asc' },
            take: 10,
            include: {
              client: true,
              service: true,
            },
          },
        },
      });
      expect(result).toEqual(mockStaff);
    });

    it('should return null when staff not found', async () => {
      const staffId = 'non-existent-staff';

      prismaMock.staff.findUnique.mockResolvedValueOnce(null);

      const result = await staffService.findById(staffId, mockUser);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all staff members for company', async () => {
      const mockStaffMembers = [
        TestDataFactory.createStaff(mockCompanyId, mockBranchId),
        TestDataFactory.createStaff(mockCompanyId, mockBranchId),
        TestDataFactory.createStaff(mockCompanyId, mockBranchId),
      ];

      prismaMock.staff.findMany.mockResolvedValueOnce(mockStaffMembers as any);
      prismaMock.staff.count.mockResolvedValueOnce(3);

      const result = await staffService.findAll(mockUser);

      expect(prismaMock.staff.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        include: {
          branch: true,
          user: true,
          services: {
            include: { service: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(result).toEqual({
        data: mockStaffMembers,
        total: 3,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should filter by branch when specified', async () => {
      const filters = { branchId: mockBranchId };

      prismaMock.staff.findMany.mockResolvedValueOnce([]);
      prismaMock.staff.count.mockResolvedValueOnce(0);

      await staffService.findAll(mockUser, { filters });

      expect(prismaMock.staff.findMany).toHaveBeenCalledWith({
        where: { 
          companyId: mockCompanyId,
          branchId: mockBranchId 
        },
        include: {
          branch: true,
          user: true,
          services: {
            include: { service: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter by status and specialization', async () => {
      const filters = {
        status: StaffStatus.ACTIVE,
        specialization: 'Massage',
      };

      prismaMock.staff.findMany.mockResolvedValueOnce([]);
      prismaMock.staff.count.mockResolvedValueOnce(0);

      await staffService.findAll(mockUser, { filters });

      expect(prismaMock.staff.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          status: StaffStatus.ACTIVE,
          specializations: { has: 'Massage' },
        },
        include: {
          branch: true,
          user: true,
          services: {
            include: { service: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('update', () => {
    it('should update staff member successfully', async () => {
      const staffId = 'staff-1';
      const updateData = {
        position: 'Senior Therapist',
        hourlyRate: 55.00,
        specializations: ['Deep Tissue', 'Swedish'],
      };
      const existingStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId });
      const updatedStaff = { ...existingStaff, ...updateData, updatedAt: new Date() };

      prismaMock.staff.findUnique.mockResolvedValueOnce(existingStaff as any);
      prismaMock.staff.update.mockResolvedValueOnce(updatedStaff as any);

      const result = await staffService.update(staffId, updateData, mockUser);

      expect(prismaMock.staff.update).toHaveBeenCalledWith({
        where: { id: staffId },
        data: updateData,
        include: {
          branch: true,
          user: true,
          services: {
            include: { service: true },
          },
        },
      });
      expect(result).toEqual(updatedStaff);
    });

    it('should validate branch assignment on update', async () => {
      const staffId = 'staff-1';
      const updateData = { branchId: 'different-branch' };

      const existingStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId });

      prismaMock.staff.findUnique.mockResolvedValueOnce(existingStaff as any);
      prismaMock.branch.findUnique.mockResolvedValueOnce(null);

      await expect(staffService.update(staffId, updateData, mockUser))
        .rejects.toThrow('Branch not found or does not belong to your company');
    });
  });

  describe('delete', () => {
    it('should soft delete staff member successfully', async () => {
      const staffId = 'staff-1';
      const existingStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId });
      const deletedStaff = { ...existingStaff, status: StaffStatus.INACTIVE, isActive: false };

      prismaMock.staff.findUnique.mockResolvedValueOnce(existingStaff as any);
      prismaMock.appointment.count.mockResolvedValueOnce(0);
      prismaMock.staff.update.mockResolvedValueOnce(deletedStaff as any);

      const result = await staffService.delete(staffId, mockUser);

      expect(prismaMock.staff.update).toHaveBeenCalledWith({
        where: { id: staffId },
        data: { 
          status: StaffStatus.INACTIVE,
          isActive: false 
        },
      });
      expect(result).toEqual(deletedStaff);
    });

    it('should prevent deletion if staff has upcoming appointments', async () => {
      const staffId = 'staff-1';
      const existingStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId });

      prismaMock.staff.findUnique.mockResolvedValueOnce(existingStaff as any);
      prismaMock.appointment.count.mockResolvedValueOnce(5);

      await expect(staffService.delete(staffId, mockUser))
        .rejects.toThrow('Cannot delete staff member with upcoming appointments');
    });
  });

  describe('getSchedule', () => {
    it('should return staff schedule for date range', async () => {
      const staffId = 'staff-1';
      const startDate = '2024-01-01';
      const endDate = '2024-01-07';

      const mockStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, {
        id: staffId,
        workSchedule: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { available: false },
          sunday: { available: false },
        },
      });

      prismaMock.staff.findUnique.mockResolvedValueOnce(mockStaff as any);
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);
      prismaMock.staffTimeOff.findMany.mockResolvedValueOnce([]);

      const result = await staffService.getSchedule(staffId, startDate, endDate, mockUser);

      expect(result).toHaveProperty('staff');
      expect(result).toHaveProperty('schedule');
      expect(result).toHaveProperty('appointments');
      expect(result).toHaveProperty('timeOff');
    });
  });

  describe('getAvailability', () => {
    it('should return available time slots for staff member', async () => {
      const staffId = 'staff-1';
      const date = '2024-01-15';
      const serviceId = 'service-1';

      const mockStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, {
        id: staffId,
        workSchedule: {
          monday: { start: '09:00', end: '17:00', available: true },
        },
      });

      const mockService = TestDataFactory.createService(mockCompanyId, {
        id: serviceId,
        duration: 60,
      });

      prismaMock.staff.findUnique.mockResolvedValueOnce(mockStaff as any);
      prismaMock.service.findUnique.mockResolvedValueOnce(mockService as any);
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);
      prismaMock.staffTimeOff.findMany.mockResolvedValueOnce([]);

      const result = await staffService.getAvailability(staffId, date, mockUser, serviceId);

      expect(result).toHaveProperty('availableSlots');
      expect(result).toHaveProperty('staff');
      expect(result).toHaveProperty('date');
      expect(Array.isArray(result.availableSlots)).toBe(true);
    });
  });

  describe('assignService', () => {
    it('should assign service to staff member with custom pricing', async () => {
      const staffId = 'staff-1';
      const serviceId = 'service-1';
      const customPrice = 85.00;

      const mockStaffService = {
        id: 'staff-service-1',
        staffId,
        serviceId,
        customPrice,
        isActive: true,
      };

      prismaMock.staff.findUnique.mockResolvedValueOnce(
        TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId }) as any
      );
      prismaMock.service.findUnique.mockResolvedValueOnce(
        TestDataFactory.createService(mockCompanyId, { id: serviceId }) as any
      );
      prismaMock.staffService.create.mockResolvedValueOnce(mockStaffService as any);

      const result = await staffService.assignService(staffId, serviceId, mockUser, customPrice);

      expect(prismaMock.staffService.create).toHaveBeenCalledWith({
        data: {
          staffId,
          serviceId,
          customPrice,
          isActive: true,
        },
        include: {
          service: true,
        },
      });
      expect(result).toEqual(mockStaffService);
    });

    it('should prevent duplicate service assignments', async () => {
      const staffId = 'staff-1';
      const serviceId = 'service-1';

      prismaMock.staff.findUnique.mockResolvedValueOnce(
        TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId }) as any
      );
      prismaMock.service.findUnique.mockResolvedValueOnce(
        TestDataFactory.createService(mockCompanyId, { id: serviceId }) as any
      );
      prismaMock.staffService.findUnique.mockResolvedValueOnce({
        id: 'existing-assignment',
        staffId,
        serviceId,
      } as any);

      await expect(staffService.assignService(staffId, serviceId, mockUser))
        .rejects.toThrow('Service already assigned to this staff member');
    });
  });

  describe('unassignService', () => {
    it('should unassign service from staff member', async () => {
      const staffId = 'staff-1';
      const serviceId = 'service-1';

      prismaMock.staff.findUnique.mockResolvedValueOnce(
        TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId }) as any
      );
      prismaMock.staffService.delete.mockResolvedValueOnce({} as any);

      const result = await staffService.unassignService(staffId, serviceId, mockUser);

      expect(prismaMock.staffService.delete).toHaveBeenCalledWith({
        where: {
          staffId_serviceId: {
            staffId,
            serviceId,
          },
        },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateWorkSchedule', () => {
    it('should update staff work schedule', async () => {
      const staffId = 'staff-1';
      const newSchedule = {
        monday: { start: '08:00', end: '16:00', available: true },
        tuesday: { start: '10:00', end: '18:00', available: true },
        wednesday: { available: false },
        thursday: { start: '08:00', end: '16:00', available: true },
        friday: { start: '08:00', end: '16:00', available: true },
        saturday: { available: false },
        sunday: { available: false },
      };

      const existingStaff = TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId });
      const updatedStaff = { ...existingStaff, workSchedule: newSchedule };

      prismaMock.staff.findUnique.mockResolvedValueOnce(existingStaff as any);
      prismaMock.staff.update.mockResolvedValueOnce(updatedStaff as any);

      const result = await staffService.updateWorkSchedule(staffId, newSchedule, mockUser);

      expect(prismaMock.staff.update).toHaveBeenCalledWith({
        where: { id: staffId },
        data: { workSchedule: newSchedule },
        include: {
          branch: true,
          user: true,
          services: {
            include: { service: true },
          },
        },
      });
      expect(result).toEqual(updatedStaff);
    });

    it('should validate schedule format', async () => {
      const staffId = 'staff-1';
      const invalidSchedule = {
        monday: { start: '25:00', end: '17:00', available: true }, // Invalid hour
      };

      await expect(staffService.updateWorkSchedule(staffId, invalidSchedule, mockUser))
        .rejects.toThrow('Invalid time format');
    });
  });

  describe('searchStaff', () => {
    it('should search staff by name and specialization', async () => {
      const searchTerm = 'massage';
      const mockStaff = [
        TestDataFactory.createStaff(mockCompanyId, mockBranchId, {
          firstName: 'John',
          lastName: 'Massage',
        }),
        TestDataFactory.createStaff(mockCompanyId, mockBranchId, {
          specializations: ['Deep Tissue Massage'],
        }),
      ];

      prismaMock.staff.findMany.mockResolvedValueOnce(mockStaff as any);

      const result = await staffService.searchStaff(searchTerm, mockUser);

      expect(prismaMock.staff.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          isActive: true,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { position: { contains: searchTerm, mode: 'insensitive' } },
            { specializations: { hasSome: [searchTerm] } },
          ],
        },
        include: {
          branch: true,
          services: {
            include: { service: true },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });
      expect(result).toEqual(mockStaff);
    });
  });

  describe('getStaffPerformance', () => {
    it('should return staff performance metrics', async () => {
      const staffId = 'staff-1';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      prismaMock.staff.findUnique.mockResolvedValueOnce(
        TestDataFactory.createStaff(mockCompanyId, mockBranchId, { id: staffId }) as any
      );
      
      // Mock appointment statistics
      prismaMock.appointment.count.mockResolvedValueOnce(25); // Total appointments
      prismaMock.appointment.count.mockResolvedValueOnce(23); // Completed appointments
      prismaMock.appointment.count.mockResolvedValueOnce(2);  // Cancelled appointments
      
      // Mock revenue calculation
      prismaMock.appointment.aggregate.mockResolvedValueOnce({
        _sum: { price: 2500 },
      } as any);

      const result = await staffService.getStaffPerformance(staffId, startDate, endDate, mockUser);

      expect(result).toHaveProperty('staff');
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('totalAppointments');
      expect(result.metrics).toHaveProperty('completedAppointments');
      expect(result.metrics).toHaveProperty('cancelledAppointments');
      expect(result.metrics).toHaveProperty('totalRevenue');
    });
  });
});