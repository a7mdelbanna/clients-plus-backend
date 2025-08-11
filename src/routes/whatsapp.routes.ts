import express from 'express';
import { whatsappController } from '../controllers/whatsapp.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for WhatsApp endpoints
const whatsappRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Maximum 30 requests per minute per IP
  message: {
    error: 'Too many WhatsApp requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bulk messaging has stricter rate limiting
const bulkRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Maximum 5 bulk requests per minute per IP
  message: {
    error: 'Too many bulk WhatsApp requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all WhatsApp routes
router.use(whatsappRateLimit);

/**
 * @swagger
 * components:
 *   schemas:
 *     WhatsAppMessage:
 *       type: object
 *       required:
 *         - to
 *         - message
 *       properties:
 *         to:
 *           type: string
 *           description: Recipient phone number in international format
 *           example: "+201234567890"
 *         message:
 *           type: string
 *           description: Message content
 *           example: "Hello! Your appointment is confirmed."
 *         mediaUrl:
 *           type: string
 *           format: url
 *           description: Optional media URL to send with message
 * 
 *     WhatsAppTemplate:
 *       type: object
 *       required:
 *         - to
 *         - templateType
 *         - templateParams
 *       properties:
 *         to:
 *           type: string
 *           description: Recipient phone number
 *           example: "+201234567890"
 *         templateType:
 *           type: string
 *           enum: [confirmation, reminder, cancellation, reschedule]
 *           description: Type of template message
 *         templateParams:
 *           type: object
 *           properties:
 *             clientName:
 *               type: string
 *               example: "أحمد محمد"
 *             businessName:
 *               type: string
 *               example: "صالون النجوم"
 *             date:
 *               type: string
 *               example: "2024-01-15"
 *             time:
 *               type: string
 *               example: "14:30"
 *             service:
 *               type: string
 *               example: "قص شعر"
 *             staffName:
 *               type: string
 *               example: "سارة أحمد"
 * 
 *     BulkWhatsAppMessage:
 *       type: object
 *       required:
 *         - recipients
 *         - messageTemplate
 *       properties:
 *         recipients:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+201234567890"
 *               name:
 *                 type: string
 *                 example: "أحمد محمد"
 *         messageTemplate:
 *           type: string
 *           description: Message template with variables like {{clientName}}
 *           example: "مرحباً {{clientName}}، موعدك غداً الساعة 2:30 مساءً"
 *         templateParams:
 *           type: object
 *           description: Default parameters for template variables
 */

/**
 * @swagger
 * /api/v1/whatsapp/send:
 *   post:
 *     summary: Send WhatsApp message
 *     description: Send a single WhatsApp message to a recipient
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WhatsAppMessage'
 *     responses:
 *       200:
 *         description: Message sent successfully
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
 *                     messageId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     twilioSid:
 *                       type: string
 *       400:
 *         description: Bad request - Invalid data or phone number
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post('/send', authenticate, tenantIsolation, whatsappController.sendMessage.bind(whatsappController));

/**
 * @swagger
 * /api/v1/whatsapp/send-template:
 *   post:
 *     summary: Send WhatsApp template message
 *     description: Send a predefined template message (confirmation, reminder, etc.)
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WhatsAppTemplate'
 *     responses:
 *       200:
 *         description: Template message sent successfully
 *       400:
 *         description: Bad request - Invalid template type or parameters
 *       500:
 *         description: Internal server error
 */
router.post('/send-template', authenticate, tenantIsolation, whatsappController.sendTemplate.bind(whatsappController));

/**
 * @swagger
 * /api/v1/whatsapp/send-bulk:
 *   post:
 *     summary: Send bulk WhatsApp messages
 *     description: Send WhatsApp messages to multiple recipients with rate limiting
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkWhatsAppMessage'
 *     responses:
 *       200:
 *         description: Bulk messages processed
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
 *                     totalRecipients:
 *                       type: number
 *                     sent:
 *                       type: number
 *                     failed:
 *                       type: number
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Bad request - Invalid recipients or message template
 *       429:
 *         description: Too many bulk requests
 *       500:
 *         description: Internal server error
 */
router.post('/send-bulk', bulkRateLimit, authenticate, tenantIsolation, whatsappController.sendBulkMessages.bind(whatsappController));

/**
 * @swagger
 * /api/v1/whatsapp/templates:
 *   get:
 *     summary: Get WhatsApp message templates
 *     description: Retrieve available WhatsApp message templates with preview
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
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
 *                       variables:
 *                         type: array
 *                         items:
 *                           type: string
 *                       previewText:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/templates', authenticate, tenantIsolation, whatsappController.getTemplates.bind(whatsappController));

/**
 * @swagger
 * /api/v1/whatsapp/webhook:
 *   post:
 *     summary: WhatsApp webhook endpoint
 *     description: Receive WhatsApp status updates and incoming messages from Twilio
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               MessageSid:
 *                 type: string
 *               Body:
 *                 type: string
 *               From:
 *                 type: string
 *               To:
 *                 type: string
 *               SmsStatus:
 *                 type: string
 *               MessageStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "OK"
 */
router.post('/webhook', whatsappController.handleWebhook.bind(whatsappController));

/**
 * @swagger
 * /api/v1/whatsapp/status/{messageId}:
 *   get:
 *     summary: Get WhatsApp message status
 *     description: Check the delivery status of a specific WhatsApp message
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         description: WhatsApp message ID to check
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message status retrieved successfully
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
 *                     messageId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [SENT, DELIVERED, FAILED, PENDING]
 *                     recipient:
 *                       type: string
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
router.get('/status/:messageId', authenticate, tenantIsolation, whatsappController.getMessageStatus.bind(whatsappController));

/**
 * @swagger
 * /api/v1/whatsapp/config:
 *   get:
 *     summary: Get WhatsApp configuration status
 *     description: Check if WhatsApp integration is properly configured
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration status retrieved
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
 *                     configured:
 *                       type: boolean
 *                     details:
 *                       type: string
 *                     provider:
 *                       type: string
 *                       example: "Twilio"
 */
router.get('/config', authenticate, tenantIsolation, whatsappController.getConfigStatus.bind(whatsappController));

/**
 * @swagger
 * /api/v1/whatsapp/history:
 *   get:
 *     summary: Get WhatsApp message history
 *     description: Retrieve WhatsApp message history with pagination and filters
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: recipient
 *         description: Filter by recipient phone number
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         description: Number of messages to return (max 100)
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         description: Number of messages to skip
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: startDate
 *         description: Start date for filtering (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         description: End date for filtering (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Message history retrieved successfully
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
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           externalId:
 *                             type: string
 *                           recipient:
 *                             type: string
 *                           subject:
 *                             type: string
 *                           content:
 *                             type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       500:
 *         description: Internal server error
 */
router.get('/history', authenticate, tenantIsolation, whatsappController.getMessageHistory.bind(whatsappController));

export default router;