// Mock Queue Service - Temporary implementation without Redis
export interface NotificationJob {
  id: string;
  type: 'whatsapp' | 'sms' | 'email' | 'push';
  priority: 'low' | 'normal' | 'high' | 'critical';
  data: NotificationJobData;
  companyId: string;
  branchId?: string;
  userId?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationJobData {
  recipient: {
    phone?: string;
    email?: string;
    name: string;
    language?: 'en' | 'ar';
    pushToken?: string;
  };
  message: {
    templateId?: string;
    content?: string;
    subject?: string;
    variables?: Record<string, string>;
  };
  appointment?: {
    id: string;
    date: string;
    time: string;
    serviceName: string;
    staffName?: string;
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

class MockNotificationQueue {
  private jobs: NotificationJob[] = [];

  constructor() {
    console.log('Mock Notification queue initialized (Redis disabled)');
  }

  async addNotification(job: NotificationJob, delay?: number): Promise<any> {
    console.log(`Mock: Added ${job.type} notification to queue:`, {
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      recipient: job.data.recipient.name
    });
    
    this.jobs.push(job);
    
    // Simulate async processing
    setTimeout(() => {
      console.log(`Mock: Processed ${job.type} notification:`, job.id);
    }, delay || 1000);
    
    return { id: job.id, data: job };
  }

  async getQueueStats(): Promise<QueueStats> {
    return {
      waiting: 0,
      active: 0,
      completed: this.jobs.length,
      failed: 0,
      delayed: 0,
      paused: 0
    };
  }

  async clearQueue(status?: string): Promise<void> {
    console.log(`Mock: Clearing queue with status: ${status || 'all'}`);
    this.jobs = [];
  }

  async retryFailedJobs(): Promise<void> {
    console.log('Mock: Retrying failed jobs');
  }

  async pauseQueue(): Promise<void> {
    console.log('Mock: Queue paused');
  }

  async resumeQueue(): Promise<void> {
    console.log('Mock: Queue resumed');
  }

  async getJobs(status?: string, limit?: number): Promise<any[]> {
    return this.jobs.slice(0, limit || 10);
  }

  async removeJob(jobId: string): Promise<void> {
    this.jobs = this.jobs.filter(job => job.id !== jobId);
    console.log(`Mock: Removed job ${jobId}`);
  }

  async scheduleNotification(job: NotificationJob, scheduledTime: Date): Promise<any> {
    const delay = scheduledTime.getTime() - Date.now();
    console.log(`Mock: Scheduled ${job.type} notification for ${scheduledTime}`);
    return this.addNotification(job, delay > 0 ? delay : 0);
  }

  async addBulkNotifications(jobs: NotificationJob[]): Promise<any[]> {
    console.log(`Mock: Adding ${jobs.length} notifications to queue`);
    const results = [];
    for (const job of jobs) {
      results.push(await this.addNotification(job));
    }
    return results;
  }

  async retryFailedJob(jobId: string): Promise<void> {
    console.log(`Mock: Retrying failed job ${jobId}`);
  }

  async getFailedJobs(limit?: number): Promise<any[]> {
    console.log(`Mock: Getting failed jobs (limit: ${limit || 'all'})`);
    return [];
  }
}

export const notificationQueue = new MockNotificationQueue();