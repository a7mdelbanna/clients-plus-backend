import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type { Appointment } from './appointment.service';

// Reminder Configuration
export interface ReminderConfig {
  id?: string;
  companyId: string;
  branchId?: string;
  enabled: boolean;
  channels: {
    whatsapp: boolean;
    sms: boolean;
    email: boolean;
  };
  timing: {
    dayBefore: boolean; // Send reminder 1 day before
    hoursBefore: number[]; // e.g., [24, 4] for 24 hours and 4 hours before
    customTimes?: Array<{
      value: number;
      unit: 'minutes' | 'hours' | 'days';
    }>;
  };
  templates: {
    whatsapp?: string;
    sms?: string;
    email?: string;
  };
  excludeStatuses: string[]; // Don't send reminders for these appointment statuses
  createdAt?: string;
  updatedAt?: string;
}

// Reminder Log
export interface ReminderLog {
  id?: string;
  companyId: string;
  appointmentId: string;
  clientId: string;
  type: 'whatsapp' | 'sms' | 'email';
  scheduledFor: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  messageId?: string;
  createdAt?: string;
}

// Default reminder configuration
const defaultReminderConfig: Omit<ReminderConfig, 'companyId'> = {
  enabled: true,
  channels: {
    whatsapp: true,
    sms: false,
    email: false,
  },
  timing: {
    dayBefore: true,
    hoursBefore: [24, 4],
  },
  templates: {},
  excludeStatuses: ['cancelled', 'completed', 'no_show'],
};

class AppointmentReminderService {
  private reminderCheckInterval: NodeJS.Timeout | null = null;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Get reminder configuration for a company
  async getReminderConfig(companyId: string, branchId?: string): Promise<ReminderConfig> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;

      const response = await apiClient.get<ApiResponse<ReminderConfig>>(
        '/notifications/reminder-config',
        { params }
      );

      return response.data.data || { ...defaultReminderConfig, companyId, branchId };
    } catch (error) {
      console.error('Error getting reminder config:', error);
      return { ...defaultReminderConfig, companyId, branchId };
    }
  }

  // Save reminder configuration
  async saveReminderConfig(config: ReminderConfig): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(
        '/notifications/reminder-config',
        config
      );
    } catch (error) {
      console.error('Error saving reminder config:', error);
      throw error;
    }
  }

  // Schedule reminders for an appointment
  async scheduleReminders(appointment: Appointment): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(
        `/appointments/${appointment.id}/reminders`,
        { appointmentId: appointment.id }
      );
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  // Process pending reminders (server-side, but trigger from client)
  async processPendingReminders(): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>('/notifications/process-reminders');
    } catch (error) {
      console.error('Error processing pending reminders:', error);
    }
  }

  // Cancel reminders for an appointment
  async cancelReminders(appointmentId: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(
        `/appointments/${appointmentId}/reminders`
      );
    } catch (error) {
      console.error('Error cancelling reminders:', error);
      throw error;
    }
  }

  // Start reminder processing (periodic check)
  startReminderProcessing(intervalMinutes: number = 5): void {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval);
    }

    // Process immediately
    this.processPendingReminders();

    // Set up interval for regular processing
    this.reminderCheckInterval = setInterval(() => {
      this.processPendingReminders();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop reminder processing
  stopReminderProcessing(): void {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval);
      this.reminderCheckInterval = null;
    }
  }

  // Listen to appointment changes for a company (polling)
  listenToAppointments(
    companyId: string,
    callback?: (appointments: Appointment[]) => void
  ): () => void {
    const fetchAndSchedule = async () => {
      try {
        const response = await apiClient.get<ApiResponse<Appointment[]>>(
          '/appointments',
          {
            params: {
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }
        );
        const appointments = response.data.data || [];
        if (callback) callback(appointments);
      } catch (error) {
        console.error('Error polling appointments for reminders:', error);
      }
    };

    fetchAndSchedule();
    const interval = setInterval(fetchAndSchedule, 60000); // Poll every 60s
    this.pollingIntervals.set(companyId, interval);

    return () => {
      clearInterval(interval);
      this.pollingIntervals.delete(companyId);
    };
  }

  // Stop listening to a company's appointments
  stopListening(companyId: string): void {
    const interval = this.pollingIntervals.get(companyId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(companyId);
    }
  }

  // Stop all listeners
  stopAllListeners(): void {
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
  }
}

export const appointmentReminderService = new AppointmentReminderService();
