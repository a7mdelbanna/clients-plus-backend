import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { redisService } from './redis.service';

interface QueryOptions {
  companyId: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  staffId?: string;
  clientId?: string;
}

interface AppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  revenue: number;
  averageDuration: number;
  popularServices: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
  }>;
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    appointmentCount: number;
    revenue: number;
  }>;
}

export class OptimizationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Optimized appointment query with raw SQL for complex analytics
  async getAppointmentAnalytics(options: QueryOptions): Promise<AppointmentAnalytics> {
    const { companyId, startDate, endDate, branchId, staffId } = options;
    const cacheKey = `analytics:appointments:${companyId}:${startDate?.toISOString()}:${endDate?.toISOString()}:${branchId || 'all'}:${staffId || 'all'}`;
    
    // Try to get from cache first
    const cached = await redisService.get<AppointmentAnalytics>(cacheKey);
    if (cached) {
      logger.debug('Analytics served from cache');
      return cached;
    }

    try {
      const conditions = ['a.company_id = $1'];
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (startDate) {
        conditions.push(`a.date >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`a.date <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      if (branchId) {
        conditions.push(`a.branch_id = $${paramIndex}`);
        params.push(branchId);
        paramIndex++;
      }

      if (staffId) {
        conditions.push(`a.staff_id = $${paramIndex}`);
        params.push(staffId);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Main analytics query
      const analyticsQuery = `
        WITH appointment_stats AS (
          SELECT 
            COUNT(*) as total_appointments,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_appointments,
            SUM(CASE WHEN status = 'COMPLETED' THEN total_price ELSE 0 END) as total_revenue,
            AVG(total_duration) as avg_duration
          FROM appointments a
          WHERE ${whereClause}
        ),
        popular_services AS (
          SELECT 
            service_data->>'id' as service_id,
            service_data->>'name' as service_name,
            COUNT(*) as service_count
          FROM appointments a,
          jsonb_array_elements(a.services) as service_data
          WHERE ${whereClause}
          GROUP BY service_data->>'id', service_data->>'name'
          ORDER BY service_count DESC
          LIMIT 10
        ),
        staff_performance AS (
          SELECT 
            a.staff_id,
            s.name as staff_name,
            COUNT(*) as appointment_count,
            SUM(CASE WHEN a.status = 'COMPLETED' THEN a.total_price ELSE 0 END) as staff_revenue
          FROM appointments a
          LEFT JOIN staff s ON a.staff_id = s.id
          WHERE ${whereClause} AND a.staff_id IS NOT NULL
          GROUP BY a.staff_id, s.name
          ORDER BY appointment_count DESC
          LIMIT 10
        )
        SELECT 
          (SELECT row_to_json(appointment_stats.*) FROM appointment_stats) as stats,
          (SELECT json_agg(popular_services.*) FROM popular_services) as popular_services,
          (SELECT json_agg(staff_performance.*) FROM staff_performance) as staff_performance
      `;

      const result = await this.prisma.$queryRawUnsafe(analyticsQuery, ...params);
      const data = result as any[];
      
      if (data.length === 0) {
        return {
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          revenue: 0,
          averageDuration: 0,
          popularServices: [],
          staffPerformance: []
        };
      }

      const row = data[0];
      const analytics: AppointmentAnalytics = {
        totalAppointments: row.stats?.total_appointments || 0,
        completedAppointments: row.stats?.completed_appointments || 0,
        cancelledAppointments: row.stats?.cancelled_appointments || 0,
        revenue: parseFloat(row.stats?.total_revenue || '0'),
        averageDuration: parseFloat(row.stats?.avg_duration || '0'),
        popularServices: row.popular_services || [],
        staffPerformance: row.staff_performance || []
      };

      // Cache for 30 minutes
      await redisService.set(cacheKey, analytics, { ttl: 1800 });
      
      return analytics;
    } catch (error) {
      logger.error('Error getting appointment analytics:', error);
      throw error;
    }
  }

  // Optimized client query with aggregated data
  async getClientInsights(companyId: string, clientId: string): Promise<any> {
    const cacheKey = `client:insights:${companyId}:${clientId}`;
    
    const cached = await redisService.get(cacheKey);
    if (cached) return cached;

    try {
      const insights = await this.prisma.$queryRaw`
        WITH client_stats AS (
          SELECT 
            c.*,
            COUNT(a.id) as total_appointments,
            COUNT(CASE WHEN a.status = 'COMPLETED' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) as cancelled_appointments,
            COUNT(CASE WHEN a.status = 'NO_SHOW' THEN 1 END) as no_show_appointments,
            SUM(CASE WHEN a.status = 'COMPLETED' THEN a.total_price ELSE 0 END) as total_spent,
            AVG(CASE WHEN a.status = 'COMPLETED' THEN a.total_price END) as avg_appointment_value,
            MAX(a.date) as last_appointment_date,
            MIN(a.date) as first_appointment_date
          FROM clients c
          LEFT JOIN appointments a ON c.id = a.client_id AND a.company_id = c.company_id
          WHERE c.company_id = ${companyId} AND c.id = ${clientId}
          GROUP BY c.id
        ),
        favorite_services AS (
          SELECT 
            service_data->>'id' as service_id,
            service_data->>'name' as service_name,
            COUNT(*) as usage_count
          FROM appointments a,
          jsonb_array_elements(a.services) as service_data
          WHERE a.company_id = ${companyId} 
            AND a.client_id = ${clientId}
            AND a.status = 'COMPLETED'
          GROUP BY service_data->>'id', service_data->>'name'
          ORDER BY usage_count DESC
          LIMIT 5
        ),
        preferred_staff AS (
          SELECT 
            s.id as staff_id,
            s.name as staff_name,
            COUNT(*) as appointment_count
          FROM appointments a
          JOIN staff s ON a.staff_id = s.id
          WHERE a.company_id = ${companyId} 
            AND a.client_id = ${clientId}
            AND a.status = 'COMPLETED'
          GROUP BY s.id, s.name
          ORDER BY appointment_count DESC
          LIMIT 3
        )
        SELECT 
          cs.*,
          (SELECT json_agg(fs.*) FROM favorite_services fs) as favorite_services,
          (SELECT json_agg(ps.*) FROM preferred_staff ps) as preferred_staff
        FROM client_stats cs
      `;

      // Cache for 1 hour
      await redisService.set(cacheKey, insights, { ttl: 3600 });
      
      return insights;
    } catch (error) {
      logger.error('Error getting client insights:', error);
      throw error;
    }
  }

  // Optimized dashboard metrics with single query
  async getDashboardMetrics(companyId: string, branchId?: string): Promise<any> {
    const cacheKey = `dashboard:metrics:${companyId}:${branchId || 'all'}`;
    
    const cached = await redisService.get(cacheKey);
    if (cached) return cached;

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const conditions = ['company_id = $1', 'date >= $2', 'date <= $3'];
      const params: any[] = [companyId, startOfMonth, endOfMonth];

      if (branchId) {
        conditions.push('branch_id = $4');
        params.push(branchId);
      }

      const whereClause = conditions.join(' AND ');

      const metrics = await this.prisma.$queryRawUnsafe(`
        WITH today_appointments AS (
          SELECT 
            COUNT(*) as today_total,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as today_completed,
            SUM(CASE WHEN status = 'COMPLETED' THEN total_price ELSE 0 END) as today_revenue
          FROM appointments 
          WHERE ${whereClause} AND date = CURRENT_DATE
        ),
        month_appointments AS (
          SELECT 
            COUNT(*) as month_total,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as month_completed,
            SUM(CASE WHEN status = 'COMPLETED' THEN total_price ELSE 0 END) as month_revenue
          FROM appointments 
          WHERE ${whereClause}
        ),
        client_stats AS (
          SELECT 
            COUNT(*) as total_clients,
            COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_clients
          FROM clients 
          WHERE company_id = $1
        )
        SELECT 
          ta.*,
          ma.*,
          cs.*
        FROM today_appointments ta, month_appointments ma, client_stats cs
      `, ...params);

      // Cache for 5 minutes
      await redisService.set(cacheKey, metrics, { ttl: 300 });
      
      return metrics[0];
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  // Bulk operations for performance
  async bulkUpdateAppointmentStatuses(
    companyId: string,
    updates: Array<{ id: string; status: string }>
  ): Promise<void> {
    if (updates.length === 0) return;

    try {
      // Use transaction for bulk updates
      await this.prisma.$transaction(
        updates.map(update => 
          this.prisma.appointment.update({
            where: { 
              id: update.id,
              companyId: companyId 
            },
            data: { 
              status: update.status as any,
              updatedAt: new Date()
            }
          })
        )
      );

      // Invalidate related caches
      await redisService.invalidatePattern(`cache:${companyId}:*appointments*`);
      await redisService.invalidatePattern(`analytics:appointments:${companyId}:*`);
      await redisService.invalidatePattern(`dashboard:metrics:${companyId}:*`);

      logger.info(`Bulk updated ${updates.length} appointments for company ${companyId}`);
    } catch (error) {
      logger.error('Error in bulk update appointments:', error);
      throw error;
    }
  }

  // Optimized search with full-text capabilities
  async searchClients(companyId: string, query: string, limit = 20): Promise<any[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = `search:clients:${companyId}:${query}:${limit}`;
    
    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      // Use PostgreSQL's full-text search capabilities
      const results = await this.prisma.$queryRaw`
        SELECT 
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          created_at,
          ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
        FROM (
          SELECT *,
            setweight(to_tsvector('english', first_name || ' ' || last_name), 'A') ||
            setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(phone, '')), 'C') as search_vector
          FROM clients
          WHERE company_id = ${companyId} AND is_active = true
        ) t
        WHERE search_vector @@ plainto_tsquery('english', ${query})
        ORDER BY rank DESC, created_at DESC
        LIMIT ${limit}
      `;

      // Cache for 10 minutes
      await redisService.set(cacheKey, results, { ttl: 600 });
      
      return results as any[];
    } catch (error) {
      logger.error('Error searching clients:', error);
      
      // Fallback to ILIKE search if full-text search fails
      const fallbackResults = await this.prisma.client.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return fallbackResults;
    }
  }

  // Database connection optimization
  async optimizeConnections(): Promise<void> {
    try {
      // Run ANALYZE to update table statistics
      await this.prisma.$executeRaw`ANALYZE`;
      
      // Update query planner statistics
      await this.prisma.$executeRaw`VACUUM ANALYZE`;
      
      logger.info('Database optimization completed');
    } catch (error) {
      logger.error('Error optimizing database:', error);
    }
  }

  // Query performance monitoring
  async getSlowQueries(limit = 10): Promise<any[]> {
    try {
      // This requires pg_stat_statements extension
      const slowQueries = await this.prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT ${limit}
      `;
      
      return slowQueries as any[];
    } catch (error) {
      logger.warn('pg_stat_statements not available for query monitoring');
      return [];
    }
  }

  // Memory-efficient pagination
  async getPagedResults<T>(
    model: string,
    filters: any,
    page: number,
    limit: number,
    orderBy?: any
  ): Promise<{ data: T[]; total: number; pages: number }> {
    const offset = (page - 1) * limit;
    
    // Use cursor-based pagination for better performance on large datasets
    if (page > 10) {
      logger.warn('Consider using cursor-based pagination for large offsets');
    }

    try {
      const [data, total] = await Promise.all([
        (this.prisma as any)[model].findMany({
          where: filters,
          skip: offset,
          take: limit,
          orderBy
        }),
        (this.prisma as any)[model].count({ where: filters })
      ]);

      return {
        data,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error in paged results:', error);
      throw error;
    }
  }
}