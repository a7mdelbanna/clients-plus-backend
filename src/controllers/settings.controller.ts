import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService, CompanySettings, NotificationSettings, IntegrationSettings } from '../services/settings.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';

// Validation schemas
const generalSettingsSchema = z.object({
  general: z.object({
    businessName: z.string().min(1, 'Business name is required').optional(),
    businessType: z.string().optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.string().optional(),
    language: z.string().optional(),
    country: z.string().optional(),
    taxId: z.string().optional(),
    registrationNumber: z.string().optional(),
  }).optional(),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    }).optional(),
  }).optional(),
  branding: z.object({
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
  }).optional(),
  operational: z.object({
    defaultAppointmentDuration: z.number().min(15).max(480).optional(),
    bufferTimeBetweenAppointments: z.number().min(0).max(60).optional(),
    maxAdvanceBookingDays: z.number().min(1).max(365).optional(),
    minAdvanceBookingHours: z.number().min(0).max(72).optional(),
    enableOnlineBooking: z.boolean().optional(),
    requireDepositForBooking: z.boolean().optional(),
    depositPercentage: z.number().min(0).max(100).optional(),
    cancellationPolicy: z.object({
      enabled: z.boolean().optional(),
      hoursBeforeAppointment: z.number().min(0).optional(),
      feePercentage: z.number().min(0).max(100).optional(),
    }).optional(),
    noShowPolicy: z.object({
      enabled: z.boolean().optional(),
      feeAmount: z.number().min(0).optional(),
    }).optional(),
  }).optional(),
  features: z.object({
    enableInventoryManagement: z.boolean().optional(),
    enableFinancialReporting: z.boolean().optional(),
    enableStaffScheduling: z.boolean().optional(),
    enableClientPortal: z.boolean().optional(),
    enableMultiBranch: z.boolean().optional(),
    enableResourceBooking: z.boolean().optional(),
    enableWaitlist: z.boolean().optional(),
    enableRecurringAppointments: z.boolean().optional(),
  }).optional(),
});

const notificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean().optional(),
    appointmentConfirmation: z.boolean().optional(),
    appointmentReminder: z.boolean().optional(),
    appointmentCancellation: z.boolean().optional(),
    dailySummary: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
    lowInventoryAlert: z.boolean().optional(),
    overduePaymentReminder: z.boolean().optional(),
    staffScheduleChanges: z.boolean().optional(),
  }).optional(),
  sms: z.object({
    enabled: z.boolean().optional(),
    appointmentConfirmation: z.boolean().optional(),
    appointmentReminder: z.boolean().optional(),
    appointmentCancellation: z.boolean().optional(),
    provider: z.enum(['twilio', 'custom']).optional(),
    reminderTimings: z.array(z.number().min(1).max(168)).optional(),
  }).optional(),
  whatsapp: z.object({
    enabled: z.boolean().optional(),
    appointmentConfirmation: z.boolean().optional(),
    appointmentReminder: z.boolean().optional(),
    appointmentCancellation: z.boolean().optional(),
    marketingMessages: z.boolean().optional(),
    provider: z.enum(['twilio', 'custom']).optional(),
    reminderTimings: z.array(z.number().min(1).max(168)).optional(),
  }).optional(),
  push: z.object({
    enabled: z.boolean().optional(),
    appointmentReminder: z.boolean().optional(),
    newBooking: z.boolean().optional(),
    cancellation: z.boolean().optional(),
    dailySummary: z.boolean().optional(),
  }).optional(),
  preferences: z.object({
    quietHours: z.object({
      enabled: z.boolean().optional(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    }).optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
  }).optional(),
});

const integrationSettingsSchema = z.object({
  payment: z.object({
    stripe: z.object({
      enabled: z.boolean().optional(),
      publishableKey: z.string().optional(),
      secretKey: z.string().optional(),
      webhookSecret: z.string().optional(),
    }).optional(),
    paypal: z.object({
      enabled: z.boolean().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      environment: z.enum(['sandbox', 'production']).optional(),
    }).optional(),
    cash: z.object({
      enabled: z.boolean().optional(),
    }).optional(),
    bankTransfer: z.object({
      enabled: z.boolean().optional(),
      instructions: z.string().optional(),
    }).optional(),
  }).optional(),
  calendar: z.object({
    googleCalendar: z.object({
      enabled: z.boolean().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      refreshToken: z.string().optional(),
      calendarId: z.string().optional(),
    }).optional(),
    outlook: z.object({
      enabled: z.boolean().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      refreshToken: z.string().optional(),
    }).optional(),
  }).optional(),
  communication: z.object({
    twilio: z.object({
      enabled: z.boolean().optional(),
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      phoneNumber: z.string().optional(),
      whatsappNumber: z.string().optional(),
    }).optional(),
    smtp: z.object({
      enabled: z.boolean().optional(),
      host: z.string().optional(),
      port: z.number().optional(),
      secure: z.boolean().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional(),
  }).optional(),
  analytics: z.object({
    googleAnalytics: z.object({
      enabled: z.boolean().optional(),
      trackingId: z.string().optional(),
    }).optional(),
    facebookPixel: z.object({
      enabled: z.boolean().optional(),
      pixelId: z.string().optional(),
    }).optional(),
  }).optional(),
  storage: z.object({
    aws: z.object({
      enabled: z.boolean().optional(),
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
      region: z.string().optional(),
      bucket: z.string().optional(),
    }).optional(),
    cloudinary: z.object({
      enabled: z.boolean().optional(),
      cloudName: z.string().optional(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
    }).optional(),
  }).optional(),
});

const testIntegrationSchema = z.object({
  integration: z.enum(['twilio', 'stripe', 'google_calendar', 'smtp']),
  config: z.object({}).passthrough(), // Allow any config object for testing
});

export class SettingsController {
  /**
   * Get all settings
   * GET /api/v1/settings
   */
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      logger.info(`Getting settings for company ${companyId}`);

      const settings = await settingsService.getSettings(companyId);

      res.json(successResponse(settings, 'Settings retrieved successfully'));
    } catch (error) {
      logger.error('Error in getSettings:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Update general settings
   * PUT /api/v1/settings
   */
  async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = generalSettingsSchema.parse(req.body);
      const { companyId } = req.user!;

      logger.info(`Updating settings for company ${companyId}`, {
        updatedSections: Object.keys(validatedData),
      });

      const updatedSettings = await settingsService.updateSettings(companyId, validatedData as any);

      res.json(successResponse(updatedSettings, 'Settings updated successfully'));
    } catch (error) {
      logger.error('Error in updateSettings:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.issues));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get notification settings
   * GET /api/v1/settings/notifications
   */
  async getNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      logger.info(`Getting notification settings for company ${companyId}`);

      const notificationSettings = await settingsService.getNotificationSettings(companyId);

      res.json(successResponse(notificationSettings, 'Notification settings retrieved successfully'));
    } catch (error) {
      logger.error('Error in getNotificationSettings:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Update notification settings
   * PUT /api/v1/settings/notifications
   */
  async updateNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = notificationSettingsSchema.parse(req.body);
      const { companyId } = req.user!;

      logger.info(`Updating notification settings for company ${companyId}`, {
        updatedChannels: Object.keys(validatedData),
      });

      const updatedSettings = await settingsService.updateNotificationSettings(companyId, validatedData as any);

      res.json(successResponse(updatedSettings, 'Notification settings updated successfully'));
    } catch (error) {
      logger.error('Error in updateNotificationSettings:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.issues));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get integration settings
   * GET /api/v1/settings/integrations
   */
  async getIntegrationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      logger.info(`Getting integration settings for company ${companyId}`);

      const integrationSettings = await settingsService.getIntegrationSettings(companyId);

      // Mask sensitive data in response
      const maskedSettings = this.maskSensitiveData(integrationSettings);

      res.json(successResponse(maskedSettings, 'Integration settings retrieved successfully'));
    } catch (error) {
      logger.error('Error in getIntegrationSettings:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Update integration settings
   * PUT /api/v1/settings/integrations
   */
  async updateIntegrationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = integrationSettingsSchema.parse(req.body);
      const { companyId } = req.user!;

      logger.info(`Updating integration settings for company ${companyId}`, {
        updatedIntegrations: Object.keys(validatedData),
      });

      const updatedSettings = await settingsService.updateIntegrationSettings(companyId, validatedData as any);

      // Mask sensitive data in response
      const maskedSettings = this.maskSensitiveData(updatedSettings);

      res.json(successResponse(maskedSettings, 'Integration settings updated successfully'));
    } catch (error) {
      logger.error('Error in updateIntegrationSettings:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.issues));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Test integration connection
   * POST /api/v1/settings/integrations/test
   */
  async testIntegration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = testIntegrationSchema.parse(req.body);
      const { companyId } = req.user!;

      logger.info(`Testing ${validatedData.integration} integration for company ${companyId}`);

      const result = await settingsService.testIntegration(
        companyId,
        validatedData.integration,
        validatedData.config
      );

      if (result.success) {
        res.json(successResponse(result, 'Integration test successful'));
      } else {
        res.status(400).json(errorResponse(result.message, 'INTEGRATION_TEST_FAILED', result));
      }
    } catch (error) {
      logger.error('Error in testIntegration:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', error.issues));
      } else {
        res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Reset settings to defaults
   * POST /api/v1/settings/reset
   */
  async resetSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { section } = req.body;
      const { companyId } = req.user!;

      const validSections = ['general', 'notifications', 'integrations', 'all'];
      const sectionToReset = validSections.includes(section) ? section : 'all';

      logger.info(`Resetting ${sectionToReset} settings for company ${companyId}`);

      await settingsService.resetSettings(companyId, sectionToReset as any);

      res.json(successResponse(
        { section: sectionToReset, resetAt: new Date().toISOString() },
        `${sectionToReset} settings reset to defaults successfully`
      ));
    } catch (error) {
      logger.error('Error in resetSettings:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Export settings
   * GET /api/v1/settings/export
   */
  async exportSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      logger.info(`Exporting settings for company ${companyId}`);

      const settings = await settingsService.getSettings(companyId);

      // Create export data with metadata
      const exportData = {
        exportedAt: new Date().toISOString(),
        companyId,
        version: '1.0',
        settings,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="settings-${companyId}-${new Date().toISOString().split('T')[0]}.json"`);

      res.json(successResponse(exportData, 'Settings exported successfully'));
    } catch (error) {
      logger.error('Error in exportSettings:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get settings categories and their status
   * GET /api/v1/settings/categories
   */
  async getSettingsCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      const settings = await settingsService.getSettings(companyId);

      const categories = [
        {
          id: 'general',
          name: 'General Settings',
          description: 'Basic business information and operational settings',
          configured: true, // Always considered configured
          sections: [
            'Business Information',
            'Contact Details',
            'Branding',
            'Operational Settings',
            'Features',
          ],
        },
        {
          id: 'notifications',
          name: 'Notification Settings',
          description: 'Configure how and when to send notifications to clients and staff',
          configured: this.isNotificationConfigured(settings.notifications),
          sections: [
            'Email Notifications',
            'SMS Notifications',
            'WhatsApp Notifications',
            'Push Notifications',
            'Preferences',
          ],
        },
        {
          id: 'integrations',
          name: 'Integrations',
          description: 'Connect with third-party services and platforms',
          configured: this.isIntegrationConfigured(settings.integrations),
          sections: [
            'Payment Processors',
            'Calendar Integration',
            'Communication Channels',
            'Analytics',
            'File Storage',
          ],
        },
      ];

      res.json(successResponse(categories, 'Settings categories retrieved successfully'));
    } catch (error) {
      logger.error('Error in getSettingsCategories:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  // Private helper methods

  private maskSensitiveData(settings: IntegrationSettings): IntegrationSettings {
    const masked = JSON.parse(JSON.stringify(settings));

    // Mask payment credentials
    if (masked.payment?.stripe?.secretKey) {
      masked.payment.stripe.secretKey = this.maskString(masked.payment.stripe.secretKey);
    }
    if (masked.payment?.stripe?.webhookSecret) {
      masked.payment.stripe.webhookSecret = this.maskString(masked.payment.stripe.webhookSecret);
    }
    if (masked.payment?.paypal?.clientSecret) {
      masked.payment.paypal.clientSecret = this.maskString(masked.payment.paypal.clientSecret);
    }

    // Mask communication credentials
    if (masked.communication?.twilio?.authToken) {
      masked.communication.twilio.authToken = this.maskString(masked.communication.twilio.authToken);
    }
    if (masked.communication?.smtp?.password) {
      masked.communication.smtp.password = this.maskString(masked.communication.smtp.password);
    }

    // Mask calendar credentials
    if (masked.calendar?.googleCalendar?.clientSecret) {
      masked.calendar.googleCalendar.clientSecret = this.maskString(masked.calendar.googleCalendar.clientSecret);
    }
    if (masked.calendar?.googleCalendar?.refreshToken) {
      masked.calendar.googleCalendar.refreshToken = this.maskString(masked.calendar.googleCalendar.refreshToken);
    }
    if (masked.calendar?.outlook?.clientSecret) {
      masked.calendar.outlook.clientSecret = this.maskString(masked.calendar.outlook.clientSecret);
    }
    if (masked.calendar?.outlook?.refreshToken) {
      masked.calendar.outlook.refreshToken = this.maskString(masked.calendar.outlook.refreshToken);
    }

    // Mask storage credentials
    if (masked.storage?.aws?.secretAccessKey) {
      masked.storage.aws.secretAccessKey = this.maskString(masked.storage.aws.secretAccessKey);
    }
    if (masked.storage?.cloudinary?.apiSecret) {
      masked.storage.cloudinary.apiSecret = this.maskString(masked.storage.cloudinary.apiSecret);
    }

    return masked;
  }

  private maskString(str: string): string {
    if (!str || str.length <= 4) return '****';
    return str.substring(0, 4) + '*'.repeat(str.length - 4);
  }

  private isNotificationConfigured(settings: NotificationSettings): boolean {
    return settings.email.enabled || settings.sms.enabled || settings.whatsapp.enabled || settings.push.enabled;
  }

  private isIntegrationConfigured(settings: IntegrationSettings): boolean {
    return (
      settings.payment.stripe.enabled ||
      settings.payment.paypal.enabled ||
      settings.calendar.googleCalendar.enabled ||
      settings.calendar.outlook.enabled ||
      settings.communication.twilio.enabled ||
      settings.communication.smtp.enabled ||
      settings.analytics.googleAnalytics.enabled ||
      settings.analytics.facebookPixel.enabled ||
      settings.storage.aws.enabled ||
      settings.storage.cloudinary.enabled
    );
  }
}

// Export singleton instance
export const settingsController = new SettingsController();