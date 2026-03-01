import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// =========================== INTERFACES ===========================

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsQuery extends AnalyticsDateRange {
  groupBy?: 'day' | 'week' | 'month' | 'year';
  branchId?: string;
  staffId?: string;
}

export interface AnalyticsOverviewQuery {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  branchId?: string;
}

// Revenue Analytics
export interface RevenueAnalytics {
  totalRevenue: number;
  revenueGrowth: number; // percentage change from previous period
  averageTicket: number;
  averageTicketGrowth: number;
  
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    growth: number;
  }>;
  
  revenueByService: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    appointments: number;
    averagePrice: number;
    percentage: number;
  }>;
  
  revenueByStaff: Array<{
    staffId: string;
    staffName: string;
    revenue: number;
    appointments: number;
    averageTicket: number;
  }>;
  
  revenueByBranch: Array<{
    branchId: string;
    branchName: string;
    revenue: number;
    appointments: number;
    growth: number;
  }>;
  
  paymentMethodBreakdown: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

// Appointment Analytics
export interface AppointmentAnalytics {
  totalAppointments: number;
  appointmentGrowth: number;
  completionRate: number;
  noShowRate: number;
  cancellationRate: number;
  averageDuration: number; // in minutes
  
  appointmentsByStatus: Record<string, number>;
  appointmentsByType: Record<string, number>;
  
  appointmentsByPeriod: Array<{
    period: string;
    total: number;
    completed: number;
    cancelled: number;
    noShows: number;
    completionRate: number;
  }>;
  
  appointmentsByService: Array<{
    serviceId: string;
    serviceName: string;
    appointments: number;
    completionRate: number;
    averageDuration: number;
    popularity: number; // percentage of total appointments
  }>;
  
  appointmentsByStaff: Array<{
    staffId: string;
    staffName: string;
    appointments: number;
    completionRate: number;
    utilizationRate: number;
    averageRating?: number;
  }>;
  
  appointmentsByHour: Array<{
    hour: number;
    appointments: number;
    percentage: number;
  }>;
  
  appointmentsByDay: Array<{
    dayOfWeek: number; // 0-6
    dayName: string;
    appointments: number;
    percentage: number;
  }>;
}

// Client Analytics
export interface ClientAnalytics {
  totalClients: number;
  newClients: number;
  clientGrowth: number; // percentage
  activeClients: number; // clients with appointments in period
  clientRetentionRate: number;
  averageLifetimeValue: number;
  
  clientsByStatus: Record<string, number>;
  
  clientAcquisition: Array<{
    period: string;
    newClients: number;
    totalClients: number;
    growth: number;
  }>;
  
  clientRetention: Array<{
    period: string;
    retainedClients: number;
    retentionRate: number;
  }>;
  
  clientSegmentation: Array<{
    segment: string;
    count: number;
    percentage: number;
    averageValue: number;
  }>;
  
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalSpent: number;
    appointments: number;
    lastVisit: string;
    lifetimeValue: number;
  }>;
  
  clientsBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

// Staff Performance Analytics
export interface StaffPerformance {
  totalStaff: number;
  averageUtilization: number;
  averageRating?: number;
  
  staffMetrics: Array<{
    staffId: string;
    staffName: string;
    appointments: number;
    completedAppointments: number;
    revenue: number;
    utilizationRate: number;
    completionRate: number;
    averageTicket: number;
    rating?: number;
    growth: number;
  }>;
  
  utilizationByPeriod: Array<{
    period: string;
    utilization: number;
    appointments: number;
    revenue: number;
  }>;
  
  performanceComparison: Array<{
    staffId: string;
    staffName: string;
    currentRevenue: number;
    previousRevenue: number;
    growth: number;
    rank: number;
  }>;
}

// Service Analytics
export interface ServiceAnalytics {
  totalServices: number;
  activeServices: number;
  
  servicePerformance: Array<{
    serviceId: string;
    serviceName: string;
    appointments: number;
    revenue: number;
    averagePrice: number;
    completionRate: number;
    popularity: number; // percentage of total appointments
    growth: number;
    profitMargin?: number;
  }>;
  
  servicesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    services: number;
    appointments: number;
    revenue: number;
    averagePrice: number;
  }>;
  
  serviceUtilization: Array<{
    serviceId: string;
    serviceName: string;
    capacity: number; // theoretical maximum bookings
    utilization: number; // percentage of capacity used
    waitlistCount?: number;
  }>;
  
  serviceTrends: Array<{
    period: string;
    serviceMetrics: Array<{
      serviceId: string;
      appointments: number;
      revenue: number;
    }>;
  }>;
}

// Analytics Summary (all data in one response)
export interface AnalyticsSummary {
  revenue: RevenueAnalytics;
  appointments: AppointmentAnalytics;
  clients: ClientAnalytics;
  staff: StaffPerformance;
  services: ServiceAnalytics;
  
  generatedAt: string;
  periodCovered: AnalyticsDateRange;
}

// Analytics Overview (quick metrics)
export interface AnalyticsOverview {
  // Key Performance Indicators
  totalRevenue: number;
  revenueGrowth: number;
  totalAppointments: number;
  appointmentGrowth: number;
  totalClients: number;
  clientGrowth: number;
  completionRate: number;
  
  // Quick stats
  todayRevenue: number;
  todayAppointments: number;
  weekRevenue: number;
  weekAppointments: number;
  monthRevenue: number;
  monthAppointments: number;
  
  // Alerts and insights
  alerts: Array<{
    type: 'warning' | 'info' | 'success' | 'error';
    title: string;
    message: string;
    actionRequired?: boolean;
  }>;
  
  insights: Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    percentage?: number;
  }>;
}

// Dashboard Metrics
export interface DashboardMetrics {
  // Real-time metrics
  todayMetrics: {
    revenue: number;
    appointments: number;
    completedAppointments: number;
    newClients: number;
    utilization: number;
  };
  
  // Period comparisons
  weekOverWeek: {
    revenue: { current: number; previous: number; growth: number };
    appointments: { current: number; previous: number; growth: number };
    clients: { current: number; previous: number; growth: number };
  };
  
  monthOverMonth: {
    revenue: { current: number; previous: number; growth: number };
    appointments: { current: number; previous: number; growth: number };
    clients: { current: number; previous: number; growth: number };
  };
  
  // Quick charts data
  revenueChart: Array<{ date: string; revenue: number }>;
  appointmentsChart: Array<{ date: string; appointments: number }>;
  
  // Top performers
  topServices: Array<{ name: string; revenue: number; count: number }>;
  topStaff: Array<{ name: string; revenue: number; appointments: number }>;
}

// KPI Metrics
export interface KPIMetrics {
  financial: {
    totalRevenue: number;
    averageTicket: number;
    profitMargin: number;
    revenuePerClient: number;
    revenuePerStaff: number;
  };
  
  operational: {
    utilizationRate: number;
    completionRate: number;
    noShowRate: number;
    cancellationRate: number;
    onTimePerformance: number;
  };
  
  client: {
    clientRetentionRate: number;
    clientSatisfactionScore: number;
    newClientAcquisitionRate: number;
    averageLifetimeValue: number;
    repeatClientRate: number;
  };
  
  staff: {
    staffUtilization: number;
    staffProductivity: number;
    staffRetentionRate: number;
    averageStaffRating: number;
  };
}

// Export Options
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeRawData?: boolean;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'Letter';
}

// =========================== ANALYTICS API CLASS ===========================

export class AnalyticsAPI {
  private readonly endpoint = '/analytics';

  // ==================== Core Analytics ====================

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(query: AnalyticsQuery): Promise<RevenueAnalytics> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.get<ApiResponse<RevenueAnalytics>>(
        `${this.endpoint}/revenue?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch revenue analytics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get revenue analytics error:', error);
      throw new Error(error.message || 'Failed to fetch revenue analytics');
    }
  }

  /**
   * Get appointment analytics
   */
  async getAppointmentAnalytics(query: AnalyticsQuery): Promise<AppointmentAnalytics> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.get<ApiResponse<AppointmentAnalytics>>(
        `${this.endpoint}/appointments?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch appointment analytics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get appointment analytics error:', error);
      throw new Error(error.message || 'Failed to fetch appointment analytics');
    }
  }

  /**
   * Get client analytics
   */
  async getClientAnalytics(query: AnalyticsQuery): Promise<ClientAnalytics> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.get<ApiResponse<ClientAnalytics>>(
        `${this.endpoint}/clients?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch client analytics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get client analytics error:', error);
      throw new Error(error.message || 'Failed to fetch client analytics');
    }
  }

  /**
   * Get staff performance analytics
   */
  async getStaffPerformance(query: AnalyticsQuery): Promise<StaffPerformance> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.get<ApiResponse<StaffPerformance>>(
        `${this.endpoint}/staff?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch staff performance');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get staff performance error:', error);
      throw new Error(error.message || 'Failed to fetch staff performance');
    }
  }

  /**
   * Get service analytics
   */
  async getServiceAnalytics(query: AnalyticsQuery): Promise<ServiceAnalytics> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.get<ApiResponse<ServiceAnalytics>>(
        `${this.endpoint}/services?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch service analytics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get service analytics error:', error);
      throw new Error(error.message || 'Failed to fetch service analytics');
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(query: AnalyticsQuery): Promise<AnalyticsSummary> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.get<ApiResponse<AnalyticsSummary>>(
        `${this.endpoint}/summary?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch analytics summary');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get analytics summary error:', error);
      throw new Error(error.message || 'Failed to fetch analytics summary');
    }
  }

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview(query?: AnalyticsOverviewQuery): Promise<AnalyticsOverview> {
    try {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, value.toString());
          }
        });
      }

      const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(
        `${this.endpoint}/overview?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch analytics overview');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get analytics overview error:', error);
      throw new Error(error.message || 'Failed to fetch analytics overview');
    }
  }

  // ==================== Dashboard Metrics ====================

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardMetrics>>(
        `${this.endpoint}/dashboard`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch dashboard metrics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get dashboard metrics error:', error);
      throw new Error(error.message || 'Failed to fetch dashboard metrics');
    }
  }

  /**
   * Get KPI metrics
   */
  async getKPIs(): Promise<KPIMetrics> {
    try {
      const response = await apiClient.get<ApiResponse<KPIMetrics>>(
        `${this.endpoint}/dashboard/kpis`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch KPI metrics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get KPI metrics error:', error);
      throw new Error(error.message || 'Failed to fetch KPI metrics');
    }
  }

  /**
   * Get dashboard alerts
   */
  async getDashboardAlerts(): Promise<Array<{ type: string; title: string; message: string; actionRequired?: boolean }>> {
    try {
      const response = await apiClient.get<ApiResponse<Array<{ type: string; title: string; message: string; actionRequired?: boolean }>>>(
        `${this.endpoint}/dashboard/alerts`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch dashboard alerts');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get dashboard alerts error:', error);
      throw new Error(error.message || 'Failed to fetch dashboard alerts');
    }
  }

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig(): Promise<Record<string, any>> {
    try {
      const response = await apiClient.get<ApiResponse<Record<string, any>>>(
        `${this.endpoint}/dashboard/config`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch dashboard configuration');
      }

      return response.data.data || {};
    } catch (error: any) {
      console.error('Get dashboard config error:', error);
      throw new Error(error.message || 'Failed to fetch dashboard configuration');
    }
  }

  // ==================== Export Functions ====================

  /**
   * Export revenue analytics
   */
  async exportRevenueAnalytics(query: AnalyticsQuery, options: ExportOptions): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.post(
        `${this.endpoint}/export/revenue?${params.toString()}`,
        options,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error: any) {
      console.error('Export revenue analytics error:', error);
      throw new Error(error.message || 'Failed to export revenue analytics');
    }
  }

  /**
   * Export appointment analytics
   */
  async exportAppointmentAnalytics(query: AnalyticsQuery, options: ExportOptions): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.post(
        `${this.endpoint}/export/appointments?${params.toString()}`,
        options,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error: any) {
      console.error('Export appointment analytics error:', error);
      throw new Error(error.message || 'Failed to export appointment analytics');
    }
  }

  /**
   * Export client analytics
   */
  async exportClientAnalytics(query: AnalyticsQuery, options: ExportOptions): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.post(
        `${this.endpoint}/export/clients?${params.toString()}`,
        options,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error: any) {
      console.error('Export client analytics error:', error);
      throw new Error(error.message || 'Failed to export client analytics');
    }
  }

  /**
   * Export staff performance analytics
   */
  async exportStaffPerformance(query: AnalyticsQuery, options: ExportOptions): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.post(
        `${this.endpoint}/export/staff?${params.toString()}`,
        options,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error: any) {
      console.error('Export staff performance error:', error);
      throw new Error(error.message || 'Failed to export staff performance');
    }
  }

  /**
   * Export service analytics
   */
  async exportServiceAnalytics(query: AnalyticsQuery, options: ExportOptions): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await apiClient.post(
        `${this.endpoint}/export/services?${params.toString()}`,
        options,
        { responseType: 'blob' }
      );

      return response.data;
    } catch (error: any) {
      console.error('Export service analytics error:', error);
      throw new Error(error.message || 'Failed to export service analytics');
    }
  }

  // ==================== Cache Management ====================

  /**
   * Invalidate analytics cache
   */
  async invalidateCache(): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/cache/invalidate`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to invalidate cache');
      }
    } catch (error: any) {
      console.error('Invalidate cache error:', error);
      throw new Error(error.message || 'Failed to invalidate cache');
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/health`);
      return response.data.success;
    } catch (error) {
      console.error('Analytics API health check failed:', error);
      return false;
    }
  }

  /**
   * Calculate growth percentage
   */
  static calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number, currency = 'EGP'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format large numbers
   */
  static formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  /**
   * Get date range for common periods
   */
  static getDateRangeForPeriod(period: 'today' | 'week' | 'month' | 'quarter' | 'year'): AnalyticsDateRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return {
          startDate: today.toISOString(),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        };
      
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          startDate: weekStart.toISOString(),
          endDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return {
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
        };
      
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 1);
        return {
          startDate: quarterStart.toISOString(),
          endDate: quarterEnd.toISOString(),
        };
      
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear() + 1, 0, 1);
        return {
          startDate: yearStart.toISOString(),
          endDate: yearEnd.toISOString(),
        };
      
      default:
        return {
          startDate: today.toISOString(),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        };
    }
  }
}

// Create and export singleton instance
export const analyticsAPI = new AnalyticsAPI();
export default analyticsAPI;