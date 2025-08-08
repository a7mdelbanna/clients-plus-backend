import { PrismaClient, Staff, StaffBranch, StaffService as PrismaStaffService, StaffSchedule, StaffTimeOff, AccessLevel, AccessStatus, StaffStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// Types for API responses
export interface StaffWithRelations extends Staff {
  branches: (StaffBranch & {
    branch: {
      id: string;
      name: string;
      type: string;
    };
  })[];
  services: (PrismaStaffService & {
    service: {
      id: string;
      name: string;
      price: number;
      duration: number;
    };
  })[];
  schedules: StaffSchedule[];
  timeOffs: StaffTimeOff[];
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface CreateStaffData {
  name: string;
  nameAr?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  bio?: string;
  specialization?: string;
  positionId?: string;
  employmentDate?: Date;
  accessLevel?: AccessLevel;
  onlineBookingEnabled?: boolean;
  onlineBookingProfile?: any;
  onlineBookingRules?: any;
  schedulingTime?: string;
  color?: string;
  order?: number;
  branchIds?: string[];
  serviceIds?: string[];
  userId?: string;
  commissionRate?: number;
  hourlyRate?: number;
  specializations?: string[];
  qualifications?: string;
  certifications?: any;
}

export interface UpdateStaffData extends Partial<CreateStaffData> {
  status?: StaffStatus;
  accessStatus?: AccessStatus;
}

export interface StaffFilters {
  branchId?: string;
  serviceId?: string;
  positionId?: string;
  accessLevel?: AccessLevel;
  status?: StaffStatus;
  searchTerm?: string;
  onlineBookingEnabled?: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  staffId?: string;
}

export interface AvailabilityRequest {
  date: Date;
  duration: number; // minutes
  branchId?: string;
  serviceId?: string;
}

class StaffService {
  
  /**
   * Create a new staff member
   */
  async createStaff(companyId: string, data: CreateStaffData, createdById: string): Promise<StaffWithRelations> {
    // Check email uniqueness within company
    if (data.email) {
      const existingStaff = await this.checkEmailExists(companyId, data.email);
      if (existingStaff) {
        throw new Error('Email already exists for another staff member in this company');
      }
    }

    // Create staff record
    const staffData: Prisma.StaffCreateInput = {
      company: { connect: { id: companyId } },
      name: data.name,
      nameAr: data.nameAr,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      title: data.title,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      bio: data.bio,
      specialization: data.specialization,
      positionId: data.positionId,
      employmentDate: data.employmentDate,
      accessLevel: data.accessLevel || 'EMPLOYEE',
      onlineBookingEnabled: data.onlineBookingEnabled || false,
      onlineBookingProfile: data.onlineBookingProfile,
      onlineBookingRules: data.onlineBookingRules,
      schedulingTime: data.schedulingTime,
      color: data.color,
      order: data.order || 0,
      commissionRate: data.commissionRate,
      hourlyRate: data.hourlyRate,
      specializations: data.specializations || [],
      qualifications: data.qualifications,
      certifications: data.certifications,
      createdBy: createdById,
      user: data.userId ? { connect: { id: data.userId } } : undefined,
    };

    const staff = await prisma.staff.create({
      data: staffData,
      include: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                duration: true,
              },
            },
          },
        },
        schedules: true,
        timeOffs: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
            },
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                // price: true, // Removed as it may not exist in service model
                duration: true,
              },
            },
          },
        },
        schedules: true,
        timeOffs: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Assign to branches if provided
    if (data.branchIds && data.branchIds.length > 0) {
      await this.assignToBranches(staff.id, data.branchIds, data.branchIds[0]);
    }

    // Assign services if provided
    if (data.serviceIds && data.serviceIds.length > 0) {
      await this.assignServices(staff.id, data.serviceIds);
    }

    return await this.getStaffById(staff.id) as StaffWithRelations;
  }

  /**
   * Get all staff with filtering
   */
  async getStaff(companyId: string, filters?: StaffFilters): Promise<StaffWithRelations[]> {
    const where: Prisma.StaffWhereInput = {
      companyId,
      isActive: true,
    };

    // Apply filters
    if (filters?.accessLevel) {
      where.accessLevel = filters.accessLevel;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.positionId) {
      where.positionId = filters.positionId;
    }

    if (filters?.onlineBookingEnabled !== undefined) {
      where.onlineBookingEnabled = filters.onlineBookingEnabled;
    }

    let staff = await prisma.staff.findMany({
      where,
      include: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                // price: true, // Removed as it may not exist in service model
                duration: true,
              },
            },
          },
        },
        schedules: true,
        timeOffs: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
    });

    // Client-side filtering for complex queries
    if (filters?.branchId) {
      staff = staff.filter(s => 
        s.branches.some(sb => sb.branchId === filters.branchId)
      );
    }

    if (filters?.serviceId) {
      staff = staff.filter(s => 
        s.services.some(ss => ss.serviceId === filters.serviceId)
      );
    }

    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      staff = staff.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.nameAr?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower) ||
        s.phone?.includes(filters.searchTerm) ||
        s.mobile?.includes(filters.searchTerm) ||
        s.specialization?.toLowerCase().includes(searchLower) ||
        s.title?.toLowerCase().includes(searchLower)
      );
    }

    return staff;
  }

  /**
   * Get staff member by ID with full relations
   */
  async getStaffById(staffId: string): Promise<StaffWithRelations | null> {
    return await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                // price: true, // Removed as it may not exist in service model
                duration: true,
              },
            },
          },
        },
        schedules: true,
        timeOffs: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Update staff member
   */
  async updateStaff(staffId: string, data: UpdateStaffData): Promise<StaffWithRelations> {
    const currentStaff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { services: true },
    });

    if (!currentStaff) {
      throw new Error('Staff member not found');
    }

    // Check email uniqueness if email is being changed
    if (data.email && data.email !== currentStaff.email) {
      const existingStaff = await this.checkEmailExists(currentStaff.companyId, data.email, staffId);
      if (existingStaff) {
        throw new Error('Email already exists for another staff member in this company');
      }
    }

    // Update staff record
    const updateData: Prisma.StaffUpdateInput = {
      name: data.name,
      nameAr: data.nameAr,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      title: data.title,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      bio: data.bio,
      specialization: data.specialization,
      positionId: data.positionId,
      employmentDate: data.employmentDate,
      accessLevel: data.accessLevel,
      accessStatus: data.accessStatus,
      status: data.status,
      onlineBookingEnabled: data.onlineBookingEnabled,
      onlineBookingProfile: data.onlineBookingProfile,
      onlineBookingRules: data.onlineBookingRules,
      schedulingTime: data.schedulingTime,
      color: data.color,
      order: data.order,
      commissionRate: data.commissionRate,
      hourlyRate: data.hourlyRate,
      specializations: data.specializations,
      qualifications: data.qualifications,
      certifications: data.certifications,
      servicesCount: data.serviceIds ? data.serviceIds.length : undefined,
      user: data.userId ? { connect: { id: data.userId } } : undefined,
    };

    await prisma.staff.update({
      where: { id: staffId },
      data: updateData,
    });

    // Update branch assignments if provided
    if (data.branchIds !== undefined) {
      await this.updateBranchAssignments(staffId, data.branchIds);
    }

    // Update service assignments if provided
    if (data.serviceIds !== undefined) {
      await this.updateServiceAssignments(staffId, data.serviceIds);
    }

    return await this.getStaffById(staffId) as StaffWithRelations;
  }

  /**
   * Soft delete staff member
   */
  async deleteStaff(staffId: string): Promise<void> {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        isActive: false,
        status: 'TERMINATED',
        registrationEndDate: new Date(),
      },
    });

    // Remove from all branch assignments
    await prisma.staffBranch.deleteMany({
      where: { staffId },
    });

    // Remove from all service assignments
    await prisma.staffService.deleteMany({
      where: { staffId },
    });
  }

  /**
   * Get staff by service
   */
  async getStaffByService(companyId: string, serviceId: string): Promise<StaffWithRelations[]> {
    return await this.getStaff(companyId, { serviceId });
  }

  /**
   * Get staff by branch
   */
  async getStaffByBranch(companyId: string, branchId: string): Promise<StaffWithRelations[]> {
    return await this.getStaff(companyId, { branchId });
  }

  /**
   * Assign staff to branches
   */
  async assignToBranches(staffId: string, branchIds: string[], primaryBranchId?: string): Promise<void> {
    // Remove existing assignments
    await prisma.staffBranch.deleteMany({
      where: { staffId },
    });

    // Create new assignments
    const assignments = branchIds.map(branchId => ({
      staffId,
      branchId,
      isPrimary: branchId === (primaryBranchId || branchIds[0]),
    }));

    await prisma.staffBranch.createMany({
      data: assignments,
    });

    // Update primary branch in staff record
    if (primaryBranchId) {
      await prisma.staff.update({
        where: { id: staffId },
        data: { primaryBranchId },
      });
    }
  }

  /**
   * Update branch assignments
   */
  async updateBranchAssignments(staffId: string, branchIds: string[]): Promise<void> {
    await this.assignToBranches(staffId, branchIds);
  }

  /**
   * Remove staff from branch
   */
  async removeFromBranch(staffId: string, branchId: string): Promise<void> {
    await prisma.staffBranch.delete({
      where: {
        staffId_branchId: {
          staffId,
          branchId,
        },
      },
    });

    // If this was the primary branch, clear it
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { primaryBranchId: true },
    });

    if (staff?.primaryBranchId === branchId) {
      await prisma.staff.update({
        where: { id: staffId },
        data: { primaryBranchId: null },
      });
    }
  }

  /**
   * Assign services to staff
   */
  async assignServices(staffId: string, serviceIds: string[]): Promise<void> {
    const assignments = serviceIds.map(serviceId => ({
      staffId,
      serviceId,
    }));

    await prisma.staffService.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    // Update services count
    await prisma.staff.update({
      where: { id: staffId },
      data: { servicesCount: serviceIds.length },
    });
  }

  /**
   * Update service assignments
   */
  async updateServiceAssignments(staffId: string, serviceIds: string[]): Promise<void> {
    // Remove existing assignments
    await prisma.staffService.deleteMany({
      where: { staffId },
    });

    // Create new assignments
    if (serviceIds.length > 0) {
      await this.assignServices(staffId, serviceIds);
    } else {
      // Update count to 0 if no services
      await prisma.staff.update({
        where: { id: staffId },
        data: { servicesCount: 0 },
      });
    }
  }

  /**
   * Remove service from staff
   */
  async removeService(staffId: string, serviceId: string): Promise<void> {
    await prisma.staffService.delete({
      where: {
        staffId_serviceId: {
          staffId,
          serviceId,
        },
      },
    });

    // Update services count
    const count = await prisma.staffService.count({
      where: { staffId },
    });

    await prisma.staff.update({
      where: { id: staffId },
      data: { servicesCount: count },
    });
  }

  /**
   * Check if email exists within company
   */
  async checkEmailExists(companyId: string, email: string, excludeStaffId?: string): Promise<boolean> {
    const where: Prisma.StaffWhereInput = {
      companyId,
      email,
      isActive: true,
    };

    if (excludeStaffId) {
      where.id = { not: excludeStaffId };
    }

    const count = await prisma.staff.count({ where });
    return count > 0;
  }

  /**
   * Update staff display order
   */
  async reorderStaff(staffOrders: Array<{ staffId: string; order: number }>): Promise<void> {
    const updates = staffOrders.map(({ staffId, order }) =>
      prisma.staff.update({
        where: { id: staffId },
        data: { order },
      })
    );

    await prisma.$transaction(updates);
  }

  /**
   * Send staff invitation (placeholder for email/SMS integration)
   */
  async sendInvitation(staffId: string): Promise<void> {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        accessStatus: 'INVITED',
        inviteSentAt: new Date(),
      },
    });
    
    // TODO: Integrate with email/SMS service
    console.log(`Invitation sent to staff member ${staffId}`);
  }

  /**
   * Request time off for staff
   */
  async requestTimeOff(staffId: string, data: {
    startDate: Date;
    endDate: Date;
    type: string;
    reason?: string;
  }): Promise<StaffTimeOff> {
    return await prisma.staffTimeOff.create({
      data: {
        staffId,
        startDate: data.startDate,
        endDate: data.endDate,
        type: data.type as any,
        reason: data.reason,
      },
    });
  }

  /**
   * Get staff time off records
   */
  async getTimeOffRecords(staffId: string): Promise<StaffTimeOff[]> {
    return await prisma.staffTimeOff.findMany({
      where: { staffId },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Check staff availability for specific date and time
   */
  async checkAvailability(
    staffId: string, 
    branchId: string, 
    date: Date, 
    duration: number
  ): Promise<TimeSlot[]> {
    // This is a simplified implementation - the complex availability logic
    // should be handled by the ScheduleService
    const dayOfWeek = date.getDay();
    
    // Get staff schedule for the day
    const schedule = await prisma.staffSchedule.findFirst({
      where: {
        staffId,
        branchId,
        dayOfWeek,
        isWorking: true,
      },
    });

    if (!schedule) {
      return []; // No working hours for this day
    }

    // Get existing appointments for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Get time off records
    const timeOffs = await prisma.staffTimeOff.findMany({
      where: {
        staffId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (timeOffs.length > 0) {
      return []; // Staff is on time off
    }

    // Generate available time slots (simplified logic)
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const slotDuration = 30; // 30-minute slots

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Check if slot conflicts with existing appointments
      const hasConflict = appointments.some(apt => 
        (slotStart >= apt.startTime && slotStart < apt.endTime) ||
        (slotEnd > apt.startTime && slotEnd <= apt.endTime) ||
        (slotStart <= apt.startTime && slotEnd >= apt.endTime)
      );

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !hasConflict,
        staffId,
      });
    }

    return slots.filter(slot => slot.available);
  }

  /**
   * Get staff statistics for analytics
   */
  async getStaffStats(companyId: string): Promise<{
    totalStaff: number;
    activeStaff: number;
    onlineBookingEnabled: number;
    byAccessLevel: Record<AccessLevel, number>;
    byStatus: Record<StaffStatus, number>;
  }> {
    const staff = await prisma.staff.findMany({
      where: { companyId },
      select: {
        accessLevel: true,
        status: true,
        isActive: true,
        onlineBookingEnabled: true,
      },
    });

    const stats = {
      totalStaff: staff.length,
      activeStaff: staff.filter(s => s.isActive).length,
      onlineBookingEnabled: staff.filter(s => s.onlineBookingEnabled).length,
      byAccessLevel: {} as Record<AccessLevel, number>,
      byStatus: {} as Record<StaffStatus, number>,
    };

    // Count by access level
    staff.forEach(s => {
      stats.byAccessLevel[s.accessLevel] = (stats.byAccessLevel[s.accessLevel] || 0) + 1;
      stats.byStatus[s.status] = (stats.byStatus[s.status] || 0) + 1;
    });

    return stats;
  }
}

export const staffService = new StaffService();
export default staffService;