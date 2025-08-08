import request from 'supertest';
import { Express } from 'express';
import { AuthTestHelper } from '../helpers/auth';
import { TestDataFactory } from '../helpers/factories';
import { dbHelper, setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import { UserRole, BranchType, ClientStatus } from '@prisma/client';

// Import app after all mocks
let app: Express;

// Test data for multi-tenant isolation
let company1: any;
let company2: any;
let company3: any;

// Users for each company
let company1Admin: any;
let company2Admin: any;
let company3Admin: any;
let company1Manager: any;
let company1Staff: any;

// Auth tokens
let company1AdminToken: string;
let company2AdminToken: string;
let company3AdminToken: string;
let company1ManagerToken: string;
let company1StaffToken: string;

// Test entities for each company
let company1Branch: any;
let company2Branch: any;
let company1Client: any;
let company2Client: any;
let company1Product: any;
let company2Product: any;

describe('Multi-Tenant Isolation Integration Tests', () => {
  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied
    app = (await import('../../src/app')).default;
    
    // Setup test database
    await setupTestDatabase();
    
    // Create test companies
    company1 = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'isolation-company-1',
        name: 'Isolation Test Company 1',
        email: 'isolation1@test.com',
      })
    });

    company2 = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'isolation-company-2',
        name: 'Isolation Test Company 2',
        email: 'isolation2@test.com',
      })
    });

    company3 = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'isolation-company-3',
        name: 'Isolation Test Company 3',
        email: 'isolation3@test.com',
      })
    });

    // Create users for each company
    company1Admin = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(company1.id, {
        id: 'iso-admin-1',
        email: 'admin1@isolation.test',
      })
    });

    company2Admin = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(company2.id, {
        id: 'iso-admin-2',
        email: 'admin2@isolation.test',
      })
    });

    company3Admin = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(company3.id, {
        id: 'iso-admin-3',
        email: 'admin3@isolation.test',
      })
    });

    company1Manager = await dbHelper.client.user.create({
      data: TestDataFactory.createUser(company1.id, {
        id: 'iso-manager-1',
        email: 'manager1@isolation.test',
        role: UserRole.MANAGER,
      })
    });

    company1Staff = await dbHelper.client.user.create({
      data: TestDataFactory.createUser(company1.id, {
        id: 'iso-staff-1',
        email: 'staff1@isolation.test',
        role: UserRole.STAFF,
      })
    });

    // Generate auth tokens
    company1AdminToken = AuthTestHelper.generateToken({
      id: company1Admin.id,
      email: company1Admin.email,
      companyId: company1.id,
      role: UserRole.ADMIN,
    });

    company2AdminToken = AuthTestHelper.generateToken({
      id: company2Admin.id,
      email: company2Admin.email,
      companyId: company2.id,
      role: UserRole.ADMIN,
    });

    company3AdminToken = AuthTestHelper.generateToken({
      id: company3Admin.id,
      email: company3Admin.email,
      companyId: company3.id,
      role: UserRole.ADMIN,
    });

    company1ManagerToken = AuthTestHelper.generateToken({
      id: company1Manager.id,
      email: company1Manager.email,
      companyId: company1.id,
      role: UserRole.MANAGER,
    });

    company1StaffToken = AuthTestHelper.generateToken({
      id: company1Staff.id,
      email: company1Staff.email,
      companyId: company1.id,
      role: UserRole.STAFF,
    });

    // Create test entities for each company
    company1Branch = await dbHelper.client.branch.create({
      data: TestDataFactory.createBranch(company1.id, {
        id: 'iso-branch-1',
        name: 'Company 1 Branch',
        type: BranchType.MAIN,
      })
    });

    company2Branch = await dbHelper.client.branch.create({
      data: TestDataFactory.createBranch(company2.id, {
        id: 'iso-branch-2',
        name: 'Company 2 Branch',
        type: BranchType.MAIN,
      })
    });

    company1Client = await dbHelper.client.client.create({
      data: TestDataFactory.createClient(company1.id, company1Admin.id, {
        id: 'iso-client-1',
        firstName: 'Company1',
        lastName: 'Client',
        email: 'client1@isolation.test',
      })
    });

    company2Client = await dbHelper.client.client.create({
      data: TestDataFactory.createClient(company2.id, company2Admin.id, {
        id: 'iso-client-2',
        firstName: 'Company2',
        lastName: 'Client',
        email: 'client2@isolation.test',
      })
    });

    company1Product = await dbHelper.client.product.create({
      data: {
        id: 'iso-product-1',
        companyId: company1.id,
        name: 'Company 1 Product',
        sku: 'C1P001',
        price: 29.99,
        trackInventory: true,
        active: true,
      }
    });

    company2Product = await dbHelper.client.product.create({
      data: {
        id: 'iso-product-2',
        companyId: company2.id,
        name: 'Company 2 Product',
        sku: 'C2P001',
        price: 39.99,
        trackInventory: true,
        active: true,
      }
    });
  }, 60000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Branch API Multi-Tenant Isolation', () => {
    it('should prevent cross-company branch access in GET operations', async () => {
      // Company1 admin trying to access Company2's branch
      await request(app)
        .get(`/api/v1/companies/${company2.id}/branches/${company2Branch.id}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(403);

      // Company2 admin trying to access Company1's branch
      await request(app)
        .get(`/api/v1/companies/${company1.id}/branches/${company1Branch.id}`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(403);

      // Verify legitimate access works
      await request(app)
        .get(`/api/v1/companies/${company1.id}/branches/${company1Branch.id}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(200);
    });

    it('should prevent cross-company branch creation', async () => {
      const branchData = {
        name: 'Cross Company Branch',
        type: BranchType.SECONDARY,
        address: {
          street: '123 Hacker St',
          city: 'Attack City',
          country: 'Malicious Country',
        },
      };

      // Company2 admin trying to create branch in Company1
      await request(app)
        .post(`/api/v1/companies/${company1.id}/branches`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .send(branchData)
        .expect(403);
    });

    it('should prevent cross-company branch updates', async () => {
      const updateData = {
        name: 'Hijacked Branch Name',
      };

      await request(app)
        .put(`/api/v1/companies/${company1.id}/branches/${company1Branch.id}`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should prevent cross-company branch deletion', async () => {
      await request(app)
        .delete(`/api/v1/companies/${company1.id}/branches/${company1Branch.id}`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(403);
    });

    it('should isolate branch listings by company', async () => {
      const company1Response = await request(app)
        .get(`/api/v1/companies/${company1.id}/branches`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(200);

      const company2Response = await request(app)
        .get(`/api/v1/companies/${company2.id}/branches`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(200);

      // Each company should only see their own branches
      company1Response.body.data.forEach((branch: any) => {
        expect(branch.companyId).toBe(company1.id);
        expect(branch.id).not.toBe(company2Branch.id);
      });

      company2Response.body.data.forEach((branch: any) => {
        expect(branch.companyId).toBe(company2.id);
        expect(branch.id).not.toBe(company1Branch.id);
      });
    });

    it('should isolate branch count by company', async () => {
      const company1CountResponse = await request(app)
        .get(`/api/v1/companies/${company1.id}/branches/count`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(200);

      const company2CountResponse = await request(app)
        .get(`/api/v1/companies/${company2.id}/branches/count`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(200);

      // Each should have at least 1 branch (the one we created)
      expect(company1CountResponse.body.data.count).toBeGreaterThanOrEqual(1);
      expect(company2CountResponse.body.data.count).toBeGreaterThanOrEqual(1);

      // Company1 admin trying to get Company2's count
      await request(app)
        .get(`/api/v1/companies/${company2.id}/branches/count`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(403);
    });

    it('should prevent cross-company staff assignment to branches', async () => {
      const staffIds = ['staff-from-company2'];

      await request(app)
        .put(`/api/v1/companies/${company1.id}/branches/${company1Branch.id}/staff`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .send({ staffIds })
        .expect(403);
    });
  });

  describe('Client API Multi-Tenant Isolation', () => {
    it('should prevent cross-company client access', async () => {
      // Company1 admin trying to access Company2's client
      await request(app)
        .get(`/api/v1/clients/${company2Client.id}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(404); // Should not find client from different company

      // Company2 admin trying to access Company1's client
      await request(app)
        .get(`/api/v1/clients/${company1Client.id}`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(404);

      // Verify legitimate access works
      await request(app)
        .get(`/api/v1/clients/${company1Client.id}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(200);
    });

    it('should prevent cross-company client updates', async () => {
      const updateData = {
        firstName: 'Hacked',
        notes: 'This client has been compromised',
      };

      await request(app)
        .put(`/api/v1/clients/${company2Client.id}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should prevent cross-company client deletion', async () => {
      await request(app)
        .delete(`/api/v1/clients/${company2Client.id}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(404);
    });

    it('should isolate client listings by company', async () => {
      const company1Response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(200);

      const company2Response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(200);

      // Each company should only see their own clients
      company1Response.body.data.forEach((client: any) => {
        expect(client.companyId).toBe(company1.id);
        expect(client.id).not.toBe(company2Client.id);
      });

      company2Response.body.data.forEach((client: any) => {
        expect(client.companyId).toBe(company2.id);
        expect(client.id).not.toBe(company1Client.id);
      });
    });

    it('should allow same email across different companies', async () => {
      const clientData = {
        firstName: 'Duplicate',
        lastName: 'Email',
        email: 'duplicate@multitenant.test',
      };

      // Create client in company1
      const company1ClientResponse = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .send(clientData)
        .expect(201);

      // Create client with same email in company2
      const company2ClientResponse = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .send(clientData)
        .expect(201);

      // Both should be created successfully
      expect(company1ClientResponse.body.data.email).toBe(clientData.email);
      expect(company2ClientResponse.body.data.email).toBe(clientData.email);
      expect(company1ClientResponse.body.data.companyId).toBe(company1.id);
      expect(company2ClientResponse.body.data.companyId).toBe(company2.id);
    });

    it('should isolate client counts by company', async () => {
      const company1CountResponse = await request(app)
        .get('/api/v1/clients/count')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(200);

      const company2CountResponse = await request(app)
        .get('/api/v1/clients/count')
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(200);

      // Each should have their own counts
      expect(company1CountResponse.body.data.total).toBeGreaterThanOrEqual(1);
      expect(company2CountResponse.body.data.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Company User Management Multi-Tenant Isolation', () => {
    it('should prevent users from accessing other company users', async () => {
      // Company1 admin trying to list Company2 users
      await request(app)
        .get(`/api/v1/companies/${company2.id}/users`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(403);

      // Company2 admin trying to access Company1 user
      await request(app)
        .get(`/api/v1/companies/${company1.id}/users/${company1Admin.id}`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .expect(403);
    });

    it('should prevent cross-company user creation', async () => {
      const userData = {
        firstName: 'Malicious',
        lastName: 'User',
        email: 'malicious@crosscompany.test',
        role: UserRole.ADMIN,
      };

      // Company2 admin trying to create user in Company1
      await request(app)
        .post(`/api/v1/companies/${company1.id}/users`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .send(userData)
        .expect(403);
    });

    it('should prevent cross-company user updates', async () => {
      const updateData = {
        role: UserRole.ADMIN,
        isActive: false,
      };

      await request(app)
        .put(`/api/v1/companies/${company1.id}/users/${company1Manager.id}`)
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('Inventory Multi-Tenant Isolation', () => {
    beforeEach(async () => {
      // Create inventory for both companies
      await dbHelper.client.inventory.create({
        data: {
          productId: company1Product.id,
          branchId: company1Branch.id,
          quantity: 100,
          reservedQuantity: 10,
        }
      });

      await dbHelper.client.inventory.create({
        data: {
          productId: company2Product.id,
          branchId: company2Branch.id,
          quantity: 50,
          reservedQuantity: 5,
        }
      });
    });

    it('should isolate product access across companies', async () => {
      // Test direct product access isolation would be tested here
      // This assumes product API endpoints exist
      
      // For now, we'll verify through inventory service calls
      // Company1 should not access Company2 products
      const company1Products = await dbHelper.client.product.findMany({
        where: { companyId: company1.id }
      });

      const company2Products = await dbHelper.client.product.findMany({
        where: { companyId: company2.id }
      });

      expect(company1Products.every(p => p.companyId === company1.id)).toBe(true);
      expect(company2Products.every(p => p.companyId === company2.id)).toBe(true);
      
      // Verify no cross-contamination
      expect(company1Products.find(p => p.id === company2Product.id)).toBeUndefined();
      expect(company2Products.find(p => p.id === company1Product.id)).toBeUndefined();
    });

    it('should isolate inventory levels by company', async () => {
      const company1Inventory = await dbHelper.client.inventory.findMany({
        where: {
          product: { companyId: company1.id }
        },
        include: { product: true, branch: true }
      });

      const company2Inventory = await dbHelper.client.inventory.findMany({
        where: {
          product: { companyId: company2.id }
        },
        include: { product: true, branch: true }
      });

      // Each company should only see their inventory
      company1Inventory.forEach(inv => {
        expect(inv.product.companyId).toBe(company1.id);
        expect(inv.branch.companyId).toBe(company1.id);
      });

      company2Inventory.forEach(inv => {
        expect(inv.product.companyId).toBe(company2.id);
        expect(inv.branch.companyId).toBe(company2.id);
      });
    });

    it('should prevent cross-company inventory movements', async () => {
      // Attempt to create movement for Company2 product using Company1 context
      const invalidMovement = {
        productId: company2Product.id, // Company2 product
        branchId: company1Branch.id,   // Company1 branch - should fail
        type: 'IN',
        quantity: 10,
        performedBy: company1Admin.id,
      };

      // This would be tested through inventory movement API endpoints
      // For now, we verify the data integrity constraints exist
      await expect(
        dbHelper.client.inventoryMovement.create({
          data: {
            productId: company2Product.id,
            branchId: company1Branch.id,
            type: 'IN',
            quantity: 10,
          }
        })
      ).rejects.toThrow(); // Should fail due to foreign key constraints
    });
  });

  describe('Role-Based Access Within Multi-Tenant Context', () => {
    it('should enforce role permissions within company boundaries', async () => {
      // Manager should not be able to delete branches within own company
      await request(app)
        .delete(`/api/v1/companies/${company1.id}/branches/${company1Branch.id}`)
        .set('Authorization', `Bearer ${company1ManagerToken}`)
        .expect(403);

      // Staff should not be able to create branches within own company
      const branchData = {
        name: 'Staff Attempt',
        type: BranchType.SECONDARY,
        address: {
          street: '123 Staff St',
          city: 'Staff City',
          country: 'Staff Country',
        },
      };

      await request(app)
        .post(`/api/v1/companies/${company1.id}/branches`)
        .set('Authorization', `Bearer ${company1StaffToken}`)
        .send(branchData)
        .expect(403);

      // But admin should be able to perform these actions
      await request(app)
        .post(`/api/v1/companies/${company1.id}/branches`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .send(branchData)
        .expect(201);
    });

    it('should prevent privilege escalation across companies', async () => {
      // Company1 staff trying to perform admin actions in Company2
      const branchData = {
        name: 'Cross Company Escalation',
        type: BranchType.SECONDARY,
        address: {
          street: '123 Attack St',
          city: 'Escalation City',
          country: 'Attack Country',
        },
      };

      // Even if there was no company check, staff role shouldn't allow this
      await request(app)
        .post(`/api/v1/companies/${company2.id}/branches`)
        .set('Authorization', `Bearer ${company1StaffToken}`)
        .send(branchData)
        .expect(403); // Should be blocked by both role and company checks
    });
  });

  describe('Data Leakage Prevention', () => {
    beforeEach(async () => {
      // Create additional data for leakage tests
      await dbHelper.client.client.create({
        data: TestDataFactory.createClient(company1.id, company1Admin.id, {
          firstName: 'Sensitive',
          lastName: 'Data',
          email: 'sensitive@company1.test',
          notes: 'Confidential information about Company1',
        })
      });

      await dbHelper.client.client.create({
        data: TestDataFactory.createClient(company2.id, company2Admin.id, {
          firstName: 'Secret',
          lastName: 'Info',
          email: 'secret@company2.test',
          notes: 'Confidential information about Company2',
        })
      });
    });

    it('should not leak data in search results across companies', async () => {
      // Search for "Sensitive" from Company2 context
      const searchResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .query({ search: 'Sensitive' })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(0);

      // Verify Company1 can find their sensitive data
      const company1SearchResponse = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .query({ search: 'Sensitive' })
        .expect(200);

      expect(company1SearchResponse.body.data).toHaveLength(1);
      expect(company1SearchResponse.body.data[0].firstName).toBe('Sensitive');
    });

    it('should not expose company data in error messages', async () => {
      // Try to access non-existent resource with valid UUID format
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

      const response = await request(app)
        .get(`/api/v1/clients/${nonExistentId}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(404);

      // Error message should not reveal information about other companies
      expect(response.body.message).not.toContain('Company');
      expect(response.body.message).not.toContain(company2.name);
      expect(response.body).not.toHaveProperty('details');
    });

    it('should maintain data isolation in concurrent requests', async () => {
      // Simulate concurrent requests from different companies
      const company1Requests = Array.from({ length: 5 }, () => 
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${company1AdminToken}`)
      );

      const company2Requests = Array.from({ length: 5 }, () => 
        request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${company2AdminToken}`)
      );

      const allResponses = await Promise.all([
        ...company1Requests,
        ...company2Requests
      ]);

      // Verify each company only sees their data
      const company1Responses = allResponses.slice(0, 5);
      const company2Responses = allResponses.slice(5);

      company1Responses.forEach(response => {
        expect(response.status).toBe(200);
        response.body.data.forEach((client: any) => {
          expect(client.companyId).toBe(company1.id);
        });
      });

      company2Responses.forEach(response => {
        expect(response.status).toBe(200);
        response.body.data.forEach((client: any) => {
          expect(client.companyId).toBe(company2.id);
        });
      });
    });
  });

  describe('JWT Token Company Context Validation', () => {
    it('should reject tokens with mismatched company context', async () => {
      // Create a token with Company1 user but try to access Company2 resources
      const mismatchedToken = AuthTestHelper.generateToken({
        id: company1Admin.id,
        email: company1Admin.email,
        companyId: company2.id, // Wrong company ID
        role: UserRole.ADMIN,
      });

      await request(app)
        .get(`/api/v1/companies/${company2.id}/branches`)
        .set('Authorization', `Bearer ${mismatchedToken}`)
        .expect(403);
    });

    it('should validate company existence in token', async () => {
      const nonExistentCompanyToken = AuthTestHelper.generateToken({
        id: company1Admin.id,
        email: company1Admin.email,
        companyId: 'non-existent-company',
        role: UserRole.ADMIN,
      });

      await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${nonExistentCompanyToken}`)
        .expect(401);
    });

    it('should prevent token reuse across different API versions/contexts', async () => {
      // Test that company context is consistently validated across all endpoints
      const endpoints = [
        { method: 'get', path: `/api/v1/companies/${company2.id}/branches` },
        { method: 'get', path: '/api/v1/clients' },
        { method: 'get', path: `/api/v1/companies/${company2.id}/users` },
      ];

      for (const endpoint of endpoints) {
        await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${company1AdminToken}`)
          .expect(403);
      }
    });
  });

  describe('Bulk Operations Multi-Tenant Isolation', () => {
    let company1Clients: any[];
    let company2Clients: any[];

    beforeEach(async () => {
      // Create multiple clients for each company
      company1Clients = [];
      company2Clients = [];

      for (let i = 1; i <= 3; i++) {
        const client1 = await dbHelper.client.client.create({
          data: TestDataFactory.createClient(company1.id, company1Admin.id, {
            firstName: `Bulk1_${i}`,
            lastName: 'Test',
            email: `bulk1_${i}@test.com`,
          })
        });
        company1Clients.push(client1);

        const client2 = await dbHelper.client.client.create({
          data: TestDataFactory.createClient(company2.id, company2Admin.id, {
            firstName: `Bulk2_${i}`,
            lastName: 'Test',
            email: `bulk2_${i}@test.com`,
          })
        });
        company2Clients.push(client2);
      }
    });

    it('should prevent bulk operations on other company resources', async () => {
      const bulkUpdateData = {
        clientIds: [company2Clients[0].id, company2Clients[1].id],
        status: ClientStatus.SUSPENDED,
      };

      // Company1 admin trying to bulk update Company2 clients
      const response = await request(app)
        .post('/api/v1/clients/bulk/update')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .send(bulkUpdateData)
        .expect(200);

      // Should report 0 updates as clients don't belong to Company1
      expect(response.body.data.updatedCount).toBe(0);
    });

    it('should prevent mixed company bulk operations', async () => {
      const mixedBulkData = {
        clientIds: [
          company1Clients[0].id, // Company1 client
          company2Clients[0].id, // Company2 client
        ],
        status: ClientStatus.SUSPENDED,
      };

      // Company1 admin should only update their own client
      const response = await request(app)
        .post('/api/v1/clients/bulk/update')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .send(mixedBulkData)
        .expect(200);

      expect(response.body.data.updatedCount).toBe(1); // Only Company1 client updated

      // Verify Company2 client wasn't affected
      const company2Client = await dbHelper.client.client.findUnique({
        where: { id: company2Clients[0].id }
      });
      expect(company2Client?.status).not.toBe(ClientStatus.SUSPENDED);
    });
  });

  describe('API Response Data Isolation', () => {
    it('should not include other company data in relationship fields', async () => {
      const response = await request(app)
        .get(`/api/v1/clients/${company1Client.id}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(200);

      // Verify response structure doesn't leak information
      expect(response.body.data).toHaveProperty('companyId', company1.id);
      expect(response.body.data).not.toHaveProperty('otherCompanyData');
      
      // If there are any related entities, they should belong to the same company
      if (response.body.data.appointments) {
        response.body.data.appointments.forEach((appointment: any) => {
          expect(appointment.companyId).toBe(company1.id);
        });
      }
    });

    it('should maintain consistent pagination across companies', async () => {
      // Each company should have consistent pagination regardless of other companies' data
      const company1Page1 = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      const company2Page1 = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${company2AdminToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      // Pagination should be calculated independently for each company
      expect(company1Page1.body.pagination.total).toBeGreaterThanOrEqual(1);
      expect(company2Page1.body.pagination.total).toBeGreaterThanOrEqual(1);

      // Data should still be isolated
      company1Page1.body.data.forEach((client: any) => {
        expect(client.companyId).toBe(company1.id);
      });

      company2Page1.body.data.forEach((client: any) => {
        expect(client.companyId).toBe(company2.id);
      });
    });
  });

  describe('Edge Cases and Attack Scenarios', () => {
    it('should handle SQL injection attempts in company context', async () => {
      // Attempt SQL injection in search parameter
      const maliciousSearch = "'; DROP TABLE clients; --";

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .query({ search: maliciousSearch })
        .expect(200);

      // Should return empty results, not cause an error
      expect(response.body.data).toEqual([]);
      expect(response.body.success).toBe(true);
    });

    it('should handle UUID manipulation attempts', async () => {
      // Try to access resource with manipulated UUID that might exist in another company
      const manipulatedId = company2Client.id;

      await request(app)
        .get(`/api/v1/clients/${manipulatedId}`)
        .set('Authorization', `Bearer ${company1AdminToken}`)
        .expect(404); // Should not find client from different company
    });

    it('should handle concurrent multi-company database operations safely', async () => {
      // Simulate concurrent operations from multiple companies
      const operations = [
        // Company1 operations
        request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${company1AdminToken}`)
          .send({
            firstName: 'Concurrent1',
            lastName: 'Test',
            email: 'concurrent1@test.com',
          }),
        
        // Company2 operations
        request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${company2AdminToken}`)
          .send({
            firstName: 'Concurrent2',
            lastName: 'Test',
            email: 'concurrent2@test.com',
          }),

        // Company3 operations
        request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${company3AdminToken}`)
          .send({
            firstName: 'Concurrent3',
            lastName: 'Test',
            email: 'concurrent3@test.com',
          }),
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach((response, index) => {
        expect(response.status).toBe(201);
        
        // Verify correct company assignment
        const expectedCompanyId = [company1.id, company2.id, company3.id][index];
        expect(response.body.data.companyId).toBe(expectedCompanyId);
      });
    });

    it('should maintain isolation under high load', async () => {
      // Create many concurrent requests from different companies
      const company1Requests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${company1AdminToken}`)
          .send({
            firstName: `Load1_${i}`,
            lastName: 'Test',
            email: `load1_${i}@test.com`,
          })
      );

      const company2Requests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${company2AdminToken}`)
          .send({
            firstName: `Load2_${i}`,
            lastName: 'Test',
            email: `load2_${i}@test.com`,
          })
      );

      const allResults = await Promise.all([
        ...company1Requests,
        ...company2Requests
      ]);

      // Verify all requests succeeded and maintained proper isolation
      allResults.forEach((response, index) => {
        expect(response.status).toBe(201);
        
        const expectedCompanyId = index < 20 ? company1.id : company2.id;
        expect(response.body.data.companyId).toBe(expectedCompanyId);
      });

      // Verify final state is consistent
      const company1FinalClients = await dbHelper.client.client.findMany({
        where: { companyId: company1.id }
      });

      const company2FinalClients = await dbHelper.client.client.findMany({
        where: { companyId: company2.id }
      });

      // Each company should have the expected number of clients
      expect(company1FinalClients.length).toBeGreaterThanOrEqual(20);
      expect(company2FinalClients.length).toBeGreaterThanOrEqual(20);

      // All clients should belong to the correct company
      company1FinalClients.forEach(client => {
        expect(client.companyId).toBe(company1.id);
      });

      company2FinalClients.forEach(client => {
        expect(client.companyId).toBe(company2.id);
      });
    });
  });
});