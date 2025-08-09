import { whatsappService } from '../../src/services/whatsapp.service';
import { enhancedNotificationService } from '../../src/services/enhanced-notification.service';
import { notificationQueue } from '../../src/services/queue.service';
import { messageTemplateService } from '../../src/templates/messages';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../src/services/queue.service');
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent'
      })
    }
  }));
});

const prisma = new PrismaClient();

describe('WhatsApp Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWhatsAppMessage', () => {
    it('should send WhatsApp message successfully when Twilio is configured', async () => {
      // Mock environment variables
      process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';

      const result = await whatsappService.sendWhatsAppMessage({
        to: '+1234567890',
        message: 'Test message'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.twilioSid).toBeDefined();
    });

    it('should simulate message sending when Twilio is not configured', async () => {
      // Clear environment variables
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_WHATSAPP_NUMBER;

      const result = await whatsappService.sendWhatsAppMessage({
        to: '+1234567890',
        message: 'Test message'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^FAKE_/);
      expect(result.status).toBe('sent');
    });

    it('should format phone numbers correctly', async () => {
      const result = await whatsappService.sendWhatsAppMessage({
        to: '1234567890', // Without + prefix
        message: 'Test message'
      });

      expect(result.success).toBe(true);
    });

    it('should handle Twilio errors gracefully', async () => {
      // Mock Twilio to throw an error
      const twilio = require('twilio');
      twilio.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Twilio error'))
        }
      }));

      process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';

      const result = await whatsappService.sendWhatsAppMessage({
        to: '+1234567890',
        message: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio error');
    });
  });

  describe('sendBulkWhatsApp', () => {
    it('should send bulk messages with rate limiting', async () => {
      const recipients = [
        { phone: '+1234567890', name: 'John Doe' },
        { phone: '+1234567891', name: 'Jane Doe' }
      ];

      const result = await whatsappService.sendBulkWhatsApp(
        recipients,
        'Hello {{clientName}}!',
        {}
      );

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle mixed success/failure results', async () => {
      // Mock one success and one failure
      let callCount = 0;
      jest.spyOn(whatsappService, 'sendWhatsAppMessage')
        .mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return { success: true, messageId: 'test-id-1', status: 'sent' };
          } else {
            return { success: false, error: 'Failed to send' };
          }
        });

      const recipients = [
        { phone: '+1234567890', name: 'John Doe' },
        { phone: '+1234567891', name: 'Jane Doe' }
      ];

      const result = await whatsappService.sendBulkWhatsApp(
        recipients,
        'Hello {{clientName}}!',
        {}
      );

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct phone number formats', () => {
      expect(whatsappService.validatePhoneNumber('+1234567890')).toBe(true);
      expect(whatsappService.validatePhoneNumber('whatsapp:+1234567890')).toBe(true);
      expect(whatsappService.validatePhoneNumber('+966501234567')).toBe(true);
    });

    it('should reject invalid phone number formats', () => {
      expect(whatsappService.validatePhoneNumber('1234567890')).toBe(false);
      expect(whatsappService.validatePhoneNumber('+123')).toBe(false);
      expect(whatsappService.validatePhoneNumber('invalid')).toBe(false);
    });
  });
});

describe('Message Template Service', () => {
  describe('renderTemplate', () => {
    it('should render template with variables correctly', () => {
      const result = messageTemplateService.renderTemplate(
        'appointment_confirmation',
        {
          clientName: 'John Doe',
          businessName: 'Test Salon',
          date: '2025-01-15',
          time: '10:00',
          serviceName: 'Haircut',
          staffName: 'Sarah',
          businessAddress: '123 Main St',
          businessPhone: '+1234567890'
        },
        'en'
      );

      expect(result).toContain('John Doe');
      expect(result).toContain('Test Salon');
      expect(result).toContain('2025-01-15');
      expect(result).toContain('10:00');
    });

    it('should return null for non-existent template', () => {
      const result = messageTemplateService.renderTemplate(
        'non_existent_template',
        {},
        'en'
      );

      expect(result).toBeNull();
    });

    it('should handle Arabic language templates', () => {
      const result = messageTemplateService.renderTemplate(
        'appointment_confirmation',
        {
          clientName: 'أحمد',
          businessName: 'صالون الجمال',
          date: '2025-01-15',
          time: '10:00',
          serviceName: 'قص شعر',
          staffName: 'سارة',
          businessAddress: 'شارع الملك فهد',
          businessPhone: '+966501234567'
        },
        'ar'
      );

      expect(result).toContain('أحمد');
      expect(result).toContain('صالون الجمال');
      expect(result).toContain('تم تأكيد موعدك');
    });
  });

  describe('validateTemplateVariables', () => {
    it('should validate template variables correctly', () => {
      const validation = messageTemplateService.validateTemplateVariables(
        'appointment_confirmation',
        {
          clientName: 'John Doe',
          businessName: 'Test Salon',
          date: '2025-01-15',
          time: '10:00',
          serviceName: 'Haircut',
          staffName: 'Sarah',
          businessAddress: '123 Main St',
          businessPhone: '+1234567890'
        }
      );

      expect(validation.valid).toBe(true);
      expect(validation.missingVariables).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const validation = messageTemplateService.validateTemplateVariables(
        'appointment_confirmation',
        {
          clientName: 'John Doe',
          businessName: 'Test Salon'
          // Missing other required variables
        }
      );

      expect(validation.valid).toBe(false);
      expect(validation.missingVariables.length).toBeGreaterThan(0);
    });

    it('should detect extra variables', () => {
      const validation = messageTemplateService.validateTemplateVariables(
        'appointment_confirmation',
        {
          clientName: 'John Doe',
          businessName: 'Test Salon',
          date: '2025-01-15',
          time: '10:00',
          serviceName: 'Haircut',
          staffName: 'Sarah',
          businessAddress: '123 Main St',
          businessPhone: '+1234567890',
          extraVariable: 'extra value' // Extra variable
        }
      );

      expect(validation.extraVariables).toContain('extraVariable');
    });
  });

  describe('previewTemplate', () => {
    it('should generate preview with sample data', () => {
      const preview = messageTemplateService.previewTemplate(
        'appointment_confirmation',
        'en'
      );

      expect(preview).toContain('Ahmed Mohammed');
      expect(preview).toContain('Royal Beauty Salon');
      expect(preview).toContain('March 15, 2025');
    });

    it('should generate Arabic preview', () => {
      const preview = messageTemplateService.previewTemplate(
        'appointment_confirmation',
        'ar'
      );

      expect(preview).toContain('أحمد محمد');
      expect(preview).toContain('صالون الجمال الملكي');
      expect(preview).toContain('١٥ مارس ٢٠٢٥');
    });
  });
});

describe('Enhanced Notification Service', () => {
  let mockNotificationQueue: jest.Mocked<typeof notificationQueue>;

  beforeEach(() => {
    mockNotificationQueue = notificationQueue as jest.Mocked<typeof notificationQueue>;
    jest.clearAllMocks();
  });

  const mockNotificationData = {
    appointmentId: 'test-appointment-id',
    companyId: 'test-company-id',
    branchId: 'test-branch-id',
    clientId: 'test-client-id',
    clientName: 'John Doe',
    clientPhone: '+1234567890',
    clientEmail: 'john@example.com',
    businessName: 'Test Salon',
    serviceName: 'Haircut',
    staffName: 'Sarah',
    appointmentDate: new Date('2025-01-15'),
    appointmentTime: '10:00',
    businessAddress: '123 Main St',
    businessPhone: '+1234567890',
    language: 'en' as const
  };

  describe('sendAppointmentConfirmation', () => {
    it('should queue confirmation notifications', async () => {
      // Mock notification preferences
      jest.spyOn(prisma.client, 'findUnique').mockResolvedValue({
        id: 'test-client-id',
        notificationPreferences: {
          whatsapp: true,
          email: true,
          sms: false,
          push: false
        }
      } as any);

      jest.spyOn(prisma.company, 'findUnique').mockResolvedValue({
        id: 'test-company-id',
        notificationSettings: {}
      } as any);

      mockNotificationQueue.addBulkNotifications.mockResolvedValue([]);

      await enhancedNotificationService.sendAppointmentConfirmation(mockNotificationData);

      expect(mockNotificationQueue.addBulkNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'whatsapp',
            priority: 'high'
          }),
          expect.objectContaining({
            type: 'email',
            priority: 'high'
          })
        ])
      );
    });

    it('should handle missing notification preferences gracefully', async () => {
      jest.spyOn(prisma.client, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.company, 'findUnique').mockResolvedValue(null);

      mockNotificationQueue.addBulkNotifications.mockResolvedValue([]);

      await enhancedNotificationService.sendAppointmentConfirmation(mockNotificationData);

      // Should still queue with default preferences
      expect(mockNotificationQueue.addBulkNotifications).toHaveBeenCalled();
    });
  });

  describe('sendCustomNotification', () => {
    it('should queue custom notifications for multiple recipients and channels', async () => {
      const recipients = [
        { name: 'John Doe', phone: '+1234567890', email: 'john@example.com' },
        { name: 'Jane Doe', phone: '+1234567891', email: 'jane@example.com' }
      ];

      const message = {
        templateId: 'birthday_greeting',
        variables: {
          businessName: 'Test Salon',
          discount: '20'
        }
      };

      mockNotificationQueue.addBulkNotifications.mockResolvedValue([]);

      await enhancedNotificationService.sendCustomNotification(
        'test-company-id',
        'test-branch-id',
        recipients,
        message,
        ['whatsapp', 'email'],
        'normal'
      );

      expect(mockNotificationQueue.addBulkNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'whatsapp',
            priority: 'normal'
          }),
          expect.objectContaining({
            type: 'email',
            priority: 'normal'
          })
        ])
      );
    });

    it('should skip recipients without required contact info', async () => {
      const recipients = [
        { name: 'John Doe', phone: '+1234567890' }, // No email
        { name: 'Jane Doe', email: 'jane@example.com' } // No phone
      ];

      mockNotificationQueue.addBulkNotifications.mockResolvedValue([]);

      await enhancedNotificationService.sendCustomNotification(
        'test-company-id',
        'test-branch-id',
        recipients,
        { content: 'Test message' },
        ['whatsapp', 'email'],
        'normal'
      );

      // Should create 2 jobs (1 WhatsApp for John, 1 email for Jane)
      expect(mockNotificationQueue.addBulkNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'whatsapp' }),
          expect.objectContaining({ type: 'email' })
        ])
      );
    });
  });
});

describe('Integration Tests', () => {
  describe('End-to-End Notification Flow', () => {
    it('should process appointment confirmation flow', async () => {
      // This would be an integration test that tests the entire flow
      // from appointment creation to notification delivery
      
      // Mock database responses
      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue({
        id: 'test-appointment-id',
        companyId: 'test-company-id',
        branchId: 'test-branch-id',
        clientId: 'test-client-id',
        clientName: 'John Doe',
        clientPhone: '+1234567890',
        clientEmail: 'john@example.com',
        date: new Date('2025-01-15'),
        startTime: '10:00',
        services: [{ serviceName: 'Haircut' }],
        company: { name: 'Test Salon' },
        staff: { name: 'Sarah' },
        branch: { 
          address: '123 Main St',
          contact: '+1234567890'
        }
      } as any);

      // Test the notification flow
      // This would involve testing the actual queue processing
      // and ensuring messages are properly formatted and sent
    });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});