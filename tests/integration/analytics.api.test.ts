import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { generateTestToken, createTestCompany, createTestUser, cleanupTestData } from '../helpers/auth';
import { addDays, subDays, format } from 'date-fns';

const prisma = new PrismaClient();

describe('Analytics API', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;

  beforeAll(async () => {
    const testData = await createTestCompany();
    companyId = testData.companyId;
    
    const testUser = await createTestUser(companyId);
    userId = testUser.id;
    
    authToken = generateTestToken({
      userId,
      email: testUser.email,
      companyId,
      role: testUser.role
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/analytics/overview', () => {
    it('should return analytics overview for default period', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toMatchObject({
        totalRevenue: expect.any(Number),
        revenueGrowth: expect.any(Number),
        totalAppointments: expect.any(Number),
        completionRate: expect.any(Number),
        averageAppointmentValue: expect.any(Number),
        topServices: expect.any(Array),
        revenueByPaymentMethod: expect.any(Array),
        appointmentStatusBreakdown: expect.any(Array),
        peakHours: expect.any(Array),
        period: expect.any(String),
        dateRange: expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String)
        })
      });
    });

    it('should return analytics overview for specific period', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/overview?period=week')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('week');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/analytics/overview')
        .expect(401);
    });
  });

  describe('GET /api/v1/analytics/revenue', () => {
    it('should return revenue analytics with required parameters', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .get(`/api/v1/analytics/revenue?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalRevenue: expect.any(Number),
        completedRevenue: expect.any(Number),
        pendingRevenue: expect.any(Number),
        paidRevenue: expect.any(Number),
        unpaidRevenue: expect.any(Number),
        periodComparison: expect.objectContaining({
          currentPeriod: expect.any(Number),
          previousPeriod: expect.any(Number),
          growthRate: expect.any(Number),
          growthPercentage: expect.any(String)
        }),
        revenueByPeriod: expect.any(Array),
        revenueByService: expect.any(Array),
        revenueByPaymentMethod: expect.any(Array)
      });
    });

    it('should return 400 with missing required parameters', async () => {
      await request(app)
        .get('/api/v1/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 with invalid date format', async () => {
      await request(app)
        .get('/api/v1/analytics/revenue?startDate=invalid&endDate=2024-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/analytics/appointments', () => {
    it('should return appointment analytics', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .get(`/api/v1/analytics/appointments?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalAppointments: expect.any(Number),
        completedAppointments: expect.any(Number),
        cancelledAppointments: expect.any(Number),
        noShowAppointments: expect.any(Number),
        pendingAppointments: expect.any(Number),
        statusBreakdown: expect.any(Array),
        appointmentsByPeriod: expect.any(Array),
        peakHours: expect.any(Array),
        averageDuration: expect.any(Number),
        utilizationRate: expect.any(Number),
        conversionRate: expect.any(Number),
        rescheduleRate: expect.any(Number),
        appointmentsBySource: expect.any(Array)
      });
    });
  });

  describe('GET /api/v1/analytics/clients', () => {
    it('should return client analytics', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .get(`/api/v1/analytics/clients?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalClients: expect.any(Number),
        newClients: expect.any(Number),
        returningClients: expect.any(Number),
        activeClients: expect.any(Number),
        inactiveClients: expect.any(Number),
        clientRetentionRate: expect.any(Number),
        averageLifetimeValue: expect.any(Number),
        clientsByPeriod: expect.any(Array),
        topClients: expect.any(Array),
        clientAcquisitionChannels: expect.any(Array)
      });
    });
  });

  describe('GET /api/v1/analytics/staff', () => {
    it('should return staff performance analytics', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .get(`/api/v1/analytics/staff?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalStaff: expect.any(Number),
        activeStaff: expect.any(Number),
        staffMetrics: expect.any(Array),
        topPerformers: expect.any(Array),
        staffUtilization: expect.any(Array)
      });
    });
  });

  describe('GET /api/v1/analytics/services', () => {
    it('should return service analytics', async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .get(`/api/v1/analytics/services?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalServices: expect.any(Number),
        activeServices: expect.any(Number),
        servicePerformance: expect.any(Array),
        topServices: expect.any(Array),
        servicesByCategory: expect.any(Array)
      });
    });
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        overview: expect.objectContaining({
          todayRevenue: expect.any(Number),
          todayRevenueChange: expect.any(Number),
          todayAppointments: expect.any(Number),
          todayAppointmentsChange: expect.any(Number),
          thisWeekRevenue: expect.any(Number),
          thisMonthRevenue: expect.any(Number),
          totalClients: expect.any(Number),
          newClientsToday: expect.any(Number),
          activeStaff: expect.any(Number),
          utilizationRate: expect.any(Number)
        }),
        realTime: expect.objectContaining({
          currentAppointments: expect.any(Array),
          upcomingAppointments: expect.any(Array),
          staffAvailability: expect.any(Array),
          queueStatus: expect.any(Object)
        }),
        alerts: expect.any(Array),
        quickStats: expect.any(Object)
      });
    });
  });

  describe('GET /api/v1/analytics/dashboard/kpis', () => {
    it('should return KPI metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        businessKPIs: expect.any(Object),
        operationalKPIs: expect.any(Object),
        financialKPIs: expect.any(Object),
        clientKPIs: expect.any(Object),
        trends: expect.any(Object),
        goals: expect.any(Array)
      });
    });
  });

  describe('POST /api/v1/analytics/export/revenue', () => {
    it('should export revenue analytics to PDF', async () => {
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .post(`/api/v1/analytics/export/revenue?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'pdf',
          includeCharts: false,
          includeRawData: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        fileName: expect.any(String),
        filePath: expect.any(String),
        fileSize: expect.any(Number),
        mimeType: 'application/pdf',
        downloadUrl: expect.any(String)
      });
    });

    it('should export revenue analytics to Excel', async () => {
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .post(`/api/v1/analytics/export/revenue?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'excel',
          includeRawData: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should export revenue analytics to CSV', async () => {
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const response = await request(app)
        .post(`/api/v1/analytics/export/revenue?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mimeType).toBe('text/csv');
    });

    it('should return 400 with invalid export format', async () => {
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      await request(app)
        .post(`/api/v1/analytics/export/revenue?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'invalid'
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/analytics/cache/invalidate', () => {
    it('should invalidate analytics cache', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/cache/invalidate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Analytics cache invalidated successfully');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on analytics endpoints', async () => {
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Make multiple rapid requests to test rate limiting
      const requests = Array(35).fill(null).map(() =>
        request(app)
          .get(`/api/v1/analytics/revenue?startDate=${startDate}&endDate=${endDate}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });
});

// Performance tests
describe('Analytics Performance', () => {
  let authToken: string;
  let companyId: string;

  beforeAll(async () => {
    const testData = await createTestCompany();
    companyId = testData.companyId;
    
    const testUser = await createTestUser(companyId);
    
    authToken = generateTestToken({
      userId: testUser.id,
      email: testUser.email,
      companyId,
      role: testUser.role
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('should respond to analytics requests within 2 seconds', async () => {
    const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');

    const startTime = Date.now();
    
    await request(app)
      .get(`/api/v1/analytics/revenue?startDate=${startDate}&endDate=${endDate}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
  });

  it('should handle concurrent analytics requests efficiently', async () => {
    const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');

    const startTime = Date.now();

    // Make 5 concurrent requests
    const requests = Array(5).fill(null).map(() =>
      request(app)
        .get(`/api/v1/analytics/overview?period=week`)
        .set('Authorization', `Bearer ${authToken}`)
    );

    const responses = await Promise.all(requests);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Concurrent requests should not take much longer than a single request
    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);
});