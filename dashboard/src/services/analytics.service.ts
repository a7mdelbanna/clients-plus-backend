import apiClient from '../config/api';
import type { Sale } from '../types/sale.types';

export interface SalesMetrics {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  totalTransactions: number;
  growthRate: number;
  profitMargin: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  salesCount: number;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  totalSales: number;
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topProduct: string;
}

export interface SalesAnalytics {
  metrics: SalesMetrics;
  topProducts: TopProduct[];
  staffPerformance: StaffPerformance[];
  dailyTrends: Array<{
    date: string;
    sales: number;
    revenue: number;
    transactions: number;
  }>;
  paymentMethodBreakdown: Record<string, {
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  hourlyTrends: Array<{
    hour: number;
    sales: number;
    transactions: number;
  }>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsFilters {
  branchId?: string;
  staffId?: string;
  productId?: string;
  paymentMethod?: string;
  dateRange: DateRange;
}

class AnalyticsService {
  // Get comprehensive sales analytics
  async getSalesAnalytics(
    companyId: string,
    filters: AnalyticsFilters
  ): Promise<SalesAnalytics> {
    try {
      const response = await apiClient.post('/analytics/sales', filters);
      return response.data.data;
    } catch (error) {
      console.error('Error getting sales analytics:', error);
      // Return empty data structure to prevent errors
      return this.getEmptySalesAnalytics();
    }
  }



  // Get quick dashboard metrics
  async getDashboardMetrics(
    companyId: string,
    branchId?: string
  ): Promise<{
    today: SalesMetrics;
    thisWeek: SalesMetrics;
    thisMonth: SalesMetrics;
    topProductsToday: TopProduct[];
  }> {
    try {
      const params = branchId ? `?branchId=${branchId}` : '';
      const response = await apiClient.get(`/analytics/dashboard/sales${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      // Return empty metrics to prevent dashboard crashes
      return this.getEmptyDashboardMetrics();
    }
  }

  // Helper method to return empty sales analytics structure
  private getEmptySalesAnalytics(): SalesAnalytics {
    return {
      metrics: {
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        averageOrderValue: 0,
        totalTransactions: 0,
        growthRate: 0,
        profitMargin: 0,
      },
      topProducts: [],
      staffPerformance: [],
      dailyTrends: [],
      paymentMethodBreakdown: {},
      hourlyTrends: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        sales: 0,
        transactions: 0,
      })),
    };
  }

  // Helper method to return empty dashboard metrics
  private getEmptyDashboardMetrics() {
    const emptyMetrics: SalesMetrics = {
      totalSales: 0,
      totalRevenue: 0,
      totalProfit: 0,
      averageOrderValue: 0,
      totalTransactions: 0,
      growthRate: 0,
      profitMargin: 0,
    };

    return {
      today: emptyMetrics,
      thisWeek: emptyMetrics,
      thisMonth: emptyMetrics,
      topProductsToday: [],
    };
  }
}

export const analyticsService = new AnalyticsService();