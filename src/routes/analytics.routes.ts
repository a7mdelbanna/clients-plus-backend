import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
// import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Apply rate limiting to analytics endpoints (more generous limits)
// const analyticsRateLimit = rateLimitMiddleware({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 30, // 30 requests per window
//   message: 'Too many analytics requests, please try again later'
// });

// router.use(analyticsRateLimit);

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsQuery:
 *       type: object
 *       properties:
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date for analytics query
 *           example: "2024-01-01"
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date for analytics query
 *           example: "2024-01-31"
 *         groupBy:
 *           type: string
 *           enum: [day, week, month, year]
 *           description: How to group the analytics data
 *           example: "day"
 *         branchId:
 *           type: string
 *           description: Filter by specific branch
 *           example: "branch_123"
 *         staffId:
 *           type: string
 *           description: Filter by specific staff member
 *           example: "staff_456"
 *       required:
 *         - startDate
 *         - endDate
 */

/**
 * @swagger
 * /api/v1/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     description: Retrieve comprehensive revenue analytics including totals, growth rates, and breakdowns
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: How to group the data
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by specific branch
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *         description: Filter by specific staff member
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/revenue', analyticsController.getRevenueAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/appointments:
 *   get:
 *     summary: Get appointment analytics
 *     description: Retrieve comprehensive appointment analytics including status breakdown and trends
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment analytics retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/appointments', analyticsController.getAppointmentAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/clients:
 *   get:
 *     summary: Get client analytics
 *     description: Retrieve comprehensive client analytics including acquisition and retention metrics
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client analytics retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/clients', analyticsController.getClientAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/staff:
 *   get:
 *     summary: Get staff performance analytics
 *     description: Retrieve comprehensive staff performance analytics including revenue and utilization
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff performance analytics retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/staff', analyticsController.getStaffPerformance.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/services:
 *   get:
 *     summary: Get service analytics
 *     description: Retrieve comprehensive service analytics including popularity and performance metrics
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service analytics retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/services', analyticsController.getServiceAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/summary:
 *   get:
 *     summary: Get comprehensive analytics summary
 *     description: Retrieve all analytics data in a single request
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics summary retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/summary', analyticsController.getAnalyticsSummary.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     description: Get a quick overview of key analytics metrics for specified period
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: Time period for overview
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by specific branch
 *     responses:
 *       200:
 *         description: Analytics overview retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/overview', analyticsController.getAnalyticsOverview.bind(analyticsController));

// Dashboard endpoints
/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get dashboard metrics
 *     description: Retrieve real-time dashboard metrics and KPIs
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', analyticsController.getDashboardMetrics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/dashboard/sales:
 *   get:
 *     summary: Get dashboard sales metrics
 *     description: Retrieve sales metrics for dashboard (Firebase-compatible format)
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by specific branch
 *     responses:
 *       200:
 *         description: Dashboard sales metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/sales', analyticsController.getDashboardSalesMetrics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/sales:
 *   post:
 *     summary: Get comprehensive sales analytics
 *     description: Retrieve comprehensive sales analytics (Firebase-compatible format)
 *     tags:
 *       - Analytics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchId:
 *                 type: string
 *               staffId:
 *                 type: string
 *               productId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date
 *                   endDate:
 *                     type: string
 *                     format: date
 *                 required:
 *                   - startDate
 *                   - endDate
 *             required:
 *               - dateRange
 *     responses:
 *       200:
 *         description: Sales analytics retrieved successfully
 *       400:
 *         description: Invalid filters
 *       500:
 *         description: Internal server error
 */
router.post('/sales', analyticsController.getSalesAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/dashboard/kpis:
 *   get:
 *     summary: Get KPI metrics
 *     description: Retrieve comprehensive KPI metrics for business intelligence
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: KPI metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/kpis', analyticsController.getKPIs.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/dashboard/alerts:
 *   get:
 *     summary: Get dashboard alerts
 *     description: Retrieve current dashboard alerts and notifications
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard alerts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/alerts', analyticsController.getDashboardAlerts.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/dashboard/config:
 *   get:
 *     summary: Get dashboard configuration
 *     description: Retrieve dashboard configuration settings
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard configuration retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/config', analyticsController.getDashboardConfig.bind(analyticsController));

// Export endpoints
/**
 * @swagger
 * /api/v1/analytics/export/revenue:
 *   post:
 *     summary: Export revenue analytics
 *     description: Export revenue analytics data in various formats
 *     tags:
 *       - Analytics Export
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [pdf, excel, csv]
 *               includeCharts:
 *                 type: boolean
 *               includeRawData:
 *                 type: boolean
 *               fileName:
 *                 type: string
 *               orientation:
 *                 type: string
 *                 enum: [portrait, landscape]
 *               paperSize:
 *                 type: string
 *                 enum: [A4, Letter]
 *             required:
 *               - format
 *     responses:
 *       200:
 *         description: Revenue analytics exported successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Export failed
 */
router.post('/export/revenue', analyticsController.exportRevenueAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/export/appointments:
 *   post:
 *     summary: Export appointment analytics
 *     description: Export appointment analytics data in various formats
 *     tags:
 *       - Analytics Export
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [pdf, excel, csv]
 *               includeCharts:
 *                 type: boolean
 *               includeRawData:
 *                 type: boolean
 *               fileName:
 *                 type: string
 *             required:
 *               - format
 *     responses:
 *       200:
 *         description: Appointment analytics exported successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Export failed
 */
router.post('/export/appointments', analyticsController.exportAppointmentAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/export/clients:
 *   post:
 *     summary: Export client analytics
 *     description: Export client analytics data in various formats
 *     tags:
 *       - Analytics Export
 */
router.post('/export/clients', analyticsController.exportClientAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/export/staff:
 *   post:
 *     summary: Export staff performance analytics
 *     description: Export staff performance data in various formats
 *     tags:
 *       - Analytics Export
 */
router.post('/export/staff', analyticsController.exportStaffPerformance.bind(analyticsController));

/**
 * @swagger
 * /api/v1/analytics/export/services:
 *   post:
 *     summary: Export service analytics
 *     description: Export service analytics data in various formats
 *     tags:
 *       - Analytics Export
 */
router.post('/export/services', analyticsController.exportServiceAnalytics.bind(analyticsController));

// Cache management
/**
 * @swagger
 * /api/v1/analytics/cache/invalidate:
 *   post:
 *     summary: Invalidate analytics cache
 *     description: Clear all cached analytics data to force fresh calculations
 *     tags:
 *       - Analytics Management
 *     responses:
 *       200:
 *         description: Cache invalidated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Cache invalidation failed
 */
router.post('/cache/invalidate', analyticsController.invalidateCache.bind(analyticsController));

export { router as analyticsRoutes };