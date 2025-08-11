import { Request, Response } from 'express';
import { z } from 'zod';
import { WhatsAppService, whatsappService, WhatsAppTemplateParams, MessageResponse } from '../services/whatsapp.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const sendMessageSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  message: z.string().min(1, 'Message content is required'),
  mediaUrl: z.string().url().optional(),
});

const sendTemplateSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  templateType: z.enum(['confirmation', 'reminder', 'cancellation', 'reschedule']),
  templateParams: z.object({
    clientName: z.string().min(1),
    businessName: z.string().min(1),
    date: z.string().min(1),
    time: z.string().min(1),
    service: z.string().min(1),
    staffName: z.string().optional(),
    businessAddress: z.string().optional(),
    businessPhone: z.string().optional(),
    googleMapsLink: z.string().url().optional(),
    reminderTime: z.string().optional(),
    newDate: z.string().optional(),
    newTime: z.string().optional(),
  }),
});

const sendBulkSchema = z.object({
  recipients: z.array(z.object({
    phone: z.string().min(1),
    name: z.string().min(1),
  })).min(1, 'At least one recipient is required'),
  messageTemplate: z.string().min(1, 'Message template is required'),
  templateParams: z.object({
    businessName: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    service: z.string().optional(),
    staffName: z.string().optional(),
    businessAddress: z.string().optional(),
    businessPhone: z.string().optional(),
    googleMapsLink: z.string().url().optional(),
    reminderTime: z.string().optional(),
  }).optional(),
});

const webhookSchema = z.object({
  Body: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional(),
  MessageSid: z.string().optional(),
  AccountSid: z.string().optional(),
  MediaUrl0: z.string().optional(),
  NumMedia: z.string().optional(),
  SmsStatus: z.string().optional(),
  MessageStatus: z.string().optional(),
});

export class WhatsAppController {
  /**
   * Send a WhatsApp message
   * POST /api/v1/whatsapp/send
   */
  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = sendMessageSchema.parse(req.body);
      const { companyId } = req.user!;

      // Validate phone number format
      if (!whatsappService.validatePhoneNumber(validatedData.to)) {
        res.status(400).json(errorResponse('Invalid phone number format. Use international format (+1234567890)', 'INVALID_PHONE'));
        return;
      }

      // Send message
      const result = await whatsappService.sendWhatsAppMessage({
        to: validatedData.to,
        message: validatedData.message,
        mediaUrl: validatedData.mediaUrl,
      });

      // Log the message send attempt
      await prisma.notificationLog.create({
        data: {
          jobId: `whatsapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          companyId,
          type: 'WHATSAPP',
          recipient: validatedData.to,
          status: result.success ? 'SENT' : 'FAILED',
          error: result.error || null,
          sentAt: result.success ? new Date() : null,
          metadata: {
            subject: 'WhatsApp Message',
            content: validatedData.message,
            externalId: result.messageId || null,
            twilioSid: result.twilioSid,
            mediaUrl: validatedData.mediaUrl,
          },
        },
      });

      if (result.success) {
        logger.info(`WhatsApp message sent successfully: ${result.messageId}`, {
          companyId,
          recipient: validatedData.to,
          messageId: result.messageId,
        });

        res.json(successResponse({
          messageId: result.messageId,
          status: result.status,
          twilioSid: result.twilioSid,
        }, 'WhatsApp message sent successfully'));
      } else {
        logger.error(`WhatsApp message failed to send: ${result.error}`, {
          companyId,
          recipient: validatedData.to,
          error: result.error,
        });

        res.status(400).json(errorResponse(result.error || 'Failed to send WhatsApp message', 'WHATSAPP_SEND_FAILED'));
      }
    } catch (error) {
      logger.error('Error in sendMessage:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.issues));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Send a WhatsApp template message
   * POST /api/v1/whatsapp/send-template
   */
  async sendTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = sendTemplateSchema.parse(req.body);
      const { companyId } = req.user!;

      // Validate phone number format
      if (!whatsappService.validatePhoneNumber(validatedData.to)) {
        res.status(400).json(errorResponse('Invalid phone number format. Use international format (+1234567890)', 'INVALID_PHONE'));
        return;
      }

      let result: MessageResponse;

      // Send appropriate template message
      switch (validatedData.templateType) {
        case 'confirmation':
          result = await whatsappService.sendAppointmentConfirmation({
            ...validatedData.templateParams,
            to: validatedData.to,
          });
          break;
        case 'reminder':
          result = await whatsappService.sendAppointmentReminder({
            ...validatedData.templateParams,
            to: validatedData.to,
          });
          break;
        case 'cancellation':
          result = await whatsappService.sendAppointmentCancellation({
            ...validatedData.templateParams,
            to: validatedData.to,
          });
          break;
        case 'reschedule':
          result = await whatsappService.sendAppointmentReschedule({
            ...validatedData.templateParams,
            to: validatedData.to,
            newDate: validatedData.templateParams.newDate || validatedData.templateParams.date,
            newTime: validatedData.templateParams.newTime || validatedData.templateParams.time,
          });
          break;
        default:
          res.status(400).json(errorResponse('Invalid template type', 'INVALID_TEMPLATE_TYPE'));
          return;
      }

      // Log the template message send attempt
      await prisma.notificationLog.create({
        data: {
          jobId: `whatsapp-template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          companyId,
          type: 'WHATSAPP',
          recipient: validatedData.to,
          status: result.success ? 'SENT' : 'FAILED',
          error: result.error || null,
          sentAt: result.success ? new Date() : null,
          metadata: {
            subject: `WhatsApp ${validatedData.templateType} Template`,
            content: `Template: ${validatedData.templateType}`,
            externalId: result.messageId || null,
            templateType: validatedData.templateType,
            templateParams: validatedData.templateParams,
            twilioSid: result.twilioSid,
          },
        },
      });

      if (result.success) {
        logger.info(`WhatsApp template message sent successfully: ${result.messageId}`, {
          companyId,
          recipient: validatedData.to,
          templateType: validatedData.templateType,
          messageId: result.messageId,
        });

        res.json(successResponse({
          messageId: result.messageId,
          status: result.status,
          twilioSid: result.twilioSid,
          templateType: validatedData.templateType,
        }, `WhatsApp ${validatedData.templateType} template sent successfully`));
      } else {
        logger.error(`WhatsApp template message failed to send: ${result.error}`, {
          companyId,
          recipient: validatedData.to,
          templateType: validatedData.templateType,
          error: result.error,
        });

        res.status(400).json(errorResponse(result.error || 'Failed to send WhatsApp template message', 'WHATSAPP_TEMPLATE_FAILED'));
      }
    } catch (error) {
      logger.error('Error in sendTemplate:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.issues));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Send bulk WhatsApp messages
   * POST /api/v1/whatsapp/send-bulk
   */
  async sendBulkMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = sendBulkSchema.parse(req.body);
      const { companyId } = req.user!;

      // Validate all phone numbers
      const invalidNumbers = validatedData.recipients.filter(recipient => 
        !whatsappService.validatePhoneNumber(recipient.phone)
      );

      if (invalidNumbers.length > 0) {
        res.status(400).json(errorResponse(
          `Invalid phone numbers: ${invalidNumbers.map(r => r.phone).join(', ')}`,
          'INVALID_PHONE_NUMBERS'
        ));
        return;
      }

      // Send bulk messages
      const result = await whatsappService.sendBulkWhatsApp(
        validatedData.recipients,
        validatedData.messageTemplate,
        validatedData.templateParams || {}
      );

      // Log bulk send operation
      await prisma.notificationLog.create({
        data: {
          jobId: `whatsapp-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          companyId,
          type: 'WHATSAPP',
          recipient: `Bulk send to ${validatedData.recipients.length} recipients`,
          status: result.sent > 0 ? 'SENT' : 'FAILED',
          error: result.failed > 0 ? `${result.failed} messages failed` : null,
          sentAt: result.sent > 0 ? new Date() : null,
          metadata: {
            subject: 'WhatsApp Bulk Send',
            content: validatedData.messageTemplate,
            totalRecipients: validatedData.recipients.length,
            sentCount: result.sent,
            failedCount: result.failed,
            recipients: validatedData.recipients,
            results: result.results.map(r => ({
              success: r.success,
              messageId: r.messageId,
              status: r.status,
              error: r.error,
              twilioSid: r.twilioSid
            })),
          },
        },
      });

      logger.info(`WhatsApp bulk send completed: ${result.sent} sent, ${result.failed} failed`, {
        companyId,
        totalRecipients: validatedData.recipients.length,
        sentCount: result.sent,
        failedCount: result.failed,
      });

      res.json(successResponse({
        totalRecipients: validatedData.recipients.length,
        sent: result.sent,
        failed: result.failed,
        results: result.results,
      }, `Bulk WhatsApp send completed: ${result.sent} sent, ${result.failed} failed`));

    } catch (error) {
      logger.error('Error in sendBulkMessages:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.issues));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get WhatsApp message templates
   * GET /api/v1/whatsapp/templates
   */
  async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      // Get company info for template personalization
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          phone: true,
          address: true,
        },
      });

      if (!company) {
        res.status(404).json(errorResponse('Company not found', 'COMPANY_NOT_FOUND'));
        return;
      }

      const templates = [
        {
          id: 'confirmation',
          name: 'Appointment Confirmation',
          description: 'Send when an appointment is booked or confirmed',
          variables: ['clientName', 'businessName', 'date', 'time', 'service', 'staffName', 'businessAddress', 'businessPhone', 'googleMapsLink'],
          previewText: `*تأكيد الموعد في ${company.name}* 📅\n\nمرحباً {{clientName}}،\n\nتم تأكيد موعدك بنجاح:\n\n📅 *التاريخ:* {{date}}\n⏰ *الوقت:* {{time}}\n💇 *الخدمة:* {{service}}\n👤 *الأخصائي:* {{staffName}}\n\n🏢 *تفاصيل الصالون:*\n${company.name}\n\nنتطلع لرؤيتك! 🌟`
        },
        {
          id: 'reminder',
          name: 'Appointment Reminder',
          description: 'Send as a reminder before appointments',
          variables: ['clientName', 'businessName', 'date', 'time', 'service', 'staffName', 'reminderTime', 'googleMapsLink'],
          previewText: `*تذكير بموعدك في ${company.name}* ⏰\n\nمرحباً {{clientName}}،\n\nنذكرك بموعدك {{reminderTime}}:\n\n📅 *التاريخ:* {{date}}\n⏰ *الوقت:* {{time}}\n💇 *الخدمة:* {{service}}\n👤 *الأخصائي:* {{staffName}}\n\nنتطلع لرؤيتك! 🌟`
        },
        {
          id: 'cancellation',
          name: 'Appointment Cancellation',
          description: 'Send when an appointment is cancelled',
          variables: ['clientName', 'businessName', 'date', 'time', 'service', 'businessPhone'],
          previewText: `*إلغاء الموعد في ${company.name}* ❌\n\nمرحباً {{clientName}}،\n\nنأسف لإبلاغك بأن موعدك قد تم إلغاؤه:\n\n📅 *التاريخ:* {{date}}\n⏰ *الوقت:* {{time}}\n💇 *الخدمة:* {{service}}\n\nنعتذر عن أي إزعاج وبإمكانك التواصل معنا لحجز موعد جديد 🙏`
        },
        {
          id: 'reschedule',
          name: 'Appointment Reschedule',
          description: 'Send when an appointment is rescheduled',
          variables: ['clientName', 'businessName', 'newDate', 'newTime', 'service', 'staffName', 'businessAddress'],
          previewText: `*تغيير موعد في ${company.name}* 📅\n\nمرحباً {{clientName}}،\n\nتم تغيير موعدك إلى:\n\n📅 *التاريخ الجديد:* {{newDate}}\n⏰ *الوقت الجديد:* {{newTime}}\n💇 *الخدمة:* {{service}}\n👤 *الأخصائي:* {{staffName}}\n\nشكراً لتفهمك ونتطلع لرؤيتك في الموعد الجديد! 🌟`
        },
      ];

      res.json(successResponse(templates, 'WhatsApp templates retrieved successfully'));
    } catch (error) {
      logger.error('Error in getTemplates:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Handle WhatsApp webhook
   * POST /api/v1/whatsapp/webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = webhookSchema.parse(req.body);
      
      logger.info('WhatsApp webhook received:', validatedData);

      // Process webhook data
      const webhookData = {
        messageId: validatedData.MessageSid,
        from: validatedData.From,
        to: validatedData.To,
        body: validatedData.Body,
        status: validatedData.SmsStatus || validatedData.MessageStatus,
        mediaUrl: validatedData.MediaUrl0,
        numMedia: validatedData.NumMedia ? parseInt(validatedData.NumMedia) : 0,
        accountSid: validatedData.AccountSid,
      };

      // Update message status if we have a messageId
      if (webhookData.messageId) {
        await prisma.notificationLog.updateMany({
          where: {
            type: 'WHATSAPP',
            metadata: {
              path: ['externalId'],
              equals: webhookData.messageId,
            },
          },
          data: {
            status: webhookData.status === 'delivered' ? 'DELIVERED' : 
                   webhookData.status === 'failed' ? 'FAILED' : 'SENT',
            sentAt: webhookData.status === 'delivered' || webhookData.status === 'sent' ? new Date() : undefined,
            deliveredAt: webhookData.status === 'delivered' ? new Date() : undefined,
          },
        });
      }

      // Handle incoming messages (replies)
      if (webhookData.body && webhookData.from) {
        logger.info(`Incoming WhatsApp message from ${webhookData.from}: ${webhookData.body}`);
        
        // Here you could implement auto-reply logic or forward to staff
        // For now, we just log it
      }

      // Respond to webhook
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Error in handleWebhook:', error);
      res.status(200).send('OK'); // Always respond OK to Twilio
    }
  }

  /**
   * Get WhatsApp message status
   * GET /api/v1/whatsapp/status/:messageId
   */
  async getMessageStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { companyId } = req.user!;

      if (!messageId) {
        res.status(400).json(errorResponse('Message ID is required', 'MISSING_MESSAGE_ID'));
        return;
      }

      // Find message in notification logs
      const notificationLog = await prisma.notificationLog.findFirst({
        where: {
          companyId,
          type: 'WHATSAPP',
          metadata: {
            path: ['externalId'],
            equals: messageId,
          },
        },
        select: {
          id: true,
          status: true,
          error: true,
          recipient: true,
          createdAt: true,
          updatedAt: true,
          sentAt: true,
          deliveredAt: true,
          metadata: true,
        },
      });

      if (!notificationLog) {
        res.status(404).json(errorResponse('Message not found', 'MESSAGE_NOT_FOUND'));
        return;
      }

      res.json(successResponse({
        messageId: notificationLog.metadata ? (notificationLog.metadata as any).externalId : null,
        status: notificationLog.status,
        recipient: notificationLog.recipient,
        subject: notificationLog.metadata ? (notificationLog.metadata as any).subject : null,
        error: notificationLog.error,
        sentAt: notificationLog.sentAt || notificationLog.createdAt,
        deliveredAt: notificationLog.deliveredAt,
        lastUpdated: notificationLog.updatedAt,
        twilioSid: notificationLog.metadata ? (notificationLog.metadata as any).twilioSid : null,
      }, 'Message status retrieved successfully'));

    } catch (error) {
      logger.error('Error in getMessageStatus:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get WhatsApp configuration status
   * GET /api/v1/whatsapp/config
   */
  async getConfigStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const configStatus = whatsappService.getConfigurationStatus();

      res.json(successResponse({
        configured: configStatus.configured,
        details: configStatus.details,
        provider: 'Twilio',
      }, 'WhatsApp configuration status retrieved'));

    } catch (error) {
      logger.error('Error in getConfigStatus:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get WhatsApp message history
   * GET /api/v1/whatsapp/history
   */
  async getMessageHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;
      const { 
        recipient, 
        limit = 50, 
        offset = 0, 
        startDate, 
        endDate 
      } = req.query;

      const where: any = {
        companyId,
        type: 'WHATSAPP',
      };

      if (recipient) {
        where.recipient = {
          contains: recipient as string,
          mode: 'insensitive',
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      const [messages, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where,
          select: {
            id: true,
            recipient: true,
            status: true,
            error: true,
            createdAt: true,
            updatedAt: true,
            sentAt: true,
            deliveredAt: true,
            metadata: true,
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset),
        }),
        prisma.notificationLog.count({ where }),
      ]);

      res.json(successResponse({
        messages: messages.map(msg => ({
          ...msg,
          subject: msg.metadata ? (msg.metadata as any).subject : null,
          content: msg.metadata ? (msg.metadata as any).content : null,
          externalId: msg.metadata ? (msg.metadata as any).externalId : null,
        })),
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + Number(limit),
        },
      }, 'WhatsApp message history retrieved successfully'));

    } catch (error) {
      logger.error('Error in getMessageHistory:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }
}

// Export singleton instance
export const whatsappController = new WhatsAppController();