import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { notificationQueue, NotificationJob, NotificationJobData } from '../services/queue.service';
import { whatsappService } from '../services/whatsapp.service';
import { messageTemplateService } from '../templates/messages';
import { validateRequest } from '../utils/validation';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const SendNotificationSchema = z.object({
  type: z.enum(['whatsapp', 'sms', 'email', 'push']),
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    language: z.enum(['en', 'ar']).optional(),
    pushToken: z.string().optional()
  }),
  message: z.object({
    templateId: z.string().optional(),
    content: z.string().optional(),
    subject: z.string().optional(),
    variables: z.record(z.string()).optional()
  }),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  appointmentId: z.string().optional()
});

const ScheduleNotificationSchema = SendNotificationSchema.extend({
  scheduledFor: z.string().datetime()
});

const BulkNotificationSchema = z.object({
  type: z.enum(['whatsapp', 'sms', 'email', 'push']),
  recipients: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    language: z.enum(['en', 'ar']).optional(),
    pushToken: z.string().optional()
  })).min(1),
  message: z.object({
    templateId: z.string().optional(),
    content: z.string().optional(),
    subject: z.string().optional(),
    variables: z.record(z.string()).optional()
  }),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal')
});

export class NotificationController {
  
  /**
   * Send immediate notification
   */
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = validateRequest(SendNotificationSchema, req.body);
      const user = (req as any).user;
      
      // Validate recipient based on notification type
      await this.validateRecipientForType(validatedData.type, validatedData.recipient);
      
      // Validate template if provided
      if (validatedData.message.templateId) {
        const validation = messageTemplateService.validateTemplateVariables(
          validatedData.message.templateId,
          validatedData.message.variables || {}
        );
        
        if (!validation.valid) {
          res.status(400).json({
            success: false,
            message: 'Template validation failed',
            errors: {
              missingVariables: validation.missingVariables,
              extraVariables: validation.extraVariables
            }
          });
          return;
        }
      }

      // Create notification job
      const job: NotificationJob = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: validatedData.type,
        priority: validatedData.priority,
        companyId: user.companyId,
        branchId: user.branchId,
        userId: user.id,
        data: {
          recipient: validatedData.recipient,
          message: validatedData.message,
          ...(validatedData.appointmentId && {
            appointment: await this.getAppointmentData(validatedData.appointmentId)
          })
        }
      };

      // Add to queue
      const queueJob = await notificationQueue.addNotification(job);

      res.status(200).json({
        success: true,
        message: 'Notification queued successfully',
        data: {
          jobId: job.id,
          queueJobId: queueJob.id,
          type: job.type,
          priority: job.priority,
          recipient: job.data.recipient.name,
          estimatedProcessingTime: this.getEstimatedProcessingTime(job.type)
        }
      });

    } catch (error: any) {
      console.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: error.message
      });
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = validateRequest(ScheduleNotificationSchema, req.body);
      const user = (req as any).user;
      
      const scheduledFor = new Date(validatedData.scheduledFor);
      
      // Validate scheduled time is in the future
      if (scheduledFor <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'Scheduled time must be in the future'
        });
        return;
      }

      // Validate recipient based on notification type
      await this.validateRecipientForType(validatedData.type, validatedData.recipient);

      // Create notification job
      const job: NotificationJob = {
        id: `scheduled_notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: validatedData.type,
        priority: validatedData.priority,
        companyId: user.companyId,
        branchId: user.branchId,
        userId: user.id,
        scheduledFor,
        data: {
          recipient: validatedData.recipient,
          message: validatedData.message,
          ...(validatedData.appointmentId && {
            appointment: await this.getAppointmentData(validatedData.appointmentId)
          })
        }
      };

      // Schedule in queue
      const queueJob = await notificationQueue.scheduleNotification(job, scheduledFor);

      res.status(200).json({
        success: true,
        message: 'Notification scheduled successfully',
        data: {
          jobId: job.id,
          queueJobId: queueJob.id,
          type: job.type,
          scheduledFor: scheduledFor.toISOString(),
          recipient: job.data.recipient.name
        }
      });

    } catch (error: any) {
      console.error('Error scheduling notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule notification',
        error: error.message
      });
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = validateRequest(BulkNotificationSchema, req.body);
      const user = (req as any).user;

      // Validate each recipient
      for (const recipient of validatedData.recipients) {
        await this.validateRecipientForType(validatedData.type, recipient);
      }

      // Create jobs for each recipient
      const jobs: NotificationJob[] = validatedData.recipients.map((recipient, index) => ({
        id: `bulk_notification_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        type: validatedData.type,
        priority: validatedData.priority,
        companyId: user.companyId,
        branchId: user.branchId,
        userId: user.id,
        data: {
          recipient,
          message: validatedData.message
        }
      }));

      // Add bulk jobs to queue
      const queueJobs = await notificationQueue.addBulkNotifications(jobs);

      res.status(200).json({
        success: true,
        message: 'Bulk notifications queued successfully',
        data: {
          totalJobs: jobs.length,
          jobIds: jobs.map(job => job.id),
          type: validatedData.type,
          priority: validatedData.priority,
          estimatedProcessingTime: this.getEstimatedProcessingTime(validatedData.type) * jobs.length
        }
      });

    } catch (error: any) {
      console.error('Error sending bulk notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk notifications',
        error: error.message
      });
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const {
        page = '1',
        limit = '50',
        type,
        status,
        startDate,
        endDate
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const where: any = {
        companyId: user.companyId
      };

      if (user.branchId) {
        where.branchId = user.branchId;
      }

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [notifications, totalCount] = await Promise.all([
        prisma.notificationLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limitNum,
          skip: offset,
        }),
        prisma.notificationLog.count({ where })
      ]);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitNum)
          }
        }
      });

    } catch (error: any) {
      console.error('Error getting notification history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification history',
        error: error.message
      });
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await notificationQueue.getQueueStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('Error getting queue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue statistics',
        error: error.message
      });
    }
  }

  /**
   * Retry failed notification
   */
  async retryFailedNotification(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      await notificationQueue.retryFailedJob(jobId);

      res.status(200).json({
        success: true,
        message: 'Job retried successfully'
      });

    } catch (error: any) {
      console.error('Error retrying notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry notification',
        error: error.message
      });
    }
  }

  /**
   * Get failed notifications
   */
  async getFailedNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '50' } = req.query;
      const limitNum = parseInt(limit as string);

      const failedJobs = await notificationQueue.getFailedJobs(limitNum);

      res.status(200).json({
        success: true,
        data: failedJobs.map(job => ({
          id: job.id,
          data: job.data,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade
        }))
      });

    } catch (error: any) {
      console.error('Error getting failed notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get failed notifications',
        error: error.message
      });
    }
  }

  /**
   * WhatsApp webhook for status updates
   */
  async whatsappWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { MessageSid, MessageStatus, From, To, Body } = req.body;

      console.log('WhatsApp webhook received:', {
        MessageSid,
        MessageStatus,
        From,
        To,
        Body
      });

      // Update notification log with delivery status
      const updated = await prisma.notificationLog.updateMany({
        where: {
          result: {
            contains: MessageSid
          }
        },
        data: {
          status: MessageStatus,
          updatedAt: new Date(),
          metadata: JSON.stringify({
            twilioStatus: MessageStatus,
            deliveredAt: new Date().toISOString()
          })
        }
      });

      console.log(`Updated ${updated.count} notification logs with status ${MessageStatus}`);

      res.status(200).send('OK');

    } catch (error: any) {
      console.error('Error processing WhatsApp webhook:', error);
      res.status(500).send('Error processing webhook');
    }
  }

  /**
   * Get available message templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { type, channel } = req.query;

      let templates = messageTemplateService.getAllTemplates();

      if (type) {
        templates = templates.filter(template => template.type === type);
      }

      if (channel) {
        templates = templates.filter(template => 
          template.channels.includes(channel as any)
        );
      }

      res.status(200).json({
        success: true,
        data: templates
      });

    } catch (error: any) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get templates',
        error: error.message
      });
    }
  }

  /**
   * Preview message template
   */
  async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { language = 'ar' } = req.query;

      const preview = messageTemplateService.previewTemplate(templateId, language as 'en' | 'ar');

      if (!preview) {
        res.status(404).json({
          success: false,
          message: 'Template not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          templateId,
          language,
          preview
        }
      });

    } catch (error: any) {
      console.error('Error previewing template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview template',
        error: error.message
      });
    }
  }

  /**
   * Get WhatsApp service status
   */
  async getWhatsAppStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = whatsappService.getConfigurationStatus();

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error: any) {
      console.error('Error getting WhatsApp status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get WhatsApp status',
        error: error.message
      });
    }
  }

  /**
   * Helper methods
   */
  private async validateRecipientForType(
    type: 'whatsapp' | 'sms' | 'email' | 'push',
    recipient: any
  ): Promise<void> {
    switch (type) {
      case 'whatsapp':
      case 'sms':
        if (!recipient.phone) {
          throw new Error(`Phone number is required for ${type} notifications`);
        }
        if (!whatsappService.validatePhoneNumber(recipient.phone)) {
          throw new Error('Invalid phone number format');
        }
        break;
      
      case 'email':
        if (!recipient.email) {
          throw new Error('Email address is required for email notifications');
        }
        break;
      
      case 'push':
        if (!recipient.pushToken) {
          throw new Error('Push token is required for push notifications');
        }
        break;
    }
  }

  private async getAppointmentData(appointmentId: string): Promise<any> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        staff: true,
        company: true,
        branch: true
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return {
      id: appointment.id,
      date: appointment.date.toISOString().split('T')[0],
      time: appointment.startTime,
      serviceName: (appointment.services as any[])?.[0]?.serviceName || 'Service',
      staffName: appointment.staff?.name,
      businessName: appointment.company.name,
      businessAddress: appointment.branch?.address as string,
      businessPhone: appointment.branch?.contact as string
    };
  }

  private getEstimatedProcessingTime(type: 'whatsapp' | 'sms' | 'email' | 'push'): number {
    const times = {
      whatsapp: 2000, // 2 seconds
      sms: 1000,      // 1 second
      email: 3000,    // 3 seconds
      push: 500       // 0.5 seconds
    };
    
    return times[type];
  }
}

export const notificationController = new NotificationController();