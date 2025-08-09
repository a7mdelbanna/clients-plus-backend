import { Request, Response } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service';
import { dashboardService } from '../services/dashboard.service';
import { exportService } from '../services/export.service';
import { successResponse, errorResponse } from '../utils/response';
import { parseISO, isValid } from 'date-fns';

// Validation schemas
const analyticsQuerySchema = z.object({
  startDate: z.string().refine(date => isValid(parseISO(date)), 'Invalid start date format'),
  endDate: z.string().refine(date => isValid(parseISO(date)), 'Invalid end date format'),
  groupBy: z.enum(['day', 'week', 'month', 'year']).optional().default('day'),
  branchId: z.string().optional(),
  staffId: z.string().optional(),
  serviceId: z.string().optional()
});

const exportQuerySchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv']),
  template: z.string().optional(),
  includeCharts: z.boolean().optional().default(false),
  includeRawData: z.boolean().optional().default(true),
  fileName: z.string().optional(),
  orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
  paperSize: z.enum(['A4', 'Letter']).optional().default('A4')
});

export class AnalyticsController {

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { startDate, endDate, groupBy, branchId, staffId } = validation.data;
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.getRevenueAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        groupBy,
        branchId,
        staffId
      });

      res.json(successResponse(analytics, 'Revenue analytics retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get appointment analytics
   */
  async getAppointmentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { startDate, endDate, groupBy, branchId, staffId } = validation.data;
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.getAppointmentAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        groupBy,
        branchId,
        staffId
      });

      res.json(successResponse(analytics, 'Appointment analytics retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get client analytics
   */
  async getClientAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { startDate, endDate, groupBy, branchId } = validation.data;
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.getClientAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        groupBy,
        branchId
      });

      res.json(successResponse(analytics, 'Client analytics retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get staff performance analytics
   */
  async getStaffPerformance(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { startDate, endDate, branchId, staffId } = validation.data;
      const companyId = req.user!.companyId;

      const performance = await analyticsService.getStaffPerformance({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        branchId,
        staffId
      });

      res.json(successResponse(performance, 'Staff performance analytics retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get service analytics
   */
  async getServiceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { startDate, endDate, branchId } = validation.data;
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.getServiceAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        branchId
      });

      res.json(successResponse(analytics, 'Service analytics retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const metrics = await dashboardService.getDashboardMetrics(companyId);

      res.json(successResponse(metrics, 'Dashboard metrics retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get KPI metrics
   */
  async getKPIs(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const kpis = await dashboardService.getKPIs(companyId);

      res.json(successResponse(kpis, 'KPI metrics retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get dashboard alerts
   */
  async getDashboardAlerts(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const metrics = await dashboardService.getDashboardMetrics(companyId);

      res.json(successResponse(metrics.alerts, 'Dashboard alerts retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const config = await dashboardService.getDashboardConfig(companyId);

      res.json(successResponse(config, 'Dashboard configuration retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export revenue analytics
   */
  async exportRevenueAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const queryValidation = analyticsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', queryValidation.error.errors));
        return;
      }

      const exportValidation = exportQuerySchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const { startDate, endDate, groupBy, branchId, staffId } = queryValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      // Get analytics data
      const analytics = await analyticsService.getRevenueAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        groupBy,
        branchId,
        staffId
      });

      // Export data
      const result = await exportService.exportAnalyticsData(
        analytics,
        'revenue',
        'Company Name', // Would get from company record
        exportOptions
      );

      res.json(successResponse(result, 'Revenue analytics exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export appointment analytics
   */
  async exportAppointmentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const queryValidation = analyticsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', queryValidation.error.errors));
        return;
      }

      const exportValidation = exportQuerySchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const { startDate, endDate, groupBy, branchId, staffId } = queryValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.getAppointmentAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        groupBy,
        branchId,
        staffId
      });

      const result = await exportService.exportAnalyticsData(
        analytics,
        'appointments',
        'Company Name',
        exportOptions
      );

      res.json(successResponse(result, 'Appointment analytics exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export client analytics
   */
  async exportClientAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const queryValidation = analyticsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', queryValidation.error.errors));
        return;
      }

      const exportValidation = exportQuerySchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const { startDate, endDate, groupBy, branchId } = queryValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.getClientAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        groupBy,
        branchId
      });

      const result = await exportService.exportAnalyticsData(
        analytics,
        'clients',
        'Company Name',
        exportOptions
      );

      res.json(successResponse(result, 'Client analytics exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export staff performance
   */
  async exportStaffPerformance(req: Request, res: Response): Promise<void> {
    try {
      const queryValidation = analyticsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', queryValidation.error.errors));
        return;
      }

      const exportValidation = exportQuerySchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const { startDate, endDate, branchId, staffId } = queryValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      const performance = await analyticsService.getStaffPerformance({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        branchId,
        staffId
      });

      const result = await exportService.exportAnalyticsData(
        performance,
        'staff',
        'Company Name',
        exportOptions
      );

      res.json(successResponse(result, 'Staff performance exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Export service analytics
   */
  async exportServiceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const queryValidation = analyticsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', queryValidation.error.errors));
        return;
      }

      const exportValidation = exportQuerySchema.safeParse(req.body);
      if (!exportValidation.success) {
        res.status(400).json(errorResponse('Invalid export parameters', exportValidation.error.errors));
        return;
      }

      const { startDate, endDate, branchId } = queryValidation.data;
      const exportOptions = exportValidation.data;
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.getServiceAnalytics({
        companyId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        branchId
      });

      const result = await exportService.exportAnalyticsData(
        analytics,
        'services',
        'Company Name',
        exportOptions
      );

      res.json(successResponse(result, 'Service analytics exported successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { startDate, endDate, groupBy, branchId, staffId } = validation.data;
      const companyId = req.user!.companyId;

      // Get all analytics in parallel
      const [
        revenueAnalytics,
        appointmentAnalytics,
        clientAnalytics,
        staffPerformance,
        serviceAnalytics
      ] = await Promise.all([
        analyticsService.getRevenueAnalytics({
          companyId,
          startDate: parseISO(startDate),
          endDate: parseISO(endDate),
          groupBy,
          branchId,
          staffId
        }),
        analyticsService.getAppointmentAnalytics({
          companyId,
          startDate: parseISO(startDate),
          endDate: parseISO(endDate),
          groupBy,
          branchId,
          staffId
        }),
        analyticsService.getClientAnalytics({
          companyId,
          startDate: parseISO(startDate),
          endDate: parseISO(endDate),
          groupBy,
          branchId
        }),
        analyticsService.getStaffPerformance({
          companyId,
          startDate: parseISO(startDate),
          endDate: parseISO(endDate),
          branchId,
          staffId
        }),
        analyticsService.getServiceAnalytics({
          companyId,
          startDate: parseISO(startDate),
          endDate: parseISO(endDate),
          branchId
        })
      ]);

      const summary = {
        revenue: revenueAnalytics,
        appointments: appointmentAnalytics,
        clients: clientAnalytics,
        staff: staffPerformance,
        services: serviceAnalytics,
        metadata: {
          dateRange: `${startDate} - ${endDate}`,
          groupBy,
          filters: {
            branchId,
            staffId
          },
          generatedAt: new Date().toISOString()
        }
      };

      res.json(successResponse(summary, 'Analytics summary retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get analytics overview (simplified version for quick overview)
   */
  async getAnalyticsOverview(req: Request, res: Response): Promise<void> {
    try {
      const validation = z.object({
        period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
        branchId: z.string().optional()
      }).safeParse(req.query);

      if (!validation.success) {
        res.status(400).json(errorResponse('Invalid query parameters', validation.error.errors));
        return;
      }

      const { period, branchId } = validation.data;
      const companyId = req.user!.companyId;

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Get basic metrics
      const revenueAnalytics = await analyticsService.getRevenueAnalytics({
        companyId,
        startDate,
        endDate,
        groupBy: 'day',
        branchId
      });

      const appointmentAnalytics = await analyticsService.getAppointmentAnalytics({
        companyId,
        startDate,
        endDate,
        groupBy: 'day',
        branchId
      });

      const overview = {
        totalRevenue: revenueAnalytics.totalRevenue,
        revenueGrowth: revenueAnalytics.periodComparison.growthRate,
        totalAppointments: appointmentAnalytics.totalAppointments,
        completionRate: appointmentAnalytics.totalAppointments > 0 
          ? (appointmentAnalytics.completedAppointments / appointmentAnalytics.totalAppointments) * 100 
          : 0,
        averageAppointmentValue: appointmentAnalytics.totalAppointments > 0 
          ? revenueAnalytics.totalRevenue / appointmentAnalytics.totalAppointments 
          : 0,
        topServices: revenueAnalytics.revenueByService.slice(0, 5),
        revenueByPaymentMethod: revenueAnalytics.revenueByPaymentMethod,
        appointmentStatusBreakdown: appointmentAnalytics.statusBreakdown,
        peakHours: appointmentAnalytics.peakHours.slice(0, 5),
        period,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      };

      res.json(successResponse(overview, 'Analytics overview retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateCache(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      await dashboardService.invalidateDashboardCache(companyId);

      res.json(successResponse(null, 'Analytics cache invalidated successfully'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  }
}

export const analyticsController = new AnalyticsController();