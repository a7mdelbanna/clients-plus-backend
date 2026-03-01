import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type { ClientCommunication } from './client.service';

// Communication template interface
export interface CommunicationTemplate {
  id?: string;
  companyId: string;
  name: string;
  type: 'sms' | 'email' | 'whatsapp';
  category: 'appointment_reminder' | 'birthday' | 'miss_you' | 'promotional' | 'review_request' | 'custom';
  subject?: string;
  content: string;
  variables: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Campaign interface
export interface Campaign {
  id?: string;
  companyId: string;
  name: string;
  description?: string;
  type: 'sms' | 'email';
  templateId: string;
  targetAudience: {
    filter?: any;
    clientIds?: string[];
  };
  scheduledDate?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  stats?: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  };
  createdAt?: string;
  sentAt?: string;
}

// Communication preferences
export interface CommunicationPreferences {
  preferredChannel: 'sms' | 'email' | 'phone' | 'whatsapp';
  language: string;
  timezone: string;
  quietHours?: {
    start: string;
    end: string;
  };
  frequency?: {
    maxPerDay?: number;
    maxPerWeek?: number;
    maxPerMonth?: number;
  };
}

// Message queue interface
export interface MessageQueue {
  id?: string;
  clientId: string;
  type: 'sms' | 'email' | 'whatsapp';
  templateId?: string;
  subject?: string;
  content: string;
  scheduledFor: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  error?: string;
  createdAt?: string;
  processedAt?: string;
}

// SMS provider interface
export interface SMSProvider {
  send(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getStatus(messageId: string): Promise<'sent' | 'delivered' | 'failed'>;
}

// Email provider interface
export interface EmailProvider {
  send(email: string, subject: string, html: string, attachments?: any[]): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getStatus(messageId: string): Promise<'sent' | 'delivered' | 'opened' | 'bounced' | 'failed'>;
}

class ClientCommunicationService {
  // Record communication
  async recordCommunication(
    communication: Omit<ClientCommunication, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `/clients/${communication.clientId}/communications`,
        communication
      );
      return response.data.data!.id;
    } catch (error) {
      console.error('Error recording communication:', error);
      throw error;
    }
  }

  // Send SMS
  async sendSMS(
    clientId: string,
    phone: string,
    message: string,
    templateId?: string,
    campaignId?: string
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        '/notifications/send',
        {
          type: 'SMS',
          recipient: phone,
          clientId,
          content: message,
          templateId,
          campaignId,
        }
      );
      return response.data.data?.id || '';
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  // Send Email
  async sendEmail(
    clientId: string,
    email: string,
    subject: string,
    content: string,
    templateId?: string,
    campaignId?: string,
    attachments?: any[]
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        '/notifications/send',
        {
          type: 'EMAIL',
          recipient: email,
          clientId,
          subject,
          content,
          templateId,
          campaignId,
          attachments,
        }
      );
      return response.data.data?.id || '';
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Get communication history
  async getCommunicationHistory(
    clientId: string,
    options?: {
      limit?: number;
      type?: ClientCommunication['type'];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ClientCommunication[]> {
    try {
      const params: any = {};
      if (options?.limit) params.limit = options.limit;
      if (options?.type) params.type = options.type;
      if (options?.startDate) params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();

      const response = await apiClient.get<ApiResponse<ClientCommunication[]>>(
        `/clients/${clientId}/communications`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting communication history:', error);
      throw error;
    }
  }

  // Subscribe to communications (polling)
  subscribeToCommunications(
    clientId: string,
    callback: (communications: ClientCommunication[]) => void
  ): () => void {
    const fetch = () => {
      this.getCommunicationHistory(clientId, { limit: 50 })
        .then(callback)
        .catch(error => console.error('Error in communication subscription:', error));
    };

    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }

  // Template Management
  async createTemplate(
    template: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        '/notifications/templates',
        template
      );
      return response.data.data!.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  // Get templates
  async getTemplates(
    companyId: string,
    type?: CommunicationTemplate['type']
  ): Promise<CommunicationTemplate[]> {
    try {
      const params: any = {};
      if (type) params.type = type;

      const response = await apiClient.get<ApiResponse<CommunicationTemplate[]>>(
        '/notifications/templates',
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  }

  // Process template variables
  async processTemplate(
    templateId: string,
    clientId: string,
    additionalVars?: Record<string, string>
  ): Promise<{ subject?: string; content: string }> {
    try {
      const response = await apiClient.get<ApiResponse<{ subject?: string; content: string }>>(
        `/notifications/templates/${templateId}/preview`,
        { params: { clientId, ...additionalVars } }
      );
      return response.data.data || { content: '' };
    } catch (error) {
      console.error('Error processing template:', error);
      throw error;
    }
  }

  // Campaign Management
  async createCampaign(
    campaign: Omit<Campaign, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        '/notifications/campaigns',
        campaign
      );
      return response.data.data!.id;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  // Send campaign
  async sendCampaign(campaignId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `/notifications/campaigns/${campaignId}/send`
      );
    } catch (error) {
      console.error('Error sending campaign:', error);
      throw error;
    }
  }

  // Get communication preferences
  async getCommunicationPreferences(clientId: string): Promise<CommunicationPreferences> {
    try {
      const response = await apiClient.get<ApiResponse<CommunicationPreferences>>(
        `/clients/${clientId}/communication-preferences`
      );
      return response.data.data || {
        preferredChannel: 'email',
        language: 'en',
        timezone: 'UTC',
        quietHours: { start: '21:00', end: '09:00' },
        frequency: { maxPerDay: 2, maxPerWeek: 5, maxPerMonth: 20 },
      };
    } catch (error) {
      console.error('Error getting communication preferences:', error);
      return {
        preferredChannel: 'email',
        language: 'en',
        timezone: 'UTC',
        quietHours: { start: '21:00', end: '09:00' },
        frequency: { maxPerDay: 2, maxPerWeek: 5, maxPerMonth: 20 },
      };
    }
  }

  // Check if can send message (server-side check)
  async canSendMessage(
    clientId: string,
    type: 'sms' | 'email',
    scheduledTime?: Date
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const response = await apiClient.post<ApiResponse<{ allowed: boolean; reason?: string }>>(
        `/clients/${clientId}/can-send-message`,
        { type, scheduledTime: scheduledTime?.toISOString() }
      );
      return response.data.data || { allowed: true };
    } catch (error) {
      console.error('Error checking message limits:', error);
      return { allowed: true };
    }
  }

  // Automated message scheduling
  async scheduleAutomatedMessages(clientId: string): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `/clients/${clientId}/schedule-automated-messages`
      );
    } catch (error) {
      console.error('Error scheduling automated messages:', error);
    }
  }
}

export const clientCommunicationService = new ClientCommunicationService();
