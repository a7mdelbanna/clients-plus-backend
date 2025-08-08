import request from 'supertest';
import { Express } from 'express';
import { prisma } from '../../src/config/database';
import { AuthTestHelper } from '../helpers/auth';
import { TestDataFactory } from '../helpers/factories';
import { dbHelper, setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import { BranchType, BranchStatus, UserRole } from '@prisma/client';

// Import app after all mocks
let app: Express;

// Test data
let testCompany1: any;
let testCompany2: any;
let adminUser1: any;
let adminUser2: any;
let managerUser1: any;
let staffUser1: any;
let adminToken1: string;
let adminToken2: string;
let managerToken1: string;
let staffToken1: string;

describe('Branch API Integration Tests', () => {
  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied
    app = (await import('../../src/app')).default;
    
    // Setup test database
    await setupTestDatabase();
    
    // Create test companies and users
    testCompany1 = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'test-company-1',
        name: 'Test Company 1',
        email: 'test1@example.com',
      })
    });

    testCompany2 = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'test-company-2', 
        name: 'Test Company 2',
        email: 'test2@example.com',
      })
    });

    // Create admin users
    adminUser1 = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(testCompany1.id, {
        id: 'admin-1',
        email: 'admin1@test.com',
      })
    });

    adminUser2 = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(testCompany2.id, {
        id: 'admin-2', 
        email: 'admin2@test.com',
      })
    });

    // Create other roles for testing
    managerUser1 = await dbHelper.client.user.create({
      data: TestDataFactory.createUser(testCompany1.id, {
        id: 'manager-1',
        email: 'manager1@test.com',
        role: UserRole.MANAGER,
      })
    });

    staffUser1 = await dbHelper.client.user.create({
      data: TestDataFactory.createUser(testCompany1.id, {
        id: 'staff-1',
        email: 'staff1@test.com',
        role: UserRole.STAFF,
      })
    });

    // Generate auth tokens
    adminToken1 = AuthTestHelper.generateToken({
      id: adminUser1.id,
      email: adminUser1.email,
      companyId: testCompany1.id,
      role: UserRole.ADMIN,
    });

    adminToken2 = AuthTestHelper.generateToken({
      id: adminUser2.id,
      email: adminUser2.email,
      companyId: testCompany2.id,
      role: UserRole.ADMIN,
    });

    managerToken1 = AuthTestHelper.generateToken({
      id: managerUser1.id,
      email: managerUser1.email,
      companyId: testCompany1.id,
      role: UserRole.MANAGER,
    });

    staffToken1 = AuthTestHelper.generateToken({
      id: staffUser1.id,
      email: staffUser1.email,
      companyId: testCompany1.id,
      role: UserRole.STAFF,
    });
  }, 60000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up branches before each test
    await dbHelper.client.branch.deleteMany({
      where: {
        OR: [
          { companyId: testCompany1.id },
          { companyId: testCompany2.id },
        ]
      }
    });
  });

  describe('Branch CRUD Operations', () => {
    describe('POST /api/v1/companies/:companyId/branches', () => {
      it('should successfully create a branch as admin', async () => {
        const branchData = {
          name: 'Main Branch',
          type: BranchType.MAIN,
          address: {
            street: '123 Main St',
            city: 'Test City',
            country: 'Test Country',
          },
          phone: '+1234567890',
          email: 'branch@test.com',
        };

        const response = await request(app)
          .post(`/api/v1/companies/${testCompany1.id}/branches`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(branchData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Branch created successfully',
          data: {
            name: branchData.name,
            type: branchData.type,
            companyId: testCompany1.id,
            address: branchData.address,
            phone: branchData.phone,
            email: branchData.email,
          },
        });

        // Verify in database
        const createdBranch = await dbHelper.client.branch.findUnique({
          where: { id: response.body.data.id }
        });
        expect(createdBranch).toBeTruthy();
        expect(createdBranch!.companyId).toBe(testCompany1.id);
      });

      it('should require admin role to create branch', async () => {
        const branchData = {
          name: 'Test Branch',
          type: BranchType.SECONDARY,
          address: {
            street: '123 Test St',
            city: 'Test City',
            country: 'Test Country',
          },
        };

        // Staff user should be denied
        await request(app)
          .post(`/api/v1/companies/${testCompany1.id}/branches`)
          .set('Authorization', `Bearer ${staffToken1}`)
          .send(branchData)
          .expect(403);

        // Manager user should also be denied (only admin can create branches)
        await request(app)
          .post(`/api/v1/companies/${testCompany1.id}/branches`)
          .set('Authorization', `Bearer ${managerToken1}`)
          .send(branchData)
          .expect(403);
      });

      it('should validate required fields', async () => {
        const invalidData = {
          name: '', // Empty name
          type: 'INVALID_TYPE',
          // Missing address
        };

        const response = await request(app)
          .post(`/api/v1/companies/${testCompany1.id}/branches`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          errors: expect.any(Array),
        });
      });

      it('should enforce multi-tenant isolation', async () => {
        const branchData = {
          name: 'Cross Tenant Branch',
          type: BranchType.SECONDARY,
          address: {
            street: '123 Forbidden St',
            city: 'Test City',
            country: 'Test Country',
          },
        };

        // Admin from company2 trying to create branch in company1
        await request(app)
          .post(`/api/v1/companies/${testCompany1.id}/branches`)
          .set('Authorization', `Bearer ${adminToken2}`)
          .send(branchData)
          .expect(403);
      });
    });

    describe('GET /api/v1/companies/:companyId/branches/:branchId', () => {
      let testBranch: any;

      beforeEach(async () => {
        testBranch = await dbHelper.client.branch.create({
          data: TestDataFactory.createBranch(testCompany1.id, {
            name: 'Test Branch',
            type: BranchType.MAIN,
          })
        });
      });

      it('should retrieve branch details successfully', async () => {
        const response = await request(app)
          .get(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: testBranch.id,
            name: testBranch.name,
            companyId: testCompany1.id,
            type: testBranch.type,
          },
        });
      });

      it('should enforce multi-tenant isolation', async () => {
        // Admin from company2 trying to access company1 branch
        await request(app)
          .get(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${adminToken2}`)
          .expect(403);
      });

      it('should return 404 for non-existent branch', async () => {
        await request(app)
          .get(`/api/v1/companies/${testCompany1.id}/branches/non-existent-id`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(404);
      });

      it('should allow different user roles to view branches', async () => {
        // Admin can view
        await request(app)
          .get(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        // Manager can view
        await request(app)
          .get(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${managerToken1}`)
          .expect(200);

        // Staff can view
        await request(app)
          .get(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${staffToken1}`)
          .expect(200);
      });
    });

    describe('PUT /api/v1/companies/:companyId/branches/:branchId', () => {
      let testBranch: any;

      beforeEach(async () => {
        testBranch = await dbHelper.client.branch.create({
          data: TestDataFactory.createBranch(testCompany1.id, {
            name: 'Original Branch',
            type: BranchType.SECONDARY,
          })
        });
      });

      it('should update branch successfully as admin', async () => {
        const updateData = {
          name: 'Updated Branch Name',
          phone: '+9876543210',
          email: 'updated@test.com',
        };

        const response = await request(app)
          .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Branch updated successfully',
          data: {
            id: testBranch.id,
            name: updateData.name,
            phone: updateData.phone,
            email: updateData.email,
          },
        });

        // Verify in database
        const updatedBranch = await dbHelper.client.branch.findUnique({
          where: { id: testBranch.id }
        });
        expect(updatedBranch!.name).toBe(updateData.name);
        expect(updatedBranch!.phone).toBe(updateData.phone);
        expect(updatedBranch!.email).toBe(updateData.email);
      });

      it('should require admin role to update branch', async () => {
        const updateData = { name: 'Updated by Staff' };

        await request(app)
          .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${staffToken1}`)
          .send(updateData)
          .expect(403);
      });

      it('should enforce multi-tenant isolation on updates', async () => {
        const updateData = { name: 'Cross Tenant Update' };

        await request(app)
          .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${adminToken2}`)
          .send(updateData)
          .expect(403);
      });
    });

    describe('DELETE /api/v1/companies/:companyId/branches/:branchId', () => {
      let testBranch: any;

      beforeEach(async () => {
        testBranch = await dbHelper.client.branch.create({
          data: TestDataFactory.createBranch(testCompany1.id, {
            name: 'Branch to Delete',
            type: BranchType.SECONDARY,
          })
        });
      });

      it('should delete branch successfully as admin', async () => {
        const response = await request(app)
          .delete(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Branch deleted successfully',
        });

        // Verify soft deletion in database
        const deletedBranch = await dbHelper.client.branch.findUnique({
          where: { id: testBranch.id }
        });
        expect(deletedBranch?.isActive).toBe(false);
      });

      it('should require admin role to delete branch', async () => {
        await request(app)
          .delete(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}`)
          .set('Authorization', `Bearer ${managerToken1}`)
          .expect(403);
      });
    });
  });

  describe('Branch Listing and Filtering', () => {
    beforeEach(async () => {
      // Create test branches
      const branches = [
        TestDataFactory.createBranch(testCompany1.id, {
          name: 'Main Branch',
          type: BranchType.MAIN,
          status: BranchStatus.ACTIVE,
        }),
        TestDataFactory.createBranch(testCompany1.id, {
          name: 'Secondary Branch 1',
          type: BranchType.SECONDARY,
          status: BranchStatus.ACTIVE,
        }),
        TestDataFactory.createBranch(testCompany1.id, {
          name: 'Inactive Branch',
          type: BranchType.SECONDARY,
          status: BranchStatus.INACTIVE,
        }),
        TestDataFactory.createBranch(testCompany2.id, {
          name: 'Other Company Branch',
          type: BranchType.MAIN,
          status: BranchStatus.ACTIVE,
        }),
      ];

      for (const branchData of branches) {
        await dbHelper.client.branch.create({ data: branchData });
      }
    });

    it('should list branches for company with pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 2,
          total: 3, // Only company1 branches
          pages: 2,
          hasNext: true,
          hasPrev: false,
        },
      });

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((branch: any) => {
        expect(branch.companyId).toBe(testCompany1.id);
      });
    });

    it('should filter branches by type', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ type: BranchType.MAIN })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe(BranchType.MAIN);
    });

    it('should filter branches by status', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ status: BranchStatus.ACTIVE })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((branch: any) => {
        expect(branch.status).toBe(BranchStatus.ACTIVE);
      });
    });

    it('should search branches by name', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ search: 'Main' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('Main');
    });

    it('should enforce multi-tenant isolation in listing', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Should only return branches from testCompany1
      response.body.data.forEach((branch: any) => {
        expect(branch.companyId).toBe(testCompany1.id);
      });

      // Should not include branches from other companies
      const otherCompanyBranch = response.body.data.find(
        (branch: any) => branch.name === 'Other Company Branch'
      );
      expect(otherCompanyBranch).toBeUndefined();
    });
  });

  describe('Operating Hours Management', () => {
    let testBranch: any;

    beforeEach(async () => {
      testBranch = await dbHelper.client.branch.create({
        data: TestDataFactory.createBranch(testCompany1.id, {
          name: 'Hours Test Branch',
          type: BranchType.MAIN,
        })
      });
    });

    it('should get branch operating hours', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}/operating-hours`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          operatingHours: expect.any(Object),
        },
      });
    });

    it('should update branch operating hours', async () => {
      const newHours = {
        operatingHours: {
          monday: { open: '08:00', close: '18:00', closed: false },
          tuesday: { open: '08:00', close: '18:00', closed: false },
          wednesday: { open: '08:00', close: '18:00', closed: false },
          thursday: { open: '08:00', close: '18:00', closed: false },
          friday: { open: '08:00', close: '16:00', closed: false },
          saturday: { open: '10:00', close: '14:00', closed: false },
          sunday: { closed: true },
        },
      };

      const response = await request(app)
        .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}/operating-hours`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(newHours)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Operating hours updated successfully',
        data: expect.objectContaining({
          operatingHours: newHours.operatingHours,
        }),
      });
    });

    it('should require admin role to update operating hours', async () => {
      const newHours = {
        operatingHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
        },
      };

      await request(app)
        .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}/operating-hours`)
        .set('Authorization', `Bearer ${staffToken1}`)
        .send(newHours)
        .expect(403);
    });
  });

  describe('Staff Assignment', () => {
    let testBranch: any;

    beforeEach(async () => {
      testBranch = await dbHelper.client.branch.create({
        data: TestDataFactory.createBranch(testCompany1.id, {
          name: 'Staff Assignment Branch',
          type: BranchType.MAIN,
        })
      });
    });

    it('should assign staff to branch', async () => {
      const staffIds = ['staff-id-1', 'staff-id-2'];

      const response = await request(app)
        .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}/staff`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ staffIds })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Staff assigned to branch successfully',
      });
    });

    it('should require admin role for staff assignment', async () => {
      const staffIds = ['staff-id-1'];

      await request(app)
        .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}/staff`)
        .set('Authorization', `Bearer ${managerToken1}`)
        .send({ staffIds })
        .expect(403);
    });

    it('should validate staffIds format', async () => {
      const invalidData = { staffIds: 'not-an-array' };

      await request(app)
        .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}/staff`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('Service Assignment', () => {
    let testBranch: any;

    beforeEach(async () => {
      testBranch = await dbHelper.client.branch.create({
        data: TestDataFactory.createBranch(testCompany1.id, {
          name: 'Service Assignment Branch',
          type: BranchType.MAIN,
        })
      });
    });

    it('should assign services to branch', async () => {
      const serviceIds = ['service-id-1', 'service-id-2'];

      const response = await request(app)
        .put(`/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}/services`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ serviceIds })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Services assigned to branch successfully',
      });
    });
  });

  describe('Branch Count', () => {
    beforeEach(async () => {
      // Create 3 branches for company1
      const branches = [
        TestDataFactory.createBranch(testCompany1.id, { name: 'Branch 1' }),
        TestDataFactory.createBranch(testCompany1.id, { name: 'Branch 2' }),
        TestDataFactory.createBranch(testCompany1.id, { name: 'Branch 3' }),
      ];

      for (const branchData of branches) {
        await dbHelper.client.branch.create({ data: branchData });
      }
    });

    it('should return correct branch count for company', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches/count`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { count: 3 },
      });
    });

    it('should enforce multi-tenant isolation for count', async () => {
      // Admin from company2 shouldn't access company1 count
      await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches/count`)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(403);
    });
  });

  describe('Default Branch Management', () => {
    let mainBranch: any;
    let secondaryBranch: any;

    beforeEach(async () => {
      mainBranch = await dbHelper.client.branch.create({
        data: TestDataFactory.createBranch(testCompany1.id, {
          name: 'Main Branch',
          type: BranchType.MAIN,
        })
      });

      secondaryBranch = await dbHelper.client.branch.create({
        data: TestDataFactory.createBranch(testCompany1.id, {
          name: 'Secondary Branch',
          type: BranchType.SECONDARY,
        })
      });
    });

    it('should set branch as default', async () => {
      const response = await request(app)
        .post(`/api/v1/companies/${testCompany1.id}/branches/${secondaryBranch.id}/set-default`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Default branch set successfully',
      });
    });

    it('should require admin role to set default branch', async () => {
      await request(app)
        .post(`/api/v1/companies/${testCompany1.id}/branches/${secondaryBranch.id}/set-default`)
        .set('Authorization', `Bearer ${managerToken1}`)
        .expect(403);
    });
  });

  describe('Authentication and Authorization', () => {
    let testBranch: any;

    beforeEach(async () => {
      testBranch = await dbHelper.client.branch.create({
        data: TestDataFactory.createBranch(testCompany1.id, {
          name: 'Auth Test Branch',
        })
      });
    });

    it('should require authentication for all endpoints', async () => {
      // Test various endpoints without token
      const endpoints = [
        { method: 'get', path: `/api/v1/companies/${testCompany1.id}/branches` },
        { method: 'post', path: `/api/v1/companies/${testCompany1.id}/branches` },
        { method: 'get', path: `/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}` },
        { method: 'put', path: `/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}` },
        { method: 'delete', path: `/api/v1/companies/${testCompany1.id}/branches/${testBranch.id}` },
      ];

      for (const endpoint of endpoints) {
        await request(app)
          [endpoint.method](endpoint.path)
          .expect(401);
      }
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid-token';

      await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = AuthTestHelper.generateExpiredToken({
        id: adminUser1.id,
        companyId: testCompany1.id,
        role: UserRole.ADMIN,
      });

      await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Input Validation and Error Handling', () => {
    it('should validate UUID format for IDs', async () => {
      await request(app)
        .get('/api/v1/companies/invalid-uuid/branches')
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(400);
    });

    it('should handle malformed JSON payload', async () => {
      await request(app)
        .post(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json,}')
        .expect(400);
    });

    it('should validate address object structure', async () => {
      const invalidData = {
        name: 'Test Branch',
        type: BranchType.SECONDARY,
        address: 'string instead of object',
      };

      await request(app)
        .post(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent branch creation requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const branchData = {
          name: `Concurrent Branch ${i}`,
          type: BranchType.SECONDARY,
          address: {
            street: `${i} Concurrent St`,
            city: 'Test City',
            country: 'Test Country',
          },
        };

        return request(app)
          .post(`/api/v1/companies/${testCompany1.id}/branches`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(branchData);
      });

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all branches were created
      const branches = await dbHelper.client.branch.findMany({
        where: { companyId: testCompany1.id }
      });
      expect(branches.length).toBe(10);
    });

    it('should respond quickly to branch listing requests', async () => {
      // Create many branches
      const branchPromises = Array.from({ length: 50 }, (_, i) => {
        return dbHelper.client.branch.create({
          data: TestDataFactory.createBranch(testCompany1.id, {
            name: `Perf Branch ${i}`,
          })
        });
      });
      await Promise.all(branchPromises);

      const startTime = Date.now();
      
      await request(app)
        .get(`/api/v1/companies/${testCompany1.id}/branches`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const duration = Date.now() - startTime;
      
      // Should respond within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});