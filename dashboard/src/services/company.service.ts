import { analyticsAPI } from './api/analytics.api';

export interface CompanyStats {
  totalClients: number;
  activeProjects: number;
  monthlyRevenue: number;
  growthRate: number;
  clientsGrowth: string;
  projectsGrowth: string;
  revenueGrowth: string;
  growthRateChange: string;
}

export interface RecentActivity {
  id: string;
  title: string;
  titleAr: string;
  time: Date;
  type: 'client' | 'project' | 'invoice' | 'meeting';
}

class CompanyService {
  async getCompanyStats(companyId: string, branchId?: string): Promise<CompanyStats> {
    try {
      // Get analytics overview from API
      const overview = await analyticsAPI.getAnalyticsOverview({
        period: 'month',
        branchId
      });

      // Calculate growth rates
      const clientsGrowth = overview.clients.growth > 0 
        ? `+${Math.round(overview.clients.growth)}%` 
        : `${Math.round(overview.clients.growth)}%`;
      
      const projectsGrowth = overview.appointments.growth > 0 
        ? `+${Math.round(overview.appointments.growth)}%` 
        : `${Math.round(overview.appointments.growth)}%`;
      
      const revenueGrowth = overview.revenue.growth > 0 
        ? `+${Math.round(overview.revenue.growth)}%` 
        : `${Math.round(overview.revenue.growth)}%`;

      // Overall growth rate (average of all growth rates)
      const avgGrowth = (overview.clients.growth + overview.appointments.growth + overview.revenue.growth) / 3;
      const growthRateChange = avgGrowth > 0 ? `+${Math.round(avgGrowth)}%` : `${Math.round(avgGrowth)}%`;

      return {
        totalClients: overview.clients.total,
        activeProjects: overview.appointments.total, // Using appointments as projects for now
        monthlyRevenue: overview.revenue.total,
        growthRate: avgGrowth,
        clientsGrowth,
        projectsGrowth,
        revenueGrowth,
        growthRateChange
      };
    } catch (error) {
      console.log('Error fetching company stats from API, using defaults:', error);
      // Return default values for new companies or API errors
      return {
        totalClients: 0,
        activeProjects: 0,
        monthlyRevenue: 0,
        growthRate: 0,
        clientsGrowth: '+0%',
        projectsGrowth: '+0%',
        revenueGrowth: '+0%',
        growthRateChange: '+0%'
      };
    }
  }

  async getRecentActivities(companyId: string, branchId?: string): Promise<RecentActivity[]> {
    try {
      // For now, return empty array as we don't have an activities endpoint yet
      // This will be implemented when we add activity tracking to the API
      return [];
    } catch (error) {
      console.log('Error fetching recent activities:', error);
      return [];
    }
  }

  async getCompanyInfo(companyId: string) {
    try {
      // This would be replaced with an API call to get company info
      // For now, returning basic info
      return {
        id: companyId,
        name: '',
        businessName: ''
      };
    } catch (error) {
      console.log('Error fetching company info:', error);
      return null;
    }
  }
}

export const companyService = new CompanyService();