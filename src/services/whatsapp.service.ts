import twilio, { Twilio } from 'twilio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WhatsAppMessage {
  to: string;
  message: string;
  mediaUrl?: string;
  templateId?: string;
}

export interface WhatsAppTemplateParams {
  clientName: string;
  businessName: string;
  date: string;
  time: string;
  service: string;
  staffName?: string;
  businessAddress?: string;
  businessPhone?: string;
  googleMapsLink?: string;
  reminderTime?: string;
}

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  twilioSid?: string;
  error?: string;
  status?: string;
}

export class WhatsAppService {
  private twilioClient: Twilio | null = null;
  private config: WhatsAppConfig | null = null;

  constructor() {
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client with environment variables
   */
  private initializeTwilio(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (accountSid && authToken && whatsappNumber) {
      this.twilioClient = twilio(accountSid, authToken);
      this.config = {
        accountSid,
        authToken,
        whatsappNumber
      };
      console.log('Twilio WhatsApp client initialized');
    } else {
      console.warn('Twilio WhatsApp credentials not configured, messages will be simulated');
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendWhatsAppMessage(params: WhatsAppMessage): Promise<MessageResponse> {
    try {
      // Format phone numbers for WhatsApp
      const toNumber = this.formatWhatsAppNumber(params.to);
      const fromNumber = this.config?.whatsappNumber ? 
        this.formatWhatsAppNumber(this.config.whatsappNumber) : 
        'whatsapp:+14155238886'; // Default Twilio sandbox number

      // If Twilio is configured, send actual message
      if (this.twilioClient && this.config) {
        try {
          const message = await this.twilioClient.messages.create({
            body: params.message,
            from: fromNumber,
            to: toNumber,
            ...(params.mediaUrl && { mediaUrl: [params.mediaUrl] })
          });

          console.log('WhatsApp message sent successfully via Twilio:', message.sid);

          return {
            success: true,
            messageId: message.sid,
            twilioSid: message.sid,
            status: message.status
          };
        } catch (twilioError: any) {
          console.error('Twilio send error:', twilioError);
          
          // Return error but don't throw - caller can handle gracefully
          return {
            success: false,
            error: twilioError.message || 'Twilio send failed'
          };
        }
      } else {
        // Simulate message sending for testing
        console.log('Simulating WhatsApp message send:');
        console.log(`To: ${toNumber}`);
        console.log(`From: ${fromNumber}`);
        console.log(`Message: ${params.message}`);
        
        // Generate a fake message ID for testing
        const fakeMessageId = `FAKE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          success: true,
          messageId: fakeMessageId,
          status: 'sent'
        };
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Send bulk WhatsApp messages with rate limiting
   */
  async sendBulkWhatsApp(
    recipients: { phone: string; name: string }[], 
    messageTemplate: string, 
    templateParams: Partial<WhatsAppTemplateParams> = {}
  ): Promise<{ sent: number; failed: number; results: MessageResponse[] }> {
    const results: MessageResponse[] = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        // Personalize message for each recipient
        const personalizedMessage = this.replaceTemplateVars(messageTemplate, {
          ...templateParams,
          clientName: recipient.name
        });

        const result = await this.sendWhatsAppMessage({
          to: recipient.phone,
          message: personalizedMessage
        });

        results.push(result);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Rate limiting: wait 1 second between messages to comply with Twilio limits
        if (i < recipients.length - 1) {
          await this.delay(1000);
        }
        
      } catch (error: any) {
        console.error(`Error sending to ${recipient.phone}:`, error);
        results.push({
          success: false,
          error: error.message
        });
        failed++;
      }
    }

    console.log(`Bulk WhatsApp send completed: ${sent} sent, ${failed} failed`);
    
    return { sent, failed, results };
  }

  /**
   * Send appointment confirmation WhatsApp message
   */
  async sendAppointmentConfirmation(params: WhatsAppTemplateParams & { to: string }): Promise<MessageResponse> {
    const messageText = this.buildConfirmationMessage(params);
    
    return await this.sendWhatsAppMessage({
      to: params.to,
      message: messageText
    });
  }

  /**
   * Send appointment reminder WhatsApp message
   */
  async sendAppointmentReminder(params: WhatsAppTemplateParams & { to: string }): Promise<MessageResponse> {
    const messageText = this.buildReminderMessage(params);
    
    return await this.sendWhatsAppMessage({
      to: params.to,
      message: messageText
    });
  }

  /**
   * Send appointment cancellation WhatsApp message
   */
  async sendAppointmentCancellation(params: WhatsAppTemplateParams & { to: string }): Promise<MessageResponse> {
    const messageText = this.buildCancellationMessage(params);
    
    return await this.sendWhatsAppMessage({
      to: params.to,
      message: messageText
    });
  }

  /**
   * Send appointment reschedule WhatsApp message
   */
  async sendAppointmentReschedule(params: WhatsAppTemplateParams & { to: string; newDate: string; newTime: string }): Promise<MessageResponse> {
    const messageText = this.buildRescheduleMessage(params);
    
    return await this.sendWhatsAppMessage({
      to: params.to,
      message: messageText
    });
  }

  /**
   * Build appointment confirmation message
   */
  private buildConfirmationMessage(params: WhatsAppTemplateParams): string {
    let messageText = `*تأكيد الموعد في ${params.businessName}* 📅\n\n`;
    messageText += `مرحباً ${params.clientName}،\n\n`;
    messageText += `تم تأكيد موعدك بنجاح:\n\n`;
    messageText += `📅 *التاريخ:* ${params.date}\n`;
    messageText += `⏰ *الوقت:* ${params.time}\n`;
    messageText += `💇 *الخدمة:* ${params.service}\n`;
    
    if (params.staffName) {
      messageText += `👤 *الأخصائي:* ${params.staffName}\n`;
    }
    
    messageText += `\n🏢 *تفاصيل الصالون:*\n`;
    messageText += `${params.businessName}\n`;
    
    if (params.businessAddress) {
      messageText += `\n📍 *العنوان:*\n`;
      messageText += `${params.businessAddress}\n`;
    }
    
    if (params.googleMapsLink) {
      messageText += `\n🗺️ *موقع على الخريطة:*\n`;
      messageText += `${params.googleMapsLink}\n`;
    }
    
    if (params.businessPhone) {
      messageText += `\n📞 *للاتصال:* ${params.businessPhone}\n`;
    }
    
    messageText += `\nنتطلع لرؤيتك! 🌟\n\n`;
    messageText += `_للإلغاء أو تغيير الموعد، يرجى التواصل معنا_`;

    return messageText;
  }

  /**
   * Build appointment reminder message
   */
  private buildReminderMessage(params: WhatsAppTemplateParams): string {
    const reminderTimeText = params.reminderTime || 'قريباً';
    
    let messageText = `*تذكير بموعدك في ${params.businessName}* ⏰\n\n`;
    messageText += `مرحباً ${params.clientName}،\n\n`;
    messageText += `نذكرك بموعدك ${reminderTimeText}:\n\n`;
    messageText += `📅 *التاريخ:* ${params.date}\n`;
    messageText += `⏰ *الوقت:* ${params.time}\n`;
    messageText += `💇 *الخدمة:* ${params.service}\n`;
    
    if (params.staffName) {
      messageText += `👤 *الأخصائي:* ${params.staffName}\n`;
    }
    
    messageText += `\n📍 *موقع الفرع:*\n`;
    if (params.googleMapsLink) {
      messageText += `${params.googleMapsLink}\n`;
    } else if (params.businessAddress) {
      messageText += `${params.businessAddress}\n`;
    }
    
    messageText += `\nنتطلع لرؤيتك! 🌟`;

    return messageText;
  }

  /**
   * Build appointment cancellation message
   */
  private buildCancellationMessage(params: WhatsAppTemplateParams): string {
    let messageText = `*إلغاء الموعد في ${params.businessName}* ❌\n\n`;
    messageText += `مرحباً ${params.clientName}،\n\n`;
    messageText += `نأسف لإبلاغك بأن موعدك قد تم إلغاؤه:\n\n`;
    messageText += `📅 *التاريخ:* ${params.date}\n`;
    messageText += `⏰ *الوقت:* ${params.time}\n`;
    messageText += `💇 *الخدمة:* ${params.service}\n`;
    
    if (params.businessPhone) {
      messageText += `\n📞 *للحجز مرة أخرى، اتصل بنا على:* ${params.businessPhone}\n`;
    }
    
    messageText += `\nنعتذر عن أي إزعاج وبإمكانك التواصل معنا لحجز موعد جديد 🙏`;

    return messageText;
  }

  /**
   * Build appointment reschedule message
   */
  private buildRescheduleMessage(params: WhatsAppTemplateParams & { newDate?: string; newTime?: string }): string {
    let messageText = `*تغيير موعد في ${params.businessName}* 📅\n\n`;
    messageText += `مرحباً ${params.clientName}،\n\n`;
    messageText += `تم تغيير موعدك إلى:\n\n`;
    messageText += `📅 *التاريخ الجديد:* ${params.newDate || params.date}\n`;
    messageText += `⏰ *الوقت الجديد:* ${params.newTime || params.time}\n`;
    messageText += `💇 *الخدمة:* ${params.service}\n`;
    
    if (params.staffName) {
      messageText += `👤 *الأخصائي:* ${params.staffName}\n`;
    }
    
    if (params.businessAddress) {
      messageText += `\n📍 *العنوان:* ${params.businessAddress}\n`;
    }
    
    messageText += `\nشكراً لتفهمك ونتطلع لرؤيتك في الموعد الجديد! 🌟`;

    return messageText;
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatWhatsAppNumber(phoneNumber: string): string {
    // Remove any existing whatsapp: prefix
    let cleanNumber = phoneNumber.replace(/^whatsapp:/, '');
    
    // Ensure number starts with +
    if (!cleanNumber.startsWith('+')) {
      cleanNumber = '+' + cleanNumber;
    }
    
    // Add whatsapp: prefix
    return `whatsapp:${cleanNumber}`;
  }

  /**
   * Replace template variables in message
   */
  private replaceTemplateVars(template: string, params: Partial<WhatsAppTemplateParams>): string {
    let message = template;
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        message = message.replace(regex, value.toString());
      }
    });
    
    return message;
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic validation for international format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');
    return phoneRegex.test(cleanNumber);
  }

  /**
   * Get current configuration status
   */
  getConfigurationStatus(): { configured: boolean; details: string } {
    if (this.twilioClient && this.config) {
      return {
        configured: true,
        details: `Configured with account ${this.config.accountSid.substr(0, 10)}...`
      };
    }
    
    return {
      configured: false,
      details: 'Twilio credentials not configured - messages will be simulated'
    };
  }
}

export const whatsappService = new WhatsAppService();