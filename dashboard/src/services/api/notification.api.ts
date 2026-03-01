import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// =========================== INTERFACES ===========================

export interface NotificationRecipient {
  type: 'CLIENT' | 'STAFF' | 'USER';
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  category: 'APPOINTMENT' | 'REMINDER' | 'MARKETING' | 'SYSTEM' | 'CUSTOM';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationMessage {
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  recipient: NotificationRecipient;
  subject?: string;
  content: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduleAt?: string;
  metadata?: Record<string, any>;
}

export interface BulkNotificationRequest {
  recipients: NotificationRecipient[];
  message: Omit<NotificationMessage, 'recipient'>;
  batchSize?: number;
  delayBetweenBatches?: number; // in milliseconds
}

export interface ScheduledNotification {
  id: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  recipient: NotificationRecipient;
  subject?: string;
  content: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduleAt: string;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationHistory {
  id: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  recipient: NotificationRecipient;
  subject?: string;
  content: string;
  templateId?: string;
  templateName?: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED';
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorMessage?: string;
  cost?: number;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface NotificationFilters {
  type?: ('EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH')[];
  status?: ('PENDING' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED' | 'CANCELLED')[];
  recipientType?: ('CLIENT' | 'STAFF' | 'USER')[];
  recipientId?: string;
  templateId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'createdAt' | 'sentAt' | 'status' | 'type';
  sortDirection?: 'asc' | 'desc';
}

export interface NotificationPaginationOptions {
  page?: number;
  limit?: number;
}

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  
  queueHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  processingRate: number; // jobs per minute
  averageProcessingTime: number; // in milliseconds
  
  jobsByType: Record<string, number>;
  jobsByStatus: Record<string, number>;
  
  recentActivity: Array<{
    timestamp: string;
    jobType: string;
    status: string;
    duration?: number;
  }>;
}

export interface WhatsAppStatus {
  isConnected: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  phoneNumber?: string;
  accountStatus?: string;
  lastConnected?: string;
  messagesQuota?: {
    used: number;
    remaining: number;
    resetDate: string;
  };
  webhookStatus?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  errors?: string[];
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  
  emailConfig?: {
    provider: string;
    fromEmail: string;
    fromName: string;
  };
  
  smsConfig?: {
    provider: string;
    senderId: string;
  };
  
  whatsappConfig?: {
    provider: string;
    phoneNumber: string;
    webhookUrl: string;
  };
  
  defaultTemplates: Record<string, string>;
  retrySettings: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface PaginatedNotificationResponse {
  data: (ScheduledNotification | NotificationHistory)[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =========================== NOTIFICATION API CLASS ===========================

export class NotificationAPI {
  private readonly endpoint = '/notifications';

  // ==================== Core Notification Operations ====================

  /**
   * Send immediate notification
   */
  async sendNotification(notification: NotificationMessage): Promise<{ id: string; status: string }> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>(
        `${this.endpoint}/send`,
        notification
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to send notification');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Send notification error:', error);
      throw new Error(error.message || 'Failed to send notification');
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(notification: NotificationMessage): Promise<ScheduledNotification> {
    try {
      const response = await apiClient.post<ApiResponse<{ notification: ScheduledNotification }>>(
        `${this.endpoint}/schedule`,
        notification
      );

      if (!response.data.success || !response.data.data?.notification) {
        throw new Error(response.data.message || 'Failed to schedule notification');
      }

      return response.data.data.notification;
    } catch (error: any) {
      console.error('Schedule notification error:', error);
      throw new Error(error.message || 'Failed to schedule notification');
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(request: BulkNotificationRequest): Promise<{ 
    batchId: string; 
    totalRecipients: number; 
    estimatedTime: number; 
  }> {
    try {
      const response = await apiClient.post<ApiResponse<{ 
        batchId: string; 
        totalRecipients: number; 
        estimatedTime: number; 
      }>>(
        `${this.endpoint}/bulk`,
        request
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to send bulk notifications');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Send bulk notifications error:', error);
      throw new Error(error.message || 'Failed to send bulk notifications');
    }
  }

  // ==================== History and Tracking ====================

  /**
   * Get notification history
   */
  async getNotificationHistory(
    filters?: NotificationFilters,
    pagination?: NotificationPaginationOptions
  ): Promise<PaginatedNotificationResponse> {
    try {
      const params = new URLSearchParams();

      // Add pagination parameters
      if (pagination?.page) params.set('page', pagination.page.toString());
      if (pagination?.limit) params.set('limit', pagination.limit.toString());

      // Add filter parameters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.set(key, value.toString());
            }
          }
        });
      }

      const response = await apiClient.get<ApiResponse<NotificationHistory[]>>(
        `${this.endpoint}/history?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch notification history');
      }

      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (error: any) {
      console.error('Get notification history error:', error);
      throw new Error(error.message || 'Failed to fetch notification history');
    }
  }

  // ==================== Queue Management ====================

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const response = await apiClient.get<ApiResponse<QueueStats>>(
        `${this.endpoint}/queue/stats`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch queue statistics');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get queue stats error:', error);
      throw new Error(error.message || 'Failed to fetch queue statistics');
    }
  }

  /**
   * Get failed notifications
   */
  async getFailedNotifications(
    pagination?: NotificationPaginationOptions
  ): Promise<PaginatedNotificationResponse> {
    try {
      const params = new URLSearchParams();
      if (pagination?.page) params.set('page', pagination.page.toString());
      if (pagination?.limit) params.set('limit', pagination.limit.toString());

      const response = await apiClient.get<ApiResponse<ScheduledNotification[]>>(
        `${this.endpoint}/queue/failed?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch failed notifications');
      }

      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (error: any) {
      console.error('Get failed notifications error:', error);
      throw new Error(error.message || 'Failed to fetch failed notifications');
    }
  }

  /**
   * Retry failed notification
   */
  async retryFailedNotification(jobId: string): Promise<{ status: string; retryCount: number }> {
    try {
      const response = await apiClient.post<ApiResponse<{ status: string; retryCount: number }>>(
        `${this.endpoint}/queue/retry/${jobId}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to retry notification');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Retry failed notification error:', error);
      throw new Error(error.message || 'Failed to retry notification');
    }
  }

  // ==================== Template Management ====================

  /**
   * Get notification templates
   */
  async getTemplates(
    type?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH',
    category?: 'APPOINTMENT' | 'REMINDER' | 'MARKETING' | 'SYSTEM' | 'CUSTOM'
  ): Promise<NotificationTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (category) params.set('category', category);

      const response = await apiClient.get<ApiResponse<NotificationTemplate[]>>(
        `${this.endpoint}/templates?${params.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch templates');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Get templates error:', error);
      throw new Error(error.message || 'Failed to fetch templates');
    }
  }

  /**
   * Preview template with variables
   */
  async previewTemplate(
    templateId: string, 
    variables: Record<string, any>
  ): Promise<{ subject?: string; content: string }> {
    try {
      const response = await apiClient.post<ApiResponse<{ subject?: string; content: string }>>(
        `${this.endpoint}/templates/${templateId}/preview`,
        { variables }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to preview template');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Preview template error:', error);
      throw new Error(error.message || 'Failed to preview template');
    }
  }

  // ==================== Service Status ====================

  /**
   * Get WhatsApp service status
   */
  async getWhatsAppStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await apiClient.get<ApiResponse<WhatsAppStatus>>(
        `${this.endpoint}/whatsapp/status`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch WhatsApp status');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Get WhatsApp status error:', error);
      throw new Error(error.message || 'Failed to fetch WhatsApp status');
    }
  }

  // ==================== Webhook Handlers ====================

  /**
   * Handle WhatsApp webhook (this would be called by the backend webhook endpoint)
   * This method is here for completeness but would typically not be called from frontend
   */
  async processWhatsAppWebhook(webhookData: any): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `${this.endpoint}/webhooks/whatsapp`,
        webhookData
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to process webhook');
      }
    } catch (error: any) {
      console.error('Process WhatsApp webhook error:', error);
      throw new Error(error.message || 'Failed to process webhook');
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Validate phone number for WhatsApp
   */
  static validateWhatsAppNumber(phoneNumber: string): boolean {
    // Basic validation for international format
    const whatsappRegex = /^\+[1-9]\d{1,14}$/;
    return whatsappRegex.test(phoneNumber);
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format phone number for SMS/WhatsApp
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except '+'
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add '+' if not present
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }

  /**
   * Replace template variables in content
   */
  static replaceTemplateVariables(
    content: string, 
    variables: Record<string, any>
  ): string {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    return result;
  }

  /**
   * Estimate notification cost (mock implementation)
   */
  static estimateNotificationCost(
    type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH', 
    recipientCount: number
  ): number {
    const costPerNotification = {
      EMAIL: 0.001,     // $0.001 per email
      SMS: 0.05,        // $0.05 per SMS
      WHATSAPP: 0.02,   // $0.02 per WhatsApp message
      PUSH: 0.0001,     // $0.0001 per push notification
    };
    
    return costPerNotification[type] * recipientCount;
  }

  /**
   * Get optimal send time based on recipient timezone and preferences
   */
  static getOptimalSendTime(
    recipientTimezone?: string, 
    preferredHour = 10
  ): Date {
    const now = new Date();
    const optimal = new Date(now);
    
    // Set to preferred hour (default 10 AM)
    optimal.setHours(preferredHour, 0, 0, 0);
    
    // If preferred time has passed today, schedule for tomorrow
    if (optimal <= now) {
      optimal.setDate(optimal.getDate() + 1);
    }
    
    // TODO: Adjust for recipient timezone if provided
    
    return optimal;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/health`);
      return response.data.success;
    } catch (error) {
      console.error('Notification API health check failed:', error);
      return false;
    }
  }

  // ==================== Predefined Message Templates ====================

  /**
   * Get common notification templates for different scenarios
   */
  static getCommonTemplates(): Record<string, Partial<NotificationTemplate>> {
    return {
      APPOINTMENT_CONFIRMATION: {
        name: 'Appointment Confirmation',
        type: 'EMAIL',
        category: 'APPOINTMENT',
        subject: 'Appointment Confirmed - {{appointmentDate}}',
        content: `Dear {{clientName}},

Your appointment has been confirmed for {{appointmentDate}} at {{appointmentTime}}.

Service: {{serviceName}}
Staff: {{staffName}}
Duration: {{duration}}
Location: {{branchAddress}}

Please arrive 10 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.

Thank you,
{{companyName}}`,
        variables: ['clientName', 'appointmentDate', 'appointmentTime', 'serviceName', 'staffName', 'duration', 'branchAddress', 'companyName']
      },
      
      APPOINTMENT_REMINDER: {
        name: 'Appointment Reminder',
        type: 'WHATSAPP',
        category: 'REMINDER',
        content: `Hi {{clientName}}! 👋

This is a friendly reminder about your appointment tomorrow:

📅 {{appointmentDate}} at {{appointmentTime}}
💇‍♀️ {{serviceName}} with {{staffName}}
📍 {{branchAddress}}

See you soon!
{{companyName}}`,
        variables: ['clientName', 'appointmentDate', 'appointmentTime', 'serviceName', 'staffName', 'branchAddress', 'companyName']
      },
      
      PAYMENT_RECEIPT: {
        name: 'Payment Receipt',
        type: 'EMAIL',
        category: 'SYSTEM',
        subject: 'Payment Receipt - {{invoiceNumber}}',
        content: `Dear {{clientName}},

Thank you for your payment!

Invoice: {{invoiceNumber}}
Amount Paid: {{currency}} {{amount}}
Payment Method: {{paymentMethod}}
Date: {{paymentDate}}

Your receipt is attached to this email.

Best regards,
{{companyName}}`,
        variables: ['clientName', 'invoiceNumber', 'currency', 'amount', 'paymentMethod', 'paymentDate', 'companyName']
      },
      
      BIRTHDAY_GREETING: {
        name: 'Birthday Greeting',
        type: 'WHATSAPP',
        category: 'MARKETING',
        content: `🎉 Happy Birthday {{clientName}}! 🎂

We hope you have a wonderful day! As a birthday gift, enjoy 20% off your next appointment.

Use code: BIRTHDAY20
Valid until: {{expiryDate}}

Book now: {{bookingLink}}

Cheers,
{{companyName}} 🎈`,
        variables: ['clientName', 'expiryDate', 'bookingLink', 'companyName']
      }
    };
  }
}

// Create and export singleton instance
export const notificationAPI = new NotificationAPI();
export default notificationAPI;