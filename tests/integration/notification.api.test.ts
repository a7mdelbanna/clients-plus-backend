import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import App from '../../src/app';
import { generateJWT } from '../../src/utils/jwt.utils';

const app = new App().app;
const prisma = new PrismaClient();

describe('Notification API Integration Tests', () => {
  let authToken: string;
  let testCompanyId: string;
  let testBranchId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test data
    const testCompany = await prisma.company.create({
      data: {
        name: 'Test Notification Company',
        email: 'test@notification.com',
        phone: '+1234567890',
        subscriptionPlan: 'PROFESSIONAL',
        subscriptionStatus: 'ACTIVE'
      }
    });
    testCompanyId = testCompany.id;

    const testBranch = await prisma.branch.create({
      data: {
        name: 'Test Branch',
        companyId: testCompanyId,
        address: { street: '123 Test St', city: 'Test City' },
        phone: '+1234567890'
      }
    });
    testBranchId = testBranch.id;

    const testUser = await prisma.user.create({
      data: {
        email: 'testuser@notification.com',
        firstName: 'Test',
        lastName: 'User',
        companyId: testCompanyId,
        role: 'ADMIN',
        isActive: true,
        isVerified: true
      }
    });
    testUserId = testUser.id;

    // Generate JWT token
    authToken = generateJWT({ 
      id: testUserId,
      email: 'testuser@notification.com',
      companyId: testCompanyId,
      branchId: testBranchId,
      role: 'ADMIN'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.notificationLog.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.branch.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/notifications/send', () => {
    it('should send a WhatsApp notification successfully', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipient: {
            name: 'Test Client',
            phone: '+1234567890',
            language: 'en'
          },
          message: {
            templateId: 'appointment_confirmation',
            variables: {
              clientName: 'Test Client',
              businessName: 'Test Salon',
              date: '2025-01-15',
              time: '10:00',
              serviceName: 'Haircut',
              staffName: 'Sarah',
              businessAddress: '123 Main St',
              businessPhone: '+1234567890'
            }
          },
          priority: 'high'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBeDefined();
      expect(response.body.data.type).toBe('whatsapp');
      expect(response.body.data.priority).toBe('high');
    });

    it('should send an email notification successfully', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'email',
          recipient: {
            name: 'Test Client',
            email: 'test@example.com',
            language: 'en'
          },
          message: {
            templateId: 'appointment_confirmation',
            variables: {
              clientName: 'Test Client',
              businessName: 'Test Salon',
              date: '2025-01-15',
              time: '10:00',
              serviceName: 'Haircut',
              staffName: 'Sarah',
              businessAddress: '123 Main St',
              businessPhone: '+1234567890'
            },
            subject: 'Appointment Confirmation'
          },
          priority: 'normal'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('email');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          // Missing recipient and message
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate phone number for WhatsApp notifications', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipient: {
            name: 'Test Client',
            // Missing phone number
            language: 'en'
          },
          message: {
            content: 'Test message'
          }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Phone number is required');
    });

    it('should validate email address for email notifications', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'email',
          recipient: {
            name: 'Test Client',
            // Missing email address
            language: 'en'
          },
          message: {
            content: 'Test message'
          }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email address is required');
    });

    it('should validate template variables', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipient: {
            name: 'Test Client',
            phone: '+1234567890',
            language: 'en'
          },
          message: {
            templateId: 'appointment_confirmation',
            variables: {
              // Missing required variables
              clientName: 'Test Client'
            }
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Template validation failed');
      expect(response.body.errors.missingVariables).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .send({
          type: 'whatsapp',
          recipient: {
            name: 'Test Client',
            phone: '+1234567890'
          },
          message: {
            content: 'Test message'
          }
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/notifications/schedule', () => {
    it('should schedule a notification successfully', async () => {
      const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const response = await request(app)
        .post('/api/v1/notifications/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipient: {
            name: 'Test Client',
            phone: '+1234567890',
            language: 'en'
          },
          message: {
            content: 'Scheduled reminder message'
          },
          scheduledFor: scheduledFor.toISOString(),
          priority: 'normal'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scheduledFor).toBeDefined();
    });

    it('should reject scheduling for past dates', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const response = await request(app)
        .post('/api/v1/notifications/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipient: {
            name: 'Test Client',
            phone: '+1234567890'
          },
          message: {
            content: 'Test message'
          },
          scheduledFor: pastDate.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Scheduled time must be in the future');
    });
  });

  describe('POST /api/v1/notifications/bulk', () => {
    it('should send bulk notifications successfully', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipients: [
            {
              name: 'Client 1',
              phone: '+1234567890',
              language: 'en'
            },
            {
              name: 'Client 2',
              phone: '+1234567891',
              language: 'ar'
            }
          ],
          message: {
            templateId: 'birthday_greeting',
            variables: {
              businessName: 'Test Salon',
              discount: '20'
            }
          },
          priority: 'low'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalJobs).toBe(2);
      expect(response.body.data.jobIds).toHaveLength(2);
    });

    it('should validate all recipients', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipients: [
            {
              name: 'Client 1',
              phone: '+1234567890'
            },
            {
              name: 'Client 2'
              // Missing phone number
            }
          ],
          message: {
            content: 'Test message'
          }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should require at least one recipient', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          recipients: [], // Empty recipients array
          message: {
            content: 'Test message'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/notifications/history', () => {
    beforeEach(async () => {
      // Create some test notification logs
      await prisma.notificationLog.create({
        data: {
          jobId: 'test-job-1',
          type: 'WHATSAPP',
          companyId: testCompanyId,
          branchId: testBranchId,
          recipient: 'Test Client 1',
          recipientPhone: '+1234567890',
          status: 'SENT',
          priority: 'NORMAL'
        }
      });

      await prisma.notificationLog.create({
        data: {
          jobId: 'test-job-2',
          type: 'EMAIL',
          companyId: testCompanyId,
          branchId: testBranchId,
          recipient: 'Test Client 2',
          recipientEmail: 'test2@example.com',
          status: 'DELIVERED',
          priority: 'HIGH'
        }
      });
    });

    afterEach(async () => {
      await prisma.notificationLog.deleteMany({
        where: { companyId: testCompanyId }
      });
    });

    it('should get notification history', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by notification type', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history?type=WHATSAPP')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.notifications[0].type).toBe('WHATSAPP');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history?status=DELIVERED')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.notifications[0].status).toBe('DELIVERED');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.total).toBe(2);
    });
  });

  describe('GET /api/v1/notifications/templates', () => {
    it('should get all templates', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter templates by type', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates?type=appointment_confirmation')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('appointment_confirmation');
    });

    it('should filter templates by channel', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates?channel=WHATSAPP')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((template: any) => 
        template.channels.includes('WHATSAPP')
      )).toBe(true);
    });
  });

  describe('GET /api/v1/notifications/templates/:templateId/preview', () => {
    it('should preview template in English', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates/appointment_confirmation/preview?language=en')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preview).toContain('Ahmed Mohammed');
      expect(response.body.data.language).toBe('en');
    });

    it('should preview template in Arabic', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates/appointment_confirmation/preview?language=ar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.preview).toContain('أحمد محمد');
      expect(response.body.data.language).toBe('ar');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates/non_existent/preview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Template not found');
    });
  });

  describe('GET /api/v1/notifications/queue/stats', () => {
    it('should get queue statistics', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/queue/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('waiting');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('completed');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('delayed');
    });
  });

  describe('GET /api/v1/notifications/whatsapp/status', () => {
    it('should get WhatsApp service status', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/whatsapp/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('configured');
      expect(response.body.data).toHaveProperty('details');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on notification sending', async () => {
      // Send multiple requests quickly to trigger rate limit
      const requests = Array(35).fill(0).map(() =>
        request(app)
          .post('/api/v1/notifications/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'whatsapp',
            recipient: {
              name: 'Test Client',
              phone: '+1234567890'
            },
            message: {
              content: 'Test message'
            }
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce stricter rate limits on bulk notifications', async () => {
      // Send multiple bulk requests to trigger rate limit
      const requests = Array(10).fill(0).map(() =>
        request(app)
          .post('/api/v1/notifications/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'whatsapp',
            recipients: [
              { name: 'Client 1', phone: '+1234567890' }
            ],
            message: {
              content: 'Test message'
            }
          })
      );

      const responses = await Promise.all(requests);
      
      // Should be rate limited after 5 requests in 5 minutes
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('WebHook Endpoints', () => {
    describe('POST /api/v1/notifications/webhooks/whatsapp', () => {
      it('should process WhatsApp webhook successfully', async () => {
        // First create a notification log to update
        const notificationLog = await prisma.notificationLog.create({
          data: {
            jobId: 'test-webhook-job',
            type: 'WHATSAPP',
            companyId: testCompanyId,
            recipient: 'Test Client',
            recipientPhone: '+1234567890',
            status: 'SENT',
            priority: 'NORMAL',
            result: JSON.stringify({ twilioSid: 'test-message-sid' })
          }
        });

        const response = await request(app)
          .post('/api/v1/notifications/webhooks/whatsapp')
          .send({
            MessageSid: 'test-message-sid',
            MessageStatus: 'delivered',
            From: 'whatsapp:+14155238886',
            To: 'whatsapp:+1234567890'
          });

        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');

        // Clean up
        await prisma.notificationLog.delete({
          where: { id: notificationLog.id }
        });
      });

      it('should handle webhook requests without authentication', async () => {
        // Webhook endpoints should not require authentication
        const response = await request(app)
          .post('/api/v1/notifications/webhooks/whatsapp')
          .send({
            MessageSid: 'test-sid',
            MessageStatus: 'failed'
          });

        expect(response.status).toBe(200);
      });
    });
  });
});