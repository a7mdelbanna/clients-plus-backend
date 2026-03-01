import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// WhatsApp Message Types
export interface WhatsAppMessage {
  id?: string;
  companyId: string;
  clientId: string;
  appointmentId?: string;
  to: string; // Phone number with country code
  type: 'appointment_confirmation' | 'appointment_reminder' | 'follow_up' | 'custom';
  templateName?: string;
  templateLanguage: 'ar' | 'en';
  parameters?: Record<string, string>; // Template variable values
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  messageId?: string; // WhatsApp message ID
  error?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// WhatsApp Configuration
export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'twilio' | 'whatsapp_cloud' | 'custom';
  accountSid?: string; // For Twilio
  authToken?: string; // For Twilio
  twilioWhatsAppNumber?: string; // For Twilio WhatsApp number
  phoneNumberId?: string; // For WhatsApp Cloud API
  accessToken?: string; // For WhatsApp Cloud API
  webhookUrl?: string;
  defaultLanguage: 'ar' | 'en';
}

// WhatsApp Template
export interface WhatsAppTemplate {
  id: string;
  name: string;
  type: 'appointment_confirmation' | 'appointment_reminder' | 'follow_up' | 'custom';
  language: 'ar' | 'en';
  header?: string;
  body: string;
  footer?: string;
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'phone_number';
    text: string;
    payload?: string;
  }>;
  variables: string[]; // List of variable names used in template
  approved: boolean; // WhatsApp approval status
}

// Default message templates
const defaultTemplates: Record<string, WhatsAppTemplate> = {
  appointment_confirmation_ar: {
    id: 'appointment_confirmation_ar',
    name: 'appointment_confirmation',
    type: 'appointment_confirmation',
    language: 'ar',
    header: 'تأكيد الموعد',
    body: 'مرحباً {{clientName}}،\n\nتم تأكيد موعدك:\n📅 التاريخ: {{date}}\n⏰ الوقت: {{time}}\n💇 الخدمة: {{service}}\n👤 مع: {{staffName}}\n\nالعنوان: {{businessAddress}}\n\nللإلغاء أو التعديل، يرجى الاتصال بنا.',
    footer: '{{businessName}}',
    buttons: [
      {
        type: 'phone_number',
        text: 'اتصل بنا',
        payload: '{{businessPhone}}'
      }
    ],
    variables: ['clientName', 'date', 'time', 'service', 'staffName', 'businessAddress', 'businessName', 'businessPhone'],
    approved: true
  },
  appointment_confirmation_en: {
    id: 'appointment_confirmation_en',
    name: 'appointment_confirmation',
    type: 'appointment_confirmation',
    language: 'en',
    header: 'Appointment Confirmation',
    body: 'Hello {{clientName}},\n\nYour appointment is confirmed:\n📅 Date: {{date}}\n⏰ Time: {{time}}\n💇 Service: {{service}}\n👤 With: {{staffName}}\n\nAddress: {{businessAddress}}\n\nTo cancel or reschedule, please contact us.',
    footer: '{{businessName}}',
    buttons: [
      {
        type: 'phone_number',
        text: 'Call Us',
        payload: '{{businessPhone}}'
      }
    ],
    variables: ['clientName', 'date', 'time', 'service', 'staffName', 'businessAddress', 'businessName', 'businessPhone'],
    approved: true
  },
  appointment_reminder_ar: {
    id: 'appointment_reminder_ar',
    name: 'appointment_reminder',
    type: 'appointment_reminder',
    language: 'ar',
    header: 'تذكير بالموعد',
    body: 'مرحباً {{clientName}}،\n\nنذكرك بموعدك {{reminderTime}}:\n📅 التاريخ: {{date}}\n⏰ الوقت: {{time}}\n💇 الخدمة: {{service}}\n\nنتطلع لرؤيتك!',
    footer: '{{businessName}}',
    variables: ['clientName', 'reminderTime', 'date', 'time', 'service', 'businessName'],
    approved: true
  },
  appointment_reminder_en: {
    id: 'appointment_reminder_en',
    name: 'appointment_reminder',
    type: 'appointment_reminder',
    language: 'en',
    header: 'Appointment Reminder',
    body: 'Hello {{clientName}},\n\nThis is a reminder for your appointment {{reminderTime}}:\n📅 Date: {{date}}\n⏰ Time: {{time}}\n💇 Service: {{service}}\n\nWe look forward to seeing you!',
    footer: '{{businessName}}',
    variables: ['clientName', 'reminderTime', 'date', 'time', 'service', 'businessName'],
    approved: true
  }
};

class WhatsAppService {
  private readonly endpoint = '/whatsapp';

  // Get WhatsApp configuration for a company
  async getConfig(companyId: string): Promise<WhatsAppConfig | null> {
    try {
      const response = await apiClient.get<ApiResponse<WhatsAppConfig>>(`${this.endpoint}/config`);
      return response.data.data || null;
    } catch (error) {
      console.error('Error getting WhatsApp config:', error);
      return null;
    }
  }

  // Save WhatsApp configuration
  async saveConfig(companyId: string, config: WhatsAppConfig): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/config`, config);
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      throw error;
    }
  }

  // Format phone number for WhatsApp (must include country code)
  formatPhoneNumber(phone: string, countryCode: string = '20'): string {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +, preserve it
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // Add country code if not present
    if (!cleaned.startsWith(countryCode)) {
      cleaned = countryCode + cleaned;
    }

    // Always add + prefix for international format
    return '+' + cleaned;
  }

  // Send WhatsApp message
  async sendMessage(
    companyId: string,
    message: Omit<WhatsAppMessage, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const formattedPhone = this.formatPhoneNumber(message.to);

      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/send`, {
        ...message,
        to: formattedPhone,
      });
      if (!response.data.success) throw new Error(response.data.message || 'Failed to send message');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to send WhatsApp message');
    }
  }

  // Send appointment confirmation
  async sendAppointmentConfirmation(
    companyId: string,
    appointmentData: {
      appointmentId: string;
      clientId: string;
      clientName: string;
      clientPhone: string;
      date: Date;
      time: string;
      service: string;
      staffName: string;
      businessName: string;
      businessAddress: string;
      businessPhone: string;
      googleMapsLink?: string;
      language: 'ar' | 'en';
    }
  ): Promise<string> {
    const template = defaultTemplates[`appointment_confirmation_${appointmentData.language}`];

    const parameters: Record<string, string> = {
      clientName: appointmentData.clientName,
      date: appointmentData.date.toLocaleDateString(appointmentData.language === 'ar' ? 'ar-EG' : 'en-US'),
      time: appointmentData.time,
      service: appointmentData.service,
      staffName: appointmentData.staffName,
      businessName: appointmentData.businessName,
      businessAddress: appointmentData.businessAddress,
      businessPhone: appointmentData.businessPhone,
      googleMapsLink: appointmentData.googleMapsLink || '',
    };

    return this.sendMessage(companyId, {
      companyId,
      clientId: appointmentData.clientId,
      appointmentId: appointmentData.appointmentId,
      to: appointmentData.clientPhone,
      type: 'appointment_confirmation',
      templateName: template.name,
      templateLanguage: appointmentData.language,
      parameters,
      status: 'pending',
    });
  }

  // Send appointment reminder
  async sendAppointmentReminder(
    companyId: string,
    appointmentData: {
      appointmentId: string;
      clientId: string;
      clientName: string;
      clientPhone: string;
      date: Date;
      time: string;
      service: string;
      businessName: string;
      reminderTime: string;
      language: 'ar' | 'en';
    }
  ): Promise<string> {
    const template = defaultTemplates[`appointment_reminder_${appointmentData.language}`];

    const parameters: Record<string, string> = {
      clientName: appointmentData.clientName,
      reminderTime: appointmentData.reminderTime,
      date: appointmentData.date.toLocaleDateString(appointmentData.language === 'ar' ? 'ar-EG' : 'en-US'),
      time: appointmentData.time,
      service: appointmentData.service,
      businessName: appointmentData.businessName,
    };

    return this.sendMessage(companyId, {
      companyId,
      clientId: appointmentData.clientId,
      appointmentId: appointmentData.appointmentId,
      to: appointmentData.clientPhone,
      type: 'appointment_reminder',
      templateName: template.name,
      templateLanguage: appointmentData.language,
      parameters,
      status: 'pending',
    });
  }

  // Get message templates
  getTemplates(language: 'ar' | 'en'): WhatsAppTemplate[] {
    return Object.values(defaultTemplates).filter(t => t.language === language);
  }

  // Update message status (called by webhook)
  async updateMessageStatus(
    companyId: string,
    messageId: string,
    status: 'delivered' | 'read' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.endpoint}/messages/${messageId}/status`, {
        status,
        error,
      });
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }
}

export const whatsAppService = new WhatsAppService();
