import { PrismaClient, AppointmentStatus, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, format, subDays, subWeeks, subMonths } from 'date-fns';
import { redisService } from './redis.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface DashboardMetrics {
  overview: {
    todayRevenue: number;
    todayRevenueChange: number;
    todayAppointments: number;
    todayAppointmentsChange: number;
    thisWeekRevenue: number;
    thisWeekRevenueChange: number;
    thisMonthRevenue: number;
    thisMonthRevenueChange: number;
    totalClients: number;
    newClientsToday: number;
    activeStaff: number;
    utilizationRate: number;
  };
  realTime: {
    currentAppointments: Array<{
      id: string;
      clientName: string;
      serviceName: string;
      staffName: string;
      startTime: string;
      endTime: string;
      status: string;
      duration: number;
    }>;
    upcomingAppointments: Array<{
      id: string;
      clientName: string;
      serviceName: string;
      staffName: string;
      startTime: string;
      timeUntil: string;
      isUrgent: boolean;
    }>;
    staffAvailability: Array<{
      staffId: string;
      staffName: string;
      status: 'available' | 'busy' | 'break' | 'offline';
      currentAppointment?: {
        clientName: string;
        endTime: string;
      };
      nextAvailable: string;
    }>;
    queueStatus: {
      waitingClients: number;
      averageWaitTime: number;
      longestWaitTime: number;
    };
  };
  alerts: Array<{
    id: string;
    type: 'urgent' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    timestamp: Date;
    actionUrl?: string;
    count?: number;
  }>;
  quickStats: {
    appointmentsToday: {
      completed: number;
      pending: number;
      cancelled: number;
      noShow: number;
    };
    revenueBreakdown: {
      cash: number;
      card: number;
      pending: number;
    };
    topServices: Array<{
      name: string;
      bookings: number;
      revenue: number;
    }>;
    topStaff: Array<{
      name: string;
      appointments: number;
      revenue: number;
    }>;
  };
}

export interface KPIMetrics {
  businessKPIs: {
    monthlyRecurringRevenue: number;
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    churnRate: number;
    averageAppointmentValue: number;
    bookingConversionRate: number;
    clientRetentionRate: number;
    noShowRate: number;
  };
  operationalKPIs: {
    staffUtilizationRate: number;
    appointmentFillRate: number;
    averageServiceTime: number;
    rescheduleRate: number;
    cancellationRate: number;
    onTimePerformance: number;
    resourceUtilization: number;
    capacityUtilization: number;
  };
  financialKPIs: {
    grossRevenue: number;
    netRevenue: number;
    profitMargin: number;
    revenueGrowthRate: number;
    paymentCollectionRate: number;
    outstandingReceivables: number;
    averagePaymentTime: number;
    refundRate: number;
  };
  clientKPIs: {
    newClientAcquisitionRate: number;
    clientSatisfactionScore: number;
    repeatClientRate: number;
    clientRecommendationRate: number;
    averageClientVisitFrequency: number;
    clientSegmentDistribution: Array<{
      segment: string;
      count: number;
      revenue: number;
      percentage: number;
    }>;
  };
  trends: {
    revenueGrowthTrend: Array<{
      period: string;
      value: number;
      change: number;
    }>;
    clientGrowthTrend: Array<{
      period: string;
      value: number;
      change: number;
    }>;
    appointmentTrend: Array<{
      period: string;
      value: number;
      change: number;
    }>;
  };
  goals: Array<{
    id: string;
    name: string;
    current: number;
    target: number;
    unit: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    progress: number;
    onTrack: boolean;
  }>;
}

export interface AlertConfig {
  lowRevenue: { threshold: number; period: 'daily' | 'weekly' };
  highCancellationRate: { threshold: number };
  noShowRate: { threshold: number };
  lowUtilization: { threshold: number };
  overdueInvoices: { enabled: boolean };
  inventory: { lowStockThreshold: number };
  staffAvailability: { enabled: boolean };
}

export class DashboardService {

  /**
   * Get real-time dashboard metrics
   */
  async getDashboardMetrics(companyId: string): Promise<DashboardMetrics> {
    const cacheKey = `dashboard:metrics:${companyId}`;
    
    // For real-time data, use shorter cache
    const cached = await redisService.get<DashboardMetrics>(cacheKey);
    if (cached) {
      logger.debug(`Dashboard metrics cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const now = new Date();
      const today = startOfDay(now);
      const todayEnd = endOfDay(now);
      const yesterday = startOfDay(subDays(now, 1));
      const yesterdayEnd = endOfDay(subDays(now, 1));
      
      const thisWeekStart = startOfWeek(now);
      const thisWeekEnd = endOfWeek(now);
      const lastWeekStart = startOfWeek(subWeeks(now, 1));
      const lastWeekEnd = endOfWeek(subWeeks(now, 1));
      
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Get today's metrics
      const [
        todayRevenue,
        yesterdayRevenue,
        todayAppointments,
        yesterdayAppointments,
        thisWeekRevenue,
        lastWeekRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        totalClients,
        newClientsToday,
        activeStaff
      ] = await Promise.all([
        this.calculateRevenue(companyId, today, todayEnd),
        this.calculateRevenue(companyId, yesterday, yesterdayEnd),
        this.countAppointments(companyId, today, todayEnd),
        this.countAppointments(companyId, yesterday, yesterdayEnd),
        this.calculateRevenue(companyId, thisWeekStart, thisWeekEnd),
        this.calculateRevenue(companyId, lastWeekStart, lastWeekEnd),
        this.calculateRevenue(companyId, thisMonthStart, thisMonthEnd),
        this.calculateRevenue(companyId, lastMonthStart, lastMonthEnd),
        this.countTotalClients(companyId),
        this.countNewClients(companyId, today, todayEnd),
        this.countActiveStaff(companyId)
      ]);

      // Calculate percentage changes
      const todayRevenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
        : 0;
      const todayAppointmentsChange = yesterdayAppointments > 0 
        ? ((todayAppointments - yesterdayAppointments) / yesterdayAppointments) * 100 
        : 0;
      const thisWeekRevenueChange = lastWeekRevenue > 0 
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
        : 0;
      const thisMonthRevenueChange = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const overview = {
        todayRevenue,
        todayRevenueChange,
        todayAppointments,
        todayAppointmentsChange,
        thisWeekRevenue,
        thisWeekRevenueChange,
        thisMonthRevenue,
        thisMonthRevenueChange,
        totalClients,
        newClientsToday,
        activeStaff,
        utilizationRate: await this.calculateUtilizationRate(companyId, today, todayEnd)
      };

      // Get real-time data
      const realTime = await this.getRealTimeData(companyId);

      // Get alerts
      const alerts = await this.generateAlerts(companyId);

      // Get quick stats
      const quickStats = await this.getQuickStats(companyId, today, todayEnd);

      const metrics: DashboardMetrics = {
        overview,
        realTime,
        alerts,
        quickStats
      };

      // Cache for 2 minutes (real-time data should be fresh)
      await redisService.set(cacheKey, metrics, { ttl: 120 });

      return metrics;
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw new Error('Failed to get dashboard metrics');
    }
  }

  /**
   * Get comprehensive KPI metrics
   */
  async getKPIs(companyId: string): Promise<KPIMetrics> {
    const cacheKey = `dashboard:kpis:${companyId}`;
    
    const cached = await redisService.get<KPIMetrics>(cacheKey);
    if (cached) {
      logger.debug(`KPI metrics cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const last3MonthsStart = subMonths(thisMonthStart, 3);

      // Business KPIs
      const businessKPIs = {
        monthlyRecurringRevenue: await this.calculateMRR(companyId, thisMonthStart, thisMonthEnd),
        customerAcquisitionCost: await this.calculateCAC(companyId, thisMonthStart, thisMonthEnd),
        customerLifetimeValue: await this.calculateCLV(companyId),
        churnRate: await this.calculateChurnRate(companyId, thisMonthStart, thisMonthEnd),
        averageAppointmentValue: await this.calculateAverageAppointmentValue(companyId, thisMonthStart, thisMonthEnd),
        bookingConversionRate: await this.calculateBookingConversionRate(companyId, thisMonthStart, thisMonthEnd),
        clientRetentionRate: await this.calculateClientRetentionRate(companyId, thisMonthStart, thisMonthEnd),
        noShowRate: await this.calculateNoShowRate(companyId, thisMonthStart, thisMonthEnd)
      };

      // Operational KPIs
      const operationalKPIs = {
        staffUtilizationRate: await this.calculateStaffUtilizationRate(companyId, thisMonthStart, thisMonthEnd),
        appointmentFillRate: await this.calculateAppointmentFillRate(companyId, thisMonthStart, thisMonthEnd),
        averageServiceTime: await this.calculateAverageServiceTime(companyId, thisMonthStart, thisMonthEnd),
        rescheduleRate: await this.calculateRescheduleRate(companyId, thisMonthStart, thisMonthEnd),
        cancellationRate: await this.calculateCancellationRate(companyId, thisMonthStart, thisMonthEnd),
        onTimePerformance: await this.calculateOnTimePerformance(companyId, thisMonthStart, thisMonthEnd),
        resourceUtilization: 75, // Placeholder - would need resource tracking
        capacityUtilization: 80  // Placeholder - would need capacity planning
      };

      // Financial KPIs
      const grossRevenue = await this.calculateRevenue(companyId, thisMonthStart, thisMonthEnd);
      const financialKPIs = {
        grossRevenue,
        netRevenue: grossRevenue, // Would subtract expenses if tracked
        profitMargin: 100, // Would calculate with expenses
        revenueGrowthRate: await this.calculateRevenueGrowthRate(companyId, thisMonthStart, thisMonthEnd),
        paymentCollectionRate: await this.calculatePaymentCollectionRate(companyId, thisMonthStart, thisMonthEnd),
        outstandingReceivables: await this.calculateOutstandingReceivables(companyId),
        averagePaymentTime: await this.calculateAveragePaymentTime(companyId, thisMonthStart, thisMonthEnd),
        refundRate: 0 // Placeholder - would need refund tracking
      };

      // Client KPIs
      const clientKPIs = {
        newClientAcquisitionRate: await this.calculateNewClientAcquisitionRate(companyId, thisMonthStart, thisMonthEnd),
        clientSatisfactionScore: 4.5, // Placeholder - would need satisfaction surveys
        repeatClientRate: await this.calculateRepeatClientRate(companyId, thisMonthStart, thisMonthEnd),
        clientRecommendationRate: 0, // Placeholder - would need referral tracking
        averageClientVisitFrequency: await this.calculateAverageVisitFrequency(companyId, last3MonthsStart, thisMonthEnd),
        clientSegmentDistribution: await this.calculateClientSegmentDistribution(companyId)
      };

      // Trends
      const trends = await this.calculateTrends(companyId, last3MonthsStart, thisMonthEnd);

      // Goals (example goals - would be configurable)
      const goals = await this.getCompanyGoals(companyId, businessKPIs, operationalKPIs, financialKPIs);

      const kpis: KPIMetrics = {
        businessKPIs,
        operationalKPIs,
        financialKPIs,
        clientKPIs,
        trends,
        goals
      };

      // Cache for 1 hour
      await redisService.set(cacheKey, kpis, { ttl: 3600 });

      return kpis;
    } catch (error) {
      logger.error('Error getting KPI metrics:', error);
      throw new Error('Failed to get KPI metrics');
    }
  }

  /**
   * Update dashboard cache
   */
  async invalidateDashboardCache(companyId: string): Promise<void> {
    const patterns = [
      `dashboard:metrics:${companyId}`,
      `dashboard:kpis:${companyId}`,
      `dashboard:realtime:${companyId}*`
    ];

    for (const pattern of patterns) {
      await redisService.invalidatePattern(pattern);
    }

    logger.info(`Dashboard cache invalidated for company: ${companyId}`);
  }

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig(companyId: string): Promise<{
    alertConfig: AlertConfig;
    refreshInterval: number;
    timezone: string;
    currency: string;
  }> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        timezone: true,
        currency: true,
        settings: true
      }
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Default alert configuration
    const defaultAlertConfig: AlertConfig = {
      lowRevenue: { threshold: 0.8, period: 'daily' },
      highCancellationRate: { threshold: 20 },
      noShowRate: { threshold: 15 },
      lowUtilization: { threshold: 60 },
      overdueInvoices: { enabled: true },
      inventory: { lowStockThreshold: 10 },
      staffAvailability: { enabled: true }
    };

    return {
      alertConfig: defaultAlertConfig,
      refreshInterval: 120, // 2 minutes
      timezone: company.timezone,
      currency: company.currency
    };
  }

  // Private helper methods

  private async calculateRevenue(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.appointment.aggregate({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: AppointmentStatus.COMPLETED
      },
      _sum: { totalPrice: true }
    });
    return Number(result._sum.totalPrice || 0);
  }

  private async countAppointments(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    return prisma.appointment.count({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate }
      }
    });
  }

  private async countTotalClients(companyId: string): Promise<number> {
    return prisma.client.count({
      where: { companyId, isActive: true }
    });
  }

  private async countNewClients(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    return prisma.client.count({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate }
      }
    });
  }

  private async countActiveStaff(companyId: string): Promise<number> {
    return prisma.staff.count({
      where: { companyId, isActive: true }
    });
  }

  private async calculateUtilizationRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Simplified calculation - would need proper schedule tracking
    const totalAppointments = await this.countAppointments(companyId, startDate, endDate);
    const activeStaff = await this.countActiveStaff(companyId);
    
    if (activeStaff === 0) return 0;
    
    // Assuming 8 hour work day, 30 min slots = 16 slots per staff per day
    const maxPossibleAppointments = activeStaff * 16;
    return Math.min((totalAppointments / maxPossibleAppointments) * 100, 100);
  }

  private async getRealTimeData(companyId: string) {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

    // Current appointments (happening now)
    const currentAppointments = await prisma.appointment.findMany({
      where: {
        companyId,
        date: { gte: today, lte: todayEnd },
        status: { in: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.ARRIVED] }
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        staff: { select: { name: true } }
      },
      take: 10
    });

    // Upcoming appointments (next 4 hours)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        companyId,
        date: { gte: today, lte: todayEnd },
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        startTime: { gte: currentTime }
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        staff: { select: { name: true } }
      },
      orderBy: { startTime: 'asc' },
      take: 10
    });

    // Staff availability
    const allStaff = await prisma.staff.findMany({
      where: { companyId, isActive: true },
      include: {
        appointments: {
          where: {
            date: { gte: today, lte: todayEnd },
            status: { in: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.ARRIVED] }
          },
          include: {
            client: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    const staffAvailability = allStaff.map(staff => {
      const currentAppointment = staff.appointments.find(apt => 
        apt.startTime <= currentTime && apt.endTime >= currentTime
      );

      let status: 'available' | 'busy' | 'break' | 'offline' = 'available';
      
      if (currentAppointment) {
        status = 'busy';
      }
      // Would add break and offline logic based on schedule

      return {
        staffId: staff.id,
        staffName: staff.name,
        status,
        currentAppointment: currentAppointment ? {
          clientName: `${currentAppointment.client.firstName} ${currentAppointment.client.lastName}`,
          endTime: currentAppointment.endTime
        } : undefined,
        nextAvailable: this.calculateNextAvailable(staff.appointments, currentTime)
      };
    });

    return {
      currentAppointments: currentAppointments.map(apt => ({
        id: apt.id,
        clientName: `${apt.client.firstName} ${apt.client.lastName}`,
        serviceName: this.extractServiceNames(apt.services),
        staffName: apt.staff?.name || 'Unassigned',
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        duration: apt.totalDuration
      })),
      upcomingAppointments: upcomingAppointments.map(apt => ({
        id: apt.id,
        clientName: `${apt.client.firstName} ${apt.client.lastName}`,
        serviceName: this.extractServiceNames(apt.services),
        staffName: apt.staff?.name || 'Unassigned',
        startTime: apt.startTime,
        timeUntil: this.calculateTimeUntil(apt.startTime),
        isUrgent: this.isAppointmentUrgent(apt.startTime, currentTime)
      })),
      staffAvailability,
      queueStatus: {
        waitingClients: 0, // Would need queue tracking
        averageWaitTime: 0,
        longestWaitTime: 0
      }
    };
  }

  private async generateAlerts(companyId: string) {
    const alerts: Array<{
      id: string;
      type: 'urgent' | 'warning' | 'info' | 'success';
      title: string;
      message: string;
      timestamp: Date;
      actionUrl?: string;
      count?: number;
    }> = [];

    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Overdue invoices
    const overdueInvoices = await prisma.invoice.count({
      where: {
        companyId,
        dueDate: { lt: today },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED] }
      }
    });

    if (overdueInvoices > 0) {
      alerts.push({
        id: 'overdue-invoices',
        type: 'urgent',
        title: 'Overdue Invoices',
        message: `${overdueInvoices} invoices are overdue`,
        timestamp: now,
        actionUrl: '/invoices?filter=overdue',
        count: overdueInvoices
      });
    }

    // No-shows today
    const noShows = await prisma.appointment.count({
      where: {
        companyId,
        date: { gte: today, lte: todayEnd },
        status: AppointmentStatus.NO_SHOW
      }
    });

    if (noShows > 0) {
      alerts.push({
        id: 'no-shows-today',
        type: 'warning',
        title: 'No-Shows Today',
        message: `${noShows} clients didn't show up for appointments`,
        timestamp: now,
        count: noShows
      });
    }

    // Low stock alerts (if inventory is tracked)
    // This would require inventory integration

    // Upcoming appointments without staff assignment
    const unassignedAppointments = await prisma.appointment.count({
      where: {
        companyId,
        date: { gte: today, lte: addDays(today, 1) },
        staffId: null,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] }
      }
    });

    if (unassignedAppointments > 0) {
      alerts.push({
        id: 'unassigned-appointments',
        type: 'warning',
        title: 'Unassigned Appointments',
        message: `${unassignedAppointments} appointments need staff assignment`,
        timestamp: now,
        actionUrl: '/appointments?filter=unassigned',
        count: unassignedAppointments
      });
    }

    return alerts;
  }

  private async getQuickStats(companyId: string, startDate: Date, endDate: Date) {
    // Appointments breakdown
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        companyId,
        date: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    });

    const appointmentsToday = {
      completed: appointmentsByStatus.find(s => s.status === AppointmentStatus.COMPLETED)?._count.id || 0,
      pending: appointmentsByStatus.find(s => s.status === AppointmentStatus.PENDING)?._count.id || 0,
      cancelled: appointmentsByStatus.find(s => s.status === AppointmentStatus.CANCELLED)?._count.id || 0,
      noShow: appointmentsByStatus.find(s => s.status === AppointmentStatus.NO_SHOW)?._count.id || 0
    };

    // Revenue breakdown by payment method
    const payments = await prisma.payment.findMany({
      where: {
        companyId,
        paymentDate: { gte: startDate, lte: endDate },
        status: PaymentStatus.COMPLETED
      },
      select: { amount: true, paymentMethod: true }
    });

    const revenueBreakdown = {
      cash: payments.filter(p => p.paymentMethod === 'CASH').reduce((sum, p) => sum + Number(p.amount), 0),
      card: payments.filter(p => ['CREDIT_CARD', 'DEBIT_CARD'].includes(p.paymentMethod)).reduce((sum, p) => sum + Number(p.amount), 0),
      pending: 0 // Would calculate from unpaid invoices
    };

    // Top services and staff would require more complex queries
    // For now, returning placeholder data
    const topServices = [
      { name: 'Hair Cut', bookings: 15, revenue: 750 },
      { name: 'Hair Color', bookings: 8, revenue: 800 },
      { name: 'Manicure', bookings: 12, revenue: 360 }
    ];

    const topStaff = [
      { name: 'Sarah Johnson', appointments: 8, revenue: 640 },
      { name: 'Mike Smith', appointments: 6, revenue: 480 },
      { name: 'Lisa Brown', appointments: 5, revenue: 400 }
    ];

    return {
      appointmentsToday,
      revenueBreakdown,
      topServices,
      topStaff
    };
  }

  // KPI calculation methods

  private async calculateMRR(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Simplified MRR calculation
    const monthlyRevenue = await this.calculateRevenue(companyId, startDate, endDate);
    return monthlyRevenue;
  }

  private async calculateCAC(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would need marketing spend data
    return 0; // Placeholder
  }

  private async calculateCLV(companyId: string): Promise<number> {
    // Simplified CLV calculation
    const avgAppointmentValue = 75; // Would calculate from data
    const avgVisitsPerYear = 12; // Would calculate from data
    const avgClientLifespan = 3; // Years
    
    return avgAppointmentValue * avgVisitsPerYear * avgClientLifespan;
  }

  private async calculateChurnRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Simplified churn calculation
    return 5; // Placeholder percentage
  }

  private async calculateAverageAppointmentValue(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.appointment.aggregate({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: AppointmentStatus.COMPLETED
      },
      _avg: { totalPrice: true }
    });
    
    return Number(result._avg.totalPrice || 0);
  }

  private async calculateBookingConversionRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would need inquiry/lead tracking
    return 85; // Placeholder percentage
  }

  private async calculateClientRetentionRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would need more sophisticated calculation
    return 75; // Placeholder percentage
  }

  private async calculateNoShowRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const totalAppointments = await this.countAppointments(companyId, startDate, endDate);
    const noShows = await prisma.appointment.count({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: AppointmentStatus.NO_SHOW
      }
    });

    return totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;
  }

  private async calculateStaffUtilizationRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    return this.calculateUtilizationRate(companyId, startDate, endDate);
  }

  private async calculateAppointmentFillRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would need capacity/schedule data
    return 80; // Placeholder
  }

  private async calculateAverageServiceTime(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.appointment.aggregate({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: AppointmentStatus.COMPLETED
      },
      _avg: { totalDuration: true }
    });
    
    return Number(result._avg.totalDuration || 0);
  }

  private async calculateRescheduleRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const totalAppointments = await this.countAppointments(companyId, startDate, endDate);
    const rescheduled = await prisma.appointment.count({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: AppointmentStatus.RESCHEDULED
      }
    });

    return totalAppointments > 0 ? (rescheduled / totalAppointments) * 100 : 0;
  }

  private async calculateCancellationRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const totalAppointments = await this.countAppointments(companyId, startDate, endDate);
    const cancelled = await prisma.appointment.count({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        status: AppointmentStatus.CANCELLED
      }
    });

    return totalAppointments > 0 ? (cancelled / totalAppointments) * 100 : 0;
  }

  private async calculateOnTimePerformance(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would need actual start time tracking
    return 90; // Placeholder
  }

  private async calculateRevenueGrowthRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const currentRevenue = await this.calculateRevenue(companyId, startDate, endDate);
    const previousStart = subMonths(startDate, 1);
    const previousEnd = subMonths(endDate, 1);
    const previousRevenue = await this.calculateRevenue(companyId, previousStart, previousEnd);

    return previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  }

  private async calculatePaymentCollectionRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    const totalInvoiced = await prisma.invoice.aggregate({
      where: {
        companyId,
        invoiceDate: { gte: startDate, lte: endDate }
      },
      _sum: { total: true }
    });

    const totalPaid = await prisma.payment.aggregate({
      where: {
        companyId,
        paymentDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });

    const invoiced = Number(totalInvoiced._sum.total || 0);
    const paid = Number(totalPaid._sum.amount || 0);

    return invoiced > 0 ? (paid / invoiced) * 100 : 0;
  }

  private async calculateOutstandingReceivables(companyId: string): Promise<number> {
    const result = await prisma.invoice.aggregate({
      where: {
        companyId,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED] }
      },
      _sum: { balanceAmount: true }
    });

    return Number(result._sum.balanceAmount || 0);
  }

  private async calculateAveragePaymentTime(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would need to track payment timing
    return 7; // Placeholder days
  }

  private async calculateNewClientAcquisitionRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    return this.countNewClients(companyId, startDate, endDate);
  }

  private async calculateRepeatClientRate(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would need more complex query
    return 60; // Placeholder percentage
  }

  private async calculateAverageVisitFrequency(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Would calculate visits per client
    return 4; // Placeholder visits per period
  }

  private async calculateClientSegmentDistribution(companyId: string) {
    // Would segment clients by value, frequency, etc.
    return [
      { segment: 'VIP', count: 25, revenue: 5000, percentage: 10 },
      { segment: 'Regular', count: 150, revenue: 12000, percentage: 60 },
      { segment: 'Occasional', count: 75, revenue: 3000, percentage: 30 }
    ];
  }

  private async calculateTrends(companyId: string, startDate: Date, endDate: Date) {
    // Would calculate month-over-month trends
    return {
      revenueGrowthTrend: [
        { period: 'Jan', value: 15000, change: 5.2 },
        { period: 'Feb', value: 16200, change: 8.0 },
        { period: 'Mar', value: 17500, change: 8.0 }
      ],
      clientGrowthTrend: [
        { period: 'Jan', value: 180, change: 2.5 },
        { period: 'Feb', value: 195, change: 8.3 },
        { period: 'Mar', value: 210, change: 7.7 }
      ],
      appointmentTrend: [
        { period: 'Jan', value: 450, change: 3.2 },
        { period: 'Feb', value: 485, change: 7.8 },
        { period: 'Mar', value: 520, change: 7.2 }
      ]
    };
  }

  private async getCompanyGoals(companyId: string, businessKPIs: any, operationalKPIs: any, financialKPIs: any) {
    // Example goals - would be stored in database
    return [
      {
        id: 'monthly-revenue',
        name: 'Monthly Revenue',
        current: financialKPIs.grossRevenue,
        target: 20000,
        unit: 'currency',
        period: 'monthly' as const,
        progress: (financialKPIs.grossRevenue / 20000) * 100,
        onTrack: financialKPIs.grossRevenue >= 16000 // 80% of target
      },
      {
        id: 'client-retention',
        name: 'Client Retention',
        current: businessKPIs.clientRetentionRate,
        target: 80,
        unit: 'percentage',
        period: 'monthly' as const,
        progress: (businessKPIs.clientRetentionRate / 80) * 100,
        onTrack: businessKPIs.clientRetentionRate >= 75
      },
      {
        id: 'staff-utilization',
        name: 'Staff Utilization',
        current: operationalKPIs.staffUtilizationRate,
        target: 85,
        unit: 'percentage',
        period: 'daily' as const,
        progress: (operationalKPIs.staffUtilizationRate / 85) * 100,
        onTrack: operationalKPIs.staffUtilizationRate >= 75
      }
    ];
  }

  // Helper methods

  private extractServiceNames(services: any): string {
    if (!services || typeof services !== 'object') return 'Unknown Service';
    if (Array.isArray(services)) {
      return services.map((s: any) => s.serviceName || s.name).join(', ');
    }
    return services.serviceName || services.name || 'Unknown Service';
  }

  private calculateNextAvailable(appointments: any[], currentTime: string): string {
    // Simplified - would need proper schedule calculation
    return '15:30'; // Placeholder
  }

  private calculateTimeUntil(startTime: string): string {
    // Simplified time calculation
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const appointmentTime = new Date(now);
    appointmentTime.setHours(hours, minutes, 0, 0);
    
    const diff = appointmentTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diff / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      return `${diffHours}h ${remainingMinutes}m`;
    }
  }

  private isAppointmentUrgent(startTime: string, currentTime: string): boolean {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
    
    const startMinutesFromMidnight = startHours * 60 + startMinutes;
    const currentMinutesFromMidnight = currentHours * 60 + currentMinutes;
    
    const diffMinutes = startMinutesFromMidnight - currentMinutesFromMidnight;
    
    return diffMinutes <= 30 && diffMinutes > 0; // Within 30 minutes
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();