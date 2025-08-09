import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Apply rate limiting to report endpoints
const reportsRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window (reports are more resource intensive)
  message: 'Too many report requests, please try again later'
});

router.use(reportsRateLimit);

/**
 * @swagger
 * components:
 *   schemas:
 *     DailyReportQuery:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: Date for the daily report
 *           example: "2024-01-15"
 *       required:
 *         - date
 *     MonthlyReportQuery:
 *       type: object
 *       properties:
 *         month:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           description: Month for the report (1-12)
 *           example: 1
 *         year:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2030
 *           description: Year for the report
 *           example: 2024
 *       required:
 *         - month
 *         - year
 *     CustomReportRequest:
 *       type: object
 *       properties:
 *         reportType:
 *           type: string
 *           enum: [revenue, appointments, clients, staff, services, custom]
 *           description: Type of report to generate
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date for the report
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date for the report
 *         branchId:
 *           type: string
 *           description: Filter by specific branch
 *         staffId:
 *           type: string
 *           description: Filter by specific staff member
 *         serviceId:
 *           type: string
 *           description: Filter by specific service
 *         groupBy:
 *           type: string
 *           enum: [day, week, month]
 *           description: How to group the data
 *         metrics:
 *           type: array
 *           items:
 *             type: string
 *           description: Specific metrics to include
 *         filters:
 *           type: object
 *           description: Additional filters for the report
 *         format:
 *           type: string
 *           enum: [json, pdf, excel, csv]
 *           description: Output format for the report
 *       required:
 *         - reportType
 *         - startDate
 *         - endDate
 *     ExportOptions:
 *       type: object
 *       properties:
 *         format:
 *           type: string
 *           enum: [pdf, excel, csv]
 *           description: Export format
 *         template:
 *           type: string
 *           description: Template to use for export
 *         includeCharts:
 *           type: boolean
 *           description: Whether to include charts in export
 *         includeRawData:
 *           type: boolean
 *           description: Whether to include raw data in export
 *         fileName:
 *           type: string
 *           description: Custom file name for export
 *         orientation:
 *           type: string
 *           enum: [portrait, landscape]
 *           description: Page orientation (PDF only)
 *         paperSize:
 *           type: string
 *           enum: [A4, Letter]
 *           description: Paper size (PDF only)
 *       required:
 *         - format
 */

/**
 * @swagger
 * /api/v1/reports/daily:
 *   get:
 *     summary: Generate daily report
 *     description: Generate a comprehensive daily business report
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for the daily report
 *         example: "2024-01-15"
 *     responses:
 *       200:
 *         description: Daily report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Daily report data
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/daily', reportsController.generateDailyReport.bind(reportsController));

/**
 * @swagger
 * /api/v1/reports/monthly:
 *   get:
 *     summary: Generate monthly report
 *     description: Generate a comprehensive monthly business report
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month for the report (1-12)
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2030
 *         description: Year for the report
 *     responses:
 *       200:
 *         description: Monthly report generated successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/monthly', reportsController.generateMonthlyReport.bind(reportsController));

/**
 * @swagger
 * /api/v1/reports/custom:
 *   post:
 *     summary: Generate custom report
 *     description: Generate a custom report based on specified parameters
 *     tags:
 *       - Reports
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomReportRequest'
 *     responses:
 *       200:
 *         description: Custom report generated successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/custom', reportsController.generateCustomReport.bind(reportsController));

/**
 * @swagger
 * /api/v1/reports/templates:
 *   get:
 *     summary: Get available report templates
 *     description: Retrieve list of available report templates
 *     tags:
 *       - Reports
 *     responses:
 *       200:
 *         description: Report templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                       parameters:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/templates', reportsController.getReportTemplates.bind(reportsController));

// Export endpoints
/**
 * @swagger
 * /api/v1/reports/export/daily:
 *   post:
 *     summary: Export daily report
 *     description: Export daily report in specified format
 *     tags:
 *       - Reports Export
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for the daily report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExportOptions'
 *     responses:
 *       200:
 *         description: Daily report exported successfully
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
 *                     fileName:
 *                       type: string
 *                     downloadUrl:
 *                       type: string
 *                     fileSize:
 *                       type: number
 *                     mimeType:
 *                       type: string
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Export failed
 */
router.post('/export/daily', reportsController.exportDailyReport.bind(reportsController));

/**
 * @swagger
 * /api/v1/reports/export/monthly:
 *   post:
 *     summary: Export monthly report
 *     description: Export monthly report in specified format
 *     tags:
 *       - Reports Export
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2030
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExportOptions'
 *     responses:
 *       200:
 *         description: Monthly report exported successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Export failed
 */
router.post('/export/monthly', reportsController.exportMonthlyReport.bind(reportsController));

/**
 * @swagger
 * /api/v1/reports/export/custom:
 *   post:
 *     summary: Export custom report
 *     description: Export custom report in specified format
 *     tags:
 *       - Reports Export
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/CustomReportRequest'
 *               - $ref: '#/components/schemas/ExportOptions'
 *     responses:
 *       200:
 *         description: Custom report exported successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Export failed
 */
router.post('/export/custom', reportsController.exportCustomReport.bind(reportsController));

// Report history and management
/**
 * @swagger
 * /api/v1/reports/history:
 *   get:
 *     summary: Get report generation history
 *     description: Retrieve history of generated reports
 *     tags:
 *       - Reports Management
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, monthly, custom]
 *         description: Filter by report type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reports generated after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reports generated before this date
 *     responses:
 *       200:
 *         description: Report history retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/history', reportsController.getReportHistory.bind(reportsController));

// Scheduled reports
/**
 * @swagger
 * /api/v1/reports/scheduled:
 *   get:
 *     summary: Get scheduled reports
 *     description: Retrieve list of scheduled report configurations
 *     tags:
 *       - Scheduled Reports
 *     responses:
 *       200:
 *         description: Scheduled reports retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Schedule report generation
 *     description: Create a new scheduled report configuration
 *     tags:
 *       - Scheduled Reports
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [daily, monthly, custom]
 *               schedule:
 *                 type: string
 *                 description: Cron expression for scheduling
 *                 example: "0 9 * * *"
 *               parameters:
 *                 type: object
 *                 description: Report parameters
 *               exportFormat:
 *                 type: string
 *                 enum: [pdf, excel, csv]
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               isActive:
 *                 type: boolean
 *             required:
 *               - reportType
 *               - schedule
 *               - exportFormat
 *               - recipients
 *     responses:
 *       200:
 *         description: Report scheduled successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Scheduling failed
 */
router.get('/scheduled', reportsController.getScheduledReports.bind(reportsController));
router.post('/scheduled', reportsController.scheduleReport.bind(reportsController));

/**
 * @swagger
 * /api/v1/reports/scheduled/{id}:
 *   put:
 *     summary: Update scheduled report
 *     description: Update an existing scheduled report configuration
 *     tags:
 *       - Scheduled Reports
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scheduled report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schedule:
 *                 type: string
 *                 description: Cron expression for scheduling
 *               parameters:
 *                 type: object
 *                 description: Report parameters
 *               exportFormat:
 *                 type: string
 *                 enum: [pdf, excel, csv]
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Scheduled report updated successfully
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Scheduled report not found
 *       500:
 *         description: Update failed
 *   delete:
 *     summary: Delete scheduled report
 *     description: Delete an existing scheduled report configuration
 *     tags:
 *       - Scheduled Reports
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scheduled report ID
 *     responses:
 *       200:
 *         description: Scheduled report deleted successfully
 *       404:
 *         description: Scheduled report not found
 *       500:
 *         description: Deletion failed
 */
router.put('/scheduled/:id', reportsController.updateScheduledReport.bind(reportsController));
router.delete('/scheduled/:id', reportsController.deleteScheduledReport.bind(reportsController));

// Download endpoint
/**
 * @swagger
 * /api/v1/reports/download/{fileName}:
 *   get:
 *     summary: Download report file
 *     description: Download a generated report file
 *     tags:
 *       - Reports Export
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: File name to download
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *       500:
 *         description: Download failed
 */
router.get('/download/:fileName', reportsController.downloadReport.bind(reportsController));

// Report insights and analytics
/**
 * @swagger
 * /api/v1/reports/insights:
 *   get:
 *     summary: Get report insights
 *     description: Get insights about report generation patterns and usage
 *     tags:
 *       - Reports Management
 *     responses:
 *       200:
 *         description: Report insights retrieved successfully
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
 *                     mostGeneratedReports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           count:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                     popularExportFormats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           format:
 *                             type: string
 *                           count:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                     reportGenerationTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           count:
 *                             type: number
 *                     totalReportsGenerated:
 *                       type: number
 *                     scheduledReportsActive:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/insights', reportsController.getReportInsights.bind(reportsController));

export { router as reportsRoutes };