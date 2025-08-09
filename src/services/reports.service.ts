import { PrismaClient, AppointmentStatus, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { startOfDay, endOfDay, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { analyticsService } from './analytics.service';
import { redisService } from './redis.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface CustomReportParams {
  companyId: string;
  reportType: 'revenue' | 'appointments' | 'clients' | 'staff' | 'services' | 'custom';
  startDate: Date;
  endDate: Date;
  branchId?: string;
  staffId?: string;
  serviceId?: string;
  groupBy?: 'day' | 'week' | 'month';
  metrics?: string[];
  filters?: Record<string, any>;
  format?: 'json' | 'pdf' | 'excel' | 'csv';
}

export interface DailyReport {
  date: Date;
  summary: {
    totalRevenue: number;
    appointmentsScheduled: number;
    appointmentsCompleted: number;
    appointmentsCancelled: number;
    newClients: number;
    totalPayments: number;
    outstandingInvoices: number;
  };
  appointments: {
    upcoming: Array<{
      id: string;
      clientName: string;
      serviceName: string;
      staffName: string;
      startTime: string;
      duration: number;
      status: string;
    }>;
    completed: Array<{
      id: string;
      clientName: string;
      serviceName: string;
      revenue: number;
      duration: number;
    }>;
  };
  staff: Array<{
    staffId: string;
    staffName: string;
    appointmentsToday: number;
    revenueToday: number;
    utilizationRate: number;
  }>;
  alerts: Array<{
    type: 'warning' | 'info' | 'error';
    message: string;
    action?: string;
  }>;
}

export interface MonthlyReport {
  month: number;
  year: number;
  summary: {
    totalRevenue: number;
    revenueGrowth: number;
    totalAppointments: number;
    appointmentGrowth: number;
    newClients: number;
    clientGrowth: number;
    averageAppointmentValue: number;
    topServices: Array<{ name: string; revenue: number; count: number }>;
    topStaff: Array<{ name: string; revenue: number; appointments: number }>;
  };
  profitLoss: {
    revenue: number;
    expenses: number; // Would need expense tracking
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  clientAnalysis: {
    totalClients: number;
    newClients: number;
    returningClients: number;
    clientRetentionRate: number;
    averageLifetimeValue: number;
    topClients: Array<{
      name: string;
      totalSpent: number;
      visits: number;
    }>;
  };
  staffInsights: {
    totalStaff: number;
    topPerformers: Array<{
      name: string;
      revenue: number;
      appointments: number;
      rating?: number;
    }>;
    utilizationRates: Array<{
      name: string;
      utilization: number;
    }>;
  };
  trends: {
    dailyRevenue: Array<{ date: Date; revenue: number }>;
    appointmentsByDay: Array<{ date: Date; count: number }>;
    busyHours: Array<{ hour: number; count: number }>;
  };
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  generatedAt: Date;
  parameters: CustomReportParams;
  data: any;
  charts?: Array<{
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any;
    options?: any;
  }>;
  summary: {
    totalRecords: number;
    dateRange: string;
    keyMetrics: Array<{
      label: string;
      value: number | string;
      format?: 'currency' | 'percentage' | 'number';
    }>;
  };
}

export class ReportsService {

  /**
   * Generate daily business report
   */
  async generateDailyReport(companyId: string, date: Date): Promise<DailyReport> {
    const cacheKey = `report:daily:${companyId}:${format(date, 'yyyy-MM-dd')}`;
    
    // Check cache first
    const cached = await redisService.get<DailyReport>(cacheKey);
    if (cached) {
      logger.debug(`Daily report cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      // Get day's appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          companyId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          staff: {
            select: {
              name: true
            }
          }
        }
      });

      // Get payments for the day
      const payments = await prisma.payment.findMany({
        where: {
          companyId,
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Get new clients
      const newClients = await prisma.client.count({
        where: {
          companyId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Get outstanding invoices
      const outstandingInvoices = await prisma.invoice.count({
        where: {
          companyId,
          status: {
            in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED]
          },
          dueDate: {
            lte: endDate
          }
        }
      });

      // Calculate summary
      const completedAppointments = appointments.filter(apt => 
        apt.status === AppointmentStatus.COMPLETED
      );
      const cancelledAppointments = appointments.filter(apt => 
        apt.status === AppointmentStatus.CANCELLED
      );

      const totalRevenue = completedAppointments.reduce((sum, apt) => 
        sum + Number(apt.totalPrice), 0
      );
      const totalPayments = payments.reduce((sum, payment) => 
        sum + Number(payment.amount), 0
      );

      const summary = {
        totalRevenue,
        appointmentsScheduled: appointments.length,
        appointmentsCompleted: completedAppointments.length,
        appointmentsCancelled: cancelledAppointments.length,
        newClients,
        totalPayments,
        outstandingInvoices
      };

      // Format appointments
      const upcomingAppointments = appointments
        .filter(apt => [
          AppointmentStatus.PENDING,
          AppointmentStatus.SCHEDULED,
          AppointmentStatus.CONFIRMED
        ].includes(apt.status))
        .map(apt => ({
          id: apt.id,
          clientName: `${apt.client.firstName} ${apt.client.lastName}`,
          serviceName: this.extractServiceNames(apt.services),
          staffName: apt.staff?.name || 'Unassigned',
          startTime: apt.startTime,
          duration: apt.totalDuration,
          status: apt.status
        }));

      const completedAppointmentsData = completedAppointments.map(apt => ({
        id: apt.id,
        clientName: `${apt.client.firstName} ${apt.client.lastName}`,
        serviceName: this.extractServiceNames(apt.services),
        revenue: Number(apt.totalPrice),
        duration: apt.totalDuration
      }));

      // Staff performance for the day
      const staffPerformance = await this.calculateDailyStaffPerformance(
        companyId, 
        startDate, 
        endDate
      );

      // Generate alerts
      const alerts = await this.generateDailyAlerts(
        companyId,
        date,
        summary,
        appointments
      );

      const report: DailyReport = {
        date,
        summary,
        appointments: {
          upcoming: upcomingAppointments,
          completed: completedAppointmentsData
        },
        staff: staffPerformance,
        alerts
      };

      // Cache for 6 hours
      await redisService.set(cacheKey, report, { ttl: 21600 });

      return report;
    } catch (error) {
      logger.error('Error generating daily report:', error);
      throw new Error('Failed to generate daily report');
    }
  }

  /**
   * Generate monthly business report
   */
  async generateMonthlyReport(companyId: string, month: number, year: number): Promise<MonthlyReport> {
    const cacheKey = `report:monthly:${companyId}:${year}-${month.toString().padStart(2, '0')}`;
    
    const cached = await redisService.get<MonthlyReport>(cacheKey);
    if (cached) {
      logger.debug(`Monthly report cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = endOfMonth(startDate);
      const previousMonthStart = subMonths(startDate, 1);
      const previousMonthEnd = endOfMonth(previousMonthStart);

      // Get current month analytics
      const currentAnalytics = await analyticsService.getRevenueAnalytics({
        companyId,
        startDate,
        endDate,
        groupBy: 'day'
      });

      const appointmentAnalytics = await analyticsService.getAppointmentAnalytics({
        companyId,
        startDate,
        endDate,
        groupBy: 'day'
      });

      const clientAnalytics = await analyticsService.getClientAnalytics({
        companyId,
        startDate,
        endDate,
        groupBy: 'day'
      });

      const staffPerformance = await analyticsService.getStaffPerformance({
        companyId,
        startDate,
        endDate
      });

      const serviceAnalytics = await analyticsService.getServiceAnalytics({
        companyId,
        startDate,
        endDate
      });

      // Get previous month data for comparison
      const previousRevenue = await analyticsService.getRevenueAnalytics({
        companyId,
        startDate: previousMonthStart,
        endDate: previousMonthEnd
      });

      const previousAppointments = await analyticsService.getAppointmentAnalytics({
        companyId,
        startDate: previousMonthStart,
        endDate: previousMonthEnd
      });

      const previousClients = await analyticsService.getClientAnalytics({
        companyId,
        startDate: previousMonthStart,
        endDate: previousMonthEnd
      });

      // Calculate growth rates
      const revenueGrowth = previousRevenue.totalRevenue > 0 
        ? ((currentAnalytics.totalRevenue - previousRevenue.totalRevenue) / previousRevenue.totalRevenue) * 100
        : 0;

      const appointmentGrowth = previousAppointments.totalAppointments > 0
        ? ((appointmentAnalytics.totalAppointments - previousAppointments.totalAppointments) / previousAppointments.totalAppointments) * 100
        : 0;

      const clientGrowth = previousClients.newClients > 0
        ? ((clientAnalytics.newClients - previousClients.newClients) / previousClients.newClients) * 100
        : 0;

      const averageAppointmentValue = appointmentAnalytics.totalAppointments > 0
        ? currentAnalytics.totalRevenue / appointmentAnalytics.totalAppointments
        : 0;

      // Summary
      const summary = {
        totalRevenue: currentAnalytics.totalRevenue,
        revenueGrowth,
        totalAppointments: appointmentAnalytics.totalAppointments,
        appointmentGrowth,
        newClients: clientAnalytics.newClients,
        clientGrowth,
        averageAppointmentValue,
        topServices: serviceAnalytics.servicePerformance
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(service => ({
            name: service.serviceName,
            revenue: service.revenue,
            count: service.bookingCount
          })),
        topStaff: staffPerformance.staffMetrics
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5)
          .map(staff => ({
            name: staff.staffName,
            revenue: staff.totalRevenue,
            appointments: staff.appointmentCount
          }))
      };

      // Profit & Loss (simplified - would need expense tracking)
      const profitLoss = {
        revenue: currentAnalytics.totalRevenue,
        expenses: 0, // Would need expense tracking integration
        grossProfit: currentAnalytics.totalRevenue,
        netProfit: currentAnalytics.totalRevenue,
        profitMargin: 100 // Would calculate properly with expenses
      };

      // Client analysis
      const clientAnalysisData = {
        totalClients: clientAnalytics.totalClients,
        newClients: clientAnalytics.newClients,
        returningClients: clientAnalytics.returningClients,
        clientRetentionRate: clientAnalytics.clientRetentionRate,
        averageLifetimeValue: clientAnalytics.averageLifetimeValue,
        topClients: clientAnalytics.topClients.slice(0, 10).map(client => ({
          name: client.clientName,
          totalSpent: client.totalSpent,
          visits: client.appointmentCount
        }))
      };

      // Staff insights
      const staffInsights = {
        totalStaff: staffPerformance.totalStaff,
        topPerformers: staffPerformance.topPerformers
          .filter(p => p.metric === 'Total Revenue')
          .slice(0, 5)
          .map(performer => ({
            name: performer.staffName,
            revenue: performer.value,
            appointments: staffPerformance.staffMetrics
              .find(s => s.staffId === performer.staffId)?.appointmentCount || 0
          })),
        utilizationRates: staffPerformance.staffUtilization.map(staff => ({
          name: staff.staffName,
          utilization: staff.utilizationPercentage
        }))
      };

      // Trends data
      const trends = {
        dailyRevenue: currentAnalytics.revenueByPeriod.map(period => ({
          date: period.date,
          revenue: period.revenue
        })),
        appointmentsByDay: appointmentAnalytics.appointmentsByPeriod.map(period => ({
          date: period.date,
          count: period.total
        })),
        busyHours: appointmentAnalytics.peakHours.slice(0, 10)
      };

      const report: MonthlyReport = {
        month,
        year,
        summary,
        profitLoss,
        clientAnalysis: clientAnalysisData,
        staffInsights,
        trends
      };

      // Cache for 24 hours
      await redisService.set(cacheKey, report, { ttl: 86400 });

      return report;
    } catch (error) {
      logger.error('Error generating monthly report:', error);
      throw new Error('Failed to generate monthly report');
    }
  }

  /**
   * Generate custom report based on parameters
   */
  async generateCustomReport(params: CustomReportParams): Promise<CustomReport> {
    const reportId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cacheKey = `report:custom:${JSON.stringify(params)}`;
    
    const cached = await redisService.get<CustomReport>(cacheKey);
    if (cached) {
      logger.debug(`Custom report cache hit: ${cacheKey}`);
      return { ...cached, id: reportId, generatedAt: new Date() };
    }

    try {
      const { companyId, reportType, startDate, endDate, metrics = [], filters = {} } = params;

      let data: any = {};
      let charts: any[] = [];
      let keyMetrics: any[] = [];

      // Generate data based on report type
      switch (reportType) {
        case 'revenue':
          data = await analyticsService.getRevenueAnalytics({
            companyId,
            startDate,
            endDate,
            groupBy: params.groupBy,
            branchId: params.branchId
          });
          
          charts = [
            {
              type: 'line',
              title: 'Revenue Trend',
              data: data.revenueByPeriod.map((p: any) => ({
                x: p.period,
                y: p.revenue
              }))
            },
            {
              type: 'pie',
              title: 'Revenue by Service',
              data: data.revenueByService.slice(0, 10).map((s: any) => ({
                label: s.serviceName,
                value: s.revenue
              }))
            }
          ];

          keyMetrics = [
            { label: 'Total Revenue', value: data.totalRevenue, format: 'currency' },
            { label: 'Growth Rate', value: data.periodComparison.growthPercentage, format: 'percentage' },
            { label: 'Paid Revenue', value: data.paidRevenue, format: 'currency' },
            { label: 'Outstanding', value: data.unpaidRevenue, format: 'currency' }
          ];
          break;

        case 'appointments':
          data = await analyticsService.getAppointmentAnalytics({
            companyId,
            startDate,
            endDate,
            groupBy: params.groupBy,
            branchId: params.branchId,
            staffId: params.staffId
          });

          charts = [
            {
              type: 'bar',
              title: 'Appointment Status Breakdown',
              data: data.statusBreakdown.map((s: any) => ({
                label: s.status,
                value: s.count
              }))
            },
            {
              type: 'line',
              title: 'Appointments Over Time',
              data: data.appointmentsByPeriod.map((p: any) => ({
                x: p.period,
                y: p.total
              }))
            }
          ];

          keyMetrics = [
            { label: 'Total Appointments', value: data.totalAppointments, format: 'number' },
            { label: 'Completion Rate', value: `${((data.completedAppointments / data.totalAppointments) * 100).toFixed(1)}%`, format: 'percentage' },
            { label: 'Average Duration', value: `${data.averageDuration} min`, format: 'number' },
            { label: 'Utilization Rate', value: `${data.utilizationRate.toFixed(1)}%`, format: 'percentage' }
          ];
          break;

        case 'clients':
          data = await analyticsService.getClientAnalytics({
            companyId,
            startDate,
            endDate,
            groupBy: params.groupBy,
            branchId: params.branchId
          });

          charts = [
            {
              type: 'area',
              title: 'Client Acquisition',
              data: data.clientsByPeriod.map((p: any) => ({
                x: p.period,
                y: p.newClients
              }))
            },
            {
              type: 'bar',
              title: 'Top Clients by Spend',
              data: data.topClients.slice(0, 10).map((c: any) => ({
                label: c.clientName,
                value: c.totalSpent
              }))
            }
          ];

          keyMetrics = [
            { label: 'Total Clients', value: data.totalClients, format: 'number' },
            { label: 'New Clients', value: data.newClients, format: 'number' },
            { label: 'Retention Rate', value: `${data.clientRetentionRate.toFixed(1)}%`, format: 'percentage' },
            { label: 'Avg Lifetime Value', value: data.averageLifetimeValue, format: 'currency' }
          ];
          break;

        case 'staff':
          data = await analyticsService.getStaffPerformance({
            companyId,
            startDate,
            endDate,
            branchId: params.branchId,
            staffId: params.staffId
          });

          charts = [
            {
              type: 'bar',
              title: 'Staff Revenue Performance',
              data: data.staffMetrics.slice(0, 10).map((s: any) => ({
                label: s.staffName,
                value: s.totalRevenue
              }))
            },
            {
              type: 'bar',
              title: 'Staff Utilization Rates',
              data: data.staffUtilization.slice(0, 10).map((s: any) => ({
                label: s.staffName,
                value: s.utilizationPercentage
              }))
            }
          ];

          keyMetrics = [
            { label: 'Total Staff', value: data.totalStaff, format: 'number' },
            { label: 'Active Staff', value: data.activeStaff, format: 'number' },
            { label: 'Avg Revenue per Staff', value: data.staffMetrics.length > 0 ? data.staffMetrics.reduce((sum: number, s: any) => sum + s.totalRevenue, 0) / data.staffMetrics.length : 0, format: 'currency' }
          ];
          break;

        case 'services':
          data = await analyticsService.getServiceAnalytics({
            companyId,
            startDate,
            endDate,
            branchId: params.branchId
          });

          charts = [
            {
              type: 'pie',
              title: 'Service Revenue Distribution',
              data: data.servicePerformance.slice(0, 10).map((s: any) => ({
                label: s.serviceName,
                value: s.revenue
              }))
            },
            {
              type: 'bar',
              title: 'Service Booking Count',
              data: data.servicePerformance.slice(0, 10).map((s: any) => ({
                label: s.serviceName,
                value: s.bookingCount
              }))
            }
          ];

          keyMetrics = [
            { label: 'Total Services', value: data.totalServices, format: 'number' },
            { label: 'Active Services', value: data.activeServices, format: 'number' },
            { label: 'Most Popular', value: data.servicePerformance[0]?.serviceName || 'N/A' }
          ];
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      const report: CustomReport = {
        id: reportId,
        name: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        description: `Custom ${reportType} report generated for ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`,
        generatedAt: new Date(),
        parameters: params,
        data,
        charts,
        summary: {
          totalRecords: this.calculateTotalRecords(data, reportType),
          dateRange: `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`,
          keyMetrics
        }
      };

      // Cache for 1 hour
      await redisService.set(cacheKey, report, { ttl: 3600 });

      return report;
    } catch (error) {
      logger.error('Error generating custom report:', error);
      throw new Error('Failed to generate custom report');
    }
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(companyId: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    parameters: any;
  }>> {
    return [
      {
        id: 'daily-summary',
        name: 'Daily Summary',
        description: 'Complete overview of daily business activities',
        type: 'daily',
        parameters: { requiresDate: true }
      },
      {
        id: 'monthly-performance',
        name: 'Monthly Performance',
        description: 'Comprehensive monthly business analysis',
        type: 'monthly',
        parameters: { requiresMonth: true, requiresYear: true }
      },
      {
        id: 'revenue-analysis',
        name: 'Revenue Analysis',
        description: 'Detailed revenue breakdown and trends',
        type: 'custom',
        parameters: { reportType: 'revenue', supportsDateRange: true }
      },
      {
        id: 'staff-performance',
        name: 'Staff Performance',
        description: 'Individual and team performance metrics',
        type: 'custom',
        parameters: { reportType: 'staff', supportsStaffFilter: true }
      },
      {
        id: 'client-insights',
        name: 'Client Insights',
        description: 'Client behavior and lifetime value analysis',
        type: 'custom',
        parameters: { reportType: 'clients', supportsDateRange: true }
      },
      {
        id: 'service-analytics',
        name: 'Service Analytics',
        description: 'Service popularity and performance metrics',
        type: 'custom',
        parameters: { reportType: 'services', supportsBranchFilter: true }
      }
    ];
  }

  // Private helper methods

  private extractServiceNames(services: any): string {
    if (!services || typeof services !== 'object') return 'Unknown Service';
    
    if (Array.isArray(services)) {
      return services.map((s: any) => s.serviceName || s.name).join(', ');
    }
    
    return services.serviceName || services.name || 'Unknown Service';
  }

  private async calculateDailyStaffPerformance(
    companyId: string,
    startDate: Date,
    endDate: Date
  ) {
    const staff = await prisma.staff.findMany({
      where: {
        companyId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        appointments: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          select: {
            id: true,
            status: true,
            totalPrice: true,
            totalDuration: true
          }
        }
      }
    });

    return staff.map(staffMember => {
      const appointments = staffMember.appointments;
      const completedAppointments = appointments.filter(apt => 
        apt.status === AppointmentStatus.COMPLETED
      );
      
      const revenueToday = completedAppointments.reduce((sum, apt) => 
        sum + Number(apt.totalPrice), 0
      );

      const totalMinutes = appointments.reduce((sum, apt) => 
        sum + (apt.totalDuration || 0), 0
      );

      // Simplified utilization calculation (would need actual work schedule)
      const utilizationRate = totalMinutes > 0 ? Math.min((totalMinutes / 480) * 100, 100) : 0;

      return {
        staffId: staffMember.id,
        staffName: staffMember.name,
        appointmentsToday: appointments.length,
        revenueToday,
        utilizationRate
      };
    });
  }

  private async generateDailyAlerts(
    companyId: string,
    date: Date,
    summary: any,
    appointments: any[]
  ) {
    const alerts: Array<{ type: 'warning' | 'info' | 'error'; message: string; action?: string }> = [];

    // No-show rate alert
    const noShowCount = appointments.filter(apt => apt.status === AppointmentStatus.NO_SHOW).length;
    if (noShowCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${noShowCount} no-show appointments today`,
        action: 'Review no-show policies'
      });
    }

    // High cancellation rate
    const cancellationRate = summary.appointmentsScheduled > 0 ? 
      (summary.appointmentsCancelled / summary.appointmentsScheduled) * 100 : 0;
    if (cancellationRate > 20) {
      alerts.push({
        type: 'warning',
        message: `High cancellation rate: ${cancellationRate.toFixed(1)}%`,
        action: 'Review cancellation policies'
      });
    }

    // Outstanding invoices
    if (summary.outstandingInvoices > 0) {
      alerts.push({
        type: 'info',
        message: `${summary.outstandingInvoices} overdue invoices`,
        action: 'Follow up on payments'
      });
    }

    // Low revenue day
    const yesterday = subDays(date, 1);
    try {
      const yesterdayReport = await this.generateDailyReport(companyId, yesterday);
      if (summary.totalRevenue < yesterdayReport.summary.totalRevenue * 0.7) {
        alerts.push({
          type: 'warning',
          message: 'Revenue significantly lower than yesterday',
          action: 'Analyze booking patterns'
        });
      }
    } catch (error) {
      // Ignore if yesterday's report can't be generated
    }

    return alerts;
  }

  private calculateTotalRecords(data: any, reportType: string): number {
    switch (reportType) {
      case 'revenue':
        return data.revenueByService?.length || 0;
      case 'appointments':
        return data.totalAppointments || 0;
      case 'clients':
        return data.totalClients || 0;
      case 'staff':
        return data.totalStaff || 0;
      case 'services':
        return data.totalServices || 0;
      default:
        return 0;
    }
  }
}

// Export singleton instance
export const reportsService = new ReportsService();