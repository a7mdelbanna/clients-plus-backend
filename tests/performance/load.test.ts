import request from 'supertest';
import { Express } from 'express';
import { AuthTestHelper } from '../helpers/auth';
import { TestDataFactory } from '../helpers/factories';
import { dbHelper, setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import { UserRole, ClientStatus, BranchType } from '@prisma/client';

// Import app after all mocks
let app: Express;

// Test data
let testCompany: any;
let adminUser: any;
let adminToken: string;

// Performance metrics storage
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  requestCount?: number;
  responseSize?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

const performanceMetrics: PerformanceMetric[] = [];

// Helper function to measure performance
async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  requestCount?: number
): Promise<{ result: T; metric: PerformanceMetric }> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  const result = await fn();
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  const metric: PerformanceMetric = {
    operation,
    duration: endTime - startTime,
    timestamp: new Date(),
    requestCount,
    memoryUsage: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
    },
  };
  
  performanceMetrics.push(metric);
  return { result, metric };
}

// Helper function for concurrent request testing
async function runConcurrentRequests(
  requestFactory: () => request.Test,
  concurrency: number,
  description: string
): Promise<{ responses: request.Response[]; metric: PerformanceMetric }> {
  const requests = Array.from({ length: concurrency }, () => requestFactory());
  
  const { result: responses, metric } = await measurePerformance(
    description,
    () => Promise.all(requests),
    concurrency
  );

  return { responses, metric };
}

describe('Performance and Load Tests', () => {
  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied
    app = (await import('../../src/app')).default;
    
    // Setup test database
    await setupTestDatabase();
    
    // Create test company and user
    testCompany = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'perf-test-company',
        name: 'Performance Test Company',
        email: 'perf@test.com',
      })
    });

    adminUser = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(testCompany.id, {
        id: 'perf-admin',
        email: 'admin@perf.test',
      })
    });

    adminToken = AuthTestHelper.generateToken({
      id: adminUser.id,
      email: adminUser.email,
      companyId: testCompany.id,
      role: UserRole.ADMIN,
    });

    console.log('Performance test setup completed');
  }, 60000);

  afterAll(async () => {
    await teardownTestDatabase();
    
    // Generate performance report
    console.log('\n=== PERFORMANCE TEST REPORT ===');
    console.log('Operation\t\t\tDuration (ms)\tMemory (MB)\tRequests');
    console.log('-'.repeat(80));
    
    performanceMetrics.forEach(metric => {
      const memoryMB = metric.memoryUsage ? 
        (metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) : 'N/A';
      
      console.log(
        `${metric.operation.padEnd(30)}\t${metric.duration}\t\t${memoryMB}\t\t${metric.requestCount || 1}`
      );
    });
    
    // Calculate averages
    const avgDuration = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length;
    console.log('-'.repeat(80));
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log('='.repeat(80));
  });

  describe('API Response Time Tests', () => {
    it('should respond to health check quickly', async () => {
      const { result: response, metric } = await measurePerformance(
        'Health Check',
        () => request(app).get('/api/v1/health').expect(200)
      );

      expect(response.status).toBe(200);
      expect(metric.duration).toBeLessThan(100); // Should respond within 100ms
    });

    it('should handle authentication quickly', async () => {
      const { result: response, metric } = await measurePerformance(
        'Authentication Check',
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      );

      expect(response.status).toBe(200);
      expect(metric.duration).toBeLessThan(500); // Should authenticate within 500ms
    });
  });

  describe('Database Query Performance', () => {
    beforeEach(async () => {
      // Clean up before each test
      await dbHelper.client.client.deleteMany({
        where: { companyId: testCompany.id }
      });
      
      await dbHelper.client.branch.deleteMany({
        where: { companyId: testCompany.id }
      });
    });

    it('should handle small dataset queries efficiently', async () => {
      // Create 10 clients
      const clientPromises = Array.from({ length: 10 }, (_, i) => 
        dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany.id, adminUser.id, {
            firstName: `Client${i}`,
            lastName: 'Test',
            email: `client${i}@perf.test`,
          })
        })
      );

      await Promise.all(clientPromises);

      const { result: response, metric } = await measurePerformance(
        'Small Dataset Query (10 clients)',
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      );

      expect(response.body.data).toHaveLength(10);
      expect(metric.duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle medium dataset queries efficiently', async () => {
      // Create 100 clients
      const batches = [];
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = Array.from({ length: 10 }, (_, i) => 
          dbHelper.client.client.create({
            data: TestDataFactory.createClient(testCompany.id, adminUser.id, {
              firstName: `Client${batch * 10 + i}`,
              lastName: 'Test',
              email: `client${batch * 10 + i}@perf.test`,
            })
          })
        );
        batches.push(Promise.all(batchPromises));
      }

      await Promise.all(batches);

      const { result: response, metric } = await measurePerformance(
        'Medium Dataset Query (100 clients)',
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ limit: 50 })
          .expect(200)
      );

      expect(response.body.data).toHaveLength(50);
      expect(response.body.pagination.total).toBe(100);
      expect(metric.duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle large dataset queries with pagination', async () => {
      // Create 500 clients in batches to avoid overwhelming the system
      console.log('Creating 500 clients for large dataset test...');
      
      for (let batch = 0; batch < 50; batch++) {
        const batchData = Array.from({ length: 10 }, (_, i) => ({
          ...TestDataFactory.createClient(testCompany.id, adminUser.id, {
            firstName: `LargeClient${batch * 10 + i}`,
            lastName: 'Test',
            email: `largeclient${batch * 10 + i}@perf.test`,
          })
        }));

        await dbHelper.client.client.createMany({ data: batchData });
        
        // Small delay to prevent overwhelming the database
        if (batch % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Test first page
      const { result: firstPageResponse, metric: firstPageMetric } = await measurePerformance(
        'Large Dataset Query - First Page (500 clients)',
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, limit: 50 })
          .expect(200)
      );

      expect(firstPageResponse.body.data).toHaveLength(50);
      expect(firstPageResponse.body.pagination.total).toBe(500);
      expect(firstPageMetric.duration).toBeLessThan(3000); // Should respond within 3 seconds

      // Test middle page
      const { result: middlePageResponse, metric: middlePageMetric } = await measurePerformance(
        'Large Dataset Query - Middle Page',
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 5, limit: 50 })
          .expect(200)
      );

      expect(middlePageResponse.body.data).toHaveLength(50);
      expect(middlePageMetric.duration).toBeLessThan(3000);

      // Test last page
      const { result: lastPageResponse, metric: lastPageMetric } = await measurePerformance(
        'Large Dataset Query - Last Page',
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 10, limit: 50 })
          .expect(200)
      );

      expect(lastPageResponse.body.data).toHaveLength(50);
      expect(lastPageMetric.duration).toBeLessThan(3000);
    });

    it('should handle complex filtered queries efficiently', async () => {
      // Create diverse client data for filtering tests
      const clientData = [
        { firstName: 'Active', lastName: 'Male', gender: 'MALE', status: ClientStatus.ACTIVE },
        { firstName: 'Active', lastName: 'Female', gender: 'FEMALE', status: ClientStatus.ACTIVE },
        { firstName: 'Inactive', lastName: 'Male', gender: 'MALE', status: ClientStatus.INACTIVE },
        { firstName: 'VIP', lastName: 'Client', marketingConsent: true, status: ClientStatus.ACTIVE },
      ];

      // Replicate each pattern 25 times to create 100 records
      for (let rep = 0; rep < 25; rep++) {
        const batchData = clientData.map((client, index) => 
          TestDataFactory.createClient(testCompany.id, adminUser.id, {
            ...client,
            firstName: `${client.firstName}${rep}`,
            email: `filter${rep}_${index}@perf.test`,
          })
        );

        await dbHelper.client.client.createMany({ data: batchData });
      }

      // Test multiple filter combinations
      const filterTests = [
        { filter: { status: ClientStatus.ACTIVE }, expectedMin: 50, description: 'Status Filter' },
        { filter: { gender: 'MALE' }, expectedMin: 40, description: 'Gender Filter' },
        { filter: { search: 'VIP' }, expectedMin: 20, description: 'Search Filter' },
        { filter: { marketingConsent: 'true' }, expectedMin: 20, description: 'Marketing Consent Filter' },
        { 
          filter: { status: ClientStatus.ACTIVE, gender: 'FEMALE' }, 
          expectedMin: 20, 
          description: 'Combined Filter' 
        },
      ];

      for (const test of filterTests) {
        const { result: response, metric } = await measurePerformance(
          `Complex Query - ${test.description}`,
          () => request(app)
            .get('/api/v1/clients')
            .set('Authorization', `Bearer ${adminToken}`)
            .query(test.filter)
            .expect(200)
        );

        expect(response.body.data.length).toBeGreaterThanOrEqual(test.expectedMin);
        expect(metric.duration).toBeLessThan(2000); // Should respond within 2 seconds
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent read requests efficiently', async () => {
      // Create some test data
      await Promise.all([
        dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany.id, adminUser.id, {
            firstName: 'Concurrent',
            lastName: 'Test',
            email: 'concurrent@perf.test',
          })
        }),
        dbHelper.client.branch.create({
          data: TestDataFactory.createBranch(testCompany.id, {
            name: 'Concurrent Test Branch',
            type: BranchType.MAIN,
          })
        })
      ]);

      const { responses, metric } = await runConcurrentRequests(
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`),
        20,
        'Concurrent Read Requests (20)'
      );

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(metric.duration).toBeLessThan(5000); // All 20 requests within 5 seconds
    });

    it('should handle concurrent write requests safely', async () => {
      const { responses, metric } = await runConcurrentRequests(
        () => {
          const uniqueId = Math.random().toString(36).substring(7);
          return request(app)
            .post('/api/v1/clients')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              firstName: `Concurrent${uniqueId}`,
              lastName: 'Write',
              email: `concurrent${uniqueId}@perf.test`,
            });
        },
        15,
        'Concurrent Write Requests (15)'
      );

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      expect(metric.duration).toBeLessThan(8000); // All 15 writes within 8 seconds

      // Verify all clients were created correctly
      const createdClients = await dbHelper.client.client.findMany({
        where: {
          companyId: testCompany.id,
          firstName: { startsWith: 'Concurrent' }
        }
      });

      expect(createdClients).toHaveLength(15);
    });

    it('should handle mixed read/write concurrent requests', async () => {
      // Create some initial data
      await dbHelper.client.client.create({
        data: TestDataFactory.createClient(testCompany.id, adminUser.id, {
          firstName: 'Mixed',
          lastName: 'Test',
          email: 'mixed@perf.test',
        })
      });

      const mixedRequests = [
        // 10 read requests
        ...Array.from({ length: 10 }, () =>
          request(app)
            .get('/api/v1/clients')
            .set('Authorization', `Bearer ${adminToken}`)
        ),
        // 5 write requests
        ...Array.from({ length: 5 }, (_, i) =>
          request(app)
            .post('/api/v1/clients')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              firstName: `MixedWrite${i}`,
              lastName: 'Test',
              email: `mixedwrite${i}@perf.test`,
            })
        ),
        // 5 update requests (we'll update the initial client)
        ...Array.from({ length: 5 }, (_, i) =>
          request(app)
            .get('/api/v1/clients')
            .set('Authorization', `Bearer ${adminToken}`)
            .query({ search: 'Mixed' })
        ),
      ];

      const { result: responses, metric } = await measurePerformance(
        'Mixed Read/Write Requests (20)',
        () => Promise.all(mixedRequests),
        20
      );

      // Verify response patterns
      const readResponses = responses.slice(0, 10);
      const writeResponses = responses.slice(10, 15);
      const searchResponses = responses.slice(15);

      readResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      writeResponses.forEach(response => {
        expect(response.status).toBe(201);
      });

      searchResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(metric.duration).toBeLessThan(10000); // All mixed operations within 10 seconds
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage();

      // Create a large number of clients in batches
      const batchSize = 50;
      const numBatches = 10;

      for (let batch = 0; batch < numBatches; batch++) {
        const { metric } = await measurePerformance(
          `Bulk Create Batch ${batch + 1}`,
          async () => {
            const batchData = Array.from({ length: batchSize }, (_, i) => ({
              ...TestDataFactory.createClient(testCompany.id, adminUser.id, {
                firstName: `Bulk${batch}_${i}`,
                lastName: 'Memory',
                email: `bulk${batch}_${i}@perf.test`,
              })
            }));

            await dbHelper.client.client.createMany({ data: batchData });
          },
          batchSize
        );

        expect(metric.duration).toBeLessThan(3000); // Each batch within 3 seconds
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      console.log(`Memory increase after bulk operations: ${memoryIncrease.toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100);
    });

    it('should handle garbage collection appropriately', async () => {
      // Force garbage collection if available (Node.js with --expose-gc flag)
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage();

      // Create and delete many entities to test garbage collection
      for (let cycle = 0; cycle < 5; cycle++) {
        // Create entities
        const createPromises = Array.from({ length: 20 }, (_, i) =>
          dbHelper.client.client.create({
            data: TestDataFactory.createClient(testCompany.id, adminUser.id, {
              firstName: `GC${cycle}_${i}`,
              lastName: 'Test',
              email: `gc${cycle}_${i}@perf.test`,
            })
          })
        );

        const createdClients = await Promise.all(createPromises);

        // Delete entities
        await dbHelper.client.client.deleteMany({
          where: {
            id: { in: createdClients.map(c => c.id) }
          }
        });

        // Force GC if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      console.log(`Memory increase after GC cycles: ${memoryIncrease.toFixed(2)}MB`);

      // Memory should not increase significantly after cleanup cycles
      expect(memoryIncrease).toBeLessThan(50);
    });
  });

  describe('Database Connection Performance', () => {
    it('should handle database connection pooling efficiently', async () => {
      // Test many simultaneous database operations
      const dbOperations = [
        // Client operations
        ...Array.from({ length: 10 }, (_, i) =>
          dbHelper.client.client.create({
            data: TestDataFactory.createClient(testCompany.id, adminUser.id, {
              firstName: `Pool${i}`,
              lastName: 'Test',
              email: `pool${i}@perf.test`,
            })
          })
        ),
        // Branch operations
        ...Array.from({ length: 5 }, (_, i) =>
          dbHelper.client.branch.create({
            data: TestDataFactory.createBranch(testCompany.id, {
              name: `Pool Branch ${i}`,
              type: BranchType.SECONDARY,
            })
          })
        ),
        // Count operations
        ...Array.from({ length: 5 }, () =>
          dbHelper.client.client.count({
            where: { companyId: testCompany.id }
          })
        ),
      ];

      const { result: results, metric } = await measurePerformance(
        'Database Connection Pool Test (20 ops)',
        () => Promise.all(dbOperations),
        20
      );

      // All operations should complete successfully
      expect(results).toHaveLength(20);
      expect(metric.duration).toBeLessThan(5000); // Within 5 seconds
    });

    it('should handle long-running queries without timeout', async () => {
      // Create a substantial dataset
      const batchData = Array.from({ length: 100 }, (_, i) => ({
        ...TestDataFactory.createClient(testCompany.id, adminUser.id, {
          firstName: `LongQuery${i}`,
          lastName: 'Test',
          email: `longquery${i}@perf.test`,
          notes: 'This is a longer note field that will make the query processing take more time and test the system resilience'.repeat(5),
        })
      }));

      await dbHelper.client.client.createMany({ data: batchData });

      // Perform a complex query that should take longer
      const { result: response, metric } = await measurePerformance(
        'Long-Running Complex Query',
        () => request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            search: 'LongQuery',
            sortBy: 'firstName',
            sortOrder: 'desc',
            limit: 50
          })
          .expect(200)
      );

      expect(response.body.data).toHaveLength(50);
      expect(metric.duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('API Rate Limiting Performance', () => {
    it('should handle requests within rate limits efficiently', async () => {
      // Test requests within normal rate limits
      const normalRequests = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const { result: responses, metric } = await measurePerformance(
        'Rate Limit Compliance Test (50 requests)',
        () => Promise.all(normalRequests),
        50
      );

      // All requests should succeed (within rate limits)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(metric.duration).toBeLessThan(8000); // Within 8 seconds
    });

    it('should handle burst requests gracefully', async () => {
      // Create a burst of requests in quick succession
      const burstRequests = Array.from({ length: 100 }, (_, i) =>
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: (i % 10) + 1 }) // Vary the requests slightly
      );

      const { result: responses, metric } = await measurePerformance(
        'Burst Request Test (100 requests)',
        () => Promise.all(burstRequests),
        100
      );

      // Most requests should succeed, some might be rate limited
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      console.log(`Successful requests: ${successfulRequests.length}`);
      console.log(`Rate limited requests: ${rateLimitedRequests.length}`);

      expect(successfulRequests.length).toBeGreaterThan(50); // At least half should succeed
      expect(metric.duration).toBeLessThan(15000); // Within 15 seconds
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle authentication errors efficiently', async () => {
      const invalidRequests = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', 'Bearer invalid-token')
      );

      const { result: responses, metric } = await measurePerformance(
        'Authentication Error Handling (20 requests)',
        () => Promise.all(invalidRequests),
        20
      );

      responses.forEach(response => {
        expect(response.status).toBe(401);
      });

      expect(metric.duration).toBeLessThan(3000); // Should fail fast
    });

    it('should handle validation errors efficiently', async () => {
      const invalidDataRequests = Array.from({ length: 15 }, (_, i) =>
        request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            // Invalid data - missing required fields
            firstName: '', // Empty required field
            email: 'invalid-email', // Invalid email format
          })
      );

      const { result: responses, metric } = await measurePerformance(
        'Validation Error Handling (15 requests)',
        () => Promise.all(invalidDataRequests),
        15
      );

      responses.forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      expect(metric.duration).toBeLessThan(3000); // Should validate and reject quickly
    });

    it('should handle not found errors efficiently', async () => {
      const notFoundRequests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .get(`/api/v1/clients/non-existent-id-${i}`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const { result: responses, metric } = await measurePerformance(
        'Not Found Error Handling (20 requests)',
        () => Promise.all(notFoundRequests),
        20
      );

      responses.forEach(response => {
        expect(response.status).toBe(404);
      });

      expect(metric.duration).toBeLessThan(4000); // Should handle not found quickly
    });
  });

  describe('Scalability Indicators', () => {
    it('should show linear performance scaling for read operations', async () => {
      // Test different request volumes to check scaling
      const testSizes = [5, 10, 20, 40];
      const results = [];

      for (const size of testSizes) {
        const { metric } = await runConcurrentRequests(
          () => request(app)
            .get('/api/v1/clients')
            .set('Authorization', `Bearer ${adminToken}`),
          size,
          `Scalability Test - ${size} requests`
        );

        results.push({
          requestCount: size,
          duration: metric.duration,
          avgDuration: metric.duration / size,
        });
      }

      // Print scaling results
      console.log('\nScaling Results:');
      console.log('Requests\tTotal Duration\tAvg per Request');
      results.forEach(result => {
        console.log(`${result.requestCount}\t\t${result.duration}ms\t\t${result.avgDuration.toFixed(2)}ms`);
      });

      // Check that scaling is reasonable (not exponential)
      const efficiency = results[results.length - 1].avgDuration / results[0].avgDuration;
      console.log(`Scaling efficiency ratio: ${efficiency.toFixed(2)}`);
      
      // The average request time shouldn't increase by more than 3x as we scale up
      expect(efficiency).toBeLessThan(3);
    });

    it('should maintain response time consistency under load', async () => {
      const responseTimes: number[] = [];
      const testCount = 50;

      // Measure individual request times
      for (let i = 0; i < testCount; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        
        const duration = Date.now() - startTime;
        responseTimes.push(duration);
      }

      // Calculate statistics
      const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
      const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);

      console.log(`\nResponse Time Statistics (${testCount} requests):`);
      console.log(`Average: ${avgTime.toFixed(2)}ms`);
      console.log(`Median: ${medianTime}ms`);
      console.log(`95th Percentile: ${p95Time}ms`);
      console.log(`Min: ${minTime}ms`);
      console.log(`Max: ${maxTime}ms`);
      console.log(`Range: ${maxTime - minTime}ms`);

      // Performance expectations
      expect(avgTime).toBeLessThan(1000); // Average response under 1 second
      expect(p95Time).toBeLessThan(2000); // 95% of requests under 2 seconds
      expect(maxTime).toBeLessThan(5000); // No request over 5 seconds
    });
  });
});