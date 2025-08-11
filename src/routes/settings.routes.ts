import express from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for settings endpoints
const settingsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Maximum 30 requests per minute per IP
  message: {
    error: 'Too many settings requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all settings routes
router.use(settingsRateLimit);

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneralSettings:
 *       type: object
 *       properties:
 *         general:
 *           type: object
 *           properties:
 *             businessName:
 *               type: string
 *               example: "Beauty Salon"
 *             businessType:
 *               type: string
 *               example: "beauty_salon"
 *             timezone:
 *               type: string
 *               example: "America/New_York"
 *             currency:
 *               type: string
 *               example: "USD"
 *             dateFormat:
 *               type: string
 *               example: "MM/dd/yyyy"
 *             timeFormat:
 *               type: string
 *               example: "12h"
 *         contact:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *               example: "+1234567890"
 *             email:
 *               type: string
 *               example: "info@beautysalon.com"
 *             website:
 *               type: string
 *               example: "https://beautysalon.com"
 *             address:
 *               type: object
 *               properties:
 *                 street:
 *                   type: string
 *                 city:
 *                   type: string
 *                 state:
 *                   type: string
 *                 country:
 *                   type: string
 *                 zipCode:
 *                   type: string
 *         branding:
 *           type: object
 *           properties:
 *             logo:
 *               type: string
 *               format: url
 *             primaryColor:
 *               type: string
 *               example: "#3B82F6"
 *             secondaryColor:
 *               type: string
 *               example: "#10B981"
 *             theme:
 *               type: string
 *               enum: [light, dark, auto]
 *         operational:
 *           type: object
 *           properties:
 *             defaultAppointmentDuration:
 *               type: number
 *               example: 60
 *             bufferTimeBetweenAppointments:
 *               type: number
 *               example: 15
 *             maxAdvanceBookingDays:
 *               type: number
 *               example: 90
 *             minAdvanceBookingHours:
 *               type: number
 *               example: 2
 *             enableOnlineBooking:
 *               type: boolean
 *               example: true
 *         features:
 *           type: object
 *           properties:
 *             enableInventoryManagement:
 *               type: boolean
 *             enableFinancialReporting:
 *               type: boolean
 *             enableStaffScheduling:
 *               type: boolean
 *             enableClientPortal:
 *               type: boolean
 *             enableMultiBranch:
 *               type: boolean
 * 
 *     NotificationSettings:
 *       type: object
 *       properties:
 *         email:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             appointmentConfirmation:
 *               type: boolean
 *             appointmentReminder:
 *               type: boolean
 *             appointmentCancellation:
 *               type: boolean
 *             dailySummary:
 *               type: boolean
 *             weeklyReport:
 *               type: boolean
 *         sms:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             appointmentConfirmation:
 *               type: boolean
 *             appointmentReminder:
 *               type: boolean
 *             appointmentCancellation:
 *               type: boolean
 *             provider:
 *               type: string
 *               enum: [twilio, custom]
 *             reminderTimings:
 *               type: array
 *               items:
 *                 type: number
 *               example: [24, 2]
 *         whatsapp:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             appointmentConfirmation:
 *               type: boolean
 *             appointmentReminder:
 *               type: boolean
 *             appointmentCancellation:
 *               type: boolean
 *             marketingMessages:
 *               type: boolean
 *             provider:
 *               type: string
 *               enum: [twilio, custom]
 *             reminderTimings:
 *               type: array
 *               items:
 *                 type: number
 *         push:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             appointmentReminder:
 *               type: boolean
 *             newBooking:
 *               type: boolean
 *             cancellation:
 *               type: boolean
 * 
 *     IntegrationSettings:
 *       type: object
 *       properties:
 *         payment:
 *           type: object
 *           properties:
 *             stripe:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 publishableKey:
 *                   type: string
 *                 secretKey:
 *                   type: string
 *                 webhookSecret:
 *                   type: string
 *             paypal:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 clientId:
 *                   type: string
 *                 clientSecret:
 *                   type: string
 *                 environment:
 *                   type: string
 *                   enum: [sandbox, production]
 *         communication:
 *           type: object
 *           properties:
 *             twilio:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 accountSid:
 *                   type: string
 *                 authToken:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 whatsappNumber:
 *                   type: string
 *             smtp:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 host:
 *                   type: string
 *                 port:
 *                   type: number
 *                 secure:
 *                   type: boolean
 *                 username:
 *                   type: string
 *                 password:
 *                   type: string
 */

/**
 * @swagger
 * /api/v1/settings:
 *   get:
 *     summary: Get all company settings
 *     description: Retrieve comprehensive company settings including general, notification, and integration settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
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
 *                     general:
 *                       $ref: '#/components/schemas/GeneralSettings'
 *                     notifications:
 *                       $ref: '#/components/schemas/NotificationSettings'
 *                     integrations:
 *                       $ref: '#/components/schemas/IntegrationSettings'
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, tenantIsolation, settingsController.getSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings:
 *   put:
 *     summary: Update general settings
 *     description: Update company general settings including business info, contact, branding, operational, and features
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GeneralSettings'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GeneralSettings'
 *       400:
 *         description: Bad request - Validation error
 *       500:
 *         description: Internal server error
 */
router.put('/', authenticate, tenantIsolation, settingsController.updateSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/notifications:
 *   get:
 *     summary: Get notification settings
 *     description: Retrieve notification preferences for email, SMS, WhatsApp, and push notifications
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/NotificationSettings'
 *       500:
 *         description: Internal server error
 */
router.get('/notifications', authenticate, tenantIsolation, settingsController.getNotificationSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/notifications:
 *   put:
 *     summary: Update notification settings
 *     description: Update notification preferences for various communication channels
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationSettings'
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/NotificationSettings'
 *       400:
 *         description: Bad request - Validation error
 *       500:
 *         description: Internal server error
 */
router.put('/notifications', authenticate, tenantIsolation, settingsController.updateNotificationSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/integrations:
 *   get:
 *     summary: Get integration settings
 *     description: Retrieve third-party integration settings (sensitive data will be masked)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/IntegrationSettings'
 *       500:
 *         description: Internal server error
 */
router.get('/integrations', authenticate, tenantIsolation, settingsController.getIntegrationSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/integrations:
 *   put:
 *     summary: Update integration settings
 *     description: Update third-party integration configurations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IntegrationSettings'
 *     responses:
 *       200:
 *         description: Integration settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/IntegrationSettings'
 *       400:
 *         description: Bad request - Validation error
 *       500:
 *         description: Internal server error
 */
router.put('/integrations', authenticate, tenantIsolation, settingsController.updateIntegrationSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/integrations/test:
 *   post:
 *     summary: Test integration connection
 *     description: Test the configuration of a specific integration to ensure it's working properly
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - integration
 *               - config
 *             properties:
 *               integration:
 *                 type: string
 *                 enum: [twilio, stripe, google_calendar, smtp]
 *                 description: Integration type to test
 *               config:
 *                 type: object
 *                 description: Configuration parameters to test
 *                 properties:
 *                   accountSid:
 *                     type: string
 *                     description: For Twilio integration
 *                   authToken:
 *                     type: string
 *                     description: For Twilio integration
 *                   secretKey:
 *                     type: string
 *                     description: For Stripe integration
 *                   host:
 *                     type: string
 *                     description: For SMTP integration
 *                   port:
 *                     type: number
 *                     description: For SMTP integration
 *     responses:
 *       200:
 *         description: Integration test successful
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
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                     details:
 *                       type: object
 *       400:
 *         description: Integration test failed
 *       500:
 *         description: Internal server error
 */
router.post('/integrations/test', authenticate, tenantIsolation, settingsController.testIntegration.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/reset:
 *   post:
 *     summary: Reset settings to defaults
 *     description: Reset specific settings section or all settings to their default values
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               section:
 *                 type: string
 *                 enum: [general, notifications, integrations, all]
 *                 default: all
 *                 description: Section to reset or 'all' for complete reset
 *     responses:
 *       200:
 *         description: Settings reset successfully
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
 *                     section:
 *                       type: string
 *                     resetAt:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/reset', authenticate, tenantIsolation, settingsController.resetSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/export:
 *   get:
 *     summary: Export settings
 *     description: Export all company settings as a JSON file for backup or migration purposes
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings exported successfully
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
 *                     exportedAt:
 *                       type: string
 *                       format: date-time
 *                     companyId:
 *                       type: string
 *                     version:
 *                       type: string
 *                     settings:
 *                       type: object
 *                       description: Complete settings object
 *       500:
 *         description: Internal server error
 */
router.get('/export', authenticate, tenantIsolation, settingsController.exportSettings.bind(settingsController));

/**
 * @swagger
 * /api/v1/settings/categories:
 *   get:
 *     summary: Get settings categories
 *     description: Retrieve settings categories with their configuration status and available sections
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings categories retrieved successfully
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
 *                       configured:
 *                         type: boolean
 *                       sections:
 *                         type: array
 *                         items:
 *                           type: string
 *       500:
 *         description: Internal server error
 */
router.get('/categories', authenticate, tenantIsolation, settingsController.getSettingsCategories.bind(settingsController));

export default router;