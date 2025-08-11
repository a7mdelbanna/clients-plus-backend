import { Request, Response } from 'express';
import { z } from 'zod';
import { dashboardService } from '../services/dashboard.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { PrismaClient, AppointmentStatus, PaymentStatus } from '@prisma/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, format } from 'date-fns';

const prisma = new PrismaClient();

// Validation schemas
const statsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional().default('today'),
  branchId: z.string().optional(),
  staffId: z.string().optional(),
  includeComparison: z.boolean().optional().default(true),
});

const revenueQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().default('monthly'),
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  branchId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'service', 'staff', 'branch']).optional().default('day'),
});

const appointmentStatsSchema = z.object({
  period: z.enum(['today', 'week', 'month']).optional().default('today'),
  status: z.array(z.nativeEnum(AppointmentStatus)).optional(),
  branchId: z.string().optional(),
  staffId: z.string().optional(),
  includeDetails: z.boolean().optional().default(false),
});

const clientAnalyticsSchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).optional().default('month'),
  segment: z.enum(['all', 'new', 'returning', 'vip']).optional().default('all'),
  branchId: z.string().optional(),
  includeGrowth: z.boolean().optional().default(true),
});

const staffPerformanceSchema = z.object({
  period: z.enum(['week', 'month', 'quarter']).optional().default('month'),
  staffId: z.string().optional(),
  branchId: z.string().optional(),
  metric: z.enum(['all', 'revenue', 'appointments', 'utilization', 'rating']).optional().default('all'),
});

export class DashboardController {
  /**
   * Get overall dashboard statistics
   * GET /api/v1/dashboard/stats
   */
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = statsQuerySchema.parse(req.query);
      const { companyId } = req.user!;

      logger.info(`Getting dashboard stats for company ${companyId}`, {
        period: validatedData.period,
        branchId: validatedData.branchId,
      });

      // Get dashboard metrics using existing service
      const dashboardMetrics = await dashboardService.getDashboardMetrics(companyId);

      // Add period-specific stats
      const periodStats = await this.getPeriodStats(
        companyId, 
        validatedData.period, 
        validatedData.branchId, 
        validatedData.staffId
      );

      const response = {
        overview: dashboardMetrics.overview,
        realTime: dashboardMetrics.realTime,
        alerts: dashboardMetrics.alerts,
        quickStats: dashboardMetrics.quickStats,
        period: {
          type: validatedData.period,
          stats: periodStats,
        },
        lastUpdated: new Date().toISOString(),
      };

      res.json(successResponse(response, 'Dashboard statistics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getStats:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.errors));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get revenue metrics and analytics
   * GET /api/v1/dashboard/revenue
   */
  async getRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = revenueQuerySchema.parse(req.query);
      const { companyId } = req.user!;

      logger.info(`Getting revenue metrics for company ${companyId}`, {
        period: validatedData.period,
        groupBy: validatedData.groupBy,
      });

      const revenueData = await this.calculateRevenueMetrics(
        companyId,
        validatedData.period,
        validatedData.startDate,
        validatedData.endDate,
        validatedData.branchId,
        validatedData.groupBy
      );

      res.json(successResponse(revenueData, 'Revenue metrics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getRevenue:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.errors));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get appointment statistics
   * GET /api/v1/dashboard/appointments
   */
  async getAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = appointmentStatsSchema.parse(req.query);
      const { companyId } = req.user!;

      logger.info(`Getting appointment stats for company ${companyId}`, {
        period: validatedData.period,
        status: validatedData.status,
      });

      const appointmentData = await this.calculateAppointmentStats(
        companyId,
        validatedData.period,
        validatedData.status,
        validatedData.branchId,
        validatedData.staffId,
        validatedData.includeDetails
      );

      res.json(successResponse(appointmentData, 'Appointment statistics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAppointments:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.errors));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get client analytics
   * GET /api/v1/dashboard/clients
   */
  async getClients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = clientAnalyticsSchema.parse(req.query);
      const { companyId } = req.user!;

      logger.info(`Getting client analytics for company ${companyId}`, {
        period: validatedData.period,
        segment: validatedData.segment,
      });

      const clientData = await this.calculateClientAnalytics(
        companyId,
        validatedData.period,
        validatedData.segment,
        validatedData.branchId,
        validatedData.includeGrowth
      );

      res.json(successResponse(clientData, 'Client analytics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getClients:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.errors));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get staff performance metrics
   * GET /api/v1/dashboard/staff-performance
   */
  async getStaffPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = staffPerformanceSchema.parse(req.query);
      const { companyId } = req.user!;

      logger.info(`Getting staff performance for company ${companyId}`, {
        period: validatedData.period,
        metric: validatedData.metric,
      });

      const staffData = await this.calculateStaffPerformance(
        companyId,
        validatedData.period,
        validatedData.staffId,
        validatedData.branchId,
        validatedData.metric
      );

      res.json(successResponse(staffData, 'Staff performance metrics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getStaffPerformance:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.errors));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get KPI metrics
   * GET /api/v1/dashboard/kpis
   */
  async getKPIs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      logger.info(`Getting KPIs for company ${companyId}`);

      // Use existing service for KPIs
      const kpiData = await dashboardService.getKPIs(companyId);

      res.json(successResponse(kpiData, 'KPI metrics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getKPIs:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get dashboard configuration
   * GET /api/v1/dashboard/config
   */
  async getConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      const config = await dashboardService.getDashboardConfig(companyId);

      res.json(successResponse(config, 'Dashboard configuration retrieved successfully'));
    } catch (error) {
      logger.error('Error in getConfig:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Refresh dashboard cache
   * POST /api/v1/dashboard/refresh
   */
  async refreshCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      await dashboardService.invalidateDashboardCache(companyId);

      logger.info(`Dashboard cache refreshed for company ${companyId}`);

      res.json(successResponse(
        { refreshed: true, timestamp: new Date().toISOString() }, 
        'Dashboard cache refreshed successfully'
      ));
    } catch (error) {
      logger.error('Error in refreshCache:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  // Private helper methods

  private async getPeriodStats(
    companyId: string, 
    period: string, 
    branchId?: string, 
    staffId?: string
  ) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = startOfDay(now);
    }

    const whereConditions: any = {
      companyId,
      date: { gte: startDate, lte: endDate },
    };

    if (branchId) whereConditions.branchId = branchId;
    if (staffId) whereConditions.staffId = staffId;

    const [totalRevenue, totalAppointments, completedAppointments, cancelledAppointments] = await Promise.all([
      prisma.appointment.aggregate({
        where: { ...whereConditions, status: AppointmentStatus.COMPLETED },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.count({ where: whereConditions }),
      prisma.appointment.count({ 
        where: { ...whereConditions, status: AppointmentStatus.COMPLETED } 
      }),
      prisma.appointment.count({ 
        where: { ...whereConditions, status: AppointmentStatus.CANCELLED } 
      }),
    ]);

    return {
      revenue: Number(totalRevenue._sum.totalPrice || 0),
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
        cancellationRate: totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0,
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: period,
      },
    };
  }

  private async calculateRevenueMetrics(
    companyId: string,
    period: string,
    startDate?: string,
    endDate?: string,
    branchId?: string,
    groupBy: string = 'day'
  ) {
    const now = new Date();
    let actualStartDate: Date;
    let actualEndDate: Date;

    if (startDate && endDate) {
      actualStartDate = new Date(startDate);
      actualEndDate = new Date(endDate);
    } else {
      switch (period) {
        case 'daily':
          actualStartDate = startOfDay(subDays(now, 30));
          actualEndDate = endOfDay(now);
          break;
        case 'weekly':
          actualStartDate = startOfWeek(subWeeks(now, 12));
          actualEndDate = endOfWeek(now);
          break;
        case 'monthly':
          actualStartDate = startOfMonth(subMonths(now, 12));
          actualEndDate = endOfMonth(now);
          break;
        case 'yearly':
          actualStartDate = new Date(now.getFullYear() - 3, 0, 1);
          actualEndDate = endOfMonth(now);
          break;
        default:
          actualStartDate = startOfMonth(subMonths(now, 12));
          actualEndDate = endOfMonth(now);
      }
    }

    const whereConditions: any = {
      companyId,
      date: { gte: actualStartDate, lte: actualEndDate },
      status: AppointmentStatus.COMPLETED,
    };

    if (branchId) whereConditions.branchId = branchId;

    // Get total revenue and payment breakdown
    const [revenueData, paymentData] = await Promise.all([
      prisma.appointment.aggregate({
        where: whereConditions,
        _sum: { totalPrice: true },
        _avg: { totalPrice: true },
        _count: true,
      }),
      prisma.payment.findMany({
        where: {
          companyId,
          paymentDate: { gte: actualStartDate, lte: actualEndDate },
          status: PaymentStatus.COMPLETED,
        },
        select: { amount: true, paymentMethod: true, paymentDate: true },
      }),
    ]);

    // Calculate revenue trends (simplified for now)
    const trends = await this.calculateRevenueTrends(companyId, actualStartDate, actualEndDate, groupBy);

    const paymentBreakdown = paymentData.reduce((acc, payment) => {
      const method = payment.paymentMethod.toLowerCase();
      acc[method] = (acc[method] || 0) + Number(payment.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalRevenue: Number(revenueData._sum.totalPrice || 0),
        averageOrderValue: Number(revenueData._avg.totalPrice || 0),
        totalTransactions: revenueData._count,
        paymentBreakdown,
      },
      trends,
      period: {
        start: actualStartDate.toISOString(),
        end: actualEndDate.toISOString(),
        groupBy,
      },
    };
  }

  private async calculateRevenueTrends(
    companyId: string,
    startDate: Date,
    endDate: Date,
    groupBy: string
  ) {
    // This is a simplified version - you could enhance this with more sophisticated grouping
    const appointments = await prisma.appointment.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: AppointmentStatus.COMPLETED,
      },
      select: {
        date: true,
        totalPrice: true,
        createdAt: true,
      },
      orderBy: { date: 'asc' },
    });

    const trends: Array<{ period: string; revenue: number; transactions: number }> = [];
    const groupedData = new Map<string, { revenue: number; transactions: number }>();

    appointments.forEach(appointment => {
      let periodKey: string;
      
      switch (groupBy) {
        case 'day':
          periodKey = format(appointment.date, 'yyyy-MM-dd');
          break;
        case 'week':
          periodKey = format(startOfWeek(appointment.date), 'yyyy-MM-dd');
          break;
        case 'month':
          periodKey = format(appointment.date, 'yyyy-MM');
          break;
        default:
          periodKey = format(appointment.date, 'yyyy-MM-dd');
      }

      const existing = groupedData.get(periodKey) || { revenue: 0, transactions: 0 };
      groupedData.set(periodKey, {
        revenue: existing.revenue + Number(appointment.totalPrice),
        transactions: existing.transactions + 1,
      });
    });

    groupedData.forEach((data, period) => {
      trends.push({
        period,
        revenue: data.revenue,
        transactions: data.transactions,
      });
    });

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  private async calculateAppointmentStats(
    companyId: string,
    period: string,
    status?: AppointmentStatus[],
    branchId?: string,
    staffId?: string,
    includeDetails: boolean = false
  ) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
    }

    const whereConditions: any = {
      companyId,
      date: { gte: startDate, lte: endDate },
    };

    if (status && status.length > 0) whereConditions.status = { in: status };
    if (branchId) whereConditions.branchId = branchId;
    if (staffId) whereConditions.staffId = staffId;

    const [appointmentsByStatus, serviceStats, staffStats] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['status'],
        where: whereConditions,
        _count: { id: true },
        _sum: { totalPrice: true },
      }),
      includeDetails ? this.getTopServices(companyId, startDate, endDate, branchId) : [],
      includeDetails ? this.getStaffStats(companyId, startDate, endDate, branchId) : [],
    ]);

    const statusBreakdown = appointmentsByStatus.reduce((acc, item) => {
      acc[item.status] = {
        count: item._count.id,
        revenue: Number(item._sum.totalPrice || 0),
      };
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const total = appointmentsByStatus.reduce((sum, item) => sum + item._count.id, 0);

    return {
      summary: {
        total,
        statusBreakdown,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          type: period,
        },
      },
      details: includeDetails ? {
        topServices: serviceStats,
        staffPerformance: staffStats,
      } : undefined,
    };
  }

  private async calculateClientAnalytics(
    companyId: string,
    period: string,
    segment: string,
    branchId?: string,
    includeGrowth: boolean = true
  ) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const whereConditions: any = { companyId };
    
    if (segment === 'new') {
      whereConditions.createdAt = { gte: startDate, lte: endDate };
    }

    const [clientCount, clientsWithAppointments] = await Promise.all([
      prisma.client.count({ where: whereConditions }),
      prisma.client.findMany({
        where: whereConditions,
        include: {
          appointments: {
            where: {
              date: { gte: startDate, lte: endDate },
              status: AppointmentStatus.COMPLETED,
            },
            select: {
              totalPrice: true,
              date: true,
            },
          },
        },
      }),
    ]);

    // Calculate client segments and metrics
    const clientMetrics = clientsWithAppointments.map(client => {
      const totalSpent = client.appointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
      const visitCount = client.appointments.length;
      
      return {
        clientId: client.id,
        totalSpent,
        visitCount,
        lastVisit: client.appointments.length > 0 
          ? client.appointments.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date
          : null,
      };
    });

    const segments = this.categorizeClients(clientMetrics);

    return {
      summary: {
        totalClients: clientCount,
        activeClients: clientsWithAppointments.length,
        segments,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          type: period,
        },
      },
      growth: includeGrowth ? await this.calculateClientGrowth(companyId, startDate, endDate) : undefined,
    };
  }

  private async calculateStaffPerformance(
    companyId: string,
    period: string,
    staffId?: string,
    branchId?: string,
    metric: string = 'all'
  ) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const whereConditions: any = { companyId, isActive: true };
    if (branchId) whereConditions.branchId = branchId;
    if (staffId) whereConditions.id = staffId;

    const staffWithPerformance = await prisma.staff.findMany({
      where: whereConditions,
      include: {
        appointments: {
          where: {
            date: { gte: startDate, lte: endDate },
            status: AppointmentStatus.COMPLETED,
          },
          select: {
            totalPrice: true,
            totalDuration: true,
            date: true,
          },
        },
      },
    });

    const performanceData = staffWithPerformance.map(staff => {
      const appointments = staff.appointments;
      const totalRevenue = appointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
      const totalAppointments = appointments.length;
      const totalDuration = appointments.reduce((sum, apt) => sum + apt.totalDuration, 0);

      // Calculate utilization (simplified - would need working hours data)
      const workingDaysInPeriod = 22; // Approximate
      const workingHoursPerDay = 8;
      const totalAvailableMinutes = workingDaysInPeriod * workingHoursPerDay * 60;
      const utilizationRate = totalAvailableMinutes > 0 ? (totalDuration / totalAvailableMinutes) * 100 : 0;

      return {
        staffId: staff.id,
        staffName: staff.name,
        branch: staff.branch ? staff.branch.name : 'Unassigned',
        metrics: {
          revenue: totalRevenue,
          appointments: totalAppointments,
          averageRevenue: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
          utilizationRate: Math.min(utilizationRate, 100), // Cap at 100%
          totalDuration,
        },
      };
    });

    // Sort by the requested metric
    let sortKey = 'revenue';
    if (metric === 'appointments') sortKey = 'appointments';
    else if (metric === 'utilization') sortKey = 'utilizationRate';

    performanceData.sort((a, b) => b.metrics[sortKey as keyof typeof a.metrics] - a.metrics[sortKey as keyof typeof a.metrics]);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: period,
      },
      staff: performanceData,
      summary: {
        totalStaff: performanceData.length,
        totalRevenue: performanceData.reduce((sum, staff) => sum + staff.metrics.revenue, 0),
        totalAppointments: performanceData.reduce((sum, staff) => sum + staff.metrics.appointments, 0),
        averageUtilization: performanceData.length > 0 
          ? performanceData.reduce((sum, staff) => sum + staff.metrics.utilizationRate, 0) / performanceData.length 
          : 0,
      },
    };
  }

  // Additional helper methods
  
  private async getTopServices(companyId: string, startDate: Date, endDate: Date, branchId?: string) {
    const whereConditions: any = {
      companyId,
      date: { gte: startDate, lte: endDate },
      status: AppointmentStatus.COMPLETED,
    };
    if (branchId) whereConditions.branchId = branchId;

    // This is simplified - you might need to adjust based on how services are stored
    return [];
  }

  private async getStaffStats(companyId: string, startDate: Date, endDate: Date, branchId?: string) {
    // Similar to getTopServices but for staff performance
    return [];
  }

  private categorizeClients(clientMetrics: any[]) {
    const vipThreshold = 1000; // Revenue threshold for VIP
    const regularThreshold = 300; // Revenue threshold for regular

    return {
      vip: clientMetrics.filter(c => c.totalSpent >= vipThreshold).length,
      regular: clientMetrics.filter(c => c.totalSpent >= regularThreshold && c.totalSpent < vipThreshold).length,
      occasional: clientMetrics.filter(c => c.totalSpent < regularThreshold).length,
    };
  }

  private async calculateClientGrowth(companyId: string, startDate: Date, endDate: Date) {
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    const previousPeriodEnd = new Date(endDate);
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

    const [currentPeriod, previousPeriod] = await Promise.all([
      prisma.client.count({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.client.count({
        where: {
          companyId,
          createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
        },
      }),
    ]);

    const growthRate = previousPeriod > 0 ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 : 0;

    return {
      current: currentPeriod,
      previous: previousPeriod,
      growthRate,
      growth: currentPeriod - previousPeriod,
    };
  }
}

// Export singleton instance
export const dashboardController = new DashboardController();