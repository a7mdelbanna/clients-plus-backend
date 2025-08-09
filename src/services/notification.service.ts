import { PrismaClient, ReminderType } from '@prisma/client';
import { addMinutes, isBefore, format } from 'date-fns';
import cron from 'node-cron';

const prisma = new PrismaClient();

export interface NotificationData {
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  businessName: string;
  serviceName: string;
  staffName?: string;
  appointmentDate: Date;
  appointmentTime: string;
  businessAddress?: string;
  businessPhone?: string;
  language?: 'en' | 'ar';
}

export interface SMSTemplate {
  confirmation: {
    en: string;
    ar: string;
  };
  reminder: {
    en: string;
    ar: string;
  };
  cancellation: {
    en: string;
    ar: string;
  };
  reschedule: {
    en: string;
    ar: string;
  };
}

export interface EmailTemplate {
  confirmation: {
    subject: { en: string; ar: string };
    body: { en: string; ar: string };
  };
  reminder: {
    subject: { en: string; ar: string };
    body: { en: string; ar: string };
  };
  cancellation: {
    subject: { en: string; ar: string };
    body: { en: string; ar: string };
  };
  reschedule: {
    subject: { en: string; ar: string };
    body: { en: string; ar: string };
  };
}

export class NotificationService {
  
  private smsTemplates: SMSTemplate = {
    confirmation: {
      en: `Hello {{clientName}}, your appointment at {{businessName}} is confirmed for {{date}} at {{time}}. Service: {{serviceName}} with {{staffName}}. Address: {{address}}. Call {{businessPhone}} for changes.`,
      ar: `مرحبا {{clientName}}، تم تأكيد موعدك في {{businessName}} يوم {{date}} في {{time}}. الخدمة: {{serviceName}} مع {{staffName}}. العنوان: {{address}}. اتصل على {{businessPhone}} للتغييرات.`
    },
    reminder: {
      en: `Reminder: Your appointment at {{businessName}} is in 1 hour ({{time}}). Service: {{serviceName}} with {{staffName}}. Address: {{address}}.`,
      ar: `تذكير: موعدك في {{businessName}} خلال ساعة واحدة ({{time}}). الخدمة: {{serviceName}} مع {{staffName}}. العنوان: {{address}}.`
    },
    cancellation: {
      en: `Your appointment at {{businessName}} on {{date}} at {{time}} has been cancelled. Call {{businessPhone}} to reschedule.`,
      ar: `تم إلغاء موعدك في {{businessName}} يوم {{date}} في {{time}}. اتصل على {{businessPhone}} لإعادة الجدولة.`
    },
    reschedule: {
      en: `Your appointment at {{businessName}} has been rescheduled to {{date}} at {{time}}. Service: {{serviceName}} with {{staffName}}.`,
      ar: `تم تغيير موعدك في {{businessName}} إلى {{date}} في {{time}}. الخدمة: {{serviceName}} مع {{staffName}}.`
    }
  };

  private emailTemplates: EmailTemplate = {
    confirmation: {
      subject: {
        en: 'Appointment Confirmation - {{businessName}}',
        ar: 'تأكيد الموعد - {{businessName}}'
      },
      body: {
        en: `
          <h2>Appointment Confirmed</h2>
          <p>Dear {{clientName}},</p>
          <p>Your appointment has been confirmed with the following details:</p>
          <ul>
            <li><strong>Business:</strong> {{businessName}}</li>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Staff:</strong> {{staffName}}</li>
            <li><strong>Date:</strong> {{date}}</li>
            <li><strong>Time:</strong> {{time}}</li>
            <li><strong>Address:</strong> {{address}}</li>
          </ul>
          <p>For any changes, please contact us at {{businessPhone}}.</p>
          <p>Thank you for choosing {{businessName}}!</p>
        `,
        ar: `
          <h2>تأكيد الموعد</h2>
          <p>عزيزي {{clientName}},</p>
          <p>تم تأكيد موعدك بالتفاصيل التالية:</p>
          <ul>
            <li><strong>المؤسسة:</strong> {{businessName}}</li>
            <li><strong>الخدمة:</strong> {{serviceName}}</li>
            <li><strong>الموظف:</strong> {{staffName}}</li>
            <li><strong>التاريخ:</strong> {{date}}</li>
            <li><strong>الوقت:</strong> {{time}}</li>
            <li><strong>العنوان:</strong> {{address}}</li>
          </ul>
          <p>للتغييرات، يرجى الاتصال بنا على {{businessPhone}}.</p>
          <p>شكرا لاختيارك {{businessName}}!</p>
        `
      }
    },
    reminder: {
      subject: {
        en: 'Appointment Reminder - {{businessName}}',
        ar: 'تذكير بالموعد - {{businessName}}'
      },
      body: {
        en: `
          <h2>Appointment Reminder</h2>
          <p>Dear {{clientName}},</p>
          <p>This is a reminder that you have an appointment in 1 hour:</p>
          <ul>
            <li><strong>Time:</strong> {{time}}</li>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Staff:</strong> {{staffName}}</li>
            <li><strong>Address:</strong> {{address}}</li>
          </ul>
          <p>We look forward to seeing you!</p>
        `,
        ar: `
          <h2>تذكير بالموعد</h2>
          <p>عزيزي {{clientName}},</p>
          <p>هذا تذكير بأن لديك موعد خلال ساعة واحدة:</p>
          <ul>
            <li><strong>الوقت:</strong> {{time}}</li>
            <li><strong>الخدمة:</strong> {{serviceName}}</li>
            <li><strong>الموظف:</strong> {{staffName}}</li>
            <li><strong>العنوان:</strong> {{address}}</li>
          </ul>
          <p>نتطلع لرؤيتك!</p>
        `
      }
    },
    cancellation: {
      subject: {
        en: 'Appointment Cancelled - {{businessName}}',
        ar: 'تم إلغاء الموعد - {{businessName}}'
      },
      body: {
        en: `
          <h2>Appointment Cancelled</h2>
          <p>Dear {{clientName}},</p>
          <p>Your appointment scheduled for {{date}} at {{time}} has been cancelled.</p>
          <p>If you would like to reschedule, please contact us at {{businessPhone}}.</p>
          <p>Thank you for your understanding.</p>
        `,
        ar: `
          <h2>تم إلغاء الموعد</h2>
          <p>عزيزي {{clientName}},</p>
          <p>تم إلغاء موعدك المحدد في {{date}} في {{time}}.</p>
          <p>إذا كنت ترغب في إعادة الجدولة، يرجى الاتصال بنا على {{businessPhone}}.</p>
          <p>شكرا لتفهمك.</p>
        `
      }
    },
    reschedule: {
      subject: {
        en: 'Appointment Rescheduled - {{businessName}}',
        ar: 'تم تغيير موعد المقابلة - {{businessName}}'
      },
      body: {
        en: `
          <h2>Appointment Rescheduled</h2>
          <p>Dear {{clientName}},</p>
          <p>Your appointment has been rescheduled to:</p>
          <ul>
            <li><strong>New Date:</strong> {{date}}</li>
            <li><strong>New Time:</strong> {{time}}</li>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Staff:</strong> {{staffName}}</li>
          </ul>
          <p>Thank you for your flexibility!</p>
        `,
        ar: `
          <h2>تم تغيير موعد المقابلة</h2>
          <p>عزيزي {{clientName}},</p>
          <p>تم تغيير موعدك إلى:</p>
          <ul>
            <li><strong>التاريخ الجديد:</strong> {{date}}</li>
            <li><strong>الوقت الجديد:</strong> {{time}}</li>
            <li><strong>الخدمة:</strong> {{serviceName}}</li>
            <li><strong>الموظف:</strong> {{staffName}}</li>
          </ul>
          <p>شكرا لمرونتك!</p>
        `
      }
    }
  };

  /**
   * Initialize reminder processing cron job
   */
  startReminderProcessor() {
    // Run every minute to check for due reminders
    cron.schedule('* * * * *', async () => {
      try {
        await this.processDueReminders();
      } catch (error) {
        console.error('Error processing due reminders:', error);
      }
    });
    
    console.log('Reminder processor started');
  }

  /**
   * Send appointment confirmation
   */
  async sendAppointmentConfirmation(data: NotificationData): Promise<void> {
    try {
      const tasks = [];
      
      // Send SMS if phone is available
      if (data.clientPhone) {
        tasks.push(this.sendSMS(data, 'confirmation'));
      }
      
      // Send email if email is available
      if (data.clientEmail) {
        tasks.push(this.sendEmail(data, 'confirmation'));
      }
      
      await Promise.allSettled(tasks);
      
      console.log(`Confirmation sent for appointment ${data.appointmentId}`);
      
    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(data: NotificationData, reminderType: ReminderType): Promise<void> {
    try {
      switch (reminderType) {
        case ReminderType.SMS:
          await this.sendSMS(data, 'reminder');
          break;
        case ReminderType.EMAIL:
          await this.sendEmail(data, 'reminder');
          break;
        case ReminderType.WHATSAPP:
          await this.sendWhatsApp(data, 'reminder');
          break;
        case ReminderType.PUSH:
          await this.sendPushNotification(data, 'reminder');
          break;
        default:
          console.warn(`Unsupported reminder type: ${reminderType}`);
      }
      
      console.log(`Reminder sent for appointment ${data.appointmentId} via ${reminderType}`);
      
    } catch (error) {
      console.error(`Error sending ${reminderType} reminder:`, error);
      throw error;
    }
  }

  /**
   * Send cancellation notification
   */
  async sendCancellationNotification(data: NotificationData): Promise<void> {
    try {
      const tasks = [];
      
      if (data.clientPhone) {
        tasks.push(this.sendSMS(data, 'cancellation'));
      }
      
      if (data.clientEmail) {
        tasks.push(this.sendEmail(data, 'cancellation'));
      }
      
      await Promise.allSettled(tasks);
      
      console.log(`Cancellation notification sent for appointment ${data.appointmentId}`);
      
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  /**
   * Send reschedule notification
   */
  async sendRescheduleNotification(data: NotificationData): Promise<void> {
    try {
      const tasks = [];
      
      if (data.clientPhone) {
        tasks.push(this.sendSMS(data, 'reschedule'));
      }
      
      if (data.clientEmail) {
        tasks.push(this.sendEmail(data, 'reschedule'));
      }
      
      await Promise.allSettled(tasks);
      
      console.log(`Reschedule notification sent for appointment ${data.appointmentId}`);
      
    } catch (error) {
      console.error('Error sending reschedule notification:', error);
    }
  }

  /**
   * Schedule reminder for appointment
   */
  async scheduleReminder(
    appointmentId: string,
    reminderType: ReminderType,
    appointmentDateTime: Date,
    minutesBefore: number
  ): Promise<void> {
    try {
      const scheduledFor = addMinutes(appointmentDateTime, -minutesBefore);
      
      // Only schedule if the reminder time is in the future
      if (isBefore(new Date(), scheduledFor)) {
        await prisma.appointmentReminder.create({
          data: {
            appointmentId,
            type: reminderType,
            scheduledFor,
            sent: false
          }
        });
        
        console.log(`Scheduled ${reminderType} reminder for appointment ${appointmentId} at ${scheduledFor}`);
      } else {
        console.log(`Reminder time ${scheduledFor} is in the past, skipping`);
      }
      
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      throw error;
    }
  }

  /**
   * Process due reminders (called by cron job)
   */
  private async processDueReminders(): Promise<void> {
    try {
      const now = new Date();
      
      // Get all due reminders
      const dueReminders = await prisma.appointmentReminder.findMany({
        where: {
          sent: false,
          scheduledFor: {
            lte: now
          }
        },
        include: {
          appointment: {
            include: {
              client: true,
              staff: true,
              company: true,
              branch: true
            }
          }
        },
        take: 50 // Process up to 50 reminders at a time
      });

      console.log(`Processing ${dueReminders.length} due reminders`);

      for (const reminder of dueReminders) {
        try {
          // Skip if appointment is cancelled or completed
          if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reminder.appointment.status)) {
            await this.markReminderSent(reminder.id, 'Appointment status changed');
            continue;
          }

          // Prepare notification data
          const notificationData: NotificationData = {
            appointmentId: reminder.appointment.id,
            clientName: reminder.appointment.clientName,
            clientPhone: reminder.appointment.clientPhone,
            clientEmail: reminder.appointment.clientEmail || undefined,
            businessName: reminder.appointment.company.name,
            serviceName: this.getServiceNames(reminder.appointment.services as any[]),
            staffName: reminder.appointment.staff?.name,
            appointmentDate: reminder.appointment.date,
            appointmentTime: reminder.appointment.startTime,
            businessAddress: this.formatAddress(reminder.appointment.branch?.address as any),
            businessPhone: this.getBusinessPhone(reminder.appointment.branch?.contact as any),
            language: 'ar' // Default to Arabic, can be made dynamic
          };

          // Send reminder
          await this.sendAppointmentReminder(notificationData, reminder.type);
          
          // Mark as sent
          await this.markReminderSent(reminder.id);
          
        } catch (error) {
          console.error(`Error processing reminder ${reminder.id}:`, error);
          
          // Mark as sent with error to prevent retry loops
          await this.markReminderSent(reminder.id, error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
    } catch (error) {
      console.error('Error in processDueReminders:', error);
    }
  }

  /**
   * Mark reminder as sent
   */
  private async markReminderSent(reminderId: string, error?: string): Promise<void> {
    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        sent: true,
        sentAt: new Date(),
        error: error || null
      }
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(data: NotificationData, type: keyof SMSTemplate): Promise<void> {
    try {
      const language = data.language || 'ar';
      const template = this.smsTemplates[type][language];
      const message = this.replaceTemplateVars(template, data);
      
      // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
      console.log(`SMS to ${data.clientPhone}: ${message}`);
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(data: NotificationData, type: keyof EmailTemplate): Promise<void> {
    try {
      const language = data.language || 'ar';
      const template = this.emailTemplates[type];
      const subject = this.replaceTemplateVars(template.subject[language], data);
      const body = this.replaceTemplateVars(template.body[language], data);
      
      // TODO: Integrate with email provider (SendGrid, AWS SES, etc.)
      console.log(`Email to ${data.clientEmail}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsApp(data: NotificationData, type: keyof SMSTemplate): Promise<void> {
    try {
      const language = data.language || 'ar';
      const template = this.smsTemplates[type][language];
      const message = this.replaceTemplateVars(template, data);
      
      // TODO: Integrate with WhatsApp Business API
      console.log(`WhatsApp to ${data.clientPhone}: ${message}`);
      
      // Simulate WhatsApp sending delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(data: NotificationData, type: keyof SMSTemplate): Promise<void> {
    try {
      const language = data.language || 'ar';
      const template = this.smsTemplates[type][language];
      const message = this.replaceTemplateVars(template, data);
      
      // TODO: Integrate with push notification service (Firebase FCM, etc.)
      console.log(`Push notification for appointment ${data.appointmentId}: ${message}`);
      
      // Simulate push sending delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Replace template variables with actual data
   */
  private replaceTemplateVars(template: string, data: NotificationData): string {
    return template
      .replace(/{{clientName}}/g, data.clientName)
      .replace(/{{businessName}}/g, data.businessName)
      .replace(/{{serviceName}}/g, data.serviceName)
      .replace(/{{staffName}}/g, data.staffName || 'Staff')
      .replace(/{{date}}/g, format(data.appointmentDate, 'dd/MM/yyyy'))
      .replace(/{{time}}/g, data.appointmentTime)
      .replace(/{{address}}/g, data.businessAddress || '')
      .replace(/{{businessPhone}}/g, data.businessPhone || '');
  }

  /**
   * Helper method to extract service names from appointment services
   */
  private getServiceNames(services: any[]): string {
    if (!services || services.length === 0) return 'Service';
    return services.map(s => s.serviceName || s.name).join(', ');
  }

  /**
   * Helper method to format address
   */
  private formatAddress(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') return address;
    return [address.street, address.city, address.country].filter(Boolean).join(', ');
  }

  /**
   * Helper method to get business phone
   */
  private getBusinessPhone(contact: any): string {
    if (!contact) return '';
    if (contact.phones && contact.phones.length > 0) {
      const primary = contact.phones.find((p: any) => p.isPrimary) || contact.phones[0];
      return primary.number || '';
    }
    return '';
  }
}

export const notificationService = new NotificationService();