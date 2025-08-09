import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { notificationQueue } from '../services/queue.service';
import { enhancedNotificationService, EnhancedNotificationData } from '../services/enhanced-notification.service';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';

const prisma = new PrismaClient();

export class NotificationCronService {
  private isProcessing = false;

  /**
   * Initialize all cron jobs
   */
  initializeCronJobs(): void {
    // Process appointment reminders every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.processAppointmentReminders();
    });

    // Clean up old notifications daily at 2 AM
    cron.schedule('0 2 * * *', () => {
      this.cleanupOldNotifications();
    });

    // Clean up queue jobs daily at 3 AM
    cron.schedule('0 3 * * *', () => {
      this.cleanupQueueJobs();
    });

    // Send birthday greetings daily at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.sendBirthdayGreetings();
    });

    // Process promotional campaigns daily at 10 AM
    cron.schedule('0 10 * * *', () => {
      this.processPromotionalCampaigns();
    });

    // Send no-show follow-ups daily at 6 PM
    cron.schedule('0 18 * * *', () => {
      this.sendNoShowFollowUps();
    });

    // Health check every hour
    cron.schedule('0 * * * *', () => {
      this.performHealthCheck();
    });

    console.log('Notification cron jobs initialized');
  }

  /**
   * Process due appointment reminders
   */
  async processAppointmentReminders(): Promise<void> {
    if (this.isProcessing) {
      console.log('Reminder processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log('Processing appointment reminders...');
      
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Get appointments that need reminders in the next 1-2 hours
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          date: {
            gte: startOfDay(now),
            lte: endOfDay(now)
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          },
          // Convert date + startTime to datetime and check if it's 1-2 hours from now
        },
        include: {
          client: true,
          staff: true,
          company: true,
          branch: true,
          reminders: true
        },
        take: 100 // Process max 100 at a time
      });

      let processedCount = 0;

      for (const appointment of upcomingAppointments) {
        try {
          // Parse appointment datetime
          const [hours, minutes] = appointment.startTime.split(':').map(Number);
          const appointmentDateTime = new Date(appointment.date);
          appointmentDateTime.setHours(hours, minutes, 0, 0);

          // Check if appointment is 1 hour away (within 5-minute window)
          const timeDiff = appointmentDateTime.getTime() - now.getTime();
          const oneHourMs = 60 * 60 * 1000;
          
          if (timeDiff >= oneHourMs - (5 * 60 * 1000) && timeDiff <= oneHourMs + (5 * 60 * 1000)) {
            // Check if reminder was already sent
            const reminderSent = appointment.reminders.some(
              r => r.type === 'WHATSAPP' && r.sent && 
              Math.abs(r.scheduledFor.getTime() - appointmentDateTime.getTime() + oneHourMs) < 10 * 60 * 1000
            );

            if (!reminderSent) {
              const notificationData: EnhancedNotificationData = {
                appointmentId: appointment.id,
                companyId: appointment.companyId,
                branchId: appointment.branchId || undefined,
                clientId: appointment.clientId,
                clientName: appointment.clientName,
                clientPhone: appointment.clientPhone,
                clientEmail: appointment.clientEmail || undefined,
                businessName: appointment.company.name,
                serviceName: this.getServiceNames(appointment.services as any[]),
                staffName: appointment.staff?.name,
                appointmentDate: appointment.date,
                appointmentTime: appointment.startTime,
                businessAddress: this.formatAddress(appointment.branch?.address as any),
                businessPhone: this.getBusinessPhone(appointment.branch?.contact as any),
                language: 'ar'
              };

              await enhancedNotificationService.sendAppointmentReminder(
                notificationData, 
                'WHATSAPP'
              );

              // Log the reminder
              await prisma.appointmentReminder.create({
                data: {
                  appointmentId: appointment.id,
                  type: 'WHATSAPP',
                  scheduledFor: new Date(appointmentDateTime.getTime() - oneHourMs),
                  sent: true,
                  sentAt: now
                }
              });

              processedCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing reminder for appointment ${appointment.id}:`, error);
        }
      }

      console.log(`Processed ${processedCount} appointment reminders`);

    } catch (error) {
      console.error('Error processing appointment reminders:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send birthday greetings
   */
  async sendBirthdayGreetings(): Promise<void> {
    try {
      console.log('Sending birthday greetings...');
      
      const today = new Date();
      const todayStr = format(today, 'MM-dd');

      // Find clients whose birthday is today
      const birthdayClients = await prisma.client.findMany({
        where: {
          dateOfBirth: {
            not: null
          }
        },
        include: {
          company: true
        },
        take: 50 // Limit to prevent overload
      });

      const todayBirthdays = birthdayClients.filter(client => {
        if (!client.dateOfBirth) return false;
        const birthdayStr = format(client.dateOfBirth, 'MM-dd');
        return birthdayStr === todayStr;
      });

      for (const client of todayBirthdays) {
        try {
          if (client.phone) {
            await enhancedNotificationService.sendCustomNotification(
              client.companyId,
              undefined,
              [{
                name: `${client.firstName} ${client.lastName}`,
                phone: client.phone,
                language: 'ar'
              }],
              {
                templateId: 'birthday_greeting',
                variables: {
                  clientName: `${client.firstName} ${client.lastName}`,
                  businessName: client.company.name,
                  discount: '20'
                }
              },
              ['whatsapp'],
              'normal'
            );

            console.log(`Birthday greeting sent to ${client.firstName} ${client.lastName}`);
          }
        } catch (error) {
          console.error(`Error sending birthday greeting to client ${client.id}:`, error);
        }
      }

      console.log(`Sent ${todayBirthdays.length} birthday greetings`);

    } catch (error) {
      console.error('Error sending birthday greetings:', error);
    }
  }

  /**
   * Send no-show follow-ups
   */
  async sendNoShowFollowUps(): Promise<void> {
    try {
      console.log('Sending no-show follow-ups...');
      
      const yesterday = subDays(new Date(), 1);
      
      // Find appointments that were no-shows yesterday
      const noShowAppointments = await prisma.appointment.findMany({
        where: {
          date: {
            gte: startOfDay(yesterday),
            lte: endOfDay(yesterday)
          },
          status: 'NO_SHOW'
        },
        include: {
          client: true,
          company: true,
          branch: true
        }
      });

      for (const appointment of noShowAppointments) {
        try {
          if (appointment.clientPhone) {
            await enhancedNotificationService.sendCustomNotification(
              appointment.companyId,
              appointment.branchId || undefined,
              [{
                name: appointment.clientName,
                phone: appointment.clientPhone,
                language: 'ar'
              }],
              {
                templateId: 'no_show_follow_up',
                variables: {
                  clientName: appointment.clientName,
                  businessName: appointment.company.name,
                  date: format(appointment.date, 'dd/MM/yyyy'),
                  businessPhone: this.getBusinessPhone(appointment.branch?.contact as any)
                }
              },
              ['whatsapp'],
              'low'
            );

            console.log(`No-show follow-up sent for appointment ${appointment.id}`);
          }
        } catch (error) {
          console.error(`Error sending no-show follow-up for appointment ${appointment.id}:`, error);
        }
      }

      console.log(`Sent ${noShowAppointments.length} no-show follow-ups`);

    } catch (error) {
      console.error('Error sending no-show follow-ups:', error);
    }
  }

  /**
   * Process promotional campaigns
   */
  async processPromotionalCampaigns(): Promise<void> {
    try {
      console.log('Processing promotional campaigns...');
      
      // This could be extended to handle scheduled promotional campaigns
      // For now, we'll skip implementation as it requires campaign management system
      
      console.log('No promotional campaigns scheduled for today');

    } catch (error) {
      console.error('Error processing promotional campaigns:', error);
    }
  }

  /**
   * Cleanup old notifications
   */
  async cleanupOldNotifications(): Promise<void> {
    try {
      console.log('Cleaning up old notifications...');
      
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      // Delete notification logs older than 30 days
      const deletedLogs = await prisma.notificationLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      // Delete old appointment reminders
      const deletedReminders = await prisma.appointmentReminder.deleteMany({
        where: {
          scheduledFor: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log(`Cleaned up ${deletedLogs.count} old notification logs and ${deletedReminders.count} old reminders`);

    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  /**
   * Cleanup old queue jobs
   */
  async cleanupQueueJobs(): Promise<void> {
    try {
      console.log('Cleaning up old queue jobs...');
      
      await notificationQueue.cleanOldJobs();
      
      console.log('Queue cleanup completed');

    } catch (error) {
      console.error('Error cleaning up queue jobs:', error);
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<void> {
    try {
      const stats = await notificationQueue.getQueueStats();
      
      console.log('Notification system health check:', {
        timestamp: new Date().toISOString(),
        queueStats: stats,
        processing: this.isProcessing
      });

      // Alert if too many failed jobs
      if (stats.failed > 100) {
        console.warn(`High number of failed notification jobs: ${stats.failed}`);
        // Could send alert to admin here
      }

    } catch (error) {
      console.error('Error performing health check:', error);
    }
  }

  /**
   * Helper methods
   */
  private getServiceNames(services: any[]): string {
    if (!services || services.length === 0) return 'Service';
    return services.map(s => s.serviceName || s.name).join(', ');
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') return address;
    return [address.street, address.city, address.country].filter(Boolean).join(', ');
  }

  private getBusinessPhone(contact: any): string {
    if (!contact) return '';
    if (contact.phones && contact.phones.length > 0) {
      const primary = contact.phones.find((p: any) => p.isPrimary) || contact.phones[0];
      return primary.number || '';
    }
    return '';
  }
}

export const notificationCronService = new NotificationCronService();