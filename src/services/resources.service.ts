import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { redisService } from './redis.service';

const prisma = new PrismaClient();

export interface Resource {
  id: string;
  name: string;
  description?: string;
  type: ResourceType;
  capacity: number;
  branchId: string;
  isActive: boolean;
  settings: ResourceSettings;
  availability: ResourceAvailability;
  createdAt: Date;
  updatedAt: Date;
}

export enum ResourceType {
  ROOM = 'ROOM',
  CHAIR = 'CHAIR',
  EQUIPMENT = 'EQUIPMENT',
  STATION = 'STATION',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER'
}

export interface ResourceSettings {
  requiresBooking: boolean;
  advanceBookingDays: number;
  bufferTime: number; // minutes between bookings
  maintenanceSchedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    duration: number; // minutes
    time: string; // HH:MM format
  };
  pricing?: {
    hourlyRate: number;
    currency: string;
  };
}

export interface ResourceAvailability {
  schedule: {
    [day: string]: { // monday, tuesday, etc.
      available: boolean;
      timeSlots: Array<{
        startTime: string;
        endTime: string;
      }>;
    };
  };
  exceptions: Array<{
    date: string;
    available: boolean;
    reason?: string;
    timeSlots?: Array<{
      startTime: string;
      endTime: string;
    }>;
  }>;
}

export interface ResourceBooking {
  id: string;
  resourceId: string;
  appointmentId?: string;
  startTime: Date;
  endTime: Date;
  status: 'BOOKED' | 'BLOCKED' | 'MAINTENANCE';
  notes?: string;
  bookedBy: string;
}

export class ResourcesService {
  /**
   * Get all resources for a company
   */
  async getResources(
    companyId: string,
    filters: {
      branchId?: string;
      type?: ResourceType;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ resources: Resource[]; total: number }> {
    try {
      const where: any = { companyId };
      
      if (filters.branchId) where.branchId = filters.branchId;
      if (filters.type) where.type = filters.type;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;

      const [resources, total] = await Promise.all([
        prisma.resource.findMany({
          where,
          include: {
            branch: {
              select: { name: true }
            }
          },
          orderBy: { name: 'asc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
        }),
        prisma.resource.count({ where }),
      ]);

      return {
        resources: resources.map(this.mapResourceFromDb),
        total,
      };
    } catch (error) {
      logger.error('Error getting resources:', error);
      throw error;
    }
  }

  /**
   * Get a single resource by ID
   */
  async getResource(companyId: string, resourceId: string): Promise<Resource | null> {
    try {
      const resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          companyId,
        },
        include: {
          branch: {
            select: { name: true }
          }
        }
      });

      if (!resource) return null;

      return this.mapResourceFromDb(resource);
    } catch (error) {
      logger.error('Error getting resource:', error);
      throw error;
    }
  }

  /**
   * Create a new resource
   */
  async createResource(
    companyId: string,
    data: {
      name: string;
      description?: string;
      type: ResourceType;
      capacity: number;
      branchId: string;
      settings: ResourceSettings;
      availability: ResourceAvailability;
    }
  ): Promise<Resource> {
    try {
      // Validate branch belongs to company
      const branch = await prisma.branch.findFirst({
        where: {
          id: data.branchId,
          companyId,
        },
      });

      if (!branch) {
        throw new Error('Branch not found or not accessible');
      }

      const resource = await prisma.resource.create({
        data: {
          companyId,
          name: data.name,
          description: data.description,
          type: data.type,
          capacity: data.capacity,
          branchId: data.branchId,
          settings: JSON.stringify(data.settings),
          availability: JSON.stringify(data.availability),
          isActive: true,
        },
        include: {
          branch: {
            select: { name: true }
          }
        }
      });

      logger.info(`Resource created: ${resource.id}`, { companyId, resourceName: data.name });

      // Clear cache
      await this.clearResourcesCache(companyId);

      return this.mapResourceFromDb(resource);
    } catch (error) {
      logger.error('Error creating resource:', error);
      throw error;
    }
  }

  /**
   * Update a resource
   */
  async updateResource(
    companyId: string,
    resourceId: string,
    data: Partial<{
      name: string;
      description?: string;
      type: ResourceType;
      capacity: number;
      branchId: string;
      settings: ResourceSettings;
      availability: ResourceAvailability;
      isActive: boolean;
    }>
  ): Promise<Resource> {
    try {
      // Verify resource belongs to company
      const existingResource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          companyId,
        },
      });

      if (!existingResource) {
        throw new Error('Resource not found or not accessible');
      }

      // If branchId is being updated, validate it
      if (data.branchId) {
        const branch = await prisma.branch.findFirst({
          where: {
            id: data.branchId,
            companyId,
          },
        });

        if (!branch) {
          throw new Error('Branch not found or not accessible');
        }
      }

      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.type) updateData.type = data.type;
      if (data.capacity) updateData.capacity = data.capacity;
      if (data.branchId) updateData.branchId = data.branchId;
      if (data.settings) updateData.settings = JSON.stringify(data.settings);
      if (data.availability) updateData.availability = JSON.stringify(data.availability);
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const resource = await prisma.resource.update({
        where: { id: resourceId },
        data: updateData,
        include: {
          branch: {
            select: { name: true }
          }
        }
      });

      logger.info(`Resource updated: ${resourceId}`, { companyId });

      // Clear cache
      await this.clearResourcesCache(companyId);

      return this.mapResourceFromDb(resource);
    } catch (error) {
      logger.error('Error updating resource:', error);
      throw error;
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(companyId: string, resourceId: string): Promise<void> {
    try {
      // Verify resource belongs to company
      const resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          companyId,
        },
      });

      if (!resource) {
        throw new Error('Resource not found or not accessible');
      }

      // Check if resource has active bookings
      const activeBookings = await prisma.appointment.count({
        where: {
          resourceId,
          date: { gte: new Date() },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      });

      if (activeBookings > 0) {
        throw new Error('Cannot delete resource with active bookings. Please cancel or reschedule appointments first.');
      }

      await prisma.resource.delete({
        where: { id: resourceId },
      });

      logger.info(`Resource deleted: ${resourceId}`, { companyId });

      // Clear cache
      await this.clearResourcesCache(companyId);
    } catch (error) {
      logger.error('Error deleting resource:', error);
      throw error;
    }
  }

  /**
   * Check resource availability for a specific time slot
   */
  async checkAvailability(
    companyId: string,
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<{
    available: boolean;
    conflicts: Array<{
      type: 'appointment' | 'maintenance' | 'blocked';
      startTime: Date;
      endTime: Date;
      details?: any;
    }>;
  }> {
    try {
      const resource = await this.getResource(companyId, resourceId);
      
      if (!resource) {
        throw new Error('Resource not found');
      }

      if (!resource.isActive) {
        return {
          available: false,
          conflicts: [{ type: 'blocked', startTime, endTime, details: 'Resource is inactive' }],
        };
      }

      // Check if time slot falls within resource availability
      const dayOfWeek = startTime.toLocaleDateString('en', { weekday: 'lowercase' });
      const daySchedule = resource.availability.schedule[dayOfWeek];
      
      if (!daySchedule?.available) {
        return {
          available: false,
          conflicts: [{ type: 'blocked', startTime, endTime, details: 'Resource not available on this day' }],
        };
      }

      // Check existing appointments
      const where: any = {
        resourceId,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ],
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      };

      if (excludeAppointmentId) {
        where.id = { not: excludeAppointmentId };
      }

      const conflictingAppointments = await prisma.appointment.findMany({
        where,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          client: {
            select: { firstName: true, lastName: true }
          }
        }
      });

      const conflicts = conflictingAppointments.map(apt => ({
        type: 'appointment' as const,
        startTime: apt.startTime,
        endTime: apt.endTime,
        details: {
          appointmentId: apt.id,
          clientName: `${apt.client.firstName} ${apt.client.lastName}`
        }
      }));

      return {
        available: conflicts.length === 0,
        conflicts,
      };
    } catch (error) {
      logger.error('Error checking resource availability:', error);
      throw error;
    }
  }

  /**
   * Get resource availability for a date range
   */
  async getAvailability(
    companyId: string,
    resourceId: string,
    startDate: Date,
    endDate: Date,
    slotDuration: number = 60 // minutes
  ): Promise<Array<{
    date: string;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      bookingId?: string;
    }>;
  }>> {
    try {
      const resource = await this.getResource(companyId, resourceId);
      
      if (!resource) {
        throw new Error('Resource not found');
      }

      const availability: Array<{
        date: string;
        timeSlots: Array<{
          startTime: string;
          endTime: string;
          available: boolean;
          bookingId?: string;
        }>;
      }> = [];

      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.toLocaleDateString('en', { weekday: 'lowercase' });
        const daySchedule = resource.availability.schedule[dayOfWeek];

        if (daySchedule?.available && daySchedule.timeSlots.length > 0) {
          const timeSlots: Array<{
            startTime: string;
            endTime: string;
            available: boolean;
            bookingId?: string;
          }> = [];

          for (const slot of daySchedule.timeSlots) {
            // Generate time slots for the day
            const slotStart = new Date(`${dateStr}T${slot.startTime}:00`);
            const slotEnd = new Date(`${dateStr}T${slot.endTime}:00`);

            const currentSlot = new Date(slotStart);
            
            while (currentSlot < slotEnd) {
              const slotEndTime = new Date(currentSlot.getTime() + slotDuration * 60000);
              
              if (slotEndTime <= slotEnd) {
                const availability = await this.checkAvailability(
                  companyId,
                  resourceId,
                  currentSlot,
                  slotEndTime
                );

                timeSlots.push({
                  startTime: currentSlot.toTimeString().slice(0, 5),
                  endTime: slotEndTime.toTimeString().slice(0, 5),
                  available: availability.available,
                  bookingId: availability.conflicts.length > 0 ? availability.conflicts[0].details?.appointmentId : undefined,
                });
              }

              currentSlot.setTime(currentSlot.getTime() + slotDuration * 60000);
            }
          }

          availability.push({
            date: dateStr,
            timeSlots,
          });
        } else {
          availability.push({
            date: dateStr,
            timeSlots: [],
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return availability;
    } catch (error) {
      logger.error('Error getting resource availability:', error);
      throw error;
    }
  }

  /**
   * Get resource types
   */
  getResourceTypes(): Array<{ value: ResourceType; label: string; description: string }> {
    return [
      {
        value: ResourceType.ROOM,
        label: 'Room',
        description: 'Private treatment rooms'
      },
      {
        value: ResourceType.CHAIR,
        label: 'Chair',
        description: 'Individual seating stations'
      },
      {
        value: ResourceType.EQUIPMENT,
        label: 'Equipment',
        description: 'Specialized equipment or tools'
      },
      {
        value: ResourceType.STATION,
        label: 'Station',
        description: 'Work stations or booths'
      },
      {
        value: ResourceType.VEHICLE,
        label: 'Vehicle',
        description: 'Mobile service vehicles'
      },
      {
        value: ResourceType.OTHER,
        label: 'Other',
        description: 'Other resource types'
      }
    ];
  }

  // Private helper methods

  private mapResourceFromDb(resource: any): Resource {
    return {
      id: resource.id,
      name: resource.name,
      description: resource.description,
      type: resource.type as ResourceType,
      capacity: resource.capacity,
      branchId: resource.branchId,
      isActive: resource.isActive,
      settings: resource.settings ? JSON.parse(resource.settings) : this.getDefaultSettings(),
      availability: resource.availability ? JSON.parse(resource.availability) : this.getDefaultAvailability(),
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }

  private getDefaultSettings(): ResourceSettings {
    return {
      requiresBooking: true,
      advanceBookingDays: 90,
      bufferTime: 15,
    };
  }

  private getDefaultAvailability(): ResourceAvailability {
    const defaultDaySchedule = {
      available: true,
      timeSlots: [
        { startTime: '09:00', endTime: '17:00' }
      ]
    };

    return {
      schedule: {
        monday: defaultDaySchedule,
        tuesday: defaultDaySchedule,
        wednesday: defaultDaySchedule,
        thursday: defaultDaySchedule,
        friday: defaultDaySchedule,
        saturday: { available: true, timeSlots: [{ startTime: '10:00', endTime: '16:00' }] },
        sunday: { available: false, timeSlots: [] }
      },
      exceptions: []
    };
  }

  private async clearResourcesCache(companyId: string): Promise<void> {
    const patterns = [
      `resources:${companyId}*`,
      `resource:*`,
    ];

    for (const pattern of patterns) {
      await redisService.invalidatePattern(pattern);
    }
  }
}

// Export singleton instance
export const resourcesService = new ResourcesService();