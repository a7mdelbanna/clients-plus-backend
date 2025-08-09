import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import App from '../../src/app';
import { redisService } from '../../src/services/redis.service';
import { monitoringService } from '../../src/services/monitoring.service';
import { optimizedDatabase } from '../../src/config/database-optimized';
import { performance } from 'perf_hooks';

describe('Performance Optimization Tests', () => {
  let app: App;
  let server: any;
  let authToken: string;
  
  beforeAll(async () => {
    app = new App();
    server = app.app;
    
    // Setup test authentication
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data?.token || '';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Optimization', () => {
    test('should respond to GET /clients within acceptable time limits', async () => {
      const startTime = performance.now();
      
      const response = await request(server)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 200ms for cached requests
      expect(responseTime).toBeLessThan(200);
      
      // Should include cache headers
      expect(response.headers['x-cache']).toBeDefined();
      expect(response.headers['x-response-time']).toBeDefined();
      
      // Should include pagination
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBeDefined();
      expect(response.body.pagination.limit).toBeDefined();
    });

    test('should handle large datasets with pagination efficiently', async () => {
      const pageSize = 50;
      const startTime = performance.now();
      
      const response = await request(server)
        .get(`/api/v1/clients?limit=${pageSize}&page=1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Should handle pagination efficiently
      expect(responseTime).toBeLessThan(500);
      expect(response.body.data.length).toBeLessThanOrEqual(pageSize);
      expect(response.body.pagination.hasNext).toBeDefined();
      expect(response.body.pagination.hasPrev).toBeDefined();
    });

    test('should use field selection to optimize response size', async () => {
      const fieldsToSelect = 'id,firstName,lastName,email';
      
      const response = await request(server)
        .get(`/api/v1/clients?fields=${fieldsToSelect}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      if (response.body.data && response.body.data.length > 0) {
        const firstClient = response.body.data[0];
        
        // Should only include requested fields
        expect(Object.keys(firstClient)).toEqual(
          expect.arrayContaining(['id', 'firstName', 'lastName', 'email'])
        );
        
        // Should not include unselected fields
        expect(firstClient.phone).toBeUndefined();
        expect(firstClient.address).toBeUndefined();
        expect(firstClient.notes).toBeUndefined();
      }
    });
  });

  describe('Cache Performance', () => {
    test('should demonstrate cache hit improvement', async () => {
      const endpoint = '/api/v1/clients?page=1&limit=10';
      
      // First request (cache miss)
      const startTime1 = performance.now();
      const response1 = await request(server)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const time1 = performance.now() - startTime1;
      
      expect(response1.headers['x-cache']).toBe('MISS');
      
      // Second request (should be cache hit)
      const startTime2 = performance.now();
      const response2 = await request(server)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const time2 = performance.now() - startTime2;
      
      expect(response2.headers['x-cache']).toBe('HIT');
      
      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5);
      expect(time2).toBeLessThan(50); // Should be very fast from cache
    });

    test('should invalidate cache correctly on data modification', async () => {
      // Create a new client
      const clientData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.performance@example.com',
        phone: '1234567890'
      };
      
      const createResponse = await request(server)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);
      
      const clientId = createResponse.body.data.client.id;
      
      // Cache the clients list
      await request(server)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Update the client (should invalidate cache)
      await request(server)
        .put(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);
      
      // Next request should be cache miss
      const response = await request(server)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.headers['x-cache']).toBe('MISS');
      
      // Cleanup
      await request(server)
        .delete(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Database Optimization', () => {
    test('should execute complex queries efficiently', async () => {
      const startTime = performance.now();
      
      // This would test the optimization service
      const response = await request(server)
        .get('/api/v1/clients?search=test&status=ACTIVE&sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      // Complex queries should still be reasonably fast with proper indexing
      expect(queryTime).toBeLessThan(1000);
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(server)
            .get('/api/v1/clients?page=' + (i + 1))
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const startTime = performance.now();
      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Average time per request should be reasonable
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(500);
    });

    test('should maintain database connection health', async () => {
      const health = await optimizedDatabase.healthCheck();
      
      expect(health.connected).toBe(true);
      expect(health.responseTime).toBeLessThan(100);
      expect(health.connectionCount).toBeGreaterThan(0);
    });
  });

  describe('Memory and Resource Optimization', () => {
    test('should not cause significant memory leaks', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make multiple requests
      for (let i = 0; i < 100; i++) {
        await request(server)
          .get('/api/v1/clients?page=' + (i % 10 + 1))
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('should include performance headers', async () => {
      const response = await request(server)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-timestamp']).toBeDefined();
      
      const responseTime = parseInt(response.headers['x-response-time']);
      expect(responseTime).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(5000); // Should be less than 5 seconds
    });
  });

  describe('Monitoring and Metrics', () => {
    test('should collect performance metrics', async () => {
      // Reset metrics for clean test
      monitoringService.resetMetrics();
      
      // Make some requests to generate metrics
      for (let i = 0; i < 5; i++) {
        await request(server)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      const metrics = await monitoringService.getMetrics();
      
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(5);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.requestsPerSecond).toBeGreaterThanOrEqual(0);
    });

    test('should provide endpoint-specific metrics', async () => {
      // Make requests to different endpoints
      await request(server)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`);
      
      await request(server)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`);
      
      const endpointMetrics = monitoringService.getEndpointMetrics();
      
      expect(endpointMetrics).toBeInstanceOf(Array);
      expect(endpointMetrics.length).toBeGreaterThan(0);
      
      const clientsEndpoint = endpointMetrics.find(m => 
        m.endpoint.includes('clients') || m.endpoint.includes('/clients')
      );
      
      if (clientsEndpoint) {
        expect(clientsEndpoint.count).toBeGreaterThanOrEqual(2);
        expect(clientsEndpoint.averageTime).toBeGreaterThan(0);
      }
    });

    test('should identify slow endpoints', async () => {
      const slowEndpoints = monitoringService.getSlowestEndpoints(5);
      
      expect(slowEndpoints).toBeInstanceOf(Array);
      
      if (slowEndpoints.length > 0) {
        expect(slowEndpoints[0].averageTime).toBeGreaterThan(0);
        expect(slowEndpoints[0].endpoint).toBeDefined();
      }
    });

    test('should provide system health status', async () => {
      const healthStatus = await monitoringService.getHealthStatus();
      
      expect(healthStatus.status).toMatch(/^(healthy|warning|critical)$/);
      expect(healthStatus.issues).toBeInstanceOf(Array);
      expect(healthStatus.uptime).toBeGreaterThan(0);
      expect(healthStatus.metrics).toBeDefined();
    });
  });

  describe('Load Testing', () => {
    test('should handle burst traffic', async () => {
      const burstSize = 20;
      const promises = [];
      
      // Create burst of concurrent requests
      for (let i = 0; i < burstSize; i++) {
        promises.push(
          request(server)
            .get('/api/v1/clients?limit=5')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const startTime = performance.now();
      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      // All requests should complete successfully
      const successfulRequests = responses.filter(r => r.status === 200).length;
      expect(successfulRequests).toBe(burstSize);
      
      // Should handle burst within reasonable time
      expect(totalTime).toBeLessThan(5000);
      
      // Average response time should be acceptable
      const averageTime = totalTime / burstSize;
      expect(averageTime).toBeLessThan(1000);
    });

    test('should handle rate limiting gracefully', async () => {
      const requests = [];
      const rapidRequestCount = 50;
      
      // Make rapid requests that might trigger rate limiting
      for (let i = 0; i < rapidRequestCount; i++) {
        requests.push(
          request(server)
            .get('/api/v1/clients')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const responses = await Promise.allSettled(requests);
      
      // Should have a mix of successful and rate-limited responses
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r as any).value.status === 200
      ).length;
      
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && (r as any).value.status === 429
      ).length;
      
      // Should handle the load without failing completely
      expect(successful + rateLimited).toBe(rapidRequestCount);
      expect(successful).toBeGreaterThan(0); // Some requests should succeed
    });
  });

  describe('Cache Efficiency', () => {
    test('should achieve good cache hit ratio under load', async () => {
      const testEndpoint = '/api/v1/clients?limit=10';
      const requestCount = 20;
      
      // Make repeated requests to same endpoint
      for (let i = 0; i < requestCount; i++) {
        await request(server)
          .get(testEndpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
      
      const metrics = await monitoringService.getMetrics();
      
      // Should achieve good cache hit ratio
      expect(metrics.cacheHitRate).toBeGreaterThan(70);
      expect(metrics.cacheHits).toBeGreaterThan(metrics.cacheMisses);
    });

    test('should handle cache compression efficiently', async () => {
      // Request data that should be compressed
      const response = await request(server)
        .get('/api/v1/clients?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Should have reasonable response size due to compression
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        const sizeKB = parseInt(contentLength) / 1024;
        expect(sizeKB).toBeLessThan(1000); // Should be less than 1MB
      }
      
      // Should include compression headers
      expect(response.headers['content-encoding']).toBeDefined();
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions', async () => {
      const baseline = {
        averageResponseTime: 200,
        cacheHitRate: 80,
        errorRate: 1
      };
      
      // Make requests to collect current metrics
      for (let i = 0; i < 10; i++) {
        await request(server)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      const currentMetrics = await monitoringService.getMetrics();
      
      // Performance should not regress significantly
      expect(currentMetrics.averageResponseTime).toBeLessThan(baseline.averageResponseTime * 2);
      expect(currentMetrics.cacheHitRate).toBeGreaterThan(baseline.cacheHitRate * 0.8);
      expect(currentMetrics.errorRate).toBeLessThan(baseline.errorRate * 2);
    });
  });
});

describe('Integration Performance Tests', () => {
  let app: App;
  let server: any;
  let authToken: string;

  beforeAll(async () => {
    app = new App();
    server = app.app;
    
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data?.token || '';
  });

  afterAll(async () => {
    await app.close();
  });

  test('should maintain performance across full user workflow', async () => {
    const workflow = [
      { method: 'GET', path: '/clients', description: 'List clients' },
      { method: 'POST', path: '/clients', description: 'Create client' },
      { method: 'GET', path: '/clients/:id', description: 'Get client details' },
      { method: 'PUT', path: '/clients/:id', description: 'Update client' },
      { method: 'DELETE', path: '/clients/:id', description: 'Delete client' }
    ];

    const performanceData = [];
    let clientId: string;

    for (const step of workflow) {
      const startTime = performance.now();
      let response;

      switch (step.method) {
        case 'GET':
          if (step.path === '/clients') {
            response = await request(server)
              .get('/api/v1/clients')
              .set('Authorization', `Bearer ${authToken}`);
          } else if (step.path === '/clients/:id' && clientId) {
            response = await request(server)
              .get(`/api/v1/clients/${clientId}`)
              .set('Authorization', `Bearer ${authToken}`);
          }
          break;
        
        case 'POST':
          response = await request(server)
            .post('/api/v1/clients')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              firstName: 'Performance',
              lastName: 'Test',
              email: 'perf.test@example.com',
              phone: '9876543210'
            });
          
          if (response?.body?.data?.client?.id) {
            clientId = response.body.data.client.id;
          }
          break;
        
        case 'PUT':
          if (clientId) {
            response = await request(server)
              .put(`/api/v1/clients/${clientId}`)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ firstName: 'Updated Performance' });
          }
          break;
        
        case 'DELETE':
          if (clientId) {
            response = await request(server)
              .delete(`/api/v1/clients/${clientId}`)
              .set('Authorization', `Bearer ${authToken}`);
          }
          break;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      performanceData.push({
        step: step.description,
        duration,
        statusCode: response?.status,
        success: response?.status < 400
      });

      // Each step should complete within reasonable time
      expect(duration).toBeLessThan(2000);
      if (response) {
        expect(response.status).toBeLessThan(500);
      }
    }

    // Overall workflow should be efficient
    const totalTime = performanceData.reduce((sum, step) => sum + step.duration, 0);
    const averageTime = totalTime / performanceData.length;
    
    expect(totalTime).toBeLessThan(10000); // Total workflow under 10 seconds
    expect(averageTime).toBeLessThan(2000); // Average step under 2 seconds
    
    // All steps should succeed
    const successfulSteps = performanceData.filter(step => step.success).length;
    expect(successfulSteps).toBe(performanceData.filter(step => step.statusCode).length);
  });
});

// Performance benchmarking utility
export class PerformanceBenchmark {
  static async measureEndpoint(
    server: any,
    endpoint: string,
    token: string,
    iterations: number = 100
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    p95Time: number;
    successRate: number;
  }> {
    const times: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        const response = await request(server)
          .get(endpoint)
          .set('Authorization', `Bearer ${token}`);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        times.push(duration);
        
        if (response.status < 400) {
          successCount++;
        }
      } catch (error) {
        times.push(5000); // Assign high time for failures
      }
    }

    times.sort((a, b) => a - b);
    
    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p95Time: times[Math.floor(times.length * 0.95)],
      successRate: (successCount / iterations) * 100
    };
  }
}