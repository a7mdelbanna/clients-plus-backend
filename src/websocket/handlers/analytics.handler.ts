import { Socket } from 'socket.io';
import { dashboardService } from '../../services/dashboard.service';
import { analyticsService } from '../../services/analytics.service';
import { logger } from '../../config/logger';
import { redisService } from '../../services/redis.service';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      userId: string;
      email: string;
      companyId: string;
      role: string;
      permissions?: string[];
    };
  };
}

export class AnalyticsSocketHandler {
  private websocketServer: any;
  private dashboardUpdateInterval: Map<string, NodeJS.Timer> = new Map();
  private subscribedUsers: Map<string, Set<string>> = new Map(); // companyId -> Set of socketIds

  constructor(websocketServer: any) {
    this.websocketServer = websocketServer;
  }

  /**
   * Handle socket connection for analytics
   */
  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { companyId } = socket.data.user;
      
      logger.info(`Analytics socket connected: ${socket.id} for company: ${companyId}`);

      // Add to company subscribers
      if (!this.subscribedUsers.has(companyId)) {
        this.subscribedUsers.set(companyId, new Set());
      }
      this.subscribedUsers.get(companyId)!.add(socket.id);

      // Send initial dashboard data
      await this.sendInitialDashboardData(socket);

      // Set up event handlers
      this.setupEventHandlers(socket);

      // Start real-time updates if first subscriber for this company
      if (this.subscribedUsers.get(companyId)!.size === 1) {
        this.startDashboardUpdates(companyId);
      }

    } catch (error) {
      logger.error('Error handling analytics socket connection:', error);
    }
  }

  /**
   * Handle socket disconnection
   */
  async handleDisconnection(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { companyId } = socket.data.user;
      
      logger.info(`Analytics socket disconnected: ${socket.id} for company: ${companyId}`);

      // Remove from company subscribers
      const companySubscribers = this.subscribedUsers.get(companyId);
      if (companySubscribers) {
        companySubscribers.delete(socket.id);
        
        // Stop updates if no more subscribers for this company
        if (companySubscribers.size === 0) {
          this.stopDashboardUpdates(companyId);
          this.subscribedUsers.delete(companyId);
        }
      }

    } catch (error) {
      logger.error('Error handling analytics socket disconnection:', error);
    }
  }

  /**
   * Set up event handlers for analytics socket
   */
  private setupEventHandlers(socket: AuthenticatedSocket): void {
    // Subscribe to specific analytics updates
    socket.on('subscribe_analytics', this.handleSubscribeAnalytics.bind(this, socket));
    
    // Unsubscribe from analytics updates
    socket.on('unsubscribe_analytics', this.handleUnsubscribeAnalytics.bind(this, socket));
    
    // Request dashboard refresh
    socket.on('refresh_dashboard', this.handleRefreshDashboard.bind(this, socket));
    
    // Request specific analytics data
    socket.on('get_analytics', this.handleGetAnalytics.bind(this, socket));
    
    // Subscribe to KPI updates
    socket.on('subscribe_kpis', this.handleSubscribeKPIs.bind(this, socket));
    
    // Request alerts update
    socket.on('get_alerts', this.handleGetAlerts.bind(this, socket));
  }

  /**
   * Send initial dashboard data to connected socket
   */
  private async sendInitialDashboardData(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { companyId } = socket.data.user;

      const [dashboardMetrics, kpis] = await Promise.all([
        dashboardService.getDashboardMetrics(companyId),
        dashboardService.getKPIs(companyId)
      ]);

      socket.emit('dashboard_initial_data', {
        metrics: dashboardMetrics,
        kpis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error sending initial dashboard data:', error);
      socket.emit('error', {
        type: 'DASHBOARD_LOAD_ERROR',
        message: 'Failed to load dashboard data'
      });
    }
  }

  /**
   * Start real-time dashboard updates for a company
   */
  private startDashboardUpdates(companyId: string): void {
    // Update every 30 seconds
    const interval = setInterval(async () => {
      try {
        await this.broadcastDashboardUpdates(companyId);
      } catch (error) {
        logger.error(`Error in dashboard updates for company ${companyId}:`, error);
      }
    }, 30000);

    this.dashboardUpdateInterval.set(companyId, interval);
    logger.info(`Started dashboard updates for company: ${companyId}`);
  }

  /**
   * Stop real-time dashboard updates for a company
   */
  private stopDashboardUpdates(companyId: string): void {
    const interval = this.dashboardUpdateInterval.get(companyId);
    if (interval) {
      clearInterval(interval);
      this.dashboardUpdateInterval.delete(companyId);
      logger.info(`Stopped dashboard updates for company: ${companyId}`);
    }
  }

  /**
   * Broadcast dashboard updates to all subscribers of a company
   */
  private async broadcastDashboardUpdates(companyId: string): Promise<void> {
    try {
      const subscribers = this.subscribedUsers.get(companyId);
      if (!subscribers || subscribers.size === 0) {
        return;
      }

      const dashboardMetrics = await dashboardService.getDashboardMetrics(companyId);

      // Check for significant changes before broadcasting
      const cacheKey = `dashboard:last_broadcast:${companyId}`;
      const lastMetrics = await redisService.get(cacheKey);
      
      if (this.hasSignificantChanges(lastMetrics, dashboardMetrics)) {
        // Store current metrics for next comparison
        await redisService.set(cacheKey, dashboardMetrics, { ttl: 300 });

        // Broadcast to all subscribers
        subscribers.forEach(socketId => {
          const socket = this.websocketServer.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('dashboard_update', {
              metrics: dashboardMetrics,
              timestamp: new Date().toISOString(),
              type: 'periodic_update'
            });
          }
        });

        logger.debug(`Broadcasted dashboard updates to ${subscribers.size} subscribers for company: ${companyId}`);
      }

    } catch (error) {
      logger.error('Error broadcasting dashboard updates:', error);
    }
  }

  /**
   * Handle subscribe to analytics updates
   */
  private async handleSubscribeAnalytics(socket: AuthenticatedSocket, data: { type: string }): Promise<void> {
    try {
      const { companyId } = socket.data.user;
      const { type } = data;

      logger.info(`Socket ${socket.id} subscribed to ${type} analytics for company: ${companyId}`);

      // Join specific analytics room
      socket.join(`analytics:${companyId}:${type}`);

      socket.emit('subscription_confirmed', {
        type,
        message: `Subscribed to ${type} analytics updates`
      });

    } catch (error) {
      logger.error('Error handling analytics subscription:', error);
      socket.emit('error', {
        type: 'SUBSCRIPTION_ERROR',
        message: 'Failed to subscribe to analytics updates'
      });
    }
  }

  /**
   * Handle unsubscribe from analytics updates
   */
  private handleUnsubscribeAnalytics(socket: AuthenticatedSocket, data: { type: string }): void {
    try {
      const { companyId } = socket.data.user;
      const { type } = data;

      logger.info(`Socket ${socket.id} unsubscribed from ${type} analytics for company: ${companyId}`);

      // Leave specific analytics room
      socket.leave(`analytics:${companyId}:${type}`);

      socket.emit('unsubscription_confirmed', {
        type,
        message: `Unsubscribed from ${type} analytics updates`
      });

    } catch (error) {
      logger.error('Error handling analytics unsubscription:', error);
    }
  }

  /**
   * Handle dashboard refresh request
   */
  private async handleRefreshDashboard(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { companyId } = socket.data.user;

      logger.info(`Dashboard refresh requested by socket ${socket.id} for company: ${companyId}`);

      // Invalidate cache to force fresh data
      await dashboardService.invalidateDashboardCache(companyId);

      // Send fresh dashboard data
      await this.sendInitialDashboardData(socket);

    } catch (error) {
      logger.error('Error handling dashboard refresh:', error);
      socket.emit('error', {
        type: 'REFRESH_ERROR',
        message: 'Failed to refresh dashboard'
      });
    }
  }

  /**
   * Handle specific analytics data request
   */
  private async handleGetAnalytics(socket: AuthenticatedSocket, data: {
    type: 'revenue' | 'appointments' | 'clients' | 'staff' | 'services';
    params: any;
  }): Promise<void> {
    try {
      const { companyId } = socket.data.user;
      const { type, params } = data;

      logger.info(`Analytics data requested: ${type} by socket ${socket.id} for company: ${companyId}`);

      let analyticsData;

      switch (type) {
        case 'revenue':
          analyticsData = await analyticsService.getRevenueAnalytics({
            companyId,
            ...params
          });
          break;
        case 'appointments':
          analyticsData = await analyticsService.getAppointmentAnalytics({
            companyId,
            ...params
          });
          break;
        case 'clients':
          analyticsData = await analyticsService.getClientAnalytics({
            companyId,
            ...params
          });
          break;
        case 'staff':
          analyticsData = await analyticsService.getStaffPerformance({
            companyId,
            ...params
          });
          break;
        case 'services':
          analyticsData = await analyticsService.getServiceAnalytics({
            companyId,
            ...params
          });
          break;
        default:
          throw new Error(`Unknown analytics type: ${type}`);
      }

      socket.emit('analytics_data', {
        type,
        data: analyticsData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling analytics data request:', error);
      socket.emit('error', {
        type: 'ANALYTICS_ERROR',
        message: 'Failed to get analytics data'
      });
    }
  }

  /**
   * Handle KPIs subscription
   */
  private async handleSubscribeKPIs(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { companyId } = socket.data.user;

      logger.info(`Socket ${socket.id} subscribed to KPIs for company: ${companyId}`);

      // Join KPIs room
      socket.join(`kpis:${companyId}`);

      // Send initial KPIs
      const kpis = await dashboardService.getKPIs(companyId);
      socket.emit('kpis_data', {
        data: kpis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling KPIs subscription:', error);
      socket.emit('error', {
        type: 'KPI_ERROR',
        message: 'Failed to subscribe to KPIs'
      });
    }
  }

  /**
   * Handle alerts request
   */
  private async handleGetAlerts(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { companyId } = socket.data.user;

      const dashboardMetrics = await dashboardService.getDashboardMetrics(companyId);
      
      socket.emit('alerts_data', {
        alerts: dashboardMetrics.alerts,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling alerts request:', error);
      socket.emit('error', {
        type: 'ALERTS_ERROR',
        message: 'Failed to get alerts'
      });
    }
  }

  /**
   * Broadcast analytics update to specific room
   */
  public async broadcastAnalyticsUpdate(companyId: string, type: string, data: any): Promise<void> {
    try {
      const room = `analytics:${companyId}:${type}`;
      this.websocketServer.io.to(room).emit('analytics_update', {
        type,
        data,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Broadcasted ${type} analytics update to room: ${room}`);

    } catch (error) {
      logger.error('Error broadcasting analytics update:', error);
    }
  }

  /**
   * Broadcast KPIs update
   */
  public async broadcastKPIsUpdate(companyId: string, kpis: any): Promise<void> {
    try {
      const room = `kpis:${companyId}`;
      this.websocketServer.io.to(room).emit('kpis_update', {
        data: kpis,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Broadcasted KPIs update to room: ${room}`);

    } catch (error) {
      logger.error('Error broadcasting KPIs update:', error);
    }
  }

  /**
   * Broadcast alert update
   */
  public async broadcastAlertUpdate(companyId: string, alert: any): Promise<void> {
    try {
      const subscribers = this.subscribedUsers.get(companyId);
      if (subscribers && subscribers.size > 0) {
        subscribers.forEach(socketId => {
          const socket = this.websocketServer.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('new_alert', {
              alert,
              timestamp: new Date().toISOString()
            });
          }
        });

        logger.debug(`Broadcasted alert to ${subscribers.size} subscribers for company: ${companyId}`);
      }

    } catch (error) {
      logger.error('Error broadcasting alert:', error);
    }
  }

  /**
   * Check if there are significant changes in metrics to warrant broadcasting
   */
  private hasSignificantChanges(lastMetrics: any, currentMetrics: any): boolean {
    if (!lastMetrics) return true;

    try {
      // Check for significant changes in key metrics
      const significantFields = [
        'overview.todayRevenue',
        'overview.todayAppointments',
        'realTime.currentAppointments.length',
        'alerts.length'
      ];

      for (const field of significantFields) {
        const lastValue = this.getNestedValue(lastMetrics, field);
        const currentValue = this.getNestedValue(currentMetrics, field);

        // Consider it significant if:
        // - Values are different for counts
        // - Revenue differs by more than 1%
        if (field.includes('Revenue')) {
          const percentChange = Math.abs((currentValue - lastValue) / (lastValue || 1));
          if (percentChange > 0.01) return true; // 1% change
        } else {
          if (lastValue !== currentValue) return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking significant changes:', error);
      return true; // Default to broadcasting if error occurs
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get connected analytics sockets count for a company
   */
  public getConnectedSocketsCount(companyId: string): number {
    return this.subscribedUsers.get(companyId)?.size || 0;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    // Clear all intervals
    this.dashboardUpdateInterval.forEach((interval, companyId) => {
      clearInterval(interval);
      logger.info(`Cleaned up dashboard updates for company: ${companyId}`);
    });

    this.dashboardUpdateInterval.clear();
    this.subscribedUsers.clear();
  }
}

export { AnalyticsSocketHandler };