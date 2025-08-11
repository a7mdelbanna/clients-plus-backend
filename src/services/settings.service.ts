import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { redisService } from './redis.service';

const prisma = new PrismaClient();

export interface CompanySettings {
  general: {
    businessName: string;
    businessType: string;
    timezone: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
    language: string;
    country: string;
    taxId?: string;
    registrationNumber?: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
  };
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    theme: 'light' | 'dark' | 'auto';
  };
  operational: {
    defaultAppointmentDuration: number;
    bufferTimeBetweenAppointments: number;
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
    enableOnlineBooking: boolean;
    requireDepositForBooking: boolean;
    depositPercentage: number;
    cancellationPolicy: {
      enabled: boolean;
      hoursBeforeAppointment: number;
      feePercentage: number;
    };
    noShowPolicy: {
      enabled: boolean;
      feeAmount: number;
    };
  };
  features: {
    enableInventoryManagement: boolean;
    enableFinancialReporting: boolean;
    enableStaffScheduling: boolean;
    enableClientPortal: boolean;
    enableMultiBranch: boolean;
    enableResourceBooking: boolean;
    enableWaitlist: boolean;
    enableRecurringAppointments: boolean;
  };
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    appointmentConfirmation: boolean;
    appointmentReminder: boolean;
    appointmentCancellation: boolean;
    dailySummary: boolean;
    weeklyReport: boolean;
    lowInventoryAlert: boolean;
    overduePaymentReminder: boolean;
    staffScheduleChanges: boolean;
  };
  sms: {
    enabled: boolean;
    appointmentConfirmation: boolean;
    appointmentReminder: boolean;
    appointmentCancellation: boolean;
    provider: 'twilio' | 'custom';
    reminderTimings: number[]; // Hours before appointment
  };
  whatsapp: {
    enabled: boolean;
    appointmentConfirmation: boolean;
    appointmentReminder: boolean;
    appointmentCancellation: boolean;
    marketingMessages: boolean;
    provider: 'twilio' | 'custom';
    reminderTimings: number[];
  };
  push: {
    enabled: boolean;
    appointmentReminder: boolean;
    newBooking: boolean;
    cancellation: boolean;
    dailySummary: boolean;
  };
  preferences: {
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    timezone: string;
    language: string;
  };
}

export interface IntegrationSettings {
  payment: {
    stripe: {
      enabled: boolean;
      publishableKey?: string;
      secretKey?: string;
      webhookSecret?: string;
    };
    paypal: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      environment: 'sandbox' | 'production';
    };
    cash: {
      enabled: boolean;
    };
    bankTransfer: {
      enabled: boolean;
      instructions?: string;
    };
  };
  calendar: {
    googleCalendar: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
      calendarId?: string;
    };
    outlook: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
    };
  };
  communication: {
    twilio: {
      enabled: boolean;
      accountSid?: string;
      authToken?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
    };
    smtp: {
      enabled: boolean;
      host?: string;
      port?: number;
      secure?: boolean;
      username?: string;
      password?: string;
    };
  };
  analytics: {
    googleAnalytics: {
      enabled: boolean;
      trackingId?: string;
    };
    facebookPixel: {
      enabled: boolean;
      pixelId?: string;
    };
  };
  storage: {
    aws: {
      enabled: boolean;
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
      bucket?: string;
    };
    cloudinary: {
      enabled: boolean;
      cloudName?: string;
      apiKey?: string;
      apiSecret?: string;
    };
  };
}

export class SettingsService {
  /**
   * Get all company settings
   */
  async getSettings(companyId: string): Promise<{
    general: CompanySettings;
    notifications: NotificationSettings;
    integrations: IntegrationSettings;
  }> {
    const cacheKey = `settings:${companyId}`;
    
    // Try to get from cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          settings: true,
        },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      const settings = {
        general: this.buildGeneralSettings(company),
        notifications: this.buildNotificationSettings(company.settings),
        integrations: this.buildIntegrationSettings(company.settings),
      };

      // Cache for 1 hour
      await redisService.set(cacheKey, settings, { ttl: 3600 });

      return settings;
    } catch (error) {
      logger.error('Error getting settings:', error);
      throw error;
    }
  }

  /**
   * Update company settings
   */
  async updateSettings(
    companyId: string,
    updates: Partial<CompanySettings>
  ): Promise<CompanySettings> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Update company fields
      const companyUpdates: any = {};
      if (updates.general) {
        if (updates.general.businessName) companyUpdates.name = updates.general.businessName;
        if (updates.general.businessType) companyUpdates.businessType = updates.general.businessType;
        if (updates.general.timezone) companyUpdates.timezone = updates.general.timezone;
        if (updates.general.currency) companyUpdates.currency = updates.general.currency;
        if (updates.general.dateFormat) companyUpdates.dateFormat = updates.general.dateFormat;
        if (updates.general.timeFormat) companyUpdates.timeFormat = updates.general.timeFormat;
        if (updates.general.taxId) companyUpdates.taxId = updates.general.taxId;
        if (updates.general.registrationNumber) companyUpdates.registrationNumber = updates.general.registrationNumber;
      }

      if (updates.contact) {
        if (updates.contact.phone) companyUpdates.phone = updates.contact.phone;
        if (updates.contact.email) companyUpdates.email = updates.contact.email;
        if (updates.contact.website) companyUpdates.website = updates.contact.website;
        if (updates.contact.address) companyUpdates.address = updates.contact.address;
      }

      if (updates.branding?.logo) {
        companyUpdates.logo = updates.branding.logo;
      }

      // Update company record
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: companyUpdates,
      });

      // Update or create settings records for other properties
      if (updates.operational || updates.features || updates.branding) {
        await this.updateCompanySettings(companyId, {
          operational: updates.operational,
          features: updates.features,
          branding: updates.branding,
        });
      }

      // Clear cache
      await this.clearSettingsCache(companyId);

      // Return updated settings
      const settings = await this.getSettings(companyId);
      return settings.general;
    } catch (error) {
      logger.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(companyId: string): Promise<NotificationSettings> {
    try {
      const settings = await this.getSettings(companyId);
      return settings.notifications;
    } catch (error) {
      logger.error('Error getting notification settings:', error);
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    companyId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      await this.updateCompanySettings(companyId, { notifications: updates });
      
      // Clear cache
      await this.clearSettingsCache(companyId);

      const settings = await this.getSettings(companyId);
      return settings.notifications;
    } catch (error) {
      logger.error('Error updating notification settings:', error);
      throw error;
    }
  }

  /**
   * Get integration settings
   */
  async getIntegrationSettings(companyId: string): Promise<IntegrationSettings> {
    try {
      const settings = await this.getSettings(companyId);
      return settings.integrations;
    } catch (error) {
      logger.error('Error getting integration settings:', error);
      throw error;
    }
  }

  /**
   * Update integration settings
   */
  async updateIntegrationSettings(
    companyId: string,
    updates: Partial<IntegrationSettings>
  ): Promise<IntegrationSettings> {
    try {
      await this.updateCompanySettings(companyId, { integrations: updates });
      
      // Clear cache
      await this.clearSettingsCache(companyId);

      const settings = await this.getSettings(companyId);
      return settings.integrations;
    } catch (error) {
      logger.error('Error updating integration settings:', error);
      throw error;
    }
  }

  /**
   * Test integration connection
   */
  async testIntegration(
    companyId: string,
    integration: string,
    config: any
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      switch (integration) {
        case 'twilio':
          return await this.testTwilioConnection(config);
        case 'stripe':
          return await this.testStripeConnection(config);
        case 'google_calendar':
          return await this.testGoogleCalendarConnection(config);
        case 'smtp':
          return await this.testSMTPConnection(config);
        default:
          return {
            success: false,
            message: 'Unsupported integration type',
          };
      }
    } catch (error) {
      logger.error(`Error testing ${integration} integration:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(
    companyId: string,
    section: 'general' | 'notifications' | 'integrations' | 'all'
  ): Promise<void> {
    try {
      const defaults = this.getDefaultSettings();

      switch (section) {
        case 'general':
          await this.updateSettings(companyId, defaults.general);
          break;
        case 'notifications':
          await this.updateNotificationSettings(companyId, defaults.notifications);
          break;
        case 'integrations':
          await this.updateIntegrationSettings(companyId, defaults.integrations);
          break;
        case 'all':
          await this.updateSettings(companyId, defaults.general);
          await this.updateNotificationSettings(companyId, defaults.notifications);
          await this.updateIntegrationSettings(companyId, defaults.integrations);
          break;
      }

      logger.info(`Settings reset for company ${companyId}, section: ${section}`);
    } catch (error) {
      logger.error('Error resetting settings:', error);
      throw error;
    }
  }

  // Private helper methods

  private buildGeneralSettings(company: any): CompanySettings {
    return {
      general: {
        businessName: company.name,
        businessType: company.businessType || 'beauty_salon',
        timezone: company.timezone || 'UTC',
        currency: company.currency || 'USD',
        dateFormat: company.dateFormat || 'MM/dd/yyyy',
        timeFormat: company.timeFormat || '12h',
        language: 'en',
        country: 'US',
        taxId: company.taxId,
        registrationNumber: company.registrationNumber,
      },
      contact: {
        phone: company.phone || '',
        email: company.email || '',
        website: company.website,
        address: company.address || {
          street: '',
          city: '',
          state: '',
          country: 'US',
          zipCode: '',
        },
      },
      branding: {
        logo: company.logo,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        theme: 'light',
      },
      operational: {
        defaultAppointmentDuration: 60,
        bufferTimeBetweenAppointments: 15,
        maxAdvanceBookingDays: 90,
        minAdvanceBookingHours: 2,
        enableOnlineBooking: true,
        requireDepositForBooking: false,
        depositPercentage: 20,
        cancellationPolicy: {
          enabled: true,
          hoursBeforeAppointment: 24,
          feePercentage: 50,
        },
        noShowPolicy: {
          enabled: true,
          feeAmount: 25,
        },
      },
      features: {
        enableInventoryManagement: true,
        enableFinancialReporting: true,
        enableStaffScheduling: true,
        enableClientPortal: false,
        enableMultiBranch: false,
        enableResourceBooking: false,
        enableWaitlist: true,
        enableRecurringAppointments: true,
      },
    };
  }

  private buildNotificationSettings(settings: any[]): NotificationSettings {
    // Get notification settings from company settings
    const notificationSetting = settings.find(s => s.key === 'notifications');
    const defaults = this.getDefaultNotificationSettings();
    
    if (notificationSetting?.value) {
      return { ...defaults, ...notificationSetting.value };
    }
    
    return defaults;
  }

  private buildIntegrationSettings(settings: any[]): IntegrationSettings {
    // Get integration settings from company settings
    const integrationSetting = settings.find(s => s.key === 'integrations');
    const defaults = this.getDefaultIntegrationSettings();
    
    if (integrationSetting?.value) {
      return { ...defaults, ...integrationSetting.value };
    }
    
    return defaults;
  }

  private async updateCompanySettings(companyId: string, updates: any): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await prisma.companySetting.upsert({
          where: {
            companyId_key: {
              companyId,
              key,
            },
          },
          create: {
            companyId,
            key,
            value: JSON.stringify(value),
          },
          update: {
            value: JSON.stringify(value),
          },
        });
      }
    }
  }

  private async clearSettingsCache(companyId: string): Promise<void> {
    const cacheKey = `settings:${companyId}`;
    await redisService.del(cacheKey);
  }

  private getDefaultSettings() {
    return {
      general: this.buildGeneralSettings({
        name: 'My Business',
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
      }),
      notifications: this.getDefaultNotificationSettings(),
      integrations: this.getDefaultIntegrationSettings(),
    };
  }

  private getDefaultNotificationSettings(): NotificationSettings {
    return {
      email: {
        enabled: true,
        appointmentConfirmation: true,
        appointmentReminder: true,
        appointmentCancellation: true,
        dailySummary: false,
        weeklyReport: false,
        lowInventoryAlert: true,
        overduePaymentReminder: true,
        staffScheduleChanges: true,
      },
      sms: {
        enabled: false,
        appointmentConfirmation: false,
        appointmentReminder: true,
        appointmentCancellation: true,
        provider: 'twilio',
        reminderTimings: [24, 2], // 24 hours and 2 hours before
      },
      whatsapp: {
        enabled: false,
        appointmentConfirmation: false,
        appointmentReminder: true,
        appointmentCancellation: true,
        marketingMessages: false,
        provider: 'twilio',
        reminderTimings: [24, 2],
      },
      push: {
        enabled: false,
        appointmentReminder: true,
        newBooking: true,
        cancellation: true,
        dailySummary: false,
      },
      preferences: {
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
        },
        timezone: 'UTC',
        language: 'en',
      },
    };
  }

  private getDefaultIntegrationSettings(): IntegrationSettings {
    return {
      payment: {
        stripe: {
          enabled: false,
        },
        paypal: {
          enabled: false,
          environment: 'sandbox',
        },
        cash: {
          enabled: true,
        },
        bankTransfer: {
          enabled: false,
        },
      },
      calendar: {
        googleCalendar: {
          enabled: false,
        },
        outlook: {
          enabled: false,
        },
      },
      communication: {
        twilio: {
          enabled: false,
        },
        smtp: {
          enabled: false,
        },
      },
      analytics: {
        googleAnalytics: {
          enabled: false,
        },
        facebookPixel: {
          enabled: false,
        },
      },
      storage: {
        aws: {
          enabled: false,
        },
        cloudinary: {
          enabled: false,
        },
      },
    };
  }

  // Integration testing methods

  private async testTwilioConnection(config: any): Promise<{ success: boolean; message: string }> {
    try {
      // Import twilio dynamically to avoid startup errors if not configured
      const twilio = require('twilio');
      
      if (!config.accountSid || !config.authToken) {
        return {
          success: false,
          message: 'Account SID and Auth Token are required',
        };
      }

      const client = twilio(config.accountSid, config.authToken);
      
      // Test by fetching account info
      await client.api.accounts(config.accountSid).fetch();
      
      return {
        success: true,
        message: 'Twilio connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Twilio connection failed',
      };
    }
  }

  private async testStripeConnection(config: any): Promise<{ success: boolean; message: string }> {
    try {
      if (!config.secretKey) {
        return {
          success: false,
          message: 'Secret key is required',
        };
      }

      // Basic validation - in a real implementation, you'd test with Stripe API
      const isValidKey = config.secretKey.startsWith('sk_');
      
      if (!isValidKey) {
        return {
          success: false,
          message: 'Invalid secret key format',
        };
      }

      return {
        success: true,
        message: 'Stripe configuration appears valid',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Stripe connection failed',
      };
    }
  }

  private async testGoogleCalendarConnection(config: any): Promise<{ success: boolean; message: string }> {
    // Placeholder for Google Calendar connection test
    return {
      success: true,
      message: 'Google Calendar connection test not implemented yet',
    };
  }

  private async testSMTPConnection(config: any): Promise<{ success: boolean; message: string }> {
    try {
      if (!config.host || !config.port) {
        return {
          success: false,
          message: 'Host and port are required',
        };
      }

      // Basic validation - in a real implementation, you'd test actual connection
      return {
        success: true,
        message: 'SMTP configuration appears valid',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'SMTP connection failed',
      };
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService();