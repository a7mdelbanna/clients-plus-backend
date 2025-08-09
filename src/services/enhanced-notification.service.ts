import { PrismaClient, ReminderType } from '@prisma/client';
import { addMinutes, isBefore, format } from 'date-fns';
import { whatsappService } from './whatsapp.service';
import { notificationQueue, NotificationJob } from './queue.service';
import { messageTemplateService } from '../templates/messages';

const prisma = new PrismaClient();

export interface EnhancedNotificationData {
  appointmentId: string;
  companyId: string;
  branchId?: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  businessName: string;
  serviceName: string;
  staffName?: string;
  appointmentDate: Date;
  appointmentTime: string;
  businessAddress?: string;
  businessPhone?: string;
  language?: 'en' | 'ar';
  googleMapsLink?: string;
}

export interface NotificationPreferences {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
  reminderTiming: number; // minutes before appointment
}

export class EnhancedNotificationService {

  /**
   * Send appointment confirmation notifications
   */
  async sendAppointmentConfirmation(data: EnhancedNotificationData): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences(data.companyId, data.clientId);
      const jobs: NotificationJob[] = [];
      const variables = this.buildTemplateVariables(data);

      // WhatsApp notification
      if (preferences.whatsapp && data.clientPhone) {
        jobs.push({
          id: `confirmation_whatsapp_${data.appointmentId}_${Date.now()}`,
          type: 'whatsapp',
          priority: 'high',
          companyId: data.companyId,
          branchId: data.branchId,
          data: {
            recipient: {
              name: data.clientName,
              phone: data.clientPhone,
              language: data.language || 'ar'
            },
            message: {
              templateId: 'appointment_confirmation',
              variables
            }
          }
        });
      }

      // Email notification
      if (preferences.email && data.clientEmail) {
        jobs.push({
          id: `confirmation_email_${data.appointmentId}_${Date.now()}`,
          type: 'email',
          priority: 'high',
          companyId: data.companyId,
          branchId: data.branchId,
          data: {
            recipient: {
              name: data.clientName,
              email: data.clientEmail,
              language: data.language || 'ar'
            },
            message: {
              templateId: 'appointment_confirmation',
              variables,
              subject: data.language === 'en' 
                ? `Appointment Confirmation - ${data.businessName}` 
                : `تأكيد الموعد - ${data.businessName}`
            }
          }
        });
      }

      // SMS notification  
      if (preferences.sms && data.clientPhone) {
        jobs.push({
          id: `confirmation_sms_${data.appointmentId}_${Date.now()}`,
          type: 'sms',
          priority: 'high',
          companyId: data.companyId,
          branchId: data.branchId,
          data: {
            recipient: {
              name: data.clientName,
              phone: data.clientPhone,
              language: data.language || 'ar'
            },
            message: {
              templateId: 'appointment_confirmation',
              variables
            }
          }
        });
      }

      // Add jobs to queue
      if (jobs.length > 0) {
        await notificationQueue.addBulkNotifications(jobs);
        console.log(`${jobs.length} confirmation notifications queued for appointment ${data.appointmentId}`);
      }

      // Schedule reminders
      await this.scheduleAppointmentReminders(data, preferences);

    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(data: EnhancedNotificationData, reminderType: ReminderType): Promise<void> {
    try {
      const variables = this.buildTemplateVariables(data, 'reminder');
      
      const job: NotificationJob = {
        id: `reminder_${reminderType.toLowerCase()}_${data.appointmentId}_${Date.now()}`,
        type: reminderType.toLowerCase() as 'whatsapp' | 'sms' | 'email' | 'push',
        priority: 'normal',
        companyId: data.companyId,
        branchId: data.branchId,
        data: {
          recipient: {
            name: data.clientName,
            phone: data.clientPhone,
            email: data.clientEmail,
            language: data.language || 'ar'
          },
          message: {
            templateId: 'appointment_reminder',
            variables
          }
        }
      };

      await notificationQueue.addNotification(job);
      console.log(`${reminderType} reminder queued for appointment ${data.appointmentId}`);

    } catch (error) {
      console.error(`Error sending ${reminderType} reminder:`, error);
      throw error;
    }
  }

  /**
   * Send appointment cancellation notification
   */
  async sendAppointmentCancellation(data: EnhancedNotificationData, reason?: string): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences(data.companyId, data.clientId);
      const jobs: NotificationJob[] = [];
      const variables = {
        ...this.buildTemplateVariables(data),
        cancellationReason: reason || ''
      };

      // Create notification jobs based on preferences
      if (preferences.whatsapp && data.clientPhone) {
        jobs.push(this.createNotificationJob('whatsapp', 'cancellation', data, variables));
      }
      
      if (preferences.email && data.clientEmail) {
        jobs.push(this.createNotificationJob('email', 'cancellation', data, variables));
      }
      
      if (preferences.sms && data.clientPhone) {
        jobs.push(this.createNotificationJob('sms', 'cancellation', data, variables));
      }

      if (jobs.length > 0) {
        await notificationQueue.addBulkNotifications(jobs);
        console.log(`${jobs.length} cancellation notifications queued for appointment ${data.appointmentId}`);
      }

    } catch (error) {
      console.error('Error sending appointment cancellation:', error);
      throw error;
    }
  }

  /**
   * Send appointment reschedule notification
   */
  async sendAppointmentReschedule(
    data: EnhancedNotificationData, 
    newDate: Date, 
    newTime: string
  ): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences(data.companyId, data.clientId);
      const jobs: NotificationJob[] = [];
      const variables = {
        ...this.buildTemplateVariables(data),
        newDate: format(newDate, 'dd/MM/yyyy'),
        newTime: newTime
      };

      // Create notification jobs based on preferences
      if (preferences.whatsapp && data.clientPhone) {
        jobs.push(this.createNotificationJob('whatsapp', 'reschedule', data, variables));
      }
      
      if (preferences.email && data.clientEmail) {
        jobs.push(this.createNotificationJob('email', 'reschedule', data, variables));
      }
      
      if (preferences.sms && data.clientPhone) {
        jobs.push(this.createNotificationJob('sms', 'reschedule', data, variables));
      }

      if (jobs.length > 0) {
        await notificationQueue.addBulkNotifications(jobs);
        console.log(`${jobs.length} reschedule notifications queued for appointment ${data.appointmentId}`);
      }

    } catch (error) {
      console.error('Error sending appointment reschedule:', error);
      throw error;
    }
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(
    companyId: string,
    branchId: string | undefined,
    recipients: Array<{
      name: string;
      phone?: string;
      email?: string;
      language?: 'en' | 'ar';
    }>,
    message: {
      templateId?: string;
      content?: string;
      subject?: string;
      variables?: Record<string, string>;
    },
    channels: ('whatsapp' | 'sms' | 'email' | 'push')[],
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<void> {
    try {
      const jobs: NotificationJob[] = [];

      for (const recipient of recipients) {
        for (const channel of channels) {
          // Validate recipient has required contact info for channel
          if ((channel === 'whatsapp' || channel === 'sms') && !recipient.phone) continue;
          if (channel === 'email' && !recipient.email) continue;

          jobs.push({
            id: `custom_${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: channel,
            priority,
            companyId,
            branchId,
            data: {
              recipient,
              message
            }
          });
        }
      }

      if (jobs.length > 0) {
        await notificationQueue.addBulkNotifications(jobs);
        console.log(`${jobs.length} custom notifications queued`);
      }

    } catch (error) {
      console.error('Error sending custom notification:', error);
      throw error;
    }
  }

  /**
   * Schedule appointment reminders
   */
  async scheduleAppointmentReminders(
    data: EnhancedNotificationData, 
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      const appointmentDateTime = new Date(data.appointmentDate);
      appointmentDateTime.setHours(
        parseInt(data.appointmentTime.split(':')[0]),
        parseInt(data.appointmentTime.split(':')[1])
      );

      const reminderTime = addMinutes(appointmentDateTime, -preferences.reminderTiming);

      // Only schedule if reminder time is in the future
      if (isBefore(new Date(), reminderTime)) {
        const jobs: NotificationJob[] = [];

        if (preferences.whatsapp && data.clientPhone) {
          jobs.push({
            ...this.createNotificationJob('whatsapp', 'reminder', data, this.buildTemplateVariables(data, 'reminder')),
            scheduledFor: reminderTime
          });
        }

        if (preferences.email && data.clientEmail) {
          jobs.push({
            ...this.createNotificationJob('email', 'reminder', data, this.buildTemplateVariables(data, 'reminder')),
            scheduledFor: reminderTime
          });
        }

        if (preferences.sms && data.clientPhone) {
          jobs.push({
            ...this.createNotificationJob('sms', 'reminder', data, this.buildTemplateVariables(data, 'reminder')),
            scheduledFor: reminderTime
          });
        }

        // Schedule all reminder jobs
        for (const job of jobs) {
          await notificationQueue.scheduleNotification(job, reminderTime);
        }

        console.log(`Scheduled ${jobs.length} reminders for appointment ${data.appointmentId} at ${reminderTime}`);
      }

    } catch (error) {
      console.error('Error scheduling appointment reminders:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences for a client
   */
  private async getNotificationPreferences(
    companyId: string, 
    clientId: string
  ): Promise<NotificationPreferences> {
    try {
      // Check if client has specific preferences
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { notificationPreferences: true }
      });

      if (client?.notificationPreferences) {
        const prefs = client.notificationPreferences as any;
        return {
          whatsapp: prefs.whatsapp ?? true,
          sms: prefs.sms ?? false,
          email: prefs.email ?? true,
          push: prefs.push ?? false,
          reminderTiming: prefs.reminderTiming ?? 60 // default 1 hour
        };
      }

      // Fall back to company defaults
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { notificationSettings: true }
      });

      if (company?.notificationSettings) {
        const settings = company.notificationSettings as any;
        return {
          whatsapp: settings.defaultWhatsApp ?? true,
          sms: settings.defaultSMS ?? false,
          email: settings.defaultEmail ?? true,
          push: settings.defaultPush ?? false,
          reminderTiming: settings.defaultReminderTiming ?? 60
        };
      }

      // Ultimate fallback
      return {
        whatsapp: true,
        sms: false,
        email: true,
        push: false,
        reminderTiming: 60
      };

    } catch (error) {
      console.error('Error getting notification preferences:', error);
      // Return safe defaults
      return {
        whatsapp: true,
        sms: false,
        email: true,
        push: false,
        reminderTiming: 60
      };
    }
  }

  /**
   * Create a notification job
   */
  private createNotificationJob(
    type: 'whatsapp' | 'sms' | 'email' | 'push',
    templateSuffix: string,
    data: EnhancedNotificationData,
    variables: Record<string, string>
  ): NotificationJob {
    return {
      id: `${templateSuffix}_${type}_${data.appointmentId}_${Date.now()}`,
      type,
      priority: 'normal',
      companyId: data.companyId,
      branchId: data.branchId,
      data: {
        recipient: {
          name: data.clientName,
          phone: data.clientPhone,
          email: data.clientEmail,
          language: data.language || 'ar'
        },
        message: {
          templateId: `appointment_${templateSuffix}`,
          variables,
          ...(type === 'email' && {
            subject: data.language === 'en' 
              ? `${templateSuffix.charAt(0).toUpperCase() + templateSuffix.slice(1)} - ${data.businessName}`
              : `${this.getArabicSubject(templateSuffix)} - ${data.businessName}`
          })
        }
      }
    };
  }

  /**
   * Build template variables from notification data
   */
  private buildTemplateVariables(
    data: EnhancedNotificationData, 
    type: 'confirmation' | 'reminder' | 'cancellation' | 'reschedule' = 'confirmation'
  ): Record<string, string> {
    const variables: Record<string, string> = {
      clientName: data.clientName,
      businessName: data.businessName,
      date: format(data.appointmentDate, 'dd/MM/yyyy'),
      time: data.appointmentTime,
      serviceName: data.serviceName,
      staffName: data.staffName || 'Staff',
      businessAddress: data.businessAddress || '',
      businessPhone: data.businessPhone || ''
    };

    // Add specific variables based on type
    if (type === 'reminder') {
      variables.reminderTime = data.language === 'ar' ? 'خلال ساعة واحدة' : 'in 1 hour';
    }

    if (data.googleMapsLink) {
      variables.googleMapsLink = data.googleMapsLink;
    }

    return variables;
  }

  /**
   * Get Arabic subject for different notification types
   */
  private getArabicSubject(type: string): string {
    const subjects = {
      confirmation: 'تأكيد الموعد',
      reminder: 'تذكير بالموعد',
      cancellation: 'إلغاء الموعد',
      reschedule: 'تغيير الموعد'
    };
    
    return subjects[type as keyof typeof subjects] || 'إشعار';
  }
}

export const enhancedNotificationService = new EnhancedNotificationService();