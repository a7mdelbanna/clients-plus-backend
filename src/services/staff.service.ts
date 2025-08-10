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
      startingPrice?: any; // Decimal from database
      duration: any; // JSON field from schema
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
                startingPrice: true,
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
                startingPrice: true,
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
        (s.nameAr && s.nameAr.toLowerCase().includes(searchLower)) ||
        (s.email && s.email.toLowerCase().includes(searchLower)) ||
        (s.phone && s.phone.includes(filters.searchTerm!)) ||
        (s.mobile && s.mobile.includes(filters.searchTerm!)) ||
        (s.specialization && s.specialization.toLowerCase().includes(searchLower)) ||
        (s.title && s.title.toLowerCase().includes(searchLower))
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
                startingPrice: true,
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
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      orderBy: { date: 'asc' },
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
      const hasConflict = appointments.some(apt => {
        const [aptStartHour, aptStartMinute] = apt.startTime.split(':').map(Number);
        const [aptEndHour, aptEndMinute] = apt.endTime.split(':').map(Number);
        
        const aptStartTime = new Date(apt.date);
        aptStartTime.setHours(aptStartHour, aptStartMinute, 0, 0);
        
        const aptEndTime = new Date(apt.date);
        aptEndTime.setHours(aptEndHour, aptEndMinute, 0, 0);
        
        return (slotStart >= aptStartTime && slotStart < aptEndTime) ||
               (slotEnd > aptStartTime && slotEnd <= aptEndTime) ||
               (slotStart <= aptStartTime && slotEnd >= aptEndTime);
      });

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

  /**
   * Get commission data for staff member
   */
  async getCommissionData(
    staffId: string,
    startDate?: Date,
    endDate?: Date,
    branchId?: string
  ): Promise<{
    totalCommission: number;
    appointments: number;
    revenue: number;
    commissionRate: number;
    breakdown: Array<{
      date: string;
      appointments: number;
      revenue: number;
      commission: number;
    }>;
  }> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { commissionRate: true },
    });

    if (!staff) {
      throw new Error('Staff member not found');
    }

    const commissionRate = Number(staff.commissionRate || 0);
    
    // Default to current month if no dates provided
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: start,
          lte: end,
        },
        branchId: branchId || undefined,
        status: {
          in: ['COMPLETED', 'CONFIRMED'],
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
    });

    const breakdown: Array<{
      date: string;
      appointments: number;
      revenue: number;
      commission: number;
    }> = [];

    const dailyData = new Map<string, { appointments: number; revenue: number }>();

    appointments.forEach(apt => {
      const dateKey = apt.date.toISOString().split('T')[0];
      const revenue = Number(apt.totalPrice || 0);
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { appointments: 0, revenue: 0 });
      }
      
      const day = dailyData.get(dateKey)!;
      day.appointments += 1;
      day.revenue += revenue;
    });

    dailyData.forEach((data, date) => {
      breakdown.push({
        date,
        appointments: data.appointments,
        revenue: data.revenue,
        commission: data.revenue * commissionRate,
      });
    });

    const totalRevenue = appointments.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0);
    const totalCommission = totalRevenue * commissionRate;

    return {
      totalCommission,
      appointments: appointments.length,
      revenue: totalRevenue,
      commissionRate,
      breakdown,
    };
  }

  /**
   * Get performance metrics for staff member
   */
  async getPerformanceMetrics(
    staffId: string,
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    branchId?: string
  ): Promise<{
    appointmentsCompleted: number;
    appointmentsCancelled: number;
    noShowRate: number;
    averageRating: number;
    revenue: number;
    utilizationRate: number;
    clientRetentionRate: number;
  }> {
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      default: // monthly
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: startDate,
          lte: now,
        },
        branchId: branchId || undefined,
      },
    });

    const completed = appointments.filter(apt => apt.status === 'COMPLETED').length;
    const cancelled = appointments.filter(apt => apt.status === 'CANCELLED').length;
    const noShow = appointments.filter(apt => apt.status === 'NO_SHOW').length;
    const total = appointments.length;

    const revenue = appointments
      .filter(apt => apt.status === 'COMPLETED')
      .reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0);

    // Calculate utilization rate (appointments vs available hours)
    // This is a simplified calculation - would need actual working hours for accurate calculation
    const workingDaysInPeriod = period === 'weekly' ? 5 : period === 'monthly' ? 22 : 66;
    const hoursPerDay = 8; // Assuming 8 hours per day
    const totalAvailableHours = workingDaysInPeriod * hoursPerDay;
    const totalAppointmentHours = appointments.reduce((sum, apt) => sum + (apt.totalDuration || 60), 0) / 60;
    const utilizationRate = totalAvailableHours > 0 ? (totalAppointmentHours / totalAvailableHours) * 100 : 0;

    // Client retention calculation (simplified)
    const uniqueClients = new Set(appointments.map(apt => apt.clientId));
    const returningClients = appointments.filter(apt => 
      appointments.some(other => other.clientId === apt.clientId && other.date < apt.date)
    );
    const clientRetentionRate = uniqueClients.size > 0 ? 
      (new Set(returningClients.map(apt => apt.clientId)).size / uniqueClients.size) * 100 : 0;

    return {
      appointmentsCompleted: completed,
      appointmentsCancelled: cancelled,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      averageRating: 4.5, // Placeholder - would come from reviews
      revenue,
      utilizationRate,
      clientRetentionRate,
    };
  }

  /**
   * Get revenue analytics for staff member
   */
  async getRevenueAnalytics(
    staffId: string,
    startDate?: Date,
    endDate?: Date,
    groupBy: 'daily' | 'weekly' | 'monthly' = 'daily',
    branchId?: string
  ): Promise<{
    totalRevenue: number;
    avgRevenuePerAppointment: number;
    revenueGrowth: number;
    topServices: Array<{
      serviceName: string;
      revenue: number;
      appointments: number;
    }>;
    timeline: Array<{
      period: string;
      revenue: number;
      appointments: number;
    }>;
  }> {
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: start,
          lte: end,
        },
        branchId: branchId || undefined,
        status: 'COMPLETED',
      },
    });

    const totalRevenue = appointments.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0);
    const avgRevenuePerAppointment = appointments.length > 0 ? totalRevenue / appointments.length : 0;

    // Group appointments by time period for timeline
    const timeline: Array<{ period: string; revenue: number; appointments: number }> = [];
    const timelineData = new Map<string, { revenue: number; appointments: number }>();

    appointments.forEach(apt => {
      let periodKey: string;
      const date = apt.date;
      
      switch (groupBy) {
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // daily
          periodKey = date.toISOString().split('T')[0];
      }
      
      if (!timelineData.has(periodKey)) {
        timelineData.set(periodKey, { revenue: 0, appointments: 0 });
      }
      
      const period = timelineData.get(periodKey)!;
      period.revenue += Number(apt.totalPrice || 0);
      period.appointments += 1;
    });

    timelineData.forEach((data, period) => {
      timeline.push({
        period,
        revenue: data.revenue,
        appointments: data.appointments,
      });
    });

    // Sort timeline by period
    timeline.sort((a, b) => a.period.localeCompare(b.period));

    // Calculate revenue growth (current vs previous period)
    let revenueGrowth = 0;
    if (timeline.length >= 2) {
      const current = timeline[timeline.length - 1].revenue;
      const previous = timeline[timeline.length - 2].revenue;
      revenueGrowth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    }

    // Top services (simplified - would need service details)
    const topServices = [
      { serviceName: 'Service 1', revenue: totalRevenue * 0.4, appointments: Math.floor(appointments.length * 0.4) },
      { serviceName: 'Service 2', revenue: totalRevenue * 0.3, appointments: Math.floor(appointments.length * 0.3) },
      { serviceName: 'Service 3', revenue: totalRevenue * 0.3, appointments: Math.floor(appointments.length * 0.3) },
    ];

    return {
      totalRevenue,
      avgRevenuePerAppointment,
      revenueGrowth,
      topServices,
      timeline,
    };
  }

  /**
   * Update commission rate for staff member
   */
  async updateCommissionRate(staffId: string, commissionRate: number): Promise<void> {
    await prisma.staff.update({
      where: { id: staffId },
      data: { commissionRate },
    });
  }

  /**
   * Get staff positions for company
   */
  async getPositions(companyId: string): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    permissions?: any;
    staffCount: number;
  }>> {
    // This would ideally come from a positions table
    // For now, return based on existing position fields
    const staffPositions = await prisma.staff.groupBy({
      by: ['positionId'],
      where: {
        companyId,
        isActive: true,
        positionId: { not: null },
      },
      _count: true,
    });

    return staffPositions.map(position => ({
      id: position.positionId || '',
      name: position.positionId || 'Unknown Position',
      description: `Position: ${position.positionId}`,
      permissions: {},
      staffCount: position._count,
    }));
  }

  /**
   * Create staff position
   */
  async createPosition(companyId: string, data: {
    name: string;
    description?: string;
    permissions?: any;
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    permissions?: any;
  }> {
    // This would ideally create in a positions table
    // For now, return mock data
    const positionId = `pos_${Date.now()}`;
    
    return {
      id: positionId,
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    };
  }

  /**
   * Update staff position
   */
  async updatePosition(positionId: string, data: {
    name?: string;
    description?: string;
    permissions?: any;
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    permissions?: any;
  }> {
    // This would ideally update in a positions table
    // For now, return mock data
    return {
      id: positionId,
      name: data.name || 'Updated Position',
      description: data.description,
      permissions: data.permissions,
    };
  }

  /**
   * Delete staff position
   */
  async deletePosition(positionId: string): Promise<void> {
    // This would ideally delete from a positions table
    // For now, update staff members with this position to null
    await prisma.staff.updateMany({
      where: { positionId },
      data: { positionId: null },
    });
  }
}

export const staffService = new StaffService();
export default staffService;