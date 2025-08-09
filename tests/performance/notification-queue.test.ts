import { notificationQueue } from '../../src/services/queue.service';
import { NotificationJob } from '../../src/services/queue.service';

describe('Notification Queue Performance Tests', () => {
  beforeAll(async () => {
    // Ensure queue is clean before tests
    await notificationQueue.cleanOldJobs();
  });

  afterAll(async () => {
    // Clean up after tests
    await notificationQueue.cleanOldJobs();
    await notificationQueue.close();
  });

  describe('Bulk Job Processing', () => {
    it('should handle large batch of notifications efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 1000;
      
      // Generate large batch of notification jobs
      const jobs: NotificationJob[] = Array.from({ length: batchSize }, (_, i) => ({
        id: `perf_test_${i}_${Date.now()}`,
        type: 'whatsapp',
        priority: 'normal',
        companyId: 'test-company-id',
        data: {
          recipient: {
            name: `Test Client ${i}`,
            phone: `+123456789${i % 10}`,
            language: 'en'
          },
          message: {
            content: `Test message ${i}`
          }
        }
      }));

      // Add jobs to queue
      const queueJobs = await notificationQueue.addBulkNotifications(jobs);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Added ${batchSize} jobs in ${duration}ms`);
      console.log(`Average time per job: ${duration / batchSize}ms`);
      
      expect(queueJobs).toHaveLength(batchSize);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify queue stats
      const stats = await notificationQueue.getQueueStats();
      expect(stats.waiting + stats.active).toBeGreaterThanOrEqual(batchSize);
    }, 15000); // 15 second timeout

    it('should process jobs with different priorities correctly', async () => {
      const priorities: ('low' | 'normal' | 'high' | 'critical')[] = ['low', 'normal', 'high', 'critical'];
      const jobsPerPriority = 50;
      
      const jobs: NotificationJob[] = [];
      
      // Create jobs with different priorities
      priorities.forEach(priority => {
        for (let i = 0; i < jobsPerPriority; i++) {
          jobs.push({
            id: `priority_test_${priority}_${i}_${Date.now()}`,
            type: 'whatsapp',
            priority,
            companyId: 'test-company-id',
            data: {
              recipient: {
                name: `Test Client ${priority} ${i}`,
                phone: `+123456789${i % 10}`,
                language: 'en'
              },
              message: {
                content: `Test message with ${priority} priority`
              }
            }
          });
        }
      });

      // Add all jobs simultaneously
      const startTime = Date.now();
      const queueJobs = await notificationQueue.addBulkNotifications(jobs);
      const endTime = Date.now();
      
      console.log(`Added ${jobs.length} priority jobs in ${endTime - startTime}ms`);
      
      expect(queueJobs).toHaveLength(jobs.length);
      
      // Verify queue can handle mixed priority jobs
      const stats = await notificationQueue.getQueueStats();
      expect(stats.waiting + stats.active).toBeGreaterThanOrEqual(jobs.length);
    }, 10000);

    it('should handle scheduled notifications efficiently', async () => {
      const batchSize = 100;
      const scheduleMinutesAhead = 5;
      const scheduledFor = new Date(Date.now() + scheduleMinutesAhead * 60 * 1000);
      
      const jobs: NotificationJob[] = Array.from({ length: batchSize }, (_, i) => ({
        id: `scheduled_perf_test_${i}_${Date.now()}`,
        type: 'email',
        priority: 'normal',
        companyId: 'test-company-id',
        scheduledFor,
        data: {
          recipient: {
            name: `Scheduled Client ${i}`,
            email: `client${i}@example.com`,
            language: 'en'
          },
          message: {
            templateId: 'appointment_reminder',
            variables: {
              clientName: `Scheduled Client ${i}`,
              businessName: 'Test Business',
              date: '2025-01-20',
              time: '10:00',
              serviceName: 'Test Service',
              staffName: 'Test Staff',
              businessAddress: 'Test Address'
            }
          }
        }
      }));

      const startTime = Date.now();
      
      // Schedule all jobs
      const scheduledJobs = await Promise.all(
        jobs.map(job => notificationQueue.scheduleNotification(job, scheduledFor))
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Scheduled ${batchSize} jobs in ${duration}ms`);
      console.log(`Average scheduling time: ${duration / batchSize}ms`);
      
      expect(scheduledJobs).toHaveLength(batchSize);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify delayed jobs in queue
      const stats = await notificationQueue.getQueueStats();
      expect(stats.delayed).toBeGreaterThanOrEqual(batchSize);
    }, 10000);
  });

  describe('Queue Management Performance', () => {
    it('should retrieve queue statistics quickly', async () => {
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await notificationQueue.getQueueStats();
        const end = Date.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...times);
      
      console.log(`Queue stats - Average: ${avgTime}ms, Max: ${maxTime}ms`);
      
      expect(avgTime).toBeLessThan(100); // Should be very fast
      expect(maxTime).toBeLessThan(500); // Even worst case should be reasonable
    });

    it('should handle concurrent job additions', async () => {
      const concurrentBatches = 10;
      const jobsPerBatch = 20;
      
      const startTime = Date.now();
      
      // Create multiple concurrent batches
      const batchPromises = Array.from({ length: concurrentBatches }, (_, batchIndex) => {
        const jobs: NotificationJob[] = Array.from({ length: jobsPerBatch }, (_, jobIndex) => ({
          id: `concurrent_test_${batchIndex}_${jobIndex}_${Date.now()}`,
          type: 'sms',
          priority: 'normal',
          companyId: 'test-company-id',
          data: {
            recipient: {
              name: `Concurrent Client ${batchIndex}-${jobIndex}`,
              phone: `+123456789${jobIndex % 10}`,
              language: 'en'
            },
            message: {
              content: `Concurrent test message ${batchIndex}-${jobIndex}`
            }
          }
        }));
        
        return notificationQueue.addBulkNotifications(jobs);
      });
      
      const results = await Promise.all(batchPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const totalJobs = concurrentBatches * jobsPerBatch;
      
      console.log(`Added ${totalJobs} jobs concurrently in ${duration}ms`);
      console.log(`Concurrent throughput: ${totalJobs / (duration / 1000)} jobs/second`);
      
      // Verify all jobs were added
      results.forEach(batch => {
        expect(batch).toHaveLength(jobsPerBatch);
      });
      
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
    }, 12000);
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process multiple large batches
      for (let batch = 0; batch < 5; batch++) {
        const jobs: NotificationJob[] = Array.from({ length: 500 }, (_, i) => ({
          id: `memory_test_${batch}_${i}_${Date.now()}`,
          type: 'push',
          priority: 'low',
          companyId: 'test-company-id',
          data: {
            recipient: {
              name: `Memory Test Client ${batch}-${i}`,
              pushToken: `push_token_${batch}_${i}`,
              language: 'en'
            },
            message: {
              content: `Memory test message with some additional content to increase size ${batch}-${i}. This message contains more text to simulate realistic notification content that might be sent to users.`
            }
          }
        }));
        
        await notificationQueue.addBulkNotifications(jobs);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(100);
    }, 20000);
  });

  describe('Error Recovery Performance', () => {
    it('should handle failed jobs efficiently', async () => {
      const failingJobs: NotificationJob[] = Array.from({ length: 100 }, (_, i) => ({
        id: `failing_job_${i}_${Date.now()}`,
        type: 'whatsapp',
        priority: 'normal',
        companyId: 'test-company-id',
        data: {
          recipient: {
            name: 'Failing Client',
            // Invalid phone number to cause failure
            phone: 'invalid-phone',
            language: 'en'
          },
          message: {
            content: 'This job will fail'
          }
        }
      }));

      const startTime = Date.now();
      await notificationQueue.addBulkNotifications(failingJobs);
      
      // Wait a bit for jobs to be processed and fail
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const failedJobs = await notificationQueue.getFailedJobs(150);
      const endTime = Date.now();
      
      console.log(`Failed job retrieval took ${endTime - startTime}ms`);
      console.log(`Found ${failedJobs.length} failed jobs`);
      
      // Should be able to retrieve failed jobs quickly
      expect(endTime - startTime).toBeLessThan(5000);
    }, 10000);
  });

  describe('Cleanup Performance', () => {
    it('should clean up old jobs efficiently', async () => {
      // Add some jobs that will complete quickly
      const jobs: NotificationJob[] = Array.from({ length: 50 }, (_, i) => ({
        id: `cleanup_test_${i}_${Date.now()}`,
        type: 'whatsapp',
        priority: 'normal',
        companyId: 'test-company-id',
        data: {
          recipient: {
            name: `Cleanup Test Client ${i}`,
            phone: `+123456789${i % 10}`,
            language: 'en'
          },
          message: {
            content: `Cleanup test message ${i}`
          }
        }
      }));

      await notificationQueue.addBulkNotifications(jobs);
      
      // Wait for jobs to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const startTime = Date.now();
      await notificationQueue.cleanOldJobs();
      const endTime = Date.now();
      
      console.log(`Cleanup completed in ${endTime - startTime}ms`);
      
      // Cleanup should be fast
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});