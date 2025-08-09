import Bull, { Queue, Job } from 'bull';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from './whatsapp.service';
import { messageTemplateService } from '../templates/messages';

const prisma = new PrismaClient();

export interface NotificationJob {
  id: string;
  type: 'whatsapp' | 'sms' | 'email' | 'push';
  priority: 'low' | 'normal' | 'high' | 'critical';
  data: NotificationJobData;
  companyId: string;
  branchId?: string;
  userId?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationJobData {
  recipient: {
    phone?: string;
    email?: string;
    name: string;
    language?: 'en' | 'ar';
    pushToken?: string;
  };
  message: {
    templateId?: string;
    content?: string;
    subject?: string;
    variables?: Record<string, string>;
  };
  appointment?: {
    id: string;
    date: string;
    time: string;
    serviceName: string;
    staffName?: string;
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export class NotificationQueue {
  private queue: Queue;
  private isProcessing: boolean = false;

  constructor() {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.queue = new Bull('notifications', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupProcessors();
    this.setupEventHandlers();
  }

  /**
   * Add notification to queue
   */
  async addNotification(job: NotificationJob, delay?: number): Promise<Bull.Job<NotificationJob>> {
    try {
      const jobOptions: Bull.JobOptions = {
        priority: this.getPriorityValue(job.priority),
        delay,
        jobId: job.id,
        removeOnComplete: job.type === 'email' ? 200 : 100, // Keep more email records
        removeOnFail: job.type === 'whatsapp' ? 100 : 50, // Keep more WhatsApp failures for debugging
      };

      // Add retry logic for critical notifications
      if (job.priority === 'critical') {
        jobOptions.attempts = 5;
        jobOptions.backoff = {
          type: 'exponential',
          delay: 1000
        };
      }

      const queueJob = await this.queue.add(job, jobOptions);
      
      console.log(`Added ${job.type} notification to queue:`, {
        jobId: job.id,
        type: job.type,
        priority: job.priority,
        recipient: job.data.recipient.name,
        delay
      });

      // Log to database
      await this.logNotificationJob(job, queueJob.id.toString(), 'queued');

      return queueJob;
    } catch (error) {
      console.error('Error adding notification to queue:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(job: NotificationJob, scheduledFor: Date): Promise<Bull.Job<NotificationJob>> {
    const delay = scheduledFor.getTime() - Date.now();
    
    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    job.scheduledFor = scheduledFor;
    return await this.addNotification(job, delay);
  }

  /**
   * Add bulk notifications efficiently
   */
  async addBulkNotifications(jobs: NotificationJob[]): Promise<Bull.Job<NotificationJob>[]> {
    try {
      const bulkJobs = jobs.map(job => ({
        name: 'bulk',
        data: job,
        opts: {
          priority: this.getPriorityValue(job.priority),
          jobId: job.id
        }
      }));

      const queueJobs = await this.queue.addBulk(bulkJobs);
      
      console.log(`Added ${jobs.length} bulk notifications to queue`);

      // Log bulk jobs
      for (let i = 0; i < jobs.length; i++) {
        await this.logNotificationJob(jobs[i], queueJobs[i].id.toString(), 'queued');
      }

      return queueJobs;
    } catch (error) {
      console.error('Error adding bulk notifications to queue:', error);
      throw error;
    }
  }

  /**
   * Setup job processors for different notification types
   */
  private setupProcessors(): void {
    // WhatsApp processor
    this.queue.process('whatsapp', 5, async (job: Job<NotificationJob>) => {
      return await this.processWhatsApp(job.data);
    });

    // SMS processor
    this.queue.process('sms', 10, async (job: Job<NotificationJob>) => {
      return await this.processSMS(job.data);
    });

    // Email processor
    this.queue.process('email', 3, async (job: Job<NotificationJob>) => {
      return await this.processEmail(job.data);
    });

    // Push notification processor
    this.queue.process('push', 20, async (job: Job<NotificationJob>) => {
      return await this.processPushNotification(job.data);
    });

    // Generic processor for bulk operations
    this.queue.process('bulk', 5, async (job: Job<NotificationJob>) => {
      const jobData = job.data;
      
      switch (jobData.type) {
        case 'whatsapp':
          return await this.processWhatsApp(jobData);
        case 'sms':
          return await this.processSMS(jobData);
        case 'email':
          return await this.processEmail(jobData);
        case 'push':
          return await this.processPushNotification(jobData);
        default:
          throw new Error(`Unknown notification type: ${jobData.type}`);
      }
    });

    console.log('Notification queue processors initialized');
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.queue.on('completed', async (job: Job<NotificationJob>) => {
      console.log(`Notification job completed: ${job.data.id} (${job.data.type})`);
      await this.logNotificationJob(job.data, job.id.toString(), 'completed', job.returnvalue);
    });

    this.queue.on('failed', async (job: Job<NotificationJob>, error: Error) => {
      console.error(`Notification job failed: ${job.data.id} (${job.data.type})`, error.message);
      await this.logNotificationJob(job.data, job.id.toString(), 'failed', null, error.message);
    });

    this.queue.on('stalled', (job: Job<NotificationJob>) => {
      console.warn(`Notification job stalled: ${job.data.id} (${job.data.type})`);
    });

    this.queue.on('progress', (job: Job<NotificationJob>, progress: number) => {
      console.log(`Notification job progress: ${job.data.id} - ${progress}%`);
    });
  }

  /**
   * Process WhatsApp notification
   */
  private async processWhatsApp(jobData: NotificationJob): Promise<any> {
    try {
      const { recipient, message, appointment } = jobData.data;
      
      if (!recipient.phone) {
        throw new Error('Phone number is required for WhatsApp notifications');
      }

      let messageContent: string;

      // Use template if provided
      if (message.templateId && message.variables) {
        const rendered = messageTemplateService.renderTemplate(
          message.templateId,
          message.variables,
          recipient.language || 'ar'
        );
        if (!rendered) {
          throw new Error(`Template not found: ${message.templateId}`);
        }
        messageContent = rendered;
      } else if (message.content) {
        messageContent = message.content;
      } else {
        throw new Error('Either templateId with variables or content must be provided');
      }

      // Send WhatsApp message
      const result = await whatsappService.sendWhatsAppMessage({
        to: recipient.phone,
        message: messageContent
      });

      if (!result.success) {
        throw new Error(result.error || 'WhatsApp send failed');
      }

      return {
        success: true,
        messageId: result.messageId,
        twilioSid: result.twilioSid,
        status: result.status
      };

    } catch (error) {
      console.error('Error processing WhatsApp notification:', error);
      throw error;
    }
  }

  /**
   * Process SMS notification
   */
  private async processSMS(jobData: NotificationJob): Promise<any> {
    try {
      const { recipient, message } = jobData.data;
      
      if (!recipient.phone) {
        throw new Error('Phone number is required for SMS notifications');
      }

      let messageContent: string;

      if (message.templateId && message.variables) {
        const rendered = messageTemplateService.renderTemplate(
          message.templateId,
          message.variables,
          recipient.language || 'ar'
        );
        if (!rendered) {
          throw new Error(`Template not found: ${message.templateId}`);
        }
        messageContent = rendered;
      } else if (message.content) {
        messageContent = message.content;
      } else {
        throw new Error('Either templateId with variables or content must be provided');
      }

      // TODO: Integrate with SMS provider (Twilio SMS, AWS SNS, etc.)
      console.log(`SMS to ${recipient.phone}: ${messageContent}`);
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        messageId: `sms_${Date.now()}`,
        status: 'sent'
      };

    } catch (error) {
      console.error('Error processing SMS notification:', error);
      throw error;
    }
  }

  /**
   * Process email notification
   */
  private async processEmail(jobData: NotificationJob): Promise<any> {
    try {
      const { recipient, message } = jobData.data;
      
      if (!recipient.email) {
        throw new Error('Email address is required for email notifications');
      }

      let subject: string;
      let content: string;

      if (message.templateId && message.variables) {
        const template = messageTemplateService.getTemplateById(message.templateId);
        if (!template) {
          throw new Error(`Template not found: ${message.templateId}`);
        }

        const rendered = messageTemplateService.renderTemplate(
          message.templateId,
          message.variables,
          recipient.language || 'ar'
        );
        if (!rendered) {
          throw new Error('Failed to render template');
        }

        subject = message.subject || `Notification from ${message.variables?.businessName || 'Business'}`;
        content = rendered;
      } else {
        subject = message.subject || 'Notification';
        content = message.content || '';
      }

      // TODO: Integrate with email provider (SendGrid, AWS SES, etc.)
      console.log(`Email to ${recipient.email}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${content}`);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        success: true,
        messageId: `email_${Date.now()}`,
        status: 'sent'
      };

    } catch (error) {
      console.error('Error processing email notification:', error);
      throw error;
    }
  }

  /**
   * Process push notification
   */
  private async processPushNotification(jobData: NotificationJob): Promise<any> {
    try {
      const { recipient, message } = jobData.data;
      
      if (!recipient.pushToken) {
        throw new Error('Push token is required for push notifications');
      }

      let messageContent: string;

      if (message.templateId && message.variables) {
        const rendered = messageTemplateService.renderTemplate(
          message.templateId,
          message.variables,
          recipient.language || 'ar'
        );
        if (!rendered) {
          throw new Error(`Template not found: ${message.templateId}`);
        }
        messageContent = rendered;
      } else if (message.content) {
        messageContent = message.content;
      } else {
        throw new Error('Either templateId with variables or content must be provided');
      }

      // TODO: Integrate with push notification service (Firebase FCM, etc.)
      console.log(`Push notification to ${recipient.pushToken}: ${messageContent}`);
      
      // Simulate push sending delay
      await new Promise(resolve => setTimeout(resolve, 200));

      return {
        success: true,
        messageId: `push_${Date.now()}`,
        status: 'sent'
      };

    } catch (error) {
      console.error('Error processing push notification:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }

  /**
   * Get failed jobs for retry
   */
  async getFailedJobs(limit: number = 50): Promise<Bull.Job<NotificationJob>[]> {
    return await this.queue.getFailed(0, limit - 1);
  }

  /**
   * Retry failed job
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.retry();
      console.log(`Retrying failed job: ${jobId}`);
    } else {
      throw new Error(`Job not found: ${jobId}`);
    }
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    await Promise.all([
      this.queue.clean(oneWeekAgo, 'completed', 1000),
      this.queue.clean(oneWeekAgo, 'failed', 500)
    ]);

    console.log('Cleaned old jobs from queue');
  }

  /**
   * Pause/Resume queue
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    console.log('Notification queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    console.log('Notification queue resumed');
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    await this.queue.close();
    console.log('Notification queue connection closed');
  }

  /**
   * Helper method to convert priority to number
   */
  private getPriorityValue(priority: 'low' | 'normal' | 'high' | 'critical'): number {
    switch (priority) {
      case 'low': return 1;
      case 'normal': return 5;
      case 'high': return 10;
      case 'critical': return 20;
      default: return 5;
    }
  }

  /**
   * Log notification job to database
   */
  private async logNotificationJob(
    job: NotificationJob, 
    queueJobId: string, 
    status: string, 
    result?: any, 
    error?: string
  ): Promise<void> {
    try {
      await prisma.notificationLog.upsert({
        where: { jobId: job.id },
        update: {
          status,
          result: result ? JSON.stringify(result) : null,
          error,
          updatedAt: new Date()
        },
        create: {
          jobId: job.id,
          queueJobId,
          type: job.type,
          companyId: job.companyId,
          branchId: job.branchId,
          recipient: job.data.recipient.name,
          recipientPhone: job.data.recipient.phone,
          recipientEmail: job.data.recipient.email,
          status,
          priority: job.priority,
          scheduledFor: job.scheduledFor,
          result: result ? JSON.stringify(result) : null,
          error,
          metadata: job.metadata ? JSON.stringify(job.metadata) : null
        }
      });
    } catch (dbError) {
      console.error('Error logging notification job:', dbError);
      // Don't throw here as it would fail the main job
    }
  }
}

export const notificationQueue = new NotificationQueue();