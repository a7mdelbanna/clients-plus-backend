import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type { ClientActivity } from './client.service';

// Activity event types
export const ACTIVITY_EVENTS = {
  PROFILE_CREATED: 'profile_created',
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_DELETED: 'profile_deleted',
  CONTACT_ADDED: 'contact_added',
  CONTACT_UPDATED: 'contact_updated',
  CONTACT_VERIFIED: 'contact_verified',
  APPOINTMENT_BOOKED: 'appointment_booked',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  APPOINTMENT_NO_SHOW: 'appointment_no_show',
  PAYMENT_MADE: 'payment_made',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_ISSUED: 'refund_issued',
  BALANCE_ADJUSTED: 'balance_adjusted',
  PACKAGE_PURCHASED: 'package_purchased',
  MEMBERSHIP_STARTED: 'membership_started',
  MEMBERSHIP_RENEWED: 'membership_renewed',
  MEMBERSHIP_CANCELLED: 'membership_cancelled',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  EMAIL_OPENED: 'email_opened',
  EMAIL_BOUNCED: 'email_bounced',
  CATEGORY_CHANGED: 'category_changed',
  TAG_ADDED: 'tag_added',
  TAG_REMOVED: 'tag_removed',
  POINTS_EARNED: 'points_earned',
  POINTS_REDEEMED: 'points_redeemed',
  REWARD_CLAIMED: 'reward_claimed',
  PORTAL_LOGIN: 'portal_login',
  PORTAL_LOGOUT: 'portal_logout',
  PORTAL_PASSWORD_CHANGED: 'portal_password_changed',
  NOTE_ADDED: 'note_added',
  DOCUMENT_UPLOADED: 'document_uploaded',
  CONSENT_GIVEN: 'consent_given',
  CONSENT_WITHDRAWN: 'consent_withdrawn',
  REFERRAL_MADE: 'referral_made',
} as const;

export type ActivityEventType = typeof ACTIVITY_EVENTS[keyof typeof ACTIVITY_EVENTS];

// Activity summary interface
export interface ActivitySummary {
  totalActivities: number;
  activitiesByType: Record<string, number>;
  recentActivities: ClientActivity[];
  mostActiveDay?: string;
  mostActiveHour?: number;
  lastActivityDate?: Date;
}

// Activity filter interface
export interface ActivityFilter {
  events?: ActivityEventType[];
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Change tracking interface
export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: string;
  changedBy: string;
}

class ClientActivityService {
  private readonly endpoint = '/clients';

  // Log activity
  async logActivity(
    clientId: string,
    event: ActivityEventType,
    details: Record<string, any>,
    performedBy: string,
    changes?: FieldChange[]
  ): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(
        `${this.endpoint}/${clientId}/activities`,
        { event, details, performedBy, changes }
      );
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  // Get activity history
  async getActivityHistory(
    clientId: string,
    filter?: ActivityFilter
  ): Promise<ClientActivity[]> {
    try {
      const params: any = {};
      if (filter?.events && filter.events.length > 0) params.events = filter.events.join(',');
      if (filter?.performedBy) params.performedBy = filter.performedBy;
      if (filter?.startDate) params.startDate = filter.startDate.toISOString();
      if (filter?.endDate) params.endDate = filter.endDate.toISOString();
      if (filter?.limit) params.limit = filter.limit;

      const response = await apiClient.get<ApiResponse<ClientActivity[]>>(
        `${this.endpoint}/${clientId}/activities`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting activity history:', error);
      throw error;
    }
  }

  // Subscribe to activities (polling)
  subscribeToActivities(
    clientId: string,
    callback: (activities: ClientActivity[]) => void,
    filter?: ActivityFilter
  ): () => void {
    this.getActivityHistory(clientId, { ...filter, limit: filter?.limit || 50 })
      .then(callback)
      .catch(error => console.error('Error in activity subscription:', error));

    const interval = setInterval(() => {
      this.getActivityHistory(clientId, { ...filter, limit: filter?.limit || 50 })
        .then(callback)
        .catch(error => console.error('Error in activity subscription:', error));
    }, 15000);

    return () => clearInterval(interval);
  }

  // Get activity summary
  async getActivitySummary(
    clientId: string,
    days: number = 30
  ): Promise<ActivitySummary> {
    try {
      const response = await apiClient.get<ApiResponse<ActivitySummary>>(
        `${this.endpoint}/${clientId}/activities/summary`,
        { params: { days } }
      );
      return response.data.data || {
        totalActivities: 0,
        activitiesByType: {},
        recentActivities: [],
      };
    } catch (error) {
      console.error('Error getting activity summary:', error);
      throw error;
    }
  }

  // Log profile changes
  async logProfileChanges(
    clientId: string,
    changes: FieldChange[],
    performedBy: string
  ): Promise<void> {
    if (changes.length === 0) return;

    try {
      await this.logActivity(
        clientId,
        ACTIVITY_EVENTS.PROFILE_UPDATED,
        {
          fieldsUpdated: changes.map(c => c.field),
          updateCount: changes.length,
        },
        performedBy,
        changes
      );
    } catch (error) {
      console.error('Error logging profile changes:', error);
    }
  }

  // Convenience methods for common activities
  async logProfileCreated(clientId: string, createdBy: string, source?: string): Promise<void> {
    await this.logActivity(
      clientId,
      ACTIVITY_EVENTS.PROFILE_CREATED,
      { source: source || 'manual' },
      createdBy
    );
  }

  async logAppointmentBooked(
    clientId: string,
    appointmentId: string,
    date: Date,
    services: string[],
    performedBy: string
  ): Promise<void> {
    await this.logActivity(
      clientId,
      ACTIVITY_EVENTS.APPOINTMENT_BOOKED,
      { appointmentId, date: date.toISOString(), services },
      performedBy
    );
  }

  async logPaymentMade(
    clientId: string,
    amount: number,
    method: string,
    transactionId: string,
    performedBy: string
  ): Promise<void> {
    await this.logActivity(
      clientId,
      ACTIVITY_EVENTS.PAYMENT_MADE,
      { amount, method, transactionId },
      performedBy
    );
  }

  async logCommunicationSent(
    clientId: string,
    type: 'sms' | 'email',
    subject: string,
    communicationId: string,
    performedBy: string
  ): Promise<void> {
    await this.logActivity(
      clientId,
      ACTIVITY_EVENTS.MESSAGE_SENT,
      { type, subject, communicationId },
      performedBy
    );
  }

  async logCategoryChanged(
    clientId: string,
    oldCategory: string,
    newCategory: string,
    reason: string,
    performedBy: string
  ): Promise<void> {
    await this.logActivity(
      clientId,
      ACTIVITY_EVENTS.CATEGORY_CHANGED,
      { oldCategory, newCategory, reason },
      performedBy,
      [{
        field: 'category',
        oldValue: oldCategory,
        newValue: newCategory,
        changedAt: new Date().toISOString(),
        changedBy: performedBy,
      }]
    );
  }

  async logPortalAccess(
    clientId: string,
    action: 'login' | 'logout',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(
      clientId,
      action === 'login' ? ACTIVITY_EVENTS.PORTAL_LOGIN : ACTIVITY_EVENTS.PORTAL_LOGOUT,
      { ipAddress, userAgent },
      'client'
    );
  }

  // Search activities
  async searchActivities(
    companyId: string,
    searchTerm: string,
    options?: {
      limit?: number;
      clientIds?: string[];
    }
  ): Promise<ClientActivity[]> {
    try {
      const params: any = { search: searchTerm };
      if (options?.limit) params.limit = options.limit;
      if (options?.clientIds && options.clientIds.length > 0) {
        params.clientIds = options.clientIds.join(',');
      }

      const response = await apiClient.get<ApiResponse<ClientActivity[]>>(
        `${this.endpoint}/activities/search`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error searching activities:', error);
      throw error;
    }
  }

  // Export activity log
  async exportActivityLog(
    clientId: string,
    format: 'json' | 'csv',
    filter?: ActivityFilter
  ): Promise<string> {
    try {
      const params: any = { format };
      if (filter?.events && filter.events.length > 0) params.events = filter.events.join(',');
      if (filter?.startDate) params.startDate = filter.startDate.toISOString();
      if (filter?.endDate) params.endDate = filter.endDate.toISOString();
      if (filter?.limit) params.limit = filter.limit;

      const response = await apiClient.get<ApiResponse<{ data: string }>>(
        `${this.endpoint}/${clientId}/activities/export`,
        { params }
      );
      return response.data.data?.data || '';
    } catch (error) {
      console.error('Error exporting activity log:', error);
      throw error;
    }
  }

  // Cleanup old activities
  async cleanupOldActivities(clientId: string, retentionDays: number): Promise<number> {
    try {
      const response = await apiClient.post<ApiResponse<{ deletedCount: number }>>(
        `${this.endpoint}/${clientId}/activities/cleanup`,
        { retentionDays }
      );
      return response.data.data?.deletedCount || 0;
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
      throw error;
    }
  }
}

export const clientActivityService = new ClientActivityService();
