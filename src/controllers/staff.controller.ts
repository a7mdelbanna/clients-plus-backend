import { Request, Response } from 'express';
import { z } from 'zod';
import { staffService, CreateStaffData, UpdateStaffData, StaffFilters } from '../services/staff.service';
import { scheduleService, CreateScheduleData, WorkingDay } from '../services/schedule.service';
import { successResponse, errorResponse } from '../utils/response';
import { AccessLevel, AccessStatus, StaffStatus } from '@prisma/client';

// Validation schemas
const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameAr: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  title: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  bio: z.string().optional(),
  specialization: z.string().optional(),
  positionId: z.string().optional(),
  employmentDate: z.string().datetime().optional(),
  accessLevel: z.nativeEnum(AccessLevel).optional(),
  onlineBookingEnabled: z.boolean().optional(),
  onlineBookingProfile: z.any().optional(),
  onlineBookingRules: z.any().optional(),
  schedulingTime: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
  branchIds: z.array(z.string()).optional(),
  serviceIds: z.array(z.string()).optional(),
  userId: z.string().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  hourlyRate: z.number().min(0).optional(),
  specializations: z.array(z.string()).optional(),
  qualifications: z.string().optional(),
  certifications: z.any().optional(),
});

const updateStaffSchema = createStaffSchema.partial().extend({
  status: z.nativeEnum(StaffStatus).optional(),
  accessStatus: z.nativeEnum(AccessStatus).optional(),
});

const staffFiltersSchema = z.object({
  branchId: z.string().optional(),
  serviceId: z.string().optional(),
  positionId: z.string().optional(),
  accessLevel: z.nativeEnum(AccessLevel).optional(),
  status: z.nativeEnum(StaffStatus).optional(),
  searchTerm: z.string().optional(),
  onlineBookingEnabled: z.boolean().optional(),
});

const workingDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isWorking: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  breaks: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional(),
});

const createScheduleSchema = z.object({
  branchId: z.string(),
  workingDays: z.array(workingDaySchema),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

const availabilityRequestSchema = z.object({
  date: z.string().datetime(),
  duration: z.number().int().min(1),
  branchId: z.string(),
});

const timeOffRequestSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.string(),
  reason: z.string().optional(),
});

const reorderStaffSchema = z.object({
  staffOrders: z.array(z.object({
    staffId: z.string(),
    order: z.number().int(),
  })),
});

class StaffController {
  
  /**
   * GET /api/v1/staff - Get all staff with filtering
   */
  async getStaff(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json(errorResponse('Company ID is required'));
      }

      const filters = staffFiltersSchema.parse(req.query);
      const staff = await staffService.getStaff(companyId, filters);

      return res.json(successResponse(staff, 'Staff retrieved successfully'));
    } catch (error) {
      console.error('Error fetching staff:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse('Invalid filters', error.issues));
      }
      return res.status(500).json(errorResponse('Failed to fetch staff'));
    }
  }

  /**
   * GET /api/v1/staff/:id - Get staff member details
   */
  async getStaffById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const staff = await staffService.getStaffById(id);

      if (!staff) {
        return res.status(404).json(errorResponse('Staff member not found'));
      }

      return res.json(successResponse(staff, 'Staff member retrieved successfully'));
    } catch (error) {
      console.error('Error fetching staff member:', error);
      return res.status(500).json(errorResponse('Failed to fetch staff member'));
    }
  }

  /**
   * POST /api/v1/staff - Create new staff member
   */
  async createStaff(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const createdById = req.user?.userId;
      
      if (!companyId || !createdById) {
        return res.status(400).json(errorResponse('Company ID and user ID are required'));
      }

      const validatedData = createStaffSchema.parse(req.body);
      
      // Convert date strings to Date objects
      const createData: CreateStaffData = {
        ...validatedData,
        employmentDate: validatedData.employmentDate ? new Date(validatedData.employmentDate) : undefined,
      };

      const staff = await staffService.createStaff(companyId, createData, createdById);

      return res.status(201).json(successResponse(staff, 'Staff member created successfully'));
    } catch (error) {
      console.error('Error creating staff:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse('Invalid data', error.issues));
      }
      if (error instanceof Error) {
        return res.status(400).json(errorResponse(error.message));
      }
      return res.status(500).json(errorResponse('Failed to create staff member'));
    }
  }

  /**
   * PUT /api/v1/staff/:id - Update staff member
   */
  async updateStaff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateStaffSchema.parse(req.body);
      
      // Convert date strings to Date objects
      const updateData: UpdateStaffData = {
        ...validatedData,
        employmentDate: validatedData.employmentDate ? new Date(validatedData.employmentDate) : undefined,
      };

      const staff = await staffService.updateStaff(id, updateData);

      return res.json(successResponse(staff, 'Staff member updated successfully'));
    } catch (error) {
      console.error('Error updating staff:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse('Invalid data', error.issues));
      }
      if (error instanceof Error) {
        return res.status(400).json(errorResponse(error.message));
      }
      return res.status(500).json(errorResponse('Failed to update staff member'));
    }
  }

  /**
   * DELETE /api/v1/staff/:id - Delete (deactivate) staff member
   */
  async deleteStaff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await staffService.deleteStaff(id);

      return res.json(successResponse(null, 'Staff member deleted successfully'));
    } catch (error) {
      console.error('Error deleting staff:', error);
      return res.status(500).json(errorResponse('Failed to delete staff member'));
    }
  }

  /**
   * GET /api/v1/staff/by-service/:serviceId - Get staff who provide a service
   */
  async getStaffByService(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { serviceId } = req.params;

      if (!companyId) {
        return res.status(400).json(errorResponse('Company ID is required'));
      }

      const staff = await staffService.getStaffByService(companyId, serviceId);

      return res.json(successResponse(staff, 'Staff retrieved successfully'));
    } catch (error) {
      console.error('Error fetching staff by service:', error);
      return res.status(500).json(errorResponse('Failed to fetch staff'));
    }
  }

  /**
   * GET /api/v1/staff/by-branch/:branchId - Get staff in a branch
   */
  async getStaffByBranch(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { branchId } = req.params;

      if (!companyId) {
        return res.status(400).json(errorResponse('Company ID is required'));
      }

      const staff = await staffService.getStaffByBranch(companyId, branchId);

      return res.json(successResponse(staff, 'Staff retrieved successfully'));
    } catch (error) {
      console.error('Error fetching staff by branch:', error);
      return res.status(500).json(errorResponse('Failed to fetch staff'));
    }
  }

  /**
   * POST /api/v1/staff/:id/assign-service - Assign service to staff
   */
  async assignService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { serviceId } = req.body;

      if (!serviceId) {
        return res.status(400).json(errorResponse('Service ID is required'));
      }

      await staffService.assignServices(id, [serviceId]);

      return res.json(successResponse(null, 'Service assigned successfully'));
    } catch (error) {
      console.error('Error assigning service:', error);
      return res.status(500).json(errorResponse('Failed to assign service'));
    }
  }

  /**
   * DELETE /api/v1/staff/:id/unassign-service/:serviceId - Remove service from staff
   */
  async unassignService(req: Request, res: Response) {
    try {
      const { id, serviceId } = req.params;
      await staffService.removeService(id, serviceId);

      return res.json(successResponse(null, 'Service unassigned successfully'));
    } catch (error) {
      console.error('Error unassigning service:', error);
      return res.status(500).json(errorResponse('Failed to unassign service'));
    }
  }

  /**
   * POST /api/v1/staff/:id/assign-branch - Assign staff to branch
   */
  async assignBranch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { branchId, isPrimary } = req.body;

      if (!branchId) {
        return res.status(400).json(errorResponse('Branch ID is required'));
      }

      // Get current branch assignments
      const staff = await staffService.getStaffById(id);
      if (!staff) {
        return res.status(404).json(errorResponse('Staff member not found'));
      }

      const currentBranchIds = staff.branches.map(sb => sb.branchId);
      if (!currentBranchIds.includes(branchId)) {
        const newBranchIds = [...currentBranchIds, branchId];
        await staffService.assignToBranches(id, newBranchIds, isPrimary ? branchId : undefined);
      }

      return res.json(successResponse(null, 'Branch assigned successfully'));
    } catch (error) {
      console.error('Error assigning branch:', error);
      return res.status(500).json(errorResponse('Failed to assign branch'));
    }
  }

  /**
   * DELETE /api/v1/staff/:id/unassign-branch/:branchId - Remove staff from branch
   */
  async unassignBranch(req: Request, res: Response) {
    try {
      const { id, branchId } = req.params;
      await staffService.removeFromBranch(id, branchId);

      return res.json(successResponse(null, 'Branch unassigned successfully'));
    } catch (error) {
      console.error('Error unassigning branch:', error);
      return res.status(500).json(errorResponse('Failed to unassign branch'));
    }
  }

  /**
   * POST /api/v1/staff/reorder - Reorder staff display
   */
  async reorderStaff(req: Request, res: Response) {
    try {
      const { staffOrders } = reorderStaffSchema.parse(req.body);
      await staffService.reorderStaff(staffOrders);

      return res.json(successResponse(null, 'Staff reordered successfully'));
    } catch (error) {
      console.error('Error reordering staff:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse('Invalid data', error.issues));
      }
      return res.status(500).json(errorResponse('Failed to reorder staff'));
    }
  }

  /**
   * GET /api/v1/staff/:id/schedule - Get staff schedule
   */
  async getStaffSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { branchId } = req.query;

      const schedule = await scheduleService.getStaffSchedule(id, branchId as string);

      return res.json(successResponse(schedule, 'Schedule retrieved successfully'));
    } catch (error) {
      console.error('Error fetching staff schedule:', error);
      return res.status(500).json(errorResponse('Failed to fetch schedule'));
    }
  }

  /**
   * PUT /api/v1/staff/:id/schedule - Update staff schedule
   */
  async updateStaffSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = createScheduleSchema.parse(req.body);

      const scheduleData: CreateScheduleData = {
        staffId: id,
        branchId: validatedData.branchId,
        workingDays: validatedData.workingDays.map(day => ({ ...day, startTime: day.startTime || "09:00", endTime: day.endTime || "17:00" })),
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      };

      const schedule = await scheduleService.createOrUpdateSchedule(scheduleData);

      return res.json(successResponse(schedule, 'Schedule updated successfully'));
    } catch (error) {
      console.error('Error updating staff schedule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse('Invalid data', error.issues));
      }
      return res.status(500).json(errorResponse('Failed to update schedule'));
    }
  }

  /**
   * GET /api/v1/staff/:id/availability - Check staff availability
   */
  async getStaffAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { date, duration, branchId } = availabilityRequestSchema.parse(req.query);

      const availability = await scheduleService.getAvailability(
        id,
        branchId,
        new Date(date),
        { minSlotDuration: Number(duration) }
      );

      return res.json(successResponse(availability, 'Availability retrieved successfully'));
    } catch (error) {
      console.error('Error fetching availability:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse('Invalid parameters', error.issues));
      }
      return res.status(500).json(errorResponse('Failed to fetch availability'));
    }
  }

  /**
   * POST /api/v1/staff/:id/time-off - Request time off
   */
  async requestTimeOff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = timeOffRequestSchema.parse(req.body);

      const timeOffData = {
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        type: validatedData.type,
        reason: validatedData.reason,
      };

      const timeOff = await staffService.requestTimeOff(id, timeOffData);

      return res.status(201).json(successResponse(timeOff, 'Time off requested successfully'));
    } catch (error) {
      console.error('Error requesting time off:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(errorResponse('Invalid data', error.issues));
      }
      return res.status(500).json(errorResponse('Failed to request time off'));
    }
  }

  /**
   * GET /api/v1/staff/:id/time-off - Get time off records
   */
  async getTimeOffRecords(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timeOffs = await staffService.getTimeOffRecords(id);

      return res.json(successResponse(timeOffs, 'Time off records retrieved successfully'));
    } catch (error) {
      console.error('Error fetching time off records:', error);
      return res.status(500).json(errorResponse('Failed to fetch time off records'));
    }
  }

  /**
   * POST /api/v1/staff/:id/send-invitation - Send staff invitation
   */
  async sendInvitation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await staffService.sendInvitation(id);

      return res.json(successResponse(null, 'Invitation sent successfully'));
    } catch (error) {
      console.error('Error sending invitation:', error);
      return res.status(500).json(errorResponse('Failed to send invitation'));
    }
  }

  /**
   * GET /api/v1/staff/stats - Get staff statistics
   */
  async getStaffStats(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        return res.status(400).json(errorResponse('Company ID is required'));
      }

      const stats = await staffService.getStaffStats(companyId);

      return res.json(successResponse(stats, 'Staff statistics retrieved successfully'));
    } catch (error) {
      console.error('Error fetching staff stats:', error);
      return res.status(500).json(errorResponse('Failed to fetch staff statistics'));
    }
  }

  /**
   * GET /api/v1/staff/:id/working-hours - Get working hours summary
   */
  async getWorkingHours(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workingHours = await scheduleService.getWorkingHoursSummary(id);

      return res.json(successResponse(workingHours, 'Working hours retrieved successfully'));
    } catch (error) {
      console.error('Error fetching working hours:', error);
      return res.status(500).json(errorResponse('Failed to fetch working hours'));
    }
  }

  /**
   * POST /api/v1/staff/:id/copy-schedule - Copy schedule to other branches
   */
  async copySchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { sourceBranchId, targetBranchIds } = req.body;

      if (!sourceBranchId || !targetBranchIds || !Array.isArray(targetBranchIds)) {
        return res.status(400).json(errorResponse('Source branch ID and target branch IDs are required'));
      }

      const newSchedules = await scheduleService.copyScheduleToOtherBranches(
        id,
        sourceBranchId,
        targetBranchIds
      );

      return res.json(successResponse(newSchedules, 'Schedule copied successfully'));
    } catch (error) {
      console.error('Error copying schedule:', error);
      if (error instanceof Error) {
        return res.status(400).json(errorResponse(error.message));
      }
      return res.status(500).json(errorResponse('Failed to copy schedule'));
    }
  }

  /**
   * GET /api/v1/staff/:id/next-available - Find next available slot
   */
  async getNextAvailableSlot(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { branchId, serviceDuration, fromDate, maxDaysAhead } = req.query;

      const nextSlot = await scheduleService.findNextAvailableSlot(
        id,
        branchId as string,
        Number(serviceDuration),
        fromDate ? new Date(fromDate as string) : new Date(),
        maxDaysAhead ? Number(maxDaysAhead) : 30
      );

      return res.json(successResponse(nextSlot, 'Next available slot retrieved successfully'));
    } catch (error) {
      console.error('Error finding next available slot:', error);
      return res.status(500).json(errorResponse('Failed to find next available slot'));
    }
  }
}

export const staffController = new StaffController();