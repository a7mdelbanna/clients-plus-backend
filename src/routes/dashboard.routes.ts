import express from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for dashboard endpoints
const dashboardRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Maximum 100 requests per minute per IP
  message: {
    error: 'Too many dashboard requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all dashboard routes
router.use(dashboardRateLimit);

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       properties:
 *         overview:
 *           type: object
 *           properties:
 *             todayRevenue:
 *               type: number
 *             todayRevenueChange:
 *               type: number
 *             todayAppointments:
 *               type: number
 *             todayAppointmentsChange:
 *               type: number
 *             thisWeekRevenue:
 *               type: number
 *             thisMonthRevenue:
 *               type: number
 *             totalClients:
 *               type: number
 *             newClientsToday:
 *               type: number
 *             activeStaff:
 *               type: number
 *             utilizationRate:
 *               type: number
 *         realTime:
 *           type: object
 *           properties:
 *             currentAppointments:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   clientName:
 *                     type: string
 *                   serviceName:
 *                     type: string
 *                   staffName:
 *                     type: string
 *                   status:
 *                     type: string
 *             upcomingAppointments:
 *               type: array
 *               items:
 *                 type: object
 *             staffAvailability:
 *               type: array
 *               items:
 *                 type: object
 *         alerts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [urgent, warning, info, success]
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 * 
 *     RevenueMetrics:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             totalRevenue:
 *               type: number
 *             averageOrderValue:
 *               type: number
 *             totalTransactions:
 *               type: number
 *             paymentBreakdown:
 *               type: object
 *         trends:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *               revenue:
 *                 type: number
 *               transactions:
 *                 type: number
 * 
 *     AppointmentStats:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             statusBreakdown:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   count:
 *                     type: number
 *                   revenue:
 *                     type: number
 * 
 *     ClientAnalytics:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             totalClients:
 *               type: number
 *             activeClients:
 *               type: number
 *             segments:
 *               type: object
 *               properties:
 *                 vip:
 *                   type: number
 *                 regular:
 *                   type: number
 *                 occasional:
 *                   type: number
 * 
 *     StaffPerformance:
 *       type: object
 *       properties:
 *         staff:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               staffId:
 *                 type: string
 *               staffName:
 *                 type: string
 *               branch:
 *                 type: string
 *               metrics:
 *                 type: object
 *                 properties:
 *                   revenue:
 *                     type: number
 *                   appointments:
 *                     type: number
 *                   averageRevenue:
 *                     type: number
 *                   utilizationRate:
 *                     type: number
 *         summary:
 *           type: object
 *           properties:
 *             totalStaff:
 *               type: number
 *             totalRevenue:
 *               type: number
 *             totalAppointments:
 *               type: number
 *             averageUtilization:
 *               type: number
 */

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get overall dashboard statistics
 *     description: Retrieve comprehensive dashboard statistics including overview, real-time data, alerts, and period-specific stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         description: Time period for statistics
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: today
 *       - in: query
 *         name: branchId
 *         description: Filter by specific branch
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         description: Filter by specific staff member
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeComparison
 *         description: Include comparison with previous period
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticate, tenantIsolation, dashboardController.getStats.bind(dashboardController));

/**
 * @swagger
 * /api/v1/dashboard/revenue:
 *   get:
 *     summary: Get revenue metrics and analytics
 *     description: Retrieve detailed revenue analytics with trends and breakdowns
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         description: Analysis period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           default: monthly
 *       - in: query
 *         name: startDate
 *         description: Custom start date (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         description: Custom end date (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: branchId
 *         description: Filter by specific branch
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupBy
 *         description: Group results by time period or category
 *         schema:
 *           type: string
 *           enum: [day, week, month, service, staff, branch]
 *           default: day
 *     responses:
 *       200:
 *         description: Revenue metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RevenueMetrics'
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/revenue', authenticate, tenantIsolation, dashboardController.getRevenue.bind(dashboardController));

/**
 * @swagger
 * /api/v1/dashboard/appointments:
 *   get:
 *     summary: Get appointment statistics
 *     description: Retrieve appointment metrics including status breakdown and trends
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         description: Time period for analysis
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: today
 *       - in: query
 *         name: status
 *         description: Filter by appointment status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED]
 *       - in: query
 *         name: branchId
 *         description: Filter by specific branch
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         description: Filter by specific staff member
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeDetails
 *         description: Include detailed breakdown by services and staff
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Appointment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AppointmentStats'
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/appointments', authenticate, tenantIsolation, dashboardController.getAppointments.bind(dashboardController));

/**
 * @swagger
 * /api/v1/dashboard/clients:
 *   get:
 *     summary: Get client analytics
 *     description: Retrieve client metrics including segmentation and growth trends
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         description: Analysis period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: month
 *       - in: query
 *         name: segment
 *         description: Client segment filter
 *         schema:
 *           type: string
 *           enum: [all, new, returning, vip]
 *           default: all
 *       - in: query
 *         name: branchId
 *         description: Filter by specific branch
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeGrowth
 *         description: Include growth trend analysis
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Client analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ClientAnalytics'
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/clients', authenticate, tenantIsolation, dashboardController.getClients.bind(dashboardController));

/**
 * @swagger
 * /api/v1/dashboard/staff-performance:
 *   get:
 *     summary: Get staff performance metrics
 *     description: Retrieve staff performance analytics including revenue, appointments, and utilization
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         description: Analysis period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter]
 *           default: month
 *       - in: query
 *         name: staffId
 *         description: Filter by specific staff member
 *         schema:
 *           type: string
 *       - in: query
 *         name: branchId
 *         description: Filter by specific branch
 *         schema:
 *           type: string
 *       - in: query
 *         name: metric
 *         description: Primary metric for sorting and analysis
 *         schema:
 *           type: string
 *           enum: [all, revenue, appointments, utilization, rating]
 *           default: all
 *     responses:
 *       200:
 *         description: Staff performance metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StaffPerformance'
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/staff-performance', authenticate, tenantIsolation, dashboardController.getStaffPerformance.bind(dashboardController));

/**
 * @swagger
 * /api/v1/dashboard/kpis:
 *   get:
 *     summary: Get KPI metrics
 *     description: Retrieve comprehensive Key Performance Indicators including business, operational, financial, and client KPIs
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPI metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     businessKPIs:
 *                       type: object
 *                       properties:
 *                         monthlyRecurringRevenue:
 *                           type: number
 *                         customerAcquisitionCost:
 *                           type: number
 *                         customerLifetimeValue:
 *                           type: number
 *                         churnRate:
 *                           type: number
 *                         averageAppointmentValue:
 *                           type: number
 *                         bookingConversionRate:
 *                           type: number
 *                         clientRetentionRate:
 *                           type: number
 *                         noShowRate:
 *                           type: number
 *                     operationalKPIs:
 *                       type: object
 *                     financialKPIs:
 *                       type: object
 *                     clientKPIs:
 *                       type: object
 *                     trends:
 *                       type: object
 *                     goals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           current:
 *                             type: number
 *                           target:
 *                             type: number
 *                           progress:
 *                             type: number
 *                           onTrack:
 *                             type: boolean
 *       500:
 *         description: Internal server error
 */
router.get('/kpis', authenticate, tenantIsolation, dashboardController.getKPIs.bind(dashboardController));

/**
 * @swagger
 * /api/v1/dashboard/config:
 *   get:
 *     summary: Get dashboard configuration
 *     description: Retrieve dashboard configuration including alert settings, refresh intervals, and display preferences
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     alertConfig:
 *                       type: object
 *                       properties:
 *                         lowRevenue:
 *                           type: object
 *                           properties:
 *                             threshold:
 *                               type: number
 *                             period:
 *                               type: string
 *                         highCancellationRate:
 *                           type: object
 *                         noShowRate:
 *                           type: object
 *                         lowUtilization:
 *                           type: object
 *                     refreshInterval:
 *                       type: number
 *                       description: Refresh interval in seconds
 *                     timezone:
 *                       type: string
 *                     currency:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
router.get('/config', authenticate, tenantIsolation, dashboardController.getConfig.bind(dashboardController));

/**
 * @swagger
 * /api/v1/dashboard/refresh:
 *   post:
 *     summary: Refresh dashboard cache
 *     description: Force refresh of dashboard cache to get the latest data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard cache refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     refreshed:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/refresh', authenticate, tenantIsolation, dashboardController.refreshCache.bind(dashboardController));

export default router;