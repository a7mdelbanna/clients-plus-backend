import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for different types of notification endpoints
const generalNotificationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: 'Too many notification requests, please try again later.'
  }
});

const bulkNotificationLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 bulk requests per 5 minutes
  message: {
    success: false,
    message: 'Too many bulk notification requests, please try again later.'
  }
});

const webhookLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Allow high volume for webhooks
  message: 'Webhook rate limit exceeded'
});

// Public webhook endpoints (no authentication required)
router.post(
  '/webhooks/whatsapp',
  webhookLimit,
  notificationController.whatsappWebhook.bind(notificationController)
);

// Apply authentication to all other routes
router.use(authenticateToken);

// Send immediate notification
router.post(
  '/send',
  generalNotificationLimit,
  notificationController.sendNotification.bind(notificationController)
);

// Schedule notification for later
router.post(
  '/schedule',
  generalNotificationLimit,
  notificationController.scheduleNotification.bind(notificationController)
);

// Send bulk notifications
router.post(
  '/bulk',
  bulkNotificationLimit,
  notificationController.sendBulkNotifications.bind(notificationController)
);

// Get notification history
router.get(
  '/history',
  notificationController.getNotificationHistory.bind(notificationController)
);

// Get queue statistics
router.get(
  '/queue/stats',
  notificationController.getQueueStats.bind(notificationController)
);

// Get failed notifications
router.get(
  '/queue/failed',
  notificationController.getFailedNotifications.bind(notificationController)
);

// Retry failed notification
router.post(
  '/queue/retry/:jobId',
  notificationController.retryFailedNotification.bind(notificationController)
);

// Template management
router.get(
  '/templates',
  notificationController.getTemplates.bind(notificationController)
);

router.get(
  '/templates/:templateId/preview',
  notificationController.previewTemplate.bind(notificationController)
);

// Service status endpoints
router.get(
  '/whatsapp/status',
  notificationController.getWhatsAppStatus.bind(notificationController)
);

export default router;