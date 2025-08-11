import { PrismaClient, AppointmentStatus, PaymentStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { addDays, addWeeks, addMonths, addYears, startOfDay, endOfDay, format, parseISO, subDays, subMonths, subYears } from 'date-fns';
import { redisService } from './redis.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface AnalyticsParams {
  companyId: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  branchId?: string;
  staffId?: string;
  serviceId?: string;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  completedRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  periodComparison: {
    currentPeriod: number;
    previousPeriod: number;
    growthRate: number;
    growthPercentage: string;
  };
  revenueByPeriod: Array<{
    period: string;
    date: Date;
    revenue: number;
    appointments: number;
  }>;
  revenueByService: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    appointments: number;
    averageValue: number;
  }>;
  revenueByPaymentMethod: Array<{
    method: PaymentMethod;
    amount: number;
    count: number;
    percentage: number;
  }>;
  revenueByBranch?: Array<{
    branchId: string;
    branchName: string;
    revenue: number;
    appointments: number;
  }>;
}

export interface AppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  pendingAppointments: number;
  statusBreakdown: Array<{
    status: AppointmentStatus;
    count: number;
    percentage: number;
  }>;
  appointmentsByPeriod: Array<{
    period: string;
    date: Date;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }>;
  peakHours: Array<{
    hour: number;
    count: number;
    averageRevenue: number;
  }>;
  averageDuration: number;
  utilizationRate: number;
  conversionRate: number;
  rescheduleRate: number;
  appointmentsBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

export interface ClientAnalytics {
  totalClients: number;
  newClients: number;
  returningClients: number;
  activeClients: number;
  inactiveClients: number;
  clientRetentionRate: number;
  averageLifetimeValue: number;
  clientsByPeriod: Array<{
    period: string;
    date: Date;
    newClients: number;
    returningClients: number;
    totalClients: number;
  }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalSpent: number;
    appointmentCount: number;
    lastVisit: Date;
  }>;
  clientAcquisitionChannels: Array<{
    channel: string;
    count: number;
    percentage: number;
    averageValue: number;
  }>;
  geographicDistribution?: Array<{
    region: string;
    count: number;
    percentage: number;
  }>;
}

export interface StaffPerformance {
  totalStaff: number;
  activeStaff: number;
  staffMetrics: Array<{
    staffId: string;
    staffName: string;
    totalRevenue: number;
    appointmentCount: number;
    averageAppointmentValue: number;
    completionRate: number;
    cancellationRate: number;
    utilizationRate: number;
    clientSatisfactionScore?: number;
    commissionEarned?: number;
    hoursWorked?: number;
    efficiency?: number;
  }>;
  topPerformers: Array<{
    staffId: string;
    staffName: string;
    metric: string;
    value: number;
    rank: number;
  }>;
  staffUtilization: Array<{
    staffId: string;
    staffName: string;
    bookedHours: number;
    availableHours: number;
    utilizationPercentage: number;
  }>;
}

export interface ServiceAnalytics {
  totalServices: number;
  activeServices: number;
  servicePerformance: Array<{
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
    averagePrice: number;
    popularityRank: number;
    conversionRate: number;
    cancellationRate: number;
    averageRating?: number;
  }>;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    metric: string;
    value: number;
    rank: number;
  }>;
  servicesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    serviceCount: number;
    totalRevenue: number;
    bookingCount: number;
  }>;
}

export class AnalyticsService {
  
  /**
   * Get comprehensive revenue analytics
   */
  async getRevenueAnalytics(params: AnalyticsParams): Promise<RevenueAnalytics> {
    const { companyId, startDate, endDate, groupBy = 'day', branchId } = params;
    
    // Generate cache key
    const cacheKey = `analytics:revenue:${companyId}:${branchId || 'all'}:${startDate.toISOString()}:${endDate.toISOString()}:${groupBy}`;
    
    // Check cache first
    const cached = await redisService.get<RevenueAnalytics>(cacheKey);
    if (cached) {
      logger.debug(`Revenue analytics cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      // Base query conditions
      const baseWhere = {
        companyId,
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate)
        },
        ...(branchId && { branchId })
      };

      // Calculate total revenue from completed appointments
      const completedAppointments = await prisma.appointment.findMany({
        where: {
          ...baseWhere,
          status: AppointmentStatus.COMPLETED
        },
        select: {
          totalPrice: true,
          paidAmount: true,
          date: true,
          services: true
        }
      });

      // Calculate pending revenue from scheduled/pending appointments
      const pendingAppointments = await prisma.appointment.findMany({
        where: {
          ...baseWhere,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
          }
        },
        select: {
          totalPrice: true,
          paidAmount: true
        }
      });

      // Get payment data
      const payments = await prisma.payment.findMany({
        where: {
          companyId,
          paymentDate: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate)
          },
          status: PaymentStatus.COMPLETED
        },
        select: {
          amount: true,
          paymentMethod: true,
          paymentDate: true
        }
      });

      // Calculate totals
      const completedRevenue = completedAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
      const pendingRevenue = pendingAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
      const paidRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const totalRevenue = completedRevenue;
      const unpaidRevenue = completedRevenue - paidRevenue;

      // Calculate period comparison
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const previousStartDate = subDays(startDate, periodDays);
      const previousEndDate = subDays(endDate, periodDays);

      const previousRevenue = await this.calculatePreviousPeriodRevenue(
        companyId, 
        previousStartDate, 
        previousEndDate, 
        branchId
      );

      const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) : 0;
      const growthPercentage = `${(growthRate * 100).toFixed(1)}%`;

      // Group revenue by period
      const revenueByPeriod = await this.groupRevenueByPeriod(
        completedAppointments,
        groupBy,
        startDate,
        endDate
      );

      // Revenue by service
      const revenueByService = await this.calculateRevenueByService(
        companyId,
        startDate,
        endDate,
        branchId
      );

      // Revenue by payment method
      const revenueByPaymentMethod = this.calculateRevenueByPaymentMethod(payments);

      // Revenue by branch (if not filtered by specific branch)
      let revenueByBranch: Array<{branchId: string; branchName: string; revenue: number; appointments: number;}> | undefined;
      if (!branchId) {
        revenueByBranch = await this.calculateRevenueByBranch(companyId, startDate, endDate);
      }

      const result: RevenueAnalytics = {
        totalRevenue,
        completedRevenue,
        pendingRevenue,
        paidRevenue,
        unpaidRevenue,
        periodComparison: {
          currentPeriod: totalRevenue,
          previousPeriod: previousRevenue,
          growthRate,
          growthPercentage
        },
        revenueByPeriod,
        revenueByService,
        revenueByPaymentMethod,
        revenueByBranch
      };

      // Cache result for 1 hour
      await redisService.set(cacheKey, result, { ttl: 3600 });

      return result;
    } catch (error) {
      logger.error('Error calculating revenue analytics:', error);
      throw new Error('Failed to calculate revenue analytics');
    }
  }

  /**
   * Get comprehensive appointment analytics
   */
  async getAppointmentAnalytics(params: AnalyticsParams): Promise<AppointmentAnalytics> {
    const { companyId, startDate, endDate, groupBy = 'day', branchId, staffId } = params;
    
    const cacheKey = `analytics:appointments:${companyId}:${branchId || 'all'}:${staffId || 'all'}:${startDate.toISOString()}:${endDate.toISOString()}:${groupBy}`;
    
    // Check cache
    const cached = await redisService.get<AppointmentAnalytics>(cacheKey);
    if (cached) {
      logger.debug(`Appointment analytics cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const baseWhere = {
        companyId,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate)
        },
        ...(branchId && { branchId }),
        ...(staffId && { staffId })
      };

      // Get all appointments for the period
      const appointments = await prisma.appointment.findMany({
        where: baseWhere,
        select: {
          id: true,
          status: true,
          source: true,
          date: true,
          startTime: true,
          endTime: true,
          totalDuration: true,
          totalPrice: true,
          staff: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Calculate status breakdown
      const statusCounts = appointments.reduce((acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {} as Record<AppointmentStatus, number>);

      const totalAppointments = appointments.length;
      const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        status: status as AppointmentStatus,
        count,
        percentage: (count / totalAppointments) * 100
      }));

      // Group appointments by period
      const appointmentsByPeriod = await this.groupAppointmentsByPeriod(
        appointments,
        groupBy,
        startDate,
        endDate
      );

      // Calculate peak hours
      const peakHours = this.calculatePeakHours(appointments);

      // Calculate metrics
      const completedAppointments = statusCounts[AppointmentStatus.COMPLETED] || 0;
      const cancelledAppointments = statusCounts[AppointmentStatus.CANCELLED] || 0;
      const noShowAppointments = statusCounts[AppointmentStatus.NO_SHOW] || 0;
      const pendingAppointments = (statusCounts[AppointmentStatus.PENDING] || 0) + 
                                  (statusCounts[AppointmentStatus.SCHEDULED] || 0);

      const averageDuration = appointments.length > 0 
        ? appointments.reduce((sum, apt) => sum + (apt.totalDuration || 0), 0) / appointments.length 
        : 0;

      // Calculate utilization and conversion rates
      const { utilizationRate, conversionRate, rescheduleRate } = await this.calculateAppointmentRates(
        companyId,
        startDate,
        endDate,
        branchId,
        staffId
      );

      // Appointments by source
      const sourceCounts = appointments.reduce((acc, apt) => {
        const source = apt.source || 'UNKNOWN';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const appointmentsBySource = Object.entries(sourceCounts).map(([source, count]) => ({
        source,
        count,
        percentage: (count / totalAppointments) * 100
      }));

      const result: AppointmentAnalytics = {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        pendingAppointments,
        statusBreakdown,
        appointmentsByPeriod,
        peakHours,
        averageDuration,
        utilizationRate,
        conversionRate,
        rescheduleRate,
        appointmentsBySource
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, result, { ttl: 1800 });

      return result;
    } catch (error) {
      logger.error('Error calculating appointment analytics:', error);
      throw new Error('Failed to calculate appointment analytics');
    }
  }

  /**
   * Get comprehensive client analytics
   */
  async getClientAnalytics(params: AnalyticsParams): Promise<ClientAnalytics> {
    const { companyId, startDate, endDate, groupBy = 'day', branchId } = params;
    
    const cacheKey = `analytics:clients:${companyId}:${branchId || 'all'}:${startDate.toISOString()}:${endDate.toISOString()}:${groupBy}`;
    
    const cached = await redisService.get<ClientAnalytics>(cacheKey);
    if (cached) {
      logger.debug(`Client analytics cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      // Get all clients
      const allClients = await prisma.client.findMany({
        where: {
          companyId,
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          appointments: {
            where: {
              ...(branchId && { branchId }),
              date: {
                gte: startOfDay(startDate),
                lte: endOfDay(endDate)
              }
            },
            select: {
              id: true,
              totalPrice: true,
              date: true,
              status: true
            }
          }
        }
      });

      // Calculate client metrics
      const newClients = allClients.filter(client => 
        client.createdAt >= startOfDay(startDate) && 
        client.createdAt <= endOfDay(endDate)
      ).length;

      const clientsWithAppointments = allClients.filter(client => 
        client.appointments.length > 0
      );

      const returningClients = clientsWithAppointments.filter(client => {
        const previousAppointments = client.appointments.filter(apt => 
          apt.date < startDate
        );
        return previousAppointments.length > 0;
      }).length;

      const totalClients = allClients.length;
      const activeClients = clientsWithAppointments.length;
      const inactiveClients = totalClients - activeClients;

      // Calculate client lifetime value
      const clientValues = clientsWithAppointments.map(client => {
        const completedAppointments = client.appointments.filter(apt => 
          apt.status === AppointmentStatus.COMPLETED
        );
        return completedAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
      });

      const averageLifetimeValue = clientValues.length > 0 
        ? clientValues.reduce((sum, value) => sum + value, 0) / clientValues.length 
        : 0;

      // Calculate retention rate
      const clientRetentionRate = await this.calculateClientRetentionRate(
        companyId,
        startDate,
        endDate,
        branchId
      );

      // Group clients by period
      const clientsByPeriod = await this.groupClientsByPeriod(
        allClients,
        groupBy,
        startDate,
        endDate
      );

      // Get top clients
      const topClients = clientsWithAppointments
        .map(client => ({
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          totalSpent: client.appointments
            .filter(apt => apt.status === AppointmentStatus.COMPLETED)
            .reduce((sum, apt) => sum + Number(apt.totalPrice), 0),
          appointmentCount: client.appointments.length,
          lastVisit: client.appointments.length > 0 
            ? new Date(Math.max(...client.appointments.map(apt => apt.date.getTime())))
            : new Date()
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Client acquisition channels (simplified - based on first appointment source)
      const clientAcquisitionChannels = await this.calculateClientAcquisitionChannels(
        companyId,
        startDate,
        endDate,
        branchId
      );

      const result: ClientAnalytics = {
        totalClients,
        newClients,
        returningClients,
        activeClients,
        inactiveClients,
        clientRetentionRate,
        averageLifetimeValue,
        clientsByPeriod,
        topClients,
        clientAcquisitionChannels
      };

      // Cache for 1 hour
      await redisService.set(cacheKey, result, { ttl: 3600 });

      return result;
    } catch (error) {
      logger.error('Error calculating client analytics:', error);
      throw new Error('Failed to calculate client analytics');
    }
  }

  /**
   * Get staff performance analytics
   */
  async getStaffPerformance(params: AnalyticsParams): Promise<StaffPerformance> {
    const { companyId, startDate, endDate, branchId, staffId } = params;
    
    const cacheKey = `analytics:staff:${companyId}:${branchId || 'all'}:${staffId || 'all'}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await redisService.get<StaffPerformance>(cacheKey);
    if (cached) {
      logger.debug(`Staff performance cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      // Get all staff with appointments
      const staff = await prisma.staff.findMany({
        where: {
          companyId,
          isActive: true,
          ...(staffId && { id: staffId }),
          ...(branchId && { primaryBranchId: branchId })
        },
        select: {
          id: true,
          name: true,
          commissionRate: true,
          appointments: {
            where: {
              date: {
                gte: startOfDay(startDate),
                lte: endOfDay(endDate)
              },
              ...(branchId && { branchId })
            },
            select: {
              id: true,
              status: true,
              totalPrice: true,
              paidAmount: true,
              totalDuration: true,
              date: true,
              startTime: true,
              endTime: true
            }
          }
        }
      });

      const totalStaff = staff.length;
      const activeStaff = staff.filter(s => s.appointments.length > 0).length;

      // Calculate staff metrics
      const staffMetrics = staff.map(staffMember => {
        const appointments = staffMember.appointments;
        const completedAppointments = appointments.filter(apt => 
          apt.status === AppointmentStatus.COMPLETED
        );
        const cancelledAppointments = appointments.filter(apt => 
          apt.status === AppointmentStatus.CANCELLED
        );

        const totalRevenue = completedAppointments.reduce((sum, apt) => 
          sum + Number(apt.totalPrice), 0
        );
        
        const appointmentCount = appointments.length;
        const averageAppointmentValue = appointmentCount > 0 ? totalRevenue / appointmentCount : 0;
        const completionRate = appointmentCount > 0 ? 
          (completedAppointments.length / appointmentCount) * 100 : 0;
        const cancellationRate = appointmentCount > 0 ? 
          (cancelledAppointments.length / appointmentCount) * 100 : 0;

        // Calculate commission
        const commissionRate = staffMember.commissionRate ? Number(staffMember.commissionRate) : 0;
        const commissionEarned = totalRevenue * commissionRate;

        // Calculate working hours (simplified)
        const hoursWorked = appointments.reduce((hours, apt) => 
          hours + ((apt.totalDuration || 0) / 60), 0
        );

        return {
          staffId: staffMember.id,
          staffName: staffMember.name,
          totalRevenue,
          appointmentCount,
          averageAppointmentValue,
          completionRate,
          cancellationRate,
          utilizationRate: 0, // Would need schedule data to calculate properly
          commissionEarned,
          hoursWorked,
          efficiency: hoursWorked > 0 ? totalRevenue / hoursWorked : 0
        };
      });

      // Get top performers
      const topPerformers = [
        ...staffMetrics
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5)
          .map((staff, index) => ({
            staffId: staff.staffId,
            staffName: staff.staffName,
            metric: 'Total Revenue',
            value: staff.totalRevenue,
            rank: index + 1
          })),
        ...staffMetrics
          .sort((a, b) => b.appointmentCount - a.appointmentCount)
          .slice(0, 5)
          .map((staff, index) => ({
            staffId: staff.staffId,
            staffName: staff.staffName,
            metric: 'Appointments',
            value: staff.appointmentCount,
            rank: index + 1
          }))
      ];

      // Staff utilization (simplified - would need schedule data for accurate calculation)
      const staffUtilization = staffMetrics.map(staff => ({
        staffId: staff.staffId,
        staffName: staff.staffName,
        bookedHours: staff.hoursWorked || 0,
        availableHours: 40, // Assuming 40 hours per week
        utilizationPercentage: ((staff.hoursWorked || 0) / 40) * 100
      }));

      const result: StaffPerformance = {
        totalStaff,
        activeStaff,
        staffMetrics,
        topPerformers,
        staffUtilization
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, result, { ttl: 1800 });

      return result;
    } catch (error) {
      logger.error('Error calculating staff performance:', error);
      throw new Error('Failed to calculate staff performance');
    }
  }

  /**
   * Get service analytics
   */
  async getServiceAnalytics(params: AnalyticsParams): Promise<ServiceAnalytics> {
    const { companyId, startDate, endDate, branchId } = params;
    
    const cacheKey = `analytics:services:${companyId}:${branchId || 'all'}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await redisService.get<ServiceAnalytics>(cacheKey);
    if (cached) {
      logger.debug(`Service analytics cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      // Get all services
      const services = await prisma.service.findMany({
        where: {
          companyId,
          active: true
        },
        select: {
          id: true,
          name: true,
          startingPrice: true,
          categoryId: true,
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Get appointments for services
      const appointments = await prisma.appointment.findMany({
        where: {
          companyId,
          date: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate)
          },
          ...(branchId && { branchId })
        },
        select: {
          id: true,
          services: true,
          totalPrice: true,
          status: true
        }
      });

      // Parse service data from appointments
      const serviceBookings = new Map<string, {
        bookings: number;
        revenue: number;
        completed: number;
        cancelled: number;
      }>();

      appointments.forEach(apt => {
        if (apt.services && typeof apt.services === 'object') {
          const servicesData = apt.services as any[];
          servicesData.forEach((service: any) => {
            const serviceId = service.serviceId;
            if (!serviceBookings.has(serviceId)) {
              serviceBookings.set(serviceId, {
                bookings: 0,
                revenue: 0,
                completed: 0,
                cancelled: 0
              });
            }
            
            const serviceData = serviceBookings.get(serviceId)!;
            serviceData.bookings++;
            
            if (apt.status === AppointmentStatus.COMPLETED) {
              serviceData.completed++;
              serviceData.revenue += service.price || 0;
            } else if (apt.status === AppointmentStatus.CANCELLED) {
              serviceData.cancelled++;
            }
          });
        }
      });

      // Calculate service performance
      const servicePerformance = services.map((service, index) => {
        const bookingData = serviceBookings.get(service.id) || {
          bookings: 0,
          revenue: 0,
          completed: 0,
          cancelled: 0
        };

        const conversionRate = bookingData.bookings > 0 ? 
          (bookingData.completed / bookingData.bookings) * 100 : 0;
        const cancellationRate = bookingData.bookings > 0 ? 
          (bookingData.cancelled / bookingData.bookings) * 100 : 0;
        const averagePrice = bookingData.completed > 0 ? 
          bookingData.revenue / bookingData.completed : Number(service.startingPrice);

        return {
          serviceId: service.id,
          serviceName: service.name,
          bookingCount: bookingData.bookings,
          revenue: bookingData.revenue,
          averagePrice,
          popularityRank: index + 1, // Will be recalculated
          conversionRate,
          cancellationRate
        };
      }).sort((a, b) => b.bookingCount - a.bookingCount)
        .map((service, index) => ({
          ...service,
          popularityRank: index + 1
        }));

      // Get top services
      const topServices = [
        ...servicePerformance
          .slice(0, 5)
          .map((service, index) => ({
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            metric: 'Bookings',
            value: service.bookingCount,
            rank: index + 1
          })),
        ...servicePerformance
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map((service, index) => ({
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            metric: 'Revenue',
            value: service.revenue,
            rank: index + 1
          }))
      ];

      // Services by category
      const categoryMap = new Map<string, {
        categoryId: string;
        categoryName: string;
        serviceCount: number;
        totalRevenue: number;
        bookingCount: number;
      }>();

      servicePerformance.forEach(service => {
        const serviceData = services.find(s => s.id === service.serviceId);
        if (serviceData?.category) {
          const categoryId = serviceData.category.id;
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              categoryId,
              categoryName: serviceData.category.name,
              serviceCount: 0,
              totalRevenue: 0,
              bookingCount: 0
            });
          }
          
          const categoryData = categoryMap.get(categoryId)!;
          categoryData.serviceCount++;
          categoryData.totalRevenue += service.revenue;
          categoryData.bookingCount += service.bookingCount;
        }
      });

      const servicesByCategory = Array.from(categoryMap.values());

      const result: ServiceAnalytics = {
        totalServices: services.length,
        activeServices: services.filter((s: any) => s.active).length,
        servicePerformance,
        topServices,
        servicesByCategory
      };

      // Cache for 1 hour
      await redisService.set(cacheKey, result, { ttl: 3600 });

      return result;
    } catch (error) {
      logger.error('Error calculating service analytics:', error);
      throw new Error('Failed to calculate service analytics');
    }
  }

  // Private helper methods

  private async calculatePreviousPeriodRevenue(
    companyId: string, 
    startDate: Date, 
    endDate: Date, 
    branchId?: string
  ): Promise<number> {
    const appointments = await prisma.appointment.findMany({
      where: {
        companyId,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate)
        },
        status: AppointmentStatus.COMPLETED,
        ...(branchId && { branchId })
      },
      select: {
        totalPrice: true
      }
    });

    return appointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
  }

  private async groupRevenueByPeriod(
    appointments: any[],
    groupBy: string,
    startDate: Date,
    endDate: Date
  ) {
    const periods = new Map<string, {
      revenue: number;
      appointments: number;
      date: Date;
    }>();

    appointments.forEach(apt => {
      let periodKey: string;
      let periodDate: Date;

      switch (groupBy) {
        case 'day':
          periodKey = format(apt.date, 'yyyy-MM-dd');
          periodDate = startOfDay(apt.date);
          break;
        case 'week':
          periodKey = format(apt.date, 'yyyy-\'W\'ww');
          periodDate = startOfDay(apt.date);
          break;
        case 'month':
          periodKey = format(apt.date, 'yyyy-MM');
          periodDate = new Date(apt.date.getFullYear(), apt.date.getMonth(), 1);
          break;
        case 'year':
          periodKey = format(apt.date, 'yyyy');
          periodDate = new Date(apt.date.getFullYear(), 0, 1);
          break;
        default:
          periodKey = format(apt.date, 'yyyy-MM-dd');
          periodDate = startOfDay(apt.date);
      }

      if (!periods.has(periodKey)) {
        periods.set(periodKey, {
          revenue: 0,
          appointments: 0,
          date: periodDate
        });
      }

      const period = periods.get(periodKey)!;
      period.revenue += Number(apt.totalPrice);
      period.appointments++;
    });

    return Array.from(periods.entries()).map(([period, data]) => ({
      period,
      date: data.date,
      revenue: data.revenue,
      appointments: data.appointments
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private async calculateRevenueByService(
    companyId: string,
    startDate: Date,
    endDate: Date,
    branchId?: string
  ) {
    const appointments = await prisma.appointment.findMany({
      where: {
        companyId,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate)
        },
        status: AppointmentStatus.COMPLETED,
        ...(branchId && { branchId })
      },
      select: {
        services: true,
        totalPrice: true
      }
    });

    const serviceRevenue = new Map<string, {
      serviceName: string;
      revenue: number;
      appointments: number;
    }>();

    appointments.forEach(apt => {
      if (apt.services && typeof apt.services === 'object') {
        const servicesData = apt.services as any[];
        servicesData.forEach((service: any) => {
          const serviceId = service.serviceId;
          const serviceName = service.serviceName;
          
          if (!serviceRevenue.has(serviceId)) {
            serviceRevenue.set(serviceId, {
              serviceName,
              revenue: 0,
              appointments: 0
            });
          }
          
          const serviceData = serviceRevenue.get(serviceId)!;
          serviceData.revenue += service.price || 0;
          serviceData.appointments++;
        });
      }
    });

    return Array.from(serviceRevenue.entries()).map(([serviceId, data]) => ({
      serviceId,
      serviceName: data.serviceName,
      revenue: data.revenue,
      appointments: data.appointments,
      averageValue: data.appointments > 0 ? data.revenue / data.appointments : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }

  private calculateRevenueByPaymentMethod(payments: any[]) {
    const methodCounts = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod;
      if (!acc[method]) {
        acc[method] = { amount: 0, count: 0 };
      }
      acc[method].amount += Number(payment.amount);
      acc[method].count++;
      return acc;
    }, {} as Record<PaymentMethod, { amount: number; count: number }>);

    const totalAmount = Object.values(methodCounts).reduce((sum, data) => sum + (data as any).amount, 0) as number;

    return Object.entries(methodCounts).map(([method, data]) => ({
      method: method as PaymentMethod,
      amount: (data as any).amount,
      count: (data as any).count,
      percentage: totalAmount > 0 ? ((data as any).amount / totalAmount) * 100 : 0
    }));
  }

  private async calculateRevenueByBranch(
    companyId: string,
    startDate: Date,
    endDate: Date
  ) {
    const branchRevenue = await prisma.appointment.groupBy({
      by: ['branchId'],
      where: {
        companyId,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate)
        },
        status: AppointmentStatus.COMPLETED
      },
      _sum: {
        totalPrice: true
      },
      _count: {
        id: true
      }
    });

    const branches = await prisma.branch.findMany({
      where: {
        companyId,
        id: {
          in: branchRevenue.map(br => br.branchId)
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    return branchRevenue.map(br => {
      const branch = branches.find(b => b.id === br.branchId);
      return {
        branchId: br.branchId,
        branchName: branch?.name || 'Unknown Branch',
        revenue: Number(br._sum.totalPrice || 0),
        appointments: br._count.id
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  private async groupAppointmentsByPeriod(
    appointments: any[],
    groupBy: string,
    startDate: Date,
    endDate: Date
  ) {
    const periods = new Map<string, {
      total: number;
      completed: number;
      cancelled: number;
      noShow: number;
      date: Date;
    }>();

    appointments.forEach(apt => {
      let periodKey: string;
      let periodDate: Date;

      switch (groupBy) {
        case 'day':
          periodKey = format(apt.date, 'yyyy-MM-dd');
          periodDate = startOfDay(apt.date);
          break;
        case 'week':
          periodKey = format(apt.date, 'yyyy-\'W\'ww');
          periodDate = startOfDay(apt.date);
          break;
        case 'month':
          periodKey = format(apt.date, 'yyyy-MM');
          periodDate = new Date(apt.date.getFullYear(), apt.date.getMonth(), 1);
          break;
        default:
          periodKey = format(apt.date, 'yyyy-MM-dd');
          periodDate = startOfDay(apt.date);
      }

      if (!periods.has(periodKey)) {
        periods.set(periodKey, {
          total: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          date: periodDate
        });
      }

      const period = periods.get(periodKey)!;
      period.total++;
      
      if (apt.status === AppointmentStatus.COMPLETED) {
        period.completed++;
      } else if (apt.status === AppointmentStatus.CANCELLED) {
        period.cancelled++;
      } else if (apt.status === AppointmentStatus.NO_SHOW) {
        period.noShow++;
      }
    });

    return Array.from(periods.entries()).map(([period, data]) => ({
      period,
      date: data.date,
      total: data.total,
      completed: data.completed,
      cancelled: data.cancelled,
      noShow: data.noShow
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculatePeakHours(appointments: any[]) {
    const hourCounts = appointments.reduce((acc, apt) => {
      const hour = parseInt(apt.startTime.split(':')[0]);
      if (!acc[hour]) {
        acc[hour] = { count: 0, totalRevenue: 0 };
      }
      acc[hour].count++;
      acc[hour].totalRevenue += Number(apt.totalPrice || 0);
      return acc;
    }, {} as Record<number, { count: number; totalRevenue: number }>);

    return Object.entries(hourCounts).map(([hour, data]) => ({
      hour: parseInt(hour),
      count: (data as any).count,
      averageRevenue: (data as any).count > 0 ? (data as any).totalRevenue / (data as any).count : 0
    })).sort((a, b) => b.count - a.count);
  }

  private async calculateAppointmentRates(
    companyId: string,
    startDate: Date,
    endDate: Date,
    branchId?: string,
    staffId?: string
  ) {
    // This would need more complex logic based on business requirements
    // For now, returning simplified calculations
    return {
      utilizationRate: 75, // Placeholder
      conversionRate: 85,  // Placeholder
      rescheduleRate: 10   // Placeholder
    };
  }

  private async calculateClientRetentionRate(
    companyId: string,
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<number> {
    // Simplified retention calculation
    // Would need more sophisticated logic in production
    return 65; // Placeholder percentage
  }

  private async groupClientsByPeriod(
    clients: any[],
    groupBy: string,
    startDate: Date,
    endDate: Date
  ) {
    const periods = new Map<string, {
      newClients: number;
      returningClients: number;
      totalClients: number;
      date: Date;
    }>();

    clients.forEach(client => {
      if (client.createdAt >= startDate && client.createdAt <= endDate) {
        let periodKey: string;
        let periodDate: Date;

        switch (groupBy) {
          case 'day':
            periodKey = format(client.createdAt, 'yyyy-MM-dd');
            periodDate = startOfDay(client.createdAt);
            break;
          case 'week':
            periodKey = format(client.createdAt, 'yyyy-\'W\'ww');
            periodDate = startOfDay(client.createdAt);
            break;
          case 'month':
            periodKey = format(client.createdAt, 'yyyy-MM');
            periodDate = new Date(client.createdAt.getFullYear(), client.createdAt.getMonth(), 1);
            break;
          default:
            periodKey = format(client.createdAt, 'yyyy-MM-dd');
            periodDate = startOfDay(client.createdAt);
        }

        if (!periods.has(periodKey)) {
          periods.set(periodKey, {
            newClients: 0,
            returningClients: 0,
            totalClients: 0,
            date: periodDate
          });
        }

        const period = periods.get(periodKey)!;
        period.newClients++;
        period.totalClients++;
      }
    });

    return Array.from(periods.entries()).map(([period, data]) => ({
      period,
      date: data.date,
      newClients: data.newClients,
      returningClients: data.returningClients,
      totalClients: data.totalClients
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private async calculateClientAcquisitionChannels(
    companyId: string,
    startDate: Date,
    endDate: Date,
    branchId?: string
  ) {
    // This would need to track how clients were acquired
    // For now, returning placeholder data
    return [
      { channel: 'Online Booking', count: 45, percentage: 45, averageValue: 120 },
      { channel: 'Referral', count: 30, percentage: 30, averageValue: 150 },
      { channel: 'Walk-in', count: 20, percentage: 20, averageValue: 100 },
      { channel: 'Phone', count: 5, percentage: 5, averageValue: 110 }
    ];
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();